-- Add viewer role: read-only access to all admin pages, no mutation permissions
INSERT INTO admin_roles (id, label, description)
VALUES ('viewer', 'Viewer', 'Read-only access — can view all data but cannot make changes')
ON CONFLICT (id) DO NOTHING;
