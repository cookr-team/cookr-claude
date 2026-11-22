import React, { useRef, useState, useEffect, useCallback } from "react";
import { 
  Award, 
  Leaf, 
  Utensils, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles,
  CheckCircle2,
  Crown
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

interface ExcellenceStandardProps {
  onExploreChefs?: () => void;
}

export const ExcellenceStandard: React.FC<ExcellenceStandardProps> = ({ onExploreChefs }) => {
  const { language } = useLanguage();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Content localized with exact strings required in PT
  const content = {
    tag: {
      pt: "GARANTIA & RIGOR",
      en: "GUARANTEE & RIGOR",
      es: "GARANTÍA Y RIGOR",
      fr: "GARANTIE & RIGUEUR",
    },
    title: {
      pt: "O PADRÃO DE EXCELÊNCIA COOKR",
      en: "THE COOKR STANDARD OF EXCELLENCE",
      es: "EL ESTÁNDAR DE EXCELENCIA COOKR",
      fr: "LE STANDARD D'EXCELLENCE COOKR",
    },
    subtitle: {
      pt: "A Cookr seleciona apenas a elite para a sua casa.",
      en: "Cookr selects only the culinary elite for your home.",
      es: "Cookr selecciona únicamente a la élite para su hogar.",
      fr: "Cookr sélectionne uniquement l'élite pour votre table.",
    },
    cards: [
      {
        id: "certification",
        number: "01",
        title: {
          pt: "Mestres da Gastronomia",
          en: "Masters of Gastronomy",
          es: "Maestros de la Gastronomía",
          fr: "Maîtres de la Gastronomie",
        },
        desc: {
          pt: "Todos os nossos chefs passam por um processo de seleção altamente controlado e especializado, garantindo padrões de excelência em técnica, criatividade e serviço.",
          en: "All our chefs undergo a highly controlled and specialized selection process, ensuring standards of excellence in technique, creativity and service.",
          es: "Todos nuestros chefs pasan por un proceso de selección altamente controlado y especializado, garantizando estándares de excelencia en técnica, creatividad y servicio.",
          fr: "Tous nos chefs suivent un processus de sélection rigoureusement contrôlé et spécialisé, garantissant des standards d'excellence en technique, créativité et service.",
        },
        badge: {
          pt: "EXCLUSIVIDADE GARANTIDA",
          en: "GUARANTEED EXCLUSIVITY",
          es: "EXCLUSIVIDAD GARANTIZADA",
          fr: "EXCLUSIVITÉ GARANTIE",
        },
        floatingTag: {
          pt: "SELEÇÃO RIGOROSA",
          en: "RIGOROUS SELECTION",
          es: "SELECCIÓN RIGUROSA",
          fr: "SÉLECTION RIGOUREUSE",
        },
        sealText: {
          pt: "CURATORIA COOKR",
          en: "COOKR CURATION",
          es: "CURATORÍA COOKR",
          fr: "CURATION COOKR",
        },
        image: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=600&q=80",
        icon: Award,
        badgeIcon: Crown,
        highlightColor: "orange",
      },
      {
        id: "ingredients",
        number: "02",
        title: {
          pt: "Ingredientes de Exceção",
          en: "Exceptional Ingredients",
          es: "Ingredientes de Excepción",
          fr: "Ingrédients d'Exception",
        },
        desc: {
          pt: "Matérias-primas de produtores locais e mercados tradicionais, selecionadas à mão pelo chef poucas horas antes do seu jantar.",
          en: "Raw ingredients from local producers and traditional markets, hand-picked by the chef just hours before your dinner.",
          es: "Materias primas de productores locales y mercados tradicionales, seleccionadas a mano por el chef pocas horas antes de su cena.",
          fr: "Matières premières de producteurs locaux et marchés traditionnels, sélectionnées à la main par le chef quelques heures avant votre dîner.",
        },
        badge: {
          pt: "FRESCURA INTEGRAL",
          en: "COMPLETE FRESHNESS",
          es: "FRESCURA INTEGRAL",
          fr: "FRAÎCHEUR INTÉGRALE",
        },
        floatingTag: {
          pt: "ORIGEM CONTROLADA",
          en: "CONTROLLED ORIGIN",
          es: "ORIGEN CONTROLADO",
          fr: "ORIGINE CONTRÔLÉE",
        },
        sealText: {
          pt: "SELEÇÃO DO DIA",
          en: "SELECTION OF THE DAY",
          es: "SELECCIÓN DEL DÍA",
          fr: "SÉLECTION DU JOUR",
        },
        image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80",
        icon: Leaf,
        badgeIcon: ShieldCheck,
        highlightColor: "emerald",
      },
      {
        id: "turnkey",
        number: "03",
        title: {
          pt: "Serviço Chave-na-Mão",
          en: "Turnkey Service",
          es: "Servicio Llave en Mano",
          fr: "Service Clé en Main",
        },
        desc: {
          pt: "Preparação, serviço de mesa e higienização total da cozinha incluídos.",
          en: "Preparation, table service and complete kitchen sanitization included.",
          es: "Preparación, servicio de mesa e higienización total de la cocina incluidos.",
          fr: "Préparation, service à table et nettoyage complet de la cuisine inclus.",
        },
        badge: {
          pt: "CHAVE-NA-MÃO TOTAL",
          en: "TOTAL TURNKEY",
          es: "LLAVE EN MANO TOTAL",
          fr: "TOTAL CLÉ EN MAIN",
        },
        floatingTag: {
          pt: "Cozinha Imaculada",
          en: "Spotless Kitchen",
          es: "Cocina Impecable",
          fr: "Cuisine Impeccable",
        },
        sealText: {
          pt: "SERVIÇO COMPLETO",
          en: "FULL SERVICE",
          es: "SERVICIO COMPLETO",
          fr: "SERVICE COMPLET",
        },
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
        icon: Utensils,
        badgeIcon: Award,
        highlightColor: "orange",
      },
    ],
  };

  const currentLang = (language in content.tag ? language : "pt") as "pt" | "en" | "es" | "fr";

  // Monitor scroll state for smooth dots synchronization and arrow button activation
  const updateScrollState = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;

    const scrollLeft = el.scrollLeft;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(scrollLeft > 20);
    setCanScrollRight(scrollLeft < maxScrollLeft - 20);

    // Calculate which card is most visible
    const cardElements = el.querySelectorAll<HTMLElement>("[data-carousel-card]");
    if (cardElements.length > 0) {
      const containerRect = el.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;

      let closestIndex = 0;
      let minDistance = Infinity;

      cardElements.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(containerCenter - cardCenter);

        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      setActiveIndex(closestIndex);
    }
  }, []);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scrollToIndex = (index: number) => {
    const el = carouselRef.current;
    if (!el) return;

    const cardElements = el.querySelectorAll<HTMLElement>("[data-carousel-card]");
    if (cardElements[index]) {
      const card = cardElements[index];
      const cardLeft = card.offsetLeft;
      const cardWidth = card.clientWidth;
      const containerWidth = el.clientWidth;
      
      const targetScroll = cardLeft - (containerWidth / 2) + (cardWidth / 2);
      
      el.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });
      setActiveIndex(index);
    }
  };

  const handlePrev = () => {
    const nextIndex = Math.max(0, activeIndex - 1);
    scrollToIndex(nextIndex);
  };

  const handleNext = () => {
    const nextIndex = Math.min(content.cards.length - 1, activeIndex + 1);
    scrollToIndex(nextIndex);
  };

  return (
    <section className="py-14 md:py-20 bg-slate-50/70 border-y border-slate-200/60 overflow-hidden relative">
      {/* Subtle decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 relative z-10">
        {/* 1. Cabeçalho Centralizado */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 md:mb-14">
          {/* Tag / Badge Superior */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/70 shadow-xs">
            <ShieldCheck size={13} className="text-orange-600" />
            <span className="text-[11px] font-black uppercase tracking-wider text-orange-600">
              {content.tag[currentLang]}
            </span>
          </div>

          {/* Título Principal (H2) */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-950 tracking-tighter uppercase leading-[1.1]">
            {content.title[currentLang]}
          </h2>

          {/* Subtítulo */}
          <p className="text-sm sm:text-base md:text-lg font-medium text-slate-500 max-w-xl mx-auto">
            {content.subtitle[currentLang]}
          </p>
        </div>

        {/* Carousel Container with Desktop Arrow Controls */}
        <div className="relative group/carousel">
          {/* Desktop Navigation Arrow - Left */}
          <button
            onClick={handlePrev}
            disabled={!canScrollLeft}
            aria-label="Cartão anterior"
            className={`hidden md:flex absolute -left-4 lg:-left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full items-center justify-center bg-white border border-slate-200 text-slate-800 shadow-md hover:bg-slate-50 hover:border-orange-500/40 hover:text-orange-600 transition-all duration-200 cursor-pointer ${
              !canScrollLeft ? "opacity-30 cursor-not-allowed pointer-events-none" : "opacity-90 hover:opacity-100 hover:scale-105"
            }`}
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>

          {/* Desktop Navigation Arrow - Right */}
          <button
            onClick={handleNext}
            disabled={!canScrollRight}
            aria-label="Próximo cartão"
            className={`hidden md:flex absolute -right-4 lg:-right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full items-center justify-center bg-white border border-slate-200 text-slate-800 shadow-md hover:bg-slate-50 hover:border-orange-500/40 hover:text-orange-600 transition-all duration-200 cursor-pointer ${
              !canScrollRight ? "opacity-30 cursor-not-allowed pointer-events-none" : "opacity-90 hover:opacity-100 hover:scale-105"
            }`}
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>

          {/* 2. Carrossel de Cartões (Slider horizontal com scroll suave e swipe mobile) */}
          <div
            ref={carouselRef}
            className="flex gap-5 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 pt-1 px-2 no-scrollbar focus:outline-none"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {content.cards.map((card, index) => {
              const IconComponent = card.icon;
              const isSelected = activeIndex === index;

              return (
                <div
                  key={card.id}
                  data-carousel-card
                  onClick={() => scrollToIndex(index)}
                  className={`snap-center shrink-0 w-[84vw] sm:w-[350px] md:w-[360px] lg:w-[calc(33.333%-16px)] bg-white rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden text-left cursor-pointer group ${
                    isSelected
                      ? "border-orange-500/40 shadow-[0_12px_35px_rgba(255,107,53,0.12)] md:shadow-[0_12px_30px_rgba(0,0,0,0.06)] ring-1 ring-orange-500/20"
                      : "border-slate-200/80 shadow-[0_8px_25px_rgba(0,0,0,0.04)] hover:border-slate-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.07)]"
                  }`}
                >
                  {/* Top Image / Editorial Illustration */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                    <img
                      src={card.image}
                      alt={card.title[currentLang]}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

                    {/* Step Number Indicator */}
                    <div className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] font-bold tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span>{card.number}</span>
                    </div>

                    {/* Floating Editorial Seal Badge */}
                    <div className="absolute top-3.5 right-3.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md shadow-sm border border-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <IconComponent size={12} className="text-orange-500" />
                      <span>{card.floatingTag[currentLang]}</span>
                    </div>

                    {/* Bottom overlay title highlight */}
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-sm">
                          <IconComponent size={14} />
                        </div>
                        <span className="text-xs font-bold text-white/90 uppercase tracking-wider">
                          {(card as any).sealText ? (card as any).sealText[currentLang] : "CURATORIA COOKR"}
                        </span>
                      </div>
                      <CheckCircle2 size={16} className="text-orange-400" />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      {/* Título (H3) */}
                      <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-snug group-hover:text-orange-600 transition-colors">
                        {card.title[currentLang]}
                      </h3>

                      {/* Descrição */}
                      <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">
                        {card.desc[currentLang]}
                      </p>
                    </div>

                    {/* Badge Inferior */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-amber-400 border border-amber-400/20 shadow-xs text-[11px] font-semibold uppercase tracking-wider">
                        {React.createElement((card as any).badgeIcon || Crown, {
                          size: 12,
                          strokeWidth: 1.5,
                          className: "text-amber-400 shrink-0",
                        })}
                        <span>{card.badge[currentLang]}</span>
                      </div>

                      <span className="text-[11px] font-semibold text-slate-400 group-hover:text-amber-500 transition-colors flex items-center gap-0.5">
                        0{index + 1}/03
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Indicadores de Navegação Inferiores (Dots) */}
        <div className="flex items-center justify-center gap-2 mt-6 md:mt-8">
          {content.cards.map((card, index) => {
            const isSelected = activeIndex === index;
            return (
              <button
                key={card.id}
                onClick={() => scrollToIndex(index)}
                aria-label={`Ir para ${card.title[currentLang]}`}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer border-none focus:outline-none ${
                  isSelected
                    ? "w-8 bg-orange-500 shadow-xs"
                    : "w-2.5 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ExcellenceStandard;
