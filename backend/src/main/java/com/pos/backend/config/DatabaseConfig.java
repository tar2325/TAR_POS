package com.pos.backend.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

/**
 * Automatically parses cloud database connection strings (e.g. Render, Railway, Supabase)
 * which frequently provide URLs in 'postgres://' or 'postgresql://' format instead of JDBC.
 * Also configures conservative HikariCP pool parameters for 512MB RAM cloud free tiers.
 */
@Configuration
@Slf4j
public class DatabaseConfig {

    @Value("${spring.datasource.url:${DATABASE_URL:}}")
    private String rawUrl;

    @Value("${spring.datasource.username:}")
    private String defaultUsername;

    @Value("${spring.datasource.password:}")
    private String defaultPassword;

    @Bean
    @Primary
    @ConditionalOnProperty(name = "spring.datasource.url")
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        
        // Conservative pool sizing for 512MB RAM cloud environments
        config.setMaximumPoolSize(4);
        config.setMinimumIdle(1);
        config.setConnectionTimeout(30000);
        config.setInitializationFailTimeout(60000);
        config.setLeakDetectionThreshold(20000);

        if (rawUrl != null && !rawUrl.isBlank()) {
            String trimmedUrl = rawUrl.trim();
            // If URL is in standard cloud postgres:// format without jdbc: prefix
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
        }

        if (defaultUsername != null && !defaultUsername.isBlank()) {
            config.setUsername(defaultUsername);
            config.setPassword(defaultPassword);
        }
        config.setDriverClassName("org.postgresql.Driver");
        return new HikariDataSource(config);
    }
}
