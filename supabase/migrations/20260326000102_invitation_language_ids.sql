-- Add language_ids column to admin_invitations so that language assignments
-- can be stored at invitation time and applied when the invitation is accepted.

ALTER TABLE admin_invitations
  ADD COLUMN language_ids uuid[] DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
