import React, { createContext, useContext, useState, useEffect } from "react";
import { useTranslation as useI18nTranslation } from "react-i18next";
import i18nInstance, { translations, Language } from "../i18n";
import { supabaseService } from "../services/supabaseService";

export type { Language };

export const AVAILABLE_LANGUAGES: Array<{ code: Language; label: string; flag: string }> = [
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

export const getLangText = (
  lang: string,
  texts: { pt: string; es?: string; en?: string; fr?: string }
): string => {
  if (lang === "es") return texts.es || texts.pt;
  if (lang === "en") return texts.en || texts.pt;
  if (lang === "fr") return texts.fr || texts.pt;
  return texts.pt;
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
  getLangText: (texts: { pt: string; es?: string; en?: string; fr?: string }) => string;
  translations: typeof translations.pt;
  allTranslations: typeof translations;
  i18n: typeof i18nInstance;
  availableLanguages: typeof AVAILABLE_LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t: i18nT, i18n } = useI18nTranslation();
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("user_language");
      if (saved === "pt" || saved === "en" || saved === "fr" || saved === "es") {
        return saved as Language;
      }
      try {
        const storedUser = localStorage.getItem("cookr_user");
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          if (userObj?.language && ["pt", "en", "fr", "es"].includes(userObj.language)) {
            return userObj.language as Language;
          }
        }
      } catch (e) {
        // Ignore JSON error
      }
      const browserLang = navigator.language?.split("-")[0];
      if (browserLang === "en" || browserLang === "fr" || browserLang === "pt" || browserLang === "es") {
        return browserLang as Language;
      }
    }
    return "pt";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("user_language", lang);
      try {
        const storedUser = localStorage.getItem("cookr_user");
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          if (userObj && userObj.id) {
            userObj.language = lang;
            localStorage.setItem("cookr_user", JSON.stringify(userObj));
            supabaseService.updateUserProfile(userObj.id, { language: lang }).catch(() => {});
          }
        }
      } catch (e) {
        // Ignore
      }
    }
    i18n.changeLanguage(lang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language, i18n]);

  const currentTranslations = translations[language] || translations.pt;

  const t = (key: string, variables?: Record<string, string | number>): string => {
    // 1. Try i18next first
    let result = i18nT(key, variables);
    // If not found, i18next returns the key string
    if (result === undefined || result === key) {
      // 2. Resolve nested path in current translations (e.g. "dashboard.chef_portal")
      const parts = key.split(".");
      let val: any = currentTranslations;
      for (const p of parts) {
        if (val && typeof val === "object" && p in val) {
          val = val[p];
        } else {
          val = undefined;
          break;
        }
      }

      // If not found in current language, try Portuguese fallback
      if (typeof val !== "string") {
        let fbVal: any = translations.pt;
        for (const p of parts) {
          if (fbVal && typeof fbVal === "object" && p in fbVal) {
            fbVal = fbVal[p];
          } else {
            fbVal = undefined;
            break;
          }
        }
        if (typeof fbVal === "string") {
          val = fbVal;
        }
      }

      // 3. Fallback: if single key and not nested, check common namespace
      if (typeof val !== "string" && !key.includes(".")) {
        if ((currentTranslations as any)?.common?.[key]) {
          val = (currentTranslations as any).common[key];
        } else if ((translations.pt as any)?.common?.[key]) {
          val = (translations.pt as any).common[key];
        }
      }

      if (typeof val === "string") {
        result = val;
        // Interpolate variables {{var}}
        if (variables) {
          Object.entries(variables).forEach(([k, v]) => {
            result = result.replace(new RegExp(`{{${k}}}`, "g"), String(v));
          });
        }
      }
    }
    return result !== undefined ? result : key;
  };

  const localGetLangText = (texts: { pt: string; es?: string; en?: string; fr?: string }) =>
    getLangText(language, texts);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        getLangText: localGetLangText,
        translations: currentTranslations,
        allTranslations: translations,
        i18n: i18nInstance,
        availableLanguages: AVAILABLE_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};

export const useLanguage = useTranslation;
