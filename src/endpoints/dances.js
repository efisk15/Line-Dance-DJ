const express = require("express");
const {
  AppError,
  integer,
  text,
  difficulties,
  danceInput,
} = require("../validation");

function createDancesRouter(db) {
  const router = express.Router();

  const get = (sql, ...values) => db.prepare(sql).get(...values);
  const all = (sql, ...values) => db.prepare(sql).all(...values);

  function requireRow(row, label) {
    if (!row) throw new AppError(`${label} not found.`, 404);
    return row;
  }

  function userId(value) {
    const id = integer(value, "User ID");

    requireRow(get("SELECT id FROM UserProfile WHERE id = ?", id), "User");

    return id;
  }

  // Find dances by name, song, or difficulty and mark the user's favorites.
  router.get("/", (req, res) => {
    const search = text(req.query.q, "Search", 150, true);
    const difficulty = text(req.query.difficulty, "Difficulty", 20, true);

    if (difficulty && !difficulties.includes(difficulty)) {
      throw new AppError("Choose a valid difficulty.");
    }

    const id = userId(req.query.user_id || 5);

    res.json(
      all(
        `
        SELECT d.*, EXISTS (
          SELECT 1 FROM UserFavoriteDance f
          WHERE f.line_dance_id = d.id AND f.user_profile_id = ?
        ) AS is_favorite
        FROM LineDance d
        WHERE (
          instr(lower(d.dance_name), lower(?)) > 0
          OR instr(lower(d.song_name), lower(?)) > 0
        )
          AND (? = '' OR d.difficulty = ?)
        ORDER BY d.dance_name COLLATE NOCASE
        `,
        id,
        search,
        search,
        difficulty,
        difficulty,
      ),
    );
  });

  // Add a new dance to the library.
  router.post("/", (req, res) => {
    const dance = get(
      `
      INSERT INTO LineDance
        (dance_name, song_name, difficulty, tempo_bpm, choreography_url)
      VALUES (?, ?, ?, ?, ?) RETURNING *
      `,
      ...danceInput(req.body ?? {}),
    );

    res.status(201).json(dance);
  });

  // Update the details for an existing dance.
  router.put("/:id", (req, res) => {
    const id = integer(req.params.id, "Dance ID");

    const dance = get(
      `
      UPDATE LineDance
      SET dance_name = ?, song_name = ?, difficulty = ?,
          tempo_bpm = ?, choreography_url = ?
      WHERE id = ? RETURNING *
      `,
      ...danceInput(req.body ?? {}),
      id,
    );

    res.json(requireRow(dance, "Dance"));
  });

  return router;
}

module.exports = { createDancesRouter };
