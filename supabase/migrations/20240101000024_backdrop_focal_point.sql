-- Add per-movie backdrop focal point.
-- Stored as fractional coordinates (0.0–1.0) so the mobile app can use
-- expo-image contentPosition to frame the backdrop correctly for each movie.
-- NULL means use the default (centered) behaviour.

ALTER TABLE movies ADD COLUMN backdrop_focus_x float4;
ALTER TABLE movies ADD COLUMN backdrop_focus_y float4;
