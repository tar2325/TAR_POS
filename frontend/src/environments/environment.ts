import type { GeminiConfig, ReceiptPaperSize } from './environment.types';

export type { ReceiptPaperSize, GeminiConfig } from './environment.types';

export const environment = {
  production: true,
  apiUrl: '/api/v1',
  receiptPaperSize: 'auto' as ReceiptPaperSize,
  gemini: {
    apiKey: '',
    model: 'gemini-2.5-flash',
    enabled: false,
    googleSearchMode: 'always',
    googleSearchDynamicThreshold: 0.3,
  } satisfies GeminiConfig,
};
