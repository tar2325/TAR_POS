package com.pos.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pos.backend.dto.AuthDtos;
import com.pos.backend.model.AppUser;
import com.pos.backend.model.UserRole;
import com.pos.backend.repository.AppUserRepository;
import com.pos.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private AppUser testUser;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        testUser = AppUser.builder()
                .username("testadmin")
                .passwordHash(passwordEncoder.encode("secret123"))
                .displayName("Test Admin")
                .role(UserRole.ADMIN)
                .active(true)
                .build();
        testUser = userRepository.save(testUser);
    }

    @Test
    @DisplayName("POST /auth/login with valid credentials returns 200 and JWT token")
    void shouldLoginSuccessfully() throws Exception {
        AuthDtos.LoginRequest req = new AuthDtos.LoginRequest("testadmin", "secret123");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", not(emptyOrNullString())))
                .andExpect(jsonPath("$.user.username", is("testadmin")))
                .andExpect(jsonPath("$.user.role", is("ADMIN")));
    }

    @Test
    @DisplayName("POST /auth/login with wrong password returns 401 Unauthorized")
    void shouldFailWithWrongPassword() throws Exception {
        AuthDtos.LoginRequest req = new AuthDtos.LoginRequest("testadmin", "wrongpassword");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /auth/login with non-existent user returns 401 Unauthorized")
    void shouldFailWithNonExistentUser() throws Exception {
        AuthDtos.LoginRequest req = new AuthDtos.LoginRequest("nonexistent", "secret123");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /auth/login with blank fields returns 400 Bad Request")
    void shouldFailValidationWithBlankFields() throws Exception {
        AuthDtos.LoginRequest req = new AuthDtos.LoginRequest("", "");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /auth/me with valid Bearer token returns current user profile")
    void shouldReturnCurrentUserProfileWhenAuthenticated() throws Exception {
        String token = jwtService.issue(testUser);

        mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("testadmin")))
                .andExpect(jsonPath("$.displayName", is("Test Admin")))
                .andExpect(jsonPath("$.role", is("ADMIN")));
    }

    @Test
    @DisplayName("GET /auth/me without token returns 401 Unauthorized")
    void shouldReturnUnauthorizedWhenNoToken() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized());
    }
}
