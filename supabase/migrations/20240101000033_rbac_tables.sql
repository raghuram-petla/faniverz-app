-- RBAC: Role-Based Access Control tables
-- Replaces the simple is_admin boolean with a full role system:
--   super_admin, admin, production_house_admin

-- ============================================================
-- 1. ROLE DEFINITIONS
-- ============================================================
CREATE TABLE admin_roles (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text
);

INSERT INTO admin_roles (id, label, description) VALUES
  ('super_admin', 'Super Admin', 'Full access to everything'),
  ('admin', 'Admin', 'Full content access, own audit log only'),
  ('production_house_admin', 'Production House Admin', 'Scoped to assigned production houses');

-- ============================================================
-- 2. USER-ROLE ASSIGNMENTS (one role per user)
-- ============================================================
CREATE TABLE admin_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  role_id text NOT NULL REFERENCES admin_roles,
  assigned_by uuid REFERENCES profiles,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================================
-- 3. PH ADMIN → PRODUCTION HOUSE ASSIGNMENTS (many-to-many)
-- ============================================================
CREATE TABLE admin_ph_assignments (
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  production_house_id uuid NOT NULL REFERENCES production_houses ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, production_house_id)
);

-- ============================================================
-- 4. EMAIL INVITATIONS
-- ============================================================
CREATE TABLE admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role_id text NOT NULL REFERENCES admin_roles,
  invited_by uuid NOT NULL REFERENCES profiles,
  production_house_ids uuid[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked')),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz DEFAULT now() + interval '7 days'
);

-- ============================================================
-- 5. ADD CREATED_BY TO ACTORS (ownership tracking for PH admins)
-- ============================================================
ALTER TABLE actors ADD COLUMN created_by uuid REFERENCES profiles;

-- ============================================================
-- 6. RLS ON NEW TABLES
-- ============================================================

-- admin_roles: all admins can read
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view roles"
  ON admin_roles FOR SELECT
  USING (public.is_admin());

-- admin_user_roles: all admins can read, super admins can manage
ALTER TABLE admin_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view user roles"
  ON admin_user_roles FOR SELECT
  USING (public.is_admin());

-- Note: is_super_admin() is created in the next migration (000034).
-- These INSERT/UPDATE/DELETE policies will become effective after that migration runs.
-- For now they reference is_admin() as a placeholder; 000034 will replace them.

-- admin_ph_assignments: all admins can read, super admins can manage
ALTER TABLE admin_ph_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view PH assignments"
  ON admin_ph_assignments FOR SELECT
  USING (public.is_admin());

-- admin_invitations: super admins manage
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. INDEXES
-- ============================================================
CREATE INDEX idx_admin_user_roles_user ON admin_user_roles(user_id);
CREATE INDEX idx_admin_ph_assignments_user ON admin_ph_assignments(user_id);
CREATE INDEX idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX idx_admin_invitations_token ON admin_invitations(token);
CREATE INDEX idx_actors_created_by ON actors(created_by);

NOTIFY pgrst, 'reload schema';
