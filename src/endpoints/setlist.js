const express = require("express");
const { AppError, integer, text } = require("../validation");

function createSetlistRouter(db) {
  const router = express.Router({ mergeParams: true });

  const get = (sql, ...values) => db.prepare(sql).get(...values);
  const run = (sql, ...values) => db.prepare(sql).run(...values);

  // Transaction helper function.
  function transaction(action) {
    db.exec("BEGIN IMMEDIATE");

    try {
      const result = action();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  // Context help function.
  function context(req, userId) {
    const eventId = integer(req.params.eventId, "Event ID");
    const profileId = integer(userId, "Profile ID");

    const event = get("SELECT * FROM EventDetails WHERE event_id = ?", eventId);
    if (!event) throw new AppError("Event not found.", 404);

    const user = get(
      "SELECT id, role FROM UserProfile WHERE id = ?",
      profileId,
    );
    if (!user) throw new AppError("Profile not found.", 404);

    const canManage =
      user.role === "admin" ||
      (user.role === "dj" && event.dj_user_profile_id === user.id);

    return { event, user, canManage };
  }

  // FindRequest helper function.
  function findRequest(eventId, requestId) {
    const request = get(
      "SELECT * FROM SetlistRequest WHERE event_id = ? AND id = ?",
      eventId,
      integer(requestId, "Request ID"),
    );

    if (!request)
      throw new AppError("Song request not found in this event.", 404);

    return request;
  }

  // PendingDuplicate helper function.
  function pendingDuplicate(eventId, song, artist, exceptId = 0) {
    const artistName = artist || "";

    // A missing artist still matches a pending request for the same song.
    return get(
      `SELECT id FROM SetlistRequest
       WHERE event_id = ? AND status = 'pending'
         AND song_name = ? COLLATE NOCASE AND id <> ?
         AND (COALESCE(artist, '') = '' OR ? = '' OR artist = ? COLLATE NOCASE)`,
      eventId,
      song,
      exceptId,
      artistName,
      artistName,
    );
  }

  // Song text helper function.
  function songText(value, label, optional = false) {
    return text(value, label, 150, optional).replace(/\s+/g, " ");
  }

  // GET /
  // Get the event's requests by status, including votes and the user's upvotes.
  router.get("/", (req, res) => {
    const { event, user, canManage } = context(req, req.query.user_id);

    function list(status, orderBy) {
      return db
        .prepare(
          `
        SELECT r.*, u.display_name AS requested_by_name,
               p.display_name AS played_by_name,
               COUNT(v.user_profile_id) AS votes,
               EXISTS (
                 SELECT 1 FROM SetlistVote
                 WHERE request_id = r.id AND user_profile_id = ?
               ) AS has_upvoted
        FROM SetlistRequest r
        JOIN UserProfile u ON u.id = r.requested_by
        LEFT JOIN UserProfile p ON p.id = r.played_by
        LEFT JOIN SetlistVote v ON v.request_id = r.id
        WHERE r.event_id = ? AND r.status = ?
        GROUP BY r.id
        ORDER BY ${orderBy}
      `,
        )
        .all(user.id, event.event_id, status);
    }

    res.json({
      event,
      can_manage: canManage,
      pending: list("pending", "votes DESC, r.requested_at, r.id"),
      played: list("played", "r.played_at DESC, r.id DESC"),
      removed: list("removed", "r.id DESC"),
    });
  });

  // POST /requests
  // Add a song request and give it the requesting user's first vote.
  router.post("/requests", (req, res) => {
    const body = req.body ?? {};

    const request = transaction(() => {
      const { event, user } = context(req, body.user_id);
      let libraryId = null;
      let details = body;

      if (body.line_dance_id != null && body.line_dance_id !== "") {
        libraryId = integer(body.line_dance_id, "Library dance ID");
        details = get(
          "SELECT song_name, dance_name FROM LineDance WHERE id = ?",
          libraryId,
        );

        if (!details) throw new AppError("Library dance not found.", 404);
      }

      const song = songText(details.song_name, "Song name");
      const dance =
        songText(details.dance_name, "Dance name", libraryId === null) || null;
      const artist = songText(body.artist, "Artist", true) || null;

      if (pendingDuplicate(event.event_id, song, artist)) {
        throw new AppError(
          "That song is already pending. Upvote it instead.",
          409,
        );
      }

      const saved = get(
        `INSERT INTO SetlistRequest
           (event_id, requested_by, line_dance_id, song_name, dance_name, artist)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING *`,
        event.event_id,
        user.id,
        libraryId,
        song,
        dance,
        artist,
      );

      // Save the request and its first vote together.
      run(
        "INSERT INTO SetlistVote (request_id, user_profile_id) VALUES (?, ?)",
        saved.id,
        user.id,
      );

      return saved;
    });

    res.status(201).json(request);
  });

  // PUT /requests/:requestId/vote
  // Add or remove the user's upvote on a pending song.
  router.put("/requests/:requestId/vote", (req, res) => {
    const { user_id, upvoted } = req.body ?? {};

    if (typeof upvoted !== "boolean") {
      throw new AppError("The upvote value must be true or false.");
    }

    transaction(() => {
      const { event, user } = context(req, user_id);
      const request = findRequest(event.event_id, req.params.requestId);

      if (request.status !== "pending") {
        throw new AppError("Only pending songs can be upvoted.", 409);
      }

      if (upvoted) {
        run(
          `INSERT INTO SetlistVote (request_id, user_profile_id)
           VALUES (?, ?)
           ON CONFLICT(request_id, user_profile_id) DO NOTHING`,
          request.id,
          user.id,
        );
      } else {
        run(
          "DELETE FROM SetlistVote WHERE request_id = ? AND user_profile_id = ?",
          request.id,
          user.id,
        );
      }
    });

    res.json({ message: upvoted ? "Upvote added." : "Upvote removed." });
  });

  // PATCH /requests/:requestId
  // Let the assigned DJ or an admin mark a song as played, remove it, or restore it.
  router.patch("/requests/:requestId", (req, res) => {
    const { user_id, status } = req.body ?? {};

    if (!["pending", "played", "removed"].includes(status)) {
      throw new AppError("Choose a valid song status.");
    }

    const updated = transaction(() => {
      const { event, user, canManage } = context(req, user_id);

      if (!canManage) {
        throw new AppError(
          "Only the assigned DJ or an admin can manage this set list.",
          403,
        );
      }

      const request = findRequest(event.event_id, req.params.requestId);

      if (request.status === status) {
        throw new AppError(
          "This song has already been updated. Refresh the list.",
          409,
        );
      }

      if (request.status !== "pending" && status !== "pending") {
        throw new AppError("Restore this song to pending first.", 409);
      }

      if (
        status === "pending" &&
        pendingDuplicate(
          event.event_id,
          request.song_name,
          request.artist,
          request.id,
        )
      ) {
        throw new AppError("This song already has a pending request.", 409);
      }

      return get(
        `UPDATE SetlistRequest
         SET status = ?,
             played_at = CASE WHEN ? = 'played' THEN CURRENT_TIMESTAMP END,
             played_by = ?
         WHERE id = ?
         RETURNING *`,
        status,
        status,
        status === "played" ? user.id : null,
        request.id,
      );
    });

    res.json(updated);
  });

  return router;
}

module.exports = { createSetlistRouter };
