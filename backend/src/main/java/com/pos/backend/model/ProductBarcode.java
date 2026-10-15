package com.pos.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "product_barcodes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductBarcode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, unique = true, length = 64)
    private String barcode;

    /** Units contained in one scan of this barcode (e.g. 12 for a carton). */
    @Column(name = "pack_qty", nullable = false)
    @Builder.Default
    private Integer packQty = 1;
}
