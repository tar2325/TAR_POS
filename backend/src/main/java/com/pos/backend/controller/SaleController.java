package com.pos.backend.controller;

import com.pos.backend.dto.SaleDtos;
import com.pos.backend.service.SaleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/sales")
@RequiredArgsConstructor
@Tag(name = "Sales", description = "POS Checkout, order history, and daily sales/profit summary")
public class SaleController {

    private final SaleService saleService;

    @PostMapping
    @Operation(summary = "Checkout and record a sale order from POS terminal")
    public ResponseEntity<SaleDtos.SaleOrderResponse> checkout(
            @Valid @RequestBody SaleDtos.CreateSaleRequest request,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "cashier";
        SaleDtos.SaleOrderResponse response = saleService.checkout(request, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "List recent sales orders")
    public List<SaleDtos.SaleOrderResponse> list(
            @RequestParam(defaultValue = "100") int limit
    ) {
        return saleService.list(limit);
    }

    @GetMapping("/{receiptNo}")
    @Operation(summary = "Get a sale order by receipt number")
    public SaleDtos.SaleOrderResponse getByReceiptNo(@PathVariable String receiptNo) {
        return saleService.getByReceiptNo(receiptNo);
    }

    @GetMapping("/summary")
    @Operation(summary = "Get sales and profit summary aggregated by period")
    public SaleDtos.DailySalesSummaryResponse summary(
            @RequestParam(defaultValue = "today") String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return saleService.getSummary(period, startDate, endDate);
    }
}
