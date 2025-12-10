-- Rename legacy metrics/datapoints to KPI and metric terminology

SET @db := DATABASE();
--> statement-breakpoint

-- Rename metrics table to kpis
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND COLUMN_NAME='kpi_name'
    )
    AND NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='kpis'),
    'RENAME TABLE metrics TO kpis',
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

-- Rename kpis indexes
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='kpis' AND INDEX_NAME='idx_metrics_scorecard'),
    'ALTER TABLE kpis RENAME INDEX idx_metrics_scorecard TO idx_kpis_scorecard',
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
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='kpis' AND INDEX_NAME='idx_metrics_section'),
    'ALTER TABLE kpis RENAME INDEX idx_metrics_section TO idx_kpis_section',
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
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='kpis' AND INDEX_NAME='idx_metrics_name'),
    'ALTER TABLE kpis RENAME INDEX idx_metrics_name TO idx_kpis_name',
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
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='kpis' AND INDEX_NAME='uniq_metric_kpi_section'),
    'ALTER TABLE kpis RENAME INDEX uniq_metric_kpi_section TO uniq_kpi_section',
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

-- Rename metric_data_points to metrics
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metric_data_points'),
    'RENAME TABLE metric_data_points TO metrics',
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

-- Update metrics foreign key column to kpi_id
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND COLUMN_NAME='metric_id'),
    'ALTER TABLE metrics CHANGE COLUMN metric_id kpi_id VARCHAR(36) NOT NULL',
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

-- Rename metrics indexes
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND INDEX_NAME='idx_datapoints_metric'),
    'ALTER TABLE metrics RENAME INDEX idx_datapoints_metric TO idx_metrics_kpi',
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
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND INDEX_NAME='uniq_metric_date'),
    'ALTER TABLE metrics RENAME INDEX uniq_metric_date TO uniq_metric_kpi_date',
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

-- Rename metric_values to kpi_values
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metric_values'),
    'RENAME TABLE metric_values TO kpi_values',
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

-- Update kpi_values foreign key column to kpi_id
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='kpi_values' AND COLUMN_NAME='metric_id'),
    'ALTER TABLE kpi_values CHANGE COLUMN metric_id kpi_id VARCHAR(36) NOT NULL',
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

-- Rename kpi_values indexes
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='kpi_values' AND INDEX_NAME='uniq_metric_value_key'),
    'ALTER TABLE kpi_values RENAME INDEX uniq_metric_value_key TO uniq_kpi_value_key',
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

-- Update assignments foreign key column to kpi_id
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='assignments' AND COLUMN_NAME='metric_id'),
    'ALTER TABLE assignments CHANGE COLUMN metric_id kpi_id VARCHAR(36) NOT NULL',
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

-- Rename assignments indexes
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='assignments' AND INDEX_NAME='idx_assignments_metric'),
    'ALTER TABLE assignments RENAME INDEX idx_assignments_metric TO idx_assignments_kpi',
    'SELECT 1'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
