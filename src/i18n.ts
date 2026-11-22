import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import pt from "./translations/pt.json";
import en from "./translations/en.json";
import fr from "./translations/fr.json";
import es from "./translations/es.json";

export const translations = {
  pt,
  es,
  fr,
  en,
};

export type Language = "pt" | "es" | "fr" | "en";
export type TranslationKey = keyof typeof pt;

const savedLanguage = typeof window !== "undefined" ? localStorage.getItem("user_language") : null;
let initialLang: Language = "pt";

if (savedLanguage === "pt" || savedLanguage === "en" || savedLanguage === "fr" || savedLanguage === "es") {
  initialLang = savedLanguage as Language;
} else if (typeof navigator !== "undefined") {
  const browserLang = navigator.language.split("-")[0];
  if (browserLang === "en" || browserLang === "fr" || browserLang === "pt" || browserLang === "es") {
    initialLang = browserLang as Language;
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
    },
    lng: initialLang,
    fallbackLng: "pt",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
