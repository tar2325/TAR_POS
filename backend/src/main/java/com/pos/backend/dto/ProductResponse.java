package com.pos.backend.dto;

import com.pos.backend.model.Product;

import java.math.BigDecimal;
import java.util.List;

public record ProductResponse(
        Long id,
        String sku,
        String barcode,
        String name,
        BigDecimal price,
        BigDecimal costPrice,
        Long categoryId,
        String imageUrl,
        Integer stock,
        Integer minStock,
        Boolean active,
        List<BarcodeDto> extraBarcodes) {

    public static ProductResponse from(Product p) {
        return new ProductResponse(
                p.getId(), p.getSku(), p.getBarcode(), p.getName(), p.getPrice(), p.getCostPrice(),
                p.getCategory().getId(), p.getImageUrl(), p.getStock(), p.getMinStock(), p.getActive(),
                p.getExtraBarcodes().stream().map(b -> new BarcodeDto(b.getBarcode(), b.getPackQty())).toList());
    }
}
