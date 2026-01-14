-- Add creator token to scorecards for ownership checks
ALTER TABLE scorecards
    ADD COLUMN creator_token VARCHAR(255) NULL AFTER banner_config;
