package com.pos.backend.dto;

import com.pos.backend.model.StockMovement;
import com.pos.backend.model.StockMovementType;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public final class StockDtos {
    private StockDtos() {
    }

    public record AdjustRequest(
            @NotNull Long productId,
            /** Signed delta. Must not be zero. */
            @NotNull Integer quantity,
            @NotNull StockMovementType type,
            String note) {
    }

    public record MovementResponse(
            Long id, Long productId, String productName, StockMovementType type,
            Integer quantity, Integer stockBefore, Integer stockAfter,
            String note, String createdBy, LocalDateTime createdAt) {

        public static MovementResponse from(StockMovement m) {
            return new MovementResponse(
                    m.getId(), m.getProduct().getId(), m.getProduct().getName(), m.getType(),
                    m.getQuantity(), m.getStockBefore(), m.getStockAfter(),
                    m.getNote(), m.getCreatedBy(), m.getCreatedAt());
        }
    }
}
