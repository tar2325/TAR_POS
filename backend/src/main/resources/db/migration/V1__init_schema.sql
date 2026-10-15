-- V1: core schema for the grocery POS.
-- The early prototype created a Hibernate-generated "products" table with sample coffee-shop
-- data. Keep it under another name instead of dropping it (explicit constraint names below
-- avoid clashes with the legacy table's indexes).
ALTER TABLE IF EXISTS products RENAME TO legacy_products;

CREATE TABLE categories (
    id          BIGSERIAL    CONSTRAINT pk_categories PRIMARY KEY,
    name        VARCHAR(100) NOT NULL CONSTRAINT uq_categories_name UNIQUE,
    icon        VARCHAR(50)  NOT NULL DEFAULT 'apps',
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order  INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE products (
    id          BIGSERIAL      CONSTRAINT pk_products PRIMARY KEY,
    sku         VARCHAR(50)    NOT NULL CONSTRAINT uq_products_sku UNIQUE,
    barcode     VARCHAR(64)    NOT NULL CONSTRAINT uq_products_barcode UNIQUE,
    name        VARCHAR(255)   NOT NULL,
    price       NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    cost_price  NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    category_id BIGINT         NOT NULL CONSTRAINT fk_products_category REFERENCES categories (id),
    image_url   VARCHAR(500),
    stock       INTEGER        NOT NULL DEFAULT 0 CONSTRAINT ck_products_stock CHECK (stock >= 0),
    min_stock   INTEGER        NOT NULL DEFAULT 0,
    active      BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP      NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_name_lower ON products (lower(name));

-- Additional barcodes per product (e.g. pack / carton codes). The primary one lives on products.barcode.
CREATE TABLE product_barcodes (
    id          BIGSERIAL   CONSTRAINT pk_product_barcodes PRIMARY KEY,
    product_id  BIGINT      NOT NULL CONSTRAINT fk_barcodes_product REFERENCES products (id) ON DELETE CASCADE,
    barcode     VARCHAR(64) NOT NULL CONSTRAINT uq_product_barcodes_barcode UNIQUE,
    pack_qty    INTEGER     NOT NULL DEFAULT 1 CHECK (pack_qty >= 1)
);
CREATE INDEX idx_product_barcodes_product ON product_barcodes (product_id);

-- Stock ledger: every change to products.stock has exactly one row here.
CREATE TABLE stock_movements (
    id           BIGSERIAL    CONSTRAINT pk_stock_movements PRIMARY KEY,
    product_id   BIGINT       NOT NULL CONSTRAINT fk_movements_product REFERENCES products (id),
    type         VARCHAR(20)  NOT NULL,
    quantity     INTEGER      NOT NULL CHECK (quantity <> 0),
    stock_before INTEGER      NOT NULL,
    stock_after  INTEGER      NOT NULL,
    note         VARCHAR(255),
    created_by   VARCHAR(100) NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX idx_movements_product_created ON stock_movements (product_id, created_at DESC);
CREATE INDEX idx_movements_created ON stock_movements (created_at DESC);

CREATE TABLE app_users (
    id            BIGSERIAL    CONSTRAINT pk_app_users PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL CONSTRAINT uq_app_users_username UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'CASHIER')),
    active        BOOLEAN      NOT NULL DEFAULT TRUE
);
