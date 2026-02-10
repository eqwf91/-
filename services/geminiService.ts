
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AIAnalysis } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async parseNaturalLanguage(text: string): Promise<Partial<Transaction> | null> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `將以下記帳描述解析為 JSON 格式： "${text}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER, description: "金額" },
              category: { type: Type.STRING, description: "分類（如：飲食、交通、購物、薪資等）" },
              type: { type: Type.STRING, description: "expense 或 income" },
              note: { type: Type.STRING, description: "備註內容" }
            },
            required: ["amount", "type"]
          }
        }
      });
      return JSON.parse(response.text.trim());
    } catch (error) {
      console.error("AI Parsing Error:", error);
      return null;
    }
  }

  async analyzeSpending(transactions: Transaction[]): Promise<AIAnalysis | null> {
    if (transactions.length === 0) return null;

    const summary = transactions.slice(-20).map(t => `${t.date}: ${t.type === 'expense' ? '-' : '+'}${t.amount} (${t.category}) - ${t.note}`).join('\n');

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `作為專業理財顧問，請分析以下最近的記帳記錄並提供建議：\n${summary}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "花費趨勢總結（繁體中文）" },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3條具體的省錢或理財建議"
              }
            },
            required: ["summary", "recommendations"]
          }
        }
      });
      return JSON.parse(response.text.trim());
    } catch (error) {
      console.error("AI Analysis Error:", error);
      return null;
    }
  }
}
