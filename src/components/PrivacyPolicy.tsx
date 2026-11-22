import React from "react";
import { ICONS } from "../constants";

const PrivacyPolicy: React.FC<{ onBack: () => void }> = ({ onBack }) => {
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
              Privacidade
            </h1>
            <div className="h-px w-8 bg-orange-500 mt-2" />
          </div>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </header>

      <main className="pt-40 pb-32 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-24 space-y-6">
            <h2 className="text-5xl md:text-7xl font-light tracking-tight leading-none text-slate-950">
              Política de <br />
              <span className="italic font-normal">Privacidade.</span>
            </h2>
            <div className="flex flex-col items-center gap-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 font-sans">
                Cookr · Elite Gastronómica
              </p>
              <p className="text-xs text-slate-400 font-sans uppercase tracking-widest">
                Última atualização: 19 de Março de 2026
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-20">
            <div className="prose prose-slate max-w-none">
              <p className="text-xl md:text-2xl leading-relaxed text-slate-700 font-light italic text-center mb-20">
                "Na Cookr, a privacidade não é apenas uma obrigação legal; é um
                pilar da nossa relação de exclusividade consigo. Estamos
                empenhados em proteger a integridade e a confidencialidade dos
                dados dos nossos Membros e Chefs da Elite Gastronómica."
              </p>

              <div className="space-y-16">
                <section className="group">
                  <div className="flex items-start gap-8">
                    <span className="text-4xl font-light text-orange-200 group-hover:text-orange-500 transition-colors duration-500">
                      01
                    </span>
                    <div className="space-y-4 pt-2">
                      <h3 className="text-xl font-bold uppercase tracking-widest font-sans text-slate-950">
                        Compromisso de Exclusividade
                      </h3>
                      <p className="text-lg leading-relaxed text-slate-600 font-light">
                        Ao utilizar a plataforma Cookr, confia-nos informações
                        pessoais. Em troca, comprometemo-nos a utilizar
                        tecnologias de segurança de última geração e processos
                        rigorosos para garantir que a sua identidade e
                        preferências permanecem privadas.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="group">
                  <div className="flex items-start gap-8">
                    <span className="text-4xl font-light text-orange-200 group-hover:text-orange-500 transition-colors duration-500">
                      02
                    </span>
                    <div className="space-y-4 pt-2">
                      <h3 className="text-xl font-bold uppercase tracking-widest font-sans text-slate-950">
                        Dados que Recolhemos
                      </h3>
                      <p className="text-lg leading-relaxed text-slate-600 font-light">
                        Para proporcionar uma experiência gastronómica
                        personalizada, recolhemos os seguintes dados:
                      </p>
                      <ul className="space-y-6 mt-6">
                        <li className="flex gap-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2.5 shrink-0" />
                          <div>
                            <strong className="block text-slate-950 font-sans uppercase text-xs tracking-widest mb-1">
                              Identidade e Contacto
                            </strong>
                            <span className="text-slate-600 font-light">
                              Nome completo, endereço de email e número de
                              telefone (através do sistema seguro Supabase
                              Auth).
                            </span>
                          </div>
                        </li>
                        <li className="flex gap-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2.5 shrink-0" />
                          <div>
                            <strong className="block text-slate-950 font-sans uppercase text-xs tracking-widest mb-1">
                              Perfil de Utilizador
                            </strong>
                            <span className="text-slate-600 font-light">
                              Preferências culinárias, restrições alimentares,
                              moradas de prestação de serviço e histórico de
                              reservas.
                            </span>
                          </div>
                        </li>
                        <li className="flex gap-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2.5 shrink-0" />
                          <div>
                            <strong className="block text-slate-950 font-sans uppercase text-xs tracking-widest mb-1">
                              Dados de Chef
                            </strong>
                            <span className="text-slate-600 font-light">
                              Portefólio de pratos, certificações de higiene e
                              segurança alimentar, e avaliações da comunidade.
                            </span>
                          </div>
                        </li>
                        <li className="flex gap-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2.5 shrink-0" />
                          <div>
                            <strong className="block text-slate-950 font-sans uppercase text-xs tracking-widest mb-1">
                              Informação de Pagamento
                            </strong>
                            <span className="text-slate-600 font-light">
                              Todos os dados financeiros são processados por
                              parceiros de pagamento certificados (PCI-DSS),
                              garantindo que a Cookr nunca armazena os seus
                              dados de cartão de crédito.
                            </span>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section className="group">
                  <div className="flex items-start gap-8">
                    <span className="text-4xl font-light text-orange-200 group-hover:text-orange-500 transition-colors duration-500">
                      03
                    </span>
                    <div className="space-y-4 pt-2">
                      <h3 className="text-xl font-bold uppercase tracking-widest font-sans text-slate-950">
                        Finalidade do Tratamento
                      </h3>
                      <p className="text-lg leading-relaxed text-slate-600 font-light">
                        Os seus dados são utilizados exclusivamente para:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                        <div className="p-8 bg-white border border-slate-100 rounded-3xl space-y-3">
                          <ICONS.Link size={20} className="text-orange-500" />
                          <h4 className="font-sans uppercase text-[10px] font-black tracking-widest">
                            Conectividade
                          </h4>
                          <p className="text-sm text-slate-500 font-light">
                            Facilitar o agendamento e a comunicação direta entre
                            Clientes e Chefs.
                          </p>
                        </div>
                        <div className="p-8 bg-white border border-slate-100 rounded-3xl space-y-3">
                          <ICONS.Star size={20} className="text-orange-500" />
                          <h4 className="font-sans uppercase text-[10px] font-black tracking-widest">
                            Personalização
                          </h4>
                          <p className="text-sm text-slate-500 font-light">
                            Recomendar menus e experiências baseadas no seu
                            paladar único.
                          </p>
                        </div>
                        <div className="p-8 bg-white border border-slate-100 rounded-3xl space-y-3">
                          <ICONS.ShieldCheck
                            size={20}
                            className="text-orange-500"
                          />
                          <h4 className="font-sans uppercase text-[10px] font-black tracking-widest">
                            Segurança
                          </h4>
                          <p className="text-sm text-slate-500 font-light">
                            Validar a identidade dos membros e prevenir
                            atividades fraudulentas.
                          </p>
                        </div>
                        <div className="p-8 bg-white border border-slate-100 rounded-3xl space-y-3">
                          <ICONS.TrendingUp
                            size={20}
                            className="text-orange-500"
                          />
                          <h4 className="font-sans uppercase text-[10px] font-black tracking-widest">
                            Melhoria Contínua
                          </h4>
                          <p className="text-sm text-slate-500 font-light">
                            Analisar tendências de alta gastronomia para evoluir
                            os nossos serviços.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="group">
                  <div className="flex items-start gap-8">
                    <span className="text-4xl font-light text-orange-200 group-hover:text-orange-500 transition-colors duration-500">
                      04
                    </span>
                    <div className="space-y-4 pt-2">
                      <h3 className="text-xl font-bold uppercase tracking-widest font-sans text-slate-950">
                        Partilha de Informação
                      </h3>
                      <p className="text-lg leading-relaxed text-slate-600 font-light">
                        A Cookr nunca vende os seus dados a terceiros. A
                        partilha de informação ocorre apenas:
                      </p>
                      <div className="space-y-4 mt-4">
                        <div className="flex gap-4 p-6 bg-slate-50 rounded-2xl">
                          <ICONS.Users
                            size={20}
                            className="text-slate-400 shrink-0"
                          />
                          <p className="text-sm text-slate-600 font-light">
                            <strong className="text-slate-950">
                              Entre as Partes:
                            </strong>{" "}
                            Partilhamos os dados necessários (como morada e
                            restrições alimentares) com o Chef escolhido para a
                            execução do serviço.
                          </p>
                        </div>
                        <div className="flex gap-4 p-6 bg-slate-50 rounded-2xl">
                          <ICONS.FileText
                            size={20}
                            className="text-slate-400 shrink-0"
                          />
                          <p className="text-sm text-slate-600 font-light">
                            <strong className="text-slate-950">
                              Obrigações Legais:
                            </strong>{" "}
                            Quando exigido pelas autoridades competentes sob
                            estrita conformidade com a lei portuguesa e europeia
                            (RGPD).
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="group">
                  <div className="flex items-start gap-8">
                    <span className="text-4xl font-light text-orange-200 group-hover:text-orange-500 transition-colors duration-500">
                      05
                    </span>
                    <div className="space-y-4 pt-2">
                      <h3 className="text-xl font-bold uppercase tracking-widest font-sans text-slate-950">
                        Segurança e Retenção
                      </h3>
                      <p className="text-lg leading-relaxed text-slate-600 font-light">
                        A nossa infraestrutura utiliza base de dados encriptada
                        e protocolos de comunicação seguros (SSL/TLS). Os dados
                        são mantidos apenas enquanto a sua conta estiver ativa
                        ou conforme necessário para cumprir obrigações fiscais e
                        legais.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="group">
                  <div className="flex items-start gap-8">
                    <span className="text-4xl font-light text-orange-200 group-hover:text-orange-500 transition-colors duration-500">
                      06
                    </span>
                    <div className="space-y-4 pt-2">
                      <h3 className="text-xl font-bold uppercase tracking-widest font-sans text-slate-950">
                        Os Seus Direitos
                      </h3>
                      <p className="text-lg leading-relaxed text-slate-600 font-light">
                        Como membro da Cookr, tem o direito soberano de:
                      </p>
                      <div className="grid grid-cols-1 gap-4 mt-6">
                        {[
                          "Aceder e Retificar: Consultar e editar os seus dados a qualquer momento no seu perfil.",
                          "Portabilidade: Solicitar uma cópia dos seus dados em formato digital.",
                          "Eliminação: Requerer o encerramento da sua conta e a eliminação definitiva dos seus registos pessoais (Direito ao Esquecimento).",
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-4 p-6 border border-slate-100 rounded-2xl hover:border-orange-200 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                              <ICONS.Check size={14} />
                            </div>
                            <p className="text-sm text-slate-600 font-light">
                              {item}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="group">
                  <div className="flex items-start gap-8">
                    <span className="text-4xl font-light text-orange-200 group-hover:text-orange-500 transition-colors duration-500">
                      07
                    </span>
                    <div className="space-y-4 pt-2">
                      <h3 className="text-xl font-bold uppercase tracking-widest font-sans text-slate-950">
                        Contacto
                      </h3>
                      <p className="text-lg leading-relaxed text-slate-600 font-light">
                        Para qualquer questão relacionada com a sua privacidade,
                        a nossa equipa de Concierge está disponível através do
                        email:
                      </p>
                      <a
                        href="mailto:privacy@cookr.app"
                        className="inline-block text-2xl text-orange-500 hover:text-orange-600 transition-colors border-b border-orange-200 pb-1"
                      >
                        privacy@cookr.app
                      </a>
                    </div>
                  </div>
                </section>
              </div>
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

export default React.memo(PrivacyPolicy);
