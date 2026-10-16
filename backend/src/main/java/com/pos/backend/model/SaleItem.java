package com.pos.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "sale_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaleItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sale_order_id", nullable = false)
    private SaleOrder saleOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(nullable = false, length = 50)
    private String sku;

    @Column(nullable = false, length = 64)
    private String barcode;

    @Column(name = "category_name", length = 100)
    private String categoryName;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "cost_price", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal costPrice = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    @Column(name = "line_cost", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal lineCost = BigDecimal.ZERO;

    @Column(name = "line_total", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal lineTotal = BigDecimal.ZERO;

    @Column(name = "line_profit", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal lineProfit = BigDecimal.ZERO;

    @Column(name = "margin_percent", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal marginPercent = BigDecimal.ZERO;
}
