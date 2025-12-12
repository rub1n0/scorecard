-- Add target fields for number/text KPIs
ALTER TABLE kpis
    ADD COLUMN target_value JSON NULL AFTER latest_value,
    ADD COLUMN target_color VARCHAR(64) NULL AFTER target_value;
