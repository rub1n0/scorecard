-- Add banner status to KPI tiles
ALTER TABLE kpis
    ADD COLUMN banner_status VARCHAR(32) NULL AFTER comment_text_size;
