package com.pos.backend.controller;

import com.pos.backend.dto.AuthDtos;
import com.pos.backend.model.AppUser;
import com.pos.backend.repository.AppUserRepository;
import com.pos.backend.security.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Auth")
public class AuthController {

    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    @PostMapping("/login")
    @Operation(summary = "Login and receive a bearer token")
    public AuthDtos.LoginResponse login(@Valid @RequestBody AuthDtos.LoginRequest req) {
        AppUser user = users.findByUsername(req.username().trim())
                .filter(AppUser::getActive)
                .filter(u -> encoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"));
        return new AuthDtos.LoginResponse(jwt.issue(user), "", AuthDtos.UserDto.from(user));
    }
}
