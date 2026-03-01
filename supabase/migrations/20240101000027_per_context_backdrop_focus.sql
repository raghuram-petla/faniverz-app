-- Per-context backdrop focal points: different crops for spotlight vs movie detail
ALTER TABLE movies ADD COLUMN IF NOT EXISTS spotlight_focus_x float4;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS spotlight_focus_y float4;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS detail_focus_x float4;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS detail_focus_y float4;
