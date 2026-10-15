package com.pos.backend.util;

public final class GtinUtil {

    private GtinUtil() {
    }

    public record GtinValidationResult(
            boolean valid,
            String normalizedBarcode,
            boolean validChecksum,
            boolean inStoreBarcode,
            String originCountry,
            String message) {
    }

    public static String normalize(String barcode) {
        if (barcode == null) return "";
        return barcode.trim().replaceAll("\\D", "");
    }

    public static GtinValidationResult validate(String rawBarcode) {
        String normalized = normalize(rawBarcode);
        int len = normalized.length();

        if (len < 8 || len > 14) {
            return new GtinValidationResult(
                    false, normalized, false, false, "Unknown",
                    "ความยาวบาร์โค้ดต้องอยู่ระหว่าง 8 ถึง 14 หลัก");
        }

        boolean validCheck = verifyCheckDigit(normalized);
        if (!validCheck) {
            return new GtinValidationResult(
                    false, normalized, false, false, detectCountry(normalized),
                    "รหัสตรวจสอบ (Check digit) ของบาร์โค้ดไม่ถูกต้อง");
        }

        boolean inStore = isInStoreBarcode(normalized);
        String country = inStore ? "บาร์โค้ดภายในร้าน" : detectCountry(normalized);

        return new GtinValidationResult(true, normalized, true, inStore, country, "บาร์โค้ดถูกต้อง");
    }

    public static boolean verifyCheckDigit(String digits) {
        if (digits == null || digits.length() < 8) return false;
        int len = digits.length();
        int expectedCheckDigit = digits.charAt(len - 1) - '0';

        int sum = 0;
        int weight = 3;
        for (int i = len - 2; i >= 0; i--) {
            int d = digits.charAt(i) - '0';
            sum += d * weight;
            weight = (weight == 3) ? 1 : 3;
        }

        int calculated = (10 - (sum % 10)) % 10;
        return calculated == expectedCheckDigit;
    }

    public static boolean isInStoreBarcode(String digits) {
        if (digits == null || digits.length() < 3) return false;
        try {
            int prefix = Integer.parseInt(digits.substring(0, 3));
            return prefix >= 200 && prefix <= 299;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    public static String detectCountry(String digits) {
        if (digits == null || digits.length() < 3) return "ไม่ระบุ";
        if (digits.startsWith("885")) return "ไทย (Thailand)";
        if (digits.startsWith("880")) return "เกาหลีใต้ (South Korea)";
        if (digits.startsWith("888")) return "สิงคโปร์ (Singapore)";
        if (digits.startsWith("893")) return "เวียดนาม (Vietnam)";
        if (digits.startsWith("955")) return "มาเลเซีย (Malaysia)";

        try {
            int prefix3 = Integer.parseInt(digits.substring(0, 3));
            if (prefix3 >= 0 && prefix3 <= 139) return "สหรัฐอเมริกา/แคนาดา (USA/Canada)";
            if ((prefix3 >= 450 && prefix3 <= 459) || (prefix3 >= 490 && prefix3 <= 499)) return "ญี่ปุ่น (Japan)";
            if (prefix3 >= 690 && prefix3 <= 699) return "จีน (China)";
            if (prefix3 >= 400 && prefix3 <= 440) return "เยอรมนี (Germany)";
            if (prefix3 >= 500 && prefix3 <= 509) return "สหราชอาณาจักร (UK)";
            if (prefix3 >= 300 && prefix3 <= 379) return "ฝรั่งเศส (France)";
            if (prefix3 >= 800 && prefix3 <= 839) return "อิตาลี (Italy)";
            if (prefix3 >= 840 && prefix3 <= 849) return "สเปน (Spain)";
            if (prefix3 >= 760 && prefix3 <= 769) return "สวิตเซอร์แลนด์ (Switzerland)";
            if (prefix3 >= 930 && prefix3 <= 939) return "ออสเตรเลีย (Australia)";
            if (prefix3 >= 200 && prefix3 <= 299) return "บาร์โค้ดภายในร้าน (In-Store)";
        } catch (Exception ignored) {
        }

        return "สากล (Global GS1)";
    }
}
