-- Line Dance DJ | Final Project (Deliverable 6) sample data
-- All people, organizations, venues, addresses, and event details are synthetic.
-- Dance/song labels are illustrative. Tempos are sample values, not music metadata.
-- Run schema.sql first. This file is intended to load once per rebuild.
PRAGMA foreign_keys = ON;

INSERT INTO UserProfile (id, display_name, email, role, created_at) VALUES
(1, 'Morgan Reed', 'morgan@example.com', 'dj', '2026-09-01 12:00:00'),
(2, 'Avery Collins', 'avery@example.com', 'dj', '2026-09-02 12:00:00'),
(3, 'Jordan Hayes', 'jordan@example.com', 'dj', '2026-09-03 12:00:00'),
(4, 'Taylor Brooks', 'taylor@example.com', 'admin', '2026-09-04 12:00:00'),
(5, 'Casey Parker', 'casey@example.com', 'attendee', '2026-09-05 12:00:00'),
(6, 'Riley Bennett', 'riley@example.com', 'attendee', '2026-09-06 12:00:00'),
(7, 'Jamie Foster', 'jamie@example.com', 'attendee', '2026-09-07 12:00:00'),
(8, 'Alex Turner', 'alex@example.com', 'attendee', '2026-09-08 12:00:00'),
(9, 'Sam Ellis', 'sam@example.com', 'attendee', '2026-09-09 12:00:00'),
(10, 'Drew Lane', 'drew@example.com', 'dj', '2026-09-10 12:00:00');

INSERT INTO DJSettings VALUES
(1, 1, 'country', 4.0, 1),
(2, 0, 'pop', 0.0, 1),
(3, 1, 'country', 6.5, 0),
(4, 0, NULL, NULL, 1);

INSERT INTO LineDanceOrganization (id, name, description, website_url, created_at) VALUES
(1, 'Valley Line Dancers', 'Weekly beginner lessons and social dances.', 'https://valleydancers.example.com', '2026-09-01 12:00:00'),
(2, 'Rocket City Steps', 'Mixed-level dance nights and weekend workshops.', 'https://rocketsteps.example.com', '2026-09-02 12:00:00'),
(3, 'Smoky Mountain Dance Club', 'Country favorites and intermediate lessons.', NULL, '2026-09-03 12:00:00'),
(4, 'Campus Country Club', 'Student social dances during the semester.', NULL, '2026-09-04 12:00:00');

INSERT INTO EventVenue VALUES
(1, 'Cedar Hall', '100 Sample Lane', 'Knoxville', 'TN', 120),
(2, 'Maple Community Center', '200 Example Road', 'Huntsville', 'AL', 200),
(3, 'Riverbend Studio', '300 Practice Avenue', 'Maryville', 'TN', 60),
(4, 'Campus Activity Hall', '400 Demo Drive', 'Knoxville', 'TN', 150),
(5, 'Oak Pavilion', '500 Test Street', 'Huntsville', 'AL', NULL);

INSERT INTO LineDance VALUES
(1, 'Copperhead Road', 'beginner', 'Copperhead Road', 82, 'https://steps.example.com/copperhead-road'),
(2, 'Boot Scootin Boogie', 'beginner', 'Boot Scootin Boogie', 130, 'https://steps.example.com/boot-scootin'),
(3, 'Watermelon Crawl', 'improver', 'Watermelon Crawl', 136, 'https://steps.example.com/watermelon-crawl'),
(4, 'Footloose', 'intermediate', 'Footloose', 174, 'https://steps.example.com/footloose'),
(5, 'Good Time', 'beginner', 'Good Time', 132, NULL),
(6, 'Tush Push', 'improver', 'Chattahoochee', 92, 'https://steps.example.com/tush-push'),
(7, 'Electric Slide', 'beginner', 'Electric Boogie', 108, NULL),
(8, 'Chill Factor', 'intermediate', 'Last Night', 120, 'https://steps.example.com/chill-factor'),
(9, 'Advanced Workshop Combo', 'advanced', 'Workshop Practice Mix', NULL, NULL),
(10, 'Country Two Step Line', 'improver', 'Country Practice Mix', 112, NULL);

INSERT INTO UserFavoriteDance (id, user_profile_id, line_dance_id, created_at) VALUES
(1, 1, 1, '2026-09-12 12:00:00'),
(2, 1, 2, '2026-09-12 12:01:00'),
(3, 1, 4, '2026-09-12 12:02:00'),
(4, 2, 4, '2026-09-13 12:00:00'),
(5, 2, 7, '2026-09-13 12:01:00'),
(6, 2, 8, '2026-09-13 12:02:00'),
(7, 3, 1, '2026-09-14 12:00:00'),
(8, 3, 3, '2026-09-14 12:01:00'),
(9, 3, 6, '2026-09-14 12:02:00'),
(10, 4, 5, '2026-09-15 12:00:00'),
(11, 5, 1, '2026-09-16 12:00:00'),
(12, 5, 2, '2026-09-16 12:01:00'),
(13, 5, 5, '2026-09-16 12:02:00'),
(14, 6, 3, '2026-09-17 12:00:00'),
(15, 6, 4, '2026-09-17 12:01:00'),
(16, 6, 8, '2026-09-17 12:02:00'),
(17, 7, 1, '2026-09-18 12:00:00'),
(18, 7, 7, '2026-09-18 12:01:00'),
(19, 8, 2, '2026-09-19 12:00:00'),
(20, 8, 6, '2026-09-19 12:01:00');

INSERT INTO OrganizationFavoriteDance (id, organization_id, line_dance_id, created_at) VALUES
(1, 1, 1, '2026-09-20 12:00:00'),
(2, 1, 2, '2026-09-20 12:01:00'),
(3, 1, 5, '2026-09-20 12:02:00'),
(4, 1, 7, '2026-09-20 12:03:00'),
(5, 2, 1, '2026-09-21 12:00:00'),
(6, 2, 4, '2026-09-21 12:01:00'),
(7, 2, 8, '2026-09-21 12:02:00'),
(8, 3, 3, '2026-09-22 12:00:00'),
(9, 3, 6, '2026-09-22 12:01:00'),
(10, 3, 4, '2026-09-22 12:02:00'),
(11, 4, 2, '2026-09-23 12:00:00'),
(12, 4, 7, '2026-09-23 12:01:00');
-- Drew has an event but no saved DJ settings, exercising the view's LEFT JOIN.

INSERT INTO Event VALUES
(1, 1, 1, 'Friday Beginner Night', '2026-10-02 23:00:00'),
(2, 2, 2, 'Rocket City Social', '2026-10-03 23:30:00'),
(3, 3, 3, 'Intermediate Steps Workshop', '2026-10-10 18:00:00'),
(4, 4, 4, 'Campus Country Night', '2026-10-16 23:00:00'),
(5, 1, 1, 'Fall Favorites Social', '2026-10-24 23:00:00'),
(6, 2, 3, 'Saturday Country Mix', '2026-11-01 00:00:00'),
(7, 3, 10, 'New DJ Practice Night', '2026-11-07 23:00:00'),
(8, 4, 2, 'End of Semester Dance', '2026-11-21 00:00:00');

