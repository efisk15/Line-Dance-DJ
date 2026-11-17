const express = require("express");
const { createSetlistRouter } = require("./setlist");
const { AppError, integer, eventInput } = require("../validation");

function createEventsRouter(db) {
  const router = express.Router();

  const get = (sql, ...values) => db.prepare(sql).get(...values);
  const all = (sql, ...values) => db.prepare(sql).all(...values);
  const run = (sql, ...values) => db.prepare(sql).run(...values);

  function requireRow(row, label) {
    if (!row) throw new AppError(`${label} not found.`, 404);
    return row;
  }

  function saveEvent(body, id) {
    const [name, venueId, djId, startsAt] = eventInput(body);

    requireRow(get("SELECT id FROM EventVenue WHERE id = ?", venueId), "Venue");

    const dj = requireRow(
      get("SELECT role FROM UserProfile WHERE id = ?", djId),
      "DJ",
    );

    if (!["dj", "admin"].includes(dj.role)) {
      throw new AppError("The event leader must be a DJ or admin.");
    }

    if (id === undefined) {
      const event = get(
        `
        INSERT INTO Event (event_name, venue_id, dj_user_profile_id, starts_at)
        VALUES (?, ?, ?, ?) RETURNING id
        `,
        name,
        venueId,
        djId,
        startsAt,
      );

      id = event.id;
    } else {
      run(
        `
        UPDATE Event
        SET event_name = ?, venue_id = ?, dj_user_profile_id = ?, starts_at = ?
        WHERE id = ?
        `,
        name,
        venueId,
        djId,
        startsAt,
        id,
      );
    }

    return get("SELECT * FROM EventDetails WHERE event_id = ?", id);
  }

  // Send this event's setlist requests to the setlist router.
  router.use("/:eventId/setlist", createSetlistRouter(db));

  // Get all events with the most recent ones first.
  router.get("/", (req, res) => {
    res.json(
      all("SELECT * FROM EventDetails ORDER BY starts_at DESC, event_id DESC"),
    );
  });

  // Get one event with its venue details and DJ settings.
  router.get("/:id", (req, res) => {
    const id = integer(req.params.id, "Event ID");

    const event = get(
      `
      SELECT ed.*, v.address, s.transition_seconds
      FROM EventDetails ed
      JOIN EventVenue v ON v.id = ed.venue_id
      LEFT JOIN DJSettings s ON s.user_profile_id = ed.dj_user_profile_id
      WHERE ed.event_id = ?
      `,
      id,
    );

    res.json(requireRow(event, "Event"));
  });

  // Create an event using the selected venue and DJ.
  router.post("/", (req, res) => {
    res.status(201).json(saveEvent(req.body ?? {}));
  });

  // Update an existing event.
  router.put("/:id", (req, res) => {
    const id = integer(req.params.id, "Event ID");

    requireRow(get("SELECT id FROM Event WHERE id = ?", id), "Event");

    res.json(saveEvent(req.body ?? {}, id));
  });

  return router;
}

module.exports = { createEventsRouter };
