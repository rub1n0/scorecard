-- Add banner configuration to scorecards
ALTER TABLE scorecards
    ADD COLUMN banner_config JSON NULL AFTER description;
