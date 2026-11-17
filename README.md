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

I acknowledge that I did use ChatGPT (OpenAI, 2026) to help build out the front-end, which Dr. Reid stated would be fine.

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

The application creates its own database automatically. Option A is enough to run the app. Option B shows how to recreate the database and run the required SQL by hand.

### Option A: automatic (used by the application)

On first start, the app creates `data/line_dance_dj.db` and runs `database/schema.sql` and then `database/insert_data.sql`. Later starts keep the saved data.

To reset to the original sample data, stop the app, delete `data/line_dance_dj.db`, and start the app again.

### Option B: manual, with the SQLite command-line program

**Required software:** the `sqlite3` CLI, version 3.35 or later (needed for `RETURNING`). Download it from https://sqlite.org/download.html, or on Windows run `winget install SQLite.SQLite`.

Run the files in this order from the `database/` folder:

1. `schema.sql` drops and recreates all tables, indexes, and the view.
2. `insert_data.sql` loads the sample data.
3. `queries.sql` runs the nine required queries.
4. `transaction.sql` runs the transaction example. It ends with `ROLLBACK`, so the sample data is unchanged and the file can be run again.

**Using the script** (macOS, Linux, or Git Bash on Windows):

```bash
bash database/run_queries.sh
```

The script rebuilds `database/line_dance_dj.db` and prints each query with its results.

**Running the files one at a time:**

```bash
cd database
sqlite3 line_dance_dj.db < schema.sql
sqlite3 line_dance_dj.db < insert_data.sql
sqlite3 -header -column line_dance_dj.db < queries.sql
sqlite3 -header -column line_dance_dj.db < transaction.sql
```

**SQLite-specific notes**

- Foreign-key enforcement is off by default in SQLite and must be turned on for each connection with `PRAGMA foreign_keys = ON;`. The SQL files and the application both do this.
- Dates and times are stored as `TEXT` in `YYYY-MM-DD HH:MM:SS` format.
- `schema.sql` drops existing project tables first. Run it only on the project database.

To have the app use a database you built by hand, point `DB_PATH` at that file (see Configuration below).

## Application Setup

**Language:** JavaScript (Node.js).

**Required software:** Node.js 24 or later, including npm (https://nodejs.org). The app uses the built-in `node:sqlite` module, so no separate SQLite install is needed to run it.

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

No configuration is required. The defaults work as-is. To change them, copy `.env.example` to `.env` and edit the values. `npm start` loads `.env` if it exists.

| Setting | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Port for the web server |
| `DB_PATH` | `data/line_dance_dj.db` | Path to the SQLite database file the app opens (or creates) |

The database connection is the file path in `DB_PATH`. There are no passwords, keys, or connection strings. `.env` is listed in `.gitignore`.

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
