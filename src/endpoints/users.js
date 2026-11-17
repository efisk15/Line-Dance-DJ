const express = require("express");
const { AppError, integer } = require("../validation");

function createUsersRouter(db) {
  const router = express.Router();

  const get = (sql, ...values) => db.prepare(sql).get(...values);
  const all = (sql, ...values) => db.prepare(sql).all(...values);
  const run = (sql, ...values) => db.prepare(sql).run(...values);

  function requireRow(row, label) {
    if (!row) throw new AppError(`${label} not found.`, 404);
    return row;
  }

  function userId(value) {
    const id = integer(value, "User ID");

    requireRow(get("SELECT id FROM UserProfile WHERE id = ?", id), "User");

    return id;
  }

  function organizationId(value) {
    const id = integer(value, "Organization ID");

    requireRow(
      get("SELECT id FROM LineDanceOrganization WHERE id = ?", id),
      "Organization",
    );

    return id;
  }

  // Get the user's favorite dances in alphabetical order.
  router.get("/:id/favorites", (req, res) => {
    res.json(
      all(
        `
        SELECT d.*, f.created_at
        FROM UserFavoriteDance f
        JOIN LineDance d ON d.id = f.line_dance_id
        WHERE f.user_profile_id = ?
        ORDER BY d.dance_name COLLATE NOCASE
        `,
        userId(req.params.id),
      ),
    );
  });

  // Save a dance to the user's favorites.
  router.post("/:id/favorites", (req, res) => {
    const id = userId(req.params.id);
    const danceId = integer(req.body?.line_dance_id, "Dance ID");

    requireRow(get("SELECT id FROM LineDance WHERE id = ?", danceId), "Dance");

    run(
      `
      INSERT INTO UserFavoriteDance (user_profile_id, line_dance_id)
      VALUES (?, ?)
      `,
      id,
      danceId,
    );

    res.status(201).json({ message: "Dance saved to favorites." });
  });

  // Remove a dance from the user's favorites.
  router.delete("/:id/favorites/:danceId", (req, res) => {
    const id = userId(req.params.id);
    const danceId = integer(req.params.danceId, "Dance ID");

    const result = run(
      `
      DELETE FROM UserFavoriteDance
      WHERE user_profile_id = ? AND line_dance_id = ?
      `,
      id,
      danceId,
    );

    if (!result.changes) {
      throw new AppError("Favorite not found.", 404);
    }

    res.json({ message: "Dance removed from favorites." });
  });

  // Copy an organization's favorites to the user without adding duplicates.
  router.post("/:id/import-favorites", (req, res) => {
    const id = userId(req.params.id);
    const orgId = organizationId(req.body?.organization_id);

    const result = run(
      `
      INSERT INTO UserFavoriteDance (user_profile_id, line_dance_id)
      SELECT ?, line_dance_id
      FROM OrganizationFavoriteDance
      WHERE organization_id = ?
      ON CONFLICT(user_profile_id, line_dance_id) DO NOTHING
      `,
      id,
      orgId,
    );

    const added = Number(result.changes);

    res.json({
      added,
      message: `${added} favorite${added === 1 ? "" : "s"} added.`,
    });
  });

  return router;
}

module.exports = { createUsersRouter };
