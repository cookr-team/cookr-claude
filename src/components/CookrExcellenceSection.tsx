import React from "react";
import { ShieldCheck, Award, Leaf, UtensilsCrossed, Sparkles, CheckCircle2, Crown } from "lucide-react";

import { tr } from "../lib/tr";
import { useLanguage } from "../contexts/LanguageContext";
interface CookrExcellenceSectionProps {
  className?: string;
}

export const CookrExcellenceSection: React.FC<CookrExcellenceSectionProps> = ({ className = "" }) => {
  useLanguage();
  const cards = [
    {
      id: "certificacao",
      badge: "SELEÇÃO DE ELITE",
      title: "Certificação & Rigor",
      description: "Apenas 5% dos Chefs candidatos superam os nossos testes práticos e de higiene alimentar.",
      image: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=600&q=80",
      imageAlt: "Chef profissional em avaliação técnica rigorosa",
      icon: ShieldCheck,
      secondaryIcon: Award,
      badgeIcon: Crown,
      statsHighlight: "Apenas 5% aceites",
    },
    {
      id: "ingredientes",
      badge: "FRESCURA GARANTIDA",
      title: "Ingredientes de Origem",
      description: "Produtos frescos comprados no próprio dia em mercados locais e produtores selecionados.",
      image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80",
      imageAlt: "Ingredientes frescos de produtores locais selecionados",
      icon: Leaf,
      secondaryIcon: Sparkles,
      badgeIcon: ShieldCheck,
      statsHighlight: "Colhido & comprado no dia",
    },
    {
      id: "servico",
      badge: "CHAVE-NA-MÃO TOTAL",
      title: "Serviço Chave-na-Mão",
      description: "Preparação, serviço de mesa e higienização total da cozinha incluídos.",
      image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
      imageAlt: "Mesa posta de fine dining com serviço impecável",
      icon: UtensilsCrossed,
      secondaryIcon: CheckCircle2,
      badgeIcon: Award,
      statsHighlight: "Cozinha impecável no final",
    },
  ];

  return (
    <section className={`py-16 md:py-24 bg-white relative overflow-hidden ${className}`}>
      {/* Elementos visuais de fundo subtis */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-16 relative">
        {/* 1. Cabeçalho Centralizado */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          {/* Tag / Badge superior */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-200/70 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[11px] font-black text-orange-600 uppercase tracking-widest">
              GARANTIA & RIGOR
            </span>
          </div>

          {/* Título Principal (H2) */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tight uppercase leading-[1.1]">
            {tr("O PADRÃO DE EXCELÊNCIA")} <span className="text-orange-500">{tr("COOKR")}</span>
          </h2>

          {/* Subtítulo */}
          <p className="text-base sm:text-lg font-medium text-slate-500 max-w-xl mx-auto">
            {tr("A Cookr seleciona apenas a elite para a sua casa.")}
          </p>
        </div>

        {/* 2. Grelha de 3 Cartões */}
        <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {cards.map((card) => {
            const Icon = card.icon;
            const SecondaryIcon = card.secondaryIcon;

            return (
              <div
                key={card.id}
                className="group bg-white rounded-2xl border border-slate-200/80 hover:border-orange-500/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
              >
                {/* Imagem Editorial com Selo Flutuante */}
                <div className="relative h-56 sm:h-60 overflow-hidden bg-slate-100">
                  <img
                    src={card.image}
                    alt={card.imageAlt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading="lazy"
                  />
                  {/* Gradiente subtil para contraste */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/10 to-transparent" />

                  {/* Selo / Ícone flutuante no canto superior */}
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-white/60 shadow-md text-orange-600 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                    <Icon size={20} strokeWidth={2.5} />
                  </div>

                  {/* Destaque rápido sobre a foto */}
                  <div className="absolute bottom-3 left-4 flex items-center gap-1.5 text-white/95 text-xs font-semibold drop-shadow-md">
                    <SecondaryIcon size={14} className="text-orange-400" />
                    <span>{card.statsHighlight}</span>
                  </div>
                </div>

                {/* Conteúdo textual do cartão */}
                <div className="p-6 sm:p-7 flex flex-col flex-1 justify-between gap-6">
                  <div className="space-y-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight group-hover:text-orange-600 transition-colors duration-200">
                      {tr(card.title as any) as any}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-normal">
                      {tr(card.description as any) as any}
                    </p>
                  </div>

                  {/* Badge inferior exclusivo */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-amber-400 border border-amber-400/20 shadow-xs text-[11px] font-semibold uppercase tracking-wider">
                      {React.createElement(card.badgeIcon || Crown, {
                        size: 12,
                        strokeWidth: 1.5,
                        className: "text-amber-400 shrink-0",
                      })}
                      {tr(card.badge as any) as any}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CookrExcellenceSection;
