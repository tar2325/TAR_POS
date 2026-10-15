export type AiLookupConfidence = 'high' | 'medium' | 'low';

export interface AiProductLookupResponse {
  found: boolean;
  name: string;
  brand?: string;
  categoryHint?: string;
  quantity?: string;
  confidence: AiLookupConfidence;
  notes?: string;
}
