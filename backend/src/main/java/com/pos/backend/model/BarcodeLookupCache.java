package com.pos.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "barcode_lookup_cache")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BarcodeLookupCache {

    @Id
    @Column(length = 64)
    private String barcode;

    @Column(nullable = false, length = 20)
    private String status; // FOUND or NOT_FOUND

    private String name;

    private String brand;

    private String quantity;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "category_hint")
    private String categoryHint;

    @Column(length = 30)
    private String source;

    private Integer confidence;

    @Column(name = "fetched_at", nullable = false)
    private LocalDateTime fetchedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
