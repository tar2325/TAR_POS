package com.pos.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;

public record ProductRequest(
        @NotBlank @Size(max = 50) String sku,
        /** Leave blank to auto-generate an internal EAN-13 barcode. */
        @Size(max = 64) @Pattern(regexp = "^[0-9A-Za-z\\-]*$", message = "บาร์โค้ดต้องเป็นตัวอักษร/ตัวเลขเท่านั้น") String barcode,
        @NotBlank @Size(max = 255) String name,
        @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal price,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal costPrice,
        @NotNull Long categoryId,
        @Size(max = 500) String imageUrl,
        /** Initial stock when creating. Ignored on update (use the stock endpoints). */
        @Min(0) Integer stock,
        @Min(0) Integer minStock,
        Boolean active,
        @Valid List<BarcodeDto> extraBarcodes) {
}
