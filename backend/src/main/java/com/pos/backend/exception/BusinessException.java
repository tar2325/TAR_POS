package com.pos.backend.exception;

/** A rule of the shop was violated (duplicate barcode, insufficient stock, ...). */
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}
