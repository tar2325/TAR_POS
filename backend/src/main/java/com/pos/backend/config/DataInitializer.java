package com.pos.backend.config;

import com.pos.backend.model.*;
import com.pos.backend.repository.AppUserRepository;
import com.pos.backend.repository.CategoryRepository;
import com.pos.backend.repository.ProductRepository;
import com.pos.backend.service.StockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.List;

/** Dev-profile seed data: demo accounts, categories and a few grocery products. */
@Configuration
@Profile({"dev", "prod"})
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final AppUserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final StockService stockService;
    private final PasswordEncoder encoder;

    @Override
    public void run(String... args) {
        seedUsers();
        if (categoryRepository.count() == 0) {
            seedCatalog();
        }
    }

    private void seedUsers() {
        if (userRepository.count() > 0) {
            return;
        }
        userRepository.saveAll(List.of(
                user("admin", "admin123", "ผู้ดูแลระบบ", UserRole.ADMIN),
                user("manager", "manager123", "ผู้จัดการ", UserRole.MANAGER),
                user("cashier", "cashier123", "พนักงานขาย", UserRole.CASHIER)));
        log.info("Seeded demo users (admin / manager / cashier). DEV ONLY - change before production.");
    }

    private AppUser user(String username, String password, String displayName, UserRole role) {
        return AppUser.builder().username(username).passwordHash(encoder.encode(password))
                .displayName(displayName).role(role).build();
    }

    private void seedCatalog() {
        Category drinks = cat("เครื่องดื่ม", "local_cafe", 1);
        Category bakery = cat("เบเกอรี่", "bakery_dining", 2);
        Category dry = cat("อาหารแห้ง", "ramen_dining", 3);
        Category fresh = cat("ของสด", "egg_alt", 4);
        Category snack = cat("ขนม", "cookie", 5);
        cat("ของใช้ส่วนตัว", "soap", 6);
        cat("ของใช้ในบ้าน", "cleaning_services", 7);

        prod("P001", "8851234567890", "น้ำดื่ม 600ml", "10", "6", drinks, 120, 20);
        prod("P002", "8851234567891", "ขนมปังไส้ครีม", "25", "17", bakery, 45, 10);
        prod("P003", "8851234567892", "กาแฟสำเร็จรูป", "35", "24", drinks, 0, 15);
        prod("P004", "8851234567893", "มาม่าต้มยำ", "15", "11", dry, 5, 10);
        prod("P005", "8851234567894", "ไข่ไก่ (แผง)", "45", "36", fresh, 30, 5);
        prod("P006", "8851234567895", "โค้ก 325ml", "15", "10", drinks, 80, 20);
        prod("P007", "8851234567896", "ครัวซองต์", "30", "19", bakery, 22, 8);
        prod("P008", "8851234567897", "ข้าวสาร 5 กก.", "165", "140", dry, 18, 5);
        prod("P009", "8851234567898", "นมสด 1 ลิตร", "42", "34", fresh, 35, 10);
        prod("P010", "8851234567899", "ช็อกโกแลตบาร์", "20", "13", snack, 60, 15);
        log.info("Seeded demo categories and products.");
    }

    private Category cat(String name, String icon, int order) {
        return categoryRepository.save(Category.builder().name(name).icon(icon).sortOrder(order).build());
    }

    private void prod(String sku, String barcode, String name, String price, String cost,
                      Category category, int stock, int minStock) {
        Product p = productRepository.save(Product.builder()
                .sku(sku).barcode(barcode).name(name)
                .price(new BigDecimal(price)).costPrice(new BigDecimal(cost))
                .category(category).minStock(minStock).build());
        if (stock > 0) {
            stockService.apply(p.getId(), stock, StockMovementType.RECEIVE, "สต็อกเริ่มต้น", "system");
        }
    }
}
