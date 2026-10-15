package com.pos.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pos.backend.dto.BarcodeLookupDtos;
import com.pos.backend.model.BarcodeLookupCache;
import com.pos.backend.model.Product;
import com.pos.backend.repository.BarcodeLookupCacheRepository;
import com.pos.backend.repository.ProductRepository;
import com.pos.backend.util.GtinUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class BarcodeLookupService {

    private final ProductRepository productRepository;
    private final BarcodeLookupCacheRepository cacheRepository;
    private final ObjectMapper objectMapper;

    private static final String USER_AGENT = "POS-Grocery-Thailand/1.0 (contact: pos-dev@pos.local)";
    private static final Duration TIMEOUT = Duration.ofSeconds(3);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    @Transactional
    public BarcodeLookupDtos.LookupResponse lookup(String rawBarcode, boolean forceRefresh) {
        GtinUtil.GtinValidationResult validation = GtinUtil.validate(rawBarcode);
        String barcode = validation.normalizedBarcode();

        List<BarcodeLookupDtos.RetailerLinkDto> retailerLinks = generateRetailerLinks(barcode);

        if (!validation.valid()) {
            return new BarcodeLookupDtos.LookupResponse(
                    "INVALID",
                    barcode,
                    validation.validChecksum(),
                    validation.originCountry(),
                    validation.message(),
                    null,
                    null,
                    retailerLinks
            );
        }

        // 1. Local Database Check
        Optional<Product> localProduct = productRepository.findByAnyBarcode(barcode);
        if (localProduct.isPresent()) {
            Product p = localProduct.get();
            BarcodeLookupDtos.SuggestionDto suggestion = new BarcodeLookupDtos.SuggestionDto(
                    barcode,
                    p.getName(),
                    null,
                    null,
                    p.getImageUrl(),
                    p.getCategory() != null ? p.getCategory().getName() : null,
                    "LOCAL",
                    100,
                    false
            );
            return new BarcodeLookupDtos.LookupResponse(
                    "LOCAL",
                    barcode,
                    validation.validChecksum(),
                    validation.originCountry(),
                    "พบสินค้านี้ในระบบร้านแล้ว: " + p.getName(),
                    p.getId(),
                    suggestion,
                    retailerLinks
            );
        }

        // In-store generated barcode prefix (200-299)
        if (validation.inStoreBarcode()) {
            return new BarcodeLookupDtos.LookupResponse(
                    "IN_STORE",
                    barcode,
                    validation.validChecksum(),
                    validation.originCountry(),
                    "บาร์โค้ดภายในร้าน (ขึ้นต้น 200-299) สามารถตั้งชื่อและราคาเพื่อเพิ่มเข้าระบบได้ทันที",
                    null,
                    null,
                    retailerLinks
            );
        }

        // 2. Cache Check (if not forced refresh)
        LocalDateTime now = LocalDateTime.now();
        if (!forceRefresh) {
            Optional<BarcodeLookupCache> cached = cacheRepository.findValidByBarcode(barcode, now);
            if (cached.isPresent()) {
                BarcodeLookupCache c = cached.get();
                if ("FOUND".equalsIgnoreCase(c.getStatus())) {
                    BarcodeLookupDtos.SuggestionDto suggestion = new BarcodeLookupDtos.SuggestionDto(
                            c.getBarcode(),
                            c.getName(),
                            c.getBrand(),
                            c.getQuantity(),
                            c.getImageUrl(),
                            c.getCategoryHint(),
                            "CACHE (" + c.getSource() + ")",
                            c.getConfidence() != null ? c.getConfidence() : 80,
                            "GEMINI".equalsIgnoreCase(c.getSource())
                    );
                    return new BarcodeLookupDtos.LookupResponse(
                            "FOUND",
                            barcode,
                            validation.validChecksum(),
                            validation.originCountry(),
                            "พบข้อมูลสินค้า (จากแคชระบบ): " + c.getName(),
                            null,
                            suggestion,
                            retailerLinks
                    );
                } else if ("NOT_FOUND".equalsIgnoreCase(c.getStatus())) {
                    return new BarcodeLookupDtos.LookupResponse(
                            "NOT_FOUND",
                            barcode,
                            validation.validChecksum(),
                            validation.originCountry(),
                            "ไม่พบข้อมูลสินค้าออนไลน์ (จากแคช)",
                            null,
                            null,
                            retailerLinks
                    );
                }
            }
        }

        // 3. Query Online Sources
        // Source A: Open Food Facts (Food & Drinks)
        BarcodeLookupDtos.SuggestionDto suggestion = queryOpenFacts(barcode, "https://world.openfoodfacts.org", "OFF");

        // Source B: Open Beauty Facts (Cosmetics, Personal care)
        if (suggestion == null) {
            suggestion = queryOpenFacts(barcode, "https://world.openbeautyfacts.org", "OBF");
        }

        // Source C: Open Products Facts (Household, Cleaning, Detergents)
        if (suggestion == null) {
            suggestion = queryOpenFacts(barcode, "https://world.openproductsfacts.org", "OPF");
        }

        // Source D: UPCitemdb (General merchandise fallback)
        if (suggestion == null) {
            suggestion = queryUpcItemDb(barcode);
        }

        // 4. Save to Cache and Return
        if (suggestion != null) {
            saveToCache(barcode, "FOUND", suggestion.name(), suggestion.brand(),
                    suggestion.quantity(), suggestion.imageUrl(), suggestion.categoryHint(),
                    suggestion.source(), suggestion.confidence(), now.plusDays(90));

            return new BarcodeLookupDtos.LookupResponse(
                    "FOUND",
                    barcode,
                    validation.validChecksum(),
                    validation.originCountry(),
                    "พบข้อมูลสินค้าออนไลน์: " + suggestion.name(),
                    null,
                    suggestion,
                    retailerLinks
            );
        } else {
            saveToCache(barcode, "NOT_FOUND", null, null, null, null, null,
                    "ONLINE", 0, now.plusDays(3));

            return new BarcodeLookupDtos.LookupResponse(
                    "NOT_FOUND",
                    barcode,
                    validation.validChecksum(),
                    validation.originCountry(),
                    "ไม่พบข้อมูลสินค้าออนไลน์ สามารถพิมพ์กรอกชื่อสินค้าเพื่อบันทึกเข้าสู่ระบบได้เลย",
                    null,
                    null,
                    retailerLinks
            );
        }
    }

    @Transactional
    public void recordManualLearning(String barcode, String name, String brand, String quantity, String imageUrl, String categoryHint) {
        if (barcode == null || barcode.isBlank() || name == null || name.isBlank()) return;
        String normalized = GtinUtil.normalize(barcode);
        saveToCache(normalized, "FOUND", name.trim(), brand, quantity, imageUrl, categoryHint,
                "MANUAL", 100, LocalDateTime.now().plusYears(1));
        log.info("Learned manual product for barcode: {} -> {}", normalized, name);
    }

    private BarcodeLookupDtos.SuggestionDto queryOpenFacts(String barcode, String baseUrl, String sourceLabel) {
        try {
            String url = baseUrl + "/api/v2/product/" + barcode + ".json"
                    + "?fields=code,product_name,product_name_th,generic_name,generic_name_th,brands,quantity,image_front_url,image_url,categories";

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", "application/json")
                    .timeout(TIMEOUT)
                    .GET()
                    .build();

            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) {
                return null;
            }

            JsonNode root = objectMapper.readTree(res.body());
            int status = root.path("status").asInt(0);
            if (status != 1) {
                return null;
            }

            JsonNode product = root.path("product");
            if (product.isMissingNode() || product.isNull()) {
                return null;
            }

            String nameTh = product.path("product_name_th").asText("").trim();
            String nameEn = product.path("product_name").asText("").trim();
            String genericTh = product.path("generic_name_th").asText("").trim();
            String genericEn = product.path("generic_name").asText("").trim();

            String name = !nameTh.isEmpty() ? nameTh : (!nameEn.isEmpty() ? nameEn : (!genericTh.isEmpty() ? genericTh : genericEn));
            if (name.isEmpty()) {
                return null;
            }

            String brand = product.path("brands").asText("").trim();
            String quantity = product.path("quantity").asText("").trim();
            String imageUrl = product.path("image_front_url").asText("").trim();
            if (imageUrl.isEmpty()) {
                imageUrl = product.path("image_url").asText("").trim();
            }
            String categories = product.path("categories").asText("").trim();

            int confidence = !nameTh.isEmpty() ? 95 : 85;

            return new BarcodeLookupDtos.SuggestionDto(
                    barcode,
                    name,
                    brand.isEmpty() ? null : brand,
                    quantity.isEmpty() ? null : quantity,
                    imageUrl.isEmpty() ? null : imageUrl,
                    categories.isEmpty() ? null : categories,
                    sourceLabel,
                    confidence,
                    false
            );
        } catch (Exception e) {
            log.debug("Error querying {} for barcode {}: {}", baseUrl, barcode, e.getMessage());
            return null;
        }
    }

    private BarcodeLookupDtos.SuggestionDto queryUpcItemDb(String barcode) {
        try {
            String url = "https://api.upcitemdb.com/prod/trial/lookup?upc=" + barcode;

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", "application/json")
                    .timeout(TIMEOUT)
                    .GET()
                    .build();

            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) {
                return null;
            }

            JsonNode root = objectMapper.readTree(res.body());
            int total = root.path("total").asInt(0);
            if (total <= 0) {
                return null;
            }

            JsonNode items = root.path("items");
            if (!items.isArray() || items.isEmpty()) {
                return null;
            }

            JsonNode item = items.get(0);
            String title = item.path("title").asText("").trim();
            if (title.isEmpty()) {
                return null;
            }

            String brand = item.path("brand").asText("").trim();
            String category = item.path("category").asText("").trim();

            String imageUrl = null;
            JsonNode images = item.path("images");
            if (images.isArray() && !images.isEmpty()) {
                imageUrl = images.get(0).asText("").trim();
            }

            return new BarcodeLookupDtos.SuggestionDto(
                    barcode,
                    title,
                    brand.isEmpty() ? null : brand,
                    null,
                    imageUrl,
                    category.isEmpty() ? null : category,
                    "UPCitemdb",
                    70,
                    false
            );
        } catch (Exception e) {
            log.debug("Error querying UPCitemdb for barcode {}: {}", barcode, e.getMessage());
            return null;
        }
    }

    private void saveToCache(String barcode, String status, String name, String brand,
                             String quantity, String imageUrl, String categoryHint,
                             String source, int confidence, LocalDateTime expiresAt) {
        BarcodeLookupCache cache = BarcodeLookupCache.builder()
                .barcode(barcode)
                .status(status)
                .name(name)
                .brand(brand)
                .quantity(quantity)
                .imageUrl(imageUrl)
                .categoryHint(categoryHint)
                .source(source)
                .confidence(confidence)
                .fetchedAt(LocalDateTime.now())
                .expiresAt(expiresAt)
                .build();
        cacheRepository.save(cache);
    }

    private List<BarcodeLookupDtos.RetailerLinkDto> generateRetailerLinks(String barcode) {
        List<BarcodeLookupDtos.RetailerLinkDto> links = new ArrayList<>();
        String encoded = URLEncoder.encode(barcode, StandardCharsets.UTF_8);

        links.add(new BarcodeLookupDtos.RetailerLinkDto("tops", "Tops Supermarket", "https://www.tops.co.th/th/search?query=" + encoded));
        links.add(new BarcodeLookupDtos.RetailerLinkDto("bigc", "Big C", "https://www.bigc.co.th/th/search?query=" + encoded));
        links.add(new BarcodeLookupDtos.RetailerLinkDto("lotus", "Lotus's", "https://www.lotuss.com/th/search?query=" + encoded));
        links.add(new BarcodeLookupDtos.RetailerLinkDto("makro", "Makro PRO", "https://www.makroclick.com/th/search?search_query=" + encoded));
        links.add(new BarcodeLookupDtos.RetailerLinkDto("seven", "7-Eleven All Online", "https://www.allonline.7eleven.co.th/search?keyword=" + encoded));

        return links;
    }
}
