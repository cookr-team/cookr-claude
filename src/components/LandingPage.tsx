import React, { useState, useEffect, useRef } from "react";
import { ICONS, PLATFORM_NAME } from "../constants";
import Logo from "./Logo";
import { useLanguage } from "../contexts/LanguageContext";
import { Globe, ChevronDown, Sparkles, ShieldAlert, X, Wine, CheckCircle, Flame, Loader2 } from "lucide-react";
import CategoryQuickModal from "./CategoryQuickModal";
import ExcellenceStandard from "./ExcellenceStandard";

import { tr } from "../lib/tr";
interface LandingPageProps {
  onStart: (role: "CLIENT" | "COOK", flow?: "login" | "register") => void;
  onLogin: () => void;
  onNavigate: (view: string) => void;
  onOpenFineDiningModal?: () => void;
}

const LOCAL_TXT = {
  entrar: { pt: "Entrar", en: "Sign In", fr: "Connexion", es: "Iniciar Sesión" },
  aderir: { pt: "Aderir", en: "Join Us", fr: "Rejoindre", es: "Unirse" },
  elite: { pt: "A Elite da Cozinha Privada em Portugal", en: "The Elite of Private Dining in Portugal", fr: "L'Élite de la Cuisine Privée au Portugal", es: "La Élite de la Cocina Privada en Portugal" },
  sua_casa: { pt: "Sua Casa, O Melhor Restaurante.", en: "Your Home, The Best Restaurant.", fr: "Votre Maison, Le Meilleur Restaurant.", es: "Tu Hogar, El Mejor Restaurante." },
  tagline: { pt: "Ligue-se aos chefs profissionais mais talentosos para experiências gastronómicas exclusivas e inesquecíveis.", en: "Connect with the most talented professional chefs for exclusive and unforgettable dining experiences.", fr: "Connectez-vous avec les chefs professionnels les plus talentueux pour des expériences gastronomiques exclusives et inoubliables.", es: "Conéctate con los chefs profesionales más talentosos para experiencias gastronómicas exclusivas e inolvidables." },
  chefs_cert: { pt: "CHEFS CERTIFICADOS", en: "CERTIFIED CHEFS", fr: "CHEFS CERTIFIÉS", es: "CHEFS CERTIFICADOS" },
  eventos_realiz: { pt: "EVENTOS REALIZADOS", en: "EVENTS COMPLETED", fr: "ÉVÉNEMENTS RÉALISÉS", es: "EVENTOS REALIZADOS" },
  rating_med: { pt: "RATING MÉDIO", en: "AVERAGE RATING", fr: "NOTE MOYENNE", es: "VALORACIÓN MEDIA" },
  seguranca_tot: { pt: "SEGURANÇA TOTAL", en: "TOTAL SECURITY", fr: "SÉCURITÉ TOTALE", es: "SEGURIDAD TOTAL" },
  caminho_extra: { pt: "O Caminho do Extraordinário.", en: "The Path to the Extraordinary.", fr: "Le Chemin vers l'Extraordinaire.", es: "El Camino hacia lo Extraordinario." },
  simples_seguro: { pt: "Simples, seguro e totalmente personalizado.", en: "Simple, secure, and fully customized.", fr: "Simple, sécurisé et entièrement personnalisé.", es: "Simple, seguro y totalmente personalizado." },
  descubra: { pt: "Descubra", en: "Discover", fr: "Découvrez", es: "Descubra" },
  descubra_desc: { pt: "Explore os portefólios dos chefs mais próximos de si e as suas especialidades exclusivas.", en: "Explore the portfolios of chefs near you and their exclusive specialties.", fr: "Explorez les portfolios des chefs près de chez vous et leurs spécialités exclusives.", es: "Explore los portafolios de los chefs más cercanos a usted y sus especialidades exclusivas." },
  personalize: { pt: "Personalize", en: "Customize", fr: "Personnalisez", es: "Personalice" },
  personalize_desc: { pt: "Defina a data, o menu e as restrições alimentares diretamente com o chef via chat.", en: "Define the date, menu, and dietary restrictions directly with the chef via chat.", fr: "Définissez la date, le menu et les restrictions alimentaires directement avec le chef via chat.", es: "Defina la fecha, el menú y las restricciones alimentarias directamente con el chef por chat." },
  desfrute: { pt: "Desfrute", en: "Enjoy", fr: "Savourez", es: "Disfrute" },
  desfrute_desc: { pt: "O Chef chega com os ingredientes, cozinha, serve e deixa a sua cozinha impecável.", en: "The Chef arrives with the ingredients, cooks, serves, and leaves your kitchen spotless.", fr: "Le Chef arrive avec les ingrédients, cuisine, sert et laisse votre cuisine impeccable.", es: "El Chef llega con los ingredientes, cocina, sirve y deja su cocina impecable." },
  concierge: { pt: "O seu Concierge Gastronómico.", en: "Your Gastronomic Concierge.", fr: "Votre Concierge Gastronomique.", es: "Su Concierge Gastronómico." },
  ai_desc: { pt: "Crie o menu perfeito em segundos. A nossa inteligência artificial ajuda-o a harmonizar menus, sugerir chefs baseados nos seus gostos e planear cada detalhe logístico num instante.", en: "Create the perfect menu in seconds. Our artificial intelligence helps you pair menus, suggest chefs based on your tastes, and plan every logistical detail in an instant.", fr: "Créez le menu parfait en quelques secondes. Notre intelligence artificielle vous aide à harmoniser les menus, vous suggère des chefs selon vos goûts et planifie chaque détail logistique en un instant.", es: "Cree el menú perfecto en segundos. Nuestra inteligencia artificial le ayuda a maridar menús, sugerir chefs según sus gustos y planificar cada detalle logístico en un instante." },
  sabores_ref: { pt: "Sabores de Referência.", en: "World-Class Flavors.", fr: "Saveurs d'Exception.", es: "Sabores de Referencia." },
  especialidades_req: { pt: "As nossas especialidades mais requisitadas este mês.", en: "Our most requested specialties this month.", fr: "Nos spécialités les plus demandées ce mois-ci.", es: "Nuestras especialidades más solicitadas este mes." },
  ver_todos: { pt: "Ver todos os chefs", en: "View all chefs", fr: "Voir tous les chefs", es: "Ver todos los chefs" },
  escolha_portal: { pt: "Escolha o seu Portal", en: "Choose your Portal", fr: "Choisissez votre Portail", es: "Elija su Portal" },
  seja_para_desfrutar: { pt: "Seja para desfrutar ou para criar, o Cookr é o seu lugar.", en: "Whether to enjoy or to create, Cookr is your place.", fr: "Que ce soit pour savourer ou pour créer, Cookr est votre place.", es: "Ya sea para disfrutar o para crear, Cookr es su lugar." },
  sou_cliente: { pt: "Sou Cliente", en: "I am a Client", fr: "Je suis Client", es: "Soy Cliente" },
  sou_cliente_desc: { pt: "Procuro o chef perfeito para os meus eventos e jantares privados.", en: "I am looking for the perfect chef for my events and private dinners.", fr: "Je recherche le chef parfait pour mes événements et dîners privés.", es: "Busco el chef perfecto para mis eventos y cenas privadas." },
  sou_chef: { pt: "Sou Chef", en: "I am a Chef", fr: "Je suis Chef", es: "Soy Chef" },
  sou_chef_desc: { pt: "Desejo profissionalizar o meu serviço e gerir as minhas próprias reservas.", en: "I want to professionalize my service and manage my own bookings.", fr: "Je souhaite professionnaliser mon service et gérer mes propres réservations.", es: "Deseo profesionalizar mi servicio y gestionar mis propias reservas." },
  criar_conta: { pt: "Criar Conta", en: "Create Account", fr: "Créer un Compte", es: "Crear Cuenta" },
  registar_perfil: { pt: "Registar Perfil", en: "Register Profile", fr: "Enregistrer le Profil", es: "Registrar Perfil" },
  painel_chef: { pt: "Painel de Chef", en: "Chef Dashboard", fr: "Tableau de Chef", es: "Panel de Chef" },
  pronto_para_elevar: { pt: "Pronto para elevar o seu próximo jantar?", en: "Ready to elevate your next dinner?", fr: "Prêt à sublimer votre prochain dîner ?", es: "¿Listo para elevar su próxima cena?" },
  inscrever: { pt: "Inscrever", en: "Subscribe", fr: "S'abonner", es: "Suscribirse" },
  email_gourmet: { pt: "O seu email gourmet", en: "Your gourmet email", fr: "Votre email gourmet", es: "Su correo gourmet" },
  privacidade: { pt: "Privacidade", en: "Privacy", fr: "Confidentialité", es: "Privacidad" },
  termos: { pt: "Termos", en: "Terms", fr: "Conditions", es: "Términos" },
  ajuda: { pt: "Ajuda", en: "Help", fr: "Aide", es: "Ayuda" },
  haccp: { pt: "HACCP", en: "HACCP", fr: "HACCP", es: "HACCP" },
  chat_joao: { pt: '"Olá João! Sugiro um Chef de Cozinha Japonesa para o seu jantar de amanhã. O Chef Tanaka está disponível!"', en: '"Hello João! I suggest a Japanese Chef for your dinner tomorrow. Chef Tanaka is available!"', fr: '"Bonjour João ! Je suggère un chef japonais pour votre dîner de demain. Le Chef Tanaka est disponible !"', es: '"¡Hola João! Le sugiero un Chef de Cocina Japonesa para su cena de mañana. ¡El Chef Tanaka está disponible!"' },
  chat_reply: { pt: "Excelente ideia. Reserve para 4 pessoas.", en: "Great idea. Book for 4 people.", fr: "Excellente idée. Réservez pour 4 personnes.", es: "Excelente idea. Reserve para 4 personas." },
  harmonizacao_ia: { pt: "Harmonização IA", en: "AI Pairing", fr: "Harmonisation IA", es: "Maridaje IA" },
  sugestao_vinho: { pt: "Sugestão de vinhos e acompanhamentos.", en: "Wine and side pairing suggestions.", fr: "Suggestions de vins et d'accompagnements.", es: "Sugerencia de vinos y acompañamientos." },
  filtro_alergias: { pt: "Filtro de Alergias", en: "Allergy Filtering", fr: "Filtre d'Allergies", es: "Filtro de Alergias" },
  seguranca_total_verif: { pt: "Segurança total com verificação automática.", en: "Total safety with automatic verification.", fr: "Sécurité totale avec vérification automatique.", es: "Seguridad total con verificación automática." }
};

