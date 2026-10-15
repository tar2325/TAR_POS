package com.pos.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BarcodeDto(
        @NotBlank @Size(max = 64) String barcode,
        @Min(1) Integer packQty) {
}
