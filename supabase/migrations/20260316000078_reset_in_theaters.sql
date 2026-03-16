-- Reset all movies to in_theaters = false.
-- Most movies were incorrectly marked as in_theaters during initial data entry.
UPDATE movies SET in_theaters = false WHERE in_theaters = true;
