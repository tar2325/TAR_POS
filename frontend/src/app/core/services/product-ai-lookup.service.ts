import { Injectable, inject } from '@angular/core';
import {
  DynamicRetrievalConfigMode,
  GenerateContentResponse,
  GoogleGenAI,
  GroundingMetadata,
  Tool,
  Type,
} from '@google/genai';
import { Observable, catchError, from, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { GoogleSearchGroundingMode } from '../../../environments/environment.types';
import { AiProductLookupResponse } from '../../models/product-ai-lookup.model';
import { ProductLookupResult } from '../../models/product-lookup.model';
import { resolveCategoryIdFromHints } from '../utils/category-mapper.util';
import { CategoryStoreService } from './category-store.service';

const API_KEY_STORAGE = 'pos_gemini_api_key';

const PRODUCT_LOOKUP_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    found: { type: Type.BOOLEAN },
    name: { type: Type.STRING },
    brand: { type: Type.STRING },
    categoryHint: { type: Type.STRING },
    quantity: { type: Type.STRING },
    confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
    notes: { type: Type.STRING },
  },
  required: ['found', 'name', 'confidence'],
};

@Injectable({ providedIn: 'root' })
export class ProductAiLookupService {
  private readonly categoryStore = inject(CategoryStoreService);
  private client: GoogleGenAI | null = null;
  private clientApiKey = '';

  isAvailable(): boolean {
    return environment.gemini.enabled && !!this.getApiKey();
  }

  getApiKey(): string {
    return (
      environment.gemini.apiKey.trim() ||
      localStorage.getItem(API_KEY_STORAGE)?.trim() ||
      ''
    );
  }

