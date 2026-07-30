-- Migration: rename customer schema → people, rename customers table → persons
-- Prisma cannot generate this automatically (schema moves are not supported by Prisma migrate diff).
-- This migration is applied manually via prisma migrate resolve after running the SQL directly.

-- Step 1: create the target schema
CREATE SCHEMA IF NOT EXISTS people;

-- Step 2: move all tables from customer → people
ALTER TABLE customer.customers            SET SCHEMA people;
ALTER TABLE customer.lifecycle_history    SET SCHEMA people;
ALTER TABLE customer.tags                 SET SCHEMA people;
ALTER TABLE customer.person_tags          SET SCHEMA people;
ALTER TABLE customer.person_roles         SET SCHEMA people;
ALTER TABLE customer.households           SET SCHEMA people;
ALTER TABLE customer.household_members    SET SCHEMA people;
ALTER TABLE customer.person_relationships SET SCHEMA people;

-- Step 3: rename customers → persons
ALTER TABLE people.customers RENAME TO persons;

-- Step 4: the customer schema should now be empty — drop it
-- (verify no other objects remain before running this line)
DROP SCHEMA customer;
