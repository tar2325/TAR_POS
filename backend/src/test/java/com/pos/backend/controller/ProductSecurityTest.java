package com.pos.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pos.backend.dto.ProductRequest;
import com.pos.backend.model.AppUser;
import com.pos.backend.model.UserRole;
import com.pos.backend.security.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProductSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("GET /products without JWT token returns 401 Unauthorized")
    void shouldDenyUnauthenticatedAccess() throws Exception {
        mockMvc.perform(get("/products"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /products with CASHIER role returns 403 Forbidden")
    void shouldDenyProductCreationForCashier() throws Exception {
        AppUser cashier = AppUser.builder()
                .id(99L)
                .username("cashier_user")
                .role(UserRole.CASHIER)
                .build();
        String cashierToken = jwtService.issue(cashier);

        ProductRequest req = new ProductRequest(
                "SKU-TEST-01",
                "885999900001",
                "Test Item",
                BigDecimal.valueOf(25.0),
                BigDecimal.valueOf(15.0),
                1L,
                null,
                10,
                5,
                null
        );

        mockMvc.perform(post("/products")
                        .header("Authorization", "Bearer " + cashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }
}
