package com.pos.backend.controller;

import com.pos.backend.dto.ProductRequest;
import com.pos.backend.dto.ProductResponse;
import com.pos.backend.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
@Tag(name = "Products", description = "Product management endpoints for POS inventory")
public class ProductController {

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "List products, optionally filtered by name / SKU / barcode")
    public List<ProductResponse> list(@RequestParam(required = false, name = "q") String q) {
        return productService.list(q);
    }

    @GetMapping("/{id}")
    public ProductResponse get(@PathVariable Long id) {
        return productService.get(id);
    }

    @GetMapping({"/scan/{code}", "/barcode/{code}"})
    @Operation(summary = "Scanner lookup (primary or pack barcode, active products only)")
    public ProductResponse scan(@PathVariable String code) {
        return productService.scan(code);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(request, auth.getName()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return productService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Delete a product (deactivates it if it has stock history)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
