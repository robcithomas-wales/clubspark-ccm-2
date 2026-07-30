-- Baseline for the "commerce" schema.
--
-- Generated with pg_dump from the pilot database on 2026-07-30 and squashed to a
-- single migration. The previous history could not build a database from empty:
-- six services had no migrations at all (their tables were created by
-- `prisma db push`, which records nothing), and booking/venue's "init" migrations
-- ALTERed tables that nothing ever created.
--
-- pg_dump rather than `prisma migrate diff` because Prisma cannot represent
-- exclusion constraints, CHECK constraints, triggers or functions. This database
-- has 1, 40, 26 and 11 of those respectively — including the EXCLUDE constraint
-- that is the atomic guard against double-booking. A Prisma-generated baseline
-- silently dropped it.
--
-- Replaying this into an empty database is verified by CI on every PR.



--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3 (Homebrew)

--
-- Name: commerce; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS commerce;

--
-- Name: OrderStatus; Type: TYPE; Schema: commerce; Owner: -
--

CREATE TYPE commerce."OrderStatus" AS ENUM (
    'pending',
    'confirmed',
    'cancelled',
    'refunded'
);

--
-- Name: order_items; Type: TABLE; Schema: commerce; Owner: -
--

CREATE TABLE commerce.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    product_type text NOT NULL,
    product_id uuid,
    description text NOT NULL,
    unit_amount integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    total_amount integer NOT NULL,
    metadata jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: orders; Type: TABLE; Schema: commerce; Owner: -
--

CREATE TABLE commerce.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    organisation_id uuid,
    person_id uuid,
    status commerce."OrderStatus" DEFAULT 'pending'::commerce."OrderStatus" NOT NULL,
    currency character(3) DEFAULT 'GBP'::bpchar NOT NULL,
    total_amount integer NOT NULL,
    subject_type text,
    subject_id uuid,
    idempotency_key text,
    metadata jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: prices; Type: TABLE; Schema: commerce; Owner: -
--

CREATE TABLE commerce.prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    product_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character(3) DEFAULT 'GBP'::bpchar NOT NULL,
    member_amount numeric(10,2),
    price_type text DEFAULT 'standard'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: products; Type: TABLE; Schema: commerce; Owner: -
--

CREATE TABLE commerce.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    organisation_id uuid,
    name text NOT NULL,
    description text,
    product_type text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: commerce; Owner: -
--

ALTER TABLE ONLY commerce.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);

--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: commerce; Owner: -
--

ALTER TABLE ONLY commerce.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

--
-- Name: prices prices_pkey; Type: CONSTRAINT; Schema: commerce; Owner: -
--

ALTER TABLE ONLY commerce.prices
    ADD CONSTRAINT prices_pkey PRIMARY KEY (id);

--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: commerce; Owner: -
--

ALTER TABLE ONLY commerce.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);

--
-- Name: order_items_order_id_idx; Type: INDEX; Schema: commerce; Owner: -
--

CREATE INDEX order_items_order_id_idx ON commerce.order_items USING btree (order_id);

--
-- Name: order_items_tenant_id_idx; Type: INDEX; Schema: commerce; Owner: -
--

CREATE INDEX order_items_tenant_id_idx ON commerce.order_items USING btree (tenant_id);

--
-- Name: order_items_tenant_id_product_type_product_id_idx; Type: INDEX; Schema: commerce; Owner: -
--

CREATE INDEX order_items_tenant_id_product_type_product_id_idx ON commerce.order_items USING btree (tenant_id, product_type, product_id);

--
-- Name: orders_idempotency_key_key; Type: INDEX; Schema: commerce; Owner: -
--

CREATE UNIQUE INDEX orders_idempotency_key_key ON commerce.orders USING btree (idempotency_key);

--
-- Name: orders_tenant_id_idx; Type: INDEX; Schema: commerce; Owner: -
--

CREATE INDEX orders_tenant_id_idx ON commerce.orders USING btree (tenant_id);

--
-- Name: orders_tenant_id_organisation_id_idx; Type: INDEX; Schema: commerce; Owner: -
--

CREATE INDEX orders_tenant_id_organisation_id_idx ON commerce.orders USING btree (tenant_id, organisation_id);

--
-- Name: orders_tenant_id_person_id_idx; Type: INDEX; Schema: commerce; Owner: -
--

CREATE INDEX orders_tenant_id_person_id_idx ON commerce.orders USING btree (tenant_id, person_id);

--
-- Name: orders_tenant_id_status_idx; Type: INDEX; Schema: commerce; Owner: -
--

CREATE INDEX orders_tenant_id_status_idx ON commerce.orders USING btree (tenant_id, status);

--
-- Name: orders_tenant_id_subject_type_subject_id_idx; Type: INDEX; Schema: commerce; Owner: -
--

CREATE INDEX orders_tenant_id_subject_type_subject_id_idx ON commerce.orders USING btree (tenant_id, subject_type, subject_id);

--
-- Name: prices_product_id_idx; Type: INDEX; Schema: commerce; Owner: -
--

CREATE INDEX prices_product_id_idx ON commerce.prices USING btree (product_id);

--
-- Name: prices_tenant_id_idx; Type: INDEX; Schema: commerce; Owner: -
--

CREATE INDEX prices_tenant_id_idx ON commerce.prices USING btree (tenant_id);

--
-- Name: prices_tenant_id_is_active_idx; Type: INDEX; Schema: commerce; Owner: -
--

CREATE INDEX prices_tenant_id_is_active_idx ON commerce.prices USING btree (tenant_id, is_active);

--
-- Name: products_tenant_id_idx; Type: INDEX; Schema: commerce; Owner: -
--

CREATE INDEX products_tenant_id_idx ON commerce.products USING btree (tenant_id);

--
-- Name: products_tenant_id_is_active_idx; Type: INDEX; Schema: commerce; Owner: -
--

CREATE INDEX products_tenant_id_is_active_idx ON commerce.products USING btree (tenant_id, is_active);

--
-- Name: products_tenant_id_product_type_idx; Type: INDEX; Schema: commerce; Owner: -
--

CREATE INDEX products_tenant_id_product_type_idx ON commerce.products USING btree (tenant_id, product_type);

--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: commerce; Owner: -
--

ALTER TABLE ONLY commerce.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES commerce.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: commerce; Owner: -
--

ALTER TABLE ONLY commerce.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES commerce.products(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: prices prices_product_id_fkey; Type: FK CONSTRAINT; Schema: commerce; Owner: -
--

ALTER TABLE ONLY commerce.prices
    ADD CONSTRAINT prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES commerce.products(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--

