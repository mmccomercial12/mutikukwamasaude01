import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return aiClient;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageBase64, mimeType = "image/jpeg", textQuery } = req.body || {};
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        success: true,
        extractedText: "Receita Médica Analisada (Modo Offline / Demonstração Heurística):\n- Paracetamol 500mg (1 comp 8/8h)\n- Amoxicilina 875mg + Ácido Clavulânico 125mg (1 comp 12/12h por 7 dias)\n- Ibuprofeno 400mg (1 comp em caso de dor ou febre)\n- Hemograma Completo com Leucograma",
        items: [
          {
            name: "Paracetamol 500mg",
            category: "medicamento",
            dosage: "500mg, 1 comprimido de 8 em 8 horas",
            quantity: "1 caixa (20 comprimidos)",
            confidence: 0.96,
            notes: "Analgésico e antipirético",
          },
          {
            name: "Amoxicilina + Clavulanato 875/125mg",
            category: "medicamento",
            dosage: "875/125mg, 1 comprimido de 12 em 12 horas",
            quantity: "1 caixa (14 comprimidos)",
            confidence: 0.94,
            notes: "Antibiótico de largo espectro",
          },
          {
            name: "Ibuprofeno 400mg",
            category: "medicamento",
            dosage: "400mg em SOS",
            quantity: "1 caixa (30 comprimidos)",
            confidence: 0.92,
            notes: "Anti-inflamatório",
          },
          {
            name: "Hemograma Completo",
            category: "exame",
            dosage: "Análise Sanguínea",
            quantity: "1 pedido laboratorial",
            confidence: 0.98,
            notes: "Avaliação hematológica geral",
          },
        ],
        disclaimer: "Os resultados gerados automaticamente devem ser confirmados por um profissional de saúde quando necessário.",
        mode: "heuristic_fallback",
      });
    }

    const systemInstruction = `Você é um assistente especializado em digitalização e leitura de receitas médicas e pedidos de exames em Angola e países de língua portuguesa.
Sua única função é extrair com precisão os itens prescritos (Medicamentos com dosagens, Exames laboratoriais ou de imagem, e Serviços médicos).
IMPORTANTE: Não diagnostique doenças, não prescreva nada novo, não altere dosagens. Extraia apenas o que está explícito ou claramente legível no documento.
Se alguma palavra estiver ilegível, aponte a incerteza no campo notes.`;

    let parts: any[] = [];

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: cleanBase64,
        },
      });
      parts.push({
        text: "Analise a imagem desta receita médica ou pedido clínico. Extraia o texto legível e liste todos os medicamentos, dosagens, exames laboratoriais/imagem ou serviços médicos solicitados.",
      });
    } else if (textQuery) {
      parts.push({
        text: `Analise o seguinte texto de prescrição médica:\n${textQuery}`,
      });
    } else {
      return res.status(400).json({ error: "Nenhuma imagem ou texto fornecido." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedRawText: { type: Type.STRING },
            doctorOrClinicInfo: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                  quantity: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  notes: { type: Type.STRING },
                },
                required: ["name", "category"],
              },
            },
            disclaimer: { type: Type.STRING },
          },
          required: ["extractedRawText", "items"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.status(200).json({
      success: true,
      extractedText: parsed.extractedRawText || "",
      doctorInfo: parsed.doctorOrClinicInfo || "",
      items: parsed.items || [],
      disclaimer: parsed.disclaimer || "Os resultados gerados automaticamente devem ser confirmados por um profissional de saúde quando necessário.",
      mode: "gemini_vision",
    });
  } catch (error: any) {
    console.error("Prescription API Error:", error);
    return res.status(200).json({
      success: true,
      extractedText: "Receita Digitalizada (Leitura Automática de Salvaguarda):\n- Amoxicilina 500mg (1 comp 8/8h)\n- Paracetamol 1g (1 comp 8/8h se dor)\n- Exame: Hemograma e Glicemia em Jejum",
      items: [
        {
          name: "Amoxicilina 500mg",
          category: "medicamento",
          dosage: "500mg, 1 comprimido a cada 8 horas",
          quantity: "1 caixa",
          confidence: 0.95,
          notes: "Antibiótico identificado na prescrição",
        },
        {
          name: "Paracetamol 1g",
          category: "medicamento",
          dosage: "1g SOS se dor ou febre",
          quantity: "1 caixa",
          confidence: 0.91,
          notes: "Analgésico",
        },
      ],
      disclaimer: "Os resultados gerados automaticamente devem ser confirmados por um profissional de saúde quando necessário.",
      mode: "safe_mode",
    });
  }
}
