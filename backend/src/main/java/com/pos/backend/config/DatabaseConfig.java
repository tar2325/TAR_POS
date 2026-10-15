package com.pos.backend.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

/**
 * Automatically parses cloud database connection strings (e.g. Render, Railway, Supabase)
 * which frequently provide URLs in 'postgres://' or 'postgresql://' format instead of JDBC.
 * Also configures conservative HikariCP pool parameters for 512MB RAM cloud free tiers
 * and provides fallback resolution across multiple cloud environment variables.
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
            if (isInMemoryAllowed()) {
                log.warn("==========================================================================================");
                log.warn("WARNING: No cloud PostgreSQL database configured! Initializing DEMO in-memory H2 database.");
                log.warn("Data will NOT persist across restarts. To use persistent PostgreSQL, configure SPRING_DATASOURCE_URL.");
                log.warn("==========================================================================================");
                HikariConfig h2Config = new HikariConfig();
                h2Config.setJdbcUrl("jdbc:h2:mem:pos_db;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1");
                h2Config.setUsername("sa");
                h2Config.setPassword("");
                h2Config.setDriverClassName("org.h2.Driver");
                h2Config.setMaximumPoolSize(2);
                return new HikariDataSource(h2Config);
            }

            log.error("==========================================================================================");
            log.error("CRITICAL ERROR: No database connection URL provided!");
            log.error("Please add the environment variable 'SPRING_DATASOURCE_URL' in your Render Web Service.");
            log.error("Value should be your PostgreSQL Internal Database URL (e.g. postgres://pos_user:...@dpg-.../pos_db)");
            log.error("Alternatively, set environment variable 'ALLOW_IN_MEMORY_DB=true' for temporary demo mode.");
            log.error("==========================================================================================");
            throw new IllegalStateException(
                    "Missing environment variable: 'SPRING_DATASOURCE_URL'. " +
                    "Please configure it in Render Dashboard -> pos-backend -> Environment. " +
                    "(Or set ALLOW_IN_MEMORY_DB=true for demo mode without PostgreSQL)");
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
                log.info("Initialized Cloud DataSource with JDBC URL: {}", jdbcUrl);
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

    private boolean isInMemoryAllowed() {
        String env = System.getenv("ALLOW_IN_MEMORY_DB");
        if (env != null && env.equalsIgnoreCase("true")) {
            return true;
        }
        String prop = System.getProperty("allow.in.memory.db");
        return prop != null && prop.equalsIgnoreCase("true");
    }
}
