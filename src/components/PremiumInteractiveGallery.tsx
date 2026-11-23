import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, ChevronLeft, ChevronRight, X, Maximize2, Sparkles, ChefHat } from "lucide-react";

import { tr } from "../lib/tr";
import { useLanguage } from "../contexts/LanguageContext";
interface GalleryItem {
  id: number;
  label: string;
  images: {
    url: string;
    title: string;
    desc: string;
  }[];
}

const GALLERY_DATA: GalleryItem[] = [
  {
    id: 1,
    label: "A Experiência",
    images: [
      {
        url: "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?q=80&w=800",
        title: "Alta Cozinha no Seu Lar",
        desc: "A sensação única de acolher os seus convidados com a sofisticação de um restaurante de luxo, mas no calor e na privacidade da sua própria casa."
      },
      {
        url: "https://images.unsplash.com/photo-1541014741259-df5290dbf826?q=80&w=800",
        title: "Mesas que Contam Histórias",
        desc: "Uma curadoria de luz, decoração e serviço dedicada a transformar a sua mesa habitual num palco de memórias inesquecíveis."
      },
      {
        url: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=800",
        title: "Intimidade & Partilha",
        desc: "Conversas espontâneas e risos soltos fluem sem pressas, sem tempos de reserva ou filas, apenas com foco no momento presente."
      }
    ]
  },
  {
    id: 2,
    label: "O Chef em Ação",
    images: [
      {
        url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=800",
        title: "Mestria e Rigor no Local",
        desc: "Assista de perto à preparação de cada elemento. O Chef utiliza a sua cozinha como laboratório criativo de técnicas requintadas."
      },
      {
        url: "https://images.unsplash.com/photo-1595273670150-db0a3e368167?q=80&w=800",
        title: "O Detalhe do Empratamento",
        desc: "Cada prato é desenhado e finalizado individualmente com flores comestíveis, óleos aromáticos e precisão cirúrgica de pinça."
      },
      {
        url: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?q=80&w=800",
        title: "Ingredientes Selecionados",
        desc: "Antes de entrar em sua casa, o Chef faz uma curadoria rigorosa de pequenos produtores e ingredientes sazonais ultra-frescos."
      }
    ]
  },
  {
    id: 3,
    label: "Cocktail & Pairing",
    images: [
      {
        url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=800",
        title: "Mixologia de Boas-Vindas",
        desc: "Damos início ao ritual com cocktails personalizados de assinatura, aromatizados com ervas frescas e infusões de autor."
      },
      {
        url: "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?q=80&w=800",
        title: "A Harmonia dos Vinhos",
        desc: "Cada prato é acompanhado por uma seleção de néctares que potenciam e equilibram as notas de sabor desenhadas pelo Chef."
      },
      {
        url: "https://images.unsplash.com/photo-1528823872057-9c018a7a72b5?q=80&w=800",
        title: "O Brinde Perfeito",
        desc: "Bebidas premium servidas na temperatura exata para acolher os seus convidados com toda a elegância."
      }
    ]
  },
  {
    id: 4,
    label: "Criações de Autor",
    images: [
      {
        url: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800",
        title: "Texturas e Contrastes",
        desc: "Criações exclusivas que fundem raízes gastronómicas tradicionais com novas abordagens e texturas surpreendentes."
      },
      {
        url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800",
        title: "Frescura e Identidade",
        desc: "Pratos principais onde a proteína de excelência brilha ao lado de acompanhamentos botânicos requintados."
      },
      {
        url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800",
        title: "Finalizações de Mesa",
        desc: "Alguns pratos recebem toques finais ao vivo na mesa de jantar, como caldos vertidos ou fumo aromático."
      }
    ]
  },
  {
    id: 5,
    label: "O Desfecho Doce",
    images: [
      {
        url: "https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=800",
        title: "Texturas de Chocolate Fino",
        desc: "O encerramento doce do ritual: um tributo ao cacau de origem, trabalhado em diferentes temperaturas e densidades."
      },
      {
        url: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=800",
        title: "Delicadeza de Pastelaria Fina",
        desc: "Tarteletes artesanais com cremes aveludados de baunilha e frutas ácidas para equilibrar o palato."
      },
      {
        url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=800",
        title: "Sobremesas Empratadas no Momento",
        desc: "O Chef executa uma verdadeira pintura no prato de sobremesa mesmo antes de a servir, criando um impacto visual arrebatador."
      }
    ]
  }
];

