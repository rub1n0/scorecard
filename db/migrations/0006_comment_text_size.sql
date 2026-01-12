-- Add comment text size for KPI notes
ALTER TABLE kpis
    ADD COLUMN comment_text_size VARCHAR(24) NULL AFTER notes;
