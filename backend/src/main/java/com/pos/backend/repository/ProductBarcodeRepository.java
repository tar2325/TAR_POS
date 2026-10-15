package com.pos.backend.repository;

import com.pos.backend.model.ProductBarcode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductBarcodeRepository extends JpaRepository<ProductBarcode, Long> {
    boolean existsByBarcode(String barcode);

    boolean existsByBarcodeAndProductIdNot(String barcode, Long productId);
}
