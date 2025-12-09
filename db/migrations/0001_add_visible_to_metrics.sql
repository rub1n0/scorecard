SET @db := DATABASE();
--> statement-breakpoint

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db
        AND TABLE_NAME = 'metrics'
        AND COLUMN_NAME = 'visible'
    ),
    'SELECT 1',
    'ALTER TABLE `metrics` ADD COLUMN `visible` TINYINT(1) NOT NULL DEFAULT 1'
  )
);
--> statement-breakpoint

PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
