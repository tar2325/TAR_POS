package com.pos.backend.service;

import com.pos.backend.dto.SaleDtos;
import com.pos.backend.exception.BusinessException;
import com.pos.backend.exception.NotFoundException;
import com.pos.backend.model.Product;
import com.pos.backend.model.SaleItem;
import com.pos.backend.model.SaleOrder;
import com.pos.backend.model.StockMovementType;
import com.pos.backend.repository.ProductRepository;
import com.pos.backend.repository.SaleOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SaleService {

    private final SaleOrderRepository saleOrderRepository;
    private final ProductRepository productRepository;
    private final StockService stockService;

    @Transactional
    public SaleDtos.SaleOrderResponse checkout(SaleDtos.CreateSaleRequest req, String username) {
        String receiptNo = (req.receiptNo() != null && !req.receiptNo().isBlank())
                ? req.receiptNo().trim()
                : "RCP-" + System.currentTimeMillis();

        if (saleOrderRepository.existsByReceiptNo(receiptNo)) {
            receiptNo = receiptNo + "-" + UUID.randomUUID().toString().substring(0, 4);
        }

        String cashier = (req.cashierName() != null && !req.cashierName().isBlank())
                ? req.cashierName().trim()
                : username;

        String paymentMethod = (req.paymentMethod() != null && !req.paymentMethod().isBlank())
                ? req.paymentMethod().trim()
                : "CASH";

        BigDecimal discount = req.discount() != null ? req.discount() : BigDecimal.ZERO;
        BigDecimal tax = req.tax() != null ? req.tax() : BigDecimal.ZERO;

        SaleOrder order = SaleOrder.builder()
                .receiptNo(receiptNo)
                .cashierName(cashier)
                .createdBy(username)
                .paymentMethod(paymentMethod)
                .receivedAmount(req.receivedAmount() != null ? req.receivedAmount() : BigDecimal.ZERO)
                .changeAmount(req.changeAmount() != null ? req.changeAmount() : BigDecimal.ZERO)
                .discount(discount)
                .tax(tax)
                .createdAt(LocalDateTime.now())
                .build();

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalCost = BigDecimal.ZERO;
        int totalItemCount = 0;

        for (SaleDtos.CreateSaleItemRequest itemReq : req.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> new NotFoundException("ไม่พบสินค้า id: " + itemReq.productId()));

            if (!Boolean.TRUE.equals(product.getActive())) {
                throw new BusinessException("สินค้า \"" + product.getName() + "\" ปิดการใช้งานอยู่");
            }

            int qty = itemReq.quantity();
            if (qty <= 0) {
                throw new BusinessException("จำนวนสินค้าต้องมากกว่า 0");
            }

            // Atomically deduct inventory & record movement via StockService
            stockService.apply(
                    product.getId(),
                    -qty,
                    StockMovementType.SALE,
                    "ขายสินค้า บิล " + receiptNo,
                    username
            );

            BigDecimal price = itemReq.price() != null ? itemReq.price() : product.getPrice();
            BigDecimal costPrice = product.getCostPrice() != null ? product.getCostPrice() : BigDecimal.ZERO;

            BigDecimal lineCost = costPrice.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineProfit = lineTotal.subtract(lineCost).setScale(2, RoundingMode.HALF_UP);
            BigDecimal marginPercent = lineTotal.compareTo(BigDecimal.ZERO) > 0
                    ? lineProfit.divide(lineTotal, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            String categoryName = product.getCategory() != null ? product.getCategory().getName() : null;

            SaleItem item = SaleItem.builder()
                    .product(product)
                    .productName(product.getName())
                    .sku(product.getSku())
                    .barcode(product.getBarcode())
                    .categoryName(categoryName)
                    .quantity(qty)
                    .costPrice(costPrice)
                    .price(price)
                    .lineCost(lineCost)
                    .lineTotal(lineTotal)
                    .lineProfit(lineProfit)
                    .marginPercent(marginPercent)
                    .build();

            order.addItem(item);

            subtotal = subtotal.add(lineTotal);
            totalCost = totalCost.add(lineCost);
            totalItemCount += qty;
        }

        BigDecimal total = subtotal.subtract(discount).add(tax).setScale(2, RoundingMode.HALF_UP);
        BigDecimal grossProfit = total.subtract(totalCost).setScale(2, RoundingMode.HALF_UP);
        BigDecimal profitMarginPercent = total.compareTo(BigDecimal.ZERO) > 0
                ? grossProfit.divide(total, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        order.setItemCount(totalItemCount);
        order.setSubtotal(subtotal);
        order.setTotal(total);
        order.setTotalCost(totalCost);
        order.setGrossProfit(grossProfit);
        order.setProfitMarginPercent(profitMarginPercent);

        SaleOrder saved = saleOrderRepository.save(order);
        log.info("Sale recorded: receiptNo={}, total={}, items={}", saved.getReceiptNo(), saved.getTotal(), saved.getItemCount());
        return SaleDtos.SaleOrderResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<SaleDtos.SaleOrderResponse> list(int limit) {
        PageRequest page = PageRequest.of(0, Math.min(Math.max(limit, 1), 500));
        return saleOrderRepository.findAllWithItems(page).stream()
                .map(SaleDtos.SaleOrderResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public SaleDtos.SaleOrderResponse getByReceiptNo(String receiptNo) {
        return saleOrderRepository.findByReceiptNoWithItems(receiptNo)
                .map(SaleDtos.SaleOrderResponse::from)
                .orElseThrow(() -> new NotFoundException("ไม่พบใบเสร็จเลขที่: " + receiptNo));
    }

    @Transactional(readOnly = true)
    public SaleDtos.DailySalesSummaryResponse getSummary(String period, LocalDate customStart, LocalDate customEnd) {
        LocalDate today = LocalDate.now();
        LocalDateTime start;
        LocalDateTime end;
        String dateLabel;

        String mode = (period != null && !period.isBlank()) ? period.toLowerCase().trim() : "today";

        switch (mode) {
            case "yesterday" -> {
                LocalDate yesterday = today.minusDays(1);
                start = yesterday.atStartOfDay();
                end = yesterday.atTime(LocalTime.MAX);
                dateLabel = "เมื่อวานนี้";
            }
            case "last7days" -> {
                start = today.minusDays(6).atStartOfDay();
                end = today.atTime(LocalTime.MAX);
                dateLabel = "7 วันล่าสุด";
            }
            case "last30days" -> {
                start = today.minusDays(29).atStartOfDay();
                end = today.atTime(LocalTime.MAX);
                dateLabel = "30 วันล่าสุด";
            }
            case "custom" -> {
                LocalDate s = customStart != null ? customStart : today;
                LocalDate e = customEnd != null ? customEnd : today;
                start = s.atStartOfDay();
                end = e.atTime(LocalTime.MAX);
                dateLabel = s + " - " + e;
            }
            default -> { // "today"
                start = today.atStartOfDay();
                end = today.atTime(LocalTime.MAX);
                dateLabel = "วันนี้";
            }
        }

        List<SaleOrder> orders = saleOrderRepository.findByCreatedAtBetweenWithItems(start, end);

        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal totalCost = BigDecimal.ZERO;
        int totalItemsSold = 0;

        Map<Long, ProductSummaryAccumulator> productMap = new LinkedHashMap<>();

        for (SaleOrder order : orders) {
            totalRevenue = totalRevenue.add(order.getTotal());
            totalCost = totalCost.add(order.getTotalCost());

            for (SaleItem item : order.getItems()) {
                totalItemsSold += item.getQuantity();

                Long pId = item.getProduct().getId();
                ProductSummaryAccumulator acc = productMap.computeIfAbsent(pId, k -> new ProductSummaryAccumulator(
                        pId,
                        item.getProductName(),
                        item.getSku(),
                        item.getBarcode(),
                        item.getCategoryName()
                ));
                acc.quantitySold += item.getQuantity();
                acc.totalSales = acc.totalSales.add(item.getLineTotal());
                acc.totalCost = acc.totalCost.add(item.getLineCost());
                acc.grossProfit = acc.grossProfit.add(item.getLineProfit());
            }
        }

        BigDecimal grossProfit = totalRevenue.subtract(totalCost).setScale(2, RoundingMode.HALF_UP);
        BigDecimal profitMarginPercent = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? grossProfit.divide(totalRevenue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        List<SaleDtos.ProductSalesSummaryResponse> productSummaries = productMap.values().stream()
                .map(ProductSummaryAccumulator::toResponse)
                .sorted((a, b) -> b.totalSales().compareTo(a.totalSales()))
                .toList();

        List<SaleDtos.SaleOrderResponse> orderResponses = orders.stream()
                .map(SaleDtos.SaleOrderResponse::from)
                .toList();

        return new SaleDtos.DailySalesSummaryResponse(
                dateLabel,
                orders.size(),
                totalItemsSold,
                totalRevenue.setScale(2, RoundingMode.HALF_UP),
                totalCost.setScale(2, RoundingMode.HALF_UP),
                grossProfit,
                profitMarginPercent,
                productSummaries,
                orderResponses
        );
    }

    private static class ProductSummaryAccumulator {
        final Long productId;
        final String productName;
        final String sku;
        final String barcode;
        final String categoryName;
        int quantitySold = 0;
        BigDecimal totalSales = BigDecimal.ZERO;
        BigDecimal totalCost = BigDecimal.ZERO;
        BigDecimal grossProfit = BigDecimal.ZERO;

        ProductSummaryAccumulator(Long productId, String productName, String sku, String barcode, String categoryName) {
            this.productId = productId;
            this.productName = productName;
            this.sku = sku;
            this.barcode = barcode;
            this.categoryName = categoryName;
        }

        SaleDtos.ProductSalesSummaryResponse toResponse() {
            BigDecimal margin = totalSales.compareTo(BigDecimal.ZERO) > 0
                    ? grossProfit.divide(totalSales, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            return new SaleDtos.ProductSalesSummaryResponse(
                    productId,
                    productName,
                    sku,
                    barcode,
                    categoryName,
                    quantitySold,
                    totalSales.setScale(2, RoundingMode.HALF_UP),
                    totalCost.setScale(2, RoundingMode.HALF_UP),
                    grossProfit.setScale(2, RoundingMode.HALF_UP),
                    margin
            );
        }
    }
}
