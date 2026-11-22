import React from "react";
import { ICONS } from "../constants";

const TermsConditions: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const sections = [
    {
      title: "1. Aceitação dos Termos",
      content:
        "Ao utilizar a plataforma Cookr, o utilizador concorda em cumprir estes termos. A Cookr é uma plataforma de intermediação que liga Chefs privados a Clientes finais. O acesso à plataforma é reservado a membros que aceitem as nossas normas de conduta e exclusividade.",
    },
    {
      title: "2. Responsabilidades do Chef",
      content:
        "O Chef é o único responsável pela qualidade dos ingredientes, higiene na preparação e cumprimento rigoroso das normas HACCP. A Cookr atua como facilitador tecnológico e não se responsabiliza por incidentes decorrentes da prestação direta do serviço na residência do cliente.",
    },
    {
      title: "3. Pagamentos e Cancelamentos",
      content:
        "Os pagamentos são processados de forma segura pela plataforma. Cancelamentos efetuados com menos de 48h de antecedência podem não ser passíveis de reembolso total, de forma a salvaguardar os custos logísticos e de aquisição de matéria-prima por parte do Chef.",
    },
    {
      title: "4. Propriedade Intelectual",
      content:
        "Todos os menus, fotografias e conteúdos criados pelos Chefs na plataforma são propriedade intelectual protegida. A reprodução não autorizada de rituais gastronómicos Cookr é estritamente proibida.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fdfdfb] text-[#1a1a1a] font-serif selection:bg-orange-100 animate-in fade-in duration-1000">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 text-slate-400 hover:text-slate-950 transition-all duration-500"
          >
            <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-all duration-500">
              <ICONS.ArrowLeft size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] font-sans">
              Voltar
            </span>
          </button>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-xs font-black uppercase tracking-[0.4em] font-sans text-slate-950">
              Termos & Condições
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
              Contrato de <br />
              <span className="italic font-normal">Exclusividade.</span>
            </h2>
            <p className="text-xs text-slate-400 font-sans uppercase tracking-widest">
              Última Atualização: 20 de Março de 2026
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-16">
            {sections.map((section, i) => (
              <section key={i} className="group">
                <div className="flex flex-col md:flex-row gap-8 md:gap-16">
                  <div className="md:w-1/3">
                    <h3 className="text-xl font-bold uppercase tracking-widest font-sans text-slate-950 group-hover:text-orange-500 transition-colors duration-500">
                      {section.title}
                    </h3>
                  </div>
                  <div className="md:w-2/3">
                    <p className="text-lg text-slate-500 font-light leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                </div>
                {i < sections.length - 1 && (
                  <div className="h-px w-full bg-slate-100 mt-16" />
                )}
              </section>
            ))}
          </div>

          {/* Legal Note */}
          <div className="mt-32 p-12 md:p-20 bg-slate-50 rounded-[4rem] border border-slate-100 text-center space-y-8">
            <ICONS.FileText className="mx-auto text-orange-500" size={40} />
            <div className="space-y-4">
              <h3 className="text-2xl font-light text-slate-950 tracking-tight">
                Dúvidas <span className="italic">Jurídicas?</span>
              </h3>
              <p className="text-slate-400 font-sans uppercase text-[10px] tracking-[0.3em] max-w-md mx-auto">
                Para qualquer esclarecimento adicional sobre os nossos termos,
                contacte o nosso departamento legal.
              </p>
            </div>
            <a
              href="mailto:legal@cookr.app"
              className="inline-flex items-center gap-4 px-10 py-5 bg-slate-950 text-white rounded-2xl hover:bg-orange-500 transition-all duration-500 group"
            >
              <span className="font-sans font-black uppercase text-[10px] tracking-widest">
                legal@cookr.app
              </span>
              <ICONS.ArrowRight
                size={16}
                className="group-hover:translate-x-2 transition-transform"
              />
            </a>
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
                Experiências Gastronómicas de Elite
              </p>
            </div>
            <p className="text-[10px] text-slate-300 uppercase tracking-widest">
              © 2026 LUXURY COOKR · Todos os direitos reservados
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default React.memo(TermsConditions);
