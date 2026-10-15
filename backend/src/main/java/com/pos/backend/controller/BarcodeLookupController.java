package com.pos.backend.controller;

import com.pos.backend.dto.BarcodeLookupDtos;
import com.pos.backend.service.BarcodeLookupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/lookup")
@RequiredArgsConstructor
@Tag(name = "Barcode Lookup", description = "Online & Local barcode search and metadata suggestion")
public class BarcodeLookupController {

    private final BarcodeLookupService lookupService;

    @GetMapping("/barcode/{code}")
    @Operation(summary = "Lookup barcode details online (Open Food/Beauty/Products Facts, UPCitemdb, Cache)")
    public ResponseEntity<BarcodeLookupDtos.LookupResponse> lookup(
            @PathVariable String code,
            @RequestParam(defaultValue = "false") boolean refresh) {
        BarcodeLookupDtos.LookupResponse response = lookupService.lookup(code, refresh);
        return ResponseEntity.ok(response);
    }
}
