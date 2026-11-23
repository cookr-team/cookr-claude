import React from "react";
import { Utensils, Wine, Home, ArrowRight, Crown, Sparkles, ChevronLeft, CheckCircle2, Star } from "lucide-react";

interface FineDiningPageProps {
  onNavigate: (view: string) => void;
  onOpenAuth: (flow?: "login" | "register") => void;
}

export const FineDiningPage: React.FC<FineDiningPageProps> = ({
  onNavigate,
  onOpenAuth,
}) => {
  return (
    <div className="min-h-dvh bg-[#080C14] text-white font-sans selection:bg-[#FF5500] selection:text-white flex flex-col justify-between overflow-x-hidden relative">
      {/* Background Subtle Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-radial from-[#FF5500]/10 via-transparent to-transparent blur-3xl opacity-60" />
        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-radial from-amber-500/5 via-transparent to-transparent blur-3xl opacity-40" />
      </div>

      {/* 0. Top Navigation Bar (ONLY the "Voltar" button as requested) */}
      <header className="sticky top-0 z-50 w-full bg-[#080C14]/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-8 md:px-16 py-4 flex items-center justify-between">
        <button
          onClick={() => onNavigate("landing")}
          className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 text-xs font-bold text-slate-200 hover:text-white hover:bg-white/[0.08] hover:border-[#FF5500]/60 transition-all duration-300 cursor-pointer shadow-lg shadow-black/40 active:scale-95"
          title="Voltar"
        >
          <ChevronLeft size={18} className="text-[#FF5500] group-hover:-translate-x-0.5 transition-transform" />
          <span className="tracking-wider uppercase text-[11px]">Voltar atrás</span>
        </button>

        {/* Small subtle brand indicator on the right for symmetry */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 tracking-widest uppercase opacity-70">
          <Crown size={14} className="text-[#FF5500]" />
          <span className="text-[10px] tracking-[0.2em] font-extrabold text-slate-300">Cookr Exclusive</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full z-10">
        {/* 1. HERO SECTION (HAUTE GASTRONOMY AMBIANCE) */}
        <section className="relative w-full min-h-[520px] sm:min-h-[600px] flex items-center justify-center text-center px-4 sm:px-8 py-20 overflow-hidden border-b border-white/5">
          {/* Background Haute-Cuisine Image */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=1800"
              alt="Fine Dining Plating"
              className="w-full h-full object-cover object-center filter brightness-[0.3] contrast-125 scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080C14] via-[#080C14]/65 to-[#080C14]/85" />
            <div className="absolute inset-0 bg-radial from-[#FF5500]/15 via-transparent to-[#080C14]/95" />
          </div>

          {/* Centered Hero Content Box */}
          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center justify-center text-center space-y-6 px-2">
            {/* Glowing Category Badge */}
            <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-[11px] font-black uppercase tracking-[0.25em] backdrop-blur-md shadow-xl shadow-[#FF5500]/10">
              <Sparkles size={14} className="text-[#FF5500]" />
              <span>Experiência Exclusiva</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white uppercase italic tracking-tight leading-none drop-shadow-2xl">
              Fine <span className="bg-gradient-to-r from-[#FF5500] via-orange-400 to-amber-500 bg-clip-text text-transparent">Dining</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-slate-300 font-light leading-relaxed max-w-2xl mx-auto drop-shadow-md">
              A alta gastronomia dos melhores restaurantes, criada exclusivamente na sua mesa de jantar.
            </p>

            {/* Decorative Gold/Orange Line */}
            <div className="pt-2 flex justify-center items-center">
              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#FF5500] to-transparent rounded-full shadow-sm shadow-[#FF5500]" />
            </div>
          </div>
        </section>

        {/* 2. BLOCO EDITORIAL (O CONCEITO - LUXURY GLASS CARD) */}
        <section className="w-full px-4 sm:px-8 md:px-16 py-14 md:py-20 max-w-4xl mx-auto flex justify-center">
          <div className="w-full relative rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-[#FF5500]/30 backdrop-blur-2xl p-8 sm:p-14 text-center shadow-2xl shadow-black/80 space-y-6 transition-all duration-300 flex flex-col items-center justify-center group">
            {/* Glowing Icon Header */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF5500]/20 to-[#FF5500]/5 border border-[#FF5500]/30 text-[#FF5500] flex items-center justify-center mx-auto shadow-xl shadow-[#FF5500]/10 group-hover:scale-105 transition-transform">
              <Crown size={26} />
            </div>

            <p className="text-base sm:text-lg md:text-xl text-slate-100 font-light leading-relaxed md:leading-loose max-w-3xl mx-auto italic tracking-wide">
              "O Fine Dining na Cookr é uma experiência sensorial multimomentos. Trazemos chefs com passagem por cozinhas de referência para desenhar menus de degustação exclusivos, onde o rigor da técnica e a nobreza dos ingredientes transformam a sua sala num restaurante de elite."
            </p>

            <div className="flex items-center gap-2 pt-2">
              <Star size={14} className="text-[#FF5500] fill-[#FF5500]" />
              <Star size={14} className="text-[#FF5500] fill-[#FF5500]" />
              <Star size={14} className="text-[#FF5500] fill-[#FF5500]" />
              <Star size={14} className="text-[#FF5500] fill-[#FF5500]" />
              <Star size={14} className="text-[#FF5500] fill-[#FF5500]" />
            </div>
          </div>
        </section>

        {/* 3. OS 3 PILARES DA EXPERIÊNCIA (CARDS ULTRA-PREMIUM RE-DESENHADOS) */}
        <section className="w-full px-4 sm:px-8 md:px-16 py-10 md:py-20 max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 flex flex-col items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF5500] bg-[#FF5500]/10 border border-[#FF5500]/20 px-3.5 py-1 rounded-full">
              Padrões de Alta Gastronomia
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase italic tracking-tight">
              Os 3 Pilares da Experiência
            </h2>
            <div className="w-16 h-1 bg-[#FF5500] rounded-full mx-auto shadow-sm shadow-[#FF5500]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8">
            {/* CARD 1: CHEF DEDICADO */}
            <div className="relative rounded-3xl bg-gradient-to-b from-[#131B2A] via-[#0F1522] to-[#0A0E17] border border-white/10 hover:border-[#FF5500]/60 p-8 flex flex-col justify-between space-y-8 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#FF5500]/15 group overflow-hidden">
              {/* Card Number Badge */}
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-2xl bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] flex items-center justify-center group-hover:bg-[#FF5500] group-hover:text-white transition-all duration-300 shadow-md">
                  <Utensils size={22} />
                </div>
                <span className="text-2xl font-black italic text-white/20 group-hover:text-[#FF5500]/40 transition-colors">
                  01
                </span>
              </div>

              {/* Card Image Thumbnail Header */}
              <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-white/10">
                <img
                  src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=600"
                  alt="Chef Dedicado"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 filter brightness-90"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E17] via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                  <CheckCircle2 size={12} className="text-[#FF5500]" />
                  <span>Atendimento Privado</span>
                </div>
              </div>

              {/* Card Content */}
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider group-hover:text-[#FF5500] transition-colors">
                  Chef Dedicado
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
                  Atendimento e empratamento feito ao momento na sua mesa, trazendo a mestria técnica e a narrativa de cada prato.
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Serviço Presencial</span>
                <span className="text-[#FF5500] font-bold text-[11px] uppercase tracking-wider">Exclusivo</span>
              </div>
            </div>

            {/* CARD 2: HARMONIZAÇÃO DE VINHOS */}
            <div className="relative rounded-3xl bg-gradient-to-b from-[#131B2A] via-[#0F1522] to-[#0A0E17] border border-white/10 hover:border-[#FF5500]/60 p-8 flex flex-col justify-between space-y-8 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#FF5500]/15 group overflow-hidden">
              {/* Card Number Badge */}
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-2xl bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] flex items-center justify-center group-hover:bg-[#FF5500] group-hover:text-white transition-all duration-300 shadow-md">
                  <Wine size={22} />
                </div>
                <span className="text-2xl font-black italic text-white/20 group-hover:text-[#FF5500]/40 transition-colors">
                  02
                </span>
              </div>

              {/* Card Image Thumbnail Header */}
              <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-white/10">
                <img
                  src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=600"
                  alt="Harmonização de Vinhos"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 filter brightness-90"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E17] via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                  <Wine size={12} className="text-[#FF5500]" />
                  <span>Sommelier Pairing</span>
                </div>
              </div>

              {/* Card Content */}
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider group-hover:text-[#FF5500] transition-colors">
                  Harmonização de Vinhos
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
                  Sugestões de pairing personalizadas para cada momento do menu, elevando a experiência olfativa e gustativa.
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Carta de Vinhos Selecta</span>
                <span className="text-[#FF5500] font-bold text-[11px] uppercase tracking-wider">Pairing</span>
              </div>
            </div>

            {/* CARD 3: CONFORTO & PRIVACIDADE TOTAL */}
            <div className="relative rounded-3xl bg-gradient-to-b from-[#131B2A] via-[#0F1522] to-[#0A0E17] border border-white/10 hover:border-[#FF5500]/60 p-8 flex flex-col justify-between space-y-8 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#FF5500]/15 group overflow-hidden">
              {/* Card Number Badge */}
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-2xl bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] flex items-center justify-center group-hover:bg-[#FF5500] group-hover:text-white transition-all duration-300 shadow-md">
                  <Home size={22} />
                </div>
                <span className="text-2xl font-black italic text-white/20 group-hover:text-[#FF5500]/40 transition-colors">
                  03
                </span>
              </div>

              {/* Card Image Thumbnail Header */}
              <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-white/10">
                <img
                  src="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600"
                  alt="Conforto & Privacidade"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 filter brightness-90"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E17] via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                  <CheckCircle2 size={12} className="text-[#FF5500]" />
                  <span>Limpeza Impecável</span>
                </div>
              </div>

              {/* Card Content */}
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider group-hover:text-[#FF5500] transition-colors">
                  Conforto & Privacidade
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
                  Gastronomia de classe mundial na intimidade do seu lar, com a garantia de deixar a sua cozinha impecável no final.
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Chave na Mão</span>
                <span className="text-[#FF5500] font-bold text-[11px] uppercase tracking-wider">Sem Preocupações</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. BLOCO TEASER & CTA FINAL (GATED CONTENT) */}
        <section className="w-full px-4 sm:px-8 md:px-16 py-14 md:py-24 max-w-4xl mx-auto flex justify-center">
          <div className="w-full relative rounded-3xl bg-gradient-to-b from-[#121927] via-[#0E1421] to-[#080C14] border border-white/15 backdrop-blur-2xl p-8 sm:p-14 text-center flex flex-col items-center justify-center space-y-7 shadow-2xl shadow-black/90 overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-[#FF5500]/20 rounded-full blur-3xl pointer-events-none" />

            {/* Backdrop Blur Info Pill */}
            <div className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-full bg-white/5 border border-white/15 backdrop-blur-md text-xs sm:text-sm font-bold text-slate-200 shadow-inner">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500] animate-pulse shadow-sm shadow-[#FF5500]" />
              <span>45 Chefs e Menus de Fine Dining disponíveis na sua área.</span>
            </div>

            <div className="space-y-3 max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase italic tracking-tight">
                Pronto para Experimentar?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
                Aceda ao catálogo completo de menus autorais e agende uma noite gastronómica inesquecível.
              </p>
            </div>

            {/* Primary CTA Button (Laranja #FF5500) */}
            <div className="pt-2 w-full flex justify-center">
              <button
                onClick={() => onOpenAuth("register")}
                className="w-full sm:w-auto px-9 py-4.5 bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-xs sm:text-sm uppercase tracking-widest rounded-2xl shadow-2xl shadow-[#FF5500]/30 hover:shadow-[#FF5500]/50 transition-all duration-300 active:scale-95 cursor-pointer inline-flex items-center justify-center gap-3"
              >
                <span>Criar Conta / Entrar para Explorar Fine Dining</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#05080E] border-t border-white/5 px-6 md:px-16 py-8 text-center text-xs text-slate-500 font-medium z-10">
        <p>© {new Date().getFullYear()} Cookr. Todos os direitos reservados. Alta Gastronomia em Casa.</p>
      </footer>
    </div>
  );
};

export default FineDiningPage;
