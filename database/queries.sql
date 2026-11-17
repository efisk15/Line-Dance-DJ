-- Line Dance DJ | Final Project (Deliverable 6)
-- Reports use the dance, favorites, event, venue, and DJ settings tables.
-- (SetlistRequest and SetlistVote are used by the application, not by these reports.)
-- Requirements 1, 4, 6, 7, and 8 support dance selection and favorites.
-- Requirements 2, 3, 5, and 9 support event planning and scheduling.
PRAGMA foreign_keys = ON;


-- Requirement 1: Filtering and Sorting
-- Which beginner dances have a sample tempo of 120 BPM or less?
-- A DJ can use this list when planning a slower beginner lesson.
SELECT dance_name, song_name, tempo_bpm
FROM LineDance
WHERE difficulty = 'beginner' AND tempo_bpm <= 120
ORDER BY tempo_bpm, dance_name;

-- Requirement 2: INNER JOIN
-- Who is assigned to DJ each event, and when does it start?
SELECT e.event_name, e.starts_at, u.display_name AS dj_name
FROM Event AS e
INNER JOIN UserProfile AS u ON u.id = e.dj_user_profile_id
ORDER BY e.starts_at, e.id;

-- Requirement 3: LEFT JOIN
-- Which venues have scheduled events, and which have none?
-- Oak Pavilion has no event and appears with NULL event information.
SELECT v.name AS venue_name, v.city, e.event_name, e.starts_at
FROM EventVenue AS v
LEFT JOIN Event AS e ON e.venue_id = v.id
ORDER BY v.name, e.starts_at, e.id;

-- Requirement 4: Three-Table Join
-- What dances has each organization saved for future dance nights?
SELECT o.name AS organization_name, d.dance_name, d.song_name, d.difficulty
FROM LineDanceOrganization AS o
INNER JOIN OrganizationFavoriteDance AS f ON f.organization_id = o.id
INNER JOIN LineDance AS d ON d.id = f.line_dance_id
ORDER BY o.name, d.dance_name;

-- Requirement 5: Aggregate Query
-- How many events are scheduled at Cedar Hall, and what is their date range?
SELECT COUNT(*) AS scheduled_events,
       MIN(starts_at) AS first_event_start,
       MAX(starts_at) AS last_event_start
FROM Event
WHERE venue_id = 1;

-- Requirement 6: GROUP BY and HAVING
-- Which dances have been saved by at least three users?
-- This popularity report helps DJs choose familiar dances.
SELECT d.id AS dance_id, d.dance_name, COUNT(*) AS user_favorite_count
FROM LineDance AS d
INNER JOIN UserFavoriteDance AS f ON f.line_dance_id = d.id
GROUP BY d.id, d.dance_name
HAVING COUNT(*) >= 3
ORDER BY user_favorite_count DESC, d.dance_name;

-- Requirement 7: Subquery
-- Which dances saved by Valley Line Dancers has Casey Parker not saved yet?
-- These are suggestions Casey could explore from the organization's list.
SELECT d.dance_name, d.song_name, d.difficulty
FROM LineDance AS d
WHERE d.id IN (
    SELECT line_dance_id
    FROM OrganizationFavoriteDance
    WHERE organization_id = 1
)
AND NOT EXISTS (
    SELECT 1
    FROM UserFavoriteDance AS f
    WHERE f.user_profile_id = 5 AND f.line_dance_id = d.id
)
ORDER BY d.dance_name;

-- Requirement 8: Set Operation
-- What combined list of dances could Morgan Reed consider when planning
-- a night for Valley Line Dancers, using both saved favorites lists?
-- UNION lists a dance once even when both Morgan and the organization saved it.
SELECT d.id AS dance_id, d.dance_name, d.song_name
FROM LineDance AS d
INNER JOIN UserFavoriteDance AS f ON f.line_dance_id = d.id
WHERE f.user_profile_id = 1
UNION
SELECT d.id AS dance_id, d.dance_name, d.song_name
FROM LineDance AS d
INNER JOIN OrganizationFavoriteDance AS f ON f.line_dance_id = d.id
WHERE f.organization_id = 1
ORDER BY dance_name;

-- Requirement 9: View
-- What are the November event locations, assigned DJs, and music settings?
-- EventDetails supplies this report without repeating its four-table join.
-- Event 7 still appears even though its DJ has no saved settings.
SELECT event_name, starts_at, venue_name, city, dj_name,
       default_genre, auto_mix_enabled, explicit_content_filter
FROM EventDetails
WHERE starts_at >= '2026-11-01 00:00:00'
  AND starts_at < '2026-12-01 00:00:00'
ORDER BY starts_at, event_id;
