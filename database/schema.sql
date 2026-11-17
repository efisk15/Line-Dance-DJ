-- Line Dance DJ | Final Project (Deliverable 6)
-- Run this file on the project database only: existing project data is removed.
PRAGMA foreign_keys = ON;

DROP VIEW IF EXISTS EventDetails;
DROP TABLE IF EXISTS SetlistVote;
DROP TABLE IF EXISTS SetlistRequest;
DROP TABLE IF EXISTS OrganizationFavoriteDance;
DROP TABLE IF EXISTS UserFavoriteDance;
DROP TABLE IF EXISTS Event;
DROP TABLE IF EXISTS DJSettings;
DROP TABLE IF EXISTS LineDance;
DROP TABLE IF EXISTS LineDanceOrganization;
DROP TABLE IF EXISTS EventVenue;
DROP TABLE IF EXISTS UserProfile;

CREATE TABLE UserProfile (
    id INTEGER PRIMARY KEY,
    display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
    email TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(trim(email)) > 0),
    role TEXT NOT NULL CHECK (role IN ('attendee', 'dj', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE DJSettings (
    user_profile_id INTEGER PRIMARY KEY REFERENCES UserProfile(id) ON DELETE CASCADE,
    auto_mix_enabled INTEGER NOT NULL DEFAULT 0 CHECK (auto_mix_enabled IN (0, 1)),
    default_genre TEXT,
    transition_seconds REAL CHECK (transition_seconds IS NULL OR transition_seconds >= 0),
    explicit_content_filter INTEGER NOT NULL DEFAULT 1 CHECK (explicit_content_filter IN (0, 1))
);

CREATE TABLE LineDanceOrganization (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    description TEXT,
    website_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE EventVenue (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL CHECK (length(state) = 2 AND state = upper(state)),
    capacity INTEGER CHECK (capacity IS NULL OR (typeof(capacity) = 'integer' AND capacity > 0))
);

CREATE TABLE LineDance (
    id INTEGER PRIMARY KEY,
    dance_name TEXT NOT NULL CHECK (length(trim(dance_name)) > 0),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'improver', 'intermediate', 'advanced')),
    song_name TEXT NOT NULL CHECK (length(trim(song_name)) > 0),
    tempo_bpm INTEGER CHECK (tempo_bpm IS NULL OR (typeof(tempo_bpm) = 'integer' AND tempo_bpm > 0)),
    choreography_url TEXT
);

CREATE TABLE UserFavoriteDance (
    id INTEGER PRIMARY KEY,
    user_profile_id INTEGER NOT NULL REFERENCES UserProfile(id) ON DELETE CASCADE,
    line_dance_id INTEGER NOT NULL REFERENCES LineDance(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_profile_id, line_dance_id)
);

CREATE TABLE OrganizationFavoriteDance (
    id INTEGER PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES LineDanceOrganization(id) ON DELETE CASCADE,
    line_dance_id INTEGER NOT NULL REFERENCES LineDance(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, line_dance_id)
);

CREATE TABLE Event (
    id INTEGER PRIMARY KEY,
    venue_id INTEGER NOT NULL REFERENCES EventVenue(id) ON DELETE RESTRICT,
    dj_user_profile_id INTEGER NOT NULL REFERENCES UserProfile(id) ON DELETE RESTRICT,
    event_name TEXT NOT NULL CHECK (length(trim(event_name)) > 0),
    starts_at TEXT NOT NULL CHECK (datetime(starts_at) IS NOT NULL)
);

CREATE TABLE SetlistRequest (
    id INTEGER PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES Event(id) ON DELETE CASCADE,
    requested_by INTEGER NOT NULL REFERENCES UserProfile(id) ON DELETE RESTRICT,
    line_dance_id INTEGER REFERENCES LineDance(id) ON DELETE SET NULL,
    song_name TEXT NOT NULL CHECK (length(trim(song_name)) BETWEEN 1 AND 150),
    dance_name TEXT CHECK (dance_name IS NULL OR length(trim(dance_name)) BETWEEN 1 AND 150),
    artist TEXT CHECK (artist IS NULL OR length(trim(artist)) BETWEEN 1 AND 150),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'played', 'removed')),
    requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    played_at TEXT,
    played_by INTEGER REFERENCES UserProfile(id) ON DELETE RESTRICT,
    CHECK ((status = 'played' AND played_at IS NOT NULL AND played_by IS NOT NULL)
        OR (status <> 'played' AND played_at IS NULL AND played_by IS NULL))
);
CREATE TABLE SetlistVote (
    request_id INTEGER NOT NULL REFERENCES SetlistRequest(id) ON DELETE CASCADE,
    user_profile_id INTEGER NOT NULL REFERENCES UserProfile(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (request_id, user_profile_id)
);


-- A venue's calendar is commonly filtered by venue and sorted by start time.
CREATE INDEX idx_event_venue_starts_at ON Event(venue_id, starts_at);
CREATE UNIQUE INDEX idx_setlist_pending_song
    ON SetlistRequest(event_id, lower(trim(song_name)), lower(trim(coalesce(artist, ''))))
    WHERE status = 'pending';
-- These reverse lookups support popularity reports and FK cleanup by dance.
CREATE INDEX idx_user_favorite_dance ON UserFavoriteDance(line_dance_id);
CREATE INDEX idx_organization_favorite_dance ON OrganizationFavoriteDance(line_dance_id);
CREATE INDEX idx_event_dj ON Event(dj_user_profile_id);
CREATE INDEX idx_setlist_event_status ON SetlistRequest(event_id, status, requested_at);
CREATE INDEX idx_setlist_requester ON SetlistRequest(requested_by);
CREATE INDEX idx_setlist_dance ON SetlistRequest(line_dance_id);
CREATE INDEX idx_setlist_played_by ON SetlistRequest(played_by);
CREATE INDEX idx_setlist_voter ON SetlistVote(user_profile_id);
CREATE VIEW EventDetails AS
SELECT e.id AS event_id, e.event_name, e.starts_at,
       v.id AS venue_id, v.name AS venue_name, v.city, v.state, v.capacity,
       u.id AS dj_user_profile_id, u.display_name AS dj_name,
       s.default_genre, s.auto_mix_enabled, s.explicit_content_filter
FROM Event AS e
JOIN EventVenue AS v ON v.id = e.venue_id
JOIN UserProfile AS u ON u.id = e.dj_user_profile_id
LEFT JOIN DJSettings AS s ON s.user_profile_id = u.id;
