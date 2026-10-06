import { GoogleGenAI } from '@google/genai';
import { ExtractedDocumentData } from '../types/index.js';

export async function analyzeDocumentWithAI(
  documentTitle: string,
  tipo: string,
  base64Data?: string,
  mimeType?: string
): Promise<{
  success: boolean;
  message?: string;
  data?: ExtractedDocumentData;
}> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return {
      success: false,
      message: 'Serviço de análise de documentos não configurado.',
    };
  }

  try {
    const ai = new GoogleGenAI();

    const prompt = `Você é um analisador e OCR de documentos do sistema de logística LOG MMS.
Extraia com precisão os dados deste documento (tipo: ${tipo}, título: ${documentTitle}).
Retorne EXCLUSIVAMENTE um objeto JSON válido com as seguintes chaves opcionais (somente as encontradas com certeza):
{
  "nome": string ou null,
  "cpf": string ou null,
  "matricula": string ou null,
  "rg": string ou null,
  "origem": string ou null,
  "destino": string ou null,
  "data": string (formato YYYY-MM-DD se possível) ou null,
  "horario": string (formato HH:MM) ou null,
  "empresa": string ou null,
  "numeroLocalizador": string ou null,
  "outrosDados": { chave: valor } ou null
}
Não inclua explicações ou blocos markdown além do JSON.`;

    let response;

    if (base64Data && mimeType && !mimeType.includes('pdf')) {
      // Analyze image inline
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          prompt,
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/jpeg',
            },
          },
        ],
      });
    } else {
      // Text metadata analysis or prompt
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${prompt}\nDocumento: "${documentTitle}". Tipo: "${tipo}".`,
      });
    }

    const text = response.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        message: 'Não foi possível extrair dados estruturados do documento.',
      };
    }

    const parsed: ExtractedDocumentData = JSON.parse(jsonMatch[0]);
    return {
      success: true,
      data: parsed,
    };
  } catch (error: any) {
    console.error('Erro na análise de documento:', error);
    return {
      success: false,
      message: `Falha na comunicação com o serviço de análise: ${error.message || 'Erro desconhecido'}`,
    };
  }
}
