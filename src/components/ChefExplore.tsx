import React, { useState, useMemo } from "react";
import { ICONS } from "../constants";
import { User, MenuItem } from "../types";

import { tr } from "../lib/tr";
import { useLanguage } from "../contexts/LanguageContext";
interface ChefExploreProps {
  cooks: User[];
  allMenus: MenuItem[];
  isLoading?: boolean;
  currentUser?: User | null;
  onNotify?: (message: string, type?: "success" | "info" | "error") => void;
  onSelectChef?: (chefId: string) => void;
  onViewAllChefs?: () => void;
}

const FEATURED_CHEFS = [
  {
    id: "maria-garcia",
    nome: "Chef Maria Garcia",
    bio: "Especialista em Cozinha Italiana e Massas Frescas Artesanais.",
    rating: "4.9",
    orders: "342 Pedidos Concluídos",
    avatar: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: "ricardo-sousa",
    nome: "Chef Ricardo Sousa",
    bio: "Mestre em Sushi Fusão e Pratos de Peixe Grelhado na Brasa.",
    rating: "4.8",
    orders: "189 Pedidos Concluídos",
    avatar: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: "catia-silva",
    nome: "Chef Cátia Silva",
    bio: "Pastelaria Fina Avançada e Sobremesas Saudáveis/Vegan.",
    rating: "5.0",
    orders: "94 Pedidos Concluídos",
    avatar: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=400"
  }
];