  saveApiKey(key: string): void {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(API_KEY_STORAGE, trimmed);
      return;
    }
    localStorage.removeItem(API_KEY_STORAGE);
    this.resetClient();
  }

  lookupByBarcode(barcode: string): Observable<ProductLookupResult | null> {
    if (!environment.gemini.enabled || !this.getApiKey()) {
      return of(null);
    }

    return from(this.lookupProductByBarcode(barcode)).pipe(
      map((response) => this.mapResponse(barcode, response)),
      catchError((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : 'เชื่อมต่อ Gemini ไม่สำเร็จ — ตรวจสอบ API Key';
        return of({
          status: 'not_found' as const,
          message: `Gemini: ${message}`,
        });
      }),
    );
  }

  /**
   * ค้นหาสินค้าจากบาร์โค้ดด้วย Gemini + Google Search Retrieval
   * ใช้ @google/genai SDK ล่าสุด
   */
  async lookupProductByBarcode(barcode: string): Promise<GenerateContentResponse> {
    const ai = this.getClient();

    return ai.models.generateContent({
      model: environment.gemini.model,
      contents: [
        {
          role: 'user',
          parts: [{ text: this.buildPrompt(barcode) }],
        },
      ],
      config: {
        temperature: 0.1,
        tools: this.buildSearchTools(),
        responseMimeType: 'application/json',
        responseJsonSchema: PRODUCT_LOOKUP_SCHEMA,
      },
    });
  }

  private buildSearchTools(): Tool[] | undefined {
    switch (environment.gemini.googleSearchMode as GoogleSearchGroundingMode) {
      case 'off':
        return undefined;
      case 'always':
        return [{ googleSearchRetrieval: {} }];
      case 'dynamic':
      default:
        return [
          {
            googleSearchRetrieval: {
              dynamicRetrievalConfig: {
                mode: DynamicRetrievalConfigMode.MODE_DYNAMIC,
                dynamicThreshold: environment.gemini.googleSearchDynamicThreshold,
              },
            },
          },
        ];
    }
  }

  private getClient(): GoogleGenAI {
    const apiKey = this.getApiKey();
    if (!this.client || this.clientApiKey !== apiKey) {
      this.client = new GoogleGenAI({ apiKey });
      this.clientApiKey = apiKey;
    }
    return this.client;
  }

  private resetClient(): void {
    this.client = null;
    this.clientApiKey = '';
  }

  private buildPrompt(barcode: string): string {
    const categories = this.categoryStore
      .activeCategories()
      .map((category) => category.name)
      .join(', ');

    return `คุณเป็นผู้เชี่ยวชาญสินค้าขายปลีกในประเทศไทย

บาร์โค้ดสินค้า: ${barcode}
รูปแบบ: EAN-13, ขึ้นต้น 885 = ลงทะเบียน GS1 ประเทศไทย

งาน: ใช้ Google Search ค้นหาข้อมูลสินค้าล่าสุดจากอินเทอร์เน็ต (เว็บไซต์ร้านค้า Tops, Big C, Lotus's, Makro, 7-Eleven, เว็บแบรนด์, GS1 Thailand) แล้วบอกว่าบาร์โค้ดนี้คือสินค้าอะไร

กฎสำคัญ:
- ค้นหาจากเว็บก่อนตอบ — อย่าตอบจากความเดาเพียงอย่างเดียว
- ถ้าไม่พบข้อมูลที่น่าเชื่อถือ ให้ found: false และ name: ""
- ห้ามสร้างชื่อสินค้าที่ไม่มีจริง
- ชื่อสินค้าเป็นภาษาไทย (ถ้ามี)
- categoryHint เลือกจาก: ${categories} (เลือกหมวดที่ใกล้เคียงที่สุด ไม่จำเป็นต้องตรงทุกตัวอักษร)
- confidence: high = พบจากแหล่งที่ชัดเจน, medium = พอสมควร, low = ไม่แน่ใจ (ถ้า low ให้ found: false)
- notes สรุปแหล่งที่พบสั้นๆ

ตอบเป็น JSON ตาม schema เท่านั้น`;
  }

  private mapResponse(
    barcode: string,
    response: GenerateContentResponse,
  ): ProductLookupResult | null {
    const text = response.text;
    if (!text) {
      return {
        status: 'not_found',
        message: 'Gemini ไม่ตอบกลับ — ลองใหม่อีกครั้ง',
      };
    }

    let parsed: AiProductLookupResponse;
    try {
      parsed = JSON.parse(text) as AiProductLookupResponse;
    } catch {
      return {
        status: 'not_found',
        message: 'Gemini ตอบกลับไม่ถูกรูปแบบ',
      };
    }

    const groundingNote = this.formatGroundingSources(
      response.candidates?.[0]?.groundingMetadata,
    );

    if (!parsed.found || !parsed.name?.trim() || parsed.confidence === 'low') {
      return {
        status: 'not_found',
        message: parsed.notes?.trim()
          ? `Gemini: ${parsed.notes}`
          : 'Gemini ไม่พบข้อมูลสินค้าจากบาร์โค้ดนี้',
      };
    }

    const name = [parsed.brand, parsed.name, parsed.quantity].filter(Boolean).join(' ').trim();
    const categoryId = resolveCategoryIdFromHints(
      this.categoryStore.activeCategories(),
      parsed.categoryHint,
    );
    const aiNotes = [parsed.notes, groundingNote].filter(Boolean).join(' | ');

    return {
      status: 'found_external',
      message: `Gemini พบสินค้า (${parsed.confidence})${groundingNote ? ' + Google Search' : ''}: ${name}`,
      suggestion: {
        barcode,
        name,
        brand: parsed.brand,
        quantity: parsed.quantity,
        categoryId,
        source: 'gemini-ai',
        aiConfidence: parsed.confidence,
        aiNotes: aiNotes || undefined,
      },
    };
  }

  private formatGroundingSources(metadata?: GroundingMetadata): string | undefined {
    if (!metadata) {
      return undefined;
    }

    const sources =
      metadata.groundingChunks
        ?.map((chunk) => {
          const title = chunk.web?.title?.trim();
          const uri = chunk.web?.uri?.trim();
          if (title && uri) {
            return `${title} (${uri})`;
          }
          return title || uri;
        })
        .filter((value): value is string => !!value) ?? [];

    if (!sources.length && !metadata.webSearchQueries?.length) {
      return undefined;
    }

    const parts: string[] = [];
    if (metadata.webSearchQueries?.length) {
      parts.push(`ค้นหา: ${metadata.webSearchQueries.join(', ')}`);
    }
    if (sources.length) {
      parts.push(`แหล่งอ้างอิง: ${sources.slice(0, 5).join('; ')}`);
    }
    return parts.join(' | ');
  }
}
