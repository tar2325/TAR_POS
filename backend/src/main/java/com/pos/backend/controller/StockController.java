package com.pos.backend.controller;

import com.pos.backend.dto.ProductResponse;
import com.pos.backend.dto.StockDtos;
import com.pos.backend.exception.BusinessException;
import com.pos.backend.model.StockMovementType;
import com.pos.backend.service.ProductService;
import com.pos.backend.service.StockService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/stock")
@RequiredArgsConstructor
@Tag(name = "Stock")
public class StockController {

    private final StockService stockService;
    private final ProductService productService;

    @PostMapping("/adjust")
    @Operation(summary = "Receive / adjust stock (signed quantity). RECEIVE and ADJUST need manager+.")
    public ProductResponse adjust(@Valid @RequestBody StockDtos.AdjustRequest r, Authentication auth) {
        if (r.type() == StockMovementType.SALE) {
            throw new BusinessException("ประเภท SALE ใช้ผ่านระบบขายเท่านั้น");
        }
        boolean privileged = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_MANAGER"));
        if (r.type() != StockMovementType.POS_MANUAL && !privileged) {
            throw new org.springframework.security.access.AccessDeniedException("forbidden");
        }
        stockService.apply(r.productId(), r.quantity(), r.type(), r.note(), auth.getName());
        return productService.get(r.productId());
    }

    @GetMapping("/movements")
    public List<StockDtos.MovementResponse> movements(
            @RequestParam(required = false) Long productId,
            @RequestParam(defaultValue = "100") int limit) {
        return stockService.recentMovements(productId, limit);
    }

    @GetMapping("/alerts")
    @Operation(summary = "Active products at or below their minimum stock")
    public List<ProductResponse> alerts() {
        return productService.lowStock();
    }
}
