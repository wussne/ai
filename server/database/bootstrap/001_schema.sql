--
-- PostgreSQL database dump
--

\restrict qheylXtzGIqPmYhll8EHVhfyUNJbcaIcHvgZNHBjIFcR5grJphyfHeOgTAInapb

-- Dumped from database version 14.19 (Homebrew)
-- Dumped by pg_dump version 14.19 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: regulation_access_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.regulation_access_level AS ENUM (
    'view',
    'edit',
    'approve',
    'manage'
);


--
-- Name: regulation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.regulation_status AS ENUM (
    'draft',
    'review',
    'approved',
    'archived'
);


--
-- Name: audit_row_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_row_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  context jsonb := COALESCE(
    NULLIF(current_setting('app.audit_context', true), '')::jsonb,
    '{}'::jsonb
  );
  old_snapshot jsonb;
  new_snapshot jsonb;
  record_snapshot jsonb;
  change_set jsonb;
  target_organization_id bigint;
  target_entity_id text;
BEGIN
  -- Organizations are deactivated by the application. A physical DELETE cannot
  -- append a child log row after the parent has gone because of the tenant FK.
  IF TG_TABLE_NAME = 'organizations' AND TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  old_snapshot := audit_safe_snapshot(TG_TABLE_NAME, CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END);
  new_snapshot := audit_safe_snapshot(TG_TABLE_NAME, CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END);
  record_snapshot := COALESCE(new_snapshot, old_snapshot, '{}'::jsonb);

  IF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(jsonb_object_agg(key, jsonb_build_object('before', old_snapshot -> key, 'after', value)), '{}'::jsonb)
    INTO change_set
    FROM jsonb_each(new_snapshot)
    WHERE old_snapshot -> key IS DISTINCT FROM value;

    IF TG_TABLE_NAME = 'users' AND to_jsonb(OLD) -> 'password_hash' IS DISTINCT FROM to_jsonb(NEW) -> 'password_hash' THEN
      change_set := change_set || jsonb_build_object('password_changed', jsonb_build_object('before', false, 'after', true));
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    change_set := jsonb_build_object('after', new_snapshot);
  ELSE
    change_set := jsonb_build_object('before', old_snapshot);
  END IF;

  target_organization_id := CASE
    WHEN TG_TABLE_NAME = 'organizations' THEN NULLIF(record_snapshot ->> 'id', '')::bigint
    ELSE COALESCE(
      NULLIF(record_snapshot ->> 'organization_id', '')::bigint,
      NULLIF(context ->> 'organizationId', '')::bigint
    )
  END;

  IF target_organization_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- During a physical organization delete, cascading child triggers run while
  -- the parent row is already unavailable. The application uses soft delete;
  -- skip these maintenance-only cascade records to preserve FK integrity.
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = target_organization_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  target_entity_id := COALESCE(
    record_snapshot ->> 'id',
    record_snapshot ->> 'membership_id',
    record_snapshot ->> 'role_id',
    record_snapshot ->> 'responsibility_id',
    record_snapshot ->> 'function_id',
    record_snapshot ->> 'regulation_id',
    record_snapshot ->> 'user_id'
  );

  INSERT INTO audit_logs (
    organization_id, request_id, actor_membership_id, actor_user_id,
    actor_name, actor_email, action, entity_type, entity_id, changes, metadata
  ) VALUES (
    target_organization_id,
    NULLIF(context ->> 'requestId', '')::uuid,
    NULLIF(context ->> 'membershipId', '')::bigint,
    NULLIF(context ->> 'userId', '')::bigint,
    COALESCE(NULLIF(context ->> 'actorName', ''), 'Системное изменение'),
    NULLIF(context ->> 'actorEmail', ''),
    lower(TG_OP),
    TG_TABLE_NAME,
    target_entity_id,
    change_set,
    context - ARRAY['organizationId', 'membershipId', 'userId', 'actorName', 'actorEmail']
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: audit_safe_snapshot(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_safe_snapshot(table_name text, snapshot jsonb) RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT (CASE
    WHEN snapshot IS NULL THEN NULL
    WHEN table_name = 'users' THEN snapshot - 'password_hash'
    WHEN table_name = 'regulation_versions' THEN
      snapshot - 'content' || jsonb_build_object(
        'content_length', length(COALESCE(snapshot ->> 'content', ''))
      )
    ELSE snapshot
  END) - 'created_at' - 'updated_at';
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    organization_id bigint NOT NULL,
    request_id uuid,
    actor_membership_id bigint,
    actor_user_id bigint,
    actor_name character varying(255),
    actor_email character varying(254),
    action character varying(32) NOT NULL,
    entity_type character varying(128) NOT NULL,
    entity_id character varying(255),
    changes jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: business_functions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_functions (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    organization_id bigint NOT NULL
);


--
-- Name: business_functions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_functions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_functions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.business_functions_id_seq OWNED BY public.business_functions.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    parent_department_id bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    organization_id bigint NOT NULL
);


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: function_regulations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.function_regulations (
    function_id bigint NOT NULL,
    regulation_id bigint NOT NULL,
    access_level public.regulation_access_level DEFAULT 'view'::public.regulation_access_level NOT NULL,
    organization_id bigint NOT NULL
);


--
-- Name: membership_responsibilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.membership_responsibilities (
    organization_id bigint NOT NULL,
    membership_id bigint NOT NULL,
    responsibility_id bigint NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: membership_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.membership_roles (
    organization_id bigint NOT NULL,
    membership_id bigint NOT NULL,
    role_id bigint NOT NULL
);


--
-- Name: organization_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_memberships (
    id bigint NOT NULL,
    organization_id bigint NOT NULL,
    user_id bigint NOT NULL,
    department_id bigint,
    position_id bigint,
    is_owner boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: organization_memberships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.organization_memberships ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.organization_memberships_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(63) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT organizations_slug_format CHECK (((slug)::text ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'::text))
);


--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.organizations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.organizations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id bigint NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: position_responsibilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.position_responsibilities (
    position_id bigint NOT NULL,
    responsibility_id bigint NOT NULL,
    organization_id bigint NOT NULL
);


--
-- Name: positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.positions (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    organization_id bigint NOT NULL
);


--
-- Name: positions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.positions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: positions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.positions_id_seq OWNED BY public.positions.id;


--
-- Name: regulation_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulation_versions (
    id bigint NOT NULL,
    regulation_id bigint NOT NULL,
    version_number integer NOT NULL,
    content text NOT NULL,
    change_description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    approved_at timestamp without time zone,
    organization_id bigint NOT NULL,
    created_by_membership_id bigint,
    approved_by_membership_id bigint,
    CONSTRAINT chk_version_number CHECK ((version_number > 0))
);


--
-- Name: regulation_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.regulation_versions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: regulation_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.regulation_versions_id_seq OWNED BY public.regulation_versions.id;


--
-- Name: regulations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulations (
    id bigint NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status public.regulation_status DEFAULT 'draft'::public.regulation_status NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    organization_id bigint NOT NULL,
    created_by_membership_id bigint
);


--
-- Name: regulations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.regulations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: regulations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.regulations_id_seq OWNED BY public.regulations.id;


--
-- Name: responsibilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.responsibilities (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    organization_id bigint NOT NULL
);


--
-- Name: responsibilities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.responsibilities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: responsibilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.responsibilities_id_seq OWNED BY public.responsibilities.id;


--
-- Name: responsibility_functions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.responsibility_functions (
    responsibility_id bigint NOT NULL,
    function_id bigint NOT NULL,
    organization_id bigint NOT NULL
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_id bigint NOT NULL,
    permission_id bigint NOT NULL,
    organization_id bigint NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    organization_id bigint NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255),
    password_hash text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: business_functions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_functions ALTER COLUMN id SET DEFAULT nextval('public.business_functions_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: positions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions ALTER COLUMN id SET DEFAULT nextval('public.positions_id_seq'::regclass);


--
-- Name: regulation_versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_versions ALTER COLUMN id SET DEFAULT nextval('public.regulation_versions_id_seq'::regclass);


--
-- Name: regulations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulations ALTER COLUMN id SET DEFAULT nextval('public.regulations_id_seq'::regclass);


--
-- Name: responsibilities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibilities ALTER COLUMN id SET DEFAULT nextval('public.responsibilities_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: business_functions business_functions_organization_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_functions
    ADD CONSTRAINT business_functions_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: business_functions business_functions_organization_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_functions
    ADD CONSTRAINT business_functions_organization_name_key UNIQUE (organization_id, name);


--
-- Name: business_functions business_functions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_functions
    ADD CONSTRAINT business_functions_pkey PRIMARY KEY (id);


--
-- Name: departments departments_organization_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: departments departments_organization_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_organization_name_key UNIQUE (organization_id, name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: function_regulations function_regulations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.function_regulations
    ADD CONSTRAINT function_regulations_pkey PRIMARY KEY (function_id, regulation_id);


--
-- Name: membership_responsibilities membership_responsibilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_responsibilities
    ADD CONSTRAINT membership_responsibilities_pkey PRIMARY KEY (organization_id, membership_id, responsibility_id);


--
-- Name: membership_roles membership_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_roles
    ADD CONSTRAINT membership_roles_pkey PRIMARY KEY (organization_id, membership_id, role_id);


--
-- Name: organization_memberships organization_memberships_organization_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_memberships
    ADD CONSTRAINT organization_memberships_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: organization_memberships organization_memberships_organization_user_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_memberships
    ADD CONSTRAINT organization_memberships_organization_user_key UNIQUE (organization_id, user_id);


--
-- Name: organization_memberships organization_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_memberships
    ADD CONSTRAINT organization_memberships_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: position_responsibilities position_responsibilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_responsibilities
    ADD CONSTRAINT position_responsibilities_pkey PRIMARY KEY (position_id, responsibility_id);


--
-- Name: positions positions_organization_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: positions positions_organization_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_organization_name_key UNIQUE (organization_id, name);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: regulation_versions regulation_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_versions
    ADD CONSTRAINT regulation_versions_pkey PRIMARY KEY (id);


--
-- Name: regulations regulations_organization_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulations
    ADD CONSTRAINT regulations_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: regulations regulations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulations
    ADD CONSTRAINT regulations_pkey PRIMARY KEY (id);


--
-- Name: responsibilities responsibilities_organization_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibilities
    ADD CONSTRAINT responsibilities_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: responsibilities responsibilities_organization_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibilities
    ADD CONSTRAINT responsibilities_organization_name_key UNIQUE (organization_id, name);


--
-- Name: responsibilities responsibilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibilities
    ADD CONSTRAINT responsibilities_pkey PRIMARY KEY (id);


--
-- Name: responsibility_functions responsibility_functions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibility_functions
    ADD CONSTRAINT responsibility_functions_pkey PRIMARY KEY (responsibility_id, function_id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_organization_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: roles roles_organization_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_organization_name_key UNIQUE (organization_id, name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: regulation_versions uq_regulation_version; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_versions
    ADD CONSTRAINT uq_regulation_version UNIQUE (regulation_id, version_number);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (sid);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_organization_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_organization_actor_idx ON public.audit_logs USING btree (organization_id, actor_membership_id, created_at DESC);


--
-- Name: audit_logs_organization_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_organization_created_idx ON public.audit_logs USING btree (organization_id, created_at DESC, id DESC);


--
-- Name: audit_logs_organization_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_organization_entity_idx ON public.audit_logs USING btree (organization_id, entity_type, entity_id, created_at DESC);


--
-- Name: audit_logs_request_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_request_idx ON public.audit_logs USING btree (request_id) WHERE (request_id IS NOT NULL);


--
-- Name: idx_function_regulations_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_function_regulations_organization ON public.function_regulations USING btree (organization_id);


--
-- Name: idx_function_regulations_regulation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_function_regulations_regulation ON public.function_regulations USING btree (regulation_id);


--
-- Name: idx_memberships_organization_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memberships_organization_active ON public.organization_memberships USING btree (organization_id, is_active);


--
-- Name: idx_memberships_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memberships_user_active ON public.organization_memberships USING btree (user_id, is_active);


--
-- Name: idx_position_responsibilities_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_position_responsibilities_organization ON public.position_responsibilities USING btree (organization_id);


--
-- Name: idx_position_responsibilities_responsibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_position_responsibilities_responsibility ON public.position_responsibilities USING btree (responsibility_id);


--
-- Name: idx_regulation_versions_organization_regulation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regulation_versions_organization_regulation ON public.regulation_versions USING btree (organization_id, regulation_id);


--
-- Name: idx_regulation_versions_regulation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regulation_versions_regulation ON public.regulation_versions USING btree (regulation_id);


--
-- Name: idx_regulations_organization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regulations_organization_status ON public.regulations USING btree (organization_id, status);


--
-- Name: idx_regulations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regulations_status ON public.regulations USING btree (status);


--
-- Name: idx_responsibility_functions_function; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_responsibility_functions_function ON public.responsibility_functions USING btree (function_id);


--
-- Name: idx_responsibility_functions_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_responsibility_functions_organization ON public.responsibility_functions USING btree (organization_id);


--
-- Name: idx_role_permissions_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_organization ON public.role_permissions USING btree (organization_id);


--
-- Name: idx_role_permissions_permission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_permission ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_user_sessions_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_expire ON public.user_sessions USING btree (expire);


--
-- Name: idx_users_email_normalized; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_email_normalized ON public.users USING btree (lower((email)::text)) WHERE (email IS NOT NULL);


--
-- Name: organizations_slug_normalized_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX organizations_slug_normalized_key ON public.organizations USING btree (lower((slug)::text));


--
-- Name: business_functions audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.business_functions FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: departments audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: function_regulations audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.function_regulations FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: membership_responsibilities audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.membership_responsibilities FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: membership_roles audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.membership_roles FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: organization_memberships audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.organization_memberships FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: organizations audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: position_responsibilities audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.position_responsibilities FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: positions audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.positions FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: regulation_versions audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.regulation_versions FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: regulations audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.regulations FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: responsibilities audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.responsibilities FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: responsibility_functions audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.responsibility_functions FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: role_permissions audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: roles audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: users audit_row_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_row_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: regulations update_regulations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_regulations_updated_at BEFORE UPDATE ON public.regulations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audit_logs audit_logs_actor_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_membership_id_fkey FOREIGN KEY (actor_membership_id) REFERENCES public.organization_memberships(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: business_functions fk_business_functions_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_functions
    ADD CONSTRAINT fk_business_functions_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: departments fk_department_parent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT fk_department_parent FOREIGN KEY (organization_id, parent_department_id) REFERENCES public.departments(organization_id, id);


--
-- Name: departments fk_departments_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT fk_departments_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: function_regulations fk_function_regulation_function; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.function_regulations
    ADD CONSTRAINT fk_function_regulation_function FOREIGN KEY (organization_id, function_id) REFERENCES public.business_functions(organization_id, id) ON DELETE CASCADE;


--
-- Name: function_regulations fk_function_regulation_regulation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.function_regulations
    ADD CONSTRAINT fk_function_regulation_regulation FOREIGN KEY (organization_id, regulation_id) REFERENCES public.regulations(organization_id, id) ON DELETE CASCADE;


--
-- Name: organization_memberships fk_membership_department; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_memberships
    ADD CONSTRAINT fk_membership_department FOREIGN KEY (organization_id, department_id) REFERENCES public.departments(organization_id, id);


--
-- Name: organization_memberships fk_membership_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_memberships
    ADD CONSTRAINT fk_membership_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_memberships fk_membership_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_memberships
    ADD CONSTRAINT fk_membership_position FOREIGN KEY (organization_id, position_id) REFERENCES public.positions(organization_id, id);


--
-- Name: membership_responsibilities fk_membership_responsibility_membership; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_responsibilities
    ADD CONSTRAINT fk_membership_responsibility_membership FOREIGN KEY (organization_id, membership_id) REFERENCES public.organization_memberships(organization_id, id) ON DELETE CASCADE;


--
-- Name: membership_responsibilities fk_membership_responsibility_responsibility; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_responsibilities
    ADD CONSTRAINT fk_membership_responsibility_responsibility FOREIGN KEY (organization_id, responsibility_id) REFERENCES public.responsibilities(organization_id, id) ON DELETE CASCADE;


--
-- Name: membership_roles fk_membership_role_membership; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_roles
    ADD CONSTRAINT fk_membership_role_membership FOREIGN KEY (organization_id, membership_id) REFERENCES public.organization_memberships(organization_id, id) ON DELETE CASCADE;


--
-- Name: membership_roles fk_membership_role_role; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_roles
    ADD CONSTRAINT fk_membership_role_role FOREIGN KEY (organization_id, role_id) REFERENCES public.roles(organization_id, id) ON DELETE CASCADE;


--
-- Name: position_responsibilities fk_position_responsibility_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_responsibilities
    ADD CONSTRAINT fk_position_responsibility_position FOREIGN KEY (organization_id, position_id) REFERENCES public.positions(organization_id, id) ON DELETE CASCADE;


--
-- Name: position_responsibilities fk_position_responsibility_responsibility; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_responsibilities
    ADD CONSTRAINT fk_position_responsibility_responsibility FOREIGN KEY (organization_id, responsibility_id) REFERENCES public.responsibilities(organization_id, id) ON DELETE CASCADE;


--
-- Name: positions fk_positions_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT fk_positions_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: regulations fk_regulation_creator_membership; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulations
    ADD CONSTRAINT fk_regulation_creator_membership FOREIGN KEY (organization_id, created_by_membership_id) REFERENCES public.organization_memberships(organization_id, id);


--
-- Name: regulation_versions fk_regulation_versions_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_versions
    ADD CONSTRAINT fk_regulation_versions_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: regulations fk_regulations_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulations
    ADD CONSTRAINT fk_regulations_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: responsibilities fk_responsibilities_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibilities
    ADD CONSTRAINT fk_responsibilities_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: responsibility_functions fk_responsibility_function_function; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibility_functions
    ADD CONSTRAINT fk_responsibility_function_function FOREIGN KEY (organization_id, function_id) REFERENCES public.business_functions(organization_id, id) ON DELETE CASCADE;


--
-- Name: responsibility_functions fk_responsibility_function_responsibility; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibility_functions
    ADD CONSTRAINT fk_responsibility_function_responsibility FOREIGN KEY (organization_id, responsibility_id) REFERENCES public.responsibilities(organization_id, id) ON DELETE CASCADE;


--
-- Name: role_permissions fk_role_permission_permission; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT fk_role_permission_permission FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions fk_role_permission_role; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT fk_role_permission_role FOREIGN KEY (organization_id, role_id) REFERENCES public.roles(organization_id, id) ON DELETE CASCADE;


--
-- Name: roles fk_roles_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT fk_roles_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: regulation_versions fk_version_approver_membership; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_versions
    ADD CONSTRAINT fk_version_approver_membership FOREIGN KEY (organization_id, approved_by_membership_id) REFERENCES public.organization_memberships(organization_id, id);


--
-- Name: regulation_versions fk_version_creator_membership; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_versions
    ADD CONSTRAINT fk_version_creator_membership FOREIGN KEY (organization_id, created_by_membership_id) REFERENCES public.organization_memberships(organization_id, id);


--
-- Name: regulation_versions fk_version_regulation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_versions
    ADD CONSTRAINT fk_version_regulation FOREIGN KEY (organization_id, regulation_id) REFERENCES public.regulations(organization_id, id) ON DELETE CASCADE;


--
-- Name: organization_memberships organization_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_memberships
    ADD CONSTRAINT organization_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict qheylXtzGIqPmYhll8EHVhfyUNJbcaIcHvgZNHBjIFcR5grJphyfHeOgTAInapb

