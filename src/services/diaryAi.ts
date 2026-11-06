import { GoogleGenAI, Type } from '@google/genai';

export interface RefinedDiaryResult {
  formattedText: string;
  suggestedKm?: number | null;
  suggestedTempoMinutos?: number | null;
}

/**
 * Aprimora o relato do diário de bordo usando Gemini 3.5 Flash Lite:
 * - Pontuação, concordância e gramática
 * - Tom formal, respeitoso e ministerial
 * - Extração de Km percorridos e tempo de trajeto se mencionados
 */
export async function refineDiaryWithGemini(rawText: string): Promise<RefinedDiaryResult | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Você é um assistente de redação eclesiástica para diários de bordo e relatórios ministeriais de viagens e visitas em congregações.
Aprimore o relato a seguir, que pode ter sido falado por voz/ditado ou digitado de forma rápida.

Diretrizes:
1. Corrija pontuação, concordância verbal e concordância nominal.
2. Formate em estilo formal e respeitoso para relatórios da liderança/igreja.
3. Respeite termos ministeriais (ex: Congregação, Ancião, Diácono, Cooperador, Visita Pastoral, Atendimento Material, Reunião da Mocidade, Santa Ceia, Oração).
4. Se o texto mencionar explicitamente distância percorrida (ex: "andamos 120km", "rodamos 80 km"), extraia esse número em "suggestedKm".
5. Se o texto mencionar tempo de trajeto/viagem (ex: "demorou 2 horas", "1h e 30m de estrada"), extraia em minutos inteiros em "suggestedTempoMinutos".

Relato informado pelo missionário:
"${rawText}"`
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            formattedText: { type: Type.STRING, description: 'Texto refinado e bem redigido' },
            suggestedKm: { type: Type.NUMBER, description: 'Quilômetros rodados se mencionados, senão null' },
            suggestedTempoMinutos: { type: Type.NUMBER, description: 'Tempo de viagem em minutos se mencionado, senão null' }
          },
          required: ['formattedText']
        }
      }
    });

    if (response && response.text) {
      const parsed = JSON.parse(response.text);
      if (parsed && typeof parsed.formattedText === 'string' && parsed.formattedText.trim() !== '') {
        return {
          formattedText: parsed.formattedText.trim(),
          suggestedKm: typeof parsed.suggestedKm === 'number' && parsed.suggestedKm > 0 ? parsed.suggestedKm : null,
          suggestedTempoMinutos: typeof parsed.suggestedTempoMinutos === 'number' && parsed.suggestedTempoMinutos > 0 ? parsed.suggestedTempoMinutos : null
        };
      }
    }
  } catch (err) {
    console.warn('[Gemini Diary AI] Erro ao aprimorar diário com Gemini:', err);
  }

  return null;
}