export const PremiumInteractiveGallery: React.FC = () => {
  useLanguage();
  // Indices tracking current image shown in each slot (0, 1 or 2)
  const [slotIndices, setSlotIndices] = useState<number[]>([0, 0, 0, 0, 0]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Periodically change a random slot to create a "living" mood wall
  useEffect(() => {
    const interval = setInterval(() => {
      // Pick a random slot to transition (0 to 4)
      const randomSlot = Math.floor(Math.random() * 5);
      setSlotIndices((prev) => {
        const next = [...prev];
        next[randomSlot] = (next[randomSlot] + 1) % 3;
        return next;
      });
    }, 6500); // Gentle transition every 6.5 seconds

    return () => clearInterval(interval);
  }, []);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextImage = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % GALLERY_DATA.length : null));
  }, [lightboxIndex]);

  const prevImage = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + GALLERY_DATA.length) % GALLERY_DATA.length : null
    );
  }, [lightboxIndex]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, nextImage, prevImage]);

  return (
    <section className="space-y-8 select-none">
      {/* Title */}
      <div className="text-left space-y-1.5 px-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/10 text-[9px] font-black uppercase tracking-widest leading-none">
          <Sparkles size={10} className="animate-pulse" />
          {tr("Galeria Viva")}
        </div>
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-950 tracking-tighter uppercase leading-none">
          {tr("Inspiração")} <span className="text-orange-500">{tr("Visual.")}</span>
        </h2>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          {tr("Momentos capturados nos nossos rituais gastronómicos reais.")}
        </p>
      </div>

      {/* Asymmetric Bento-Style Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4.5 px-1">
        
        {/* Column 1: Tall Card (Slot 1) */}
        <div 
          onClick={() => openLightbox(0)}
          className="group rounded-2xl md:rounded-[2.2rem] overflow-hidden aspect-square md:aspect-auto md:h-[420px] relative shadow-md border border-slate-100 hover:border-orange-500/20 cursor-pointer transition-all duration-500 hover:shadow-xl hover:-translate-y-1"
        >
          <div className="absolute inset-0 w-full h-full bg-slate-950">
            <AnimatePresence mode="wait">
              <motion.img
                key={`slot-0-${slotIndices[0]}`}
                src={GALLERY_DATA[0].images[slotIndices[0]].url}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: 1.2, ease: "easeOut" } }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.8 } }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2.5s] ease-out pointer-events-none"
                alt={tr("Momentos")}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-60 group-hover:opacity-85 transition-opacity duration-300" />
          
          {/* Glassmorphic Minimal Card Details */}
          <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-slate-950/40 backdrop-blur-md border border-white/10 text-left opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <p className="text-[8px] font-black uppercase text-orange-400 tracking-wider">
              {GALLERY_DATA[0].label}
            </p>
            <h4 className="text-xs font-black text-white uppercase tracking-tight mt-0.5">
              {GALLERY_DATA[0].images[slotIndices[0]].title}
            </h4>
          </div>

          <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
            <Maximize2 size={11} />
          </div>
        </div>

        {/* Column 2: Two Square Cards (Slot 2 and Slot 3) */}
        <div className="grid grid-rows-2 gap-2.5 md:gap-4.5">
          {/* Slot 2 */}
          <div 
            onClick={() => openLightbox(1)}
            className="group rounded-2xl md:rounded-[2.2rem] overflow-hidden aspect-square relative shadow-md border border-slate-100 hover:border-orange-500/20 cursor-pointer transition-all duration-500 hover:shadow-xl hover:-translate-y-1"
          >
            <div className="absolute inset-0 w-full h-full bg-slate-950">
              <AnimatePresence mode="wait">
                <motion.img
                  key={`slot-1-${slotIndices[1]}`}
                  src={GALLERY_DATA[1].images[slotIndices[1]].url}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1, transition: { duration: 1.2, ease: "easeOut" } }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.8 } }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2.5s] ease-out pointer-events-none"
                  alt={tr("Preparação")}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-60 group-hover:opacity-85 transition-opacity duration-300" />
            
            <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-slate-950/40 backdrop-blur-md border border-white/10 text-left opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              <p className="text-[8px] font-black uppercase text-orange-400 tracking-wider">
                {GALLERY_DATA[1].label}
              </p>
              <h4 className="text-xs font-black text-white uppercase tracking-tight mt-0.5">
                {GALLERY_DATA[1].images[slotIndices[1]].title}
              </h4>
            </div>

            <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
              <Maximize2 size={11} />
            </div>
          </div>

          {/* Slot 3 */}
          <div 
            onClick={() => openLightbox(2)}
            className="group rounded-2xl md:rounded-[2.2rem] overflow-hidden aspect-square relative shadow-md border border-slate-100 hover:border-orange-500/20 cursor-pointer transition-all duration-500 hover:shadow-xl hover:-translate-y-1"
          >
            <div className="absolute inset-0 w-full h-full bg-slate-950">
              <AnimatePresence mode="wait">
                <motion.img
                  key={`slot-2-${slotIndices[2]}`}
                  src={GALLERY_DATA[2].images[slotIndices[2]].url}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1, transition: { duration: 1.2, ease: "easeOut" } }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.8 } }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2.5s] ease-out pointer-events-none"
                  alt={tr("Pairing")}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-60 group-hover:opacity-85 transition-opacity duration-300" />
            
            <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-slate-950/40 backdrop-blur-md border border-white/10 text-left opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              <p className="text-[8px] font-black uppercase text-orange-400 tracking-wider">
                {GALLERY_DATA[2].label}
              </p>
              <h4 className="text-xs font-black text-white uppercase tracking-tight mt-0.5">
                {GALLERY_DATA[2].images[slotIndices[2]].title}
              </h4>
            </div>

            <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
              <Maximize2 size={11} />
            </div>
          </div>
        </div>

        {/* Column 3: Tall Card (Slot 4) */}
        <div 
          onClick={() => openLightbox(3)}
          className="group rounded-2xl md:rounded-[2.2rem] overflow-hidden aspect-square md:aspect-auto md:h-[420px] relative shadow-md border border-slate-100 hover:border-orange-500/20 cursor-pointer transition-all duration-500 hover:shadow-xl hover:-translate-y-1"
        >
          <div className="absolute inset-0 w-full h-full bg-slate-950">
            <AnimatePresence mode="wait">
              <motion.img
                key={`slot-3-${slotIndices[3]}`}
                src={GALLERY_DATA[3].images[slotIndices[3]].url}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: 1.2, ease: "easeOut" } }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.8 } }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2.5s] ease-out pointer-events-none"
                alt={tr("Prato")}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-60 group-hover:opacity-85 transition-opacity duration-300" />
          
          <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-slate-950/40 backdrop-blur-md border border-white/10 text-left opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <p className="text-[8px] font-black uppercase text-orange-400 tracking-wider">
              {GALLERY_DATA[3].label}
            </p>
            <h4 className="text-xs font-black text-white uppercase tracking-tight mt-0.5">
              {GALLERY_DATA[3].images[slotIndices[3]].title}
            </h4>
          </div>

          <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
            <Maximize2 size={11} />
          </div>
        </div>

        {/* Column 4: Two Square Cards (Slot 5 and CTA Card) */}
        <div className="grid grid-rows-2 gap-2.5 md:gap-4.5">
          {/* Slot 5 */}
          <div 
            onClick={() => openLightbox(4)}
            className="group rounded-2xl md:rounded-[2.2rem] overflow-hidden aspect-square relative shadow-md border border-slate-100 hover:border-orange-500/20 cursor-pointer transition-all duration-500 hover:shadow-xl hover:-translate-y-1"
          >
            <div className="absolute inset-0 w-full h-full bg-slate-950">
              <AnimatePresence mode="wait">
                <motion.img
                  key={`slot-4-${slotIndices[4]}`}
                  src={GALLERY_DATA[4].images[slotIndices[4]].url}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1, transition: { duration: 1.2, ease: "easeOut" } }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.8 } }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2.5s] ease-out pointer-events-none"
                  alt={tr("Sobremesa")}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-60 group-hover:opacity-85 transition-opacity duration-300" />
            
            <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-slate-950/40 backdrop-blur-md border border-white/10 text-left opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              <p className="text-[8px] font-black uppercase text-orange-400 tracking-wider">
                {GALLERY_DATA[4].label}
              </p>
              <h4 className="text-xs font-black text-white uppercase tracking-tight mt-0.5">
                {GALLERY_DATA[4].images[slotIndices[4]].title}
              </h4>
            </div>

            <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
              <Maximize2 size={11} />
            </div>
          </div>

          {/* Luxury CTA Share Card */}
          <div className="rounded-2xl md:rounded-[2.2rem] bg-orange-500 hover:bg-orange-600 flex flex-col items-center justify-center p-4 text-white text-center space-y-2.5 shadow-lg border border-orange-400/20 group cursor-default transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform duration-300">
              <Camera size={18} className="animate-pulse" />
            </div>
            <div className="space-y-0.5 text-center">
              <p className="text-[9px] md:text-[10.5px] font-black uppercase tracking-widest leading-tight">
                {tr("Partilhe o Seu")}
                <br />
                {tr("Ritual")}
              </p>
              <p className="text-[7.5px] font-black opacity-80 uppercase tracking-widest">
                {tr("@cookr_pt")}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Lightbox Modal Overlay */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-10 pointer-events-auto"
            onClick={closeLightbox}
          >
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
              aria-label={tr("Fechar")}
            >
              <X size={18} />
            </button>

            {/* Navigation Controls */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
              aria-label={tr("Anterior")}
            >
              <ChevronLeft size={22} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
              aria-label={tr("Seguinte")}
            >
              <ChevronRight size={22} />
            </button>

            {/* Main Lightbox Content Area */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl flex flex-col items-center gap-6"
            >
              {/* Image Frame with custom zoom transition */}
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 180 } }}
                exit={{ scale: 0.95, y: 15 }}
                className="w-full aspect-[4/3] md:aspect-[16/10] max-h-[60vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative bg-slate-900"
              >
                <img
                  src={GALLERY_DATA[lightboxIndex].images[slotIndices[lightboxIndex]].url}
                  className="w-full h-full object-cover select-none"
                  alt={tr("Fine dining moment")}
                  referrerPolicy="no-referrer"
                />
                
                {/* Floating Category Badge */}
                <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/15 flex items-center gap-1.5 text-white">
                  <ChefHat size={12} className="text-orange-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    {GALLERY_DATA[lightboxIndex].label}
                  </span>
                </div>
              </motion.div>

              {/* Informative text below the image */}
              <div className="text-center max-w-xl space-y-2">
                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
                  {GALLERY_DATA[lightboxIndex].images[slotIndices[lightboxIndex]].title}
                </h3>
                <p className="text-xs md:text-sm font-medium text-slate-300 leading-relaxed">
                  {GALLERY_DATA[lightboxIndex].images[slotIndices[lightboxIndex]].desc}
                </p>
                <div className="pt-2 flex items-center justify-center gap-1">
                  {GALLERY_DATA.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxIndex(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        lightboxIndex === i ? "bg-orange-500 w-5" : "bg-slate-700 hover:bg-slate-500"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
