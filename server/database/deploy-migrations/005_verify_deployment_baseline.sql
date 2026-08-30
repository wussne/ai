DO $$
BEGIN
  IF to_regclass('public.organizations') IS NULL
     OR to_regclass('public.organization_memberships') IS NULL
     OR to_regclass('public.audit_logs') IS NULL THEN
    RAISE EXCEPTION 'Deployment baseline is incomplete';
  END IF;
END;
$$;
