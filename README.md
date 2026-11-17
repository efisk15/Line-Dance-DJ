# Line Dance DJ — Final Project (Deliverable 6)

Name: Eli Fisk

## Project Overview

Line Dance DJ is a JavaScript web application for planning and running line dance events.

**Intended users**

- **Attendees** browse the dance library, save favorite dances, and request and upvote songs for an event.
- **DJs** plan events at venues and manage the live set list for events they are assigned to. They mark requests as played or removed. Music playback is handled separately by the DJ.
- **Admins** can manage any event's set list.

**Major functionality**

- Search and filter the dance library, and add or edit dances.
- Save personal favorites, and import an organization's favorite dances in one step.
- Create and edit events and venues, and search venues by name, address, and area.
- A running set list for each event. Songs are ordered by upvotes, and the played history records who played each song and when.
- Reports: database totals, dance popularity, and event counts for each venue.

The frontend is plain HTML/CSS/JavaScript, and the backend is Express 5. SQLite is the persistent data store. The backend uses direct, parameterized SQL and no ORM.

I acknowledge that I did use ChatGPT (OpenAI, 2026) to help build out the front-end, which Dr. Reid stated would be fine. I also used ChatGPT to help format this README.md file to make it look pretty.

## DBMS

**SQLite** (version 3), accessed from Node.js through the built-in `node:sqlite` module. No hosted database service is used, and no database account or credentials are required.

## Repository Contents

| Path | Purpose |
| --- | --- |
| `erd.png` | Final ER diagram of the implemented database |
| `database/schema.sql` | Creates all 10 tables, constraints, indexes, and the `EventDetails` view |
| `database/insert_data.sql` | Loads the sample data |
| `database/queries.sql` | The nine required queries (filtering, joins, aggregate, GROUP BY/HAVING, subquery, set operation, view) |
| `database/transaction.sql` | Transaction example: creates a DJ profile and its settings together, then rolls back |
| `database/run_queries.sh` | Rebuilds a database and runs all four SQL files in order with the `sqlite3` CLI |
| `server.js` | Application entry point |
| `src/` | Backend: database setup (`database.js`), routes (`app.js`, `endpoints/`), input validation (`validation.js`) |
| `public/` | Frontend: HTML, CSS, JavaScript, and images |
| `package.json`, `package-lock.json` | Dependency information |
| `.env.example` | Configuration template (no secrets) |

### Database tables

`UserProfile`, `DJSettings`, `LineDanceOrganization`, `EventVenue`, `LineDance`, `UserFavoriteDance`, `OrganizationFavoriteDance`, `Event`, `SetlistRequest`, `SetlistVote`, and the view `EventDetails`.

## Database Setup

The application creates its own database automatically with no additional step required from the user. To run the transaction.sql and queries.sql files, you can run the run_queries.sh script from the /database folder. To do this you will need to have sqlite3 downloaded on your computer.

## Application Setup

**Language:** JavaScript (Node.js).

**Required software:** Node.js 24 or later, including npm. The app uses the built-in `node:sqlite` module, so no separate SQLite install is needed to run it.

**Required packages:** `express` 5, listed in `package.json`. The exact versions are pinned in `package-lock.json`.

### Install and start

From the `line-dance-dj` folder:

```bash
npm ci
```

```bash
npm start
```

Open http://localhost:3000 in a browser. Stop the server with Ctrl+C. The server closes its SQLite connection on shutdown.

### Configuration

No configuration is required. The defaults work as-is.

| Setting | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Port for the web server |
| `DB_PATH` | `data/line_dance_dj.db` | Path to the SQLite database file the app opens (or creates) |

The database connection is the file path in `DB_PATH`. There are no passwords, keys, or connection strings.

## Major Application Operations

Each operation can be found in the left navigation of the app.

| Operation | Where in the app | API route and source file |
| --- | --- | --- |
| Search and browse dances by name or song, filtered by difficulty | Dance library → Search | `GET /api/dances` (`src/endpoints/dances.js`) |
| Add a dance | Dance library → Add dance | `POST /api/dances` |
| Edit a dance | Dance library → Edit | `PUT /api/dances/:id` |
| View a user's favorite dances (join of favorites and dances) | Favorites | `GET /api/users/:id/favorites` (`src/endpoints/users.js`) |
| Save or remove a favorite | Dance library → ♡ | `POST` / `DELETE /api/users/:id/favorites` |
| Import an organization's favorites into a user's favorites (existing ones are skipped) | Favorites → Add collection to my favorites | `POST /api/users/:id/import-favorites` |
| Create, edit, and view events (uses the `EventDetails` view) | Events | `/api/events` (`src/endpoints/events.js`) |
| Request songs, upvote, and mark songs played or removed | Event set list | `/api/events/:id/setlist` (`src/endpoints/setlist.js`) |
| Search and add venues | Venues | `/api/venues` (`src/endpoints/venues.js`) |
| Create a profile, or switch the active profile | Profiles | `/api/profiles` (`src/app.js`) |
| Reports: totals, dance popularity, events per venue | Reports | `GET /api/reports` (`src/app.js`) |

**Checking that changes are stored:** make a change in the app, such as adding a dance. Then restart the server, or query `data/line_dance_dj.db` with `sqlite3`. The change is still there.

**Safety and error handling:** every user-supplied value is passed to SQL as a `?` parameter and never concatenated into the SQL text. Input is validated in `src/validation.js`. Database constraint errors (UNIQUE, FOREIGN KEY, CHECK) are returned as clear error messages instead of crashes. Multi-step set-list changes run inside `BEGIN IMMEDIATE` / `COMMIT` transactions, with `ROLLBACK` on error.

## Known Limitations

- **No authentication.** The active profile is chosen from a menu, so any user can act as any profile, including an admin. Permission checks (such as only the assigned DJ or an admin managing a set list) depend on the selected profile.
- Dances, events, venues, and profiles can be added and edited but not deleted from the app.
- Event times have no time zone and are shown as entered.
- The app does not play music. The DJ handles playback separately.
- Sample people, organizations, venues, and events are fictional. Tempos and choreography links are illustrative.
- `node:sqlite` is marked experimental in Node.js. The start script hides that warning.
