-- Line Dance DJ | Final Project (Deliverable 6)
-- Create a new DJ account and its initial music settings together.
-- If saving the settings fails, the account should not be left half configured.
-- ROLLBACK makes this demonstration safe to repeat without changing sample data.
PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

INSERT INTO UserProfile (display_name, email, role)
VALUES ('Quinn Davis', 'quinn.transaction@example.com', 'dj');

INSERT INTO DJSettings (
    user_profile_id, auto_mix_enabled, default_genre,
    transition_seconds, explicit_content_filter
)
VALUES (
    (SELECT id FROM UserProfile WHERE email = 'quinn.transaction@example.com'),
    1, 'country', 4.0, 1
);

-- The new profile and its related settings are visible inside the transaction.
SELECT u.display_name AS new_dj, u.role, s.default_genre,
       s.auto_mix_enabled, s.transition_seconds, s.explicit_content_filter
FROM UserProfile AS u
INNER JOIN DJSettings AS s ON s.user_profile_id = u.id
WHERE u.email = 'quinn.transaction@example.com';

ROLLBACK;

-- Both counts should be zero after the rollback.
SELECT
    (SELECT COUNT(*) FROM UserProfile
     WHERE email = 'quinn.transaction@example.com') AS demo_profiles_after_rollback,
    (SELECT COUNT(*) FROM DJSettings
     WHERE user_profile_id NOT IN (SELECT id FROM UserProfile))
        AS orphan_settings_after_rollback;
