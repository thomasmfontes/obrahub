import { GoogleGenAI, Type } from '@google/genai';

export interface ReceiptScanResult {
  total: number | null;
  merchant?: string;
  category?: 'fuel' | 'utensils' | 'bed' | 'church';
  rawText: string;
}

/**
 * Normaliza caracteres comuns que o OCR confunde em números (ex: 'O' no lugar de '0', 'l' no lugar de '1')
 */
function cleanOcrNumber(str: string): string {
  return str.replace(/[Oo]/g, '0').replace(/[lI]/g, '1').replace(/\s+/g, '');
}

/**
 * Extrai o valor monetário total de cupons fiscais, notas NFC-e, comprovantes de cartão e PIX (Fallback local)
 */
export function extractTotalFromReceiptText(text: string): number | null {
  if (!text) return null;

  const normalized = text
    .replace(/[;\uff1b]/g, '.')
    .replace(/\r\n/g, '\n');

  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);

  // Padrões de linhas de total em ordem decrescente de confiabilidade
  const totalRegexes = [
    /(?:valor\s*total|total\s*a\s*pagar|valor\s*a\s*pagar|vlr\s*total|v\.?\s*total|vlr\s*a\s*pagar)\s*(?:r\$|rs)?\s*[:=\s]*([0-9OlI]{1,4}(?:[.,][0-9OlI]{3})*[.,][0-9OlI]{2})/i,
    /(?:total\s*r\$|total\s*rs)\s*[:=\s]*([0-9OlI]{1,4}(?:[.,][0-9OlI]{3})*[.,][0-9OlI]{2})/i,
    /(?:total|subtotal|valor\s*liquido|vlr\s*liquido|valor\s*pago)\s*(?:r\$|rs)?\s*[:=\s]*([0-9OlI]{1,4}(?:[.,][0-9OlI]{3})*[.,][0-9OlI]{2})/i,
    /(?:debito|credito|cartao|pix|dinheiro)\s*(?:r\$|rs)?\s*[:=\s]*([0-9OlI]{1,4}(?:[.,][0-9OlI]{3})*[.,][0-9OlI]{2})/i,
    /(?:valor|vl|vlr)\s*(?:r\$|rs)?\s*[:=\s]*([0-9OlI]{1,4}(?:[.,][0-9OlI]{3})*[.,][0-9OlI]{2})/i,
    /(?:r\$|rs)\s*([0-9OlI]{1,4}(?:[.,][0-9OlI]{3})*[.,][0-9OlI]{2})/i
  ];

  // 1. Tenta identificar na linha específica
  for (const regex of totalRegexes) {
    for (const line of lines) {
      const match = line.match(regex);
      if (match && match[1]) {
        const cleanedNumStr = cleanOcrNumber(match[1]).replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedNumStr);
        if (!isNaN(num) && num > 0) return num;
      }
    }
  }

  // 2. Tenta no texto completo
  for (const regex of totalRegexes) {
    const match = normalized.match(regex);
    if (match && match[1]) {
      const cleanedNumStr = cleanOcrNumber(match[1]).replace(/\./g, '').replace(',', '.');
      const num = parseFloat(cleanedNumStr);
      if (!isNaN(num) && num > 0) return num;
    }
  }

  // 3. Fallback: busca todos os valores monetários e pega o maior (geralmente o total)
  const allAmountsRegex = /(?:r\$|rs)?\s*([0-9]{1,4}(?:[.,][0-9]{3})*[.,][0-9]{2})/gi;
  const matches = [...normalized.matchAll(allAmountsRegex)];
  if (matches.length > 0) {
    const amounts = matches.map(m => {
      const clean = m[1].replace(/\./g, '').replace(',', '.');
      return parseFloat(clean);
    }).filter(n => !isNaN(n) && n > 0 && n < 100000);

    if (amounts.length > 0) {
      return Math.max(...amounts);
    }
  }

  return null;
}

/**
 * Detecta automaticamente categoria e razão social a partir das palavras-chave do cupom (Fallback local)
 */
export function detectCategoryAndMerchant(text: string): { 
  category?: 'fuel' | 'utensils' | 'bed' | 'church'; 
  merchant?: string 
} {
  const upper = text.toUpperCase();

  let category: 'fuel' | 'utensils' | 'bed' | 'church' | undefined = undefined;
  if (/POSTO|SHELL|IPIRANGA|PETROBRAS|BR\s*DISTRIBUIDORA|AUTO\s*POSTO|GASOLINA|ETANOL|DIESEL|COMBUSTIVEL/i.test(upper)) {
    category = 'fuel';
  } else if (/RESTAURANTE|CHURRASCARIA|PIZZARIA|LANCHONETE|CAFE|PADARIA|REFEICAO|ALMOCO|JANTAR|BURGER|MCDONALDS|SUBWAY|GRILL|LANCHES/i.test(upper)) {
    category = 'utensils';
  } else if (/HOTEL|POUSADA|HOSPEDAGEM|FLAT|RESORT|HOSTEL|IBIS|HOTELARIA/i.test(upper)) {
    category = 'bed';
  } else if (/IGREJA|LIVRARIA|PAPELARIA|FLORES|MATERIAL|CONSTRUCAO|FERRAGEM/i.test(upper)) {
    category = 'church';
  }

  // Busca o nome do estabelecimento nas primeiras linhas
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let merchant: string | undefined = undefined;
  for (const line of lines.slice(0, 5)) {
    if (
      line.length >= 3 &&
      line.length <= 40 &&
      !/CNPJ|CPF|DANFE|NFC|EXTRATO|DOCUMENTO|FISCAL|RECEITA|CUPOM|AUTORIZACAO|VIA|CHAVE|COMPROVANTE|PAGAMENTO|TRANSFERENCIA|BANCO|AGENCIA|CONTA/i.test(line) &&
      !/^\d+$/.test(line)
    ) {
      merchant = line;
      break;
    }
  }

  return { category, merchant };
}

