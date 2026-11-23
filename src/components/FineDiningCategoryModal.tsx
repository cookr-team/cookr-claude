import React from "react";
import { X, Lock, Sparkles, Wine, Crown, ChevronRight, ShieldCheck, CheckCircle, Award, Utensils, Star } from "lucide-react";
import { User, MenuItem } from "../types";

import { tr } from "../lib/tr";
import { useLanguage } from "../contexts/LanguageContext";
interface FineDiningCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenAuth: (flow?: "login" | "register") => void;
  allUsers?: User[];
  allMenus?: MenuItem[];
  onSelectChef?: (chefId: string) => void;
  onExploreFilteredSearch?: (category: string) => void;
}

export const FineDiningCategoryModal: React.FC<FineDiningCategoryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  allUsers = [],
  allMenus = [],
  onSelectChef,
  onExploreFilteredSearch,
}) => {
  useLanguage();
  if (!isOpen) return null;

  // Filter real fine dining menus if user is authenticated
  const fineDiningMenus = allMenus.filter(
    (m) =>
      m.categoria?.toLowerCase().includes("fine") ||
      m.categoria?.toLowerCase().includes("gastronomia") ||
      m.nome?.toLowerCase().includes("degustação") ||
      m.nome?.toLowerCase().includes("gourmet") ||
      m.is_fine_dining
  );

  return (
    <div
      id="fine-dining-modal-overlay"
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 md:p-8 overflow-y-auto animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="fine-dining-modal-card"
        className="relative w-full max-w-4xl bg-white border border-amber-200/80 text-slate-900 rounded-[2rem] shadow-2xl shadow-slate-900/20 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-300"
      >
        {/* Close Button */}
        <button
          id="fine-dining-modal-close-btn"
          onClick={onClose}
          className="absolute top-5 right-5 z-30 w-10 h-10 rounded-full bg-white/90 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white hover:border-amber-400 transition-all flex items-center justify-center backdrop-blur-md cursor-pointer shadow-md hover:scale-105 active:scale-95"
          title={tr("Fechar")}
        >
          <X size={20} />
        </button>

        {/* Modal Scrollable Content Container */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          
          {/* 1. HERO BANNER - Michelin Plating (Centered & Ultra-Luxe) */}
          <div className="relative min-h-[340px] sm:min-h-[400px] flex flex-col justify-center items-center p-8 sm:p-12 text-center overflow-hidden bg-slate-900">
            {/* Fine Dining Haute-Cuisine Hero Image */}
            <img
              src="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=1600"
              alt={tr("Fine Dining Haute Cuisine")}
              className="absolute inset-0 w-full h-full object-cover object-center scale-105 filter brightness-[0.7] contrast-110"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600";
              }}
            />
            {/* Elegant Radial & Gradient Light-Dark Blend */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-900/40" />
            <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-slate-950/80" />

            {/* Centered Hero Content */}
            <div className="relative z-10 max-w-2xl mx-auto space-y-4 text-center pt-6">
              <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-black uppercase tracking-[0.2em] backdrop-blur-md shadow-lg">
                <Crown size={14} className="text-amber-400" />
                <span>Gastronomia de Autor & Estrelas Michelin</span>
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white uppercase italic tracking-tight leading-none drop-shadow-xl">
                {tr("Fine Dining")} <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">{tr("Privado")}</span>
              </h1>

              <p className="text-xs sm:text-sm md:text-base text-slate-200 font-medium leading-relaxed max-w-xl mx-auto drop-shadow-md">
                {tr("Transforme a sua sala numa sala de degustação exclusiva. Chefs privados de alta gastronomia, menus autorais de múltiplos momentos e serviço de sala impecável na privacidade da sua casa.")}
              </p>

              {/* Centered Availability Pill */}
              <div className="pt-2 flex justify-center items-center">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] sm:text-xs font-bold tracking-wide backdrop-blur-md shadow-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                  <span>{tr("45 Chefs de Fine Dining disponíveis na sua zona")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. OS 3 BENEFÍCIOS EXCLUSIVOS (Luz, Limpo & Centrado) */}
          <div className="p-8 sm:p-12 bg-slate-50/80 border-b border-slate-200/80 space-y-8 text-center">
            <div className="space-y-2 max-w-lg mx-auto">
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-orange-600 block">
                {tr("A Experiência Cookr")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase italic">
                {tr("Porquê Escolher Fine Dining na Sua Casa?")}
              </h2>
              <div className="w-12 h-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full mx-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 space-y-3.5 text-center flex flex-col items-center group">
                <div className="w-13 h-13 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform shadow-sm">
                  <Crown size={24} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  {tr("Chef Privado Dedicado")}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {tr("Técnicas de alta gastronomia, empratamento de precisão e serviço executado por chefs com formação de topo internacional.")}
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 space-y-3.5 text-center flex flex-col items-center group">
                <div className="w-13 h-13 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform shadow-sm">
                  <Wine size={24} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Harmonização & Sommelier
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {tr("Pairings sugeridos com vinhos de garrafeiras seletas e cocktails de autor concebidos à medida para cada prato.")}
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 space-y-3.5 text-center flex flex-col items-center group">
                <div className="w-13 h-13 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform shadow-sm">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Conforto & Privacidade
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {tr("A experiência de um restaurante estelar sem reservas públicas, trânsito ou ruído. A sua cozinha fica impecável no final.")}
                </p>
              </div>
            </div>
          </div>

          {/* 3. SECÇÃO "MENUS & CHEFS" - CURADORIA DE ELITE (GATED FOR GUESTS) */}
          <div className="p-8 sm:p-12 bg-white space-y-8 text-center">
            <div className="space-y-2 max-w-xl mx-auto flex flex-col items-center">
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-600 flex items-center gap-1.5 justify-center">
                <Sparkles size={14} className="text-amber-500" />
                <span>{tr("Curadoria Culinária de Elite")}</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase italic">
                Menus Degustação & Chefs
              </h2>

              {!currentUser ? (
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    <Lock size={12} className="text-amber-600" />
                    <span>{tr("Modo Antevisão (Conteúdo Reservado)")}</span>
                  </span>
                </div>
              ) : (
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    <CheckCircle size={12} className="text-emerald-600" />
                    <span>{tr("Acesso Membro Desbloqueado")}</span>
                  </span>
                </div>
              )}
            </div>

            {/* UNAUTHENTICATED (GUEST) TEASER CARDS */}
            {!currentUser ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    id: 1,
                    title: "Menu Degustação 5 Momentos",
                    tagline: "Alta Cozinha Contemporânea do Mar à Terra",
                    image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600",
                    chefAlias: "Chef Estrelado Anónimo",
                    moments: "5 Pratos + Harmonização"
                  },
                  {
                    id: 2,
                    title: "Symphonie de Haute Cuisine",
                    tagline: "7 Momentos de Gastronomia Molecular & Sazonal",
                    image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=600",
                    chefAlias: "Chef Executivo Internacional",
                    moments: "7 Pratos + Sobremesa de Autor"
                  },
                  {
                    id: 3,
                    title: "Experiência Sensorial Estrelada",
                    tagline: "Texturas & Sabores Portugueses Revisitados",
                    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=600",
                    chefAlias: "Chef Vanguarda Lusa",
                    moments: "6 Pratos + Pairings Exclusivos"
                  }
                ].map((teaser) => (
                  <div
                    key={teaser.id}
                    className="group relative rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-md flex flex-col h-[360px] text-center transition-all duration-300 hover:border-amber-400 hover:shadow-xl"
                  >
                    {/* Background dish image */}
                    <div className="relative h-44 overflow-hidden bg-slate-900">
                      <img
                        src={teaser.image}
                        alt={teaser.title}
                        className="w-full h-full object-cover blur-[2px] group-hover:scale-105 transition-transform duration-500 filter brightness-75"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />

                      {/* Locked Badge */}
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-amber-300 text-[10px] font-black uppercase text-amber-800 flex items-center gap-1 shadow-md">
                        <Lock size={10} className="text-amber-600" />
                        <span>{tr("Reservado")}</span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between relative bg-white border-t border-slate-200">
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-tight line-clamp-1">
                          {teaser.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-2">
                          {teaser.tagline}
                        </p>
                      </div>

                      {/* Teaser Redacted Overlay Box */}
                      <div className="my-2 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-center space-y-1">
                        <div className="flex items-center justify-center gap-1.5 text-amber-800 text-[10px] font-extrabold uppercase tracking-wide">
                          <Lock size={12} className="text-amber-600" />
                          <span>{tr("[Entrar para desbloquear menu e chef]")}</span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-medium">
                          {tr("Ver ementa completa, fotogaleria e preços por pessoa")}
                        </p>
                      </div>

                      <button
                        onClick={() => onOpenAuth("login")}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-orange-500/20 active:scale-95 cursor-pointer"
                      >
                        <Lock size={12} />
                        <span>Desbloquear Chef & Menu</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* AUTHENTICATED USER UNLOCKED MENUS GRID */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(fineDiningMenus.length > 0 ? fineDiningMenus.slice(0, 3) : allMenus.slice(0, 3)).map((menu) => {
                  const chef = allUsers.find((u) => u.id === menu.cookId || u.id === menu.cook_id);
                  return (
                    <div
                      key={menu.id}
                      className="group bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-amber-400 hover:shadow-xl transition-all duration-300 shadow-sm text-center"
                    >
                      <div className="relative h-40 bg-slate-100 overflow-hidden">
                        <img
                          src={menu.imageUrl || "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600"}
                          alt={menu.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2 right-2 px-3 py-1 bg-white/95 backdrop-blur-md rounded-full border border-amber-300 text-[10px] font-black text-amber-800 shadow-md">
                          {menu.preco ? `${menu.preco}€ / pessoa` : tr("€€€ / pessoa")}
                        </div>
                      </div>

                      <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-tight">
                            {menu.nome}
                          </h3>
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {menu.descricao || tr("Experiência de alta gastronomia autoral com ingredientes de topo.")}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                              <img
                                src={chef?.avatar_url || "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=200"}
                                alt={chef?.nome || tr("Chef")}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-800 truncate max-w-[100px]">
                              {chef?.nome || tr("Chef de Fine Dining")}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              if (chef && onSelectChef) {
                                onClose();
                                onSelectChef(chef.id);
                              }
                            }}
                            className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                          >
                            {tr("Reservar")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. CHAMADA PARA AÇÃO (CTA) DE ALTO IMPACTO CENTRADA */}
          <div className="p-8 sm:p-12 border-t border-amber-100 bg-gradient-to-b from-amber-50/60 via-orange-50/40 to-amber-50/30 text-center space-y-6">
            {!currentUser ? (
              <div className="max-w-2xl mx-auto space-y-5 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-white border border-amber-200 text-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/10">
                  <Crown size={32} />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase italic tracking-tight">
                    {tr("Pronto para Vivenciar a Verdadeira Gastronomia de Autor?")}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-lg mx-auto">
                    {tr("Crie a sua conta gratuita para consultar o portfólio completo dos nossos 45 chefs conceituados de Fine Dining, visualizar menus ementa a ementa e agendar o seu evento privado.")}
                  </p>
                </div>

                <div className="pt-2 w-full flex justify-center">
                  <button
                    id="fine-dining-auth-cta-btn"
                    onClick={() => {
                      onClose();
                      onOpenAuth("register");
                    }}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 active:scale-95 cursor-pointer inline-flex items-center justify-center gap-3"
                  >
                    <span>{tr("Criar Conta / Entrar para Explorar Chefs de Fine Dining")}</span>
                    <ChevronRight size={18} />
                  </button>
                </div>

                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                  {tr("Registo em menos de 1 minuto • Sem custos de adesão")}
                </p>
              </div>
            ) : (
              <div className="max-w-md mx-auto space-y-4 text-center">
                <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight italic">
                  {tr("Explorar Todos os Chefs de Fine Dining")}
                </h2>
                <button
                  onClick={() => {
                    onClose();
                    if (onExploreFilteredSearch) {
                      onExploreFilteredSearch("Fine Dining");
                    }
                  }}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-orange-500/20 cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <span>{tr("Ver Todos os 45 Chefs Disponíveis")}</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default FineDiningCategoryModal;
