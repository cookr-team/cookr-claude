import React from "react";
import { ICONS } from "../constants";
import { User } from "../types";
import { useLanguage, getLangText } from "../contexts/LanguageContext";

interface HelpViewProps {
  currentUser?: User | null;
  onOpenChat?: (partnerId: string) => void;
  onBack: () => void;
}

const HelpView: React.FC<HelpViewProps> = ({ currentUser, onOpenChat, onBack }) => {
  const { language } = useLanguage();

  const categories = [
    {
      title: getLangText(language, {
        pt: "Como Cliente",
        es: "Como Cliente",
        en: "As a Client",
        fr: "En tant que Client"
      }),
      icon: <ICONS.Users className="text-orange-500" size={24} />,
      questions: [
        {
          q: getLangText(language, {
            pt: "Como reservo um Chef?",
            es: "¿Cómo reservo un Chef?",
            en: "How do I book a Chef?",
            fr: "Comment réserver un Chef?"
          }),
          a: getLangText(language, {
            pt: "Explore os perfis, escolha o seu menu e selecione a data. O Chef confirmará a disponibilidade em minutos.",
            es: "Explore los perfiles, elija su menú y seleccione la fecha. El Chef confirmará la disponibilidad en minutos.",
            en: "Explore profiles, choose your menu, and select the date. The Chef will confirm availability within minutes.",
            fr: "Explorez les profils, choisissez votre menu et sélectionnez la date. Le Chef confirmera sa disponibilité en quelques minutes."
          }),
        },
        {
          q: getLangText(language, {
            pt: "O que está incluído no serviço?",
            es: "¿Qué está incluido en el servicio?",
            en: "What is included in the service?",
            fr: "Que comprend le service?"
          }),
          a: getLangText(language, {
            pt: "O Chef traz os ingredientes, prepara a refeição, serve e deixa a cozinha limpa.",
            es: "El Chef trae los ingredientes, prepara la comida, la sirve y deja la cocina impecable.",
            en: "The Chef brings the ingredients, prepares the meal, serves it, and cleans up the kitchen.",
            fr: "Le Chef apporte les ingrédients, prépare le repas, le sert et laisse la cuisine propre."
          }),
        },
        {
          q: getLangText(language, {
            pt: "Posso cancelar uma reserva?",
            es: "¿Puedo cancelar una reserva?",
            en: "Can I cancel a booking?",
            fr: "Puis-je annuler une réservation?"
          }),
          a: getLangText(language, {
            pt: "Sim, os cancelamentos são gratuitos até 48h antes do evento.",
            es: "Sí, las cancelaciones son gratuitas hasta 48 horas antes del evento.",
            en: "Yes, cancellations are free up to 48 hours before the event.",
            fr: "Oui, les annulations sont gratuites jusqu'à 48h avant l'événement."
          }),
        },
      ],
    },
    {
      title: getLangText(language, {
        pt: "Como Chef",
        es: "Como Chef",
        en: "As a Chef",
        fr: "En tant que Chef"
      }),
      icon: <ICONS.ChefHat className="text-orange-500" size={24} />,
      questions: [
        {
          q: getLangText(language, {
            pt: "Como recebo os pagamentos?",
            es: "¿Cómo recibo los pagos?",
            en: "How do I receive payments?",
            fr: "Comment suis-je payé(e)?"
          }),
          a: getLangText(language, {
            pt: "Os pagamentos são transferidos para a sua conta 24h após a conclusão do serviço.",
            es: "Los pagos se transfieren a su cuenta 24 horas después de completar el servicio.",
            en: "Payments are transferred to your account 24h after service completion.",
            fr: "Les paiements sont transférés sur votre compte 24h après la fin du service."
          }),
        },
        {
          q: getLangText(language, {
            pt: "Quem define os preços?",
            es: "¿Quién define los precios?",
            en: "Who sets the prices?",
            fr: "Qui fixe les prix?"
          }),
          a: getLangText(language, {
            pt: "O Chef tem total liberdade para definir o preço por pessoa de cada menu.",
            es: "El Chef tiene total libertad para fijar el precio por persona de cada menú.",
            en: "The Chef has total freedom to set the per-person price for each menu.",
            fr: "Le Chef a la totale liberté de fixer le prix par personne de chaque menu."
          }),
        },
        {
          q: getLangText(language, {
            pt: "Preciso de seguro?",
            es: "¿Necesito seguro?",
            en: "Do I need insurance?",
            fr: "Ai-je besoin d'une assurance?"
          }),
          a: getLangText(language, {
            pt: "A Cookr oferece uma cobertura de responsabilidade civil para todos os rituais realizados via plataforma.",
            es: "Cookr ofrece cobertura de responsabilidad civil para todos los rituales realizados a través de la plataforma.",
            en: "Cookr offers liability coverage for all experiences hosted through the platform.",
            fr: "Cookr offre une couverture de responsabilité civile pour toutes les prestations réalisées sur la plateforme."
          }),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#fdfdfb] text-[#1a1a1a] font-serif selection:bg-orange-100 animate-in fade-in duration-1000">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 text-slate-400 hover:text-slate-950 transition-all duration-500 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-all duration-500">
              <ICONS.ArrowLeft size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] font-sans">
              {getLangText(language, { pt: "Voltar", es: "Volver", en: "Back", fr: "Retour" })}
            </span>
          </button>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-xs font-black uppercase tracking-[0.4em] font-sans text-slate-950">
              {getLangText(language, { pt: "Centro de Ajuda", es: "Centro de Ayuda", en: "Help Center", fr: "Centre d'Aide" })}
            </h1>
            <div className="h-px w-8 bg-orange-500 mt-2" />
          </div>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </header>

      <main className="pt-40 pb-32 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-24 space-y-6">
            <h2 className="text-5xl md:text-7xl font-light tracking-tight leading-none text-slate-950">
              {getLangText(language, { pt: "Como podemos", es: "¿Cómo podemos", en: "How can we", fr: "Comment pouvons-nous" })} <br />
              <span className="italic font-normal">
                {getLangText(language, { pt: "ajudar?", es: "ayudarle?", en: "help you?", fr: "vous aider?" })}
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-sans uppercase tracking-widest">
              {getLangText(language, {
                pt: "Suporte Exclusivo Cookr · Elite Gastronómica",
                es: "Soporte Exclusivo Cookr · Élite Gastronómica",
                en: "Exclusive Cookr Support · Culinary Elite",
                fr: "Support Exclusif Cookr · Élite Gastronomique"
              })}
            </p>
          </div>

          {/* Search Bar (Visual Only) */}
          <div className="max-w-2xl mx-auto mb-24 relative group">
            <ICONS.Search
              className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder={getLangText(language, {
                pt: "Pesquise por tema ou dúvida...",
                es: "Busque por tema o consulta...",
                en: "Search by topic or question...",
                fr: "Recherchez par sujet ou question..."
              })}
              className="w-full h-20 pl-20 pr-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-200/20 outline-none focus:border-orange-500 transition-all font-sans text-sm font-medium"
            />
          </div>

          {/* FAQ Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {categories.map((cat, i) => (
              <div key={i} className="space-y-8">
                <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                    {cat.icon}
                  </div>
                  <h3 className="text-xl font-bold uppercase tracking-widest font-sans text-slate-950">
                    {cat.title}
                  </h3>
                </div>

                <div className="space-y-6">
                  {cat.questions.map((q, j) => (
                    <div
                      key={j}
                      className="group p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:border-orange-200 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/5"
                    >
                      <h4 className="text-lg font-bold text-slate-950 mb-4 group-hover:text-orange-500 transition-colors">
                        {q.q}
                      </h4>
                      <p className="text-base text-slate-500 font-light leading-relaxed">
                        {q.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="mt-32 p-12 md:p-20 bg-slate-950 rounded-[4rem] text-center space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -ml-32 -mb-32" />

            <div className="space-y-4 relative z-10">
              <h3 className="text-3xl md:text-5xl font-light text-white tracking-tight">
                {getLangText(language, { pt: "Ainda tem", es: "¿Aún tiene", en: "Still have", fr: "Vous avez encore des" })}{" "}
                <span className="italic">{getLangText(language, { pt: "dúvidas?", es: "dudas?", en: "questions?", fr: "doutes?" })}</span>
              </h3>
              <p className="text-slate-400 font-sans uppercase text-[10px] tracking-[0.3em]">
                {getLangText(language, {
                  pt: "O nosso Concierge está disponível 24/7",
                  es: "Nuestro Concierge está disponible 24/7",
                  en: "Our Concierge is available 24/7",
                  fr: "Notre Concierge est disponible 24/7"
                })}
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 relative z-10">
              <a
                href="mailto:suporte@cookr.app"
                className="flex items-center gap-4 px-10 py-5 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white hover:text-slate-950 transition-all duration-500 group"
              >
                <ICONS.Mail
                  size={20}
                  className="text-orange-500 group-hover:text-orange-600"
                />
                <span className="font-sans font-black uppercase text-[10px] tracking-widest">
                  suporte@cookr.app
                </span>
              </a>
              <button
                onClick={() => {
                  if (currentUser && onOpenChat) {
                    onOpenChat("admin-support");
                  } else {
                    alert(
                      getLangText(language, {
                        pt: "Por favor, inicie sessão para aceder ao chat de suporte em tempo real.",
                        es: "Por favor, inicie sesión para acceder al chat de soporte en tiempo real.",
                        en: "Please log in to access live support chat.",
                        fr: "Veuillez vous connecter pour accéder au chat de support en direct."
                      })
                    );
                  }
                }}
                className="flex items-center gap-4 px-10 py-5 bg-orange-500 rounded-2xl text-white hover:bg-orange-600 transition-all duration-500 shadow-xl shadow-orange-500/20 cursor-pointer"
              >
                <ICONS.MessageSquare size={20} />
                <span className="font-sans font-black uppercase text-[10px] tracking-widest">
                  {getLangText(language, {
                    pt: "Chat em Tempo Real",
                    es: "Chat en Tiempo Real",
                    en: "Live Support Chat",
                    fr: "Chat en Direct"
                  })}
                </span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-40 pt-20 border-t border-slate-100 text-center space-y-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-slate-950 text-white rounded-2xl flex items-center justify-center mb-4">
                <ICONS.ChefHat size={24} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-950">
                Luxury Cookr
              </p>
              <p className="text-xs text-slate-400 uppercase tracking-widest">
                {getLangText(language, {
                  pt: "Experiências Gastronómicas de Elite",
                  es: "Experiencias Gastronómicas de Élite",
                  en: "Elite Gastronomic Experiences",
                  fr: "Expériences Gastronomiques d'Élite"
                })}
              </p>
            </div>
            <p className="text-[10px] text-slate-300 uppercase tracking-widest">
              © 2026 LUXURY COOKR · {getLangText(language, {
                pt: "Todos os direitos reservados",
                es: "Todos los derechos reservados",
                en: "All rights reserved",
                fr: "Tous droits réservés"
              })}
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default React.memo(HelpView);
