import React from "react";
import { X, ArrowRight, Sparkles, Flame, CheckCircle2, Crown, ExternalLink } from "lucide-react";

import { tr } from "../lib/tr";
import { useLanguage } from "../contexts/LanguageContext";
export interface CategoryInfo {
  id: string;
  title: string;
  count: string;
  subtitle: string;
  description: string;
  img: string;
  highlights: string[];
}

export const CATEGORIES_DATA: Record<string, CategoryInfo> = {
  "tradicional-lusa": {
    id: "tradicional-lusa",
    title: "Tradicional Lusa",
    count: "62 Chefs Disponíveis",
    subtitle: "A riqueza dos sabores portugueses e das nossas origens",
    description: "Homenageia a herança gastronómica de Portugal com um toque contemporâneo. Dos receituários clássicos de família às reinterpretações dos grandes assados e mariscos da nossa costa.",
    img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=800",
    highlights: ["Receituário & Memória", "Produtos de Lota & Quinta", "Conforto da Partilha"],
  },
  "tradicional": {
    id: "tradicional-lusa",
    title: "Tradicional Lusa",
    count: "62 Chefs Disponíveis",
    subtitle: "A riqueza dos sabores portugueses e das nossas origens",
    description: "Homenageia a herança gastronómica de Portugal com um toque contemporâneo. Dos receituários clássicos de família às reinterpretações dos grandes assados e mariscos da nossa costa.",
    img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=800",
    highlights: ["Receituário & Memória", "Produtos de Lota & Quinta", "Conforto da Partilha"],
  },
  "sushi-de-autor": {
    id: "sushi-de-autor",
    title: "Sushi de Autor",
    count: "28 Chefs Disponíveis",
    subtitle: "A arte do Omakase e da fusão contemporânea",
    description: "Uma viagem sensorial baseada na frescura absoluta do peixe de época, cortado e preparado ao momento no balcão da sua cozinha com o ritual exclusivo de um Sushiman de topo.",
    img: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=800",
    highlights: ["Corte & Preparação Ao Vivo", "Ritual Omakase Interativo", "Personalização Absoluta"],
  },
  "fine-dining": {
    id: "fine-dining",
    title: "Fine Dining",
    count: "45 Chefs Disponíveis",
    subtitle: "A alta gastronomia dos melhores restaurantes na sua casa",
    description: "Menus de degustação autorais de múltiplos momentos por chefs de alta gastronomia, com harmonização de vinhos e serviço de sala na privacidade da sua mesa.",
    img: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=800",
    highlights: ["Chef Dedicado Na Sua Mesa", "Harmonização de Vinhos", "Privacidade & Conforto Total"],
  },
  "plant-based": {
    id: "plant-based",
    title: "Plant Based",
    count: "15 Chefs Disponíveis",
    subtitle: "Gastronomia botânica, orgânica e contemporânea",
    description: "A alta cozinha vegetal levada ao pico do sabor. Ingredientes orgânicos de produtores locais trabalhados com técnica, inovação e rigor nutricional.",
    img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800",
    highlights: ["100% Origem Vegetal", "Orgânico & Sazonal", "Sabor Sem Compromisso"],
  },
};

interface CategoryQuickModalProps {
  categoryId: string | null;
  onClose: () => void;
  onOpenAuth: (flow?: "login" | "register") => void;
  onNavigatePage?: (route: string) => void;
}

export const CategoryQuickModal: React.FC<CategoryQuickModalProps> = ({
  categoryId,
  onClose,
  onOpenAuth,
  onNavigatePage,
}) => {
  useLanguage();
  if (!categoryId) return null;

  const data = CATEGORIES_DATA[categoryId] || CATEGORIES_DATA["tradicional-lusa"];

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-[#0B0F17] border border-white/10 rounded-3xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col text-white my-auto animate-in zoom-in-95 duration-300">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-28 bg-[#FF5500]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/60 border border-white/15 text-slate-300 hover:text-white hover:bg-black hover:border-[#FF5500] transition-all flex items-center justify-center cursor-pointer shadow-lg active:scale-95"
          title={tr("Fechar")}
        >
          <X size={18} />
        </button>

        {/* Hero Image Header */}
        <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-900">
          <img
            src={data.img}
            alt={data.title}
            className="w-full h-full object-cover filter brightness-[0.6] contrast-110 scale-105"
            referrerPolicy="no-referrer"
            loading="eager"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/40 to-transparent" />

          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5500]/20 border border-[#FF5500]/40 text-[#FF5500] text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                <Flame size={12} />
                <span>{data.count}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white drop-shadow-md">
                {data.title}
              </h3>
            </div>
            <Crown size={22} className="text-[#FF5500] opacity-80 mb-1" />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 space-y-5">
          <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
            {data.description}
          </p>

          {/* Highlights Micro-Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {data.highlights.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] font-semibold text-slate-200"
              >
                <CheckCircle2 size={13} className="text-[#FF5500]" />
                <span>{item}</span>
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="pt-3 space-y-3">
            <button
              onClick={() => {
                onClose();
                onOpenAuth("register");
              }}
              className="w-full py-4 bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-[#FF5500]/25 transition-all duration-300 active:scale-95 cursor-pointer flex items-center justify-center gap-2.5"
            >
              <span>{tr("Criar Conta / Entrar para Explorar")}</span>
              <ArrowRight size={16} />
            </button>

            {onNavigatePage && (
              <button
                onClick={() => {
                  onClose();
                  onNavigatePage(data.id);
                }}
                className="w-full py-2.5 text-center text-xs text-slate-400 hover:text-white font-bold uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{tr("Ver página com detalhes de")} {data.title}</span>
                <ExternalLink size={13} className="text-[#FF5500]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryQuickModal;
