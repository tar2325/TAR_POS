export type ReceiptPaperSize = 'auto' | '58mm' | '80mm';

export type GoogleSearchGroundingMode = 'dynamic' | 'always' | 'off';

export interface GeminiConfig {
  /** ใส่ API Key จาก https://aistudio.google.com/apikey */
  apiKey: string;
  model: string;
  enabled: boolean;
  /** โหมด Google Search Grounding: dynamic = ตัดสินใจเอง, always = ค้นหาทุกครั้ง */
  googleSearchMode: GoogleSearchGroundingMode;
  /** ค่า threshold สำหรับ MODE_DYNAMIC (0–1) */
  googleSearchDynamicThreshold: number;
}
