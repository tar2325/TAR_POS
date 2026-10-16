package com.pos.backend.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.util.List;

public final class ProductDtos {
    private ProductDtos() {
    }

    public record BulkProductRow(
            @NotBlank String sku,
            String barcode,
            @NotBlank String name,
            String categoryName,
            BigDecimal price,
            BigDecimal costPrice,
            Integer stock,
            Integer minStock
    ) {
    }

    public record BulkImportRequest(
            Long defaultCategoryId,
            List<BulkProductRow> rows
    ) {
    }

    public record BulkImportResponse(
            int created,
            List<String> errors,
            List<ProductResponse> products
    ) {
    }
}
