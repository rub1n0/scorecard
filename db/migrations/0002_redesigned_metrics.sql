-- Redesign metrics and datapoints to persist full definitions and per-date values

SET @db := DATABASE();
--> statement-breakpoint

-- Add missing metric definition columns
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND COLUMN_NAME='kpi_name'),
    'SELECT 1',
    'ALTER TABLE metrics ADD COLUMN kpi_name VARCHAR(255) NULL AFTER name'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND COLUMN_NAME='assignment'),
    'SELECT 1',
    'ALTER TABLE metrics ADD COLUMN assignment VARCHAR(255) NULL AFTER subtitle'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND COLUMN_NAME='stroke_width'),
    'SELECT 1',
    'ALTER TABLE metrics ADD COLUMN stroke_width INT NULL AFTER suffix'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND COLUMN_NAME='stroke_color'),
    'SELECT 1',
    'ALTER TABLE metrics ADD COLUMN stroke_color VARCHAR(64) NULL AFTER stroke_width'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND COLUMN_NAME='stroke_opacity'),
    'SELECT 1',
    'ALTER TABLE metrics ADD COLUMN stroke_opacity DOUBLE NULL AFTER stroke_color'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND COLUMN_NAME='show_legend'),
    'SELECT 1',
    'ALTER TABLE metrics ADD COLUMN show_legend TINYINT(1) NOT NULL DEFAULT 1 AFTER stroke_opacity'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND COLUMN_NAME='show_gridlines'),
    'SELECT 1',
    'ALTER TABLE metrics ADD COLUMN show_gridlines TINYINT(1) NOT NULL DEFAULT 1 AFTER show_legend'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND COLUMN_NAME='show_data_labels'),
    'SELECT 1',
    'ALTER TABLE metrics ADD COLUMN show_data_labels TINYINT(1) NOT NULL DEFAULT 0 AFTER show_gridlines'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

-- Backfill and enforce kpi_name
UPDATE metrics SET kpi_name = name WHERE (kpi_name IS NULL OR kpi_name = '') AND name IS NOT NULL;
--> statement-breakpoint
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND COLUMN_NAME='kpi_name' AND IS_NULLABLE='YES'),
    'ALTER TABLE metrics MODIFY kpi_name VARCHAR(255) NOT NULL',
    'SELECT 1'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

-- Pull chart settings JSON into discrete columns where present
UPDATE metrics
SET
    stroke_width = COALESCE(stroke_width, JSON_EXTRACT(chart_settings, '$.strokeWidth')),
    stroke_color = COALESCE(stroke_color, JSON_UNQUOTE(JSON_EXTRACT(chart_settings, '$.strokeColor'))),
    stroke_opacity = COALESCE(stroke_opacity, JSON_EXTRACT(chart_settings, '$.strokeOpacity')),
    show_legend = COALESCE(show_legend, JSON_EXTRACT(chart_settings, '$.showLegend'), 1),
    show_gridlines = COALESCE(show_gridlines, JSON_EXTRACT(chart_settings, '$.showGridLines'), 1),
    show_data_labels = COALESCE(show_data_labels, JSON_EXTRACT(chart_settings, '$.showDataLabels'), 0);
--> statement-breakpoint

-- Normalize boolean defaults after backfill
UPDATE metrics
SET
    show_legend = IFNULL(show_legend, 1),
    show_gridlines = IFNULL(show_gridlines, 1),
    show_data_labels = IFNULL(show_data_labels, 0);
--> statement-breakpoint

-- Skip adding a unique index if duplicates exist; the API enforces dedupe at runtime
SET @has_metric_duplicates := (
  SELECT COUNT(*) FROM (
    SELECT kpi_name, IFNULL(section_id, '__NULL__') AS section_key, COUNT(*) AS c
    FROM metrics
    GROUP BY kpi_name, section_key
    HAVING COUNT(*) > 1
  ) AS dup
);
--> statement-breakpoint

-- Enforce dedupe by KPI name + section
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND INDEX_NAME='uniq_metric_kpi_section'
    ) OR @has_metric_duplicates > 0,
    'SELECT 1',
    'CREATE UNIQUE INDEX uniq_metric_kpi_section ON metrics (kpi_name, section_id)'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

-- Normalize metric_data_points data before altering types
UPDATE metric_data_points
SET
    date = COALESCE(
        DATE_FORMAT(STR_TO_DATE(date, '%Y-%m-%d'), '%Y-%m-%d'),
        DATE_FORMAT(STR_TO_DATE(date, '%m/%d/%Y'), '%Y-%m-%d'),
        date
    );
--> statement-breakpoint

UPDATE metric_data_points
SET value = JSON_ARRAY(value)
WHERE JSON_VALID(value) = 0;
--> statement-breakpoint

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metric_data_points' AND COLUMN_NAME='date' AND DATA_TYPE <> 'date'
    ),
    'ALTER TABLE metric_data_points MODIFY COLUMN date DATE NOT NULL',
    'SELECT 1'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metric_data_points' AND COLUMN_NAME='value' AND DATA_TYPE <> 'json'
    ),
    'ALTER TABLE metric_data_points MODIFY COLUMN value JSON NOT NULL',
    'SELECT 1'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

-- Ensure unique constraint exists even if table was already migrated
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metric_data_points' AND INDEX_NAME='uniq_metric_date'
    ),
    'SELECT 1',
    'CREATE UNIQUE INDEX uniq_metric_date ON metric_data_points (metric_id, date)'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
