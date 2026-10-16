package com.pos.backend.dto;

import com.pos.backend.model.SaleItem;
import com.pos.backend.model.SaleOrder;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;

public final class SaleDtos {
    private SaleDtos() {
    }

    public record CreateSaleItemRequest(
            @NotNull Long productId,
            @NotNull @Min(1) Integer quantity,
            @DecimalMin("0.00") BigDecimal price
    ) {
    }

    public record CreateSaleRequest(
            String receiptNo,
            String cashierName,
            String paymentMethod,
            BigDecimal receivedAmount,
            BigDecimal changeAmount,
            BigDecimal discount,
            BigDecimal tax,
            @NotEmpty @Valid List<CreateSaleItemRequest> items
    ) {
    }

    public record SaleItemResponse(
            Long productId,
            String productName,
            String sku,
            String barcode,
            String categoryName,
            Integer quantity,
            BigDecimal costPrice,
            BigDecimal price,
            BigDecimal lineCost,
            BigDecimal lineTotal,
            BigDecimal lineProfit,
            BigDecimal marginPercent
    ) {
        public static SaleItemResponse from(SaleItem item) {
            return new SaleItemResponse(
                    item.getProduct().getId(),
                    item.getProductName(),
                    item.getSku(),
                    item.getBarcode(),
                    item.getCategoryName(),
                    item.getQuantity(),
                    item.getCostPrice(),
                    item.getPrice(),
                    item.getLineCost(),
                    item.getLineTotal(),
                    item.getLineProfit(),
                    item.getMarginPercent()
            );
        }
    }

    public record SaleOrderResponse(
            String id,
            String receiptNo,
            String createdAt,
            String cashierName,
            String paymentMethod,
            BigDecimal receivedAmount,
            BigDecimal changeAmount,
            Integer itemCount,
            BigDecimal subtotal,
            BigDecimal discount,
            BigDecimal tax,
            BigDecimal total,
            BigDecimal totalCost,
            BigDecimal grossProfit,
            BigDecimal profitMarginPercent,
            List<SaleItemResponse> items
    ) {
        public static SaleOrderResponse from(SaleOrder order) {
            String isoDate = order.getCreatedAt() != null
                    ? order.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME)
                    : "";
            List<SaleItemResponse> itemResponses = order.getItems() != null
                    ? order.getItems().stream().map(SaleItemResponse::from).toList()
                    : List.of();

            return new SaleOrderResponse(
                    order.getReceiptNo(),
                    order.getReceiptNo(),
                    isoDate,
                    order.getCashierName(),
                    order.getPaymentMethod(),
                    order.getReceivedAmount(),
                    order.getChangeAmount(),
                    order.getItemCount(),
                    order.getSubtotal(),
                    order.getDiscount(),
                    order.getTax(),
                    order.getTotal(),
                    order.getTotalCost(),
                    order.getGrossProfit(),
                    order.getProfitMarginPercent(),
                    itemResponses
            );
        }
    }

    public record ProductSalesSummaryResponse(
            Long productId,
            String productName,
            String sku,
            String barcode,
            String categoryName,
            Integer quantitySold,
            BigDecimal totalSales,
            BigDecimal totalCost,
            BigDecimal grossProfit,
            BigDecimal profitMarginPercent
    ) {
    }

    public record DailySalesSummaryResponse(
            String date,
            Integer orderCount,
            Integer totalItemsSold,
            BigDecimal totalRevenue,
            BigDecimal totalCost,
            BigDecimal grossProfit,
            BigDecimal profitMarginPercent,
            List<ProductSalesSummaryResponse> products,
            List<SaleOrderResponse> orders
    ) {
    }
}
