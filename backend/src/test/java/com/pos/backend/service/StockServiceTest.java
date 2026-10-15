package com.pos.backend.service;

import com.pos.backend.exception.BusinessException;
import com.pos.backend.exception.NotFoundException;
import com.pos.backend.model.Product;
import com.pos.backend.model.StockMovement;
import com.pos.backend.model.StockMovementType;
import com.pos.backend.repository.ProductRepository;
import com.pos.backend.repository.StockMovementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StockServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private StockMovementRepository movementRepository;

    @InjectMocks
    private StockService stockService;

    private Product mockProduct;

    @BeforeEach
    void setUp() {
        mockProduct = Product.builder()
                .id(10L)
                .sku("P010")
                .barcode("8851234567890")
                .name("น้ำดื่ม 600ml")
                .price(BigDecimal.valueOf(10.0))
                .costPrice(BigDecimal.valueOf(6.0))
                .stock(20)
                .minStock(5)
                .active(true)
                .build();
    }

    @Test
    @DisplayName("Should throw BusinessException when delta is zero")
    void shouldThrowWhenDeltaZero() {
        BusinessException ex = assertThrows(BusinessException.class, () ->
                stockService.apply(10L, 0, StockMovementType.MANUAL_ADD, "Zero test", "tester")
        );
        assertEquals("จำนวนต้องไม่เป็นศูนย์", ex.getMessage());
        verifyNoInteractions(productRepository, movementRepository);
    }

    @Test
    @DisplayName("Should throw NotFoundException when product id does not exist")
    void shouldThrowWhenProductNotFound() {
        when(productRepository.findByIdForUpdate(999L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () ->
                stockService.apply(999L, 5, StockMovementType.MANUAL_ADD, "Test", "tester")
        );
        verify(movementRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw BusinessException when stock would become negative (oversell)")
    void shouldThrowWhenStockInsufficient() {
        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(mockProduct));

        // Current stock is 20, requesting -25
        BusinessException ex = assertThrows(BusinessException.class, () ->
                stockService.apply(10L, -25, StockMovementType.SALE, "Sale test", "cashier1")
        );
        assertTrue(ex.getMessage().contains("สต็อกไม่พอ"));
        verify(productRepository, never()).save(any());
        verify(movementRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should successfully deduct stock on SALE and record movement ledger")
    void shouldSuccessfullyDeductStockOnSale() {
        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(mockProduct));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(movementRepository.save(any(StockMovement.class))).thenAnswer(invocation -> invocation.getArgument(0));

        StockMovement result = stockService.apply(10L, -5, StockMovementType.SALE, "บิล 001", "cashier1");

        assertNotNull(result);
        assertEquals(15, mockProduct.getStock());
        assertEquals(20, result.getStockBefore());
        assertEquals(15, result.getStockAfter());
        assertEquals(-5, result.getQuantity());
        assertEquals(StockMovementType.SALE, result.getType());
        assertEquals("cashier1", result.getCreatedBy());

        verify(productRepository, times(1)).save(mockProduct);
        verify(movementRepository, times(1)).save(any(StockMovement.class));
    }

    @Test
    @DisplayName("Should successfully increase stock on RESTOCK")
    void shouldSuccessfullyIncreaseStockOnRestock() {
        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(mockProduct));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(movementRepository.save(any(StockMovement.class))).thenAnswer(invocation -> invocation.getArgument(0));

        StockMovement result = stockService.apply(10L, 50, StockMovementType.RESTOCK, "เติมของ", "manager1");

        assertNotNull(result);
        assertEquals(70, mockProduct.getStock());
        assertEquals(20, result.getStockBefore());
        assertEquals(70, result.getStockAfter());
        assertEquals(50, result.getQuantity());

        verify(productRepository, times(1)).save(mockProduct);
    }
}
