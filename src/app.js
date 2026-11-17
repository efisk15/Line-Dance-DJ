// This file holds createApp which instantiates all the api injections.

const express = require("express");
const path = require("node:path");
const { createVenuesRouter } = require("./endpoints/venues");
const { createEventsRouter } = require("./endpoints/events");
const { createUsersRouter } = require("./endpoints/users");
const { createDancesRouter } = require("./endpoints/dances");
const { AppError, integer, profileInput } = require("./validation");

function createApp(db) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    );
    if (req.path.startsWith("/api")) res.set("Cache-Control", "no-store");
    next();
  });

  const get = (sql, ...values) => db.prepare(sql).get(...values);
  const all = (sql, ...values) => db.prepare(sql).all(...values);

  function requireRow(row, label) {
    if (!row) throw new AppError(`${label} not found.`, 404);
    return row;
  }

  function organizationId(value) {
    const id = integer(value, "Organization ID");
    requireRow(
      get("SELECT id FROM LineDanceOrganization WHERE id = ?", id),
      "Organization",
    );
    return id;
  }

  // Venue, events, users, and dances api injections.
  app.use("/api/venues", createVenuesRouter(db));

  app.use("/api/events", createEventsRouter(db));

  app.use("/api/users", createUsersRouter(db));

  app.use("/api/dances", createDancesRouter(db));

  // GET /api/options
  // Load the users, DJs, venues, and organizations for the dropdown menus.
  app.get("/api/options", (req, res) => {
    res.json({
      users: all(
        "SELECT id, display_name, role FROM UserProfile ORDER BY display_name",
      ),
      djs: all(`
        SELECT id, display_name FROM UserProfile
        WHERE role IN ('dj', 'admin') ORDER BY display_name
      `),
      venues: all("SELECT id, name, city, state FROM EventVenue ORDER BY name"),
      organizations: all(
        "SELECT id, name FROM LineDanceOrganization ORDER BY name",
      ),
    });
  });

  // GET /api/profiles
  // Get all profiles in alphabetical order.
  app.get("/api/profiles", (req, res) => {
    res.json(
      all(`
      SELECT id, display_name, email, role, created_at
      FROM UserProfile ORDER BY display_name COLLATE NOCASE, id
    `),
    );
  });

  // POST /api/profiles
  // Create a new user profile.
  app.post("/api/profiles", (req, res) => {
    const profile = get(
      `
      INSERT INTO UserProfile (display_name, email, role)
      VALUES (?, ?, ?) RETURNING *
    `,
      ...profileInput(req.body ?? {}),
    );

    res.status(201).json(profile);
  });

  // GET /api/venue-areas
  // Get the available cities and states for filtering venues.
  app.get("/api/venue-areas", (req, res) => {
    res.json(
      all(`
      SELECT DISTINCT city, state FROM EventVenue
      ORDER BY state COLLATE NOCASE, city COLLATE NOCASE
    `),
    );
  });

  // GET /api/organizations/:id/favorites
  // Get an organization's favorite dances.
  app.get("/api/organizations/:id/favorites", (req, res) => {
    res.json(
      all(
        `
      SELECT d.*
      FROM OrganizationFavoriteDance f
      JOIN LineDance d ON d.id = f.line_dance_id
      WHERE f.organization_id = ?
      ORDER BY d.dance_name COLLATE NOCASE
    `,
        organizationId(req.params.id),
      ),
    );
  });

  // GET /api/reports
  // Get overall totals, dance popularity, and event counts for each venue.
  app.get("/api/reports", (req, res) => {
    res.json({
      totals: get(`
        SELECT (SELECT COUNT(*) FROM LineDance) AS dances,
               (SELECT COUNT(*) FROM Event) AS events,
               (SELECT COUNT(*) FROM UserFavoriteDance) AS favorites,
               (SELECT COUNT(*) FROM UserProfile) AS users
      `),
      popularity: all(`
        SELECT d.id, d.dance_name, d.difficulty,
               COALESCE(u.total, 0) AS user_favorites,
               COALESCE(o.total, 0) AS organization_favorites
        FROM LineDance d
        LEFT JOIN (
          SELECT line_dance_id, COUNT(*) AS total
          FROM UserFavoriteDance GROUP BY line_dance_id
        ) u ON u.line_dance_id = d.id
        LEFT JOIN (
          SELECT line_dance_id, COUNT(*) AS total
          FROM OrganizationFavoriteDance GROUP BY line_dance_id
        ) o ON o.line_dance_id = d.id
        ORDER BY user_favorites DESC, organization_favorites DESC, d.dance_name
      `),
      venues: all(`
        SELECT v.id, v.name, v.city, COUNT(e.id) AS event_count
        FROM EventVenue v
        LEFT JOIN Event e ON e.venue_id = v.id
        GROUP BY v.id ORDER BY event_count DESC, v.name
      `),
    });
  });

  // /api fallback
  // Return an error when the requested API route does not exist.
  app.use("/api", (req, res) => {
    res.status(404).json({ error: "API route not found." });
  });

  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use((req, res) => res.status(404).send("Page not found."));

  // General error checking.
  app.use((error, req, res, next) => {
    const message = error.message;

    if (error instanceof AppError) {
      return res.status(error.status).json({ error: message });
    }

    if (error.type === "entity.parse.failed") {
      return res
        .status(400)
        .json({ error: "Request body must contain valid JSON." });
    }

    if (error.type === "entity.too.large") {
      return res.status(413).json({ error: "Request is too large." });
    }

    if (message.includes("UNIQUE constraint failed")) {
      let detail = "This record already exists.";

      if (message.includes("UserProfile.email")) {
        detail = "A profile with this email already exists.";
      } else if (message.includes("idx_setlist_pending_song")) {
        detail = "That song is already pending. Upvote it instead.";
      } else if (message.includes("UserFavoriteDance.")) {
        detail = "This dance is already in those favorites.";
      }

      return res.status(409).json({ error: detail });
    }

    if (message.includes("FOREIGN KEY constraint failed")) {
      return res
        .status(400)
        .json({ error: "A selected related record no longer exists." });
    }

    if (/CHECK constraint failed|NOT NULL constraint failed/.test(message)) {
      return res
        .status(400)
        .json({ error: "Some values are missing or invalid." });
    }

    console.error(error);
    res
      .status(500)
      .json({ error: "The database operation could not be completed." });
  });

  return app;
}

module.exports = { createApp };
