package com.pos.backend.repository;

import com.pos.backend.model.StockMovement;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    @EntityGraph(attributePaths = "product")
    List<StockMovement> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);

    @EntityGraph(attributePaths = "product")
    List<StockMovement> findByProductIdOrderByCreatedAtDescIdDesc(Long productId, Pageable pageable);

    boolean existsByProductId(Long productId);
}
