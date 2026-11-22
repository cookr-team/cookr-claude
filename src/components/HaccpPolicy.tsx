import React from "react";
import { ICONS } from "../constants";
import { useLanguage, getLangText } from "../contexts/LanguageContext";

const HaccpPolicy: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { language } = useLanguage();

  const sections = [
    {
      title: getLangText(language, { pt: "1. Higiene Pessoal", es: "1. Higiene Personal", en: "1. Personal Hygiene", fr: "1. Hygiène Personnelle" }),
      content: getLangText(language, {
        pt: "Uso obrigatório de fardamento imaculado, proteção capilar e lavagem cirúrgica das mãos. Os nossos Chefs são treinados para manter os mais elevados padrões de assepsia durante todo o ritual de preparação.",
        es: "Uso obligatorio de uniforme impecable, protección capilar y lavado quirúrgico de manos. Nuestros Chefs están capacitados para mantener los más altos estándares de asepsia durante todo el ritual de preparación.",
        en: "Mandatory spotless uniform, hair protection, and surgical handwashing. Our Chefs are trained to maintain the highest standards of asepsis throughout the entire preparation ritual.",
        fr: "Port obligatoire d'une tenue de travail rigoureusement propre, charlotte et lavage chirurgical des mains. Nos Chefs sont formés pour maintenir les plus hauts standards d'asepsie tout au long de la préparation."
      }),
    },
    {
      title: getLangText(language, { pt: "2. Controlo de Temperaturas", es: "2. Control de Temperaturas", en: "2. Temperature Control", fr: "2. Contrôle des Températures" }),
      content: getLangText(language, {
        pt: "Monitorização digital contínua da cadeia de frio. Desde a seleção do ingrediente no fornecedor premium até à sua mesa, garantimos que cada elemento é mantido na temperatura ideal para preservar a sua integridade biológica e sensorial.",
        es: "Monitoreo digital continuo de la cadena de frío. Desde la selección del ingrediente en el proveedor premium hasta su mesa, garantizamos que cada elemento se mantenga a la temperatura ideal.",
        en: "Continuous digital monitoring of the cold chain. From selecting ingredients at premium suppliers to your table, we guarantee every element is kept at optimal temperatures to preserve quality.",
        fr: "Suivi numérique continu de la chaîne du froid. De la sélection de l'ingrédient chez le fournisseur premium à votre table, chaque produit est conservé à la température idéale."
      }),
    },
    {
      title: getLangText(language, { pt: "3. Prevenção de Contaminação", es: "3. Prevención de Contaminación", en: "3. Cross-Contamination Prevention", fr: "3. Prévention des Contaminations" }),
      content: getLangText(language, {
        pt: "Utilização de utensílios de corte diferenciados por cores e higienização profunda de todas as superfícies com agentes biodegradáveis de alta eficácia. A separação entre alimentos crus e cozinhados é absoluta.",
        es: "Uso de utensilios de corte diferenciados por colores y desinfección profunda de todas las superficies con agentes biodegradables de alta eficacia. La separación entre alimentos crudos y cocinados es absoluta.",
        en: "Color-coded cutting tools and deep cleaning of all surfaces using highly effective biodegradable agents. Separation between raw and cooked food is strict and absolute.",
        fr: "Utilisation de planches de découpe de couleurs différentes et nettoyage en profondeur de toutes les surfaces avec des désinfectants éco-responsables. La séparation cru/cuit est absolue."
      }),
    },
    {
      title: getLangText(language, { pt: "4. Rastreabilidade Total", es: "4. Trazabilidad Total", en: "4. Full Traceability", fr: "4. Traçabilité Totale" }),
      content: getLangText(language, {
        pt: "Conhecemos a origem de cada ingrediente. Trabalhamos exclusivamente com fornecedores que garantem a rastreabilidade total dos produtos, assegurando que apenas a excelência entra na sua cozinha.",
        es: "Conocemos el origen de cada ingrediente. Trabajamos exclusivamente con proveedores que garantizan la trazabilidad total de los productos, asegurando que solo la excelencia entre a su cocina.",
        en: "We know the exact origin of every ingredient. We partner exclusively with suppliers guaranteeing full product traceability, ensuring excellence in your kitchen.",
        fr: "Nous connaissons l'origine de chaque ingrédient. Nous travaillons exclusivement avec des fournisseurs garantissant une traçabilité totale des produits."
      }),
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
              {getLangText(language, { pt: "Segurança Alimentar", es: "Seguridad Alimentaria", en: "Food Safety", fr: "Sécurité Alimentaire" })}
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
              {getLangText(language, { pt: "Normas", es: "Normas", en: "Standards", fr: "Normes" })} <br />
              <span className="italic font-normal">HACCP.</span>
            </h2>
            <p className="text-xs text-slate-400 font-sans uppercase tracking-widest">
              {getLangText(language, { pt: "Protocolos de Segurança Cookr", es: "Protocolos de Seguridad Cookr", en: "Cookr Safety Protocols", fr: "Protocole de Sécurité Cookr" })}
            </p>
          </div>

          {/* Commitment Card */}
          <div className="mb-24 bg-slate-950 p-12 md:p-20 rounded-[4rem] text-white space-y-8 shadow-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-orange-500/20 transition-colors duration-1000" />
            <ICONS.ShieldCheck
              size={48}
              className="text-orange-500 relative z-10"
            />
            <div className="space-y-6 relative z-10">
              <h3 className="text-3xl md:text-4xl font-light tracking-tight leading-none">
                {getLangText(language, { pt: "Compromisso de", es: "Compromiso de", en: "Commitment to", fr: "Engagement d'" })}{" "}
                <span className="italic">{getLangText(language, { pt: "Excelência.", es: "Excelencia.", en: "Excellence.", fr: "Excellence." })}</span>
              </h3>
              <p className="text-lg font-light text-white/60 leading-relaxed max-w-2xl">
                {getLangText(language, {
                  pt: "Todos os Chefs da plataforma Cookr são detentores de formação certificada em HACCP e operam sob protocolos de segurança alimentar que excedem as normas regulamentares.",
                  es: "Todos los Chefs de la plataforma Cookr poseen formación certificada en HACCP y operan bajo protocolos de seguridad alimentaria que superan las normas regulatorias.",
                  en: "All Chefs on the Cookr platform hold certified HACCP training and operate under food safety protocols that exceed regulatory standards.",
                  fr: "Tous les Chefs sur la plateforme Cookr possèdent une formation certifiée HACCP et opèrent selon des protocoles de sécurité alimentaire stricts."
                })}
              </p>
            </div>
          </div>

          {/* Content Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
            {sections.map((section, i) => (
              <section key={i} className="space-y-6 group">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-px bg-orange-500 group-hover:w-12 transition-all duration-500" />
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] font-sans text-slate-950">
                    {section.title}
                  </h4>
                </div>
                <p className="text-lg text-slate-500 font-light leading-relaxed">
                  {section.content}
                </p>
              </section>
            ))}
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

export default React.memo(HaccpPolicy);
