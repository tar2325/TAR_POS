package com.pos.backend.service;

import com.pos.backend.dto.StockDtos;
import com.pos.backend.exception.BusinessException;
import com.pos.backend.exception.NotFoundException;
import com.pos.backend.model.Product;
import com.pos.backend.model.StockMovement;
import com.pos.backend.model.StockMovementType;
import com.pos.backend.repository.ProductRepository;
import com.pos.backend.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * The only place allowed to change {@link Product#getStock()}. Every change writes a ledger row
 * in the same transaction, and the product row is locked so concurrent sales cannot oversell.
 */
@Service
@RequiredArgsConstructor
public class StockService {

    private final ProductRepository productRepository;
    private final StockMovementRepository movementRepository;

    @Transactional
    public StockMovement apply(Long productId, int delta, StockMovementType type, String note, String username) {
        if (delta == 0) {
            throw new BusinessException("จำนวนต้องไม่เป็นศูนย์");
        }
        Product product = productRepository.findByIdForUpdate(productId)
                .orElseThrow(() -> new NotFoundException("ไม่พบสินค้า id: " + productId));

        int before = product.getStock();
        int after = before + delta;
        if (after < 0) {
            throw new BusinessException("สต็อกไม่พอ (" + product.getName() + " คงเหลือ " + before + ")");
        }
        product.setStock(after);
        productRepository.save(product);

        return movementRepository.save(StockMovement.builder()
                .product(product)
                .type(type)
                .quantity(delta)
                .stockBefore(before)
                .stockAfter(after)
                .note(note)
                .createdBy(username)
                .build());
    }

    @Transactional(readOnly = true)
    public List<StockDtos.MovementResponse> recentMovements(Long productId, int limit) {
        PageRequest page = PageRequest.of(0, Math.min(Math.max(limit, 1), 500));
        List<StockMovement> rows = productId == null
                ? movementRepository.findAllByOrderByCreatedAtDescIdDesc(page)
                : movementRepository.findByProductIdOrderByCreatedAtDescIdDesc(productId, page);
        return rows.stream().map(StockDtos.MovementResponse::from).toList();
    }
}
