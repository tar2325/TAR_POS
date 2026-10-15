CREATE TABLE barcode_lookup_cache (
    barcode       VARCHAR(64) PRIMARY KEY,
    status        VARCHAR(20) NOT NULL,
    name          VARCHAR(255),
    brand         VARCHAR(150),
    quantity      VARCHAR(50),
    image_url     VARCHAR(500),
    category_hint VARCHAR(255),
    source        VARCHAR(30),
    confidence    SMALLINT,
    fetched_at    TIMESTAMP NOT NULL DEFAULT now(),
    expires_at    TIMESTAMP NOT NULL
);

CREATE INDEX idx_barcode_cache_expires ON barcode_lookup_cache (expires_at);
