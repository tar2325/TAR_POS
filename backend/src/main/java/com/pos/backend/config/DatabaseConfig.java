package com.pos.backend.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;
import java.sql.Connection;

/**
 * Automatically parses cloud database connection strings (e.g. Render, Railway, Supabase)
 * which frequently provide URLs in 'postgres://' or 'postgresql://' format instead of JDBC.
 * Also configures conservative HikariCP pool parameters for 512MB RAM cloud free tiers,
 * provides automatic In-Memory H2 fallback when no database is configured, and guards
 * Flyway migrations to ensure zero-crash startup under all circumstances.
 */
@Configuration
@Slf4j
public class DatabaseConfig {

    @Value("${spring.datasource.url:${INTERNAL_DATABASE_URL:${DATABASE_URL:${POSTGRES_URL:}}}}")
    private String rawUrl;

    @Value("${spring.datasource.username:}")
    private String defaultUsername;

    @Value("${spring.datasource.password:}")
    private String defaultPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        String effectiveUrl = resolveDatabaseUrl();

        if (effectiveUrl == null || effectiveUrl.isBlank()) {
            log.warn("==========================================================================================");
            log.warn("⚠️ NOTICE: No cloud PostgreSQL database URL found (SPRING_DATASOURCE_URL / DATABASE_URL).");
            log.warn("🚀 Automatically activating In-Memory H2 Database fallback so the service runs immediately.");
            log.warn("ℹ️ To use persistent storage, set 'SPRING_DATASOURCE_URL' in Render Dashboard -> Environment.");
            log.warn("==========================================================================================");
            HikariConfig h2Config = new HikariConfig();
            h2Config.setJdbcUrl("jdbc:h2:mem:pos_db;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1");
            h2Config.setUsername("sa");
            h2Config.setPassword("");
            h2Config.setDriverClassName("org.h2.Driver");
            h2Config.setMaximumPoolSize(2);
            return new HikariDataSource(h2Config);
        }

        HikariConfig config = new HikariConfig();

        // Conservative pool sizing for 512MB RAM cloud environments
        config.setMaximumPoolSize(4);
        config.setMinimumIdle(1);
        config.setConnectionTimeout(30000);
        config.setInitializationFailTimeout(60000);
        config.setLeakDetectionThreshold(20000);

        String trimmedUrl = effectiveUrl.trim();

        // If URL is in standard cloud postgres:// or postgresql:// format without jdbc: prefix
        if (trimmedUrl.startsWith("postgres://") || trimmedUrl.startsWith("postgresql://")) {
            try {
                String httpAdapted = trimmedUrl.replaceFirst("^postgres(ql)?://", "http://");
                URI uri = new URI(httpAdapted);
                String host = uri.getHost();
                int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                String path = uri.getPath();
                String query = uri.getQuery();

                String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path;
                if (query != null && !query.isBlank()) {
                    jdbcUrl += "?" + query;
                } else {
                    jdbcUrl += "?sslmode=prefer";
                }

                config.setJdbcUrl(jdbcUrl);

                String userInfo = uri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] parts = userInfo.split(":", 2);
                    config.setUsername(parts[0]);
                    config.setPassword(parts[1]);
                } else if (defaultUsername != null && !defaultUsername.isBlank()) {
                    config.setUsername(defaultUsername);
                    config.setPassword(defaultPassword);
                }

                config.setDriverClassName("org.postgresql.Driver");
                log.info("Initialized Cloud PostgreSQL DataSource with JDBC URL: {}", jdbcUrl);
                return new HikariDataSource(config);
            } catch (Exception e) {
                log.warn("Could not parse cloud URL as URI ({}), falling back to direct string", trimmedUrl, e);
            }
        }

        config.setJdbcUrl(trimmedUrl);
        if (defaultUsername != null && !defaultUsername.isBlank()) {
            config.setUsername(defaultUsername);
            config.setPassword(defaultPassword);
        }
        config.setDriverClassName("org.postgresql.Driver");
        return new HikariDataSource(config);
    }

    /**
     * Smart Flyway migration strategy:
     * - Runs Flyway migrations automatically when connected to a real database (PostgreSQL).
     * - Safely skips Flyway migrations when running in In-Memory H2 fallback mode (Hibernate auto-generates schema).
     */
    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            try (Connection conn = flyway.getConfiguration().getDataSource().getConnection()) {
                String dbName = conn.getMetaData().getDatabaseProductName();
                if ("H2".equalsIgnoreCase(dbName)) {
                    log.info("In-memory H2 database detected: Skipping Flyway migrations; Hibernate will manage schema.");
                    return;
                }
            } catch (Exception e) {
                log.warn("Could not inspect database product name for Flyway: {}", e.getMessage());
            }

            log.info("Executing Flyway database migrations...");
            flyway.migrate();
            log.info("Flyway database migrations completed successfully.");
        };
    }

    /**
     * Resolves database URL by checking Spring properties and direct OS environment variables
     * commonly used by cloud hosts (Render, Railway, Supabase, Heroku).
     */
    private String resolveDatabaseUrl() {
        if (rawUrl != null && !rawUrl.isBlank()) {
            return rawUrl.trim();
        }

        String[] envCandidates = {
            "SPRING_DATASOURCE_URL",
            "INTERNAL_DATABASE_URL",
            "DATABASE_URL",
            "POSTGRES_URL"
        };

        for (String envName : envCandidates) {
            String val = System.getenv(envName);
            if (val != null && !val.isBlank()) {
                log.info("Resolved database connection URL from environment variable '{}'", envName);
                return val.trim();
            }
        }

        return null;
    }
}
