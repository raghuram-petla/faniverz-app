-- Fix: Add SET search_path = '' to all SECURITY DEFINER functions that lack it.
-- This prevents search_path hijacking / privilege escalation attacks.

-- 1. audit_trigger_fn — originally in 20240101000032, overridden in 20240101000039
ALTER FUNCTION public.audit_trigger_fn()
  SET search_path = '';

-- 2. auto_set_in_theaters — originally in 20260314000066
ALTER FUNCTION public.auto_set_in_theaters()
  SET search_path = '';
