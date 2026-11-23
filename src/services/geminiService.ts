import { apiFetch } from "../lib/apiClient";
import { tr, getTrLanguage } from "../lib/tr";

export class GeminiService {
  async chatConcierge(
    userName: string,
    userRole: string,
    message: string,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[]
  ): Promise<string> {
    try {
      const response = await apiFetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, userRole, message, history, language: getTrLanguage() }),
      });
      if (!response.ok) {
        throw new Error("Failed to call chat api");
      }
      const data = await response.json();
      return data.text || tr("Como posso elevar a sua experiência gastronómica hoje?");
    } catch (error) {
      console.error("Concierge Error:", error);
      return tr("Lamento imenso, tive um pequeno contratempo técnico. Como posso ajudar de outra forma?");
    }
  }

  async analyzeSearch(query: string): Promise<{ gastronomy?: string; maxPrice?: number; region?: string }> {
    try {
      const response = await apiFetch("/api/gemini/analyze-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) {
        throw new Error("Failed to call analyze search api");
      }
      return await response.json();
    } catch {
      return {};
    }
  }

  async getCityFromCoords(lat: number, lng: number): Promise<string> {
    try {
      const response = await apiFetch("/api/gemini/city-coords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      if (!response.ok) {
        throw new Error("Failed to call city-coords api");
      }
      const data = await response.json();
      return data.city || "";
    } catch {
      return "";
    }
  }

  async suggestBio(name: string, specialties: string[]): Promise<string> {
    try {
      const response = await apiFetch("/api/gemini/suggest-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, specialties, language: getTrLanguage() }),
      });
      if (!response.ok) {
        throw new Error("Failed to call suggest-bio api");
      }
      const data = await response.json();
      return data.bio || "";
    } catch {
      return "";
    }
  }
}

export const geminiService = new GeminiService();
