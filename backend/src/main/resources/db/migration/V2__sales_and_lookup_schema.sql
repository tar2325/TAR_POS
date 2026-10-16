-- V2: Schema for Barcode Lookup Cache, Sales Orders, and Sales Items
CREATE TABLE IF NOT EXISTS barcode_lookup_cache (
    barcode        VARCHAR(64)  CONSTRAINT pk_barcode_lookup_cache PRIMARY KEY,
    status         VARCHAR(20)  NOT NULL,
    name           VARCHAR(255),
    brand          VARCHAR(255),
    quantity       VARCHAR(100),
    image_url      VARCHAR(500),
    category_hint  VARCHAR(255),
    source         VARCHAR(30),
    confidence     INTEGER,
    fetched_at     TIMESTAMP    NOT NULL DEFAULT now(),
    expires_at     TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_orders (
    id                    BIGSERIAL      CONSTRAINT pk_sale_orders PRIMARY KEY,
    receipt_no            VARCHAR(50)    NOT NULL CONSTRAINT uq_sale_orders_receipt_no UNIQUE,
    cashier_name          VARCHAR(100)   NOT NULL,
    created_by            VARCHAR(100)   NOT NULL,
    payment_method        VARCHAR(30)    NOT NULL DEFAULT 'CASH',
    received_amount       NUMERIC(12, 2) NOT NULL DEFAULT 0,
    change_amount         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    item_count            INTEGER        NOT NULL DEFAULT 0,
    subtotal              NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount              NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax                   NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total                 NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_cost            NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gross_profit          NUMERIC(12, 2) NOT NULL DEFAULT 0,
    profit_margin_percent NUMERIC(6, 2)  NOT NULL DEFAULT 0,
    created_at            TIMESTAMP      NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sale_orders_created_at ON sale_orders (created_at DESC);

CREATE TABLE IF NOT EXISTS sale_items (
    id              BIGSERIAL      CONSTRAINT pk_sale_items PRIMARY KEY,
    sale_order_id   BIGINT         NOT NULL CONSTRAINT fk_sale_items_order REFERENCES sale_orders (id) ON DELETE CASCADE,
    product_id      BIGINT         NOT NULL CONSTRAINT fk_sale_items_product REFERENCES products (id),
    product_name    VARCHAR(255)   NOT NULL,
    sku             VARCHAR(50)    NOT NULL,
    barcode         VARCHAR(64)    NOT NULL,
    category_name   VARCHAR(100),
    quantity        INTEGER        NOT NULL CHECK (quantity > 0),
    cost_price      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    price           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    line_cost       NUMERIC(12, 2) NOT NULL DEFAULT 0,
    line_total      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    line_profit     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    margin_percent  NUMERIC(6, 2)  NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sale_items_order ON sale_items (sale_order_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items (product_id);