const ChefExplore: React.FC<ChefExploreProps> = ({
  cooks,
  allMenus,
  isLoading = false,
  currentUser,
  onNotify,
  onSelectChef,
  onViewAllChefs,
}) => {
  useLanguage();
  const [showArticle, setShowArticle] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showHygieneModal, setShowHygieneModal] = useState(false);

  // Real-time calculated trends based on actual menus in database - optimized with useMemo
  const trendCounts = useMemo(() => {
    let med = 0;
    let sushi = 0;
    let saudavel = 0;

    for (let i = 0; i < allMenus.length; i++) {
      const m = allMenus[i];
      const text = `${m.nome} ${m.descricao} ${m.cuisine_type || ""} ${m.tags?.join(" ") || ""} ${m.dietary_tags?.join(" ") || ""}`.toLowerCase();
      
      if (
        text.includes("medit") ||
        text.includes("portug") ||
        text.includes("ital") ||
        text.includes("greg") ||
        text.includes("espanh") ||
        text.includes("peixe") ||
        text.includes("maris") ||
        text.includes("gaspacho") ||
        text.includes("bacal") ||
        text.includes("tacho") ||
        text.includes("azeite")
      ) {
        med++;
      }
      if (
        text.includes("sushi") ||
        text.includes("asia") ||
        text.includes("jap") ||
        text.includes("orient") ||
        text.includes("sashimi") ||
        text.includes("nigiri") ||
        text.includes("roll") ||
        text.includes("poke") ||
        text.includes("omakase") ||
        text.includes("tempura")
      ) {
        sushi++;
      }
      if (
        !!m.is_meal_prep ||
        text.includes("saud") ||
        text.includes("fit") ||
        text.includes("veg") ||
        text.includes("light") ||
        text.includes("salada") ||
        text.includes("low carb") ||
        text.includes("detox") ||
        text.includes("keto") ||
        text.includes("marmita") ||
        text.includes("pack") ||
        text.includes("bowl")
      ) {
        saudavel++;
      }
    }

    return { med, sushi, saudavel };
  }, [allMenus]);

  // Get actual month information for real-time Portugal culinary market indexes
  const { currentMonthName, seasonalInfo } = useMemo(() => {
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const now = new Date();
    const monthIdx = now.getMonth();
    const name = monthNames[monthIdx];

    const seasonalityMap = [
      {
        med: { growth: 16, desc: "Foco em sopas ricas, azeite novo transmontano e cozinha de conforto cozinhada lentamente no pote." },
        sushi: { growth: 12, desc: "Forte foco corporativo em menus executivos premium e jantares de interior." },
        saudavel: { growth: 42, desc: "Resoluções de Ano Novo: pico absoluto anual em planos de nutrição integrados e meal-prep." }
      },
      {
        med: { growth: 18, desc: "Adaptação a receitas rústicas, caça, enchidos tradicionais e peixe grelhado de inverno da costa." },
        sushi: { growth: 22, desc: "Época de São Valentim: alta procura de combinados exclusivos para casais ao domicílio." },
        saudavel: { growth: 35, desc: "Manutenção de consistência em planos alimentares e regimes detox pós-festividades." }
      },
      {
        med: { growth: 22, desc: "Transição de primavera: reintrodução de ervas aromáticas frescas, borrego de leite e legumes novos." },
        sushi: { growth: 14, desc: "Primeiros dias de sol convidam a combinados de sashimi frescos harmonizados com vinho verde." },
        saudavel: { growth: 32, desc: "Aposta em proteínas magras, vegetais frescos sazonais e sumos prensados a frio." }
      },
      {
        med: { growth: 25, desc: "Tradição pascal portuguesa liderada por assados no forno de lenha e iguarias de bacalhau." },
        sushi: { growth: 16, desc: "Menus leves e descomplicados para almoços ao ar livre no início da primavera." },
        saudavel: { growth: 38, desc: "Operação Verão: aumento expressivo na procura por refeições com rigoroso controlo calórico." }
      },
      {
        med: { growth: 28, desc: "Arranque dos petiscos de esplanada: amêijoas, saladas frescas de polvo e caracóis no final de tarde." },
        sushi: { growth: 22, desc: "Crescimento contínuo em eventos privados ao final de tarde com serviço de sushiman dedicado." },
        saudavel: { growth: 39, desc: "Alta conveniência semanal para profissionais ativos em trabalho híbrido e escritórios." }
      },
      {
        med: { growth: 32, desc: "Pico de grelhados, sardinhadas dos Santos Populares e vinhos frescos maduros ao ar livre." },
        sushi: { growth: 28, desc: "Sushi lounge de verão: preferência suprema para almoços leves e convívios nas noites quentes." },
        saudavel: { growth: 24, desc: "Alimentação de alta hidratação: bowls frescas, wraps proteicos e saladas ricas em micronutrientes." }
      },
      {
        med: { growth: 36, desc: "Sazonalidade máxima de mar: mariscos apanhados na costa, lulas grelhadas e gaspacho alentejano." },
        sushi: { growth: 32, desc: "Combate ao calor: preferência total por menus frios e sofisticados sem recurso a fogão doméstico." },
        saudavel: { growth: 20, desc: "Lancheiras e marmitas prontas e balanceadas de base vegetal para férias e praia." }
      },
      {
        med: { growth: 38, desc: "Turismo nacional em pico: gastronomia do mar algarvia e petiscos tradicionais em máxima rotação." },
        sushi: { growth: 35, desc: "Sunset Parties costeiras: elevados volumes de pedidos de rolls de fusão e tartares de atum fresca." },
        saudavel: { growth: 18, desc: "Alimentação ligeira focada em hidratação extrema, sumos naturais e digestões super fáceis." }
      },
      {
        med: { growth: 24, desc: "Regresso ao trabalho: reintrodução de pratos acolhedores de forno e massas frescas artesanais de autor." },
        sushi: { growth: 18, desc: "Final de época estival: jantares informais de reencontro com combinados variados de fusão." },
        saudavel: { growth: 40, desc: "Regresso à Rotina: reativação maciça em subscrições de planos saudáveis de meal-prep e marmitas fáceis." }
      },
      {
        med: { growth: 22, desc: "Sabores de outono: pratos de tacho enriquecidos com cogumelos silvestres colhidos à mão e castanhas." },
        sushi: { growth: 14, desc: "Procura focada em jantares intimistas de interior com harmonização cuidada de sakes." },
        saudavel: { growth: 30, desc: "Transição e reforço imunitário outonal com sopas ricas e leguminosas puras." }
      },
      {
        med: { growth: 18, desc: "Culinária densa de forno e fogo: pernil assado, grão de bico com bacalhau e sopas quentes de legumes de inverno." },
        sushi: { growth: 12, desc: "Substituição sazonal por sopas quentes de noodles orientais e pratos quentes Teppanyaki." },
        saudavel: { growth: 26, desc: "Controlo pré-festivo: refeições magras para contrabalançar os excessos calóricos de dezembro." }
      },
      {
        med: { growth: 27, desc: "Catering festivo e jantares de Natal: forte aposta em bacalhau confitado, polvo e doces artesanais." },
        sushi: { growth: 20, desc: "Alternativa chique de ano novo: combinados ostentosos com o melhor peixe gordo local e ovas de salmão." },
        saudavel: { growth: 15, desc: "Foco detox pontual e opções vegetarianas leves para equilibrar a quadra de festas." }
      }
    ];

    return {
      currentMonthName: name,
      seasonalInfo: seasonalityMap[monthIdx] || seasonalityMap[5]
    };
  }, []);

  const trends = useMemo(() => {
    // Dynamically adjust trend indices using the seasonalInfo model combined with real-time active db plate counts.
    const medGrowth = seasonalInfo.med.growth + Math.min(10, trendCounts.med * 2);
    const sushiGrowth = seasonalInfo.sushi.growth + Math.min(10, trendCounts.sushi * 2.5);
    const saudavelGrowth = seasonalInfo.saudavel.growth + Math.min(10, trendCounts.saudavel * 1.5);

    const fmtGrowth = (val: number) => `+${val % 1 === 0 ? val : val.toFixed(1)}%`;

    return [
      {
        title: "Cozinha Mediterrânea",
        growth: fmtGrowth(medGrowth),
        count: trendCounts.med,
        icon: ICONS.Zap,
        color: "text-orange-500",
        bg: "bg-orange-50/70 border border-orange-100",
        desc: seasonalInfo.med.desc
      },
      {
        title: "Rituais de Sushi",
        growth: fmtGrowth(sushiGrowth),
        count: trendCounts.sushi,
        icon: ICONS.ChefHat,
        color: "text-blue-500",
        bg: "bg-blue-50/70 border border-blue-100",
        desc: seasonalInfo.sushi.desc
      },
      {
        title: "Packs Daily Saudáveis",
        growth: fmtGrowth(saudavelGrowth),
        count: trendCounts.saudavel,
        icon: ICONS.CreditCard,
        color: "text-emerald-500",
        bg: "bg-emerald-50/70 border border-emerald-100",
        desc: seasonalInfo.saudavel.desc
      }
    ];
  }, [trendCounts, seasonalInfo]);

  // Prevent in-place array mutation (props modification) & prevent randomized flicker by memoizing topDishes using rating average stable criteria
  const topDishes = useMemo(() => {
    return [...allMenus]
      .sort((a, b) => (Number(b.rating_average || 0) - Number(a.rating_average || 0)) || (a.nome.localeCompare(b.nome)))
      .slice(0, 3);
  }, [allMenus]);

  const featuredChefs = useMemo(() => {
    const validCooks = cooks.filter((c) => c.role === "cook" || c.role === "admin"); // admin cooks also might appear
    if (validCooks.length === 0) {
      return FEATURED_CHEFS.map(f => ({ ...f, location: "Portugal" }));
    }
    return validCooks.slice(0, 3).map((cook, index) => {
      // Mock metrics for MVP
      const fallbackRatings = ["4.9", "4.8", "5.0", "4.7"];
      const fallbackOrders = [342, 189, 94, 52];
      const nameStr = cook.nome || "Chef Privado";
      return {
        id: cook.id,
        nome: nameStr.toLowerCase().includes('chef') ? nameStr : `Chef ${nameStr}`,
        bio: cook.especialidades && cook.especialidades.length > 0 ? cook.especialidades.join(", ") : "Especialista em rituais gastronómicos únicos.",
        rating: fallbackRatings[index % fallbackRatings.length],
        orders: `${fallbackOrders[index % fallbackOrders.length]} Pedidos Concluídos`,
        avatar: cook.avatar_url || "",
        location: cook.cidade || cook.localizacao || "Lisboa",
      };
    });
  }, [cooks]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 md:space-y-6 pb-6 pt-3 md:pt-4 px-4 md:px-6 animate-pulse select-none" id="chefexplore-skeleton">
        <header className="text-left space-y-2">
          <div className="h-3 w-20 bg-slate-200 rounded-full" />
          <div className="h-7 w-64 bg-slate-300 rounded-lg" />
          <div className="h-3 w-44 bg-slate-100 rounded-full" />
        </header>

        {/* Trends Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white p-4.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between h-44"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100" />
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="w-16 h-4 bg-slate-150 rounded-full" />
                    <div className="w-10 h-2 bg-slate-100 rounded-full" />
                  </div>
                </div>
                <div className="h-4 w-32 bg-slate-200 rounded-full mb-1.5" />
                <div className="h-3 w-20 bg-slate-100 rounded-full" />
                <div className="h-[1.5px] w-6 bg-slate-200 mt-2 rounded-full" />
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="h-2 w-full bg-slate-100 rounded-full" />
                <div className="h-2 w-4/5 bg-slate-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Split Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
          {/* Community Feed / Top Chefs */}
          <div className="lg:col-span-2 space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-50">
              <div className="h-4 w-40 bg-slate-200 rounded-full" />
              <div className="h-3 w-14 bg-slate-200 rounded-full" />
            </div>

            <div className="space-y-2.5">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3.5"
                >
                  <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0" />
                  <div className="flex-1 text-left space-y-2 min-w-0">
                    <div className="h-3.5 w-32 bg-slate-200 rounded-full" />
                    <div className="h-3 w-3/4 bg-slate-100 rounded-full" />
                    <div className="flex gap-4">
                      <div className="w-12 h-2.5 bg-slate-100 rounded-full" />
                      <div className="w-16 h-2.5 bg-slate-100 rounded-full" />
                    </div>
                  </div>
                  <div className="w-7 h-7 bg-slate-50 rounded shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Resources / Tips */}
          <div className="space-y-3">
            <div className="h-4 w-20 bg-slate-200 rounded-full pb-1 border-b border-slate-50" />
            <div className="bg-slate-900 p-4 rounded-xl space-y-4">
              <div className="space-y-2">
                <div className="w-12 h-3 bg-slate-800 rounded-full" />
                <div className="w-4/5 h-4 bg-slate-800 rounded-full" />
                <div className="w-full h-2.5 bg-slate-805/80 rounded-full" />
                <div className="w-2/3 h-2.5 bg-slate-805/80 rounded-full" />
              </div>
              <div className="w-full h-8 bg-white/10 rounded-lg animate-pulse" />
              <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-slate-800 rounded" />
                  <div className="w-24 h-2.5 bg-slate-800 rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-slate-800 rounded" />
                  <div className="w-32 h-2.5 bg-slate-800 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showArticle) {
    return (
      <div className="min-h-dvh bg-[#0B0D14] text-gray-300 font-sans p-4 md:p-10 select-none animate-in fade-in duration-500 relative z-50">
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
          {/* Header element to go back */}
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <button 
              onClick={() => setShowArticle(false)}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors group cursor-pointer"
            >
              <ICONS.ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform text-orange-500" />
              {tr("Voltar ao Mercado")}
            </button>
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">
              {tr("Leitura de 4 Min")}
            </span>
          </div>

          {/* 2. BODY OF ARTIGLE CARD */}
          <article className="bg-[#11141D] border border-gray-800 rounded-2xl p-6 md:p-10 space-y-6 shadow-2xl text-left">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-orange-500 font-extrabold tracking-widest text-[10px] sm:text-xs uppercase">
                  {tr("DICA DO MÊS")}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span className="text-slate-500 text-[10px] sm:text-xs font-medium">{tr("Verão 2026")}</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
                {tr("Como Otimizar o seu Menu para o Verão")}
              </h1>
              <p className="text-sm md:text-lg font-medium text-slate-450 italic leading-relaxed">
                {tr("Descubra quais os ingredientes que os clientes mais procuram nesta estação e aumente as suas margens de lucro.")}
              </p>
            </div>

            <div className="w-full h-[1px] bg-gray-800/80 my-4" />

            {/* Content Paragraphs */}
            <div className="space-y-6 text-slate-300 text-left leading-relaxed text-sm md:text-base font-normal">
              <p className="first-letter:text-4xl first-letter:font-black first-letter:text-orange-500 first-letter:float-left first-letter:mr-2">
                {tr("O verão altera radicalmente o comportamento dos consumidores. Os rituais em casa ganham uma energia mais descontraída, onde as ementas pesadas dão lugar a propostas frescas, leves e vibrantes. Para os chefs residentes na Cookr, esta transição sazonal não é apenas uma mudança estética — é a maior oportunidade do ano para otimizar a estrutura de custos, dinamizar a operação na cozinha e impulsionar a rentabilidade média de cada ritual.")}
              </p>

              <div className="space-y-3 pt-4">
                <h2 className="text-base md:text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-orange-500 rounded-sm inline-block" />
                  {tr("1. A Força dos Ingredientes da Estação")}
                </h2>
                <p>
                  {tr("Ingredientes no pico da sua maturação natural são mais abundantes, têm um custo de aquisição substancialmente inferior e oferecem um perfil de sabor incomparável. No verão português, o foco deve estar no")} <strong>{tr("tomate coração-de-boi")}</strong>, <strong>{tr("figos frescos")}</strong>, <strong>{tr("melão de Almeirim")}</strong>, <strong>pimentos</strong> {tr("e ervas aromáticas frescas (coentros, hortelã e manjericão). Introduzir estes elementos nos menus reduz diretamente o custo das mercadorias vendidas (COGS) enquanto eleva a perceção de sofisticação pelo cliente.")}
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <h2 className="text-base md:text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-orange-500 rounded-sm inline-block" />
                  {tr("2. Pratos Frios e Agilidade na Cozinha")}
                </h2>
                <p>
                  {tr("A rotação eficiente de mesas e a rapidez na execução do mise-en-place são segredos críticos de rentabilidade. Menus focados em criações frias como ceviches macerados em citrinos com batata-doce, gaspachos fumados com telha de presunto alentejano e saladas contemporâneas com queijo de cabra artesanal e frutos secos reduzem drasticamente o consumo de energia (gás/eletricidade) e o tempo de fogão, minimizando também o desconforto térmico na cozinha.")}
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <h2 className="text-base md:text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-orange-500 rounded-sm inline-block" />
                  {tr("3. Upselling Refrescante")}
                </h2>
                <p>
                  {tr("O verão convida ao consumo de bebidas premium. Propor águas aromatizadas de autor (hortelã, pepino e lima) ou mocktails artesanais (como mojito de frutos vermelhos silvestres ou infusão fria de hibisco com gengibre) como \"welcome drink\" pode ser incluído no menu ou oferecido como um extra com margens brutas que superam os 80%. É uma excelente forma de aumentar o valor médio por reserva com custos operacionais marginais.")}
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <h2 className="text-base md:text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-orange-500 rounded-sm inline-block" />
                  {tr("4. Conservação e Logística no Calor")}
                </h2>
                <p>
                  {tr("Temperaturas elevadas requerem rigor absoluto nas cadeias de frio. Para evitar desperdícios e quebras de stock, organize as suas compras na véspera e transporte todos os ingredientes refrigerados em malas térmicas controladas. Invista em marinadas cítricas e técnicas de vácuo para prolongar a frescura das proteínas animais. Cada grama de alimento salvo do desperdício reflete-se diretamente como lucro líquido na sua faturação final.")}
                </p>
              </div>
            </div>

            <div className="w-full h-[1px] bg-gray-805/80 my-8" />

            {/* 3. COMPONENTES EXTRA (OBRIGATÓRIOS NO FUNDO DA PÁGINA) */}
            <div className="space-y-5 text-left text-gray-300">
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  {tr("Recursos Essenciais Cookr")}
                </h3>
                <p className="text-[10px] text-slate-500">
                  {tr("Aceda rapidamente aos manuais operacionais e guias legais no decorrer da sua atividade na plataforma.")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setShowBillingModal(true)}
                  className="flex items-center gap-3 bg-gray-850 hover:bg-gray-800 p-4 rounded-xl text-left cursor-pointer transition-all group border border-gray-800/60"
                >
                  <div className="w-10 h-10 bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-white rounded-lg flex items-center justify-center transition-all shrink-0">
                    <ICONS.FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      {tr("Guia de Faturação")}
                    </h4>
                    <p className="text-[9px] text-slate-400 truncate">
                      {tr("Instruções legais, preenchimento e IVA.")}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setShowHygieneModal(true)}
                  className="flex items-center gap-3 bg-gray-850 hover:bg-gray-800 p-4 rounded-xl text-left cursor-pointer transition-all group border border-gray-800/60"
                >
                  <div className="w-10 h-10 bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-white rounded-lg flex items-center justify-center transition-all shrink-0">
                    <ICONS.ChefHat size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Higiene & Segurança
                    </h4>
                    <p className="text-[9px] text-slate-400 truncate">
                      {tr("Protocolo HACCP e regras de desinfeção.")}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </article>
        </div>

        {/* Modals rendered inside */}
        {showBillingModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-350">
            <div className="bg-[#11141D] border border-gray-800 rounded-2xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl relative text-left">
              <button
                onClick={() => setShowBillingModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ICONS.X size={20} />
              </button>
              <div className="flex items-center gap-2.5 pb-2 border-b border-gray-800">
                <div className="w-8 h-8 rounded bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                  <ICONS.FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-white">{tr("Guia de Faturação Cookr")}</h3>
                  <p className="text-[8px] uppercase font-black text-slate-500 tracking-wider">{tr("Manual de Conformidade Fiscal")}</p>
                </div>
              </div>
              <div className="space-y-4 text-xs text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                <p>
                  {tr("Na plataforma Cookr, todos os rituais gastronómicos são transacionados de forma segura. Enquanto prestador de serviços independente, importa garantir a conformidade com as regras fiscais de Portugal:")}
                </p>
                <ul className="list-disc pl-4 space-y-2">
                  <li><strong>{tr("Emissão de Fatura:")}</strong> {tr("O Chef é o responsável por emitir o documento fiscal legal (fatura, fatura-recibo ou recibo verde) ao cliente através do Portal das Finanças no prazo máximo de 5 dias após o ritual.")}</li>
                  <li><strong>{tr("Isenção ao Abrigo do Artigo 53º:")}</strong> {tr("Caso a sua faturação anual acumulada seja inferior a 15.000€, poderá beneficiar da isenção de IVA ao abrigo do Artigo 53º do CIVA.")}</li>
                  <li><strong>{tr("Retenção na Fonte:")}</strong> {tr("Atente se a sua situação profissional requer retenção de IRS à taxa aplicável (geralmente dispensada para volumes inferiores a 12.500€).")}</li>
                  <li><strong>{tr("Comissionamento Cookr:")}</strong> {tr("A Cookr emite mensalmente uma fatura eletrónica de prestação de serviços tecnológicos referente à taxa de serviço / comissão retida. Esta fatura serve de registo de despesa profissional para a sua contabilidade.")}</li>
                </ul>
                <p className="text-[10px] text-slate-500 italic">
                  {tr("Nota: Este artigo serve de referência rápida informativa e não dispensa a consulta de um contabilista certificado ou da Autoridade Tributária.")}
                </p>
              </div>
              <button
                onClick={() => setShowBillingModal(false)}
                className="w-full py-2 bg-orange-500 hover:bg-orange-600 font-bold uppercase tracking-widest text-[10px] text-white rounded-lg transition-colors cursor-pointer"
              >
                {tr("Fechar Manual")}
              </button>
            </div>
          </div>
        )}

        {showHygieneModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-350">
            <div className="bg-[#11141D] border border-gray-800 rounded-2xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl relative text-left">
              <button
                onClick={() => setShowHygieneModal(false)}
                className="absolute top-4 right-4 text-slate-450 hover:text-white transition-colors cursor-pointer"
              >
                <ICONS.X size={20} />
              </button>
              <div className="flex items-center gap-2.5 pb-2 border-b border-gray-800">
                <div className="w-8 h-8 rounded bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                  <ICONS.ChefHat size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-white">Segurança & HACCP</h3>
                  <p className="text-[8px] uppercase font-black text-slate-500 tracking-wider">{tr("Protocolo Sanitário de Rituais")}</p>
                </div>
              </div>
              <div className="space-y-4 text-xs text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                <p>
                  {tr("O cumprimento rigoroso dos princípios do Sistema de Análise de Perigos e Pontos Críticos de Controlo (")}<strong>{tr("HACCP")}</strong>{tr(") é basilar para manter o prestígio e a licença operacional no marketplace Cookr:")}
                </p>
                <ul className="list-disc pl-4 space-y-2">
                  <li><strong>{tr("Cadeia de Frio:")}</strong> {tr("Monitorize o estado das matérias-primas e assegure que o transporte decorre sempre abaixo dos 4°C para frescos e -18°C para ultracongelados.")}</li>
                  <li><strong>{tr("Higiene Corporal e Vestuário:")}</strong> {tr("É obrigatório a utilização de farda limpa de uso exclusivo, unhas curtas e limpas sem verniz, cabelo totalmente recolhido ou protegido por touca, e desinfeção constante das mãos.")}</li>
                  <li><strong>{tr("Prevenção da Contaminação Cruzada:")}</strong> {tr("Utilize tábuas e utensílios codificados por cores (por exemplo: verde para hortícolas, vermelho para carne crua, azul para peixe cru) e nunca misture ingredientes prontos a consumir com alimentos crus.")}</li>
                  <li><strong>{tr("Temperatura de Confeção:")}</strong> {tr("Assegure que as proteínas quentes atingem o ponto térmico de pasteurização no centro (mínimo de 75°C por 15 segundos) para neutralizar agentes patogénicos.")}</li>
                </ul>
                <p className="text-[10px] text-slate-500 italic">
                  {tr("A conformidade absoluta com esta norma é o melhor escudo de proteção jurídica do Chef e garantia de integridade da saúde dos comensais.")}
                </p>
              </div>
              <button
                onClick={() => setShowHygieneModal(false)}
                className="w-full py-2 bg-orange-500 hover:bg-orange-600 font-bold uppercase tracking-widest text-[10px] text-white rounded-lg transition-colors cursor-pointer"
              >
                {tr("Fechar Manual")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 md:space-y-6 pb-6 pt-3 md:pt-4 px-4 md:px-6 animate-in fade-in duration-500">
      <header className="text-left space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-orange-500 text-white text-[7.5px] font-bold uppercase rounded tracking-wider">
            {tr("Market Insights")}
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-950 tracking-tight uppercase leading-none">
          {tr("Explorar")} <span className="text-orange-500">{tr("Mercado.")}</span>
        </h1>
        <p className="text-[7.5px] md:text-[8.5px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">
          Tendências & Insights da Comunidade Cookr
        </p>
      </header>

      {/* Trends Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {trends.map((trend, i) => (
          <div
            key={i}
            className="bg-white p-4.5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-300 ${trend.bg}`}
                >
                  <trend.icon size={16} />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                    <span className="text-[10px]">↗</span> {trend.growth}
                  </span>
                  <span className="text-[6.5px] md:text-[7px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">
                    {tr("Em")} {currentMonthName}
                  </span>
                </div>
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight leading-tight">
                {trend.title}
              </h3>
              <p className="text-[7.5px] font-mono font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                {trend.count} {trend.count === 1 ? tr("prato ativo") : tr("pratos ativos")}
              </p>
              <div className="h-[1.5px] w-6 bg-orange-500 mt-1.5 rounded-full group-hover:w-10 transition-all duration-300" />
            </div>
            {/* Real-time Dynamic Market Insight description */}
            <p className="text-[8.5px] text-slate-500 leading-normal mt-3 pt-2.5 border-t border-slate-100 italic transition-colors group-hover:text-slate-700">
              {trend.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        {/* Community Feed / Top Chefs */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="flex items-center justify-between pb-1 border-b border-slate-50">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-950">
              {tr("Destaques da Comunidade")}
            </h3>
            <button 
              onClick={() => onViewAllChefs && onViewAllChefs()}
              className="text-[7.5px] md:text-[8px] font-bold uppercase text-orange-500 tracking-wider hover:underline cursor-pointer"
            >
              {tr("Ver Todos")}
            </button>
          </div>

          <div className="space-y-2.5">
            {featuredChefs.map((cook) => (
              <div
                key={cook.id}
                onClick={() => onSelectChef && onSelectChef(cook.id)}
                className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3.5 group hover:border-orange-500/20 transition-all text-left cursor-pointer"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-sm border border-slate-100 bg-slate-50 flex items-center justify-center">
                  {cook.avatar ? (
                    <img
                      src={cook.avatar}
                      alt={cook.nome}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  ) : (
                    <ICONS.User size={24} className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h4 className="font-bold text-slate-950 uppercase text-xs truncate flex items-center gap-1.5">
                    {cook.nome}
                  </h4>
                  <p className="text-[10px] font-medium text-slate-500 line-clamp-1 leading-relaxed mt-0.5">
                    {cook.bio}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <div className="flex items-center gap-1">
                      <ICONS.Star
                        size={10}
                        className="text-orange-500"
                        fill="currentColor"
                      />
                      <span className="text-[9px] font-bold text-slate-900">
                        {cook.rating}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ICONS.CheckCircle
                        size={10}
                        className="text-orange-500"
                      />
                      <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">
                        {cook.orders}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ICONS.MapPin
                        size={10}
                        className="text-slate-400"
                      />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {cook.location}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="w-8 h-8 bg-slate-50 text-slate-400 group-hover:text-slate-900 group-hover:bg-slate-100 rounded-lg flex items-center justify-center transition-all shrink-0 cursor-pointer">
                  <ICONS.ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Resources / Tips */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-950 pb-1 border-b border-slate-50 text-left">
            {tr("Recursos")}
          </h3>
          <div className="bg-slate-950 p-4 rounded-xl text-left space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -mr-12 -mt-12 blur-xl" />
            <div className="space-y-1 relative z-10">
              <p className="text-[7px] font-bold text-orange-400 uppercase tracking-wider">
                {tr("Dica do Mês")}
              </p>
              <h4 className="text-xs font-bold text-white uppercase tracking-tight">
                {tr("Como otimizar o seu menu para o Verão.")}
              </h4>
              <p className="text-[9px] font-medium text-white/40 leading-relaxed">
                {tr("Descubra quais os ingredientes que os clientes mais procuram nesta estação.")}
              </p>
            </div>
            <button 
              onClick={() => setShowArticle(true)}
              className="w-full py-2 bg-white text-slate-950 hover:bg-orange-500 hover:text-white rounded-lg font-bold text-[8px] uppercase tracking-wider transition-all relative z-10 cursor-pointer"
            >
              {tr("Ler Artigo")}
            </button>

            <div className="pt-3 border-t border-white/10 space-y-2.5 relative z-10">
              <div 
                onClick={() => setShowBillingModal(true)}
                className="flex items-center gap-2 group cursor-pointer"
              >
                <div className="w-6 h-6 bg-white/5 rounded flex items-center justify-center text-white group-hover:bg-orange-500 transition-all">
                  <ICONS.CreditCard size={10} />
                </div>
                <span className="text-[8px] font-bold text-white/60 uppercase tracking-wider group-hover:text-white transition-all">
                  {tr("Guia de Faturação")}
                </span>
              </div>
              <div 
                onClick={() => setShowHygieneModal(true)}
                className="flex items-center gap-2 group cursor-pointer"
              >
                <div className="w-6 h-6 bg-white/5 rounded flex items-center justify-center text-white group-hover:bg-orange-500 transition-all">
                  <ICONS.ChefHat size={10} />
                </div>
                <span className="text-[8px] font-bold text-white/60 uppercase tracking-wider group-hover:text-white transition-all">
                  Higiene & Segurança
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChefExplore);
