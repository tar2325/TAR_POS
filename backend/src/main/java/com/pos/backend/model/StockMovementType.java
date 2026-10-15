package com.pos.backend.model;

/** Matches the frontend StockMovementType union. */
public enum StockMovementType {
    RECEIVE,
    ADJUST,
    POS_MANUAL,
    SALE
}