/**
 * Redimensiona a foto para ~1200px máx no Canvas para acelerar o envio e processamento
 */
export async function preprocessImageForOcr(fileOrDataUrl: File | string): Promise<string> {
  if (typeof window === 'undefined') return typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '';

  return new Promise((resolve) => {
    const img = new Image();
    const url = typeof fileOrDataUrl === 'string' ? fileOrDataUrl : URL.createObjectURL(fileOrDataUrl);

    img.onload = () => {
      if (typeof fileOrDataUrl !== 'string') {
        URL.revokeObjectURL(url);
      }

      const canvas = document.createElement('canvas');
      const maxDim = 1200;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } else {
        resolve(url);
      }
    };

    img.onerror = () => {
      if (typeof fileOrDataUrl !== 'string') {
        URL.revokeObjectURL(url);
      }
      resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
    };
    img.src = url;
  });
}

/**
 * Escaneia o comprovante diretamente com Gemini 3.8 Flash (Multimodal com Structured Outputs)
 */
async function scanReceiptWithGemini(processedDataUrl: string, apiKey: string): Promise<ReceiptScanResult | null> {
  try {
    const matches = processedDataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches) return null;

    const mimeType = matches[1];
    const base64Data = matches[2];

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType
              }
            },
            {
              text: `Analise a imagem deste comprovante fiscal, cupom, nota ou recibo de pagamento brasileiro.
Extraia:
- total: O valor total pago ou a pagar em reais (número com ponto decimal, ex: 145.80). Se ilegível ou não encontrado, null.
- merchant: Nome fantasia ou razão social do estabelecimento comercial (ex: "Posto Shell", "Restaurante Bom Sabor").
- category: A categoria mais adequada entre:
  * "fuel" (posto de combustível, etanol, gasolina, diesel, lubrificante)
  * "utensils" (restaurante, lanchonete, alimentação, café, refeição)
  * "bed" (hotel, pousada, hospedagem, pernoite)
  * "church" (igreja, material de construção, papelaria, ferragem ou outros)
- rawText: Resumo conciso dos itens e dados identificados.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            total: { type: Type.NUMBER, description: 'Valor total em número' },
            merchant: { type: Type.STRING, description: 'Nome do estabelecimento' },
            category: { 
              type: Type.STRING, 
              enum: ['fuel', 'utensils', 'bed', 'church'],
              description: 'Categoria da despesa'
            },
            rawText: { type: Type.STRING, description: 'Resumo dos dados lidos' }
          },
          required: ['merchant', 'category']
        }
      }
    });

    if (response && response.text) {
      const parsed = JSON.parse(response.text);
      return {
        total: typeof parsed.total === 'number' && parsed.total > 0 ? parsed.total : null,
        merchant: parsed.merchant || undefined,
        category: parsed.category || undefined,
        rawText: parsed.rawText || response.text
      };
    }
  } catch (geminiError) {
    console.warn('[Gemini OCR] Falha ao consultar Gemini API, acionando fallback local:', geminiError);
  }
  return null;
}

/**
 * Escaneia o arquivo de imagem do cupom fiscal e extrai o valor total, estabelecimento e categoria.
 * Usa prioritariamente Gemini 3.8 Flash e mantém Tesseract.js como fallback seguro.
 */
export async function scanReceiptImage(fileOrUrl: File | string): Promise<ReceiptScanResult> {
  try {
    const processedUrl = await preprocessImageForOcr(fileOrUrl);
    if (!processedUrl) {
      return { total: null, rawText: '' };
    }

    // 1. Tenta processar com Gemini se a chave de API estiver configurada
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (geminiApiKey && typeof geminiApiKey === 'string' && geminiApiKey.trim() !== '') {
      const geminiResult = await scanReceiptWithGemini(processedUrl, geminiApiKey.trim());
      if (geminiResult && (geminiResult.total !== null || geminiResult.merchant || geminiResult.category)) {
        return geminiResult;
      }
    }

    // 2. Fallback: OCR local com Tesseract.js (para modo offline ou sem chave)
    const { default: Tesseract } = await import('tesseract.js');
    const result = await Tesseract.recognize(processedUrl, 'por+eng');
    const rawText = result?.data?.text || '';

    const total = extractTotalFromReceiptText(rawText);
    const { category, merchant } = detectCategoryAndMerchant(rawText);

    return {
      total,
      merchant,
      category,
      rawText
    };
  } catch (error) {
    console.warn('Erro ao processar OCR do comprovante:', error);
    return { total: null, rawText: '' };
  }
}
