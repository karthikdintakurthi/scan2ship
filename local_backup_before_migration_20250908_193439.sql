--
-- PostgreSQL database dump
--

\restrict M1vxnvO7HdvM3vCApzFHT1NyLVJRE5hEfarr3GyTuep1umPzVAFudRJjl4gmR3A

-- Dumped from database version 17.6 (Homebrew)
-- Dumped by pg_dump version 17.6 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO karthiknaidudintakurthi;

--
-- Name: _prisma_migrations_backup_20250908_190014; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public._prisma_migrations_backup_20250908_190014 (
    id character varying(36),
    checksum character varying(64),
    finished_at timestamp with time zone,
    migration_name character varying(255),
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone,
    applied_steps_count integer
);


ALTER TABLE public._prisma_migrations_backup_20250908_190014 OWNER TO karthiknaidudintakurthi;

--
-- Name: _prisma_migrations_backup_20250908_190051; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public._prisma_migrations_backup_20250908_190051 (
    id character varying(36),
    checksum character varying(64),
    finished_at timestamp with time zone,
    migration_name character varying(255),
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone,
    applied_steps_count integer
);


ALTER TABLE public._prisma_migrations_backup_20250908_190051 OWNER TO karthiknaidudintakurthi;

--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.analytics_events (
    id text NOT NULL,
    "eventType" text NOT NULL,
    "eventData" jsonb,
    "clientId" text,
    "userId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.analytics_events OWNER TO karthiknaidudintakurthi;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "eventType" text NOT NULL,
    severity text NOT NULL,
    "userId" text,
    "clientId" text,
    "sessionId" text,
    "ipAddress" text NOT NULL,
    "userAgent" text NOT NULL,
    resource text,
    action text,
    details text NOT NULL,
    metadata text NOT NULL,
    "riskScore" integer NOT NULL,
    tags text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO karthiknaidudintakurthi;

--
-- Name: blocked_ips; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.blocked_ips (
    id text NOT NULL,
    "ipAddress" text NOT NULL,
    reason text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.blocked_ips OWNER TO karthiknaidudintakurthi;

--
-- Name: client_config; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.client_config (
    id text NOT NULL,
    "clientId" text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    type text DEFAULT 'string'::text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    description text,
    "isEncrypted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.client_config OWNER TO karthiknaidudintakurthi;

--
-- Name: client_credit_costs; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.client_credit_costs (
    id text NOT NULL,
    "clientId" text NOT NULL,
    feature text NOT NULL,
    cost double precision NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.client_credit_costs OWNER TO karthiknaidudintakurthi;

--
-- Name: client_credits; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.client_credits (
    id text NOT NULL,
    "clientId" text NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    "totalAdded" integer DEFAULT 0 NOT NULL,
    "totalUsed" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.client_credits OWNER TO karthiknaidudintakurthi;

--
-- Name: client_order_configs; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.client_order_configs (
    id text NOT NULL,
    "defaultProductDescription" text DEFAULT 'ARTIFICAL JEWELLERY'::text NOT NULL,
    "defaultPackageValue" double precision DEFAULT 5000 NOT NULL,
    "defaultWeight" double precision DEFAULT 100 NOT NULL,
    "defaultTotalItems" integer DEFAULT 1 NOT NULL,
    "codEnabledByDefault" boolean DEFAULT false NOT NULL,
    "defaultCodAmount" double precision,
    "minPackageValue" double precision DEFAULT 100 NOT NULL,
    "maxPackageValue" double precision DEFAULT 100000 NOT NULL,
    "minWeight" double precision DEFAULT 1 NOT NULL,
    "maxWeight" double precision DEFAULT 50000 NOT NULL,
    "minTotalItems" integer DEFAULT 1 NOT NULL,
    "maxTotalItems" integer DEFAULT 100 NOT NULL,
    "requireProductDescription" boolean DEFAULT true NOT NULL,
    "requirePackageValue" boolean DEFAULT true NOT NULL,
    "requireWeight" boolean DEFAULT true NOT NULL,
    "requireTotalItems" boolean DEFAULT true NOT NULL,
    "enableResellerFallback" boolean DEFAULT true NOT NULL,
    "enableThermalPrint" boolean DEFAULT false NOT NULL,
    "enableReferencePrefix" boolean DEFAULT true NOT NULL,
    "clientId" text NOT NULL,
    pickup_location_overrides jsonb DEFAULT '{}'::jsonb,
    "displayLogoOnWaybill" boolean DEFAULT false NOT NULL,
    "logoFileName" text,
    "logoFileSize" integer,
    "logoFileType" text,
    "logoEnabledCouriers" text,
    "enableAltMobileNumber" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.client_order_configs OWNER TO karthiknaidudintakurthi;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.clients (
    id text NOT NULL,
    name text NOT NULL,
    "companyName" text NOT NULL,
    email text NOT NULL,
    phone text,
    address text,
    city text,
    state text,
    country text DEFAULT 'India'::text NOT NULL,
    pincode text,
    "subscriptionPlan" text DEFAULT 'basic'::text NOT NULL,
    "subscriptionStatus" text DEFAULT 'active'::text NOT NULL,
    "subscriptionExpiresAt" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.clients OWNER TO karthiknaidudintakurthi;

--
-- Name: courier_services; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.courier_services (
    id text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "clientId" text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "baseRate" double precision,
    "codCharges" double precision,
    "estimatedDays" integer,
    "freeShippingThreshold" double precision,
    "maxWeight" double precision,
    "minWeight" double precision,
    "ratePerKg" double precision
);


ALTER TABLE public.courier_services OWNER TO karthiknaidudintakurthi;

--
-- Name: credit_transactions; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.credit_transactions (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "userId" text,
    type text NOT NULL,
    amount integer NOT NULL,
    balance integer NOT NULL,
    description text NOT NULL,
    feature text,
    "orderId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "clientName" text NOT NULL,
    "utrNumber" text,
    "screenshotFileName" text,
    "screenshotFileSize" integer,
    "screenshotFileType" text
);


ALTER TABLE public.credit_transactions OWNER TO karthiknaidudintakurthi;

--
-- Name: csrf_tokens; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.csrf_tokens (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text,
    "sessionId" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.csrf_tokens OWNER TO karthiknaidudintakurthi;

--
-- Name: order_analytics; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.order_analytics (
    id text NOT NULL,
    "orderId" integer NOT NULL,
    "creationPattern" text NOT NULL,
    "clientId" text NOT NULL,
    "userId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.order_analytics OWNER TO karthiknaidudintakurthi;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE SEQUENCE public.orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO karthiknaidudintakurthi;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.orders (
    id integer DEFAULT nextval('public.orders_id_seq'::regclass) NOT NULL,
    "clientId" text NOT NULL,
    name text NOT NULL,
    mobile text NOT NULL,
    phone text,
    address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    country text NOT NULL,
    pincode text NOT NULL,
    courier_service text NOT NULL,
    pickup_location text NOT NULL,
    package_value double precision NOT NULL,
    weight double precision NOT NULL,
    total_items integer NOT NULL,
    tracking_id text,
    reference_number text,
    is_cod boolean DEFAULT false NOT NULL,
    cod_amount double precision,
    reseller_name text,
    reseller_mobile text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    delhivery_waybill_number text,
    delhivery_order_id text,
    delhivery_api_status text,
    delhivery_api_error text,
    delhivery_retry_count integer DEFAULT 0 NOT NULL,
    last_delhivery_attempt timestamp(3) without time zone,
    shipment_length double precision,
    shipment_breadth double precision,
    shipment_height double precision,
    product_description text,
    return_address text,
    return_pincode text,
    fragile_shipment boolean DEFAULT false NOT NULL,
    seller_name text,
    seller_address text,
    seller_gst text,
    invoice_number text,
    commodity_value double precision,
    tax_value double precision,
    category_of_goods text,
    vendor_pickup_location text,
    hsn_code text,
    seller_cst_no text,
    seller_tin text,
    invoice_date text,
    return_reason text,
    ewbn text,
    shopify_fulfillment_id text,
    shopify_customer_email text,
    shopify_note text,
    shopify_order_id text,
    shopify_order_number text,
    shopify_tags text,
    shopify_update_error text,
    shopify_update_status text,
    shopify_update_timestamp timestamp(3) without time zone,
    tracking_url text
);


ALTER TABLE public.orders OWNER TO karthiknaidudintakurthi;

--
-- Name: orders_backup_20250908_190053; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.orders_backup_20250908_190053 (
    id integer,
    "clientId" text,
    name text,
    mobile text,
    phone text,
    address text,
    city text,
    state text,
    country text,
    pincode text,
    courier_service text,
    pickup_location text,
    package_value double precision,
    weight double precision,
    total_items integer,
    tracking_id text,
    reference_number text,
    is_cod boolean,
    cod_amount double precision,
    reseller_name text,
    reseller_mobile text,
    created_at timestamp(3) without time zone,
    updated_at timestamp(3) without time zone,
    delhivery_waybill_number text,
    delhivery_order_id text,
    delhivery_api_status text,
    delhivery_api_error text,
    delhivery_retry_count integer,
    last_delhivery_attempt timestamp(3) without time zone,
    shipment_length double precision,
    shipment_breadth double precision,
    shipment_height double precision,
    product_description text,
    return_address text,
    return_pincode text,
    fragile_shipment boolean,
    seller_name text,
    seller_address text,
    seller_gst text,
    invoice_number text,
    commodity_value double precision,
    tax_value double precision,
    category_of_goods text,
    vendor_pickup_location text,
    hsn_code text,
    seller_cst_no text,
    seller_tin text,
    invoice_date text,
    return_reason text,
    ewbn text,
    shopify_customer_email text,
    shopify_fulfillment_id text,
    shopify_note text,
    shopify_order_id text,
    shopify_order_number text,
    shopify_tags text,
    shopify_update_error text,
    shopify_update_status text,
    shopify_update_timestamp timestamp(3) without time zone,
    tracking_url text
);


ALTER TABLE public.orders_backup_20250908_190053 OWNER TO karthiknaidudintakurthi;

--
-- Name: pickup_location_order_configs; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.pickup_location_order_configs (
    id text NOT NULL,
    "pickupLocationId" text NOT NULL,
    "clientId" text NOT NULL,
    "defaultProductDescription" text DEFAULT 'ARTIFICAL JEWELLERY'::text NOT NULL,
    "defaultPackageValue" double precision DEFAULT 5000 NOT NULL,
    "defaultWeight" double precision DEFAULT 100 NOT NULL,
    "defaultTotalItems" integer DEFAULT 1 NOT NULL,
    "codEnabledByDefault" boolean DEFAULT false NOT NULL,
    "defaultCodAmount" double precision,
    "minPackageValue" double precision DEFAULT 100 NOT NULL,
    "maxPackageValue" double precision DEFAULT 100000 NOT NULL,
    "minWeight" double precision DEFAULT 1 NOT NULL,
    "maxWeight" double precision DEFAULT 50000 NOT NULL,
    "minTotalItems" integer DEFAULT 1 NOT NULL,
    "maxTotalItems" integer DEFAULT 100 NOT NULL,
    "requireProductDescription" boolean DEFAULT true NOT NULL,
    "requirePackageValue" boolean DEFAULT true NOT NULL,
    "requireWeight" boolean DEFAULT true NOT NULL,
    "requireTotalItems" boolean DEFAULT true NOT NULL,
    "enableResellerFallback" boolean DEFAULT true NOT NULL,
    "enableThermalPrint" boolean DEFAULT false NOT NULL,
    "enableReferencePrefix" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.pickup_location_order_configs OWNER TO karthiknaidudintakurthi;

--
-- Name: pickup_location_shopify_configs; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.pickup_location_shopify_configs (
    id text NOT NULL,
    "pickupLocationId" text NOT NULL,
    "clientId" text NOT NULL,
    "shopifyPickupLocation" text NOT NULL,
    "shopifyWebhookSecret" text NOT NULL,
    "shopifyApiKey" text NOT NULL,
    "shopifyApiSecret" text NOT NULL,
    "shopifyShopDomain" text NOT NULL,
    "shopifyAdminApiToken" text NOT NULL,
    "shopifyWebhookVersion" text DEFAULT '2025-07'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "shopifyDefaultClientId" text
);


ALTER TABLE public.pickup_location_shopify_configs OWNER TO karthiknaidudintakurthi;

--
-- Name: pickup_locations; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.pickup_locations (
    id text NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    "delhiveryApiKey" text,
    "clientId" text NOT NULL
);


ALTER TABLE public.pickup_locations OWNER TO karthiknaidudintakurthi;

--
-- Name: pickup_requests; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.pickup_requests (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "userId" text NOT NULL,
    pickup_date text NOT NULL,
    pickup_time text NOT NULL,
    pickup_address text NOT NULL,
    contact_person text NOT NULL,
    contact_phone text NOT NULL,
    special_instructions text,
    pickup_location text NOT NULL,
    delhivery_request_id text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    expected_package_count integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.pickup_requests OWNER TO karthiknaidudintakurthi;

--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.rate_limits (
    id text NOT NULL,
    key text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    "windowStart" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.rate_limits OWNER TO karthiknaidudintakurthi;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    "userId" text NOT NULL,
    "clientId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastActivity" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    location text,
    permissions text NOT NULL,
    "refreshToken" text NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    role text NOT NULL,
    "sessionToken" text NOT NULL,
    "userAgent" text NOT NULL
);


ALTER TABLE public.sessions OWNER TO karthiknaidudintakurthi;

--
-- Name: system_config; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.system_config (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    type text DEFAULT 'string'::text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    description text,
    "isEncrypted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.system_config OWNER TO karthiknaidudintakurthi;

--
-- Name: user_pickup_locations; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.user_pickup_locations (
    id text NOT NULL,
    "userId" text NOT NULL,
    "pickupLocationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.user_pickup_locations OWNER TO karthiknaidudintakurthi;

--
-- Name: users; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    password text,
    role text DEFAULT 'user'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "clientId" text NOT NULL
);


ALTER TABLE public.users OWNER TO karthiknaidudintakurthi;

--
-- Name: webhook_logs; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.webhook_logs (
    id text NOT NULL,
    "webhookId" text NOT NULL,
    "eventType" text NOT NULL,
    "orderId" integer,
    status text NOT NULL,
    "responseCode" integer,
    "responseBody" text,
    "errorMessage" text,
    "attemptCount" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.webhook_logs OWNER TO karthiknaidudintakurthi;

--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE TABLE public.webhooks (
    id text NOT NULL,
    "clientId" text NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    events text[],
    secret text,
    "isActive" boolean DEFAULT true NOT NULL,
    "retryCount" integer DEFAULT 3 NOT NULL,
    timeout integer DEFAULT 30000 NOT NULL,
    headers jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.webhooks OWNER TO karthiknaidudintakurthi;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c1b4b508-061d-49b5-891a-8734f4d040dc	d1d0c7e32e9e329ebfb9deefddda2e132575365f7bf26a7dc48033ea10ef6f49	2025-09-06 19:41:02.627081-04	20250105_add_user_pickup_locations		\N	2025-09-06 19:41:02.627081-04	0
13ae106f-6f5e-49e8-abb1-0ebfa2dcebf6	29a3de9d37f5101c43dd7cc8c7c79a4afa2028375dc3da77d014e3fc74b4a132	2025-09-06 19:41:08.112619-04	20250823221623_init_postgresql	\N	\N	2025-09-06 19:41:07.996277-04	1
4a78ffa2-6c89-4f58-9d9f-b15e686196f5	23ded8146829d7e509a5f8bd1a12c841d80421ed3c84378bd7de2936d2d16a61	2025-09-08 00:15:54.616594-04	20250107_add_pickup_location_order_configs		\N	2025-09-08 00:15:54.616594-04	0
d7fbdca8-cb5b-498f-8b27-c03f3dd7059c	1139b748f6b6018d9397b3a59b2b4a738174cf880cf7cf5ac8c56a56af9a0d4d	2025-09-06 19:41:08.343483-04	20250824132703_add_phone_field	\N	\N	2025-09-06 19:41:08.240425-04	1
2df2d999-362a-40ac-8eb0-4af18a76860b	1505b9dff875ce62469237f0efa538816867f451221dc0655b3c85272a6eb13d	2025-09-08 00:16:05.97045-04	20250108_add_shopify_fields		\N	2025-09-08 00:16:05.97045-04	0
1b2c3dde-f492-4120-b6ee-9d920f211ab0	4f1475e78f88c0910833189737cdd98c53db4bcd0177dd81ddaaa993466099ad	2025-09-08 00:16:15.97771-04	20250825160047_add_config_tables		\N	2025-09-08 00:16:15.97771-04	0
b6889da1-4377-49a7-9bbc-5729d1aaf3eb	f653d1385fe6d6bc0af0e5844ab7d1e58fecfde1a2107ad8e1a20b1637022788	2025-09-08 00:16:23.351137-04	20250825165623_add_client_order_config		\N	2025-09-08 00:16:23.351137-04	0
3c02e1bd-0c51-40f4-8f5e-e7902b1748aa	b30972c16a4910f7fc8b9bb62480d2b79fa2ef8a0f1c7f81d432b4d757948985	2025-09-08 00:16:30.692507-04	20250826131841_add_analytics_tables		\N	2025-09-08 00:16:30.692507-04	0
6b172db9-1037-4c87-8a8e-0f878f1c0d91	8e596f09839d09581516494fb40cd92bb317e7c0e9e9736b383ba1403295d963	2025-09-08 00:16:31.932524-04	20250827052658_add_isdefault_to_courier_services		\N	2025-09-08 00:16:31.932524-04	0
97bad947-fb92-4dd4-b310-ecb848427545	e9adf7d2d9e764e4b7d22da6a115dff9746ed177615aaeda0cc191ca809371fd	2025-09-08 00:16:38.698068-04	20250827052746_rename_courier_service_fields		\N	2025-09-08 00:16:38.698068-04	0
1dfccc43-3630-4749-9094-35d8c7fb33a7	067aaba7e167f5fc8e6934928a2366df05b9f5797f147f61f7eb47b6e25d4b60	2025-09-08 00:16:39.962432-04	20250827174304_add_credit_system		\N	2025-09-08 00:16:39.962432-04	0
c70580a7-cebe-4e67-9687-88d3caa5bdcb	1ef32934571a9c3b32c6117d9b3b35835d8b10617395e78bed275e08f6390691	2025-09-08 00:16:48.004929-04	20250827212421_add_client_credit_costs		\N	2025-09-08 00:16:48.004929-04	0
bfcaece1-07d4-4b78-a475-dfc5dd50ab28	879e4d9e71dba0473071dd3ca0488968a16a07345782a4edf3d2e00bfac9f4f6	2025-09-08 00:16:49.377504-04	20250829053914_allow_duplicate_pickup_location_values		\N	2025-09-08 00:16:49.377504-04	0
1d1000c0-d137-46ba-ad4f-de53a69dc421	0b47893492991251e5af55a7340ddb7807cb1867666b1eb9e20a93b4fa887135	2025-09-08 00:16:55.844752-04	20250906231950_add_tracking_url_to_orders		\N	2025-09-08 00:16:55.844752-04	0
28597c5e-1b05-42e5-9472-ebd79cd066e0	b16ff4c733c3d55028fe5c9145aca092f27a6b3393ac63493f0da13d1e0f88ca	2025-09-08 00:17:08.474586-04	20250825124922_add_saas_tables		\N	2025-09-08 00:17:08.474586-04	0
4d4649a8-ded8-4fe9-bacd-c2b8e29a6408	ab12101dde6714611297f29de21d51125c9985a0125a2cb2a95f457e70adc106	2025-09-08 00:17:14.978438-04	20250908001520_add_shopify_default_client_id	\N	\N	2025-09-08 00:17:14.876857-04	1
c549aaa2-87a5-4819-b4d9-e45e7a8a87f0	ee9eafef93320c43d7b618ddcab40a6b7ab2a029d13ff1c6d6a9b91073a75de0	2025-09-08 18:01:01.231654-04	20250905011253_add_shopify_integration_tables		\N	2025-09-08 18:01:01.231654-04	0
2996bb3e-911a-41b9-8284-569e64951609	20a239f76e47bed3dd055b9093dc15022056690938d86d3dacbd45ebce9c24aa	2025-09-08 18:01:19.245349-04	20250908212008_add_enable_alt_mobile_number_field	\N	\N	2025-09-08 18:01:19.151645-04	1
65119234-ef2a-4f8f-bf16-ead6c4fef0af	533a0a9319da6d4512a10d241617d61164f7fd4434a65bdf7b32797871dfab54	2025-09-08 18:01:06.633534-04	20250905022636_add_rate_calculation_fields	\N	\N	2025-09-08 18:01:06.523366-04	1
e8401d07-2dd8-4a17-af62-d0e9ce3fcf93	7a33dc617725f23027aaa3ffd1eb549fc22961e40e373dd122e8ee67b912cfca	2025-09-08 18:01:18.50402-04	20250906193202_security	\N	\N	2025-09-08 18:01:18.41107-04	1
b4ebc107-e240-4244-a728-8d09b62dbcc6	17c9bb44ca7f613f01fb732a1edfe989fd2cc8ef6b429474ed1a87c2d2cd15c9	2025-09-08 18:01:06.872321-04	20250906153650_add_webhook_tables	\N	\N	2025-09-08 18:01:06.666944-04	1
efb91600-1043-4d3a-b05e-175f7ddf27dc	e387e7d8ff2766e7bd5d0518f72b412b8405a087fa3eef63ea41f089eddce0ed	2025-09-08 18:01:12.883439-04	20250906175919_add_shopify_status_fields		\N	2025-09-08 18:01:12.883439-04	0
e1a54f5c-d18b-4fd6-9602-c91fdf74035c	a908dc7e8d6faef421debce13e44d8fe23bf49b088be1fc6d2852e9beaf10dca	2025-09-08 18:01:18.125743-04	20250906192006_add_rate_limits_table	\N	\N	2025-09-08 18:01:18.017876-04	1
58bb0eb2-8c2b-41fe-98d3-ac07f9dae97a	ac901aee1437386322cdd90fa4362e1224e33346c4aeba788ac7d7e8aa1f11fd	2025-09-08 18:01:18.639071-04	20250906193433_add_csrf_tokens	\N	\N	2025-09-08 18:01:18.539395-04	1
b1b23362-92f3-45e3-abd0-ed1f262348d9	cb4cbefd9870024fb4657c42bd29f3cff3ca5bdab5d8e20e4f7ca33f4753cafb	2025-09-08 18:01:18.363672-04	20250906193053_add_security_tables	\N	\N	2025-09-08 18:01:18.163487-04	1
4f302a22-53cb-4da7-a37a-00c1526f2f9b	fb7111652554104d207339a5427a2e261d5c838a79c36186a1e28d78dd83c8eb	2025-09-08 18:01:18.774937-04	20250906193507_add_blocked_ips	\N	\N	2025-09-08 18:01:18.673939-04	1
651c61d1-9489-4a72-abf9-cab10b90a077	57d661796eff9fadc3356473362f974e5bb10ceb8a426a8b0dbb5617ba02b06e	2025-09-08 18:01:19.466489-04	20250908213836_add_pickup_requests_table	\N	\N	2025-09-08 18:01:19.280341-04	1
d6bfd7ab-c02f-4446-b17e-cde6081eaf7b	9e5a757b1f31d4915e8722f5c09ecf9bd481cd998e7b4d20d911851363c1c28c	2025-09-08 18:01:18.975187-04	20250908205101_add_logo_fields_to_client_order_configs	\N	\N	2025-09-08 18:01:18.887118-04	1
ff0df024-99c4-4f04-89d1-f3f0fb866df8	f3ab0772063c4b1e7e3e0d5b85df17d72dad7cdfa7bce5ecb2bbd2d778248ff3	2025-09-08 18:01:19.101182-04	20250908205329_add_logo_enabled_couriers_field	\N	\N	2025-09-08 18:01:19.008506-04	1
1ab6c7b6-1ee4-4ac6-b454-4fe695d1a774	d518691efaff6351f1a9aa6c92ba5362e7709e33660d489351d03c6db0141ba4	2025-09-08 18:01:19.591867-04	20250908214021_add_expected_package_count_to_pickup_requests	\N	\N	2025-09-08 18:01:19.501066-04	1
\.


--
-- Data for Name: _prisma_migrations_backup_20250908_190014; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public._prisma_migrations_backup_20250908_190014 (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
4b26bd8f-2a86-420b-b616-d98549380be5	d1d0c7e32e9e329ebfb9deefddda2e132575365f7bf26a7dc48033ea10ef6f49	\N	20250105_add_user_pickup_locations	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250105_add_user_pickup_locations\n\nDatabase error code: 42P01\n\nDatabase error:\nERROR: relation "users" does not exist\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P01), message: "relation \\"users\\" does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("namespace.c"), line: Some(636), routine: Some("RangeVarGetRelidExtended") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250105_add_user_pickup_locations"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250105_add_user_pickup_locations"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236	2025-09-06 19:41:02.585167-04	2025-09-05 08:40:53.960096-04	0
c1b4b508-061d-49b5-891a-8734f4d040dc	d1d0c7e32e9e329ebfb9deefddda2e132575365f7bf26a7dc48033ea10ef6f49	2025-09-06 19:41:02.627081-04	20250105_add_user_pickup_locations		\N	2025-09-06 19:41:02.627081-04	0
87e42349-2d11-4a60-8f85-0f9c256dbdd3	23ded8146829d7e509a5f8bd1a12c841d80421ed3c84378bd7de2936d2d16a61	\N	20250107_add_pickup_location_order_configs	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250107_add_pickup_location_order_configs\n\nDatabase error code: 42P07\n\nDatabase error:\nERROR: relation "pickup_location_order_configs" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P07), message: "relation \\"pickup_location_order_configs\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("heap.c"), line: Some(1160), routine: Some("heap_create_with_catalog") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250107_add_pickup_location_order_configs"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250107_add_pickup_location_order_configs"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236	2025-09-08 00:15:54.576197-04	2025-09-08 00:15:33.331145-04	0
13ae106f-6f5e-49e8-abb1-0ebfa2dcebf6	29a3de9d37f5101c43dd7cc8c7c79a4afa2028375dc3da77d014e3fc74b4a132	2025-09-06 19:41:08.112619-04	20250823221623_init_postgresql	\N	\N	2025-09-06 19:41:07.996277-04	1
4a78ffa2-6c89-4f58-9d9f-b15e686196f5	23ded8146829d7e509a5f8bd1a12c841d80421ed3c84378bd7de2936d2d16a61	2025-09-08 00:15:54.616594-04	20250107_add_pickup_location_order_configs		\N	2025-09-08 00:15:54.616594-04	0
d7fbdca8-cb5b-498f-8b27-c03f3dd7059c	1139b748f6b6018d9397b3a59b2b4a738174cf880cf7cf5ac8c56a56af9a0d4d	2025-09-06 19:41:08.343483-04	20250824132703_add_phone_field	\N	\N	2025-09-06 19:41:08.240425-04	1
bc810658-000e-48bc-b3f0-9b5c4d4f62a0	b16ff4c733c3d55028fe5c9145aca092f27a6b3393ac63493f0da13d1e0f88ca	\N	20250825124922_add_saas_tables	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250825124922_add_saas_tables\n\nDatabase error code: 42P07\n\nDatabase error:\nERROR: relation "clients" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P07), message: "relation \\"clients\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("heap.c"), line: Some(1160), routine: Some("heap_create_with_catalog") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250825124922_add_saas_tables"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250825124922_add_saas_tables"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236	2025-09-06 19:41:15.63548-04	2025-09-06 19:41:08.379876-04	0
c526d697-1315-4479-ba89-22dbb82d3763	1505b9dff875ce62469237f0efa538816867f451221dc0655b3c85272a6eb13d	\N	20250108_add_shopify_fields	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250108_add_shopify_fields\n\nDatabase error code: 42701\n\nDatabase error:\nERROR: column "shopify_order_id" of relation "orders" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42701), message: "column \\"shopify_order_id\\" of relation \\"orders\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(7478), routine: Some("check_for_column_name_collision") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250108_add_shopify_fields"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250108_add_shopify_fields"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236	2025-09-08 00:16:05.927202-04	2025-09-08 00:16:00.046383-04	0
2df2d999-362a-40ac-8eb0-4af18a76860b	1505b9dff875ce62469237f0efa538816867f451221dc0655b3c85272a6eb13d	2025-09-08 00:16:05.97045-04	20250108_add_shopify_fields		\N	2025-09-08 00:16:05.97045-04	0
1b2c3dde-f492-4120-b6ee-9d920f211ab0	4f1475e78f88c0910833189737cdd98c53db4bcd0177dd81ddaaa993466099ad	2025-09-08 00:16:15.97771-04	20250825160047_add_config_tables		\N	2025-09-08 00:16:15.97771-04	0
b6889da1-4377-49a7-9bbc-5729d1aaf3eb	f653d1385fe6d6bc0af0e5844ab7d1e58fecfde1a2107ad8e1a20b1637022788	2025-09-08 00:16:23.351137-04	20250825165623_add_client_order_config		\N	2025-09-08 00:16:23.351137-04	0
3c02e1bd-0c51-40f4-8f5e-e7902b1748aa	b30972c16a4910f7fc8b9bb62480d2b79fa2ef8a0f1c7f81d432b4d757948985	2025-09-08 00:16:30.692507-04	20250826131841_add_analytics_tables		\N	2025-09-08 00:16:30.692507-04	0
6b172db9-1037-4c87-8a8e-0f878f1c0d91	8e596f09839d09581516494fb40cd92bb317e7c0e9e9736b383ba1403295d963	2025-09-08 00:16:31.932524-04	20250827052658_add_isdefault_to_courier_services		\N	2025-09-08 00:16:31.932524-04	0
97bad947-fb92-4dd4-b310-ecb848427545	e9adf7d2d9e764e4b7d22da6a115dff9746ed177615aaeda0cc191ca809371fd	2025-09-08 00:16:38.698068-04	20250827052746_rename_courier_service_fields		\N	2025-09-08 00:16:38.698068-04	0
1dfccc43-3630-4749-9094-35d8c7fb33a7	067aaba7e167f5fc8e6934928a2366df05b9f5797f147f61f7eb47b6e25d4b60	2025-09-08 00:16:39.962432-04	20250827174304_add_credit_system		\N	2025-09-08 00:16:39.962432-04	0
c70580a7-cebe-4e67-9687-88d3caa5bdcb	1ef32934571a9c3b32c6117d9b3b35835d8b10617395e78bed275e08f6390691	2025-09-08 00:16:48.004929-04	20250827212421_add_client_credit_costs		\N	2025-09-08 00:16:48.004929-04	0
bfcaece1-07d4-4b78-a475-dfc5dd50ab28	879e4d9e71dba0473071dd3ca0488968a16a07345782a4edf3d2e00bfac9f4f6	2025-09-08 00:16:49.377504-04	20250829053914_allow_duplicate_pickup_location_values		\N	2025-09-08 00:16:49.377504-04	0
1d1000c0-d137-46ba-ad4f-de53a69dc421	0b47893492991251e5af55a7340ddb7807cb1867666b1eb9e20a93b4fa887135	2025-09-08 00:16:55.844752-04	20250906231950_add_tracking_url_to_orders		\N	2025-09-08 00:16:55.844752-04	0
be1e76ff-50f6-4711-8fcf-f6db746de696	b16ff4c733c3d55028fe5c9145aca092f27a6b3393ac63493f0da13d1e0f88ca	\N	20250825124922_add_saas_tables	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250825124922_add_saas_tables\n\nDatabase error code: 42P01\n\nDatabase error:\nERROR: table "Order" does not exist\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P01), message: "table \\"Order\\" does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(1421), routine: Some("DropErrorMsgNonExistent") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250825124922_add_saas_tables"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250825124922_add_saas_tables"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236	2025-09-08 00:17:08.445316-04	2025-09-08 00:17:01.660194-04	0
28597c5e-1b05-42e5-9472-ebd79cd066e0	b16ff4c733c3d55028fe5c9145aca092f27a6b3393ac63493f0da13d1e0f88ca	2025-09-08 00:17:08.474586-04	20250825124922_add_saas_tables		\N	2025-09-08 00:17:08.474586-04	0
4d4649a8-ded8-4fe9-bacd-c2b8e29a6408	ab12101dde6714611297f29de21d51125c9985a0125a2cb2a95f457e70adc106	2025-09-08 00:17:14.978438-04	20250908001520_add_shopify_default_client_id	\N	\N	2025-09-08 00:17:14.876857-04	1
0bccb64d-fbd1-47ac-a196-7422ec6e50cc	ee9eafef93320c43d7b618ddcab40a6b7ab2a029d13ff1c6d6a9b91073a75de0	\N	20250905011253_add_shopify_integration_tables	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250905011253_add_shopify_integration_tables\n\nDatabase error code: 42704\n\nDatabase error:\nERROR: index "pickup_locations_value_clientId_key" does not exist\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42704), message: "index \\"pickup_locations_value_clientId_key\\" does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(1421), routine: Some("DropErrorMsgNonExistent") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250905011253_add_shopify_integration_tables"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250905011253_add_shopify_integration_tables"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236	2025-09-08 18:01:01.197147-04	2025-09-08 18:00:49.529822-04	0
c549aaa2-87a5-4819-b4d9-e45e7a8a87f0	ee9eafef93320c43d7b618ddcab40a6b7ab2a029d13ff1c6d6a9b91073a75de0	2025-09-08 18:01:01.231654-04	20250905011253_add_shopify_integration_tables		\N	2025-09-08 18:01:01.231654-04	0
2996bb3e-911a-41b9-8284-569e64951609	20a239f76e47bed3dd055b9093dc15022056690938d86d3dacbd45ebce9c24aa	2025-09-08 18:01:19.245349-04	20250908212008_add_enable_alt_mobile_number_field	\N	\N	2025-09-08 18:01:19.151645-04	1
65119234-ef2a-4f8f-bf16-ead6c4fef0af	533a0a9319da6d4512a10d241617d61164f7fd4434a65bdf7b32797871dfab54	2025-09-08 18:01:06.633534-04	20250905022636_add_rate_calculation_fields	\N	\N	2025-09-08 18:01:06.523366-04	1
e8401d07-2dd8-4a17-af62-d0e9ce3fcf93	7a33dc617725f23027aaa3ffd1eb549fc22961e40e373dd122e8ee67b912cfca	2025-09-08 18:01:18.50402-04	20250906193202_security	\N	\N	2025-09-08 18:01:18.41107-04	1
b4ebc107-e240-4244-a728-8d09b62dbcc6	17c9bb44ca7f613f01fb732a1edfe989fd2cc8ef6b429474ed1a87c2d2cd15c9	2025-09-08 18:01:06.872321-04	20250906153650_add_webhook_tables	\N	\N	2025-09-08 18:01:06.666944-04	1
8bd6b3b4-07e2-4712-aa7c-51793bf6674a	e387e7d8ff2766e7bd5d0518f72b412b8405a087fa3eef63ea41f089eddce0ed	\N	20250906175919_add_shopify_status_fields	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250906175919_add_shopify_status_fields\n\nDatabase error code: 42701\n\nDatabase error:\nERROR: column "shopify_fulfillment_id" of relation "orders" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42701), message: "column \\"shopify_fulfillment_id\\" of relation \\"orders\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(7478), routine: Some("check_for_column_name_collision") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250906175919_add_shopify_status_fields"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250906175919_add_shopify_status_fields"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236	2025-09-08 18:01:12.844093-04	2025-09-08 18:01:06.910857-04	0
efb91600-1043-4d3a-b05e-175f7ddf27dc	e387e7d8ff2766e7bd5d0518f72b412b8405a087fa3eef63ea41f089eddce0ed	2025-09-08 18:01:12.883439-04	20250906175919_add_shopify_status_fields		\N	2025-09-08 18:01:12.883439-04	0
e1a54f5c-d18b-4fd6-9602-c91fdf74035c	a908dc7e8d6faef421debce13e44d8fe23bf49b088be1fc6d2852e9beaf10dca	2025-09-08 18:01:18.125743-04	20250906192006_add_rate_limits_table	\N	\N	2025-09-08 18:01:18.017876-04	1
58bb0eb2-8c2b-41fe-98d3-ac07f9dae97a	ac901aee1437386322cdd90fa4362e1224e33346c4aeba788ac7d7e8aa1f11fd	2025-09-08 18:01:18.639071-04	20250906193433_add_csrf_tokens	\N	\N	2025-09-08 18:01:18.539395-04	1
b1b23362-92f3-45e3-abd0-ed1f262348d9	cb4cbefd9870024fb4657c42bd29f3cff3ca5bdab5d8e20e4f7ca33f4753cafb	2025-09-08 18:01:18.363672-04	20250906193053_add_security_tables	\N	\N	2025-09-08 18:01:18.163487-04	1
4f302a22-53cb-4da7-a37a-00c1526f2f9b	fb7111652554104d207339a5427a2e261d5c838a79c36186a1e28d78dd83c8eb	2025-09-08 18:01:18.774937-04	20250906193507_add_blocked_ips	\N	\N	2025-09-08 18:01:18.673939-04	1
651c61d1-9489-4a72-abf9-cab10b90a077	57d661796eff9fadc3356473362f974e5bb10ceb8a426a8b0dbb5617ba02b06e	2025-09-08 18:01:19.466489-04	20250908213836_add_pickup_requests_table	\N	\N	2025-09-08 18:01:19.280341-04	1
d6bfd7ab-c02f-4446-b17e-cde6081eaf7b	9e5a757b1f31d4915e8722f5c09ecf9bd481cd998e7b4d20d911851363c1c28c	2025-09-08 18:01:18.975187-04	20250908205101_add_logo_fields_to_client_order_configs	\N	\N	2025-09-08 18:01:18.887118-04	1
ff0df024-99c4-4f04-89d1-f3f0fb866df8	f3ab0772063c4b1e7e3e0d5b85df17d72dad7cdfa7bce5ecb2bbd2d778248ff3	2025-09-08 18:01:19.101182-04	20250908205329_add_logo_enabled_couriers_field	\N	\N	2025-09-08 18:01:19.008506-04	1
1ab6c7b6-1ee4-4ac6-b454-4fe695d1a774	d518691efaff6351f1a9aa6c92ba5362e7709e33660d489351d03c6db0141ba4	2025-09-08 18:01:19.591867-04	20250908214021_add_expected_package_count_to_pickup_requests	\N	\N	2025-09-08 18:01:19.501066-04	1
\.


--
-- Data for Name: _prisma_migrations_backup_20250908_190051; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public._prisma_migrations_backup_20250908_190051 (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
4b26bd8f-2a86-420b-b616-d98549380be5	d1d0c7e32e9e329ebfb9deefddda2e132575365f7bf26a7dc48033ea10ef6f49	\N	20250105_add_user_pickup_locations	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250105_add_user_pickup_locations\n\nDatabase error code: 42P01\n\nDatabase error:\nERROR: relation "users" does not exist\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P01), message: "relation \\"users\\" does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("namespace.c"), line: Some(636), routine: Some("RangeVarGetRelidExtended") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250105_add_user_pickup_locations"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250105_add_user_pickup_locations"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236	2025-09-06 19:41:02.585167-04	2025-09-05 08:40:53.960096-04	0
c1b4b508-061d-49b5-891a-8734f4d040dc	d1d0c7e32e9e329ebfb9deefddda2e132575365f7bf26a7dc48033ea10ef6f49	2025-09-06 19:41:02.627081-04	20250105_add_user_pickup_locations		\N	2025-09-06 19:41:02.627081-04	0
87e42349-2d11-4a60-8f85-0f9c256dbdd3	23ded8146829d7e509a5f8bd1a12c841d80421ed3c84378bd7de2936d2d16a61	\N	20250107_add_pickup_location_order_configs	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250107_add_pickup_location_order_configs\n\nDatabase error code: 42P07\n\nDatabase error:\nERROR: relation "pickup_location_order_configs" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P07), message: "relation \\"pickup_location_order_configs\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("heap.c"), line: Some(1160), routine: Some("heap_create_with_catalog") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250107_add_pickup_location_order_configs"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250107_add_pickup_location_order_configs"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236	2025-09-08 00:15:54.576197-04	2025-09-08 00:15:33.331145-04	0
13ae106f-6f5e-49e8-abb1-0ebfa2dcebf6	29a3de9d37f5101c43dd7cc8c7c79a4afa2028375dc3da77d014e3fc74b4a132	2025-09-06 19:41:08.112619-04	20250823221623_init_postgresql	\N	\N	2025-09-06 19:41:07.996277-04	1
4a78ffa2-6c89-4f58-9d9f-b15e686196f5	23ded8146829d7e509a5f8bd1a12c841d80421ed3c84378bd7de2936d2d16a61	2025-09-08 00:15:54.616594-04	20250107_add_pickup_location_order_configs		\N	2025-09-08 00:15:54.616594-04	0
d7fbdca8-cb5b-498f-8b27-c03f3dd7059c	1139b748f6b6018d9397b3a59b2b4a738174cf880cf7cf5ac8c56a56af9a0d4d	2025-09-06 19:41:08.343483-04	20250824132703_add_phone_field	\N	\N	2025-09-06 19:41:08.240425-04	1
bc810658-000e-48bc-b3f0-9b5c4d4f62a0	b16ff4c733c3d55028fe5c9145aca092f27a6b3393ac63493f0da13d1e0f88ca	\N	20250825124922_add_saas_tables	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250825124922_add_saas_tables\n\nDatabase error code: 42P07\n\nDatabase error:\nERROR: relation "clients" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P07), message: "relation \\"clients\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("heap.c"), line: Some(1160), routine: Some("heap_create_with_catalog") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250825124922_add_saas_tables"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250825124922_add_saas_tables"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236	2025-09-06 19:41:15.63548-04	2025-09-06 19:41:08.379876-04	0
c526d697-1315-4479-ba89-22dbb82d3763	1505b9dff875ce62469237f0efa538816867f451221dc0655b3c85272a6eb13d	\N	20250108_add_shopify_fields	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250108_add_shopify_fields\n\nDatabase error code: 42701\n\nDatabase error:\nERROR: column "shopify_order_id" of relation "orders" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42701), message: "column \\"shopify_order_id\\" of relation \\"orders\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(7478), routine: Some("check_for_column_name_collision") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250108_add_shopify_fields"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250108_add_shopify_fields"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236	2025-09-08 00:16:05.927202-04	2025-09-08 00:16:00.046383-04	0
2df2d999-362a-40ac-8eb0-4af18a76860b	1505b9dff875ce62469237f0efa538816867f451221dc0655b3c85272a6eb13d	2025-09-08 00:16:05.97045-04	20250108_add_shopify_fields		\N	2025-09-08 00:16:05.97045-04	0
1b2c3dde-f492-4120-b6ee-9d920f211ab0	4f1475e78f88c0910833189737cdd98c53db4bcd0177dd81ddaaa993466099ad	2025-09-08 00:16:15.97771-04	20250825160047_add_config_tables		\N	2025-09-08 00:16:15.97771-04	0
b6889da1-4377-49a7-9bbc-5729d1aaf3eb	f653d1385fe6d6bc0af0e5844ab7d1e58fecfde1a2107ad8e1a20b1637022788	2025-09-08 00:16:23.351137-04	20250825165623_add_client_order_config		\N	2025-09-08 00:16:23.351137-04	0
3c02e1bd-0c51-40f4-8f5e-e7902b1748aa	b30972c16a4910f7fc8b9bb62480d2b79fa2ef8a0f1c7f81d432b4d757948985	2025-09-08 00:16:30.692507-04	20250826131841_add_analytics_tables		\N	2025-09-08 00:16:30.692507-04	0
6b172db9-1037-4c87-8a8e-0f878f1c0d91	8e596f09839d09581516494fb40cd92bb317e7c0e9e9736b383ba1403295d963	2025-09-08 00:16:31.932524-04	20250827052658_add_isdefault_to_courier_services		\N	2025-09-08 00:16:31.932524-04	0
97bad947-fb92-4dd4-b310-ecb848427545	e9adf7d2d9e764e4b7d22da6a115dff9746ed177615aaeda0cc191ca809371fd	2025-09-08 00:16:38.698068-04	20250827052746_rename_courier_service_fields		\N	2025-09-08 00:16:38.698068-04	0
1dfccc43-3630-4749-9094-35d8c7fb33a7	067aaba7e167f5fc8e6934928a2366df05b9f5797f147f61f7eb47b6e25d4b60	2025-09-08 00:16:39.962432-04	20250827174304_add_credit_system		\N	2025-09-08 00:16:39.962432-04	0
c70580a7-cebe-4e67-9687-88d3caa5bdcb	1ef32934571a9c3b32c6117d9b3b35835d8b10617395e78bed275e08f6390691	2025-09-08 00:16:48.004929-04	20250827212421_add_client_credit_costs		\N	2025-09-08 00:16:48.004929-04	0
bfcaece1-07d4-4b78-a475-dfc5dd50ab28	879e4d9e71dba0473071dd3ca0488968a16a07345782a4edf3d2e00bfac9f4f6	2025-09-08 00:16:49.377504-04	20250829053914_allow_duplicate_pickup_location_values		\N	2025-09-08 00:16:49.377504-04	0
1d1000c0-d137-46ba-ad4f-de53a69dc421	0b47893492991251e5af55a7340ddb7807cb1867666b1eb9e20a93b4fa887135	2025-09-08 00:16:55.844752-04	20250906231950_add_tracking_url_to_orders		\N	2025-09-08 00:16:55.844752-04	0
be1e76ff-50f6-4711-8fcf-f6db746de696	b16ff4c733c3d55028fe5c9145aca092f27a6b3393ac63493f0da13d1e0f88ca	\N	20250825124922_add_saas_tables	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250825124922_add_saas_tables\n\nDatabase error code: 42P01\n\nDatabase error:\nERROR: table "Order" does not exist\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P01), message: "table \\"Order\\" does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(1421), routine: Some("DropErrorMsgNonExistent") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250825124922_add_saas_tables"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250825124922_add_saas_tables"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236	2025-09-08 00:17:08.445316-04	2025-09-08 00:17:01.660194-04	0
28597c5e-1b05-42e5-9472-ebd79cd066e0	b16ff4c733c3d55028fe5c9145aca092f27a6b3393ac63493f0da13d1e0f88ca	2025-09-08 00:17:08.474586-04	20250825124922_add_saas_tables		\N	2025-09-08 00:17:08.474586-04	0
4d4649a8-ded8-4fe9-bacd-c2b8e29a6408	ab12101dde6714611297f29de21d51125c9985a0125a2cb2a95f457e70adc106	2025-09-08 00:17:14.978438-04	20250908001520_add_shopify_default_client_id	\N	\N	2025-09-08 00:17:14.876857-04	1
0bccb64d-fbd1-47ac-a196-7422ec6e50cc	ee9eafef93320c43d7b618ddcab40a6b7ab2a029d13ff1c6d6a9b91073a75de0	\N	20250905011253_add_shopify_integration_tables	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250905011253_add_shopify_integration_tables\n\nDatabase error code: 42704\n\nDatabase error:\nERROR: index "pickup_locations_value_clientId_key" does not exist\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42704), message: "index \\"pickup_locations_value_clientId_key\\" does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(1421), routine: Some("DropErrorMsgNonExistent") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250905011253_add_shopify_integration_tables"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250905011253_add_shopify_integration_tables"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236	2025-09-08 18:01:01.197147-04	2025-09-08 18:00:49.529822-04	0
c549aaa2-87a5-4819-b4d9-e45e7a8a87f0	ee9eafef93320c43d7b618ddcab40a6b7ab2a029d13ff1c6d6a9b91073a75de0	2025-09-08 18:01:01.231654-04	20250905011253_add_shopify_integration_tables		\N	2025-09-08 18:01:01.231654-04	0
2996bb3e-911a-41b9-8284-569e64951609	20a239f76e47bed3dd055b9093dc15022056690938d86d3dacbd45ebce9c24aa	2025-09-08 18:01:19.245349-04	20250908212008_add_enable_alt_mobile_number_field	\N	\N	2025-09-08 18:01:19.151645-04	1
65119234-ef2a-4f8f-bf16-ead6c4fef0af	533a0a9319da6d4512a10d241617d61164f7fd4434a65bdf7b32797871dfab54	2025-09-08 18:01:06.633534-04	20250905022636_add_rate_calculation_fields	\N	\N	2025-09-08 18:01:06.523366-04	1
e8401d07-2dd8-4a17-af62-d0e9ce3fcf93	7a33dc617725f23027aaa3ffd1eb549fc22961e40e373dd122e8ee67b912cfca	2025-09-08 18:01:18.50402-04	20250906193202_security	\N	\N	2025-09-08 18:01:18.41107-04	1
b4ebc107-e240-4244-a728-8d09b62dbcc6	17c9bb44ca7f613f01fb732a1edfe989fd2cc8ef6b429474ed1a87c2d2cd15c9	2025-09-08 18:01:06.872321-04	20250906153650_add_webhook_tables	\N	\N	2025-09-08 18:01:06.666944-04	1
8bd6b3b4-07e2-4712-aa7c-51793bf6674a	e387e7d8ff2766e7bd5d0518f72b412b8405a087fa3eef63ea41f089eddce0ed	\N	20250906175919_add_shopify_status_fields	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250906175919_add_shopify_status_fields\n\nDatabase error code: 42701\n\nDatabase error:\nERROR: column "shopify_fulfillment_id" of relation "orders" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42701), message: "column \\"shopify_fulfillment_id\\" of relation \\"orders\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(7478), routine: Some("check_for_column_name_collision") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250906175919_add_shopify_status_fields"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250906175919_add_shopify_status_fields"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236	2025-09-08 18:01:12.844093-04	2025-09-08 18:01:06.910857-04	0
efb91600-1043-4d3a-b05e-175f7ddf27dc	e387e7d8ff2766e7bd5d0518f72b412b8405a087fa3eef63ea41f089eddce0ed	2025-09-08 18:01:12.883439-04	20250906175919_add_shopify_status_fields		\N	2025-09-08 18:01:12.883439-04	0
e1a54f5c-d18b-4fd6-9602-c91fdf74035c	a908dc7e8d6faef421debce13e44d8fe23bf49b088be1fc6d2852e9beaf10dca	2025-09-08 18:01:18.125743-04	20250906192006_add_rate_limits_table	\N	\N	2025-09-08 18:01:18.017876-04	1
58bb0eb2-8c2b-41fe-98d3-ac07f9dae97a	ac901aee1437386322cdd90fa4362e1224e33346c4aeba788ac7d7e8aa1f11fd	2025-09-08 18:01:18.639071-04	20250906193433_add_csrf_tokens	\N	\N	2025-09-08 18:01:18.539395-04	1
b1b23362-92f3-45e3-abd0-ed1f262348d9	cb4cbefd9870024fb4657c42bd29f3cff3ca5bdab5d8e20e4f7ca33f4753cafb	2025-09-08 18:01:18.363672-04	20250906193053_add_security_tables	\N	\N	2025-09-08 18:01:18.163487-04	1
4f302a22-53cb-4da7-a37a-00c1526f2f9b	fb7111652554104d207339a5427a2e261d5c838a79c36186a1e28d78dd83c8eb	2025-09-08 18:01:18.774937-04	20250906193507_add_blocked_ips	\N	\N	2025-09-08 18:01:18.673939-04	1
651c61d1-9489-4a72-abf9-cab10b90a077	57d661796eff9fadc3356473362f974e5bb10ceb8a426a8b0dbb5617ba02b06e	2025-09-08 18:01:19.466489-04	20250908213836_add_pickup_requests_table	\N	\N	2025-09-08 18:01:19.280341-04	1
d6bfd7ab-c02f-4446-b17e-cde6081eaf7b	9e5a757b1f31d4915e8722f5c09ecf9bd481cd998e7b4d20d911851363c1c28c	2025-09-08 18:01:18.975187-04	20250908205101_add_logo_fields_to_client_order_configs	\N	\N	2025-09-08 18:01:18.887118-04	1
ff0df024-99c4-4f04-89d1-f3f0fb866df8	f3ab0772063c4b1e7e3e0d5b85df17d72dad7cdfa7bce5ecb2bbd2d778248ff3	2025-09-08 18:01:19.101182-04	20250908205329_add_logo_enabled_couriers_field	\N	\N	2025-09-08 18:01:19.008506-04	1
1ab6c7b6-1ee4-4ac6-b454-4fe695d1a774	d518691efaff6351f1a9aa6c92ba5362e7709e33660d489351d03c6db0141ba4	2025-09-08 18:01:19.591867-04	20250908214021_add_expected_package_count_to_pickup_requests	\N	\N	2025-09-08 18:01:19.501066-04	1
\.


--
-- Data for Name: analytics_events; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.analytics_events (id, "eventType", "eventData", "clientId", "userId", "createdAt") FROM stdin;
event-1757370681151-2xgmtakwj	create_order	{"orderId": 91, "courierService": "test", "creationPattern": "manual"}	master-client-1756272680179	master-admin-1756272680518	2025-09-08 22:31:21.152
event-1757370738520-0ki102tp3	create_order	{"orderId": 92, "courierService": "test", "creationPattern": "manual"}	master-client-1756272680179	master-admin-1756272680518	2025-09-08 22:32:18.521
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.audit_logs (id, "eventType", severity, "userId", "clientId", "sessionId", "ipAddress", "userAgent", resource, action, details, metadata, "riskScore", tags, "createdAt") FROM stdin;
\.


--
-- Data for Name: blocked_ips; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.blocked_ips (id, "ipAddress", reason, "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: client_config; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.client_config (id, "clientId", key, value, type, category, description, "isEncrypted", "createdAt", "updatedAt") FROM stdin;
dtdc-1757000024937-d1thjxo5b	default-client-001	dtdc_slips_from		string	dtdc_slips	Starting DTDC slip number	f	2025-09-04 15:33:44.938	2025-09-04 15:33:44.937
dtdc-1757000024947-0d91yibv1	default-client-001	dtdc_slips_to		string	dtdc_slips	Ending DTDC slip number	f	2025-09-04 15:33:44.947	2025-09-04 15:33:44.947
dtdc-1757000024952-kmhmh7rtn	default-client-001	dtdc_slips_unused		string	dtdc_slips	Unused DTDC slip numbers	f	2025-09-04 15:33:44.953	2025-09-04 15:33:44.952
dtdc-1757000024958-q4kfoqp1w	default-client-001	dtdc_slips_used	124214241321	string	dtdc_slips	Used DTDC slip numbers	f	2025-09-04 15:33:44.959	2025-09-04 15:33:44.958
dtdc-1757000024965-n8z9y53qq	default-client-001	dtdc_slips_enabled	false	boolean	dtdc_slips	DTDC slips feature enabled	f	2025-09-04 15:33:44.966	2025-09-04 15:33:44.965
dtdc-1757059048084-g167ay3v0	client-1757058396579-m510j2d3m	dtdc_slips_from		string	dtdc_slips	Starting DTDC slip number	f	2025-09-05 07:57:28.084	2025-09-05 07:57:28.084
dtdc-1757059048093-840sqdzyb	client-1757058396579-m510j2d3m	dtdc_slips_to		string	dtdc_slips	Ending DTDC slip number	f	2025-09-05 07:57:28.094	2025-09-05 07:57:28.093
dtdc-1757059048099-wdowgkvwl	client-1757058396579-m510j2d3m	dtdc_slips_unused		string	dtdc_slips	Unused DTDC slip numbers	f	2025-09-05 07:57:28.1	2025-09-05 07:57:28.099
dtdc-1757059048104-edppavqxm	client-1757058396579-m510j2d3m	dtdc_slips_used		string	dtdc_slips	Used DTDC slip numbers	f	2025-09-05 07:57:28.105	2025-09-05 07:57:28.104
dtdc-1757059048110-e95go1aw6	client-1757058396579-m510j2d3m	dtdc_slips_enabled	false	boolean	dtdc_slips	DTDC slips feature enabled	f	2025-09-05 07:57:28.111	2025-09-05 07:57:28.11
\.


--
-- Data for Name: client_credit_costs; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.client_credit_costs (id, "clientId", feature, cost, "isActive", "createdAt", "updatedAt") FROM stdin;
cost-1756330027311-sg79qxl0b	master-client-1756272680179	ORDER	1	t	2025-08-27 21:27:07.312	2025-08-27 21:27:07.311
cost-1756330027356-xdkcc932k	master-client-1756272680179	WHATSAPP	1	t	2025-08-27 21:27:07.357	2025-08-27 21:27:07.356
cost-1756330027391-5e4vdgvd1	master-client-1756272680179	IMAGE_PROCESSING	2	t	2025-08-27 21:27:07.392	2025-08-27 21:27:07.391
cost-1756330027436-b5hzzjjkt	master-client-1756272680179	TEXT_PROCESSING	1	t	2025-08-27 21:27:07.437	2025-08-27 21:27:07.436
cost-1756341027712-hwgbawafa	default-client-001	ORDER	1	t	2025-08-28 00:30:27.713	2025-08-28 00:30:27.712
cost-1756341027781-9p0vfzmml	default-client-001	WHATSAPP	1	t	2025-08-28 00:30:27.782	2025-08-28 00:30:27.781
cost-1756341027817-72qb5kxkw	default-client-001	IMAGE_PROCESSING	2	t	2025-08-28 00:30:27.818	2025-08-28 00:30:27.817
cost-1756341027853-0y6vgricf	default-client-001	TEXT_PROCESSING	1	t	2025-08-28 00:30:27.854	2025-08-28 00:30:27.853
\.


--
-- Data for Name: client_credits; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.client_credits (id, "clientId", balance, "totalAdded", "totalUsed", "createdAt", "updatedAt") FROM stdin;
credits-1756342974921-e2jv70mmg	default-client-001	1925	2000	75	2025-08-28 01:02:54.923	2025-09-04 15:33:44.755
credits-1757058507768-flt0iz6nd	client-1757058396579-m510j2d3m	1993	2000	7	2025-09-05 07:48:27.769	2025-09-05 10:46:21.124
credits-1757343794747-60826tstu	client-1757343020924-609gdrmzj	0	0	0	2025-09-08 15:03:14.748	2025-09-08 15:03:14.747
credits-1756320806438-c9cmu9t6s	master-client-1756272680179	98	100	2	2025-08-27 18:53:26.439	2025-09-08 22:32:18.361
\.


--
-- Data for Name: client_order_configs; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.client_order_configs (id, "defaultProductDescription", "defaultPackageValue", "defaultWeight", "defaultTotalItems", "codEnabledByDefault", "defaultCodAmount", "minPackageValue", "maxPackageValue", "minWeight", "maxWeight", "minTotalItems", "maxTotalItems", "requireProductDescription", "requirePackageValue", "requireWeight", "requireTotalItems", "enableResellerFallback", "enableThermalPrint", "enableReferencePrefix", "clientId", pickup_location_overrides, "displayLogoOnWaybill", "logoFileName", "logoFileSize", "logoFileType", "logoEnabledCouriers", "enableAltMobileNumber") FROM stdin;
order-config-1756298235078-cli2va64s	ARTIFICAL JEWELLERY	5000	100	1	f	\N	100	100000	1	50000	1	100	t	t	t	t	t	f	t	master-client-1756272680179	{}	f	\N	\N	\N	\N	f
order-config-1756644071244-ipykabjj2	ARTIFICAL JEWELLERY	5000	100	1	f	\N	100	100000	1	50000	1	100	t	t	t	t	t	f	t	default-client-001	{}	f	\N	\N	\N	\N	f
order-config-1757058508780-m0rj6nky7	Products	1000	100	1	f	\N	100	100000	1	50000	1	100	t	t	t	t	f	f	t	client-1757058396579-m510j2d3m	{"pickup-1757302935871-umzzfakk8": {"maxWeight": 50000, "minWeight": 1, "defaultWeight": 100, "maxTotalItems": 100, "minTotalItems": 1, "requireWeight": true, "maxPackageValue": 100000, "minPackageValue": 100, "defaultCodAmount": null, "defaultTotalItems": 1, "requireTotalItems": true, "enableThermalPrint": false, "codEnabledByDefault": false, "defaultPackageValue": 1000, "requirePackageValue": true, "enableReferencePrefix": true, "enableResellerFallback": false, "defaultProductDescription": "Products 123", "requireProductDescription": true}}	f	\N	\N	\N	\N	f
order-config-1757343818106-1s64kpc6c	ARTIFICAL JEWELLERY	5000	100	1	f	\N	100	100000	1	50000	1	100	t	t	t	t	t	f	t	client-1757343020924-609gdrmzj	{}	f	\N	\N	\N	\N	f
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.clients (id, name, "companyName", email, phone, address, city, state, country, pincode, "subscriptionPlan", "subscriptionStatus", "subscriptionExpiresAt", "isActive", "createdAt", "updatedAt") FROM stdin;
client-1757058396579-m510j2d3m	Chandrasekhar D	Route Master Courier and Cargo	routemastercouriercargo@gmail.com	7411494868	Shop no 2, 1st floor, MS commercial complex, Whitefield - Hoskote Rd, opp. : Shell petrol pump, Seegehalli, Kadugodi	Bengaluru	Karnataka	India	560067	basic	active	\N	t	2025-09-05 07:46:36.58	2025-09-05 07:47:33.613
master-client-1756272680179	Karthik Dintakurthi	Scan2Ship	admin@scan2ship.in	+91-9948660666	Master System Address	Master City	Master State	India	000000	enterprise	active	\N	t	2025-08-27 05:31:20.179	2025-08-27 21:19:32.811
default-client-001	Default Client	Default Company	default@scan2ship.com	+91-9876543210	123 Default Street, Default City	Default City	Default State	India	123456	basic	active	\N	t	2025-08-28 00:30:13.796	2025-09-01 13:14:00.495
client-1757343020924-609gdrmzj	Dinesh P	Raveendra Gold Covering Works	dinesh@scan2ship.in					India		basic	active	\N	t	2025-09-08 14:50:20.925	2025-09-08 14:50:20.924
\.


--
-- Data for Name: courier_services; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.courier_services (id, "isActive", "clientId", "isDefault", code, name, "baseRate", "codCharges", "estimatedDays", "freeShippingThreshold", "maxWeight", "minWeight", "ratePerKg") FROM stdin;
courier-1756732440532-ve9f8wybv	t	default-client-001	f	delhivery	Delhivery	\N	\N	\N	\N	\N	\N	\N
courier-1756732440532-gz6cni0c9	t	default-client-001	f	dtdc	DTDC	\N	\N	\N	\N	\N	\N	\N
courier-1756732440532-iv30nupcq	t	default-client-001	f	india_post	India Post	\N	\N	\N	\N	\N	\N	\N
courier-1757066068814-l954pf37s	t	client-1757058396579-m510j2d3m	t	delhivery	Delhivery	\N	\N	\N	\N	\N	\N	\N
courier-1757066068814-gnojxb7s1	t	client-1757058396579-m510j2d3m	f	dtdc	DTDC	\N	\N	\N	\N	\N	\N	\N
courier-1757066068814-0itfa6wcx	t	client-1757058396579-m510j2d3m	f	india_post	India Post	\N	\N	\N	\N	\N	\N	\N
courier-1757156505804-2mhaxe1yu	t	client-1757058396579-m510j2d3m	f	bluedart	Bluedart	\N	\N	\N	\N	\N	\N	\N
courier-1757343020971-vz4413rp7	t	client-1757343020924-609gdrmzj	t	delhivery	Delhivery	\N	\N	\N	\N	\N	\N	\N
courier-1757343020971-ik0dcq5bf	t	client-1757343020924-609gdrmzj	f	india_post	India Post	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: credit_transactions; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.credit_transactions (id, "clientId", "userId", type, amount, balance, description, feature, "orderId", "createdAt", "clientName", "utrNumber", "screenshotFileName", "screenshotFileSize", "screenshotFileType") FROM stdin;
txn-1757370681049-28zhsi9p5	master-client-1756272680179	master-admin-1756272680518	DEDUCT	1	99	Order creation	ORDER	91	2025-09-08 22:31:21.049	Unknown Client	\N	\N	\N	\N
txn-1757370738378-u5nvte951	master-client-1756272680179	master-admin-1756272680518	DEDUCT	1	98	Order creation	ORDER	92	2025-09-08 22:32:18.378	Unknown Client	\N	\N	\N	\N
txn-1756644378780-6ao2q8rhx	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	2	994	AI Usage in Order reference	IMAGE_PROCESSING	\N	2025-08-31 12:46:18.78	Unknown Client	\N	\N	\N	\N
txn-1756650569127-1g04ibhsn	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1983	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-08-31 14:29:29.128	Unknown Client	\N	\N	\N	\N
txn-1756652265126-8px10a88e	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	2	1974	AI Usage in Order reference	IMAGE_PROCESSING	\N	2025-08-31 14:57:45.126	Unknown Client	\N	\N	\N	\N
txn-1756667818599-ouma7pw84	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	2	1958	AI Usage in Order reference	IMAGE_PROCESSING	\N	2025-08-31 19:16:58.599	Unknown Client	\N	\N	\N	\N
txn-1756667910573-ehc4ls0cm	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	2	1953	AI Usage in Order reference	IMAGE_PROCESSING	\N	2025-08-31 19:18:30.574	Unknown Client	\N	\N	\N	\N
txn-1756732895663-1o5ismac8	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1949	Order creation	ORDER	\N	2025-09-01 13:21:35.663	Unknown Client	\N	\N	\N	\N
txn-1756740548805-2tt4gnj09	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1945	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-09-01 15:29:08.805	Unknown Client	\N	\N	\N	\N
txn-1756667825057-cwldnflqo	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1957	Order creation	ORDER	\N	2025-08-31 19:17:05.057	Unknown Client	\N	\N	\N	\N
txn-1756644386364-gej2d5325	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	993	Order creation	ORDER	\N	2025-08-31 12:46:26.364	Unknown Client	\N	\N	\N	\N
txn-1756320806481-abv506lwj	master-client-1756272680179	\N	ADD	100	100	Initial credits added for testing	MANUAL	\N	2025-08-27 18:53:26.481	Legacy Client	\N	\N	\N	\N
txn-1756644774861-q2ia02t53	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	992	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-08-31 12:52:54.861	Unknown Client	\N	\N	\N	\N
txn-1756650742580-de1rczom9	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1982	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-08-31 14:32:22.58	Unknown Client	\N	\N	\N	\N
txn-1756652643152-cykhc9b5o	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	2	1972	AI Usage in Order reference	IMAGE_PROCESSING	\N	2025-08-31 15:04:03.152	Unknown Client	\N	\N	\N	\N
txn-1756667858582-46hzf2rgr	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	2	1955	AI Usage in Order reference	IMAGE_PROCESSING	\N	2025-08-31 19:17:38.583	Unknown Client	\N	\N	\N	\N
txn-1756740622183-w78tgufjs	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1944	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-09-01 15:30:22.183	Unknown Client	\N	\N	\N	\N
txn-1756645453742-xlac5n8b7	default-client-001	\N	ADD	1000	1991	Credit recharge via UPI - RECHARGE-default--1756645438816-M0HM4U | UTR: 633456596040 | Client: Default Company	MANUAL	\N	2025-08-31 13:04:13.742	Default Company	\N	\N	\N	\N
txn-1756650796998-poj2zep7e	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1981	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-08-31 14:33:16.998	Unknown Client	\N	\N	\N	\N
txn-1756650817753-wlewwfkut	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1980	Order creation	ORDER	\N	2025-08-31 14:33:37.753	Unknown Client	\N	\N	\N	\N
txn-1756658087413-umgbwvd36	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	2	1970	AI Usage in Order reference	IMAGE_PROCESSING	\N	2025-08-31 16:34:47.413	Unknown Client	\N	\N	\N	\N
txn-1756659456786-jlycioi5w	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	2	1967	AI Usage in Order reference	IMAGE_PROCESSING	\N	2025-08-31 16:57:36.786	Unknown Client	\N	\N	\N	\N
txn-1756740925985-ncdm4mrxa	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1943	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-09-01 15:35:25.985	Unknown Client	\N	\N	\N	\N
txn-1756741092065-0hscdb5mv	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1942	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-09-01 15:38:12.066	Unknown Client	\N	\N	\N	\N
txn-1756742810697-5gxqz05xk	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1941	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-09-01 16:06:50.697	Unknown Client	\N	\N	\N	\N
txn-1756742817218-tc6an8vgo	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1940	Order creation	ORDER	\N	2025-09-01 16:06:57.218	Unknown Client	\N	\N	\N	\N
txn-1756734470380-wgem39chf	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1947	Order creation	ORDER	\N	2025-09-01 13:47:50.38	Unknown Client	\N	\N	\N	\N
txn-1756668088137-3qsytyrsa	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1951	Order creation	ORDER	\N	2025-08-31 19:21:28.137	Unknown Client	\N	\N	\N	\N
txn-1756659470873-od4p7ahgk	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1966	Order creation	ORDER	\N	2025-08-31 16:57:50.874	Unknown Client	\N	\N	\N	\N
txn-1756658094032-pydovdy3e	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1969	Order creation	ORDER	\N	2025-08-31 16:34:54.032	Unknown Client	\N	\N	\N	\N
txn-1756644208349-gnyp96e04	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	2	998	AI Usage in Order reference	IMAGE_PROCESSING	\N	2025-08-31 12:43:28.349	Unknown Client	\N	\N	\N	\N
txn-1756645527939-ubrkk7zu8	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	2	1989	AI Usage in Order reference	IMAGE_PROCESSING	\N	2025-08-31 13:05:27.939	Unknown Client	\N	\N	\N	\N
txn-1756645559190-yta7070lq	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1987	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-08-31 13:05:59.19	Unknown Client	\N	\N	\N	\N
txn-1756650891095-w4xcuwbi0	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1979	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-08-31 14:34:51.095	Unknown Client	\N	\N	\N	\N
txn-1756650935178-83kvd2z25	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1978	Order creation	ORDER	\N	2025-08-31 14:35:35.178	Unknown Client	\N	\N	\N	\N
txn-1756659606169-5p4bnhec6	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	2	1964	AI Usage in Order reference	IMAGE_PROCESSING	\N	2025-08-31 17:00:06.169	Unknown Client	\N	\N	\N	\N
txn-1756734517376-5fqdve2rj	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1946	Order creation	ORDER	\N	2025-09-01 13:48:37.376	Unknown Client	\N	\N	\N	\N
txn-1756659614353-k7xfh4xlq	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1963	Order creation	ORDER	\N	2025-08-31 17:00:14.353	Unknown Client	\N	\N	\N	\N
txn-1756645566151-3fre6lvob	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1986	Order creation	ORDER	\N	2025-08-31 13:06:06.151	Unknown Client	\N	\N	\N	\N
txn-1756645545609-h2jp2ivp6	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1988	Order creation	ORDER	\N	2025-08-31 13:05:45.609	Unknown Client	\N	\N	\N	\N
txn-1756534058947-owbmbjkyk	default-client-001	master-admin-1756272680518	ADD	1000	1000	testing	MANUAL	\N	2025-08-30 06:07:38.947	Default Company	\N	\N	\N	\N
txn-1756732484270-ln5cnlp3s	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1950	Order creation	ORDER	\N	2025-09-01 13:14:44.27	Unknown Client	\N	\N	\N	\N
txn-1756644280006-tsqkll478	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	2	996	AI Usage in Order reference	IMAGE_PROCESSING	\N	2025-08-31 12:44:40.006	Unknown Client	\N	\N	\N	\N
txn-1756650522642-cx31i3gkm	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1985	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-08-31 14:28:42.642	Unknown Client	\N	\N	\N	\N
txn-1756650550626-hx2sxc4mz	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1984	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-08-31 14:29:10.626	Unknown Client	\N	\N	\N	\N
txn-1756652224232-cj3x0clq3	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	2	1976	AI Usage in Order reference	IMAGE_PROCESSING	\N	2025-08-31 14:57:04.232	Unknown Client	\N	\N	\N	\N
txn-1756659667594-qtee903qo	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	2	1961	AI Usage in Order reference	IMAGE_PROCESSING	\N	2025-08-31 17:01:07.594	Unknown Client	\N	\N	\N	\N
txn-1756659680752-sa7k6op91	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1960	Order creation	ORDER	\N	2025-08-31 17:01:20.752	Unknown Client	\N	\N	\N	\N
txn-1756747378178-u6ck77xgl	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1939	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-09-01 17:22:58.178	Unknown Client	\N	\N	\N	\N
txn-1756747389742-7a57op3b3	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1938	Order creation	ORDER	\N	2025-09-01 17:23:09.742	Unknown Client	\N	\N	\N	\N
txn-1756733071942-r8z2tv9z4	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1948	Order creation	ORDER	\N	2025-09-01 13:24:31.943	Unknown Client	\N	\N	\N	\N
txn-1756668035395-u7vobclnw	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1952	Order creation	ORDER	\N	2025-08-31 19:20:35.395	Unknown Client	\N	\N	\N	\N
txn-1756644786277-rq0209qyi	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	991	Order creation	ORDER	\N	2025-08-31 12:53:06.277	Unknown Client	\N	\N	\N	\N
txn-1756750279107-vvj7elote	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1937	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-09-01 18:11:19.107	Unknown Client	\N	\N	\N	\N
txn-1756750294332-q0akxfifo	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1936	Order creation	ORDER	134	2025-09-01 18:11:34.332	Unknown Client	\N	\N	\N	\N
txn-1756750379836-sm5h9j5di	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	2	1934	AI Usage in Order reference	IMAGE_PROCESSING	\N	2025-09-01 18:12:59.836	Unknown Client	\N	\N	\N	\N
txn-1756750391062-nby9oq991	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1933	Order creation	ORDER	135	2025-09-01 18:13:11.062	Unknown Client	\N	\N	\N	\N
txn-1756750453501-yaxhdedt6	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1932	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-09-01 18:14:13.501	Unknown Client	\N	\N	\N	\N
txn-1756750456598-e4vc48vj8	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1931	Order creation	ORDER	136	2025-09-01 18:14:16.598	Unknown Client	\N	\N	\N	\N
txn-1756750588479-93il0wmyx	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1930	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-09-01 18:16:28.479	Unknown Client	\N	\N	\N	\N
txn-1756750597928-bf6vql50b	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1929	Order creation	ORDER	137	2025-09-01 18:16:37.928	Unknown Client	\N	\N	\N	\N
txn-1756999808539-iwa0zdok0	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1928	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-09-04 15:30:08.539	Unknown Client	\N	\N	\N	\N
txn-1756999980524-1gmvt6hg6	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1927	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-09-04 15:33:00.524	Unknown Client	\N	\N	\N	\N
txn-1756999985006-io8fu0yi9	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1926	Order creation	ORDER	1391	2025-09-04 15:33:05.006	Unknown Client	\N	\N	\N	\N
txn-1757000024761-yek0phfci	default-client-001	user-1756643951453-7h5dyb5zm	DEDUCT	1	1925	Order creation	ORDER	1392	2025-09-04 15:33:44.761	Unknown Client	\N	\N	\N	\N
txn-1757059642922-2e2azhiz7	client-1757058396579-m510j2d3m	master-admin-1756272680518	RESET	2000	2000	Initial Load	MANUAL	\N	2025-09-05 08:07:22.922	Route Master Courier and Cargo	\N	\N	\N	\N
txn-1757061746393-lyh1ezd6r	client-1757058396579-m510j2d3m	\N	DEDUCT	1	1999	Order creation	ORDER	\N	2025-09-05 08:42:26.393	Unknown Client	\N	\N	\N	\N
txn-1757065905011-bt3f6kbsm	client-1757058396579-m510j2d3m	\N	DEDUCT	1	1998	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-09-05 09:51:45.011	Unknown Client	\N	\N	\N	\N
txn-1757065982437-r0mv0nhm6	client-1757058396579-m510j2d3m	\N	DEDUCT	1	1996	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-09-05 09:53:02.437	Unknown Client	\N	\N	\N	\N
txn-1757069181142-eksc43ibs	client-1757058396579-m510j2d3m	\N	DEDUCT	1	1993	Order creation	ORDER	\N	2025-09-05 10:46:21.142	Unknown Client	\N	\N	\N	\N
txn-1757065987193-qi8a3i332	client-1757058396579-m510j2d3m	\N	DEDUCT	1	1995	Order creation	ORDER	\N	2025-09-05 09:53:07.193	Unknown Client	\N	\N	\N	\N
txn-1757065912827-10ffyq417	client-1757058396579-m510j2d3m	\N	DEDUCT	1	1997	Order creation	ORDER	\N	2025-09-05 09:51:52.827	Unknown Client	\N	\N	\N	\N
txn-1757069175824-1qzy03erj	client-1757058396579-m510j2d3m	\N	DEDUCT	1	1994	AI Usage in Order reference	TEXT_PROCESSING	\N	2025-09-05 10:46:15.824	Unknown Client	\N	\N	\N	\N
\.


--
-- Data for Name: csrf_tokens; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.csrf_tokens (id, token, "userId", "sessionId", "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: order_analytics; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.order_analytics (id, "orderId", "creationPattern", "clientId", "userId", "createdAt") FROM stdin;
order-analytics-1757370681114-bswwregp3	91	manual	master-client-1756272680179	master-admin-1756272680518	2025-09-08 22:31:21.115
order-analytics-1757370738416-zziylte0v	92	manual	master-client-1756272680179	master-admin-1756272680518	2025-09-08 22:32:18.417
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.orders (id, "clientId", name, mobile, phone, address, city, state, country, pincode, courier_service, pickup_location, package_value, weight, total_items, tracking_id, reference_number, is_cod, cod_amount, reseller_name, reseller_mobile, created_at, updated_at, delhivery_waybill_number, delhivery_order_id, delhivery_api_status, delhivery_api_error, delhivery_retry_count, last_delhivery_attempt, shipment_length, shipment_breadth, shipment_height, product_description, return_address, return_pincode, fragile_shipment, seller_name, seller_address, seller_gst, invoice_number, commodity_value, tax_value, category_of_goods, vendor_pickup_location, hsn_code, seller_cst_no, seller_tin, invoice_date, return_reason, ewbn, shopify_fulfillment_id, shopify_customer_email, shopify_note, shopify_order_id, shopify_order_number, shopify_tags, shopify_update_error, shopify_update_status, shopify_update_timestamp, tracking_url) FROM stdin;
134	default-client-001	Priya Sharma	9701234567		Flat No: 203, Green View Apartments Near City Center Mall, Banjara Hills	Hyderabad	Telangana	India	500034	delhivery	SUJATHA FRANCHISE	5000	100	1	24947111923902	04UEDH-9701234567	f	\N	Default Company	+91-9876543210	2025-09-01 18:11:33.003	2025-09-01 18:11:33.003	24947111923902	04UEDH-9701234567	success	\N	0	2025-09-01 18:11:34.318	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
136	default-client-001	Suresh Babu	9391465346		H.No: 3-24/2, Gandhi Chowk Near RTC Bus Stand	Karimnagar	Telangana	India	505001	dtdc	SUJATHA FRANCHISE	5000	100	1	12313131231	KWLQVT-9391465346	f	\N	Default Company	+91-9876543210	2025-09-01 18:14:16.585	2025-09-01 18:14:16.585	\N	\N	\N	\N	0	\N	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
18	client-1757058396579-m510j2d3m	Sailaja Dintakurthi	+919676230276	+919676230276	7/364 Ramanaidupet	Machilipatnam	Andhra Pradesh	India	521001	delhivery	SUJATHA FRANCHISE	2000	100	2	11837210733025	SHOP-1033-9676230276	f	\N	\N	\N	2025-09-08 13:08:10.943	2025-09-08 13:09:20.044	11837210733025	\N	success	\N	0	2025-09-08 13:09:19.495	\N	\N	\N	Test Product for Scan2Ship	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6397732847982		\N	11592814526830	1033		\N	success	2025-09-08 13:09:20.044	https://www.delhivery.com/track-v2/package/11837210733025
19	client-1757343020924-609gdrmzj	CH Varalakshmi	9550051590	\N	Saket Pranaam, A Block,Plot  Number 602,Saket Colony	Hyderabad	Telangana	India	500062	delhivery	MTM	5000	100	1	42492210004266	WMYYJ8-9550051590	f	\N	Navya collections	7386952642	2025-09-05 11:09:51.35	2025-09-05 11:09:51.35	42492210004266	WMYYJ8-9550051590	success	\N	0	2025-09-05 11:09:52.641	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
20	client-1757343020924-609gdrmzj	Keerthi Rakasi	9951665342	8121504447	H no 2-7/1/2 Turkayamjal Near brilliant school	Hyderabad	Telangana	India	501510	delhivery	MTM	5000	100	1	42492210004270	Z27E3X-9951665342	f	\N	Siri	8121504447	2025-09-05 11:24:22.756	2025-09-05 11:24:22.756	42492210004270	Z27E3X-9951665342	success	\N	0	2025-09-05 11:24:24.14	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
21	client-1757343020924-609gdrmzj	B. Varahalamma	9063667055	\N	Balaji nagar Christian gospel church Vivekananda colony D.no 12-3	Vishakapatnam	Andhra Pradesh	India	530040	delhivery	MTM	5000	100	1	42492210004281	J03CYX-9063667055	f	\N	G. Devi	7989463306	2025-09-05 11:27:22.272	2025-09-05 11:27:22.272	42492210004281	J03CYX-9063667055	success	\N	0	2025-09-05 11:27:23.688	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
22	client-1757343020924-609gdrmzj	S. Dayanand	9448472666	6281196870	SF 3 Ajantha wonder Apartments 9th main 5th cross Beml layout Dwaraka nagar	Bengaluru	Karnataka	India	560098	delhivery	MTM	5000	100	1	42492210004292	FAJEN5-9448472666	f	\N	Nandu world	6281196870	2025-09-05 11:27:50.691	2025-09-05 11:27:50.691	42492210004292	FAJEN5-9448472666	success	\N	0	2025-09-05 11:27:52.029	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
23	client-1757343020924-609gdrmzj	P Harika	9348837559	9078986742	New colony 7th line near psr cinemas indian bank house no .093	Rayagada	Odisha	India	765001	delhivery	MTM	5000	100	1	42492210004303	TKF6YS-9348837559	f	\N	Bittu collection	9078986742	2025-09-05 11:28:28.523	2025-09-05 11:28:28.523	42492210004303	TKF6YS-9348837559	success	\N	0	2025-09-05 11:28:30.069	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
24	client-1757343020924-609gdrmzj	Aradhyula Mani	9823562327	\N	Flat no. 701, A3 Lunkad amazon, Viman nagar	PUNE	Maharashtra	India	411014	delhivery	MTM	5000	100	1	42492210004314	H9P97W-9823562327	f	\N	Ranisri Collection's	7013970153	2025-09-05 11:29:20.197	2025-09-05 11:29:20.197	42492210004314	H9P97W-9823562327	success	\N	0	2025-09-05 11:29:21.605	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
25	client-1757343020924-609gdrmzj	Uppalapati Rashmi	6303984886	534411	Pakalapati house, Door no.. NH216A Nandu world	Unguturu	Andhra Pradesh	India	534411	delhivery	MTM	5000	100	1	42492210004325	HV1X8Z-6303984886	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 11:29:57.658	2025-09-05 11:29:57.658	42492210004325	HV1X8Z-6303984886	success	\N	0	2025-09-05 11:29:59.025	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
135	default-client-001	Anil Reddy	9845123456		H.No: 5-12/4, Srinivasa Nagar, Beside Vignan School, Dilsukhnagar	Hyderabad	Telangana	India	500060	delhivery	SUJATHA FRANCHISE	5000	100	1	24947111923913	H7K6PL-9845123456	f	\N	Default Company	+91-9876543210	2025-09-01 18:13:09.676	2025-09-01 18:13:09.676	24947111923913	H7K6PL-9845123456	success	\N	0	2025-09-01 18:13:11.042	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
26	client-1757343020924-609gdrmzj	Dondapati Swapna	9618724998	6281196870	H.no 1-94/2, second floor, opposite lucky home, pochamma colony, near Marrichettu junction, Manikonda	Hyderabad	Telangana	India	500089	delhivery	MTM	5000	100	1	42492210004336	2YA30N-9618724998	f	\N	Nandu world	6281196870	2025-09-05 11:46:37.824	2025-09-05 11:46:37.824	42492210004336	2YA30N-9618724998	success	\N	0	2025-09-05 11:46:39.302	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
27	client-1757343020924-609gdrmzj	Gadde Rajeshkannaiah	9848903960	9848903960	H.NO.6-33 Mupkal	Nizamabad	Telangana	India	503218	dtdc	MTM	5000	100	1	\N	CWW278-9848903960	f	\N	Jaya	9848903960	2025-09-05 11:47:20.755	2025-09-05 11:47:20.755	\N	\N	\N	\N	0	\N	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
28	client-1757343020924-609gdrmzj	Sunanda Alluri	6309596923	\N	Jupalli Residency, plot no 305, Gurrala Cheruvu Road, Bhadradri Kothagudem district	ASWARAOPET	TELANGANA	India	507301	delhivery	MTM	5000	100	1	42492210004340	SFVQHD-6309596923	f	\N	BB JEWELLERY	9985448993	2025-09-05 11:47:49.389	2025-09-05 11:47:49.389	42492210004340	SFVQHD-6309596923	success	\N	0	2025-09-05 11:47:50.537	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
29	client-1757343020924-609gdrmzj	Lokesh Gowda	7760246417	\N	Yogesh Nilaya, 2nd Left, left turn beside manjunatha floor mill, Sirgonda	Chikmagalur	Karnataka	India	577133	delhivery	MTM	5000	100	1	42492210004351	60BKX0-7760246417	f	\N	sk brand imitation jewellery	9490711415	2025-09-05 11:48:12.766	2025-09-05 11:48:12.766	42492210004351	60BKX0-7760246417	success	\N	0	2025-09-05 11:48:13.618	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
30	client-1757343020924-609gdrmzj	Challapalli Krishna Kumari	7093714440	\N	Chinmaya Nagar JNTU College PR colony road no 2	Anantapur	Andhra Pradesh	India	515002	delhivery	MTM	5000	100	1	42492210004362	GNYA8W-7093714440	f	\N	Aswani collections	9441148559	2025-09-05 11:48:33.744	2025-09-05 11:48:33.744	42492210004362	GNYA8W-7093714440	success	\N	0	2025-09-05 11:48:34.965	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
31	client-1757343020924-609gdrmzj	E. Leela Kumari	9886782560	9986383007	Door No 45/01, 10th Cross, Ashoknagar Nagar, Near Vidyapeeta Circle	Bangalore	Karnataka	India	560050	delhivery	MTM	5000	100	1	42492210004373	D05HNX-9886782560	f	\N	Nandu world	6281196870	2025-09-05 11:50:37.317	2025-09-05 11:50:37.317	42492210004373	D05HNX-9886782560	success	\N	0	2025-09-05 11:50:38.461	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
32	client-1757343020924-609gdrmzj	Aswini	8660016019	8606925636	#6232 , sapthagiri nilaya BWSSB West Basaweshwara nagara Ramanagar district	Kanakapura	Karnataka	India	562117	delhivery	MTM	5000	100	1	42492210004384	M1K59I-8660016019	f	\N	Her Treasures Jewels	8606925636	2025-09-05 11:51:31.336	2025-09-05 11:51:31.336	42492210004384	M1K59I-8660016019	success	\N	0	2025-09-05 11:51:32.522	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
33	client-1757343020924-609gdrmzj	G. Bhavani	9848458696	\N	H no - 7-219 Plot.no.10 Venugopala swamy town ship Opp.. MRO Office	Chityala	Telangana	India	508114	delhivery	MTM	5000	100	1	42492210004395	TYRNNA-9848458696	f	\N	D. K collections	7207855605	2025-09-05 11:52:01.9	2025-09-05 11:52:01.9	42492210004395	TYRNNA-9848458696	success	\N	0	2025-09-05 11:52:03.333	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
34	client-1757343020924-609gdrmzj	Masapeta Mounika	8639388423	7995974747	Pochamma tempul	Bachannapeta	Telangana	India	506221	delhivery	MTM	5000	100	1	42492210004406	LLD6P1-8639388423	f	\N	Queenstrenz	7995974747	2025-09-05 11:52:31.592	2025-09-05 11:52:31.592	42492210004406	LLD6P1-8639388423	success	\N	0	2025-09-05 11:52:32.729	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
35	client-1757343020924-609gdrmzj	N. Sailaxmi	9032199481	9848960264	Flat No -103, Shivasai Haripriya Residency, Bharath Nagar, Beside Punjab National Bank, Ensanpally Road	Siddipet	Telangana	India	502103	delhivery	MTM	5000	100	1	42492210004410	R4NEJN-9032199481	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 11:52:52.838	2025-09-05 11:52:52.838	42492210004410	R4NEJN-9032199481	success	\N	0	2025-09-05 11:52:54.172	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
36	client-1757343020924-609gdrmzj	CH Varalakshmi	9550051590	\N	Saket Pranaam, A Block,Plot  Number 602,Saket Colony	Hyderabad	Telangana	India	500062	delhivery	MTM	5000	100	1	42492210004421	YE9UWL-9550051590	f	\N	Navya collections	7386952642	2025-09-05 11:53:10.056	2025-09-05 11:53:10.056	42492210004421	YE9UWL-9550051590	success	\N	0	2025-09-05 11:53:11.484	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
137	default-client-001	Rajesh Kumar	9490012345		Flat No: 102, Sri Sai Residency Near Infosys Campus, Gachibowli	Hyderabad	Telangana	India	500032	delhivery	SUJATHA FRANCHISE	5000	100	1	24947111923924	MIJ0ID-9490012345	f	\N	Sunitha Rani	9876547890	2025-09-01 18:16:36.433	2025-09-01 18:16:36.433	24947111923924	MIJ0ID-9490012345	success	\N	0	2025-09-01 18:16:37.886	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
37	client-1757343020924-609gdrmzj	Ravi Kiran	9390256423	\N	DIVINE ALLURA GATED COMMUNITY, Flat no-306, Block C, RD NUMBER 7, FRIENDS COLONY, CHANDANAGAR	Hyderabad	Telangana	India	500050	delhivery	MTM	5000	100	1	42492210004432	TGWMQ6-9390256423	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 11:53:34.306	2025-09-05 11:53:34.306	42492210004432	TGWMQ6-9390256423	success	\N	0	2025-09-05 11:53:35.506	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
38	client-1757343020924-609gdrmzj	Sakthi Kumaran	9790533309	9440826122	2/5 Narayanan Street Sixth lane Pudupet	Chennai	Tamil Nadu	India	600002	delhivery	MTM	5000	100	1	42492210004443	EO02R5-9790533309	f	\N	Honey creations	9440826122	2025-09-05 11:53:58.014	2025-09-05 11:53:58.014	42492210004443	EO02R5-9790533309	success	\N	0	2025-09-05 11:53:59.383	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
39	client-1757343020924-609gdrmzj	Ch Suresh	9491022605	6304478522	Check post center. Eluru district.	Kamavavarapukota	Andhra Pradesh	India	534449	delhivery	MTM	5000	100	1	42492210004454	Z0WQZZ-9491022605	f	\N	Chinni Srilakshmi	6304478522	2025-09-05 11:54:20.561	2025-09-05 11:54:20.561	42492210004454	Z0WQZZ-9491022605	success	\N	0	2025-09-05 11:54:21.836	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
40	client-1757343020924-609gdrmzj	Priya	7075315439	\N	Plot:53 Ismailkhanguda Beside Shantiniketan school Rampally Keesara mandal Medchal Malkajgiri	Hyderabad	Telangana	India	501301	delhivery	MTM	5000	100	1	42492210004476	DPVQ94-7075315439	f	\N	Madalasa collections	8885253555	2025-09-05 11:55:07.778	2025-09-05 11:55:07.778	42492210004476	DPVQ94-7075315439	success	\N	0	2025-09-05 11:55:09.181	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
41	client-1757343020924-609gdrmzj	Vijay Shanthi	9705328307	\N	MAXIVISION eye hospital Kothapet near Victoria memorial metro station beside zudio shopping mall Dilsukhnagar	Hyderabad	Telangana	India	500035	delhivery	MTM	5000	100	1	42492210004480	R9AZIV-9705328307	f	\N	Madalasa collections	8885253555	2025-09-05 11:55:30.968	2025-09-05 11:55:30.968	42492210004480	R9AZIV-9705328307	success	\N	0	2025-09-05 11:55:32.328	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
42	client-1757343020924-609gdrmzj	Chitra	9597332113	\N	20/9, vallalar nagar 1st Opposite GH Manjakuppam	Cuddalore	Tamil Nadu	India	607001	delhivery	MTM	5000	100	1	42492210004491	KB7QVV-9597332113	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 11:57:47.305	2025-09-05 11:57:47.305	42492210004491	KB7QVV-9597332113	success	\N	0	2025-09-05 11:57:48.755	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
43	client-1757343020924-609gdrmzj	Y. Nagalaxmi	9908932298	\N	D.no 8/127, Gandhinagar, Satya Sai district	Dharmavaram	Andhra Pradesh	India	515671	delhivery	MTM	5000	100	1	42492210004502	OA0Z8Y-9908932298	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 12:13:19.473	2025-09-05 12:13:19.473	42492210004502	OA0Z8Y-9908932298	success	\N	0	2025-09-05 12:13:20.876	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
44	client-1757343020924-609gdrmzj	Naresh Sama	9885220291	9491618970	11-23-2317/1 Dessipet road krishanaveni school opposite Srinivasacolony	Warangal	Telangana	India	506002	delhivery	MTM	5000	100	1	42492210004513	CQQLU1-9885220291	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 12:24:27.468	2025-09-05 12:24:27.468	42492210004513	CQQLU1-9885220291	success	\N	0	2025-09-05 12:24:28.94	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
45	client-1757343020924-609gdrmzj	J Deepa Reddy	6362533509	\N	no=80/1,sreenivasa building,near galaxy paradise cinema theatre,12th main road, hongasandra,begur main road, Banashankari tent	Bengaluru	Karnataka	India	560068	delhivery	MTM	5000	100	1	42492210004524	60NDXZ-6362533509	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 12:24:49.357	2025-09-05 12:24:49.357	42492210004524	60NDXZ-6362533509	success	\N	0	2025-09-05 12:24:50.842	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
46	client-1757343020924-609gdrmzj	Veena	8317450019	\N	House no 28 gadikoppa Durga layout, Gnana ganga school be hind gadikoppa	Shimoga	KA	India	577205	delhivery	MTM	5000	100	1	42492210004535	WZ679E-8317450019	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 12:26:01.129	2025-09-05 12:26:01.129	42492210004535	WZ679E-8317450019	success	\N	0	2025-09-05 12:26:02.637	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
47	client-1757343020924-609gdrmzj	Jyothi B	9652624147	\N	SMR Vinay Fountainhead Road Hafeezpet Flat No 303, Block 2, SMR Vinay Fountainhead, Miyapur	Mathrusri Nagar	TG	India	500049	delhivery	MTM	5000	100	1	42492210004546	2SVRQU-9652624147	f	\N	Raveendra Gold Covering	9652624147	2025-09-05 12:26:28.907	2025-09-05 12:26:28.907	42492210004546	2SVRQU-9652624147	success	\N	0	2025-09-05 12:26:30.402	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
48	client-1757343020924-609gdrmzj	T. Sushma	9573848295	\N	Flat no -302 Sri kumari mythrivanam Sri sairam nagar Rajeevnagar Duvvada	Visakhapatnam	Andhra Pradesh	India	530049	delhivery	MTM	5000	100	1	42492210004550	ENAJB3-9573848295	f	\N	N Anusha	8121525604	2025-09-05 12:56:47.972	2025-09-05 12:56:47.972	42492210004550	ENAJB3-9573848295	success	\N	0	2025-09-05 12:56:49.391	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
49	client-1757343020924-609gdrmzj	D. Nagamani	8125686163	6281196870	16-321 Near Narayana School Kummaripalem	Piduguralla	Andhra Pradesh	India	522413	delhivery	MTM	5000	100	1	42492210004561	E76OKX-8125686163	f	\N	Nandu World	6281196870	2025-09-06 11:28:21.099	2025-09-06 11:28:21.099	42492210004561	E76OKX-8125686163	success	\N	0	2025-09-06 11:28:24.074	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
50	client-1757343020924-609gdrmzj	Kodavatikanti Suneeta	9381062099	\N	Near Sai Baba water plant Siva nagar	Badvel	Andhra Pradesh	India	516227	delhivery	MTM	5000	100	1	42492210004572	6YZQNF-9381062099	f	\N	Ranisri Collection's	7013970153	2025-09-06 11:51:32.86	2025-09-06 11:51:32.86	42492210004572	6YZQNF-9381062099	success	\N	0	2025-09-06 11:51:35.407	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
51	client-1757343020924-609gdrmzj	K. Vijaya	9398327586	6303968121	H-no:4-8-260/3 Purushotham Reddy Street Mythri layout YSR memorial park	Pullivendula	Andhra Pradesh	India	516390	delhivery	MTM	5000	100	1	42492210004583	SCZB1L-9398327586	f	\N	K.vijaya collections	6303968121	2025-09-06 11:54:08.417	2025-09-06 11:54:08.417	42492210004583	SCZB1L-9398327586	success	\N	0	2025-09-06 11:54:11.401	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
52	client-1757343020924-609gdrmzj	Varalaxmi Thallapelli	9581232525	7995523763	603, Gangeya Infrastructure Pvt Ltd., Jayabharathi kalpana Building, Miyapur, Landmark - Beside Miyapur Ratnadep super market	Hyderabad	Telangana	India	500049	delhivery	MTM	5000	100	1	42492210004594	2CY67Q-9581232525	f	\N	Tara Collections	7995523763	2025-09-06 11:54:39.681	2025-09-06 11:54:39.681	42492210004594	2CY67Q-9581232525	success	\N	0	2025-09-06 11:54:42.403	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
53	client-1757343020924-609gdrmzj	Ramakrishna	9949239477	8606925636	#310, La green(Shiva Sai Infraa), Landmark: Opp. Gowtham Model school, GoldenTemple streetEND. Sri ramnagar, Puppalguda, Manikonda	Hyderabad	Telangana	India	500089	delhivery	MTM	5000	100	1	42492210004605	NZN36O-9949239477	f	\N	Her Treasures Jewels	8606925636	2025-09-06 11:56:27.988	2025-09-06 11:56:27.988	42492210004605	NZN36O-9949239477	success	\N	0	2025-09-06 11:56:30.954	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
54	client-1757343020924-609gdrmzj	Swapna Rani	9581345535	8606925636	H.No. 14-20-677/n/b, parvath nagar, AXIS Bank ATM	Hyderabad	Telangana	India	500018	delhivery	MTM	5000	100	1	42492210004616	6ZYC6H-9581345535	f	\N	Sri alankara fashions	7729893541	2025-09-06 11:57:21.601	2025-09-06 11:57:21.601	42492210004616	6ZYC6H-9581345535	success	\N	0	2025-09-06 11:57:24.6	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
55	client-1757343020924-609gdrmzj	A Uma Devi	9248602530	\N	2/8/191, Rama Nilayam, Sitara Center, Labour Colony, VD Puram	Vijayawada	Andhra Pradesh	India	520012	delhivery	MTM	5000	100	1	42492210004620	YCYKI5-9248602530	f	\N	I Komali	7386999106	2025-09-06 11:57:54.615	2025-09-06 11:57:54.615	42492210004620	YCYKI5-9248602530	success	\N	0	2025-09-06 11:57:57.613	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
56	client-1757343020924-609gdrmzj	Ramadevi K Sunandhu	9731715071	\N	Sunshine layout Near Reliance fresh 1st Croaa tc Paly Krpuram	Banglore	Karnataka	India	560036	delhivery	MTM	5000	100	1	42492210004631	GAUIVX-9731715071	f	\N	Ambica collections	7075948914	2025-09-06 11:58:38.145	2025-09-06 11:58:38.145	42492210004631	GAUIVX-9731715071	success	\N	0	2025-09-06 11:58:39.605	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
57	client-1757343020924-609gdrmzj	Anil Shankar Rao Sutrave	7057458944	8669431728	Vidya Nagar Balapur road Dharmabad	Nanded	Maharashtra	India	431809	delhivery	MTM	5000	100	1	42492210004642	PZ3W0G-7057458944	f	\N	Praju	8669431728	2025-09-06 11:59:17.118	2025-09-06 11:59:17.118	42492210004642	PZ3W0G-7057458944	success	\N	0	2025-09-06 11:59:20.283	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
58	client-1757343020924-609gdrmzj	K.Geetha	8978739003	9885608429	12-B Subash nagar Near shishumandir school Nagar kurnool dist	Kalwakurthy	Telangana	India	509324	delhivery	MTM	5000	100	1	42492210004653	P0XPJC-8978739003	f	\N	Msp jewellery	9652894901	2025-09-06 11:59:54.873	2025-09-06 11:59:54.873	42492210004653	P0XPJC-8978739003	success	\N	0	2025-09-06 11:59:57.919	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
59	client-1757343020924-609gdrmzj	Beulah	9701720800	8606925636	Jodichinthala village Near church Yadamari mandal Chittoor Dt	Yadamari	Chittoor	India	517422	delhivery	MTM	5000	100	1	42492210004664	ZDAO5G-9701720800	f	\N	Her Treasures Jewels	8606925636	2025-09-06 12:00:20.553	2025-09-06 12:00:20.553	42492210004664	ZDAO5G-9701720800	success	\N	0	2025-09-06 12:00:23.294	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
60	client-1757343020924-609gdrmzj	S Bhuvaneswari	9841291694	\N	FLAT NO 1117, 11th floor,B block, GOKUL's BHUVANAM Sy No.254, Nizampet Rd, opp. Karur Vysya Bank, Nizampet	Hyderabad	Telangana	India	500090	delhivery	MTM	5000	100	1	42492210004675	DRSU7Q-9841291694	f	\N	sk brand imitation jewellery	9490711415	2025-09-06 12:00:50.261	2025-09-06 12:00:50.261	42492210004675	DRSU7Q-9841291694	success	\N	0	2025-09-06 12:00:53.107	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
61	client-1757343020924-609gdrmzj	Prathyusha	6304173211	\N	Fortune green homes swan B-203 Knr colony Beside vignan school Nizampet	Hyderabad	Telangana	India	500090	delhivery	MTM	5000	100	1	42492210104683	2OE4Q0-6304173211	f	\N	Friends collection by sru	9666225737	2025-09-06 12:01:42.92	2025-09-06 12:01:42.92	42492210104683	2OE4Q0-6304173211	success	\N	0	2025-09-06 12:01:45.932	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
62	client-1757343020924-609gdrmzj	M Radha	9160700468	9019676607	H no 118 2nd floor Gowtami Appartment Nandi Green Homes Kranthi Nagar	Nandyal	AP	India	518502	delhivery	MTM	5000	100	1	42492210104694	7F0G1J-9160700468	f	\N	C Vamsi Krishna	9019676607	2025-09-06 12:02:43.392	2025-09-06 12:02:43.392	42492210104694	7F0G1J-9160700468	success	\N	0	2025-09-06 12:02:46.459	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
63	client-1757343020924-609gdrmzj	G. Bhagyasri	7382442869	9704513576	D. no:10-146 Flat no:316 Anjeneya residensi apartment Khajipet bus stop Guntupalli	Vijayawada	Andhra Pradesh	India	521241	delhivery	MTM	5000	100	1	42492210104705	NMQFEX-7382442869	f	\N	G. Rani	9704513576	2025-09-06 12:04:29.684	2025-09-06 12:04:29.684	42492210104705	NMQFEX-7382442869	success	\N	0	2025-09-06 12:04:32.672	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
64	client-1757343020924-609gdrmzj	Ashwini	9182658166	\N	12/192, Sai General Store, Valisab road Opposite Star 1 Saree Center , Sathya Sai District	Kadiri	Andhrapradesh	India	515591	delhivery	MTM	5000	100	1	42492210104716	CTT0LF-9182658166	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-06 12:53:23.107	2025-09-06 12:53:23.107	42492210104716	CTT0LF-9182658166	success	\N	0	2025-09-06 12:53:25.943	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
65	client-1757343020924-609gdrmzj	Anusha Kasina	8328103261	\N	D.No.23-33-19, T-2, Rama krishna enclave, gudlurivari street, Satyanarayana puram	Vijayawada	Andhra Pradesh	India	520011	delhivery	MTM	5000	100	1	42492210104720	ASSB8U-8328103261	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-06 13:04:16.851	2025-09-06 13:04:16.851	42492210104720	ASSB8U-8328103261	success	\N	0	2025-09-06 13:04:19.899	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
66	client-1757343020924-609gdrmzj	Sandhya K	6302397436	6309350681	sandhya k, 4-32-225,plot num : 35, Beside santhosh dabha Andhra Bank lane,lal bahadur nagat,shapur nagar	Hyderabad	Telangana	India	500055	delhivery	MTM	5000	100	1	42492210104731	ND1R1Z-6302397436	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-06 13:19:24.118	2025-09-06 13:19:24.118	42492210104731	ND1R1Z-6302397436	success	\N	0	2025-09-06 13:19:27.077	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
67	client-1757343020924-609gdrmzj	Praveena Reddy	9000075709	\N	125/d Vengalrao Nagar, Madhura Nagar, Rajya Lakshmi Nilayam	Hyderabad	Telangana	India	500038	delhivery	MTM	5000	100	1	42492210104742	NBR1Y0-9000075709	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-06 13:21:52.15	2025-09-06 13:21:52.15	42492210104742	NBR1Y0-9000075709	success	\N	0	2025-09-06 13:21:55.243	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
68	client-1757343020924-609gdrmzj	Vidya Pv	9446182202	\N	Postmaster Kodinhi postoffice Malappuram district	Kodinhi	Kerala	India	676309	delhivery	MTM	5000	100	1	42492210104845	78QUJF-9446182202	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-06 13:22:45.659	2025-09-06 13:22:45.659	42492210104845	78QUJF-9446182202	success	\N	0	2025-09-06 13:22:48.745	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
69	client-1757343020924-609gdrmzj	Teegala Swathi	7075083398	\N	1-35 near shivalayam temple krishna nagar colony road no 2 Sarror nagar colony road no 2	K V Rangareddy	TG	India	500035	delhivery	MTM	5000	100	1	42492210104856	V06R4W-7075083398	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-06 13:28:28.547	2025-09-06 13:28:28.547	42492210104856	V06R4W-7075083398	success	\N	0	2025-09-06 13:28:31.622	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
70	client-1757343020924-609gdrmzj	Soujanya Gollapapani	8309045704	\N	BSR deluxe womens hostel Gowthami nagar,chandanagar	Hyderabad	TG	India	500050	delhivery	MTM	5000	100	1	42492210104860	QOPJ60-8309045704	f	\N	Raveendra Gold Covering	8309045704	2025-09-06 13:31:22.084	2025-09-06 13:31:22.084	42492210104860	QOPJ60-8309045704	success	\N	0	2025-09-06 13:31:25.071	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
71	client-1757343020924-609gdrmzj	Archana	9036089994	\N	Flat no 204.niranjan jenisis apartment, mylasandra road,begur.	Bengaluru	Karnataka	India	560068	delhivery	MTM	5000	100	1	42492210104871	HU2OFL-9036089994	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-08 05:52:39.072	2025-09-08 05:52:39.072	42492210104871	HU2OFL-9036089994	success	\N	0	2025-09-08 05:52:42.02	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
72	client-1757343020924-609gdrmzj	Shajeela Husain	9946313820	\N	mp house, Pazhavila, Pangodu PO	Thiruvanandapuram	Kerala	India	695609	delhivery	MTM	5000	100	1	42492210104882	A3N4FE-9946313820	f	\N	Her Treasures Jewels	8606925636	2025-09-08 05:55:29.921	2025-09-08 05:55:29.921	42492210104882	A3N4FE-9946313820	success	\N	0	2025-09-08 05:55:32.944	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
73	client-1757343020924-609gdrmzj	Karthik	9291909909	9515300388	Shop no 368, mahatma gandhi complex, Gollapudi, Near sai baba temple	Vijayawada	Andhra Pradesh	India	521225	delhivery	MTM	5000	100	1	42492210104893	VO0AQK-9291909909	f	\N	Yh collections	9515300388	2025-09-08 05:57:55.152	2025-09-08 05:57:55.152	42492210104893	VO0AQK-9291909909	success	\N	0	2025-09-08 05:57:58.202	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
74	client-1757343020924-609gdrmzj	Sampathkumar Advocate	9445643834	\N	50/32 sankaramadam street	Villupuram	Tamil Nadu	India	605602	delhivery	MTM	5000	100	1	42492210104904	XDGZA4-9445643834	f	\N	Her Treasures Jewels	8606925636	2025-09-08 06:23:28.049	2025-09-08 06:23:28.049	42492210104904	XDGZA4-9445643834	success	\N	0	2025-09-08 06:23:30.985	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
75	client-1757343020924-609gdrmzj	Sudha Gopi	9942212094	8919179615	91 Upstairs, Periyar nagar Near Ration shop	Kulithalai	Tamilnadu	India	639104	delhivery	MTM	5000	100	1	42492210104915	QFHIOB-9942212094	f	\N	Madhura sadan	8919179615	2025-09-08 06:24:50.049	2025-09-08 06:24:50.049	42492210104915	QFHIOB-9942212094	success	\N	0	2025-09-08 06:24:52.987	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
76	client-1757343020924-609gdrmzj	Sujatha	9380303854	\N	C3F3 VGN IMPERIA PHASE3, Vgn Mahalakshmi Nagar, PERUMALAGARAM, Thiruverkaadu	Chennai	Tamil Nadu	India	600077	delhivery	MTM	5000	100	1	42492210104926	AACXHQ-9380303854	f	\N	Her Treasures Jewels	8606925636	2025-09-08 06:27:48.861	2025-09-08 06:27:48.861	42492210104926	AACXHQ-9380303854	success	\N	0	2025-09-08 06:27:51.895	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
77	client-1757343020924-609gdrmzj	K Sri Harsha	7013299327	9494202398	1401, tower 2 block A, 14th floor, radiance suprema, gnt road, madhavaram	Chennai	Tamil Nadu	India	600060	delhivery	MTM	5000	100	1	42492210104930	Z2BZWF-7013299327	f	\N	From elegant fashions	7013299327	2025-09-08 06:28:29.169	2025-09-08 06:28:29.169	42492210104930	Z2BZWF-7013299327	success	\N	0	2025-09-08 06:28:32.192	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
78	client-1757343020924-609gdrmzj	B. Sowjanya (Haritha)	8074715127	\N	H.no 6-1-295/4 3 rd floo Flat no 302 Padmarao Nagar Secunderabad	Hyderabad	Telangana	India	500025	delhivery	MTM	5000	100	1	42492210104941	WNX48Z-8074715127	f	\N	Sujatha Mallikarjun	7337298642	2025-09-08 06:29:20.418	2025-09-08 06:29:20.418	42492210104941	WNX48Z-8074715127	success	\N	0	2025-09-08 06:29:23.436	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
79	client-1757343020924-609gdrmzj	Priya Sunil	9440737889	8247623236	P13/3 JSW Township Vidyanagar	Bellari	Karnataka	India	583275	delhivery	MTM	5000	100	1	42492210104952	0PZPUP-9440737889	f	\N	Her Treasures Jewels	8606925636	2025-09-08 06:29:58.47	2025-09-08 06:29:58.47	42492210104952	0PZPUP-9440737889	success	\N	0	2025-09-08 06:30:01.456	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
80	client-1757343020924-609gdrmzj	Sajina Mohamed	8086542553	9072737274	Panayampilly House Ashtamichira P. O., Near Kannan kaattil temple Thrissur District	Marekkad	Kerala	India	680731	delhivery	MTM	5000	100	1	42492210104963	TGMOFN-8086542553	f	\N	Her treasure jewel store	8606925636	2025-09-08 06:30:43.133	2025-09-08 06:30:43.133	42492210104963	TGMOFN-8086542553	success	\N	0	2025-09-08 06:30:46.317	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
81	client-1757343020924-609gdrmzj	Venugopal Jangam	8978809066	\N	B-505, Aloha Apartment HMT Estate. Jalahalli	Bangalore	KARNATAKA	India	560013	delhivery	MTM	5000	100	1	42492210104974	5ND5N2-8978809066	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-08 06:32:47.643	2025-09-08 06:32:47.643	42492210104974	5ND5N2-8978809066	success	\N	0	2025-09-08 06:32:50.657	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
82	client-1757343020924-609gdrmzj	Dr. Geetha K	9481293514	8121504447	Department of development studies kannada University Hampi vidyaranya post	Hospet	Karnataka	India	583276	delhivery	MTM	5000	100	1	42492210104996	OV1HND-9481293514	f	\N	Siri Collection	8121504447	2025-09-08 06:39:06.464	2025-09-08 06:39:06.464	42492210104996	OV1HND-9481293514	success	\N	0	2025-09-08 06:39:09.466	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
83	client-1757343020924-609gdrmzj	Ramya Ramya	8341801671	\N	11-3-50/1 Warasiguda Secunderabad Mohamadguda Near saraswati saree center	Hyderabad	Telangana	India	500061	delhivery	MTM	5000	100	1	42492210105000	AVQNKS-8341801671	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-08 06:41:13.836	2025-09-08 06:41:13.836	42492210105000	AVQNKS-8341801671	success	\N	0	2025-09-08 06:41:16.882	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
84	client-1757343020924-609gdrmzj	Jessy Parthiban	8124409192	\N	31, Ambedkar street, MGR nagar, Tharamani	Chennai	Tamil Nadu	India	600113	delhivery	MTM	5000	100	1	42492210105011	3MIEM4-8124409192	f	\N	Raveendra Gold Covering	8124409192	2025-09-08 06:42:04.362	2025-09-08 06:42:04.362	42492210105011	3MIEM4-8124409192	success	\N	0	2025-09-08 06:42:07.308	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
85	client-1757343020924-609gdrmzj	Minusri	9398096536	\N	5-12-46/A/1 Hanuman nagar, apurva enclave, pharmacy hostels backside, dabbalu, hanumakonda, warangal	Warangal	Telangana	India	506009	delhivery	MTM	5000	100	1	42492210105022	OIL22Z-9398096536	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-08 06:43:11.044	2025-09-08 06:43:11.044	42492210105022	OIL22Z-9398096536	success	\N	0	2025-09-08 06:43:14.145	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
86	client-1757343020924-609gdrmzj	Meenakshi	9080567433	\N	30/4, flat no 15, A block, 3rd floor, Swathi flats, Subba reddy street, West Mambalam	Chennai	Tamil Nadu	India	600033	delhivery	MTM	5000	100	1	42492210105033	EGFFBN-9080567433	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-08 09:09:24.833	2025-09-08 09:09:24.833	42492210105033	EGFFBN-9080567433	success	\N	0	2025-09-08 09:09:27.934	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
87	client-1757343020924-609gdrmzj	Sowjanya Sowjanya	8639783054	\N	70-8-6, Venkata Dasaradhi Nilayam, G-1, Employee Street, Opp Govindarajulu School, Nem School Road, Patamata	Vijayawada	Andhra Pradesh	India	520010	delhivery	MTM	5000	100	1	42492210105044	PFZM11-8639783054	f	\N	Raveendra Gold Covering	8639783054	2025-09-08 09:13:58.878	2025-09-08 09:13:58.878	42492210105044	PFZM11-8639783054	success	\N	0	2025-09-08 09:14:01.921	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
88	client-1757343020924-609gdrmzj	Lavanya	9492166888	8142437019	2 sets Lavanya 53b KL Puram contonment Near Ganesh temple , beside Vinayaka dental care	Vizianagaram	Andhra Pradesh	India	535001	delhivery	MTM	5000	100	1	42492210105055	FCQBCX-9492166888	f	\N	Trending collectionsRD	8142437019	2025-09-08 09:36:04.602	2025-09-08 09:36:04.602	42492210105055	FCQBCX-9492166888	success	\N	0	2025-09-08 09:36:07.657	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
89	client-1757343020924-609gdrmzj	Anushapraveen	9490815999	\N	Santhoshi H.no 10-52/4 Prabhu Nilayam Jeevenreddy Line Venkateshwara Colony	Armoor	Telangana	India	503224	dtdc	MTM	5000	100	1	9908092439	DZU487-9490815999	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-08 11:03:33.439	2025-09-08 11:03:33.439	\N	\N	\N	\N	0	\N	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
90	client-1757343020924-609gdrmzj	Sreena Shibu	9995097418	\N	Kariyil House Ammanappara C Poyil (PO)	Pariyaram	Kerala	India	670502	delhivery	MTM	5000	100	1	42492210105066	LIWSPK-9995097418	f	\N	Her Treasures Jewels	8606925636	2025-09-08 13:52:21.478	2025-09-08 13:52:21.478	42492210105066	LIWSPK-9995097418	success	\N	0	2025-09-08 13:52:24.646	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
91	master-client-1756272680179	Test User	9876543210	\N	Test Address	Test City	Test State	India	123456	test	test	1000	100	1	\N	TRCUEE-9876543210	f	\N	\N	\N	2025-09-08 22:31:20.934	2025-09-08 22:31:20.934	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
92	master-client-1756272680179	Schema Test User	9876543211	\N	Schema Test Address	Schema Test City	Schema Test State	India	123457	test	test	2000	200	2	\N	P5PI4L-9876543211	f	\N	\N	\N	2025-09-08 22:32:18.268	2025-09-08 22:32:18.268	\N	\N	\N	\N	0	\N	\N	\N	\N	Schema test product	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
14	client-1757058396579-m510j2d3m	Sailaja Dintakurthi	+919676230276	+919676230276	7/364 Ramanaidupet	Machilipatnam	Andhra Pradesh	India	521001	delhivery	SUJATHA FRANCHISE	1000	100	1	11837210732841	SHOP-1029-9676230276	f	\N	\N	\N	2025-09-08 03:48:55.088	2025-09-08 04:31:31.616	11837210732841	\N	success	\N	0	2025-09-08 04:26:54.161	\N	\N	\N	Test Product for Scan2Ship	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6397400809838		\N	11592525316462	1029		\N	success	2025-09-08 04:31:31.616	https://www.delhivery.com/track-v2/package/11837210732841
15	client-1757058396579-m510j2d3m	Sailaja Dintakurthi	+919676230276	+919676230276	7/364 Ramanaidupet	Machilipatnam	Andhra Pradesh	India	521001	delhivery	SUJATHA FRANCHISE	1000	100	1	11837210732830	SHOP-1030-9676230276	f	\N	\N	\N	2025-09-08 04:01:40.322	2025-09-08 04:31:37.693	11837210732830	\N	success	\N	0	2025-09-08 04:22:40.697	\N	\N	\N	Test Product for Scan2Ship	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6397398745454		\N	11592531935598	1030		Cannot read properties of undefined (reading 'shopifyAdminApiToken')	success	2025-09-08 04:31:37.693	https://www.delhivery.com/track-v2/package/11837210732830
16	client-1757058396579-m510j2d3m	Sailaja Dintakurthi	+919676230276	+919676230276	7/364 Ramanaidupet	Machilipatnam	Andhra Pradesh	India	521001	delhivery	SUJATHA FRANCHISE	1000	100	1	11837210732852	SHOP-1031-9676230276	f	\N	\N	\N	2025-09-08 04:27:42.229	2025-09-08 04:31:25.538	11837210732852	\N	success	\N	0	2025-09-08 04:27:53.866	\N	\N	\N	Test Product for Scan2Ship	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6397401137518		\N	11592558772590	1031		\N	success	2025-09-08 04:31:25.538	https://www.delhivery.com/track-v2/package/11837210732852
17	client-1757058396579-m510j2d3m	Sailaja Dintakurthi	+919676230276	+919676230276	7/364 Ramanaidupet	Machilipatnam	Andhra Pradesh	India	521001	delhivery	SUJATHA FRANCHISE	1000	100	1	11837210732863	SHOP-1032-9676230276	f	\N	\N	\N	2025-09-08 04:32:00.621	2025-09-08 04:32:11.542	11837210732863	\N	success	\N	0	2025-09-08 04:32:11.192	\N	\N	\N	Test Product for Scan2Ship	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6397402186094		\N	11592560312686	1032		\N	success	2025-09-08 04:32:11.542	https://www.delhivery.com/track-v2/package/11837210732863
1391	default-client-001	Gopichand	7287857404		3rd floor 202, Bharath’s Leela Lotus apartment, Srihari Nagar,3rd line,beside marQ carwash,	Nellore	Andhra Pradesh	India	524003	india_post	SUJATHA FRANCHISE	5000	100	1	\N	NBELN7-7287857404	f	\N	Default Company	+91-9876543210	2025-09-04 15:33:04.977	2025-09-04 15:33:04.977	\N	\N	\N	\N	0	\N	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
1392	default-client-001	Karthik Naidu	07013157023		Kondapur	Hyderabad	TELANGANA	India	500084	dtdc	SUJATHA FRANCHISE	5000	100	1	124214241321	BJDB6P-7013157023	f	\N	Default Company	+91-9876543210	2025-09-04 15:33:44.733	2025-09-04 15:33:44.733	\N	\N	\N	\N	0	\N	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: orders_backup_20250908_190053; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.orders_backup_20250908_190053 (id, "clientId", name, mobile, phone, address, city, state, country, pincode, courier_service, pickup_location, package_value, weight, total_items, tracking_id, reference_number, is_cod, cod_amount, reseller_name, reseller_mobile, created_at, updated_at, delhivery_waybill_number, delhivery_order_id, delhivery_api_status, delhivery_api_error, delhivery_retry_count, last_delhivery_attempt, shipment_length, shipment_breadth, shipment_height, product_description, return_address, return_pincode, fragile_shipment, seller_name, seller_address, seller_gst, invoice_number, commodity_value, tax_value, category_of_goods, vendor_pickup_location, hsn_code, seller_cst_no, seller_tin, invoice_date, return_reason, ewbn, shopify_customer_email, shopify_fulfillment_id, shopify_note, shopify_order_id, shopify_order_number, shopify_tags, shopify_update_error, shopify_update_status, shopify_update_timestamp, tracking_url) FROM stdin;
134	default-client-001	Priya Sharma	9701234567		Flat No: 203, Green View Apartments Near City Center Mall, Banjara Hills	Hyderabad	Telangana	India	500034	delhivery	SUJATHA FRANCHISE	5000	100	1	24947111923902	04UEDH-9701234567	f	\N	Default Company	+91-9876543210	2025-09-01 18:11:33.003	2025-09-01 18:11:33.003	24947111923902	04UEDH-9701234567	success	\N	0	2025-09-01 18:11:34.318	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
136	default-client-001	Suresh Babu	9391465346		H.No: 3-24/2, Gandhi Chowk Near RTC Bus Stand	Karimnagar	Telangana	India	505001	dtdc	SUJATHA FRANCHISE	5000	100	1	12313131231	KWLQVT-9391465346	f	\N	Default Company	+91-9876543210	2025-09-01 18:14:16.585	2025-09-01 18:14:16.585	\N	\N	\N	\N	0	\N	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
18	client-1757058396579-m510j2d3m	Sailaja Dintakurthi	+919676230276	+919676230276	7/364 Ramanaidupet	Machilipatnam	Andhra Pradesh	India	521001	delhivery	SUJATHA FRANCHISE	2000	100	2	11837210733025	SHOP-1033-9676230276	f	\N	\N	\N	2025-09-08 13:08:10.943	2025-09-08 13:09:20.044	11837210733025	\N	success	\N	0	2025-09-08 13:09:19.495	\N	\N	\N	Test Product for Scan2Ship	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N		6397732847982	\N	11592814526830	1033		\N	success	2025-09-08 13:09:20.044	https://www.delhivery.com/track-v2/package/11837210733025
19	client-1757343020924-609gdrmzj	CH Varalakshmi	9550051590	\N	Saket Pranaam, A Block,Plot  Number 602,Saket Colony	Hyderabad	Telangana	India	500062	delhivery	MTM	5000	100	1	42492210004266	WMYYJ8-9550051590	f	\N	Navya collections	7386952642	2025-09-05 11:09:51.35	2025-09-05 11:09:51.35	42492210004266	WMYYJ8-9550051590	success	\N	0	2025-09-05 11:09:52.641	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
20	client-1757343020924-609gdrmzj	Keerthi Rakasi	9951665342	8121504447	H no 2-7/1/2 Turkayamjal Near brilliant school	Hyderabad	Telangana	India	501510	delhivery	MTM	5000	100	1	42492210004270	Z27E3X-9951665342	f	\N	Siri	8121504447	2025-09-05 11:24:22.756	2025-09-05 11:24:22.756	42492210004270	Z27E3X-9951665342	success	\N	0	2025-09-05 11:24:24.14	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
21	client-1757343020924-609gdrmzj	B. Varahalamma	9063667055	\N	Balaji nagar Christian gospel church Vivekananda colony D.no 12-3	Vishakapatnam	Andhra Pradesh	India	530040	delhivery	MTM	5000	100	1	42492210004281	J03CYX-9063667055	f	\N	G. Devi	7989463306	2025-09-05 11:27:22.272	2025-09-05 11:27:22.272	42492210004281	J03CYX-9063667055	success	\N	0	2025-09-05 11:27:23.688	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
22	client-1757343020924-609gdrmzj	S. Dayanand	9448472666	6281196870	SF 3 Ajantha wonder Apartments 9th main 5th cross Beml layout Dwaraka nagar	Bengaluru	Karnataka	India	560098	delhivery	MTM	5000	100	1	42492210004292	FAJEN5-9448472666	f	\N	Nandu world	6281196870	2025-09-05 11:27:50.691	2025-09-05 11:27:50.691	42492210004292	FAJEN5-9448472666	success	\N	0	2025-09-05 11:27:52.029	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
23	client-1757343020924-609gdrmzj	P Harika	9348837559	9078986742	New colony 7th line near psr cinemas indian bank house no .093	Rayagada	Odisha	India	765001	delhivery	MTM	5000	100	1	42492210004303	TKF6YS-9348837559	f	\N	Bittu collection	9078986742	2025-09-05 11:28:28.523	2025-09-05 11:28:28.523	42492210004303	TKF6YS-9348837559	success	\N	0	2025-09-05 11:28:30.069	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
24	client-1757343020924-609gdrmzj	Aradhyula Mani	9823562327	\N	Flat no. 701, A3 Lunkad amazon, Viman nagar	PUNE	Maharashtra	India	411014	delhivery	MTM	5000	100	1	42492210004314	H9P97W-9823562327	f	\N	Ranisri Collection's	7013970153	2025-09-05 11:29:20.197	2025-09-05 11:29:20.197	42492210004314	H9P97W-9823562327	success	\N	0	2025-09-05 11:29:21.605	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
25	client-1757343020924-609gdrmzj	Uppalapati Rashmi	6303984886	534411	Pakalapati house, Door no.. NH216A Nandu world	Unguturu	Andhra Pradesh	India	534411	delhivery	MTM	5000	100	1	42492210004325	HV1X8Z-6303984886	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 11:29:57.658	2025-09-05 11:29:57.658	42492210004325	HV1X8Z-6303984886	success	\N	0	2025-09-05 11:29:59.025	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
135	default-client-001	Anil Reddy	9845123456		H.No: 5-12/4, Srinivasa Nagar, Beside Vignan School, Dilsukhnagar	Hyderabad	Telangana	India	500060	delhivery	SUJATHA FRANCHISE	5000	100	1	24947111923913	H7K6PL-9845123456	f	\N	Default Company	+91-9876543210	2025-09-01 18:13:09.676	2025-09-01 18:13:09.676	24947111923913	H7K6PL-9845123456	success	\N	0	2025-09-01 18:13:11.042	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
26	client-1757343020924-609gdrmzj	Dondapati Swapna	9618724998	6281196870	H.no 1-94/2, second floor, opposite lucky home, pochamma colony, near Marrichettu junction, Manikonda	Hyderabad	Telangana	India	500089	delhivery	MTM	5000	100	1	42492210004336	2YA30N-9618724998	f	\N	Nandu world	6281196870	2025-09-05 11:46:37.824	2025-09-05 11:46:37.824	42492210004336	2YA30N-9618724998	success	\N	0	2025-09-05 11:46:39.302	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
27	client-1757343020924-609gdrmzj	Gadde Rajeshkannaiah	9848903960	9848903960	H.NO.6-33 Mupkal	Nizamabad	Telangana	India	503218	dtdc	MTM	5000	100	1	\N	CWW278-9848903960	f	\N	Jaya	9848903960	2025-09-05 11:47:20.755	2025-09-05 11:47:20.755	\N	\N	\N	\N	0	\N	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
28	client-1757343020924-609gdrmzj	Sunanda Alluri	6309596923	\N	Jupalli Residency, plot no 305, Gurrala Cheruvu Road, Bhadradri Kothagudem district	ASWARAOPET	TELANGANA	India	507301	delhivery	MTM	5000	100	1	42492210004340	SFVQHD-6309596923	f	\N	BB JEWELLERY	9985448993	2025-09-05 11:47:49.389	2025-09-05 11:47:49.389	42492210004340	SFVQHD-6309596923	success	\N	0	2025-09-05 11:47:50.537	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
29	client-1757343020924-609gdrmzj	Lokesh Gowda	7760246417	\N	Yogesh Nilaya, 2nd Left, left turn beside manjunatha floor mill, Sirgonda	Chikmagalur	Karnataka	India	577133	delhivery	MTM	5000	100	1	42492210004351	60BKX0-7760246417	f	\N	sk brand imitation jewellery	9490711415	2025-09-05 11:48:12.766	2025-09-05 11:48:12.766	42492210004351	60BKX0-7760246417	success	\N	0	2025-09-05 11:48:13.618	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
30	client-1757343020924-609gdrmzj	Challapalli Krishna Kumari	7093714440	\N	Chinmaya Nagar JNTU College PR colony road no 2	Anantapur	Andhra Pradesh	India	515002	delhivery	MTM	5000	100	1	42492210004362	GNYA8W-7093714440	f	\N	Aswani collections	9441148559	2025-09-05 11:48:33.744	2025-09-05 11:48:33.744	42492210004362	GNYA8W-7093714440	success	\N	0	2025-09-05 11:48:34.965	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
31	client-1757343020924-609gdrmzj	E. Leela Kumari	9886782560	9986383007	Door No 45/01, 10th Cross, Ashoknagar Nagar, Near Vidyapeeta Circle	Bangalore	Karnataka	India	560050	delhivery	MTM	5000	100	1	42492210004373	D05HNX-9886782560	f	\N	Nandu world	6281196870	2025-09-05 11:50:37.317	2025-09-05 11:50:37.317	42492210004373	D05HNX-9886782560	success	\N	0	2025-09-05 11:50:38.461	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
32	client-1757343020924-609gdrmzj	Aswini	8660016019	8606925636	#6232 , sapthagiri nilaya BWSSB West Basaweshwara nagara Ramanagar district	Kanakapura	Karnataka	India	562117	delhivery	MTM	5000	100	1	42492210004384	M1K59I-8660016019	f	\N	Her Treasures Jewels	8606925636	2025-09-05 11:51:31.336	2025-09-05 11:51:31.336	42492210004384	M1K59I-8660016019	success	\N	0	2025-09-05 11:51:32.522	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
33	client-1757343020924-609gdrmzj	G. Bhavani	9848458696	\N	H no - 7-219 Plot.no.10 Venugopala swamy town ship Opp.. MRO Office	Chityala	Telangana	India	508114	delhivery	MTM	5000	100	1	42492210004395	TYRNNA-9848458696	f	\N	D. K collections	7207855605	2025-09-05 11:52:01.9	2025-09-05 11:52:01.9	42492210004395	TYRNNA-9848458696	success	\N	0	2025-09-05 11:52:03.333	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
34	client-1757343020924-609gdrmzj	Masapeta Mounika	8639388423	7995974747	Pochamma tempul	Bachannapeta	Telangana	India	506221	delhivery	MTM	5000	100	1	42492210004406	LLD6P1-8639388423	f	\N	Queenstrenz	7995974747	2025-09-05 11:52:31.592	2025-09-05 11:52:31.592	42492210004406	LLD6P1-8639388423	success	\N	0	2025-09-05 11:52:32.729	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
35	client-1757343020924-609gdrmzj	N. Sailaxmi	9032199481	9848960264	Flat No -103, Shivasai Haripriya Residency, Bharath Nagar, Beside Punjab National Bank, Ensanpally Road	Siddipet	Telangana	India	502103	delhivery	MTM	5000	100	1	42492210004410	R4NEJN-9032199481	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 11:52:52.838	2025-09-05 11:52:52.838	42492210004410	R4NEJN-9032199481	success	\N	0	2025-09-05 11:52:54.172	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
36	client-1757343020924-609gdrmzj	CH Varalakshmi	9550051590	\N	Saket Pranaam, A Block,Plot  Number 602,Saket Colony	Hyderabad	Telangana	India	500062	delhivery	MTM	5000	100	1	42492210004421	YE9UWL-9550051590	f	\N	Navya collections	7386952642	2025-09-05 11:53:10.056	2025-09-05 11:53:10.056	42492210004421	YE9UWL-9550051590	success	\N	0	2025-09-05 11:53:11.484	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
137	default-client-001	Rajesh Kumar	9490012345		Flat No: 102, Sri Sai Residency Near Infosys Campus, Gachibowli	Hyderabad	Telangana	India	500032	delhivery	SUJATHA FRANCHISE	5000	100	1	24947111923924	MIJ0ID-9490012345	f	\N	Sunitha Rani	9876547890	2025-09-01 18:16:36.433	2025-09-01 18:16:36.433	24947111923924	MIJ0ID-9490012345	success	\N	0	2025-09-01 18:16:37.886	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
37	client-1757343020924-609gdrmzj	Ravi Kiran	9390256423	\N	DIVINE ALLURA GATED COMMUNITY, Flat no-306, Block C, RD NUMBER 7, FRIENDS COLONY, CHANDANAGAR	Hyderabad	Telangana	India	500050	delhivery	MTM	5000	100	1	42492210004432	TGWMQ6-9390256423	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 11:53:34.306	2025-09-05 11:53:34.306	42492210004432	TGWMQ6-9390256423	success	\N	0	2025-09-05 11:53:35.506	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
38	client-1757343020924-609gdrmzj	Sakthi Kumaran	9790533309	9440826122	2/5 Narayanan Street Sixth lane Pudupet	Chennai	Tamil Nadu	India	600002	delhivery	MTM	5000	100	1	42492210004443	EO02R5-9790533309	f	\N	Honey creations	9440826122	2025-09-05 11:53:58.014	2025-09-05 11:53:58.014	42492210004443	EO02R5-9790533309	success	\N	0	2025-09-05 11:53:59.383	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
39	client-1757343020924-609gdrmzj	Ch Suresh	9491022605	6304478522	Check post center. Eluru district.	Kamavavarapukota	Andhra Pradesh	India	534449	delhivery	MTM	5000	100	1	42492210004454	Z0WQZZ-9491022605	f	\N	Chinni Srilakshmi	6304478522	2025-09-05 11:54:20.561	2025-09-05 11:54:20.561	42492210004454	Z0WQZZ-9491022605	success	\N	0	2025-09-05 11:54:21.836	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
40	client-1757343020924-609gdrmzj	Priya	7075315439	\N	Plot:53 Ismailkhanguda Beside Shantiniketan school Rampally Keesara mandal Medchal Malkajgiri	Hyderabad	Telangana	India	501301	delhivery	MTM	5000	100	1	42492210004476	DPVQ94-7075315439	f	\N	Madalasa collections	8885253555	2025-09-05 11:55:07.778	2025-09-05 11:55:07.778	42492210004476	DPVQ94-7075315439	success	\N	0	2025-09-05 11:55:09.181	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
41	client-1757343020924-609gdrmzj	Vijay Shanthi	9705328307	\N	MAXIVISION eye hospital Kothapet near Victoria memorial metro station beside zudio shopping mall Dilsukhnagar	Hyderabad	Telangana	India	500035	delhivery	MTM	5000	100	1	42492210004480	R9AZIV-9705328307	f	\N	Madalasa collections	8885253555	2025-09-05 11:55:30.968	2025-09-05 11:55:30.968	42492210004480	R9AZIV-9705328307	success	\N	0	2025-09-05 11:55:32.328	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
42	client-1757343020924-609gdrmzj	Chitra	9597332113	\N	20/9, vallalar nagar 1st Opposite GH Manjakuppam	Cuddalore	Tamil Nadu	India	607001	delhivery	MTM	5000	100	1	42492210004491	KB7QVV-9597332113	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 11:57:47.305	2025-09-05 11:57:47.305	42492210004491	KB7QVV-9597332113	success	\N	0	2025-09-05 11:57:48.755	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
43	client-1757343020924-609gdrmzj	Y. Nagalaxmi	9908932298	\N	D.no 8/127, Gandhinagar, Satya Sai district	Dharmavaram	Andhra Pradesh	India	515671	delhivery	MTM	5000	100	1	42492210004502	OA0Z8Y-9908932298	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 12:13:19.473	2025-09-05 12:13:19.473	42492210004502	OA0Z8Y-9908932298	success	\N	0	2025-09-05 12:13:20.876	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
44	client-1757343020924-609gdrmzj	Naresh Sama	9885220291	9491618970	11-23-2317/1 Dessipet road krishanaveni school opposite Srinivasacolony	Warangal	Telangana	India	506002	delhivery	MTM	5000	100	1	42492210004513	CQQLU1-9885220291	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 12:24:27.468	2025-09-05 12:24:27.468	42492210004513	CQQLU1-9885220291	success	\N	0	2025-09-05 12:24:28.94	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
45	client-1757343020924-609gdrmzj	J Deepa Reddy	6362533509	\N	no=80/1,sreenivasa building,near galaxy paradise cinema theatre,12th main road, hongasandra,begur main road, Banashankari tent	Bengaluru	Karnataka	India	560068	delhivery	MTM	5000	100	1	42492210004524	60NDXZ-6362533509	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 12:24:49.357	2025-09-05 12:24:49.357	42492210004524	60NDXZ-6362533509	success	\N	0	2025-09-05 12:24:50.842	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
46	client-1757343020924-609gdrmzj	Veena	8317450019	\N	House no 28 gadikoppa Durga layout, Gnana ganga school be hind gadikoppa	Shimoga	KA	India	577205	delhivery	MTM	5000	100	1	42492210004535	WZ679E-8317450019	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-05 12:26:01.129	2025-09-05 12:26:01.129	42492210004535	WZ679E-8317450019	success	\N	0	2025-09-05 12:26:02.637	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
47	client-1757343020924-609gdrmzj	Jyothi B	9652624147	\N	SMR Vinay Fountainhead Road Hafeezpet Flat No 303, Block 2, SMR Vinay Fountainhead, Miyapur	Mathrusri Nagar	TG	India	500049	delhivery	MTM	5000	100	1	42492210004546	2SVRQU-9652624147	f	\N	Raveendra Gold Covering	9652624147	2025-09-05 12:26:28.907	2025-09-05 12:26:28.907	42492210004546	2SVRQU-9652624147	success	\N	0	2025-09-05 12:26:30.402	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
48	client-1757343020924-609gdrmzj	T. Sushma	9573848295	\N	Flat no -302 Sri kumari mythrivanam Sri sairam nagar Rajeevnagar Duvvada	Visakhapatnam	Andhra Pradesh	India	530049	delhivery	MTM	5000	100	1	42492210004550	ENAJB3-9573848295	f	\N	N Anusha	8121525604	2025-09-05 12:56:47.972	2025-09-05 12:56:47.972	42492210004550	ENAJB3-9573848295	success	\N	0	2025-09-05 12:56:49.391	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
49	client-1757343020924-609gdrmzj	D. Nagamani	8125686163	6281196870	16-321 Near Narayana School Kummaripalem	Piduguralla	Andhra Pradesh	India	522413	delhivery	MTM	5000	100	1	42492210004561	E76OKX-8125686163	f	\N	Nandu World	6281196870	2025-09-06 11:28:21.099	2025-09-06 11:28:21.099	42492210004561	E76OKX-8125686163	success	\N	0	2025-09-06 11:28:24.074	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
50	client-1757343020924-609gdrmzj	Kodavatikanti Suneeta	9381062099	\N	Near Sai Baba water plant Siva nagar	Badvel	Andhra Pradesh	India	516227	delhivery	MTM	5000	100	1	42492210004572	6YZQNF-9381062099	f	\N	Ranisri Collection's	7013970153	2025-09-06 11:51:32.86	2025-09-06 11:51:32.86	42492210004572	6YZQNF-9381062099	success	\N	0	2025-09-06 11:51:35.407	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
51	client-1757343020924-609gdrmzj	K. Vijaya	9398327586	6303968121	H-no:4-8-260/3 Purushotham Reddy Street Mythri layout YSR memorial park	Pullivendula	Andhra Pradesh	India	516390	delhivery	MTM	5000	100	1	42492210004583	SCZB1L-9398327586	f	\N	K.vijaya collections	6303968121	2025-09-06 11:54:08.417	2025-09-06 11:54:08.417	42492210004583	SCZB1L-9398327586	success	\N	0	2025-09-06 11:54:11.401	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
52	client-1757343020924-609gdrmzj	Varalaxmi Thallapelli	9581232525	7995523763	603, Gangeya Infrastructure Pvt Ltd., Jayabharathi kalpana Building, Miyapur, Landmark - Beside Miyapur Ratnadep super market	Hyderabad	Telangana	India	500049	delhivery	MTM	5000	100	1	42492210004594	2CY67Q-9581232525	f	\N	Tara Collections	7995523763	2025-09-06 11:54:39.681	2025-09-06 11:54:39.681	42492210004594	2CY67Q-9581232525	success	\N	0	2025-09-06 11:54:42.403	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
53	client-1757343020924-609gdrmzj	Ramakrishna	9949239477	8606925636	#310, La green(Shiva Sai Infraa), Landmark: Opp. Gowtham Model school, GoldenTemple streetEND. Sri ramnagar, Puppalguda, Manikonda	Hyderabad	Telangana	India	500089	delhivery	MTM	5000	100	1	42492210004605	NZN36O-9949239477	f	\N	Her Treasures Jewels	8606925636	2025-09-06 11:56:27.988	2025-09-06 11:56:27.988	42492210004605	NZN36O-9949239477	success	\N	0	2025-09-06 11:56:30.954	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
54	client-1757343020924-609gdrmzj	Swapna Rani	9581345535	8606925636	H.No. 14-20-677/n/b, parvath nagar, AXIS Bank ATM	Hyderabad	Telangana	India	500018	delhivery	MTM	5000	100	1	42492210004616	6ZYC6H-9581345535	f	\N	Sri alankara fashions	7729893541	2025-09-06 11:57:21.601	2025-09-06 11:57:21.601	42492210004616	6ZYC6H-9581345535	success	\N	0	2025-09-06 11:57:24.6	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
55	client-1757343020924-609gdrmzj	A Uma Devi	9248602530	\N	2/8/191, Rama Nilayam, Sitara Center, Labour Colony, VD Puram	Vijayawada	Andhra Pradesh	India	520012	delhivery	MTM	5000	100	1	42492210004620	YCYKI5-9248602530	f	\N	I Komali	7386999106	2025-09-06 11:57:54.615	2025-09-06 11:57:54.615	42492210004620	YCYKI5-9248602530	success	\N	0	2025-09-06 11:57:57.613	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
56	client-1757343020924-609gdrmzj	Ramadevi K Sunandhu	9731715071	\N	Sunshine layout Near Reliance fresh 1st Croaa tc Paly Krpuram	Banglore	Karnataka	India	560036	delhivery	MTM	5000	100	1	42492210004631	GAUIVX-9731715071	f	\N	Ambica collections	7075948914	2025-09-06 11:58:38.145	2025-09-06 11:58:38.145	42492210004631	GAUIVX-9731715071	success	\N	0	2025-09-06 11:58:39.605	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
57	client-1757343020924-609gdrmzj	Anil Shankar Rao Sutrave	7057458944	8669431728	Vidya Nagar Balapur road Dharmabad	Nanded	Maharashtra	India	431809	delhivery	MTM	5000	100	1	42492210004642	PZ3W0G-7057458944	f	\N	Praju	8669431728	2025-09-06 11:59:17.118	2025-09-06 11:59:17.118	42492210004642	PZ3W0G-7057458944	success	\N	0	2025-09-06 11:59:20.283	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
58	client-1757343020924-609gdrmzj	K.Geetha	8978739003	9885608429	12-B Subash nagar Near shishumandir school Nagar kurnool dist	Kalwakurthy	Telangana	India	509324	delhivery	MTM	5000	100	1	42492210004653	P0XPJC-8978739003	f	\N	Msp jewellery	9652894901	2025-09-06 11:59:54.873	2025-09-06 11:59:54.873	42492210004653	P0XPJC-8978739003	success	\N	0	2025-09-06 11:59:57.919	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
59	client-1757343020924-609gdrmzj	Beulah	9701720800	8606925636	Jodichinthala village Near church Yadamari mandal Chittoor Dt	Yadamari	Chittoor	India	517422	delhivery	MTM	5000	100	1	42492210004664	ZDAO5G-9701720800	f	\N	Her Treasures Jewels	8606925636	2025-09-06 12:00:20.553	2025-09-06 12:00:20.553	42492210004664	ZDAO5G-9701720800	success	\N	0	2025-09-06 12:00:23.294	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
60	client-1757343020924-609gdrmzj	S Bhuvaneswari	9841291694	\N	FLAT NO 1117, 11th floor,B block, GOKUL's BHUVANAM Sy No.254, Nizampet Rd, opp. Karur Vysya Bank, Nizampet	Hyderabad	Telangana	India	500090	delhivery	MTM	5000	100	1	42492210004675	DRSU7Q-9841291694	f	\N	sk brand imitation jewellery	9490711415	2025-09-06 12:00:50.261	2025-09-06 12:00:50.261	42492210004675	DRSU7Q-9841291694	success	\N	0	2025-09-06 12:00:53.107	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
61	client-1757343020924-609gdrmzj	Prathyusha	6304173211	\N	Fortune green homes swan B-203 Knr colony Beside vignan school Nizampet	Hyderabad	Telangana	India	500090	delhivery	MTM	5000	100	1	42492210104683	2OE4Q0-6304173211	f	\N	Friends collection by sru	9666225737	2025-09-06 12:01:42.92	2025-09-06 12:01:42.92	42492210104683	2OE4Q0-6304173211	success	\N	0	2025-09-06 12:01:45.932	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
62	client-1757343020924-609gdrmzj	M Radha	9160700468	9019676607	H no 118 2nd floor Gowtami Appartment Nandi Green Homes Kranthi Nagar	Nandyal	AP	India	518502	delhivery	MTM	5000	100	1	42492210104694	7F0G1J-9160700468	f	\N	C Vamsi Krishna	9019676607	2025-09-06 12:02:43.392	2025-09-06 12:02:43.392	42492210104694	7F0G1J-9160700468	success	\N	0	2025-09-06 12:02:46.459	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
63	client-1757343020924-609gdrmzj	G. Bhagyasri	7382442869	9704513576	D. no:10-146 Flat no:316 Anjeneya residensi apartment Khajipet bus stop Guntupalli	Vijayawada	Andhra Pradesh	India	521241	delhivery	MTM	5000	100	1	42492210104705	NMQFEX-7382442869	f	\N	G. Rani	9704513576	2025-09-06 12:04:29.684	2025-09-06 12:04:29.684	42492210104705	NMQFEX-7382442869	success	\N	0	2025-09-06 12:04:32.672	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
64	client-1757343020924-609gdrmzj	Ashwini	9182658166	\N	12/192, Sai General Store, Valisab road Opposite Star 1 Saree Center , Sathya Sai District	Kadiri	Andhrapradesh	India	515591	delhivery	MTM	5000	100	1	42492210104716	CTT0LF-9182658166	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-06 12:53:23.107	2025-09-06 12:53:23.107	42492210104716	CTT0LF-9182658166	success	\N	0	2025-09-06 12:53:25.943	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
65	client-1757343020924-609gdrmzj	Anusha Kasina	8328103261	\N	D.No.23-33-19, T-2, Rama krishna enclave, gudlurivari street, Satyanarayana puram	Vijayawada	Andhra Pradesh	India	520011	delhivery	MTM	5000	100	1	42492210104720	ASSB8U-8328103261	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-06 13:04:16.851	2025-09-06 13:04:16.851	42492210104720	ASSB8U-8328103261	success	\N	0	2025-09-06 13:04:19.899	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
66	client-1757343020924-609gdrmzj	Sandhya K	6302397436	6309350681	sandhya k, 4-32-225,plot num : 35, Beside santhosh dabha Andhra Bank lane,lal bahadur nagat,shapur nagar	Hyderabad	Telangana	India	500055	delhivery	MTM	5000	100	1	42492210104731	ND1R1Z-6302397436	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-06 13:19:24.118	2025-09-06 13:19:24.118	42492210104731	ND1R1Z-6302397436	success	\N	0	2025-09-06 13:19:27.077	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
67	client-1757343020924-609gdrmzj	Praveena Reddy	9000075709	\N	125/d Vengalrao Nagar, Madhura Nagar, Rajya Lakshmi Nilayam	Hyderabad	Telangana	India	500038	delhivery	MTM	5000	100	1	42492210104742	NBR1Y0-9000075709	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-06 13:21:52.15	2025-09-06 13:21:52.15	42492210104742	NBR1Y0-9000075709	success	\N	0	2025-09-06 13:21:55.243	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
68	client-1757343020924-609gdrmzj	Vidya Pv	9446182202	\N	Postmaster Kodinhi postoffice Malappuram district	Kodinhi	Kerala	India	676309	delhivery	MTM	5000	100	1	42492210104845	78QUJF-9446182202	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-06 13:22:45.659	2025-09-06 13:22:45.659	42492210104845	78QUJF-9446182202	success	\N	0	2025-09-06 13:22:48.745	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
69	client-1757343020924-609gdrmzj	Teegala Swathi	7075083398	\N	1-35 near shivalayam temple krishna nagar colony road no 2 Sarror nagar colony road no 2	K V Rangareddy	TG	India	500035	delhivery	MTM	5000	100	1	42492210104856	V06R4W-7075083398	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-06 13:28:28.547	2025-09-06 13:28:28.547	42492210104856	V06R4W-7075083398	success	\N	0	2025-09-06 13:28:31.622	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
70	client-1757343020924-609gdrmzj	Soujanya Gollapapani	8309045704	\N	BSR deluxe womens hostel Gowthami nagar,chandanagar	Hyderabad	TG	India	500050	delhivery	MTM	5000	100	1	42492210104860	QOPJ60-8309045704	f	\N	Raveendra Gold Covering	8309045704	2025-09-06 13:31:22.084	2025-09-06 13:31:22.084	42492210104860	QOPJ60-8309045704	success	\N	0	2025-09-06 13:31:25.071	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
71	client-1757343020924-609gdrmzj	Archana	9036089994	\N	Flat no 204.niranjan jenisis apartment, mylasandra road,begur.	Bengaluru	Karnataka	India	560068	delhivery	MTM	5000	100	1	42492210104871	HU2OFL-9036089994	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-08 05:52:39.072	2025-09-08 05:52:39.072	42492210104871	HU2OFL-9036089994	success	\N	0	2025-09-08 05:52:42.02	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
72	client-1757343020924-609gdrmzj	Shajeela Husain	9946313820	\N	mp house, Pazhavila, Pangodu PO	Thiruvanandapuram	Kerala	India	695609	delhivery	MTM	5000	100	1	42492210104882	A3N4FE-9946313820	f	\N	Her Treasures Jewels	8606925636	2025-09-08 05:55:29.921	2025-09-08 05:55:29.921	42492210104882	A3N4FE-9946313820	success	\N	0	2025-09-08 05:55:32.944	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
73	client-1757343020924-609gdrmzj	Karthik	9291909909	9515300388	Shop no 368, mahatma gandhi complex, Gollapudi, Near sai baba temple	Vijayawada	Andhra Pradesh	India	521225	delhivery	MTM	5000	100	1	42492210104893	VO0AQK-9291909909	f	\N	Yh collections	9515300388	2025-09-08 05:57:55.152	2025-09-08 05:57:55.152	42492210104893	VO0AQK-9291909909	success	\N	0	2025-09-08 05:57:58.202	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
74	client-1757343020924-609gdrmzj	Sampathkumar Advocate	9445643834	\N	50/32 sankaramadam street	Villupuram	Tamil Nadu	India	605602	delhivery	MTM	5000	100	1	42492210104904	XDGZA4-9445643834	f	\N	Her Treasures Jewels	8606925636	2025-09-08 06:23:28.049	2025-09-08 06:23:28.049	42492210104904	XDGZA4-9445643834	success	\N	0	2025-09-08 06:23:30.985	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
75	client-1757343020924-609gdrmzj	Sudha Gopi	9942212094	8919179615	91 Upstairs, Periyar nagar Near Ration shop	Kulithalai	Tamilnadu	India	639104	delhivery	MTM	5000	100	1	42492210104915	QFHIOB-9942212094	f	\N	Madhura sadan	8919179615	2025-09-08 06:24:50.049	2025-09-08 06:24:50.049	42492210104915	QFHIOB-9942212094	success	\N	0	2025-09-08 06:24:52.987	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
76	client-1757343020924-609gdrmzj	Sujatha	9380303854	\N	C3F3 VGN IMPERIA PHASE3, Vgn Mahalakshmi Nagar, PERUMALAGARAM, Thiruverkaadu	Chennai	Tamil Nadu	India	600077	delhivery	MTM	5000	100	1	42492210104926	AACXHQ-9380303854	f	\N	Her Treasures Jewels	8606925636	2025-09-08 06:27:48.861	2025-09-08 06:27:48.861	42492210104926	AACXHQ-9380303854	success	\N	0	2025-09-08 06:27:51.895	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
77	client-1757343020924-609gdrmzj	K Sri Harsha	7013299327	9494202398	1401, tower 2 block A, 14th floor, radiance suprema, gnt road, madhavaram	Chennai	Tamil Nadu	India	600060	delhivery	MTM	5000	100	1	42492210104930	Z2BZWF-7013299327	f	\N	From elegant fashions	7013299327	2025-09-08 06:28:29.169	2025-09-08 06:28:29.169	42492210104930	Z2BZWF-7013299327	success	\N	0	2025-09-08 06:28:32.192	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
78	client-1757343020924-609gdrmzj	B. Sowjanya (Haritha)	8074715127	\N	H.no 6-1-295/4 3 rd floo Flat no 302 Padmarao Nagar Secunderabad	Hyderabad	Telangana	India	500025	delhivery	MTM	5000	100	1	42492210104941	WNX48Z-8074715127	f	\N	Sujatha Mallikarjun	7337298642	2025-09-08 06:29:20.418	2025-09-08 06:29:20.418	42492210104941	WNX48Z-8074715127	success	\N	0	2025-09-08 06:29:23.436	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
79	client-1757343020924-609gdrmzj	Priya Sunil	9440737889	8247623236	P13/3 JSW Township Vidyanagar	Bellari	Karnataka	India	583275	delhivery	MTM	5000	100	1	42492210104952	0PZPUP-9440737889	f	\N	Her Treasures Jewels	8606925636	2025-09-08 06:29:58.47	2025-09-08 06:29:58.47	42492210104952	0PZPUP-9440737889	success	\N	0	2025-09-08 06:30:01.456	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
80	client-1757343020924-609gdrmzj	Sajina Mohamed	8086542553	9072737274	Panayampilly House Ashtamichira P. O., Near Kannan kaattil temple Thrissur District	Marekkad	Kerala	India	680731	delhivery	MTM	5000	100	1	42492210104963	TGMOFN-8086542553	f	\N	Her treasure jewel store	8606925636	2025-09-08 06:30:43.133	2025-09-08 06:30:43.133	42492210104963	TGMOFN-8086542553	success	\N	0	2025-09-08 06:30:46.317	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
81	client-1757343020924-609gdrmzj	Venugopal Jangam	8978809066	\N	B-505, Aloha Apartment HMT Estate. Jalahalli	Bangalore	KARNATAKA	India	560013	delhivery	MTM	5000	100	1	42492210104974	5ND5N2-8978809066	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-08 06:32:47.643	2025-09-08 06:32:47.643	42492210104974	5ND5N2-8978809066	success	\N	0	2025-09-08 06:32:50.657	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
82	client-1757343020924-609gdrmzj	Dr. Geetha K	9481293514	8121504447	Department of development studies kannada University Hampi vidyaranya post	Hospet	Karnataka	India	583276	delhivery	MTM	5000	100	1	42492210104996	OV1HND-9481293514	f	\N	Siri Collection	8121504447	2025-09-08 06:39:06.464	2025-09-08 06:39:06.464	42492210104996	OV1HND-9481293514	success	\N	0	2025-09-08 06:39:09.466	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
83	client-1757343020924-609gdrmzj	Ramya Ramya	8341801671	\N	11-3-50/1 Warasiguda Secunderabad Mohamadguda Near saraswati saree center	Hyderabad	Telangana	India	500061	delhivery	MTM	5000	100	1	42492210105000	AVQNKS-8341801671	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-08 06:41:13.836	2025-09-08 06:41:13.836	42492210105000	AVQNKS-8341801671	success	\N	0	2025-09-08 06:41:16.882	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
84	client-1757343020924-609gdrmzj	Jessy Parthiban	8124409192	\N	31, Ambedkar street, MGR nagar, Tharamani	Chennai	Tamil Nadu	India	600113	delhivery	MTM	5000	100	1	42492210105011	3MIEM4-8124409192	f	\N	Raveendra Gold Covering	8124409192	2025-09-08 06:42:04.362	2025-09-08 06:42:04.362	42492210105011	3MIEM4-8124409192	success	\N	0	2025-09-08 06:42:07.308	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
85	client-1757343020924-609gdrmzj	Minusri	9398096536	\N	5-12-46/A/1 Hanuman nagar, apurva enclave, pharmacy hostels backside, dabbalu, hanumakonda, warangal	Warangal	Telangana	India	506009	delhivery	MTM	5000	100	1	42492210105022	OIL22Z-9398096536	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-08 06:43:11.044	2025-09-08 06:43:11.044	42492210105022	OIL22Z-9398096536	success	\N	0	2025-09-08 06:43:14.145	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
86	client-1757343020924-609gdrmzj	Meenakshi	9080567433	\N	30/4, flat no 15, A block, 3rd floor, Swathi flats, Subba reddy street, West Mambalam	Chennai	Tamil Nadu	India	600033	delhivery	MTM	5000	100	1	42492210105033	EGFFBN-9080567433	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-08 09:09:24.833	2025-09-08 09:09:24.833	42492210105033	EGFFBN-9080567433	success	\N	0	2025-09-08 09:09:27.934	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
87	client-1757343020924-609gdrmzj	Sowjanya Sowjanya	8639783054	\N	70-8-6, Venkata Dasaradhi Nilayam, G-1, Employee Street, Opp Govindarajulu School, Nem School Road, Patamata	Vijayawada	Andhra Pradesh	India	520010	delhivery	MTM	5000	100	1	42492210105044	PFZM11-8639783054	f	\N	Raveendra Gold Covering	8639783054	2025-09-08 09:13:58.878	2025-09-08 09:13:58.878	42492210105044	PFZM11-8639783054	success	\N	0	2025-09-08 09:14:01.921	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
88	client-1757343020924-609gdrmzj	Lavanya	9492166888	8142437019	2 sets Lavanya 53b KL Puram contonment Near Ganesh temple , beside Vinayaka dental care	Vizianagaram	Andhra Pradesh	India	535001	delhivery	MTM	5000	100	1	42492210105055	FCQBCX-9492166888	f	\N	Trending collectionsRD	8142437019	2025-09-08 09:36:04.602	2025-09-08 09:36:04.602	42492210105055	FCQBCX-9492166888	success	\N	0	2025-09-08 09:36:07.657	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
89	client-1757343020924-609gdrmzj	Anushapraveen	9490815999	\N	Santhoshi H.no 10-52/4 Prabhu Nilayam Jeevenreddy Line Venkateshwara Colony	Armoor	Telangana	India	503224	dtdc	MTM	5000	100	1	9908092439	DZU487-9490815999	f	\N	 RAVEENDRA GOLD COVERING WORKS	9985448993	2025-09-08 11:03:33.439	2025-09-08 11:03:33.439	\N	\N	\N	\N	0	\N	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
90	client-1757343020924-609gdrmzj	Sreena Shibu	9995097418	\N	Kariyil House Ammanappara C Poyil (PO)	Pariyaram	Kerala	India	670502	delhivery	MTM	5000	100	1	42492210105066	LIWSPK-9995097418	f	\N	Her Treasures Jewels	8606925636	2025-09-08 13:52:21.478	2025-09-08 13:52:21.478	42492210105066	LIWSPK-9995097418	success	\N	0	2025-09-08 13:52:24.646	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
91	master-client-1756272680179	Test User	9876543210	\N	Test Address	Test City	Test State	India	123456	test	test	1000	100	1	\N	TRCUEE-9876543210	f	\N	\N	\N	2025-09-08 22:31:20.934	2025-09-08 22:31:20.934	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
92	master-client-1756272680179	Schema Test User	9876543211	\N	Schema Test Address	Schema Test City	Schema Test State	India	123457	test	test	2000	200	2	\N	P5PI4L-9876543211	f	\N	\N	\N	2025-09-08 22:32:18.268	2025-09-08 22:32:18.268	\N	\N	\N	\N	0	\N	\N	\N	\N	Schema test product	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
14	client-1757058396579-m510j2d3m	Sailaja Dintakurthi	+919676230276	+919676230276	7/364 Ramanaidupet	Machilipatnam	Andhra Pradesh	India	521001	delhivery	SUJATHA FRANCHISE	1000	100	1	11837210732841	SHOP-1029-9676230276	f	\N	\N	\N	2025-09-08 03:48:55.088	2025-09-08 04:31:31.616	11837210732841	\N	success	\N	0	2025-09-08 04:26:54.161	\N	\N	\N	Test Product for Scan2Ship	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N		6397400809838	\N	11592525316462	1029		\N	success	2025-09-08 04:31:31.616	https://www.delhivery.com/track-v2/package/11837210732841
15	client-1757058396579-m510j2d3m	Sailaja Dintakurthi	+919676230276	+919676230276	7/364 Ramanaidupet	Machilipatnam	Andhra Pradesh	India	521001	delhivery	SUJATHA FRANCHISE	1000	100	1	11837210732830	SHOP-1030-9676230276	f	\N	\N	\N	2025-09-08 04:01:40.322	2025-09-08 04:31:37.693	11837210732830	\N	success	\N	0	2025-09-08 04:22:40.697	\N	\N	\N	Test Product for Scan2Ship	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N		6397398745454	\N	11592531935598	1030		Cannot read properties of undefined (reading 'shopifyAdminApiToken')	success	2025-09-08 04:31:37.693	https://www.delhivery.com/track-v2/package/11837210732830
16	client-1757058396579-m510j2d3m	Sailaja Dintakurthi	+919676230276	+919676230276	7/364 Ramanaidupet	Machilipatnam	Andhra Pradesh	India	521001	delhivery	SUJATHA FRANCHISE	1000	100	1	11837210732852	SHOP-1031-9676230276	f	\N	\N	\N	2025-09-08 04:27:42.229	2025-09-08 04:31:25.538	11837210732852	\N	success	\N	0	2025-09-08 04:27:53.866	\N	\N	\N	Test Product for Scan2Ship	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N		6397401137518	\N	11592558772590	1031		\N	success	2025-09-08 04:31:25.538	https://www.delhivery.com/track-v2/package/11837210732852
17	client-1757058396579-m510j2d3m	Sailaja Dintakurthi	+919676230276	+919676230276	7/364 Ramanaidupet	Machilipatnam	Andhra Pradesh	India	521001	delhivery	SUJATHA FRANCHISE	1000	100	1	11837210732863	SHOP-1032-9676230276	f	\N	\N	\N	2025-09-08 04:32:00.621	2025-09-08 04:32:11.542	11837210732863	\N	success	\N	0	2025-09-08 04:32:11.192	\N	\N	\N	Test Product for Scan2Ship	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N		6397402186094	\N	11592560312686	1032		\N	success	2025-09-08 04:32:11.542	https://www.delhivery.com/track-v2/package/11837210732863
1391	default-client-001	Gopichand	7287857404		3rd floor 202, Bharath’s Leela Lotus apartment, Srihari Nagar,3rd line,beside marQ carwash,	Nellore	Andhra Pradesh	India	524003	india_post	SUJATHA FRANCHISE	5000	100	1	\N	NBELN7-7287857404	f	\N	Default Company	+91-9876543210	2025-09-04 15:33:04.977	2025-09-04 15:33:04.977	\N	\N	\N	\N	0	\N	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
1392	default-client-001	Karthik Naidu	07013157023		Kondapur	Hyderabad	TELANGANA	India	500084	dtdc	SUJATHA FRANCHISE	5000	100	1	124214241321	BJDB6P-7013157023	f	\N	Default Company	+91-9876543210	2025-09-04 15:33:44.733	2025-09-04 15:33:44.733	\N	\N	\N	\N	0	\N	\N	\N	\N	ARTIFICAL JEWELLERY	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: pickup_location_order_configs; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.pickup_location_order_configs (id, "pickupLocationId", "clientId", "defaultProductDescription", "defaultPackageValue", "defaultWeight", "defaultTotalItems", "codEnabledByDefault", "defaultCodAmount", "minPackageValue", "maxPackageValue", "minWeight", "maxWeight", "minTotalItems", "maxTotalItems", "requireProductDescription", "requirePackageValue", "requireWeight", "requireTotalItems", "enableResellerFallback", "enableThermalPrint", "enableReferencePrefix", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: pickup_location_shopify_configs; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.pickup_location_shopify_configs (id, "pickupLocationId", "clientId", "shopifyPickupLocation", "shopifyWebhookSecret", "shopifyApiKey", "shopifyApiSecret", "shopifyShopDomain", "shopifyAdminApiToken", "shopifyWebhookVersion", "isActive", "createdAt", "updatedAt", "shopifyDefaultClientId") FROM stdin;
shopify-config-1757303009522-4wfdpv4t3	pickup-1757059344450-151ls55p5	client-1757058396579-m510j2d3m	SuRCLe Technology Pvt. Ltd.	b736fded0bb15d6c2ea3a3f2dffe0666e44f5450b32c8d505a5ca11f6742d22b	eef69909611c29c02d97778b32878ffe	0049f2d5a064336c268aa0bc4564fbb9	vanitha-fashion-jewelry.myshopify.com	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	2025-07	t	2025-09-08 03:43:29.522	2025-09-08 04:22:05.48	client-1757058396579-m510j2d3m
\.


--
-- Data for Name: pickup_locations; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.pickup_locations (id, value, label, "delhiveryApiKey", "clientId") FROM stdin;
pickup-1756732440516-rfieoc4o7	SUJATHA FRANCHISE	Test Location	52f81411e7185b24602a6b2b4b52ac491ed00a24	default-client-001
pickup-1757059344450-151ls55p5	SUJATHA FRANCHISE	SuRCLe Technology Pvt. Ltd.	52f81411e7185b24602a6b2b4b52ac491ed00a24	client-1757058396579-m510j2d3m
pickup-1757302935871-umzzfakk8	Test Location	Test Location	\N	client-1757058396579-m510j2d3m
pickup-1757337470242-hdx3gdocd	Route Master Courier and cargo	Route Master Courier and cargo	daca0cee83b0612f95431391280aca8da0e24597	client-1757058396579-m510j2d3m
pickup-1757343020958-306wnm3r8	main-warehouse	Main Warehouse	\N	client-1757343020924-609gdrmzj
pickup-1757343020958-w49jee0zt	branch-office	Branch Office	\N	client-1757343020924-609gdrmzj
\.


--
-- Data for Name: pickup_requests; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.pickup_requests (id, "clientId", "userId", pickup_date, pickup_time, pickup_address, contact_person, contact_phone, special_instructions, pickup_location, delhivery_request_id, status, created_at, updated_at, expected_package_count) FROM stdin;
\.


--
-- Data for Name: rate_limits; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.rate_limits (id, key, count, "windowStart", "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.sessions (id, "userId", "clientId", "expiresAt", "createdAt", "ipAddress", "isActive", "lastActivity", location, permissions, "refreshToken", "revokedAt", role, "sessionToken", "userAgent") FROM stdin;
01affe6f-2aed-4753-951c-c7d37f374332	master-admin-1756272680518	master-client-1756272680179	2025-09-09 06:30:55.668	2025-09-08 22:30:55.668	::1	t	2025-09-08 22:30:55.669	\N	["read","write"]	2b547586-6804-42c7-9207-d22211b2660d	\N	master_admin	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTczNzA2NTUsImV4cCI6MTc1NzM5OTQ1NSwiYXVkIjoidmFuaXRoYS1sb2dpc3RpY3MtdXNlcnMiLCJpc3MiOiJ2YW5pdGhhLWxvZ2lzdGljcyJ9.GBsc2eSJbXuo-XffSCnfMaolxGIlgYHt4MKADxmJsns	curl/8.7.1
0bd50b42-a0ab-4e2f-b003-ad54e4955254	master-admin-1756272680518	master-client-1756272680179	2025-08-28 05:31:58.707	2025-08-27 05:31:58.708	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYyNzI3MTgsImV4cCI6MTc1NjM1OTExOH0.aGgm1xsq-Q6c4_bLJMK5OlNEmTXKEIZ5X86bR7zckUs_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYyNzI3MTgsImV4cCI6MTc1NjM1OTExOH0.aGgm1xsq-Q6c4_bLJMK5OlNEmTXKEIZ5X86bR7zckUs	unknown
a1ca46c4-aefc-49f0-b9f5-7a20694e3799	user-1757076662974-d4p4qsjgk	client-1757058396579-m510j2d3m	2025-09-06 12:51:18.686	2025-09-05 12:51:18.687	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzY2NjI5NzQtZDRwNHFzamdrIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6ImthcnRoaWtAcm91dGVtYXN0ZXIuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU3MDc2Njc4LCJleHAiOjE3NTcxNjMwNzh9.RjbnNx_6C-dZVDgn2VoI4OCewS1hp9Lw6DfJF1-4ph4_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzY2NjI5NzQtZDRwNHFzamdrIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6ImthcnRoaWtAcm91dGVtYXN0ZXIuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU3MDc2Njc4LCJleHAiOjE3NTcxNjMwNzh9.RjbnNx_6C-dZVDgn2VoI4OCewS1hp9Lw6DfJF1-4ph4	unknown
dc8e5ef5-0694-4608-8594-e37cd3861321	user-1757078825722-uzqoqxu0l	client-1757058396579-m510j2d3m	2025-09-09 17:32:00.061	2025-09-08 17:32:00.062	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInNlc3Npb25JZCI6ImY4ZThjNTg0LTA1NjctNDVmMC05MTcwLWE5YjA2ZjgyMDc4NyIsImlhdCI6MTc1NzM1MjcyMCwiZXhwIjoxNzU3NDM5MTIwLCJhdWQiOiJzY2FuMnNoaXAtdXNlcnMiLCJpc3MiOiJzY2FuMnNoaXAtYjJiIn0.WgKJZ4hJoh2t03P1lJALbNMN4i2B6YsiklZuacLYLrk_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInNlc3Npb25JZCI6ImY4ZThjNTg0LTA1NjctNDVmMC05MTcwLWE5YjA2ZjgyMDc4NyIsImlhdCI6MTc1NzM1MjcyMCwiZXhwIjoxNzU3NDM5MTIwLCJhdWQiOiJzY2FuMnNoaXAtdXNlcnMiLCJpc3MiOiJzY2FuMnNoaXAtYjJiIn0.WgKJZ4hJoh2t03P1lJALbNMN4i2B6YsiklZuacLYLrk	unknown
2d0a1450-01a4-4d69-879c-5917869c64fb	master-admin-1756272680518	master-client-1756272680179	2025-08-28 12:28:03.226	2025-08-27 12:28:03.227	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYyOTc2ODMsImV4cCI6MTc1NjM4NDA4M30.kM3CzbSwbyp6_OTCY0NxYC92EZt86hF5B9Y2Rt5U2Xo_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYyOTc2ODMsImV4cCI6MTc1NjM4NDA4M30.kM3CzbSwbyp6_OTCY0NxYC92EZt86hF5B9Y2Rt5U2Xo	unknown
2b10a713-b3e6-4dbb-99f1-03753ab8886c	master-admin-1756272680518	master-client-1756272680179	2025-08-28 12:28:53.923	2025-08-27 12:28:53.924	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYyOTc3MzMsImV4cCI6MTc1NjM4NDEzM30.JzEqksICkPOEBCcn8Cof5v0_ufQIlxNvAfae6pyGmYE_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYyOTc3MzMsImV4cCI6MTc1NjM4NDEzM30.JzEqksICkPOEBCcn8Cof5v0_ufQIlxNvAfae6pyGmYE	unknown
bcec39e4-0ad3-437e-9b3f-8fa6dd11086d	master-admin-1756272680518	master-client-1756272680179	2025-08-28 12:34:46.535	2025-08-27 12:34:46.536	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYyOTgwODYsImV4cCI6MTc1NjM4NDQ4Nn0.1Diyw90Ur5hyelNTttkRz-p2lWRZjv0nwCCJwR62HiI_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYyOTgwODYsImV4cCI6MTc1NjM4NDQ4Nn0.1Diyw90Ur5hyelNTttkRz-p2lWRZjv0nwCCJwR62HiI	unknown
3b7fb5cc-60a4-4b16-8326-310bc8c70488	master-admin-1756272680518	master-client-1756272680179	2025-08-28 12:37:14.913	2025-08-27 12:37:14.914	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYyOTgyMzQsImV4cCI6MTc1NjM4NDYzNH0.xSdT5FT36JnSx8RsD2kUlfZSWl2t7qpJsJPsrFtMVJI_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYyOTgyMzQsImV4cCI6MTc1NjM4NDYzNH0.xSdT5FT36JnSx8RsD2kUlfZSWl2t7qpJsJPsrFtMVJI	unknown
e314e0b6-9086-41f2-b34a-4b354a513b71	master-admin-1756272680518	master-client-1756272680179	2025-08-28 13:43:30.623	2025-08-27 13:43:30.624	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMDIyMTAsImV4cCI6MTc1NjM4ODYxMH0.6sBTgCaX1mYNvdNwjgF4l-jrWM3PRAJl2H4NgWKhFiw_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMDIyMTAsImV4cCI6MTc1NjM4ODYxMH0.6sBTgCaX1mYNvdNwjgF4l-jrWM3PRAJl2H4NgWKhFiw	unknown
831b87d5-8ff2-46d4-ad34-046e5d6a10cf	master-admin-1756272680518	master-client-1756272680179	2025-08-28 13:51:17.945	2025-08-27 13:51:17.946	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMDI2NzcsImV4cCI6MTc1NjM4OTA3N30.GafGgeOSFEYP2v6Uh3X7Swu_lKPMh94lwRTinvYVFhM_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMDI2NzcsImV4cCI6MTc1NjM4OTA3N30.GafGgeOSFEYP2v6Uh3X7Swu_lKPMh94lwRTinvYVFhM	unknown
4bdc1d4a-f52b-47e6-8fec-0818e78c8f8d	master-admin-1756272680518	master-client-1756272680179	2025-08-28 16:24:33.602	2025-08-27 16:24:33.603	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMTE4NzMsImV4cCI6MTc1NjM5ODI3M30.B9hSd5IcUJ6tOnvPV1bIW0Vy-s8qc4rLvA6wsXc5Nmc_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMTE4NzMsImV4cCI6MTc1NjM5ODI3M30.B9hSd5IcUJ6tOnvPV1bIW0Vy-s8qc4rLvA6wsXc5Nmc	unknown
b4b5339b-1845-4efe-8dbe-139b3476c361	user-1757076662974-d4p4qsjgk	client-1757058396579-m510j2d3m	2025-09-06 13:00:34.364	2025-09-05 13:00:34.366	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzY2NjI5NzQtZDRwNHFzamdrIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6ImthcnRoaWtAcm91dGVtYXN0ZXIuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU3MDc3MjM0LCJleHAiOjE3NTcxNjM2MzR9.nKtdoLA6MgdgPDeOe9CKm14D3o6yKaGNc7hwbCJwc88_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzY2NjI5NzQtZDRwNHFzamdrIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6ImthcnRoaWtAcm91dGVtYXN0ZXIuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU3MDc3MjM0LCJleHAiOjE3NTcxNjM2MzR9.nKtdoLA6MgdgPDeOe9CKm14D3o6yKaGNc7hwbCJwc88	unknown
e8fa94a5-3f0a-4372-9f9f-0257d6bd8685	master-admin-1756272680518	master-client-1756272680179	2025-08-28 17:50:21.784	2025-08-27 17:50:21.785	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMTcwMjEsImV4cCI6MTc1NjQwMzQyMX0.gqzd73MvOHoL-ycFGjoZ62QAMYbk-ZaJi96LAuqqQe8_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMTcwMjEsImV4cCI6MTc1NjQwMzQyMX0.gqzd73MvOHoL-ycFGjoZ62QAMYbk-ZaJi96LAuqqQe8	unknown
e4813b83-44b6-42de-abda-5681c0e69b4c	master-admin-1756272680518	master-client-1756272680179	2025-08-28 18:25:14.974	2025-08-27 18:25:14.975	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMTkxMTQsImV4cCI6MTc1NjQwNTUxNH0.5Nf2EaX_NAPxp2GkxtPyq85ON1QU00YjljfSnmAodZ8_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMTkxMTQsImV4cCI6MTc1NjQwNTUxNH0.5Nf2EaX_NAPxp2GkxtPyq85ON1QU00YjljfSnmAodZ8	unknown
5c65dce9-0425-4810-8408-d9042f1c5b8b	master-admin-1756272680518	master-client-1756272680179	2025-08-28 19:51:52.786	2025-08-27 19:51:52.787	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMjQzMTIsImV4cCI6MTc1NjQxMDcxMn0.NYVru45nYlTTk-emdUzR0qKbFvDwVshatpnVH9piS44_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMjQzMTIsImV4cCI6MTc1NjQxMDcxMn0.NYVru45nYlTTk-emdUzR0qKbFvDwVshatpnVH9piS44	unknown
82dd39d7-3c5f-4d53-bcdd-5a5f4cc7b3d4	master-admin-1756272680518	master-client-1756272680179	2025-08-28 19:56:47.127	2025-08-27 19:56:47.128	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMjQ2MDcsImV4cCI6MTc1NjQxMTAwN30.gBjzBef_tG46vji3WdOq_9b6UMSxCagXiqutLa8nSRc_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMjQ2MDcsImV4cCI6MTc1NjQxMTAwN30.gBjzBef_tG46vji3WdOq_9b6UMSxCagXiqutLa8nSRc	unknown
28b57fbb-6680-48a3-bf71-f894f9cfadfd	master-admin-1756272680518	master-client-1756272680179	2025-08-28 19:58:34.958	2025-08-27 19:58:34.959	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMjQ3MTQsImV4cCI6MTc1NjQxMTExNH0.l96ex3yVUbpP0EyqTqzuskV0Ehj1M2_cDU95DBMsYak_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMjQ3MTQsImV4cCI6MTc1NjQxMTExNH0.l96ex3yVUbpP0EyqTqzuskV0Ehj1M2_cDU95DBMsYak	unknown
1abe30ac-0dec-4d30-a4b6-0becb85ac3d0	master-admin-1756272680518	master-client-1756272680179	2025-08-29 00:05:40.194	2025-08-28 00:05:40.195	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMzk1NDAsImV4cCI6MTc1NjQyNTk0MH0.lYJ-Zj012bgeErX4rGWL9B2RgwluOxft4btf4S5VgG8_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzMzk1NDAsImV4cCI6MTc1NjQyNTk0MH0.lYJ-Zj012bgeErX4rGWL9B2RgwluOxft4btf4S5VgG8	unknown
1b3da765-3c3d-4a34-9127-89919f50cb62	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-02 18:07:42.036	2025-09-01 18:07:42.037	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NzUwMDYyLCJleHAiOjE3NTY4MzY0NjJ9.GHous-h-wmaBWQZAeAFbVfkMkI-hqU9cSP8to640HV4_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NzUwMDYyLCJleHAiOjE3NTY4MzY0NjJ9.GHous-h-wmaBWQZAeAFbVfkMkI-hqU9cSP8to640HV4	unknown
a24ab94b-5d3d-40e8-856f-9d8eb66e422f	master-admin-1756272680518	master-client-1756272680179	2025-08-29 00:36:36.211	2025-08-28 00:36:36.212	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDEzOTYsImV4cCI6MTc1NjQyNzc5Nn0.iLKiAw4B8EYIdwXEwz-WFWSd6q4xViqPoJdTqPOEq9Q_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDEzOTYsImV4cCI6MTc1NjQyNzc5Nn0.iLKiAw4B8EYIdwXEwz-WFWSd6q4xViqPoJdTqPOEq9Q	unknown
3ba0b266-be12-4abc-a132-74210ffcde25	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-01 16:34:15.305	2025-08-31 16:34:15.306	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjU4MDU1LCJleHAiOjE3NTY3NDQ0NTV9.DCEj0cl8xB_KpCJX5CVfCP2LWKngXwhyEciC0hLudgI_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjU4MDU1LCJleHAiOjE3NTY3NDQ0NTV9.DCEj0cl8xB_KpCJX5CVfCP2LWKngXwhyEciC0hLudgI	unknown
a9577190-57c0-4531-8957-32b218a8d0d2	master-admin-1756272680518	master-client-1756272680179	2025-08-29 00:37:27.992	2025-08-28 00:37:27.993	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDE0NDcsImV4cCI6MTc1NjQyNzg0N30.y7H_o4VPJEE0jaB-wW-FE8mfAeVX772x_BGB7eQuazc_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDE0NDcsImV4cCI6MTc1NjQyNzg0N30.y7H_o4VPJEE0jaB-wW-FE8mfAeVX772x_BGB7eQuazc	unknown
6e55d455-8b45-4a09-a901-560ac9c7c10d	master-admin-1756272680518	master-client-1756272680179	2025-08-29 00:42:49.962	2025-08-28 00:42:49.964	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDE3NjksImV4cCI6MTc1NjQyODE2OX0.eY2TV2Rr05cbJqUxlRg1FMVBtw6KaT7o-tzq7W5zWg4_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDE3NjksImV4cCI6MTc1NjQyODE2OX0.eY2TV2Rr05cbJqUxlRg1FMVBtw6KaT7o-tzq7W5zWg4	unknown
a7b7d0f4-b278-4361-a17f-25fc87457eac	master-admin-1756272680518	master-client-1756272680179	2025-08-29 00:45:16.359	2025-08-28 00:45:16.361	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDE5MTYsImV4cCI6MTc1NjQyODMxNn0.SfF2Gb66VumdvZ6sFmXdiXEGgWBzbLpFckQYJFP-t7s_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDE5MTYsImV4cCI6MTc1NjQyODMxNn0.SfF2Gb66VumdvZ6sFmXdiXEGgWBzbLpFckQYJFP-t7s	unknown
3f7c6c83-deee-4edd-8fb0-e0a993b206e1	master-admin-1756272680518	master-client-1756272680179	2025-08-29 00:45:35.077	2025-08-28 00:45:35.078	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDE5MzUsImV4cCI6MTc1NjQyODMzNX0.V3Ms7H0Y72GkTLirA56MrSWC53RQnuLCwCkF8d_B1H8_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDE5MzUsImV4cCI6MTc1NjQyODMzNX0.V3Ms7H0Y72GkTLirA56MrSWC53RQnuLCwCkF8d_B1H8	unknown
7eacecd7-edaa-43ce-b239-6f7b38d491ab	master-admin-1756272680518	master-client-1756272680179	2025-08-29 00:56:21.513	2025-08-28 00:56:21.514	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDI1ODEsImV4cCI6MTc1NjQyODk4MX0.65Si5paDQldCZ5H_Dyl4mplWx5tHrPMf0vfyNP8IEcs_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDI1ODEsImV4cCI6MTc1NjQyODk4MX0.65Si5paDQldCZ5H_Dyl4mplWx5tHrPMf0vfyNP8IEcs	unknown
d4f2730d-1deb-41fc-b398-ac9ee1d95a84	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-01 19:16:33.892	2025-08-31 19:16:33.893	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjY3NzkzLCJleHAiOjE3NTY3NTQxOTN9.56swpMy2Q1PJzuSqxbaPmwt3udYADSEjr4Y2qS4RiK0_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjY3NzkzLCJleHAiOjE3NTY3NTQxOTN9.56swpMy2Q1PJzuSqxbaPmwt3udYADSEjr4Y2qS4RiK0	unknown
bfbd7006-9066-49fe-b74c-457fa1a91851	master-admin-1756272680518	master-client-1756272680179	2025-08-29 00:59:55.978	2025-08-28 00:59:55.979	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDI3OTUsImV4cCI6MTc1NjQyOTE5NX0.AZ3i2BpWkBHEcnMkEo6PUDgRWWFI9R7s8UtHT64p8Mc_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDI3OTUsImV4cCI6MTc1NjQyOTE5NX0.AZ3i2BpWkBHEcnMkEo6PUDgRWWFI9R7s8UtHT64p8Mc	unknown
f612fbaf-cb33-4bcc-aad7-5884a257aa1f	master-admin-1756272680518	master-client-1756272680179	2025-08-29 01:02:37.072	2025-08-28 01:02:37.073	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDI5NTcsImV4cCI6MTc1NjQyOTM1N30.NBcFaWeBDpwmOJqUVhiMCD9aED4NFdg6Z9lkJDOUJq8_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDI5NTcsImV4cCI6MTc1NjQyOTM1N30.NBcFaWeBDpwmOJqUVhiMCD9aED4NFdg6Z9lkJDOUJq8	unknown
89c5d13f-f13d-42be-a393-ea61236bc3e4	master-admin-1756272680518	master-client-1756272680179	2025-09-06 13:26:08.7	2025-09-05 13:26:08.701	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNzg3NjgsImV4cCI6MTc1NzE2NTE2OH0.0bF46NdyjvlZCfJOsdofxNJLUkPBwTGJuYMeS8WTS0k_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNzg3NjgsImV4cCI6MTc1NzE2NTE2OH0.0bF46NdyjvlZCfJOsdofxNJLUkPBwTGJuYMeS8WTS0k	unknown
b79f8d20-4a47-4884-8ef1-13c73776b251	master-admin-1756272680518	master-client-1756272680179	2025-08-29 01:26:55.23	2025-08-28 01:26:55.232	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDQ0MTUsImV4cCI6MTc1NjQzMDgxNX0.ehCvlod5EXJoMLgMbNw3D58FmcYeD_7oPRiXKNAxOGw_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNDQ0MTUsImV4cCI6MTc1NjQzMDgxNX0.ehCvlod5EXJoMLgMbNw3D58FmcYeD_7oPRiXKNAxOGw	unknown
dade5489-7952-4a0c-925e-e86e1350fda1	master-admin-1756272680518	master-client-1756272680179	2025-08-29 04:19:30.095	2025-08-28 04:19:30.097	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNTQ3NzAsImV4cCI6MTc1NjQ0MTE3MH0.Qt6KkuEqr1L5rkYzXxegI6S8POB3dVxyQrMbUB8rI-s_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzNTQ3NzAsImV4cCI6MTc1NjQ0MTE3MH0.Qt6KkuEqr1L5rkYzXxegI6S8POB3dVxyQrMbUB8rI-s	unknown
b201a412-3eec-4254-a175-2172267bbe16	master-admin-1756272680518	master-client-1756272680179	2025-08-29 11:43:12.16	2025-08-28 11:43:12.161	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzODEzOTIsImV4cCI6MTc1NjQ2Nzc5Mn0.7TaHo80zwwBoj1FKuJ1sIda4w_m6sS5cscZ3A6LzOH8_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzODEzOTIsImV4cCI6MTc1NjQ2Nzc5Mn0.7TaHo80zwwBoj1FKuJ1sIda4w_m6sS5cscZ3A6LzOH8	unknown
14a153a1-38d6-4adf-a969-45c967908b34	master-admin-1756272680518	master-client-1756272680179	2025-08-29 11:56:34.018	2025-08-28 11:56:34.019	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzODIxOTQsImV4cCI6MTc1NjQ2ODU5NH0.w7dArwUpGFWTDMbTk2LOL0pqGQqSBLMXU3fEoJ5Rw0E_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzODIxOTQsImV4cCI6MTc1NjQ2ODU5NH0.w7dArwUpGFWTDMbTk2LOL0pqGQqSBLMXU3fEoJ5Rw0E	unknown
65b02fec-84e9-40c0-8917-154586545276	master-admin-1756272680518	master-client-1756272680179	2025-08-29 12:09:41.815	2025-08-28 12:09:41.816	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzODI5ODEsImV4cCI6MTc1NjQ2OTM4MX0.A5GImd_v8FGNI05a_v-RQLdUkLvHpsxLToKUaFnu9gM_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzODI5ODEsImV4cCI6MTc1NjQ2OTM4MX0.A5GImd_v8FGNI05a_v-RQLdUkLvHpsxLToKUaFnu9gM	unknown
367e2293-73f5-4655-b3e7-057a90d6c68a	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-02 13:15:08.463	2025-09-01 13:15:08.464	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NzMyNTA4LCJleHAiOjE3NTY4MTg5MDh9.u2nLvBuJ_aGPxYiG_QI6Z1aQqRj3sim5fHCf1tmCjck_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NzMyNTA4LCJleHAiOjE3NTY4MTg5MDh9.u2nLvBuJ_aGPxYiG_QI6Z1aQqRj3sim5fHCf1tmCjck	unknown
c3fd1693-b8fd-477c-a0c3-dc1731ef111f	master-admin-1756272680518	master-client-1756272680179	2025-08-29 12:11:05.813	2025-08-28 12:11:05.814	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzODMwNjUsImV4cCI6MTc1NjQ2OTQ2NX0.VngELP_bRizezoKp0JKgubH0xB7mWJsDTW9zIhmPQcY_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzODMwNjUsImV4cCI6MTc1NjQ2OTQ2NX0.VngELP_bRizezoKp0JKgubH0xB7mWJsDTW9zIhmPQcY	unknown
6aa6172f-e5f5-46bd-820f-23d0e9c4d7a8	master-admin-1756272680518	master-client-1756272680179	2025-08-29 16:44:56.175	2025-08-28 16:44:56.176	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzOTk0OTYsImV4cCI6MTc1NjQ4NTg5Nn0.g8obs6fVuA-sYwzi8bbWdqxVOJ2ffdlNxnkrZ3QWZ1s_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTYzOTk0OTYsImV4cCI6MTc1NjQ4NTg5Nn0.g8obs6fVuA-sYwzi8bbWdqxVOJ2ffdlNxnkrZ3QWZ1s	unknown
3f2d0900-a117-4079-96bf-27214f1ef053	master-admin-1756272680518	master-client-1756272680179	2025-08-29 16:58:14.331	2025-08-28 16:58:14.332	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDAyOTQsImV4cCI6MTc1NjQ4NjY5NH0.N0AeqgR3cWW2UnYVdyLQ4WjM-udoBKtRMGQSS5Uj7uk_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDAyOTQsImV4cCI6MTc1NjQ4NjY5NH0.N0AeqgR3cWW2UnYVdyLQ4WjM-udoBKtRMGQSS5Uj7uk	unknown
8d03cebf-faa9-4341-ba27-bada12c8a340	master-admin-1756272680518	master-client-1756272680179	2025-08-29 17:02:26.799	2025-08-28 17:02:26.8	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDA1NDYsImV4cCI6MTc1NjQ4Njk0Nn0.0NbvdbbDqAerkeOJZQlSbBhw_DkJ2GD3djQcABc7RVI_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDA1NDYsImV4cCI6MTc1NjQ4Njk0Nn0.0NbvdbbDqAerkeOJZQlSbBhw_DkJ2GD3djQcABc7RVI	unknown
9ef1655d-515d-4d9d-b9ba-73df4613bcb9	user-1757078825722-uzqoqxu0l	client-1757058396579-m510j2d3m	2025-09-06 13:56:12.147	2025-09-05 13:56:12.148	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NzA4MDU3MiwiZXhwIjoxNzU3MTY2OTcyfQ.Fant7qjPORZ76qD-xjBcWFfMvWljO3T8kV-6ZbZ6ixc_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NzA4MDU3MiwiZXhwIjoxNzU3MTY2OTcyfQ.Fant7qjPORZ76qD-xjBcWFfMvWljO3T8kV-6ZbZ6ixc	unknown
d12ddf8b-206c-4fc2-b7ad-5b83442d12bc	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-02 15:12:37.53	2025-09-01 15:12:37.531	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NzM5NTU3LCJleHAiOjE3NTY4MjU5NTd9.KqpFLqXHmDo_9hTmupVNmUrW6rItH_g-DZFDKyfcEMY_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NzM5NTU3LCJleHAiOjE3NTY4MjU5NTd9.KqpFLqXHmDo_9hTmupVNmUrW6rItH_g-DZFDKyfcEMY	unknown
c920b88b-f494-4adc-912d-f456f346aa40	master-admin-1756272680518	master-client-1756272680179	2025-08-29 17:14:30.866	2025-08-28 17:14:30.867	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDEyNzAsImV4cCI6MTc1NjQ4NzY3MH0.KNppiQLWsyLJd83XKavC4tEo1DseZE5T34ClLnH03D0_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDEyNzAsImV4cCI6MTc1NjQ4NzY3MH0.KNppiQLWsyLJd83XKavC4tEo1DseZE5T34ClLnH03D0	unknown
03285c90-b278-46f1-abc7-0ad6a8cf2434	master-admin-1756272680518	master-client-1756272680179	2025-08-29 17:16:19.851	2025-08-28 17:16:19.852	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDEzNzksImV4cCI6MTc1NjQ4Nzc3OX0.yq_nTRcFzCvyMUL0FpOX8wj9YD-hbhi_bXPUEgbVnRs_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDEzNzksImV4cCI6MTc1NjQ4Nzc3OX0.yq_nTRcFzCvyMUL0FpOX8wj9YD-hbhi_bXPUEgbVnRs	unknown
121953d7-91ce-4e6b-a6cf-7acac4dea0c9	master-admin-1756272680518	master-client-1756272680179	2025-08-29 17:16:52.164	2025-08-28 17:16:52.165	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE0MTIsImV4cCI6MTc1NjQ4NzgxMn0.bzJ3a-GY_7putHW7qOwtlQ-flYrWHBjRkN0iVlF2hes_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE0MTIsImV4cCI6MTc1NjQ4NzgxMn0.bzJ3a-GY_7putHW7qOwtlQ-flYrWHBjRkN0iVlF2hes	unknown
addb98fa-9309-4824-beb0-b761fa907158	master-admin-1756272680518	master-client-1756272680179	2025-08-29 17:17:01.652	2025-08-28 17:17:01.652	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE0MjEsImV4cCI6MTc1NjQ4NzgyMX0.5OTaCDWwE2h08wlIyLVwHY46COrWpkdUCYmROzdElE0_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE0MjEsImV4cCI6MTc1NjQ4NzgyMX0.5OTaCDWwE2h08wlIyLVwHY46COrWpkdUCYmROzdElE0	unknown
086b5a58-795a-443e-8fc5-33ba54ea654e	master-admin-1756272680518	master-client-1756272680179	2025-08-29 17:17:18.56	2025-08-28 17:17:18.561	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE0MzgsImV4cCI6MTc1NjQ4NzgzOH0.topcYnt7kG1OQginOvN8NQ-fX3vSnIpNphdxYN5dxSs_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE0MzgsImV4cCI6MTc1NjQ4NzgzOH0.topcYnt7kG1OQginOvN8NQ-fX3vSnIpNphdxYN5dxSs	unknown
b49077ef-6b4c-4b98-93f9-9069495d8aa9	master-admin-1756272680518	master-client-1756272680179	2025-08-29 17:17:42.426	2025-08-28 17:17:42.427	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE0NjIsImV4cCI6MTc1NjQ4Nzg2Mn0.-ArXX98JI3UTiVM_7RlFdYQqAt9sxTrO5FAu8yYuy7U_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE0NjIsImV4cCI6MTc1NjQ4Nzg2Mn0.-ArXX98JI3UTiVM_7RlFdYQqAt9sxTrO5FAu8yYuy7U	unknown
071e18bb-f456-4574-8767-caf2abad0822	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-02 18:09:53.912	2025-09-01 18:09:53.913	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NzUwMTkzLCJleHAiOjE3NTY4MzY1OTN9.6fxPa_ArvrHlZTBOu-dr_e8KnVIhX8xRscC-GMwexCo_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NzUwMTkzLCJleHAiOjE3NTY4MzY1OTN9.6fxPa_ArvrHlZTBOu-dr_e8KnVIhX8xRscC-GMwexCo	unknown
a1644ba4-f22a-42a5-9994-ba316497ddf9	master-admin-1756272680518	master-client-1756272680179	2025-08-29 17:22:21.197	2025-08-28 17:22:21.198	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE3NDEsImV4cCI6MTc1NjQ4ODE0MX0.1tRU7Yut_amC1hBJXKGW1GjAV10X2PWo6lFvG1K5tWs_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE3NDEsImV4cCI6MTc1NjQ4ODE0MX0.1tRU7Yut_amC1hBJXKGW1GjAV10X2PWo6lFvG1K5tWs	unknown
76fd4421-9899-4f5a-8a06-0f11e691fdee	master-admin-1756272680518	master-client-1756272680179	2025-08-29 17:24:42.528	2025-08-28 17:24:42.529	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE4ODIsImV4cCI6MTc1NjQ4ODI4Mn0.hWyl63kNl3t8JI35VlJZhiDe0rJADsakX6hPCFWdSiY_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE4ODIsImV4cCI6MTc1NjQ4ODI4Mn0.hWyl63kNl3t8JI35VlJZhiDe0rJADsakX6hPCFWdSiY	unknown
7a723e6f-458a-43a4-b062-4d5a87d53c5c	master-admin-1756272680518	master-client-1756272680179	2025-08-29 17:25:20.676	2025-08-28 17:25:20.677	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE5MjAsImV4cCI6MTc1NjQ4ODMyMH0.LbyniNqvtQ1yMWD_7infXYn_keHzgGqNVzzykTkqC5Q_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE5MjAsImV4cCI6MTc1NjQ4ODMyMH0.LbyniNqvtQ1yMWD_7infXYn_keHzgGqNVzzykTkqC5Q	unknown
ed458ca3-0e35-4446-9d50-529cc1c2efb6	master-admin-1756272680518	master-client-1756272680179	2025-08-29 17:25:24.631	2025-08-28 17:25:24.631	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE5MjQsImV4cCI6MTc1NjQ4ODMyNH0.j-XEi-T51dN_EeaOZPv2nJfXqmh-_qbvnioyRbBCAAc_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDE5MjQsImV4cCI6MTc1NjQ4ODMyNH0.j-XEi-T51dN_EeaOZPv2nJfXqmh-_qbvnioyRbBCAAc	unknown
90c2e1ea-0623-4d03-ad31-f07862974e94	master-admin-1756272680518	master-client-1756272680179	2025-08-29 17:37:06.491	2025-08-28 17:37:06.492	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDI2MjYsImV4cCI6MTc1NjQ4OTAyNn0.g743YLQmiKXo6fVCLijKlqPRNUz4ceYyl7BQ4t6doI0_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDI2MjYsImV4cCI6MTc1NjQ4OTAyNn0.g743YLQmiKXo6fVCLijKlqPRNUz4ceYyl7BQ4t6doI0	unknown
a9cdd0c7-76f8-4fc5-89a6-64523811b2c7	master-admin-1756272680518	master-client-1756272680179	2025-08-29 17:39:06.793	2025-08-28 17:39:06.794	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDI3NDYsImV4cCI6MTc1NjQ4OTE0Nn0.Xl_G-a8j5wxGtmXfdSX3_RvasooB66G9AcfqFu2iHDE_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0MDI3NDYsImV4cCI6MTc1NjQ4OTE0Nn0.Xl_G-a8j5wxGtmXfdSX3_RvasooB66G9AcfqFu2iHDE	unknown
d4ffb538-4e42-4e46-810f-9d0ba30b6780	user-1757078825722-uzqoqxu0l	client-1757058396579-m510j2d3m	2025-09-06 14:26:59.412	2025-09-05 14:26:59.413	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NzA4MjQxOSwiZXhwIjoxNzU3MTY4ODE5fQ.1OPM94uBIR1E_3IqguIMeWl_-zNLDNv1u72B9FN1e3U_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NzA4MjQxOSwiZXhwIjoxNzU3MTY4ODE5fQ.1OPM94uBIR1E_3IqguIMeWl_-zNLDNv1u72B9FN1e3U	unknown
e450be75-22ca-42b7-bb5e-1c5f76caaac6	master-admin-1756272680518	master-client-1756272680179	2025-08-30 05:13:58.829	2025-08-29 05:13:58.83	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0NDQ0MzgsImV4cCI6MTc1NjUzMDgzOH0.t8Wt5y7owoB-gyo_X-DcMS6Ein4kpW9IuCom3n6MyAk_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0NDQ0MzgsImV4cCI6MTc1NjUzMDgzOH0.t8Wt5y7owoB-gyo_X-DcMS6Ein4kpW9IuCom3n6MyAk	unknown
fa8ce03b-783c-4234-8479-0fea6cbee2f1	master-admin-1756272680518	master-client-1756272680179	2025-08-30 05:28:37.234	2025-08-29 05:28:37.235	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0NDUzMTcsImV4cCI6MTc1NjUzMTcxN30.c-E3gTjYMNdVdZF0I-ynsqyldSix_EflINF8R_RkQmw_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0NDUzMTcsImV4cCI6MTc1NjUzMTcxN30.c-E3gTjYMNdVdZF0I-ynsqyldSix_EflINF8R_RkQmw	unknown
b081a5ef-a8e8-4e3d-b07a-3f9feb97e047	master-admin-1756272680518	master-client-1756272680179	2025-08-30 05:35:26.283	2025-08-29 05:35:26.284	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0NDU3MjYsImV4cCI6MTc1NjUzMjEyNn0.HZ8CJu8ygf59u6cuhXUf5DUHx-qOggtYabYR9sdlKss_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0NDU3MjYsImV4cCI6MTc1NjUzMjEyNn0.HZ8CJu8ygf59u6cuhXUf5DUHx-qOggtYabYR9sdlKss	unknown
ec2079e7-3e43-42c2-9ef8-aa2a7cf35cf5	master-admin-1756272680518	master-client-1756272680179	2025-08-30 05:44:55.192	2025-08-29 05:44:55.193	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0NDYyOTUsImV4cCI6MTc1NjUzMjY5NX0.ptrLzEuBvkjoZxcWpw-7aVJK45MvsyMkCt_sAokvcvc_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY0NDYyOTUsImV4cCI6MTc1NjUzMjY5NX0.ptrLzEuBvkjoZxcWpw-7aVJK45MvsyMkCt_sAokvcvc	unknown
af739260-b4ac-4e0f-90d6-021c8151b383	master-admin-1756272680518	master-client-1756272680179	2025-08-31 03:08:32.093	2025-08-30 03:08:32.095	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY1MjMzMTIsImV4cCI6MTc1NjYwOTcxMn0.eR44O2XVPb237J2qRg3CoV8xU6nHnFrVc01zYnwJoUI_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY1MjMzMTIsImV4cCI6MTc1NjYwOTcxMn0.eR44O2XVPb237J2qRg3CoV8xU6nHnFrVc01zYnwJoUI	unknown
5f5eca64-2e29-4184-8b58-33b6e2822450	user-1757078825722-uzqoqxu0l	client-1757058396579-m510j2d3m	2025-09-07 10:48:27.996	2025-09-06 10:48:27.997	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NzE1NTcwNywiZXhwIjoxNzU3MjQyMTA3fQ.rzfP3WLpAbnrXtXpg-LFXZEGrhHNxLbIOcziMsBZQTg_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NzE1NTcwNywiZXhwIjoxNzU3MjQyMTA3fQ.rzfP3WLpAbnrXtXpg-LFXZEGrhHNxLbIOcziMsBZQTg	unknown
a539004a-1e39-4796-8850-a3f68f57ed86	master-admin-1756272680518	master-client-1756272680179	2025-08-31 06:04:46.484	2025-08-30 06:04:46.485	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY1MzM4ODYsImV4cCI6MTc1NjYyMDI4Nn0.y5SiEXlCQPm51ac-letgsiGx4z7mMjzRo9UgNSXlm8k_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY1MzM4ODYsImV4cCI6MTc1NjYyMDI4Nn0.y5SiEXlCQPm51ac-letgsiGx4z7mMjzRo9UgNSXlm8k	unknown
8354d4d4-ac36-4008-8c91-eb0ddcccb000	master-admin-1756272680518	master-client-1756272680179	2025-08-31 06:24:49.436	2025-08-30 06:24:49.438	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY1MzUwODksImV4cCI6MTc1NjYyMTQ4OX0.qZYN2ch52yYkPcfcT6bjX0ZwYP3z2mf_ByqLI0SugTw_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY1MzUwODksImV4cCI6MTc1NjYyMTQ4OX0.qZYN2ch52yYkPcfcT6bjX0ZwYP3z2mf_ByqLI0SugTw	unknown
1ec81d22-bd6b-4d43-921f-ea5da0015766	master-admin-1756272680518	master-client-1756272680179	2025-08-31 22:21:21.369	2025-08-30 22:21:21.371	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY1OTI0ODEsImV4cCI6MTc1NjY3ODg4MX0.qn-4rCPQvkwI7e7M_Ps4x0ZMdbtL-9M49A7tQA9ahNo_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY1OTI0ODEsImV4cCI6MTc1NjY3ODg4MX0.qn-4rCPQvkwI7e7M_Ps4x0ZMdbtL-9M49A7tQA9ahNo	unknown
281563b1-9d2a-4d64-a937-30d4666e30c2	master-admin-1756272680518	master-client-1756272680179	2025-09-01 04:09:56.199	2025-08-31 04:09:56.201	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2MTMzOTYsImV4cCI6MTc1NjY5OTc5Nn0.oOSs6UEmBk6Fq8gxAOyQxKlc5UjD0aTYwSuAE8Wpu0w_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2MTMzOTYsImV4cCI6MTc1NjY5OTc5Nn0.oOSs6UEmBk6Fq8gxAOyQxKlc5UjD0aTYwSuAE8Wpu0w	unknown
1877d72e-cede-404f-8193-33538da3e6f6	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-01 12:40:45.942	2025-08-31 12:40:45.943	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjQ0MDQ1LCJleHAiOjE3NTY3MzA0NDV9.2Iarl-UJL_AvAwrZatrQ-O3zpHSMAhLLBZ--vlNWc38_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjQ0MDQ1LCJleHAiOjE3NTY3MzA0NDV9.2Iarl-UJL_AvAwrZatrQ-O3zpHSMAhLLBZ--vlNWc38	unknown
2f98b4b4-a8dc-4aee-a8d2-d0ef1310c74e	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-01 13:03:00.054	2025-08-31 13:03:00.055	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjQ1MzgwLCJleHAiOjE3NTY3MzE3ODB9.tx_Ner3gvcPduhTX2yLQpBG6AsyeC36z-A20Yah4WrU_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjQ1MzgwLCJleHAiOjE3NTY3MzE3ODB9.tx_Ner3gvcPduhTX2yLQpBG6AsyeC36z-A20Yah4WrU	unknown
8b7de73a-bb8a-4f51-b77a-7c30fb2ca72b	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-01 14:26:33.234	2025-08-31 14:26:33.235	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjUwMzkzLCJleHAiOjE3NTY3MzY3OTN9.tUX8OUGbHlSxRuHBK4IpUtb9_LdF3V4XYxCA8EHI_Gg_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjUwMzkzLCJleHAiOjE3NTY3MzY3OTN9.tUX8OUGbHlSxRuHBK4IpUtb9_LdF3V4XYxCA8EHI_Gg	unknown
cf1ad03b-c7aa-4edc-b987-a74a29699334	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-01 16:59:47.86	2025-08-31 16:59:47.862	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjU5NTg3LCJleHAiOjE3NTY3NDU5ODd9.6eUTZeNxTUVao2UYGCtzV5DI3Kw5FhXC_OqFYre0dfU_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjU5NTg3LCJleHAiOjE3NTY3NDU5ODd9.6eUTZeNxTUVao2UYGCtzV5DI3Kw5FhXC_OqFYre0dfU	unknown
2b314d7f-59d5-45c8-ab78-1a110b58df00	master-admin-1756272680518	master-client-1756272680179	2025-09-06 06:24:23.21	2025-09-05 06:24:23.21	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNTM0NjMsImV4cCI6MTc1NzEzOTg2M30.TLLKxuWWF2wxkRp_RfmMRBBSm9dl7bjhJxgVzzH4H6I_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNTM0NjMsImV4cCI6MTc1NzEzOTg2M30.TLLKxuWWF2wxkRp_RfmMRBBSm9dl7bjhJxgVzzH4H6I	unknown
7a1ba280-5286-4240-8c47-bf89c99a6b2a	master-admin-1756272680518	master-client-1756272680179	2025-09-06 06:56:05.667	2025-09-05 06:56:05.668	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNTUzNjUsImV4cCI6MTc1NzE0MTc2NX0.dMFQ6oS8MXx7B3tTWX-PxPamhDKKoyIzpzoHN9hJbjk_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNTUzNjUsImV4cCI6MTc1NzE0MTc2NX0.dMFQ6oS8MXx7B3tTWX-PxPamhDKKoyIzpzoHN9hJbjk	unknown
9ee6e2d2-af15-468e-b6c0-4fc7574fcccf	master-admin-1756272680518	master-client-1756272680179	2025-09-01 17:18:23.409	2025-08-31 17:18:23.41	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2NjA3MDMsImV4cCI6MTc1Njc0NzEwM30.K5cAtdfs9at1DS3ihl_obQuM2tduXZtSzcz2lv58ZpI_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2NjA3MDMsImV4cCI6MTc1Njc0NzEwM30.K5cAtdfs9at1DS3ihl_obQuM2tduXZtSzcz2lv58ZpI	unknown
2c717547-be22-41fa-88da-6c8438819864	master-admin-1756272680518	master-client-1756272680179	2025-09-01 17:20:55.85	2025-08-31 17:20:55.851	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2NjA4NTUsImV4cCI6MTc1Njc0NzI1NX0.Tp1p82piZ7MW3CFP18JEUhGvIhDif-ZbEmn6jc7BrvE_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2NjA4NTUsImV4cCI6MTc1Njc0NzI1NX0.Tp1p82piZ7MW3CFP18JEUhGvIhDif-ZbEmn6jc7BrvE	unknown
af6b9a30-0c0f-4e78-8edb-3cee266fce68	master-admin-1756272680518	master-client-1756272680179	2025-09-01 18:28:31.475	2025-08-31 18:28:31.476	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2NjQ5MTEsImV4cCI6MTc1Njc1MTMxMX0.wWsJopOAm-B7orYO32LwpJvzAXiLIVGgdNUQjHPzyec_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2NjQ5MTEsImV4cCI6MTc1Njc1MTMxMX0.wWsJopOAm-B7orYO32LwpJvzAXiLIVGgdNUQjHPzyec	unknown
f820ada7-2ddc-47c6-885f-5b8f2e83c86a	master-admin-1756272680518	master-client-1756272680179	2025-09-01 18:30:21.213	2025-08-31 18:30:21.213	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2NjUwMjEsImV4cCI6MTc1Njc1MTQyMX0.lOmTB75ZZVb3tO7-7Mh_noNMgHb9dR4Pa0bnkzN0BhU_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2NjUwMjEsImV4cCI6MTc1Njc1MTQyMX0.lOmTB75ZZVb3tO7-7Mh_noNMgHb9dR4Pa0bnkzN0BhU	unknown
982dfc9f-6694-41ad-a11f-851f5343ed95	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-01 18:40:29.746	2025-08-31 18:40:29.747	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjY1NjI5LCJleHAiOjE3NTY3NTIwMjl9.3uVvORJhraeyc1F_5UaQtoMkAFOyGxRPVkwZV7tsn5E_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjY1NjI5LCJleHAiOjE3NTY3NTIwMjl9.3uVvORJhraeyc1F_5UaQtoMkAFOyGxRPVkwZV7tsn5E	unknown
fd3a0b3b-89cb-4e94-a21f-05bd44ab495c	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-01 18:45:27.81	2025-08-31 18:45:27.811	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjY1OTI3LCJleHAiOjE3NTY3NTIzMjd9.iXT3lBDAwOAmj1IXBFgw5dp_2DjacUaLbAq16n2Gnng_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NjY1OTI3LCJleHAiOjE3NTY3NTIzMjd9.iXT3lBDAwOAmj1IXBFgw5dp_2DjacUaLbAq16n2Gnng	unknown
bb04cd40-10b7-447a-8d6d-657e58d3f050	master-admin-1756272680518	master-client-1756272680179	2025-09-01 18:45:42.942	2025-08-31 18:45:42.943	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2NjU5NDIsImV4cCI6MTc1Njc1MjM0Mn0.T1426jWu5WKj0jUmBbOGb6JZtFWDA63Bmxibh9EVWmY_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2NjU5NDIsImV4cCI6MTc1Njc1MjM0Mn0.T1426jWu5WKj0jUmBbOGb6JZtFWDA63Bmxibh9EVWmY	unknown
7de83619-b6d2-40fa-89e9-d960c7f1acb9	master-admin-1756272680518	master-client-1756272680179	2025-09-01 19:01:17.615	2025-08-31 19:01:17.616	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2NjY4NzcsImV4cCI6MTc1Njc1MzI3N30.nEi6nMESMoSUKfsbNuW4W8G12Uae9EUPn4xMT10HEvs_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2NjY4NzcsImV4cCI6MTc1Njc1MzI3N30.nEi6nMESMoSUKfsbNuW4W8G12Uae9EUPn4xMT10HEvs	unknown
499e9dfc-1556-4948-b2ea-303be7b76cac	master-admin-1756272680518	master-client-1756272680179	2025-09-01 23:43:37.522	2025-08-31 23:43:37.523	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2ODM4MTcsImV4cCI6MTc1Njc3MDIxN30._SURvqaRPF625u3n1ptLQqKeJII3gtsPqN3fB2oLx6s_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY2ODM4MTcsImV4cCI6MTc1Njc3MDIxN30._SURvqaRPF625u3n1ptLQqKeJII3gtsPqN3fB2oLx6s	unknown
edc27c20-2fb4-471c-93e0-c5111cee7d60	master-admin-1756272680518	master-client-1756272680179	2025-09-02 11:50:25.248	2025-09-01 11:50:25.249	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY3Mjc0MjUsImV4cCI6MTc1NjgxMzgyNX0.yzIzdceyYS3x70-wb5O1W1r8SvRu0LzphJWMFjvB1ZI_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY3Mjc0MjUsImV4cCI6MTc1NjgxMzgyNX0.yzIzdceyYS3x70-wb5O1W1r8SvRu0LzphJWMFjvB1ZI	unknown
f3e4b45c-0cb6-4c5b-a84e-03108f2447d7	master-admin-1756272680518	master-client-1756272680179	2025-09-02 12:13:49.11	2025-09-01 12:13:49.11	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY3Mjg4MjksImV4cCI6MTc1NjgxNTIyOX0.I2ZcmhyfOjANp8ZJoUXYMZgXAA8E146nBVWKtgoF-ZM_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY3Mjg4MjksImV4cCI6MTc1NjgxNTIyOX0.I2ZcmhyfOjANp8ZJoUXYMZgXAA8E146nBVWKtgoF-ZM	unknown
d82c955e-3aa8-4a7f-8960-44365c5b1d83	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-02 13:13:20.823	2025-09-01 13:13:20.824	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NzMyNDAwLCJleHAiOjE3NTY4MTg4MDB9.rtyBGd_YUyKY6bbOKUWzr3xxMbpw6DIB90mlEg2_t5Y_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NzMyNDAwLCJleHAiOjE3NTY4MTg4MDB9.rtyBGd_YUyKY6bbOKUWzr3xxMbpw6DIB90mlEg2_t5Y	unknown
09c05ed0-0372-4c6f-bcca-b507e5b7c2ed	master-admin-1756272680518	master-client-1756272680179	2025-09-02 13:13:38.58	2025-09-01 13:13:38.581	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY3MzI0MTgsImV4cCI6MTc1NjgxODgxOH0.J1ETwC0RJqAz6xDpMsOUKUzCk8s0TUhbKPzHZjy2VOw_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY3MzI0MTgsImV4cCI6MTc1NjgxODgxOH0.J1ETwC0RJqAz6xDpMsOUKUzCk8s0TUhbKPzHZjy2VOw	unknown
a26cda2b-a699-4a2a-a09b-47bca5adec81	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-02 15:29:00.068	2025-09-01 15:29:00.069	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NzQwNTQwLCJleHAiOjE3NTY4MjY5NDB9.sSqgN5RJx2OxFjMkMii-RYF7WRXMgF2Q9-95OB-fP8A_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NzQwNTQwLCJleHAiOjE3NTY4MjY5NDB9.sSqgN5RJx2OxFjMkMii-RYF7WRXMgF2Q9-95OB-fP8A	unknown
7643cb31-fbc7-43d2-9e39-d02c219c06c8	master-admin-1756272680518	master-client-1756272680179	2025-09-02 16:10:51.451	2025-09-01 16:10:51.452	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY3NDMwNTEsImV4cCI6MTc1NjgyOTQ1MX0.eMRnrl_ynIWbuT-DP03cK-0Oh5tMwjnFw4DzUlR9zFc_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY3NDMwNTEsImV4cCI6MTc1NjgyOTQ1MX0.eMRnrl_ynIWbuT-DP03cK-0Oh5tMwjnFw4DzUlR9zFc	unknown
d5ce3fe3-4755-4c9b-b669-910206477802	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-02 17:22:01.447	2025-09-01 17:22:01.448	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NzQ3MzIxLCJleHAiOjE3NTY4MzM3MjF9.8TbzRT0yvuEWjLJxKqBeQC2lHMKlNwVqX0YiOq9zHzw_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2NzQ3MzIxLCJleHAiOjE3NTY4MzM3MjF9.8TbzRT0yvuEWjLJxKqBeQC2lHMKlNwVqX0YiOq9zHzw	unknown
6eac1623-3ec9-4f51-99c1-d75d51f58f26	user-1757078825722-uzqoqxu0l	client-1757058396579-m510j2d3m	2025-09-07 11:06:40.967	2025-09-06 11:06:40.968	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NzE1NjgwMCwiZXhwIjoxNzU3MjQzMjAwfQ.iWS-dV16C7J7IfCJ9gPXYq6Ggo-VPsT58wPLc71sqlg_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NzE1NjgwMCwiZXhwIjoxNzU3MjQzMjAwfQ.iWS-dV16C7J7IfCJ9gPXYq6Ggo-VPsT58wPLc71sqlg	unknown
72748e0c-2ae2-4a99-ad5e-b827a015987d	master-admin-1756272680518	master-client-1756272680179	2025-09-03 14:19:28.82	2025-09-02 14:19:28.821	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY4MjI3NjgsImV4cCI6MTc1NjkwOTE2OH0.E_gPBQ8ReL_90SC-CIom4Qo2aYPYvdjyTfnp7JPngBU_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY4MjI3NjgsImV4cCI6MTc1NjkwOTE2OH0.E_gPBQ8ReL_90SC-CIom4Qo2aYPYvdjyTfnp7JPngBU	unknown
dc799ce5-1d2b-4cb5-b00c-aabec49e4f24	master-admin-1756272680518	master-client-1756272680179	2025-09-04 04:08:44.355	2025-09-03 04:08:44.356	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY4NzI1MjQsImV4cCI6MTc1Njk1ODkyNH0.nV_Km_acKQ5-EXOZVx7rurbD3VFnu7lGk6kwGXd1Dao_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY4NzI1MjQsImV4cCI6MTc1Njk1ODkyNH0.nV_Km_acKQ5-EXOZVx7rurbD3VFnu7lGk6kwGXd1Dao	unknown
8ea10316-2cb2-4a7c-ae98-7b2ff9bc7e80	user-1757078825722-uzqoqxu0l	client-1757058396579-m510j2d3m	2025-09-08 16:21:36.272	2025-09-07 16:21:36.273	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInNlc3Npb25JZCI6ImVmMjE3MGRhLTczYjItNDAzMS05NDJhLTg3M2I0YTM2NzFmNCIsImlhdCI6MTc1NzI2MjA5NiwiZXhwIjoxNzU3MzQ4NDk2LCJhdWQiOiJzY2FuMnNoaXAtdXNlcnMiLCJpc3MiOiJzY2FuMnNoaXAtYjJiIn0.Dq1BksR0l-RH-H31qYmzcCtKhqOqHdrS-zYge2VRAv4_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInNlc3Npb25JZCI6ImVmMjE3MGRhLTczYjItNDAzMS05NDJhLTg3M2I0YTM2NzFmNCIsImlhdCI6MTc1NzI2MjA5NiwiZXhwIjoxNzU3MzQ4NDk2LCJhdWQiOiJzY2FuMnNoaXAtdXNlcnMiLCJpc3MiOiJzY2FuMnNoaXAtYjJiIn0.Dq1BksR0l-RH-H31qYmzcCtKhqOqHdrS-zYge2VRAv4	unknown
1f5557d1-da0b-433b-871b-a87753e2a372	master-admin-1756272680518	master-client-1756272680179	2025-09-04 04:24:28.175	2025-09-03 04:24:28.176	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY4NzM0NjgsImV4cCI6MTc1Njk1OTg2OH0.gF0GCE03Sp3aEkt8pbMiaBuhNf4wdsujOm1Dsddty2k_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY4NzM0NjgsImV4cCI6MTc1Njk1OTg2OH0.gF0GCE03Sp3aEkt8pbMiaBuhNf4wdsujOm1Dsddty2k	unknown
10c8322d-8540-4a78-8eb7-67edb7d19d2c	master-admin-1756272680518	master-client-1756272680179	2025-09-04 11:50:55.438	2025-09-03 11:50:55.439	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5MDAyNTUsImV4cCI6MTc1Njk4NjY1NX0.45p9tktL1RWThymepbmmQkOMYNk9sSep0OFRs9J658c_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5MDAyNTUsImV4cCI6MTc1Njk4NjY1NX0.45p9tktL1RWThymepbmmQkOMYNk9sSep0OFRs9J658c	unknown
bd15e234-16a3-40c6-8b1c-1459a2b0afab	user-1757078825722-uzqoqxu0l	client-1757058396579-m510j2d3m	2025-09-09 02:36:49.403	2025-09-08 02:36:49.404	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInNlc3Npb25JZCI6IjRiNDZmZWU3LWNhZmMtNGQyMC04MDRjLTI2ODU5NDdmZGQ5MiIsImlhdCI6MTc1NzI5OTAwOSwiZXhwIjoxNzU3Mzg1NDA5LCJhdWQiOiJzY2FuMnNoaXAtdXNlcnMiLCJpc3MiOiJzY2FuMnNoaXAtYjJiIn0.Oe6BQdLnntNPzC7j-_YOjiHyXzm018V5dTAIPXXazho_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInNlc3Npb25JZCI6IjRiNDZmZWU3LWNhZmMtNGQyMC04MDRjLTI2ODU5NDdmZGQ5MiIsImlhdCI6MTc1NzI5OTAwOSwiZXhwIjoxNzU3Mzg1NDA5LCJhdWQiOiJzY2FuMnNoaXAtdXNlcnMiLCJpc3MiOiJzY2FuMnNoaXAtYjJiIn0.Oe6BQdLnntNPzC7j-_YOjiHyXzm018V5dTAIPXXazho	unknown
36e59107-cbfa-47ea-b690-6614f6cbe5f3	master-admin-1756272680518	master-client-1756272680179	2025-09-04 14:08:31.618	2025-09-03 14:08:31.619	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5MDg1MTEsImV4cCI6MTc1Njk5NDkxMX0.KESWLv_pCk1MRToAY3MK3yF2g7_2PtKgCkUQh-5HsuI_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5MDg1MTEsImV4cCI6MTc1Njk5NDkxMX0.KESWLv_pCk1MRToAY3MK3yF2g7_2PtKgCkUQh-5HsuI	unknown
249b20fc-e3a5-4a1b-be8d-a16023a6cdc7	master-admin-1756272680518	master-client-1756272680179	2025-09-04 14:13:38.391	2025-09-03 14:13:38.392	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5MDg4MTgsImV4cCI6MTc1Njk5NTIxOH0.ZWh-EMyBoRbXpecTZx3R5YY8ddP0MNK7kOWhaftg6-o_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5MDg4MTgsImV4cCI6MTc1Njk5NTIxOH0.ZWh-EMyBoRbXpecTZx3R5YY8ddP0MNK7kOWhaftg6-o	unknown
adcbabf9-b495-428e-846e-5f88d8fa7599	master-admin-1756272680518	master-client-1756272680179	2025-09-04 17:37:55.767	2025-09-03 17:37:55.768	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5MjEwNzUsImV4cCI6MTc1NzAwNzQ3NX0.VfYWXbfEAGw9lICTSRI9vRNLSPtvtHhzjwhmPO0iiOU_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5MjEwNzUsImV4cCI6MTc1NzAwNzQ3NX0.VfYWXbfEAGw9lICTSRI9vRNLSPtvtHhzjwhmPO0iiOU	unknown
4f1e9ff1-9e00-4387-be63-e98d5378ef5f	master-admin-1756272680518	master-client-1756272680179	2025-09-04 20:43:41.348	2025-09-03 20:43:41.35	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5MzIyMjEsImV4cCI6MTc1NzAxODYyMX0.NZEEkwD1e9CBcrbEQxitI6Kdy_QCHuMfzNsXaWUuQ6U_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5MzIyMjEsImV4cCI6MTc1NzAxODYyMX0.NZEEkwD1e9CBcrbEQxitI6Kdy_QCHuMfzNsXaWUuQ6U	unknown
276c324d-58d9-407a-8e3f-92e8b1ca52f1	user-1757078825722-uzqoqxu0l	client-1757058396579-m510j2d3m	2025-09-09 05:15:48.449	2025-09-08 05:15:48.45	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInNlc3Npb25JZCI6IjAxZmY5N2Q0LTZhMzgtNDY1Yi04OGI1LTIyNWY3M2E1NjQ3OSIsImlhdCI6MTc1NzMwODU0OCwiZXhwIjoxNzU3Mzk0OTQ4LCJhdWQiOiJzY2FuMnNoaXAtdXNlcnMiLCJpc3MiOiJzY2FuMnNoaXAtYjJiIn0.LxvrL-CPhJDuBbV0NCouhSzCmbyM8b7ZpBH-OWtYE_A_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInNlc3Npb25JZCI6IjAxZmY5N2Q0LTZhMzgtNDY1Yi04OGI1LTIyNWY3M2E1NjQ3OSIsImlhdCI6MTc1NzMwODU0OCwiZXhwIjoxNzU3Mzk0OTQ4LCJhdWQiOiJzY2FuMnNoaXAtdXNlcnMiLCJpc3MiOiJzY2FuMnNoaXAtYjJiIn0.LxvrL-CPhJDuBbV0NCouhSzCmbyM8b7ZpBH-OWtYE_A	unknown
0fe79f48-8f15-423b-8d46-972cc4285efb	master-admin-1756272680518	master-client-1756272680179	2025-09-05 00:14:46.384	2025-09-04 00:14:46.385	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5NDQ4ODYsImV4cCI6MTc1NzAzMTI4Nn0.V81tKQ6bnXJY5DJO94SmRGY5MsuP64Ob6TXyK8sofBk_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5NDQ4ODYsImV4cCI6MTc1NzAzMTI4Nn0.V81tKQ6bnXJY5DJO94SmRGY5MsuP64Ob6TXyK8sofBk	unknown
c5f5a29e-4909-427c-9fc9-e61831c10d6a	master-admin-1756272680518	master-client-1756272680179	2025-09-05 00:39:33.634	2025-09-04 00:39:33.635	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5NDYzNzMsImV4cCI6MTc1NzAzMjc3M30.EtFBadcSU1eIpjPp9FqgKLZuzAbEs6g97eW0lRF0IPU_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5NDYzNzMsImV4cCI6MTc1NzAzMjc3M30.EtFBadcSU1eIpjPp9FqgKLZuzAbEs6g97eW0lRF0IPU	unknown
ce55b893-4888-4453-8638-bf43fdf6c93e	user-1757078825722-uzqoqxu0l	client-1757058396579-m510j2d3m	2025-09-09 13:02:51.105	2025-09-08 13:02:51.106	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInNlc3Npb25JZCI6Ijg4MzY2MjA5LTQ4MjgtNDFiYS04OGE5LThjNTNjMjhhMDM2MCIsImlhdCI6MTc1NzMzNjU3MSwiZXhwIjoxNzU3NDIyOTcxLCJhdWQiOiJzY2FuMnNoaXAtdXNlcnMiLCJpc3MiOiJzY2FuMnNoaXAtYjJiIn0.54ZUDcjYEA8Zi7OU0XhimjWIbcHdsEx6irKPdJ_FMUU_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTcwNzg4MjU3MjItdXpxb3F4dTBsIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6InJvdXRlbWFzdGVyY291cmllcmNhcmdvQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInNlc3Npb25JZCI6Ijg4MzY2MjA5LTQ4MjgtNDFiYS04OGE5LThjNTNjMjhhMDM2MCIsImlhdCI6MTc1NzMzNjU3MSwiZXhwIjoxNzU3NDIyOTcxLCJhdWQiOiJzY2FuMnNoaXAtdXNlcnMiLCJpc3MiOiJzY2FuMnNoaXAtYjJiIn0.54ZUDcjYEA8Zi7OU0XhimjWIbcHdsEx6irKPdJ_FMUU	unknown
493a40d1-93d5-4c44-8c78-7cb87fd1c4c8	master-admin-1756272680518	master-client-1756272680179	2025-09-05 11:55:36.671	2025-09-04 11:55:36.671	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5ODY5MzYsImV4cCI6MTc1NzA3MzMzNn0.D_ymYf91-TFFNBiUvbhVjAePAhoSdc4vVHGfBN-y_V4_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5ODY5MzYsImV4cCI6MTc1NzA3MzMzNn0.D_ymYf91-TFFNBiUvbhVjAePAhoSdc4vVHGfBN-y_V4	unknown
5cd192da-6ef1-4b21-8906-10a4fc8e125d	master-admin-1756272680518	master-client-1756272680179	2025-09-05 12:27:53.311	2025-09-04 12:27:53.312	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5ODg4NzMsImV4cCI6MTc1NzA3NTI3M30.Nb6JhFpKFbbi6S_mbh3hHaMuhHYsyZyGaLlTw94lSRw_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5ODg4NzMsImV4cCI6MTc1NzA3NTI3M30.Nb6JhFpKFbbi6S_mbh3hHaMuhHYsyZyGaLlTw94lSRw	unknown
3ed423da-ccac-4a85-b5c1-152dfd2c8573	master-admin-1756272680518	master-client-1756272680179	2025-09-05 12:38:17.444	2025-09-04 12:38:17.445	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5ODk0OTcsImV4cCI6MTc1NzA3NTg5N30.ugwDQZzh_p_X2rbv8Mfxh_ugAYmdtBMUHvJOXE3v2J4_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5ODk0OTcsImV4cCI6MTc1NzA3NTg5N30.ugwDQZzh_p_X2rbv8Mfxh_ugAYmdtBMUHvJOXE3v2J4	unknown
26400203-e52f-47a2-84e7-a5e811568d58	master-admin-1756272680518	master-client-1756272680179	2025-09-05 15:11:10.519	2025-09-04 15:11:10.521	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5OTg2NzAsImV4cCI6MTc1NzA4NTA3MH0.96tvzsG4XA13TNxIxa05TtaH0mcHx6yFyeIymAD_WP8_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTY5OTg2NzAsImV4cCI6MTc1NzA4NTA3MH0.96tvzsG4XA13TNxIxa05TtaH0mcHx6yFyeIymAD_WP8	unknown
67fb749e-0acb-4b88-8dd4-4cca9db1e47f	user-1757337539078-04msdp3ra	client-1757058396579-m510j2d3m	2025-09-09 13:19:24.923	2025-09-08 13:19:24.924	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTczMzc1MzkwNzgtMDRtc2RwM3JhIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6ImluZm9AbXJzaGlwLmluIiwicm9sZSI6ImNoaWxkX3VzZXIiLCJzZXNzaW9uSWQiOiJmOWYzMTQwNS1hMGY5LTRjNzYtOWI5MC1lYzY5YWJiOTE5ZTgiLCJpYXQiOjE3NTczMzc1NjQsImV4cCI6MTc1NzQyMzk2NCwiYXVkIjoic2NhbjJzaGlwLXVzZXJzIiwiaXNzIjoic2NhbjJzaGlwLWIyYiJ9.XwoT8hC5MTPzZteEHOhKNcR7DGCrK80aGcG59eLuv8k_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTczMzc1MzkwNzgtMDRtc2RwM3JhIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzA1ODM5NjU3OS1tNTEwajJkM20iLCJlbWFpbCI6ImluZm9AbXJzaGlwLmluIiwicm9sZSI6ImNoaWxkX3VzZXIiLCJzZXNzaW9uSWQiOiJmOWYzMTQwNS1hMGY5LTRjNzYtOWI5MC1lYzY5YWJiOTE5ZTgiLCJpYXQiOjE3NTczMzc1NjQsImV4cCI6MTc1NzQyMzk2NCwiYXVkIjoic2NhbjJzaGlwLXVzZXJzIiwiaXNzIjoic2NhbjJzaGlwLWIyYiJ9.XwoT8hC5MTPzZteEHOhKNcR7DGCrK80aGcG59eLuv8k	unknown
cbdb0bae-17ef-41a9-9327-811d4b04c2bb	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-05 15:24:15.346	2025-09-04 15:24:15.347	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2OTk5NDU1LCJleHAiOjE3NTcwODU4NTV9.jpDxfE7dSJ9dn2l4rk8tMmdPSxqSqe8svPB0xAOcAns_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2OTk5NDU1LCJleHAiOjE3NTcwODU4NTV9.jpDxfE7dSJ9dn2l4rk8tMmdPSxqSqe8svPB0xAOcAns	unknown
040e34bf-9730-4343-9676-b3b5079091ad	user-1756643951453-7h5dyb5zm	default-client-001	2025-09-05 15:29:13.971	2025-09-04 15:29:13.972	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2OTk5NzUzLCJleHAiOjE3NTcwODYxNTN9.nndXbDgKgRwrtFKS6q9tDsPiFQKBdxXSE1g0Si_m5LE_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTY2NDM5NTE0NTMtN2g1ZHliNXptIiwiY2xpZW50SWQiOiJkZWZhdWx0LWNsaWVudC0wMDEiLCJlbWFpbCI6InRlc3RAc2NhbjJzaGlwLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU2OTk5NzUzLCJleHAiOjE3NTcwODYxNTN9.nndXbDgKgRwrtFKS6q9tDsPiFQKBdxXSE1g0Si_m5LE	unknown
6ecb6129-c439-47b3-818a-3d4d3e1bee60	master-admin-1756272680518	master-client-1756272680179	2025-09-05 15:58:35.397	2025-09-04 15:58:35.398	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwMDE1MTUsImV4cCI6MTc1NzA4NzkxNX0.RNlVsoQ27lpryxkRn9ahf-ok87XHXzbfqeEpt4h346U_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwMDE1MTUsImV4cCI6MTc1NzA4NzkxNX0.RNlVsoQ27lpryxkRn9ahf-ok87XHXzbfqeEpt4h346U	unknown
c9cb5336-dc7f-4bec-ab94-dd00620c03d1	master-admin-1756272680518	master-client-1756272680179	2025-09-05 16:00:23.597	2025-09-04 16:00:23.598	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwMDE2MjMsImV4cCI6MTc1NzA4ODAyM30.K3RRGv2LchdpytOzjh4zhXfYAJuU3SBcH6UX8f4DYGs_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwMDE2MjMsImV4cCI6MTc1NzA4ODAyM30.K3RRGv2LchdpytOzjh4zhXfYAJuU3SBcH6UX8f4DYGs	unknown
bed495e7-fa99-464f-97df-702c9d408c09	master-admin-1756272680518	master-client-1756272680179	2025-09-06 06:17:21.379	2025-09-05 06:17:21.38	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNTMwNDEsImV4cCI6MTc1NzEzOTQ0MX0.EltXtTNAwqKivFF7ispYRR4Zj7UTaNL83jG2jinpE-8_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNTMwNDEsImV4cCI6MTc1NzEzOTQ0MX0.EltXtTNAwqKivFF7ispYRR4Zj7UTaNL83jG2jinpE-8	unknown
28a4b5e9-9378-41e2-9916-4adeacc1fc31	master-admin-1756272680518	master-client-1756272680179	2025-09-09 14:49:30.488	2025-09-08 14:49:30.489	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJzZXNzaW9uSWQiOiIzMGI0NTljZi00MDUyLTQ2NjctYmZlYi0xNzljMmNjZTNkZTQiLCJpYXQiOjE3NTczNDI5NzAsImV4cCI6MTc1NzQyOTM3MCwiYXVkIjoic2NhbjJzaGlwLXVzZXJzIiwiaXNzIjoic2NhbjJzaGlwLWIyYiJ9.Ina1v_5o-MI1z8sc8hGninjdAQrZMkgosyiBaPaxVvw_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJzZXNzaW9uSWQiOiIzMGI0NTljZi00MDUyLTQ2NjctYmZlYi0xNzljMmNjZTNkZTQiLCJpYXQiOjE3NTczNDI5NzAsImV4cCI6MTc1NzQyOTM3MCwiYXVkIjoic2NhbjJzaGlwLXVzZXJzIiwiaXNzIjoic2NhbjJzaGlwLWIyYiJ9.Ina1v_5o-MI1z8sc8hGninjdAQrZMkgosyiBaPaxVvw	unknown
dc2cb2cc-8455-4c08-8545-f87f928878e9	master-admin-1756272680518	master-client-1756272680179	2025-09-06 07:57:58.156	2025-09-05 07:57:58.157	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNTkwNzgsImV4cCI6MTc1NzE0NTQ3OH0.v6deFQEYDcKUnkOSg7Bfbjiy3T4umDkx6ekwIKfcJKg_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNTkwNzgsImV4cCI6MTc1NzE0NTQ3OH0.v6deFQEYDcKUnkOSg7Bfbjiy3T4umDkx6ekwIKfcJKg	unknown
af8a6fc7-9793-4832-9544-68cee7e360f8	master-admin-1756272680518	master-client-1756272680179	2025-09-06 09:20:42.447	2025-09-05 09:20:42.448	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNjQwNDIsImV4cCI6MTc1NzE1MDQ0Mn0.beHNt0TxtFA7JZnRoGNoaMAsRlGakDX-yAwxRxqwXj0_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNjQwNDIsImV4cCI6MTc1NzE1MDQ0Mn0.beHNt0TxtFA7JZnRoGNoaMAsRlGakDX-yAwxRxqwXj0	unknown
08d2d2dd-3a2c-43be-8c29-86f4fa961349	master-admin-1756272680518	master-client-1756272680179	2025-09-06 09:42:36.454	2025-09-05 09:42:36.455	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNjUzNTYsImV4cCI6MTc1NzE1MTc1Nn0.6B5rA2Oo7i210psF1G_ev-qirs2vbPfbMUiHfa6jX-I_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNjUzNTYsImV4cCI6MTc1NzE1MTc1Nn0.6B5rA2Oo7i210psF1G_ev-qirs2vbPfbMUiHfa6jX-I	unknown
8d7ab2fb-7e9c-4fb8-b7b6-aa8d719a5546	user-1757343058185-sycmywocb	client-1757343020924-609gdrmzj	2025-09-09 15:03:32.628	2025-09-08 15:03:32.629	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTczNDMwNTgxODUtc3ljbXl3b2NiIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzM0MzAyMDkyNC02MDlnZHJtemoiLCJlbWFpbCI6ImRpbmVzaC5wQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInNlc3Npb25JZCI6ImVmMzE2ZTUxLTk1ZGQtNGJhOS05ZWI5LWU1OTIyZTJkYzA0NiIsImlhdCI6MTc1NzM0MzgxMiwiZXhwIjoxNzU3NDMwMjEyLCJhdWQiOiJzY2FuMnNoaXAtdXNlcnMiLCJpc3MiOiJzY2FuMnNoaXAtYjJiIn0.saLow-38fwrNj48IzgSIUiATH90p1ny70NwBhpG3ryk_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3NTczNDMwNTgxODUtc3ljbXl3b2NiIiwiY2xpZW50SWQiOiJjbGllbnQtMTc1NzM0MzAyMDkyNC02MDlnZHJtemoiLCJlbWFpbCI6ImRpbmVzaC5wQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInNlc3Npb25JZCI6ImVmMzE2ZTUxLTk1ZGQtNGJhOS05ZWI5LWU1OTIyZTJkYzA0NiIsImlhdCI6MTc1NzM0MzgxMiwiZXhwIjoxNzU3NDMwMjEyLCJhdWQiOiJzY2FuMnNoaXAtdXNlcnMiLCJpc3MiOiJzY2FuMnNoaXAtYjJiIn0.saLow-38fwrNj48IzgSIUiATH90p1ny70NwBhpG3ryk	unknown
4d847bcd-07e2-4909-8c97-b2bb03af4430	master-admin-1756272680518	master-client-1756272680179	2025-09-06 12:48:25.626	2025-09-05 12:48:25.627	unknown	t	2025-09-08 22:01:18.229	\N	[]	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNzY1MDUsImV4cCI6MTc1NzE2MjkwNX0.k7a6CXKjf7RWu14maqoFZxo6TtjrPWhWN2kLnDRGUOc_refresh	\N	user	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYXN0ZXItYWRtaW4tMTc1NjI3MjY4MDUxOCIsImNsaWVudElkIjoibWFzdGVyLWNsaWVudC0xNzU2MjcyNjgwMTc5IiwiZW1haWwiOiJrYXJ0aGlrQHNjYW4yc2hpcC5pbiIsInJvbGUiOiJtYXN0ZXJfYWRtaW4iLCJpYXQiOjE3NTcwNzY1MDUsImV4cCI6MTc1NzE2MjkwNX0.k7a6CXKjf7RWu14maqoFZxo6TtjrPWhWN2kLnDRGUOc	unknown
\.


--
-- Data for Name: system_config; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.system_config (id, key, value, type, category, description, "isEncrypted", "createdAt", "updatedAt") FROM stdin;
config-1756341169293-o6xez2jqd	DELHIVERY_BASE_URL	https://track.delhivery.com	string	courier	Delhivery API base URL	f	2025-08-28 00:32:49.456	2025-08-28 00:32:49.293
config-1756341169511-vwzhg2vhw	DELHIVERY_WEBHOOK_SECRET	your_delhivery_webhook_secret_here	password	courier	Delhivery webhook secret for verification	t	2025-08-28 00:32:49.512	2025-08-28 00:32:49.511
config-1756341169533-9vy6pi657	OPENAI_API_KEY	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	password	ai	OpenAI API key for address processing and AI features	t	2025-08-28 00:32:49.534	2025-08-28 00:32:49.533
config-1756341169559-s6f93hncr	OPENAI_MODEL	gpt-4o-mini	string	ai	OpenAI model to use for AI features	f	2025-08-28 00:32:49.56	2025-08-28 00:32:49.559
config-1756341169626-4hzoggtt1	JWT_SECRET	vanitha-logistics-super-secret-jwt-key-2024	password	security	JWT secret key for authentication	t	2025-08-28 00:32:49.627	2025-08-28 00:32:49.626
config-1756341169645-17vtnmm43	NEXT_PUBLIC_APP_NAME	Vanitha Logistics - Accelerate Your Logistics	string	general	Application name displayed to users	f	2025-08-28 00:32:49.646	2025-08-28 00:32:49.645
config-1756341169673-xz0chkp0w	NEXT_PUBLIC_APP_URL	http://localhost:3000	string	general	Application base URL	f	2025-08-28 00:32:49.675	2025-08-28 00:32:49.673
config-1756341169701-y5lwk9h4k	MAX_FILE_SIZE	5242880	number	general	Maximum file upload size in bytes (5MB)	f	2025-08-28 00:32:49.702	2025-08-28 00:32:49.701
config-1756341169723-tqadu0cyh	ALLOWED_FILE_TYPES	image/jpeg,image/png,image/gif	string	general	Allowed file types for uploads	f	2025-08-28 00:32:49.724	2025-08-28 00:32:49.723
config-1756341169750-gfa4rcb33	RATE_LIMIT_WINDOW	900000	number	security	Rate limiting window in milliseconds (15 minutes)	f	2025-08-28 00:32:49.751	2025-08-28 00:32:49.75
config-1756341169777-x7aw9m28b	RATE_LIMIT_MAX_REQUESTS	100	number	security	Maximum requests per rate limit window	f	2025-08-28 00:32:49.778	2025-08-28 00:32:49.777
config-1756341169807-i39v0634j	LOG_LEVEL	info	string	general	Application log level	f	2025-08-28 00:32:49.808	2025-08-28 00:32:49.807
config-1756341169831-yoc793rky	LOG_FILE_PATH	./logs/app.log	string	general	Log file path	f	2025-08-28 00:32:49.832	2025-08-28 00:32:49.831
whatsapp-api-key	FAST2SMS_WHATSAPP_API_KEY		string	whatsapp	Fast2SMS WhatsApp API Key	f	2025-08-27 12:47:44.543	2025-08-31 12:51:00.28
whatsapp-message-id	FAST2SMS_WHATSAPP_MESSAGE_ID		string	whatsapp	Fast2SMS WhatsApp Message ID	f	2025-08-27 12:47:44.543	2025-08-31 12:51:00.28
\.


--
-- Data for Name: user_pickup_locations; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.user_pickup_locations (id, "userId", "pickupLocationId", "createdAt", "updatedAt") FROM stdin;
upl-1757337539094-dgl3aitqd	user-1757337539078-04msdp3ra	pickup-1757337470242-hdx3gdocd	2025-09-08 13:18:59.094	2025-09-08 13:18:59.094
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.users (id, email, name, password, role, "isActive", "createdAt", "updatedAt", "clientId") FROM stdin;
master-admin-1756272680518	karthik@scan2ship.in	Karthik Dintakurthi	$2b$12$b3AtZbEjq699PgoefSJAD.pEut/NhDHbgu3H1WtAXI7CbiRab2aea	master_admin	t	2025-08-27 05:31:20.518	2025-08-27 05:31:20.518	master-client-1756272680179
user-1756643951453-7h5dyb5zm	test@scan2ship.com	Test	$2b$12$PltCUlMY3/CuFdLZWBuzpeYBcCILbN9E5gHjAYw1aP/6v0QcNKnLC	user	t	2025-08-31 12:39:11.455	2025-08-31 12:39:11.453	default-client-001
user-1757076662974-d4p4qsjgk	karthik@routemaster.com	Karthik Dintakurthi	$2b$12$w7Zc5VdbW9uOzCti4n7w2OfzX4MTZieq3tRois1vFQS9RmoLojJeu	admin	t	2025-09-05 12:51:02.974	2025-09-05 12:51:02.974	client-1757058396579-m510j2d3m
user-1757078825722-uzqoqxu0l	routemastercouriercargo@gmail.com	Chandrasekhar D	$2b$12$UMq2XTzZ.JXe5soUKDWalerFKzGmwoAngkcRdeaCkrz1lKtzuwvXG	admin	t	2025-09-05 13:27:05.722	2025-09-05 13:27:05.722	client-1757058396579-m510j2d3m
user-1757337539078-04msdp3ra	info@mrship.in	Mr Ship	$2b$12$6y5WqP7FXGchqBqNET2bceDvv0zE546pp5HAVKuRLJC78yWZpTcna	child_user	t	2025-09-08 13:18:59.078	2025-09-08 13:18:59.078	client-1757058396579-m510j2d3m
user-1757343020943-peh27a6r7	dinesh@scan2ship.in	Dinesh P	$2b$12$N1g9v2fUo7gx2RG2PnwxGeEDvujCn4OwKtLCZI6Vt0vW0jn2K8Pfu	user	t	2025-09-08 14:50:20.944	2025-09-08 14:50:20.943	client-1757343020924-609gdrmzj
user-1757343058185-sycmywocb	dinesh.p@gmail.com	Dinesh P	$2b$12$wnSBlaMU02C5zzVstoisM.vxa9q5Rb74egRpWaE9DKwwc7MOpoO92	admin	t	2025-09-08 14:50:58.185	2025-09-08 14:50:58.185	client-1757343020924-609gdrmzj
\.


--
-- Data for Name: webhook_logs; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.webhook_logs (id, "webhookId", "eventType", "orderId", status, "responseCode", "responseBody", "errorMessage", "attemptCount", "createdAt") FROM stdin;
\.


--
-- Data for Name: webhooks; Type: TABLE DATA; Schema: public; Owner: karthiknaidudintakurthi
--

COPY public.webhooks (id, "clientId", name, url, events, secret, "isActive", "retryCount", timeout, headers, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: karthiknaidudintakurthi
--

SELECT pg_catalog.setval('public.orders_id_seq', 1392, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: blocked_ips blocked_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_pkey PRIMARY KEY (id);


--
-- Name: client_config client_config_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.client_config
    ADD CONSTRAINT client_config_pkey PRIMARY KEY (id);


--
-- Name: client_credit_costs client_credit_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.client_credit_costs
    ADD CONSTRAINT client_credit_costs_pkey PRIMARY KEY (id);


--
-- Name: client_credits client_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.client_credits
    ADD CONSTRAINT client_credits_pkey PRIMARY KEY (id);


--
-- Name: client_order_configs client_order_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.client_order_configs
    ADD CONSTRAINT client_order_configs_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: courier_services courier_services_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.courier_services
    ADD CONSTRAINT courier_services_pkey PRIMARY KEY (id);


--
-- Name: credit_transactions credit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT credit_transactions_pkey PRIMARY KEY (id);


--
-- Name: csrf_tokens csrf_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.csrf_tokens
    ADD CONSTRAINT csrf_tokens_pkey PRIMARY KEY (id);


--
-- Name: order_analytics order_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.order_analytics
    ADD CONSTRAINT order_analytics_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: pickup_location_order_configs pickup_location_order_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.pickup_location_order_configs
    ADD CONSTRAINT pickup_location_order_configs_pkey PRIMARY KEY (id);


--
-- Name: pickup_location_shopify_configs pickup_location_shopify_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.pickup_location_shopify_configs
    ADD CONSTRAINT pickup_location_shopify_configs_pkey PRIMARY KEY (id);


--
-- Name: pickup_locations pickup_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.pickup_locations
    ADD CONSTRAINT pickup_locations_pkey PRIMARY KEY (id);


--
-- Name: pickup_requests pickup_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.pickup_requests
    ADD CONSTRAINT pickup_requests_pkey PRIMARY KEY (id);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: user_pickup_locations user_pickup_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.user_pickup_locations
    ADD CONSTRAINT user_pickup_locations_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_clientId_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "audit_logs_clientId_idx" ON public.audit_logs USING btree ("clientId");


--
-- Name: audit_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "audit_logs_createdAt_idx" ON public.audit_logs USING btree ("createdAt");


--
-- Name: audit_logs_eventType_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "audit_logs_eventType_idx" ON public.audit_logs USING btree ("eventType");


--
-- Name: audit_logs_ipAddress_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "audit_logs_ipAddress_idx" ON public.audit_logs USING btree ("ipAddress");


--
-- Name: audit_logs_severity_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX audit_logs_severity_idx ON public.audit_logs USING btree (severity);


--
-- Name: audit_logs_tags_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX audit_logs_tags_idx ON public.audit_logs USING btree (tags);


--
-- Name: audit_logs_userId_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "audit_logs_userId_idx" ON public.audit_logs USING btree ("userId");


--
-- Name: blocked_ips_expiresAt_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "blocked_ips_expiresAt_idx" ON public.blocked_ips USING btree ("expiresAt");


--
-- Name: blocked_ips_ipAddress_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "blocked_ips_ipAddress_idx" ON public.blocked_ips USING btree ("ipAddress");


--
-- Name: blocked_ips_ipAddress_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX "blocked_ips_ipAddress_key" ON public.blocked_ips USING btree ("ipAddress");


--
-- Name: client_config_clientId_key_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX "client_config_clientId_key_key" ON public.client_config USING btree ("clientId", key);


--
-- Name: client_credit_costs_clientId_feature_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX "client_credit_costs_clientId_feature_key" ON public.client_credit_costs USING btree ("clientId", feature);


--
-- Name: client_credits_clientId_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX "client_credits_clientId_key" ON public.client_credits USING btree ("clientId");


--
-- Name: client_order_configs_clientId_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX "client_order_configs_clientId_key" ON public.client_order_configs USING btree ("clientId");


--
-- Name: clients_email_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX clients_email_key ON public.clients USING btree (email);


--
-- Name: courier_services_code_clientId_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX "courier_services_code_clientId_key" ON public.courier_services USING btree (code, "clientId");


--
-- Name: csrf_tokens_expiresAt_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "csrf_tokens_expiresAt_idx" ON public.csrf_tokens USING btree ("expiresAt");


--
-- Name: csrf_tokens_sessionId_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "csrf_tokens_sessionId_idx" ON public.csrf_tokens USING btree ("sessionId");


--
-- Name: csrf_tokens_token_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX csrf_tokens_token_idx ON public.csrf_tokens USING btree (token);


--
-- Name: csrf_tokens_token_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX csrf_tokens_token_key ON public.csrf_tokens USING btree (token);


--
-- Name: csrf_tokens_userId_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "csrf_tokens_userId_idx" ON public.csrf_tokens USING btree ("userId");


--
-- Name: order_analytics_orderId_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX "order_analytics_orderId_key" ON public.order_analytics USING btree ("orderId");


--
-- Name: pickup_location_order_configs_pickupLocationId_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX "pickup_location_order_configs_pickupLocationId_key" ON public.pickup_location_order_configs USING btree ("pickupLocationId");


--
-- Name: pickup_location_shopify_configs_clientId_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "pickup_location_shopify_configs_clientId_idx" ON public.pickup_location_shopify_configs USING btree ("clientId");


--
-- Name: pickup_location_shopify_configs_pickupLocationId_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX "pickup_location_shopify_configs_pickupLocationId_key" ON public.pickup_location_shopify_configs USING btree ("pickupLocationId");


--
-- Name: pickup_location_shopify_configs_shopifyShopDomain_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "pickup_location_shopify_configs_shopifyShopDomain_idx" ON public.pickup_location_shopify_configs USING btree ("shopifyShopDomain");


--
-- Name: pickup_locations_label_clientId_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX "pickup_locations_label_clientId_key" ON public.pickup_locations USING btree (label, "clientId");


--
-- Name: pickup_requests_clientId_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "pickup_requests_clientId_idx" ON public.pickup_requests USING btree ("clientId");


--
-- Name: pickup_requests_pickup_date_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX pickup_requests_pickup_date_idx ON public.pickup_requests USING btree (pickup_date);


--
-- Name: pickup_requests_status_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX pickup_requests_status_idx ON public.pickup_requests USING btree (status);


--
-- Name: pickup_requests_userId_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "pickup_requests_userId_idx" ON public.pickup_requests USING btree ("userId");


--
-- Name: rate_limits_expiresAt_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "rate_limits_expiresAt_idx" ON public.rate_limits USING btree ("expiresAt");


--
-- Name: rate_limits_key_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX rate_limits_key_idx ON public.rate_limits USING btree (key);


--
-- Name: rate_limits_key_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX rate_limits_key_key ON public.rate_limits USING btree (key);


--
-- Name: sessions_expiresAt_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "sessions_expiresAt_idx" ON public.sessions USING btree ("expiresAt");


--
-- Name: sessions_isActive_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "sessions_isActive_idx" ON public.sessions USING btree ("isActive");


--
-- Name: sessions_refreshToken_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "sessions_refreshToken_idx" ON public.sessions USING btree ("refreshToken");


--
-- Name: sessions_refreshToken_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX "sessions_refreshToken_key" ON public.sessions USING btree ("refreshToken");


--
-- Name: sessions_sessionToken_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "sessions_sessionToken_idx" ON public.sessions USING btree ("sessionToken");


--
-- Name: sessions_sessionToken_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX "sessions_sessionToken_key" ON public.sessions USING btree ("sessionToken");


--
-- Name: sessions_userId_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "sessions_userId_idx" ON public.sessions USING btree ("userId");


--
-- Name: system_config_key_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX system_config_key_key ON public.system_config USING btree (key);


--
-- Name: user_pickup_locations_userId_pickupLocationId_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX "user_pickup_locations_userId_pickupLocationId_key" ON public.user_pickup_locations USING btree ("userId", "pickupLocationId");


--
-- Name: users_email_clientId_key; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE UNIQUE INDEX "users_email_clientId_key" ON public.users USING btree (email, "clientId");


--
-- Name: webhook_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "webhook_logs_createdAt_idx" ON public.webhook_logs USING btree ("createdAt");


--
-- Name: webhook_logs_status_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX webhook_logs_status_idx ON public.webhook_logs USING btree (status);


--
-- Name: webhook_logs_webhookId_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "webhook_logs_webhookId_idx" ON public.webhook_logs USING btree ("webhookId");


--
-- Name: webhooks_clientId_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "webhooks_clientId_idx" ON public.webhooks USING btree ("clientId");


--
-- Name: webhooks_isActive_idx; Type: INDEX; Schema: public; Owner: karthiknaidudintakurthi
--

CREATE INDEX "webhooks_isActive_idx" ON public.webhooks USING btree ("isActive");


--
-- Name: analytics_events analytics_events_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT "analytics_events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: analytics_events analytics_events_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT "analytics_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: client_config client_config_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.client_config
    ADD CONSTRAINT "client_config_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: client_credit_costs client_credit_costs_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.client_credit_costs
    ADD CONSTRAINT "client_credit_costs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: client_credits client_credits_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.client_credits
    ADD CONSTRAINT "client_credits_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: client_order_configs client_order_configs_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.client_order_configs
    ADD CONSTRAINT "client_order_configs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: courier_services courier_services_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.courier_services
    ADD CONSTRAINT "courier_services_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: credit_transactions credit_transactions_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT "credit_transactions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: credit_transactions credit_transactions_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT "credit_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: credit_transactions credit_transactions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT "credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: order_analytics order_analytics_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.order_analytics
    ADD CONSTRAINT "order_analytics_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_analytics order_analytics_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.order_analytics
    ADD CONSTRAINT "order_analytics_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_analytics order_analytics_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.order_analytics
    ADD CONSTRAINT "order_analytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: orders orders_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pickup_location_order_configs pickup_location_order_configs_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.pickup_location_order_configs
    ADD CONSTRAINT "pickup_location_order_configs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pickup_location_order_configs pickup_location_order_configs_pickupLocationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.pickup_location_order_configs
    ADD CONSTRAINT "pickup_location_order_configs_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES public.pickup_locations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pickup_location_shopify_configs pickup_location_shopify_configs_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.pickup_location_shopify_configs
    ADD CONSTRAINT "pickup_location_shopify_configs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pickup_location_shopify_configs pickup_location_shopify_configs_pickupLocationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.pickup_location_shopify_configs
    ADD CONSTRAINT "pickup_location_shopify_configs_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES public.pickup_locations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pickup_locations pickup_locations_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.pickup_locations
    ADD CONSTRAINT "pickup_locations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pickup_requests pickup_requests_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.pickup_requests
    ADD CONSTRAINT "pickup_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pickup_requests pickup_requests_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.pickup_requests
    ADD CONSTRAINT "pickup_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sessions sessions_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sessions sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_pickup_locations user_pickup_locations_pickupLocationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.user_pickup_locations
    ADD CONSTRAINT "user_pickup_locations_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES public.pickup_locations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_pickup_locations user_pickup_locations_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.user_pickup_locations
    ADD CONSTRAINT "user_pickup_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: webhook_logs webhook_logs_webhookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT "webhook_logs_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES public.webhooks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: webhooks webhooks_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: karthiknaidudintakurthi
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT "webhooks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict M1vxnvO7HdvM3vCApzFHT1NyLVJRE5hEfarr3GyTuep1umPzVAFudRJjl4gmR3A

