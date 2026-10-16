package com.pos.backend.repository;

import com.pos.backend.model.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findByBarcode(String barcode);

    boolean existsByBarcode(String barcode);

    boolean existsBySkuIgnoreCase(String sku);

    Optional<Product> findBySkuIgnoreCase(String sku);

    boolean existsByCategoryId(Long categoryId);

    List<Product> findByCategoryId(Long categoryId);

    /** Scanner lookup: matches the primary barcode or any extra (pack) barcode. */
    @Query("""
            select p from Product p
            where p.barcode = :code
               or exists (select 1 from ProductBarcode b where b.product = p and b.barcode = :code)
            """)
    Optional<Product> findByAnyBarcode(@Param("code") String code);

    @Query("""
            select p from Product p
            where lower(p.name) like lower(concat('%', :q, '%'))
               or lower(p.sku) like lower(concat('%', :q, '%'))
               or p.barcode like concat('%', :q, '%')
            order by p.name
            """)
    List<Product> search(@Param("q") String query);

    @Query("select p from Product p where p.active = true and p.stock <= p.minStock order by p.stock asc, p.name")
    List<Product> findLowStock();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);
}