const LandingPage: React.FC<LandingPageProps> = ({
  onStart,
  onLogin,
  onNavigate,
  onOpenFineDiningModal,
}) => {
  const { language, setLanguage } = useLanguage();
  const tx = (key: keyof typeof LOCAL_TXT) => LOCAL_TXT[key][language] || LOCAL_TXT[key]["pt"];

  const [isLangOpen, setIsLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [quickCategory, setQuickCategory] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-dvh bg-white overflow-x-hidden selection:bg-orange-500 selection:text-white font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] px-3.5 sm:px-6 md:px-16 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-2.5 md:pt-4 md:pb-4 flex justify-between items-center bg-white/90 backdrop-blur-md border-b border-slate-50 md:border-none">
        <Logo size="sm" onClick={() => onNavigate("landing")} />
        <div className="flex items-center gap-2.5 sm:gap-4 md:gap-6">
          {/* Elegant Language Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full hover:bg-slate-50 transition-all cursor-pointer border border-transparent hover:border-slate-100 text-slate-700 hover:text-slate-950 active:scale-95"
            >
              <Globe size={13} className={`transition-colors shrink-0 ${isLangOpen ? "text-orange-500" : "text-slate-500"}`} />
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest">{language}</span>
              <ChevronDown size={10} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isLangOpen ? "rotate-180 text-orange-500" : ""}`} />
            </button>
            
            {/* Dropdown Menu */}
            {isLangOpen && (
              <div className="absolute right-0 mt-1.5 w-32 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.06)] py-1.5 z-50 transform origin-top-right transition-all duration-200">
                {[
                  { code: "pt", label: "Português", flag: "🇵🇹" },
                  { code: "es", label: "Español", flag: "🇪🇸" },
                  { code: "en", label: "English", flag: "🇬🇧" },
                  { code: "fr", label: "Français", flag: "🇫🇷" }
                ].map((item) => (
                  <button
                    key={item.code}
                    onClick={() => {
                      setLanguage(item.code as any);
                      setIsLangOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-left transition-colors cursor-pointer ${
                      language === item.code
                        ? "text-orange-500 bg-orange-500/5"
                        : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xs">{item.flag}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onLogin}
            className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-950 hover:text-orange-500 transition-colors cursor-pointer"
          >
            {tx("entrar")}
          </button>
          <button
            onClick={() => onStart("CLIENT", "register")}
            className="h-9 sm:h-11 md:h-12 px-4 sm:px-6 md:px-7 bg-[#0A0A0B] text-white rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all hover:bg-orange-500 shadow-md hover:shadow-orange-500/20 active:scale-95 flex items-center justify-center cursor-pointer relative before:absolute before:-inset-2 before:content-[''] shrink-0"
          >
            {tx("aderir")}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-[calc(env(safe-area-inset-top,0px)+70px)] pb-8 md:pt-24 md:pb-12 px-4 sm:px-6 md:px-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 items-center">
          {/* Left Content */}
          <div className="space-y-3 md:space-y-5 text-left animate-in slide-in-from-left-10 duration-1000">
            <div className="inline-flex items-center gap-2 bg-[#FFF5EE] px-4 py-1 md:px-5 md:py-1.5 rounded-full border border-[#FFE4D1]">
              <ICONS.Star className="text-[#FF6B00] fill-[#FF6B00]" size={11} />
              <span className="text-[8px] md:text-[9.5px] font-black text-[#FF6B00] uppercase tracking-widest">
                {tx("elite")}
              </span>
            </div>

            <div className="space-y-2 md:space-y-3">
              {language === "pt" ? (
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tighter leading-[1.05] uppercase">
                  {tr("Sua Casa,")} <br />
                  <span className="text-[#FF6B00]">
                    {tr("O Melhor")} <br /> {tr("Restaurante.")}
                  </span>
                </h1>
              ) : language === "en" ? (
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tighter leading-[1.05] uppercase">
                  {tr("Your Home,")} <br />
                  <span className="text-[#FF6B00]">
                    {tr("The Best")} <br /> {tr("Restaurant.")}
                  </span>
                </h1>
              ) : language === "es" ? (
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tighter leading-[1.05] uppercase">
                  {tr("Tu Hogar,")} <br />
                  <span className="text-[#FF6B00]">
                    {tr("El Mejor")} <br /> {tr("Restaurante.")}
                  </span>
                </h1>
              ) : (
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tighter leading-[1.05] uppercase">
                  {tr("Votre Maison,")} <br />
                  <span className="text-[#FF6B00]">
                    {tr("Le Meilleur")} <br /> {tr("Restaurante.")}
                  </span>
                </h1>
              )}
              <p className="text-xs md:text-base font-medium text-slate-700 max-w-lg leading-relaxed">
                {tx("tagline")}
              </p>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative animate-in zoom-in duration-1000 delay-200">
            <div className="relative z-10 rounded-tr-[3rem] rounded-bl-[3rem] rounded-tl-[8rem] rounded-br-[8rem] overflow-hidden h-[240px] md:h-[350px] shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=1200&auto=format&fit=crop"
                className="w-full h-full object-cover"
                alt={tr("Chef Experience")}
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section (Dark) */}
      <section className="bg-[#050505] py-8 md:py-12 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
            {[
              {
                icon: ICONS.ChefHat,
                value: "+150",
                label: tx("chefs_cert"),
              },
              {
                icon: ICONS.Utensils,
                value: "+2.4k",
                label: tx("eventos_realiz"),
              },
              { icon: ICONS.Star, value: "4.95", label: tx("rating_med") },
              {
                icon: ICONS.ShieldCheck,
                value: "100%",
                label: tx("seguranca_tot"),
              },
            ].map((stat, i) => (
              <div key={i} className="text-center space-y-3 md:space-y-4">
                <div className="flex items-center justify-center text-orange-500">
                  <stat.icon size={20} className="md:w-5 md:h-5" />
                </div>
                <div className="space-y-1 md:space-y-2">
                  <p className="text-2xl md:text-4xl font-black text-white tracking-tighter leading-none">
                    {stat.value}
                  </p>
                  <p className="text-[6.5px] md:text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] md:tracking-[0.3em]">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-12 md:py-16 bg-slate-50/40 overflow-hidden border-y border-slate-100/60">
        <div className="max-w-7xl mx-auto px-6 md:px-16 text-center space-y-6 md:space-y-8">
          <div className="space-y-2">
            {language === "pt" ? (
              <h2 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tighter uppercase leading-[1.1] md:leading-none">
                {tr("O Caminho do")} <br />
                <span className="text-orange-500">{tr("Extraordinário.")}</span>
              </h2>
            ) : language === "en" ? (
              <h2 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tighter uppercase leading-[1.1] md:leading-none">
                {tr("The Path to the")} <br />
                <span className="text-orange-500">{tr("Extraordinary.")}</span>
              </h2>
            ) : (
              <h2 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tighter uppercase leading-[1.1] md:leading-none">
                {tr("Le Chemin de l'")} <br />
                <span className="text-orange-500">{tr("Extraordinaire.")}</span>
              </h2>
            )}
            <p className="text-xs md:text-base font-medium text-slate-400 italic">
              {tx("simples_seguro")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                id: "01",
                icon: ICONS.Search,
                title: tx("descubra"),
                desc: tx("descubra_desc"),
              },
              {
                id: "02",
                icon: ICONS.MessageSquare,
                title: tx("personalize"),
                desc: tx("personalize_desc"),
              },
              {
                id: "03",
                icon: ICONS.Heart,
                title: tx("desfrute"),
                desc: tx("desfrute_desc"),
              },
            ].map((step, i) => (
              <div
                key={i}
                className="bg-white p-8 md:p-10 rounded-[1.8rem] md:rounded-[2.5rem] border border-slate-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.06)] hover:border-orange-500/10 transition-all text-left space-y-5 group flex flex-col justify-between h-full"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-100/70 rounded-full flex items-center justify-center text-slate-950 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300 shrink-0">
                  <step.icon size={20} className="md:w-[22px] md:h-[22px]" />
                </div>
                <div className="space-y-2 md:space-y-3">
                  <span className="text-[8px] md:text-[9.5px] font-black text-orange-500 uppercase tracking-widest">
                    {step.id}
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-slate-950 uppercase italic tracking-tighter">
                    {step.title}
                  </h3>
                  <p className="text-xs md:text-sm font-medium text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O Padrão de Excelência Cookr */}
      <ExcellenceStandard onExploreChefs={() => onNavigate("chefs")} />

      {/* Cuisines Section */}
      <section className="py-8 md:py-12 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-16 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="text-left space-y-2">
              {language === "pt" ? (
                <h2 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tighter uppercase leading-[1.1] md:leading-none">
                  {tr("Sabores de")} <br />
                  <span className="text-orange-500">{tr("Referência.")}</span>
                </h2>
              ) : language === "en" ? (
                <h2 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tighter uppercase leading-[1.1] md:leading-none">
                  {tr("World-Class")} <br />
                  <span className="text-orange-500">{tr("Flavors.")}</span>
                </h2>
              ) : (
                <h2 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tighter uppercase leading-[1.1] md:leading-none">
                  {tr("Saveurs d'")} <br />
                  <span className="text-orange-500">{tr("Exception.")}</span>
                </h2>
              )}
              <p className="text-xs md:text-sm font-medium text-slate-400 italic">
                {tx("especialidades_req")}
              </p>
            </div>
            <button
              onClick={onLogin}
              className="mt-6 md:mt-0 flex items-center justify-center gap-2.5 px-6 py-3.5 border border-slate-200 hover:border-orange-500/80 text-slate-950 hover:text-orange-600 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all duration-300 shadow-xs hover:shadow-sm active:scale-95 cursor-pointer bg-white"
            >
              <span>{tx("ver_todos")}</span>
              <ICONS.ArrowRight size={14} className="text-orange-500" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                id: "fine-dining",
                title: language === "pt" ? "Fine Dining" : language === "en" ? "Fine Dining" : "Gastronomie",
                count: language === "pt" ? "45 Chefs" : language === "en" ? "45 Chefs" : "45 Chefs",
                img: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800",
              },
              {
                id: "sushi-de-autor",
                title: language === "pt" ? "Sushi de Autor" : language === "en" ? "Signature Sushi" : "Sushi Signature",
                count: language === "pt" ? "28 Chefs" : language === "en" ? "28 Chefs" : "28 Chefs",
                img: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=800",
              },
              {
                id: "tradicional",
                title: language === "pt" ? "Tradicional Lusa" : language === "en" ? "Portuguese Tradition" : "Tradition Portuguaise",
                count: language === "pt" ? "62 Chefs" : language === "en" ? "62 Chefs" : "62 Chefs",
                img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=800",
              },
              {
                id: "plant-based",
                title: language === "pt" ? "Plant Based" : language === "en" ? "Plant Based" : "Végétal",
                count: language === "pt" ? "15 Chefs" : language === "en" ? "15 Chefs" : "15 Chefs",
                img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800",
              },
            ].map((cat) => (
              <div
                key={cat.id}
                onClick={() => setQuickCategory(cat.id)}
                className="group relative h-[180px] md:h-[240px] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-300"
              >
                <img
                  src={cat.img}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  alt={cat.title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-5 left-5 text-left">
                  <h4 className="text-lg font-black text-white uppercase italic tracking-tighter">
                    {cat.title}
                  </h4>
                  <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest mt-0.5">
                    {cat.count}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portal Selection Section */}
      <section className="py-8 md:py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 md:px-16 text-center space-y-6 md:space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
              {tx("escolha_portal")}
            </h2>
            <p className="text-xs md:text-sm font-medium text-slate-500">
              {tx("seja_para_desfrutar")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
            {/* Client Portal */}
            <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 hover:border-orange-500/30 transition-all shadow-xl hover:shadow-orange-500/5 text-left flex flex-col justify-between gap-4 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -mr-12 -mt-12" />
              <div className="space-y-4">
                <div className="w-11 h-11 bg-orange-500/5 text-orange-500 rounded-xl flex items-center justify-center shadow-inner">
                  <ICONS.Users size={22} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl md:text-2xl font-black text-slate-950 uppercase italic tracking-tighter">
                    {tx("sou_cliente")}
                  </h3>
                  <p className="text-xs font-medium text-slate-400 leading-relaxed italic">
                    {tx("sou_cliente_desc")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  onClick={() => onStart("CLIENT", "register")}
                  className="h-11 px-5 sm:h-12 sm:px-6 bg-orange-500 text-white rounded-lg font-bold uppercase text-[9px] sm:text-[11px] tracking-wider shadow-md hover:shadow-orange-500/20 hover:bg-orange-600 transition-all cursor-pointer relative before:absolute before:-inset-2 before:content-['']"
                >
                  {tx("criar_conta")}
                </button>
                <button
                  onClick={onLogin}
                  className="h-11 px-5 sm:h-12 sm:px-6 bg-white border border-slate-200 text-slate-950 rounded-lg font-bold uppercase text-[9px] sm:text-[11px] tracking-wider hover:bg-slate-50 hover:border-slate-450 transition-all cursor-pointer relative before:absolute before:-inset-2 before:content-['']"
                >
                  {tx("entrar")}
                </button>
              </div>
            </div>

            {/* Chef Portal */}
            <div className="bg-slate-950 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] text-left flex flex-col justify-between gap-4 overflow-hidden relative border border-white/5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12" />
              <div className="space-y-4">
                <div className="w-11 h-11 bg-white/5 text-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                  <ICONS.ChefHat size={22} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">
                    {tx("sou_chef")}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                    {tx("sou_chef_desc")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  onClick={() => onStart("COOK", "register")}
                  className="h-11 px-5 sm:h-12 sm:px-6 bg-white text-slate-950 rounded-lg font-bold uppercase text-[9px] sm:text-[11px] tracking-wider shadow-md hover:bg-slate-50 transition-all cursor-pointer relative before:absolute before:-inset-2 before:content-['']"
                >
                  {tx("registar_perfil")}
                </button>
                <button
                  onClick={onLogin}
                  className="h-11 px-5 sm:h-12 sm:px-6 bg-slate-900 text-white rounded-lg font-bold uppercase text-[9px] sm:text-[11px] tracking-wider border border-white/10 hover:bg-slate-800 transition-all cursor-pointer relative before:absolute before:-inset-2 before:content-['']"
                >
                  {tx("painel_chef")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-4 md:py-6 bg-white overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-3 md:space-y-4">
          <h2 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tighter uppercase leading-[1.1] md:leading-none">
            {language === "pt" ? (
              <>{tr("Pronto para elevar o seu")} <br /> {tr("próximo jantar?")}</>
            ) : language === "en" ? (
              <>{tr("Ready to elevate your")} <br /> {tr("next dinner?")}</>
            ) : (
              <>{tr("Prêt à sublimer votre")} <br /> {tr("prochain dîner ?")}</>
            )}
          </h2>
          <div className="flex flex-col sm:flex-row gap-2.5 max-w-lg mx-auto">
            <input
              type="email"
              placeholder={tx("email_gourmet")}
              className="flex-1 h-11 md:h-12 px-6 bg-slate-50 rounded-full font-bold text-xs md:text-sm outline-none border border-transparent focus:border-orange-500 transition-all"
            />
            <button className="h-11 md:h-12 px-8 bg-orange-500 text-white rounded-full font-black uppercase text-[9px] tracking-widest shadow-lg hover:bg-orange-600 transition-all">
              {tx("inscrever")}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-4 md:py-6 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 md:px-16 text-center space-y-4">
          <Logo
            size="md"
            className="flex-col !gap-2"
            onClick={() => onNavigate("landing")}
          />

          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {[
              { label: tx("privacidade"), view: "privacy" },
              { label: tx("termos"), view: view => view === "en" ? "Terms" : "terms" },
              { label: tx("ajuda"), view: "help" },
              { label: tx("haccp"), view: "haccp" },
            ].map((link, i) => (
              <button
                key={i}
                onClick={() => onNavigate(typeof link.view === "function" ? "terms" : link.view)}
                className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-500 transition-colors"
               >
                {link.label}
              </button>
            ))}
          </div>

          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">
            {tr("© 2026 LUXURY GASTRONOMY HUB PORTUGAL")}
          </p>
        </div>
      </footer>

      {/* Category Quick Modal */}
      <CategoryQuickModal
        categoryId={quickCategory}
        onClose={() => setQuickCategory(null)}
        onOpenAuth={(flow) => {
          setQuickCategory(null);
          onStart("CLIENT", flow);
        }}
        onNavigatePage={(route) => {
          setQuickCategory(null);
          onNavigate(route);
        }}
      />
    </div>
  );
};

export default React.memo(LandingPage);
