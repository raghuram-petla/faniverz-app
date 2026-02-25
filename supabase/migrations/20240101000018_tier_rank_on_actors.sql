-- Correction: tier_rank belongs to the actor (their industry standing),
-- not to a specific movie role.
--
-- Tier reference (actor industry standing):
--   1 = A-list superstar (Mahesh Babu, Jr. NTR, Pawan Kalyan)
--   2 = Top star (established lead)
--   3 = Popular star (second-tier lead)
--   4 = Character artist / supporting regular
--   5 = Newcomer / smaller role

ALTER TABLE actors
  ADD COLUMN IF NOT EXISTS tier_rank smallint;

-- Remove the per-movie tier_rank that was mistakenly added to movie_cast
ALTER TABLE movie_cast
  DROP COLUMN IF EXISTS tier_rank;
