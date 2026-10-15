package com.pos.backend.dto;

import java.util.List;

public final class BarcodeLookupDtos {
    private BarcodeLookupDtos() {
    }

    public record LookupResponse(
            String status,            // FOUND, LOCAL, NOT_FOUND, INVALID, IN_STORE
            String barcode,
            boolean validChecksum,
            String originCountry,
            String message,
            Long localProductId,
            SuggestionDto suggestion,
            List<RetailerLinkDto> retailerLinks
    ) {
    }

    public record SuggestionDto(
            String barcode,
            String name,
            String brand,
            String quantity,
            String imageUrl,
            String categoryHint,
            String source,            // LOCAL, CACHE, OFF, OBF, OPF, UPCITEMDB, GEMINI, MANUAL
            int confidence,           // 0 - 100
            boolean aiGenerated
    ) {
    }

    public record RetailerLinkDto(
            String id,
            String name,
            String url
    ) {
    }
}
