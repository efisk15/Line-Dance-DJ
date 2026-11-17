const express = require("express");
const { text, venueInput, stateCode } = require("../validation");

function createVenuesRouter(db) {
  const router = express.Router();

  const get = (sql, ...values) => db.prepare(sql).get(...values);
  const all = (sql, ...values) => db.prepare(sql).all(...values);

  // Add a new venue.
  router.post("/", (req, res) => {
    const venue = get(
      `
      INSERT INTO EventVenue (name, address, city, state, capacity)
      VALUES (?, ?, ?, ?, ?) RETURNING *
      `,
      ...venueInput(req.body ?? {}),
    );

    res.status(201).json(venue);
  });

  // Find venues using search and location filters, including event counts.
  router.get("/", (req, res) => {
    const search = text(req.query.q, "Search", 150, true);
    const city = text(req.query.city, "City", 100, true);
    const state = stateCode(req.query.state, true);

    res.json(
      all(
        `
        SELECT v.*, COUNT(e.id) AS event_count
        FROM EventVenue v
        LEFT JOIN Event e ON e.venue_id = v.id
        WHERE (
          instr(lower(v.name), lower(?)) > 0
          OR instr(lower(v.address), lower(?)) > 0
        )
          AND (? = '' OR v.city = ? COLLATE NOCASE)
          AND (? = '' OR v.state = ?)
        GROUP BY v.id
        ORDER BY v.state, v.city COLLATE NOCASE, v.name COLLATE NOCASE
        `,
        search,
        search,
        city,
        city,
        state,
        state,
      ),
    );
  });

  return router;
}

module.exports = { createVenuesRouter };
