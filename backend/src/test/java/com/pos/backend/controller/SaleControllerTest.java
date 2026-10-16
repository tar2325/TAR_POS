package com.pos.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pos.backend.dto.SaleDtos;
import com.pos.backend.model.AppUser;
import com.pos.backend.model.Category;
import com.pos.backend.model.Product;
import com.pos.backend.model.UserRole;
import com.pos.backend.repository.*;
import com.pos.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SaleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SaleOrderRepository saleOrderRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private ProductBarcodeRepository productBarcodeRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    private String cashierToken;
    private Product sampleProduct;

    @BeforeEach
    void setUp() {
        saleOrderRepository.deleteAll();
        stockMovementRepository.deleteAll();
        productBarcodeRepository.deleteAll();
        productRepository.deleteAll();
        categoryRepository.deleteAll();
        userRepository.deleteAll();

        AppUser cashier = AppUser.builder()
                .username("cashier_tester")
                .passwordHash("hashed")
                .displayName("แคชเชียร์ทดสอบ")
                .role(UserRole.CASHIER)
                .active(true)
                .build();
        userRepository.save(cashier);
        cashierToken = jwtService.issue(cashier);

        Category category = categoryRepository.save(Category.builder()
                .name("เครื่องดื่ม")
                .icon("local_cafe")
                .sortOrder(1)
                .active(true)
                .build());

        sampleProduct = productRepository.save(Product.builder()
                .sku("TEST-P001")
                .barcode("8850000000001")
                .name("ชามะนาวเย็น")
                .price(BigDecimal.valueOf(50.0))
                .costPrice(BigDecimal.valueOf(30.0))
                .category(category)
                .stock(20)
                .minStock(5)
                .active(true)
                .build());
    }

    @Test
    @DisplayName("POST /sales records a sale, calculates profit correctly, and deducts inventory")
    void shouldCheckoutSuccessfully() throws Exception {
        SaleDtos.CreateSaleRequest req = new SaleDtos.CreateSaleRequest(
                "RCP-TEST-100",
                "แคชเชียร์ทดสอบ",
                "CASH",
                BigDecimal.valueOf(200.0),
                BigDecimal.valueOf(100.0),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                List.of(new SaleDtos.CreateSaleItemRequest(sampleProduct.getId(), 2, null))
        );

        mockMvc.perform(post("/sales")
                        .header("Authorization", "Bearer " + cashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.receiptNo", is("RCP-TEST-100")))
                .andExpect(jsonPath("$.total").value(100.0))
                .andExpect(jsonPath("$.totalCost").value(60.0))
                .andExpect(jsonPath("$.grossProfit").value(40.0))
                .andExpect(jsonPath("$.profitMarginPercent").value(40.0))
                .andExpect(jsonPath("$.itemCount", is(2)))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].productName", is("ชามะนาวเย็น")));

        // Verify stock is deducted in database: 20 - 2 = 18
        Product updated = productRepository.findById(sampleProduct.getId()).orElseThrow();
        assertEquals(18, updated.getStock());
    }

    @Test
    @DisplayName("POST /sales with excessive quantity fails with 409 conflict and preserves stock")
    void shouldFailWhenStockInsufficient() throws Exception {
        SaleDtos.CreateSaleRequest req = new SaleDtos.CreateSaleRequest(
                "RCP-TEST-OVERSELL",
                "แคชเชียร์ทดสอบ",
                "CASH",
                null, null, null, null,
                List.of(new SaleDtos.CreateSaleItemRequest(sampleProduct.getId(), 25, null))
        );

        mockMvc.perform(post("/sales")
                        .header("Authorization", "Bearer " + cashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("สต็อกไม่พอ")));

        // Verify stock is untouched
        Product updated = productRepository.findById(sampleProduct.getId()).orElseThrow();
        assertEquals(20, updated.getStock());
        assertEquals(0, saleOrderRepository.count());
    }

    @Test
    @DisplayName("GET /sales/summary returns aggregated sales KPIs and best-selling products")
    void shouldReturnDailySalesSummary() throws Exception {
        // Record a sale first
        SaleDtos.CreateSaleRequest req = new SaleDtos.CreateSaleRequest(
                "RCP-TEST-SUMMARY",
                "แคชเชียร์ทดสอบ",
                "CASH",
                null, null, null, null,
                List.of(new SaleDtos.CreateSaleItemRequest(sampleProduct.getId(), 3, null))
        );

        mockMvc.perform(post("/sales")
                        .header("Authorization", "Bearer " + cashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/sales/summary?period=today")
                        .header("Authorization", "Bearer " + cashierToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date", is("วันนี้")))
                .andExpect(jsonPath("$.orderCount", is(1)))
                .andExpect(jsonPath("$.totalItemsSold", is(3)))
                .andExpect(jsonPath("$.totalRevenue").value(150.0))
                .andExpect(jsonPath("$.totalCost").value(90.0))
                .andExpect(jsonPath("$.grossProfit").value(60.0))
                .andExpect(jsonPath("$.products", hasSize(1)))
                .andExpect(jsonPath("$.products[0].productName", is("ชามะนาวเย็น")))
                .andExpect(jsonPath("$.products[0].quantitySold", is(3)));
    }
}
