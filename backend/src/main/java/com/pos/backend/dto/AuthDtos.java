package com.pos.backend.dto;

import com.pos.backend.model.AppUser;
import com.pos.backend.model.UserRole;
import jakarta.validation.constraints.NotBlank;

public final class AuthDtos {
    private AuthDtos() {
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    public record UserDto(Long id, String username, String displayName, UserRole role) {
        public static UserDto from(AppUser u) {
            return new UserDto(u.getId(), u.getUsername(), u.getDisplayName(), u.getRole());
        }
    }

    /** Shape matches the frontend LoginResponse. refreshToken is reserved for a later phase. */
    public record LoginResponse(String accessToken, String refreshToken, UserDto user) {
    }
}
