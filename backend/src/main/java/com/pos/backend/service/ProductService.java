package com.pos.backend.service;

import com.pos.backend.dto.BarcodeDto;
import com.pos.backend.dto.ProductRequest;
import com.pos.backend.dto.ProductResponse;
import com.pos.backend.exception.BusinessException;
import com.pos.backend.exception.NotFoundException;
import com.pos.backend.model.Product;
import com.pos.backend.model.ProductBarcode;
import com.pos.backend.model.StockMovementType;
import com.pos.backend.repository.ProductBarcodeRepository;
import com.pos.backend.repository.ProductRepository;
import com.pos.backend.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductBarcodeRepository barcodeRepository;
    private final StockMovementRepository movementRepository;
    private final CategoryService categoryService;
    private final StockService stockService;
    private final com.pos.backend.repository.BarcodeLookupCacheRepository cacheRepository;

    @Transactional(readOnly = true)
    public List<ProductResponse> list(String query) {
        List<Product> rows = (query == null || query.isBlank())
                ? productRepository.findAll()
                : productRepository.search(query.trim());
        return rows.stream().map(ProductResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse get(Long id) {
        return ProductResponse.from(find(id));
    }

    /** Scanner lookup. Only active products can be sold. */
    @Transactional(readOnly = true)
    public ProductResponse scan(String code) {
        return productRepository.findByAnyBarcode(code.trim())
                .filter(Product::getActive)
                .map(ProductResponse::from)
                .orElseThrow(() -> new NotFoundException("ไม่พบสินค้าบาร์โค้ด " + code));
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> lowStock() {
        return productRepository.findLowStock().stream().map(ProductResponse::from).toList();
    }

    @Transactional
    public ProductResponse create(ProductRequest r, String username) {
        String sku = r.sku().trim();
        if (productRepository.existsBySkuIgnoreCase(sku)) {
            throw new BusinessException("SKU \"" + sku + "\" ถูกใช้แล้ว");
        }
        String barcode = r.barcode() == null || r.barcode().isBlank()
                ? generateBarcode(sku)
                : r.barcode().trim();
        assertBarcodeFree(barcode, null);

        Product p = Product.builder()
                .sku(sku)
                .barcode(barcode)
                .name(r.name().trim())
                .price(r.price())
                .costPrice(r.costPrice() == null ? BigDecimal.ZERO : r.costPrice())
                .category(categoryService.find(r.categoryId()))
                .imageUrl(blankToNull(r.imageUrl()))
                .stock(0)
                .minStock(r.minStock() == null ? 0 : r.minStock())
                .active(r.active() == null || r.active())
                .build();
        applyExtraBarcodes(p, r.extraBarcodes(), barcode);
        p = productRepository.save(p);

        int initial = r.stock() == null ? 0 : r.stock();
        if (initial > 0) {
            stockService.apply(p.getId(), initial, StockMovementType.RECEIVE, "สต็อกเริ่มต้น", username);
            p = find(p.getId());
        }
        learnToCache(p);
        return ProductResponse.from(p);
    }

    @Transactional
    public ProductResponse update(Long id, ProductRequest r) {
        Product p = find(id);
        String sku = r.sku().trim();
        if (!p.getSku().equalsIgnoreCase(sku) && productRepository.existsBySkuIgnoreCase(sku)) {
            throw new BusinessException("SKU \"" + sku + "\" ถูกใช้แล้ว");
        }
        String barcode = r.barcode() == null || r.barcode().isBlank() ? p.getBarcode() : r.barcode().trim();
        assertBarcodeFree(barcode, p.getId());

        p.setSku(sku);
        p.setBarcode(barcode);
        p.setName(r.name().trim());
        p.setPrice(r.price());
        if (r.costPrice() != null) {
            p.setCostPrice(r.costPrice());
        }
        p.setCategory(categoryService.find(r.categoryId()));
        p.setImageUrl(blankToNull(r.imageUrl()));
        if (r.minStock() != null) {
            p.setMinStock(r.minStock());
        }
        if (r.active() != null) {
            p.setActive(r.active());
        }
        // stock is intentionally NOT updated here: it only changes through StockService.
        if (r.extraBarcodes() != null) {
            applyExtraBarcodes(p, r.extraBarcodes(), barcode);
        }
        Product saved = productRepository.save(p);
        learnToCache(saved);
        return ProductResponse.from(saved);
    }

    private void learnToCache(Product p) {
        try {
            cacheRepository.save(com.pos.backend.model.BarcodeLookupCache.builder()
                    .barcode(p.getBarcode())
                    .status("FOUND")
                    .name(p.getName())
                    .imageUrl(p.getImageUrl())
                    .categoryHint(p.getCategory() != null ? p.getCategory().getName() : null)
                    .source("MANUAL")
                    .confidence(100)
                    .fetchedAt(java.time.LocalDateTime.now())
                    .expiresAt(java.time.LocalDateTime.now().plusYears(1))
                    .build());
        } catch (Exception ignored) {
        }
    }

    /** Products with history are deactivated (receipts/ledger must stay intact); others are removed. */
    @Transactional
    public void delete(Long id) {
        Product p = find(id);
        if (movementRepository.existsByProductId(id)) {
            p.setActive(false);
            productRepository.save(p);
        } else {
            productRepository.delete(p);
        }
    }

    private Product find(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("ไม่พบสินค้า id: " + id));
    }

    private void applyExtraBarcodes(Product p, List<BarcodeDto> dtos, String primary) {
        List<BarcodeDto> wanted = dtos == null ? List.of() : dtos;
        Set<String> seen = new HashSet<>();
        seen.add(primary);
        for (BarcodeDto d : wanted) {
            String code = d.barcode().trim();
            if (!seen.add(code)) {
                throw new BusinessException("บาร์โค้ด " + code + " ซ้ำในรายการ");
            }
            assertBarcodeFree(code, p.getId());
        }
        Set<String> wantedCodes = new HashSet<>();
        wanted.forEach(d -> wantedCodes.add(d.barcode().trim()));
        p.getExtraBarcodes().removeIf(b -> !wantedCodes.contains(b.getBarcode()));
        for (BarcodeDto d : wanted) {
            String code = d.barcode().trim();
            int pack = d.packQty() == null ? 1 : d.packQty();
            ProductBarcode existing = p.getExtraBarcodes().stream()
                    .filter(b -> b.getBarcode().equals(code)).findFirst().orElse(null);
            if (existing != null) {
                existing.setPackQty(pack);
            } else {
                p.getExtraBarcodes().add(ProductBarcode.builder().product(p).barcode(code).packQty(pack).build());
            }
        }
    }

    /** A code may not exist as another product's primary barcode or as anyone else's extra barcode. */
    private void assertBarcodeFree(String code, Long ownProductId) {
        boolean clashPrimary = productRepository.findByBarcode(code)
                .map(other -> !other.getId().equals(ownProductId)).orElse(false);
        boolean clashExtra = ownProductId == null
                ? barcodeRepository.existsByBarcode(code)
                : barcodeRepository.existsByBarcodeAndProductIdNot(code, ownProductId);
        if (clashPrimary || clashExtra) {
            throw new BusinessException("บาร์โค้ด " + code + " ถูกใช้แล้ว");
        }
    }

    /** Internal EAN-13 (prefix 200 = in-store use) derived from SKU digits, random fallback. */
    private String generateBarcode(String sku) {
        String digits = sku.replaceAll("\\D", "");
        for (int attempt = 0; attempt < 50; attempt++) {
            String body = attempt == 0 && !digits.isEmpty()
                    ? String.format("%9s", digits.length() > 9 ? digits.substring(digits.length() - 9) : digits).replace(' ', '0')
                    : String.format("%09d", ThreadLocalRandom.current().nextInt(1_000_000_000));
            String code = "200" + body;
            code = code + ean13CheckDigit(code);
            if (!productRepository.existsByBarcode(code) && !barcodeRepository.existsByBarcode(code)) {
                return code;
            }
        }
        throw new BusinessException("สร้างบาร์โค้ดไม่สำเร็จ กรุณาลองใหม่");
    }

    static int ean13CheckDigit(String first12) {
        int sum = 0;
        for (int i = 0; i < 12; i++) {
            int d = first12.charAt(i) - '0';
            sum += (i % 2 == 0) ? d : d * 3;
        }
        return (10 - (sum % 10)) % 10;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
