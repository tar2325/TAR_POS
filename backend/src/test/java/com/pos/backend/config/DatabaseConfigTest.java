package com.pos.backend.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DatabaseConfigTest {

    @Test
    @DisplayName("Should convert postgres:// URL to standard jdbc:postgresql URL with credentials")
    void shouldConvertStandardCloudPostgresUrl() {
        String cloudUrl = "postgres://pos_user:secret_pass@dpg-abc12345:5432/pos_db";
        DatabaseConfig.JdbcSettings settings = DatabaseConfig.toJdbcSettings(cloudUrl, "defaultUser", "defaultPass");

        assertEquals("jdbc:postgresql://dpg-abc12345:5432/pos_db?sslmode=prefer", settings.jdbcUrl());
        assertEquals("pos_user", settings.username());
        assertEquals("secret_pass", settings.password());
        assertEquals("org.postgresql.Driver", settings.driverClassName());
    }

    @Test
    @DisplayName("Should preserve query parameters from cloud URL")
    void shouldPreserveQueryParameters() {
        String cloudUrl = "postgresql://my_user:my_pwd@cloud-host.render.com:5433/sample_db?sslmode=require&targetServerType=primary";
        DatabaseConfig.JdbcSettings settings = DatabaseConfig.toJdbcSettings(cloudUrl, "", "");

        assertEquals("jdbc:postgresql://cloud-host.render.com:5433/sample_db?sslmode=require&targetServerType=primary", settings.jdbcUrl());
        assertEquals("my_user", settings.username());
        assertEquals("my_pwd", settings.password());
        assertEquals("org.postgresql.Driver", settings.driverClassName());
    }

    @Test
    @DisplayName("Should detect H2 driver when URL starts with jdbc:h2:")
    void shouldSelectH2Driver() {
        String h2Url = "jdbc:h2:mem:pos_db;MODE=PostgreSQL";
        DatabaseConfig.JdbcSettings settings = DatabaseConfig.toJdbcSettings(h2Url, "sa", "");

        assertEquals(h2Url, settings.jdbcUrl());
        assertEquals("sa", settings.username());
        assertEquals("", settings.password());
        assertEquals("org.h2.Driver", settings.driverClassName());
    }

    @Test
    @DisplayName("Should fall back to default credentials when URL has no user info")
    void shouldFallbackToDefaultsWhenNoUserInfo() {
        String jdbcUrl = "jdbc:postgresql://localhost:5432/pos_db";
        DatabaseConfig.JdbcSettings settings = DatabaseConfig.toJdbcSettings(jdbcUrl, "local_user", "local_pass");

        assertEquals(jdbcUrl, settings.jdbcUrl());
        assertEquals("local_user", settings.username());
        assertEquals("local_pass", settings.password());
        assertEquals("org.postgresql.Driver", settings.driverClassName());
    }
}
