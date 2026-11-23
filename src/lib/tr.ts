// Tradução por frase: o texto de origem (em português) é a chave.
// Se não houver tradução, devolve o próprio texto (nunca mostra chaves partidas).
import en from "../translations/phrases.en.json";
import es from "../translations/phrases.es.json";
import fr from "../translations/phrases.fr.json";

type Lang = "pt" | "en" | "es" | "fr";
const DICT: Record<string, Record<string, string>> = { en, es, fr } as any;

const detect = (): Lang => {
  try {
    const saved = typeof window !== "undefined" ? localStorage.getItem("user_language") : null;
    if (saved === "pt" || saved === "en" || saved === "es" || saved === "fr") return saved;
    const b = typeof navigator !== "undefined" ? navigator.language?.split("-")[0] : "pt";
    if (b === "en" || b === "es" || b === "fr" || b === "pt") return b as Lang;
  } catch {
    /* ignore */
  }
  return "pt";
};

let current: Lang = detect();

export const setTrLanguage = (lang: string) => {
  if (lang === "pt" || lang === "en" || lang === "es" || lang === "fr") current = lang;
};
export const getTrLanguage = (): Lang => current;

export const tr = (text: any, vars?: Record<string, string | number>): any => {
  if (typeof text !== "string") return text;
  let out: string = text;
  if (current !== "pt" && text) {
    const hit = DICT[current]?.[text] ?? DICT[current]?.[text.trim()];
    if (hit) out = hit;
  }
  if (vars) {
    for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  }
  return out;
};

/** Locale para datas/números conforme o idioma ativo. */
export const trLocale = (): string =>
  ({ pt: "pt-PT", en: "en-GB", es: "es-ES", fr: "fr-FR" } as const)[current];
