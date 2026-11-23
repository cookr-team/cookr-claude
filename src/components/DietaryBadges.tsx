import React from "react";

import { tr } from "../lib/tr";
import { useLanguage } from "../contexts/LanguageContext";
interface DietaryBadgeConfig {
  bg: string;
  short: string;
  label: string;
  icon: string;
  colorClass: string;
}

export function getDietaryBadgeConfig(tag: string): DietaryBadgeConfig {
  const norm = tag.toLowerCase().trim().replace(/_/g, " ");
  
  if (norm.includes("vegan") || norm === "vg") {
    return {
      bg: "bg-emerald-500 border-emerald-600 text-white",
      colorClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      short: "VG",
      label: "Vegan",
      icon: "●"
    };
  }
  
  if (norm.includes("vegetariano") || norm.includes("vegetarian") || norm === "vt") {
    return {
      bg: "bg-teal-500 border-teal-600 text-white",
      colorClass: "bg-teal-50 text-teal-800 border-teal-200",
      short: "VT",
      label: "Vegetariano",
      icon: "◆"
    };
  }
  
  if (norm.includes("gluten") || norm.includes("glúten") || norm === "gf" || norm.includes("g-f")) {
    return {
      bg: "bg-amber-500 border-amber-600 text-white",
      colorClass: "bg-amber-50 text-amber-800 border-amber-200",
      short: "GF",
      label: "Sem Glúten",
      icon: "▲"
    };
  }
  
  if (norm.includes("lactose") || norm === "df" || norm.includes("dairy")) {
    return {
      bg: "bg-sky-500 border-sky-600 text-white",
      colorClass: "bg-sky-50 text-sky-800 border-sky-200",
      short: "DF",
      label: "Sem Lactose",
      icon: "■"
    };
  }
  
  if (norm.includes("keto") || norm.includes("cetogenica") || norm.includes("cetogénica") || norm === "kt") {
    return {
      bg: "bg-purple-500 border-purple-600 text-white",
      colorClass: "bg-purple-50 text-purple-800 border-purple-200",
      short: "KT",
      label: "Keto",
      icon: "✦"
    };
  }
  
  if (norm.includes("low carb") || norm.includes("lowcarb") || norm === "lc") {
    return {
      bg: "bg-rose-500 border-rose-600 text-white",
      colorClass: "bg-rose-50 text-rose-800 border-rose-200",
      short: "LC",
      label: "Low Carb",
      icon: "◉"
    };
  }
  
  if (norm.includes("saudavel") || norm.includes("saudável") || norm.includes("fit") || norm.includes("healthy")) {
    return {
      bg: "bg-violet-500 border-violet-600 text-white",
      colorClass: "bg-violet-50 text-violet-800 border-violet-200",
      short: "FIT",
      label: "Saudável / Fit",
      icon: "▼"
    };
  }

  // Fallback for custom/unmapped tags
  return {
    bg: "bg-slate-700 border-slate-800 text-white",
    colorClass: "bg-slate-50 text-slate-700 border-slate-200",
    short: tag.slice(0, 3).toUpperCase(),
    label: tag,
    icon: "◈"
  };
}

interface DietaryBadgesProps {
  tags?: string[];
  compact?: boolean;
  maxTags?: number;
}

export const DietaryBadges: React.FC<DietaryBadgesProps> = ({
  tags = [],
  compact = false,
  maxTags = 4
}) => {
  useLanguage();
  if (!tags || tags.length === 0) return null;

  const displayTags = tags.slice(0, maxTags);

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {displayTags.map((tag, idx) => {
        const config = getDietaryBadgeConfig(tag);
        
        if (compact) {
          return (
            <div
              key={idx}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[8px] font-black tracking-wider uppercase shadow-sm transition-all hover:scale-105 select-none ${config.bg}`}
              title={config.label}
            >
              <span>{config.icon}</span>
              <span>{config.short}</span>
            </div>
          );
        }

        return (
          <div
            key={idx}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[8.5px] font-black uppercase tracking-wider shadow-sm transition-all hover:scale-105 select-none ${config.colorClass}`}
            title={config.label}
          >
            <span>{config.icon}</span>
            <span>{tr(config.label as any) as any}</span>
          </div>
        );
      })}
    </div>
  );
};
