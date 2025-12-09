-- Initial schema for scorecards/metrics/assignments

CREATE TABLE IF NOT EXISTS scorecards (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_scorecards_name (name)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS sections (
  id VARCHAR(36) PRIMARY KEY,
  scorecard_id VARCHAR(36) NOT NULL,
  name VARCHAR(255),
  display_order INT NOT NULL DEFAULT 0,
  color VARCHAR(64),
  opacity DOUBLE DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_sections_scorecard (scorecard_id)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS metrics (
  id VARCHAR(36) PRIMARY KEY,
  scorecard_id VARCHAR(36) NOT NULL,
  section_id VARCHAR(36),
  name VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  visualization_type VARCHAR(32) NOT NULL,
  chart_type VARCHAR(32),
  reverse_trend BOOLEAN NOT NULL DEFAULT FALSE,
  update_token VARCHAR(255),
  date DATETIME(3) NOT NULL,
  prefix VARCHAR(32),
  suffix VARCHAR(32),
  trend_value DOUBLE,
  latest_value DOUBLE,
  value_json JSON,
  notes TEXT,
  chart_settings JSON,
  `order` INT,
  last_updated_by VARCHAR(255),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_metrics_scorecard (scorecard_id),
  INDEX idx_metrics_section (section_id),
  INDEX idx_metrics_name (name)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS metric_data_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metric_id VARCHAR(36) NOT NULL,
  date VARCHAR(64) NOT NULL,
  value DOUBLE NOT NULL,
  color VARCHAR(32),
  INDEX idx_datapoints_metric (metric_id)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS metric_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metric_id VARCHAR(36) NOT NULL,
  value_key VARCHAR(255) NOT NULL,
  numeric_value DOUBLE,
  text_value TEXT,
  UNIQUE KEY uniq_metric_value_key (metric_id, value_key)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS assignments (
  id VARCHAR(36) PRIMARY KEY,
  metric_id VARCHAR(36) NOT NULL,
  section_id VARCHAR(36),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_assignments_metric (metric_id)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_users_email (email)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS assignment_assignees (
  id VARCHAR(36) PRIMARY KEY,
  assignment_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  INDEX idx_assignment_users_assignment (assignment_id),
  INDEX idx_assignment_users_user (user_id)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS scorecard_assignee_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scorecard_id VARCHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  UNIQUE KEY uniq_scorecard_email (scorecard_id, email)
);
--> statement-breakpoint

-- Idempotent alters to add missing timestamp columns if tables already existed without them
SET @db := DATABASE();
--> statement-breakpoint

-- sections.created_at
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='sections' AND COLUMN_NAME='created_at'),
    'SELECT 1',
    'ALTER TABLE sections ADD COLUMN created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

-- sections.updated_at
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='sections' AND COLUMN_NAME='updated_at'),
    'SELECT 1',
    'ALTER TABLE sections ADD COLUMN updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

-- sections.opacity
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='sections' AND COLUMN_NAME='opacity'),
    'SELECT 1',
    'ALTER TABLE sections ADD COLUMN opacity DOUBLE DEFAULT 1'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

-- metrics.created_at
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND COLUMN_NAME='created_at'),
    'SELECT 1',
    'ALTER TABLE metrics ADD COLUMN created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

-- metrics.updated_at
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metrics' AND COLUMN_NAME='updated_at'),
    'SELECT 1',
    'ALTER TABLE metrics ADD COLUMN updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

-- assignments.created_at
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='assignments' AND COLUMN_NAME='created_at'),
    'SELECT 1',
    'ALTER TABLE assignments ADD COLUMN created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

-- assignments.updated_at
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='assignments' AND COLUMN_NAME='updated_at'),
    'SELECT 1',
    'ALTER TABLE assignments ADD COLUMN updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

-- users.created_at
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='created_at'),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

-- users.updated_at
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='updated_at'),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)'
  )
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
