-- Add dedicated sankey settings column and migrate legacy value_json metadata
ALTER TABLE kpis ADD COLUMN sankey_settings JSON NULL;

-- Move legacy __sankeySettings into the new column
UPDATE kpis
SET sankey_settings = JSON_EXTRACT(value_json, '$."__sankeySettings"')
WHERE JSON_EXTRACT(value_json, '$."__sankeySettings"') IS NOT NULL;

-- Remove legacy key from value_json
UPDATE kpis
SET value_json = JSON_REMOVE(value_json, '$."__sankeySettings"')
WHERE JSON_EXTRACT(value_json, '$."__sankeySettings"') IS NOT NULL;
