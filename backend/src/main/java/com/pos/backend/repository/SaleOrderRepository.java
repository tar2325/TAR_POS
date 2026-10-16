package com.pos.backend.repository;

import com.pos.backend.model.SaleOrder;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SaleOrderRepository extends JpaRepository<SaleOrder, Long> {

    Optional<SaleOrder> findByReceiptNo(String receiptNo);

    boolean existsByReceiptNo(String receiptNo);

    @EntityGraph(attributePaths = {"items"})
    @Query("SELECT o FROM SaleOrder o WHERE o.receiptNo = :receiptNo")
    Optional<SaleOrder> findByReceiptNoWithItems(@Param("receiptNo") String receiptNo);

    @EntityGraph(attributePaths = {"items"})
    @Query("SELECT DISTINCT o FROM SaleOrder o WHERE o.createdAt >= :start AND o.createdAt <= :end ORDER BY o.createdAt DESC")
    List<SaleOrder> findByCreatedAtBetweenWithItems(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @EntityGraph(attributePaths = {"items"})
    @Query("SELECT DISTINCT o FROM SaleOrder o ORDER BY o.createdAt DESC")
    List<SaleOrder> findAllWithItems(Pageable pageable);
}
