package com.pos.backend.security;

import com.pos.backend.model.AppUser;
import com.pos.backend.model.UserRole;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private static final String VALID_SECRET = "super-secret-key-that-is-at-least-32-bytes-long-123456";

    @Test
    @DisplayName("Should throw IllegalStateException if secret is less than 32 bytes")
    void shouldThrowIfSecretTooShort() {
        assertThrows(IllegalStateException.class, () -> new JwtService("short-secret", 60));
    }

    @Test
    @DisplayName("Should issue and parse token with correct subject and role claim")
    void shouldIssueAndParseValidToken() {
        JwtService jwtService = new JwtService(VALID_SECRET, 60);

        AppUser user = AppUser.builder()
                .id(1L)
                .username("testadmin")
                .role(UserRole.ADMIN)
                .build();

        String token = jwtService.issue(user);
        assertNotNull(token);
        assertFalse(token.isBlank());

        Optional<Claims> claimsOpt = jwtService.parse(token);
        assertTrue(claimsOpt.isPresent());

        Claims claims = claimsOpt.get();
        assertEquals("testadmin", claims.getSubject());
        assertEquals("ADMIN", claims.get("role", String.class));
    }

    @Test
    @DisplayName("Should return empty Optional for malformed or invalid token")
    void shouldReturnEmptyForInvalidToken() {
        JwtService jwtService = new JwtService(VALID_SECRET, 60);
        Optional<Claims> claimsOpt = jwtService.parse("invalid.token.here");
        assertTrue(claimsOpt.isEmpty());
    }

    @Test
    @DisplayName("Should return empty Optional when token signed by different secret")
    void shouldRejectTokenWithDifferentSecret() {
        JwtService issuer = new JwtService(VALID_SECRET, 60);
        JwtService verifier = new JwtService("another-completely-different-32-byte-secret-key-xyz", 60);

        AppUser user = AppUser.builder()
                .id(2L)
                .username("cashier1")
                .role(UserRole.CASHIER)
                .build();

        String token = issuer.issue(user);
        Optional<Claims> claimsOpt = verifier.parse(token);
        assertTrue(claimsOpt.isEmpty());
    }
}
