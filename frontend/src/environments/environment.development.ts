import type { GeminiConfig, ReceiptPaperSize } from './environment.types';
import { geminiApiKey } from './environment.secrets';

export const environment = {
  production: false,
  apiUrl: '/api/v1',
  receiptPaperSize: 'auto' as ReceiptPaperSize,
  gemini: {
    apiKey: geminiApiKey,
    model: 'gemini-2.5-flash',
    enabled: false,
    googleSearchMode: 'always',
    googleSearchDynamicThreshold: 0.3,
  } satisfies GeminiConfig,
};
