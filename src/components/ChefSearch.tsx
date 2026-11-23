import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, MenuItem, UserStatus } from "../types";
import {
  ICONS,
  formatPrice,
  PORTUGAL_CITIES,
  CookrCollection,
  CUISINES,
  ALL_CUISINES_IMG,
  COOKR_COLLECTIONS,
} from "../constants";
import { supabaseService } from "../services/supabaseService";
import { apiFetch } from "../lib/apiClient";
import { PremiumInteractiveGallery } from "./PremiumInteractiveGallery";
import { DietaryBadges } from "./DietaryBadges";
import { useLanguage } from "../contexts/LanguageContext";
import { todayLocal, toLocalDateStr } from "../lib/dateUtils";

import { tr, getTrLanguage } from "../lib/tr";
const CuisineImage = ({ src, alt }: { src: string; alt: string }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-black text-[10px]">
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      className="w-full h-full object-cover"
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
};

const parsedDisponibilidadeCache = new WeakMap<object, Record<string, string[]>>();

const getParsedDisponibilidade = (cook: any): Record<string, string[]> => {
  if (!cook) return {};
  if (parsedDisponibilidadeCache.has(cook)) {
    return parsedDisponibilidadeCache.get(cook)!;
  }
  let dispo = cook.disponibilidade;
  let parsed: Record<string, string[]> = {};
  if (typeof dispo === "string") {
    try {
      parsed = JSON.parse(dispo);
    } catch (e) {
      parsed = {};
    }
  } else if (dispo && typeof dispo === "object") {
    parsed = dispo;
  }
  parsedDisponibilidadeCache.set(cook, parsed);
  return parsed;
};

interface ChefSearchProps {
  cooks: User[];
  users: User[];
  currentUser: User | null;
  onSelectChef: (id: string) => void;
  selectedDate: string | null;
  selectedTime?: string | null;
  onDateChange: (date: string | null) => void;
  onTimeChange?: (time: string | null) => void;
  allMenusList?: MenuItem[];
  collections: CookrCollection[];
  isLoading?: boolean;
}

const ChefCardSkeleton = () => (
  <div className="relative aspect-[3/4] rounded-xl md:rounded-[2.5rem] overflow-hidden bg-slate-100/80 border-[2px] md:border-[4px] border-white shadow-md animate-pulse">
    <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent space-y-1.5 md:space-y-2 text-left">
      <div className="h-4 md:h-6 w-2/3 bg-slate-200 rounded" />
      <div className="h-3 md:h-4 w-1/2 bg-slate-200/80 rounded" />
    </div>
  </div>
);

const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 8; h <= 23; h++) {
    slots.push(`${h.toString().padStart(2, "0")}:00`);
    slots.push(`${h.toString().padStart(2, "0")}:30`);
  }
  slots.push("00:00");
  return slots;
})();

const BANNER_ITEMS = [
  {
    id: 1,
    tag: "Premium Selection",
    title: "O Ritual da",
    highlight: "Alta Cozinha.",
    image:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1600&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/chef1/1600/900",
    type: "hero",
  },
  {
    id: 2,
    tag: "Dica do Chef",
    title: "Sabor é",
    highlight: "Paciência.",
    description:
      "Deixe as carnes descansarem após a cozedura para manter a suculência.",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1600&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/meat/1600/900",
    type: "tip",
  },
  {
    id: 3,
    tag: "Sugestão",
    title: "Menu",
    highlight: "Degustação.",
    description: "Uma viagem sensorial por 7 momentos exclusivos na sua mesa.",
    image:
      "https://images.unsplash.com/photo-1550966842-2849a220276c?q=80&w=1600&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/fine-dining/1600/900",
    type: "suggestion",
  },
  {
    id: 4,
    tag: "Inspiração",
    title: "A Alma da",
    highlight: "Casa.",
    description:
      "Os melhores momentos acontecem à volta de uma mesa bem servida.",
    image:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1600&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/kitchen/1600/900",
    type: "phrase",
  },
];

const ChefSearch: React.FC<ChefSearchProps> = ({
  cooks = [],
  currentUser,
  onSelectChef,
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  allMenusList = [],
  collections = [],
  isLoading = false,
}) => {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState(
    currentUser?.addresses?.find((a) => a.isDefault)?.city || "Lisboa",
  );
  const [selectedCuisine, setSelectedCuisine] = useState("all");
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null,
  );
  const [showAllChefs, setShowAllChefs] = useState(false);

  const [trendingRituals, setTrendingRituals] = useState<any[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);

  // Meal Prep Plans
  const mealPrepPlans = useMemo(() => {
    return allMenusList.filter((m) => {
      if (m.is_meal_prep !== true) return false;
      const chef = (cooks || []).find((c) => c.id === m.cookId);
      return chef?.isAvailable === true;
    });
  }, [allMenusList, cooks]);

  useEffect(() => {
    const loadTrending = async () => {
      setIsLoadingTrending(true);
      try {
        const data = await supabaseService.getTrendingRituals(selectedCity);
        const normalized = (data || []).map((item: any, idx: number) => {
          if (item && item.menu && item.chef) {
            return {
              id: item.menu.id || `ritual-${idx}`,
              nome: item.menu.nome,
              image_url: item.menu.imageUrl || item.menu.image_url,
              preco: item.menu.preco,
              cook_id: item.chef.id || item.menu.cookId || item.menu.cook_id,
              chef_name: item.chef.nome,
              dietary_tags: item.menu.dietary_tags || [],
              tag: item.menu.tags?.[0] || "Ritual",
            };
          }
          return {
            ...item,
            id: item?.id || item?.menu?.id || `ritual-${idx}`,
            chef_name: item?.chef_name || item?.chef?.nome || "Chef",
            cook_id: item?.cook_id || item?.cookId || item?.chef?.id || item?.menu?.cookId,
            image_url: item?.image_url || item?.imageUrl || item?.menu?.imageUrl || item?.menu?.image_url,
            nome: item?.nome || item?.menu?.nome || "Ritual",
            preco: item?.preco ?? item?.menu?.preco ?? 0,
            dietary_tags: item?.dietary_tags || item?.menu?.dietary_tags || [],
            tag: item?.tag || item?.menu?.tags?.[0] || "Ritual",
          };
        });
        setTrendingRituals(normalized);
      } catch (e) {
        console.warn("Falha ao carregar ranking de rituais regional:", e);
      } finally {
        setIsLoadingTrending(false);
      }
    };
    loadTrending();
  }, [selectedCity]);

  // AI Recommendations Engine States
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);

  const [userCuisines, setUserCuisines] = useState<string[]>(
    currentUser?.cuisine_preferences || []
  );
  const [userRestrictions, setUserRestrictions] = useState<string[]>(
    currentUser?.dietary_restrictions || []
  );

  // Synchronize state with current user preferences when they load
  useEffect(() => {
    if (currentUser) {
      setUserCuisines(currentUser.cuisine_preferences || []);
      setUserRestrictions(currentUser.dietary_restrictions || []);
    }
  }, [currentUser]);

  const fetchAIRecommendations = async (cuisinesToUse = userCuisines, restrictionsToUse = userRestrictions) => {
    if (isLoadingRecs || allMenusList.length === 0) return;
    setIsLoadingRecs(true);
    setRecsError(null);

    // Select only available menus to recommend from
    const activeChefsIds = new Set((cooks || []).filter(c => (c.isAvailable || c.bypass_haccp_restrictions) && (c.approvedByAdmin || c.status === UserStatus.ACTIVE || c.bypass_haccp_restrictions)).map(c => c.id));
    const availableMenus = allMenusList.filter(m => m.cookId && activeChefsIds.has(m.cookId));

    // Local Fallback Match Engine (extremely robust, instant, and high quality)
    const getLocalFallbackRecommendations = () => {
      console.log("[Recommendations Fallback] Generating premium local matches for", cuisinesToUse, restrictionsToUse);
      
      // Sem menus reais disponíveis não há recomendações (nunca inventamos menus nem chefs).
      if (availableMenus.length === 0) return [];

      const scored = availableMenus.map(menu => {
        let score = 55; // base score
        
        // Cuisine matching
        const menuCuisine = (menu.cuisine_type || "").toLowerCase();
        const cuisinePrefs = cuisinesToUse.map(c => c.toLowerCase());
        if (cuisinePrefs.includes(menuCuisine)) {
          score += 30;
        } else {
          // Partial match in tags
          const hasCuisineTag = (menu.tags || []).some(t => cuisinePrefs.includes(t.toLowerCase()));
          if (hasCuisineTag) {
            score += 15;
          }
        }
        
        // Dietary restrictions matching (critical)
        const menuDietary = (menu.dietary_tags || []).map(t => t.toLowerCase());
        const userRestrictionsLower = restrictionsToUse.map(r => r.toLowerCase());
        
        userRestrictionsLower.forEach(restriction => {
          if (menuDietary.includes(restriction)) {
            score += 20; // Matches desired restriction
          } else if (restriction === "vegano" && !menuDietary.includes("vegano")) {
            score -= 40; // Penalize non-vegan if vegan is required
          } else if (restriction === "vegetariano" && !menuDietary.includes("vegetariano") && !menuDietary.includes("vegano")) {
            score -= 40; // Penalize non-vegetarian
          }
        });
        
        // Add small deterministic variance to avoid static listing
        score += (menu.preco % 5);
        
        return {
          menu,
          score: Math.min(Math.max(score, 10), 99) // Clamp score between 10 and 99
        };
      });
      
      // Sort by score descending
      const sorted = scored.sort((a, b) => b.score - a.score);
      
      // Take top 3
      const top3 = sorted.slice(0, 3);
      
      return top3.map(item => {
        const menu = item.menu;
        const chef = (cooks || []).find(c => c.id === (menu.cookId || menu.cook_id));
        const cuisineName = menu.cuisine_type || "Premium";
        
        let highlight = "Seleção do Chef";
        let winePairingSuggestion = "Espumante Murganheira Vintage Bruto";
        let explanation = `Um extraordinário menu de gastronomia ${cuisineName.toLowerCase()}, primorosamente selecionado pelo nosso chef para condizer com os seus gostos refinados. Uma experiência de 'Chef at Home' excecional no conforto da sua casa.`;
        
        const cuisineLower = cuisineName.toLowerCase();
        if (cuisineLower.includes("itália") || cuisineLower.includes("italiana")) {
          highlight = "Elegância Clássica";
          winePairingSuggestion = "Vinho Tinto Alentejano Reserva (Esporão ou Cartuxa)";
          explanation = `Uma homenagem sofisticada à clássica culinária italiana, com massas artesanais e aromas mediterrânicos. Perfeito para uma noite romântica ou celebração premium com serviço completo do chef.`;
        } else if (cuisineLower.includes("sushi") || cuisineLower.includes("japonesa") || cuisineLower.includes("asiática")) {
          highlight = "Precisão Oriental";
          winePairingSuggestion = "Vinho Verde Alvarinho Premium (Anselmo Mendes ou Soalheiro)";
          explanation = `A união perfeita entre a precisão da técnica japonesa e a frescura do peixe da costa atlântica. Um banquete de texturas e sensações visuais extraordinárias na sua própria mesa.`;
        } else if (cuisineLower.includes("mediterrânica") || cuisineLower.includes("portuguesa")) {
          highlight = "Herança Contemporânea";
          winePairingSuggestion = "Barca Velha Douro Tinto ou Vinho Branco Cartuxa";
          explanation = `Uma reinterpretação sublime das mais nobres iguarias da nossa costa e planície, confecionadas com técnicas de alta cozinha. O melhor da tradição gastronómica nacional elevado à máxima sofisticação.`;
        }
        
        const isVegan = (menu.dietary_tags || []).some(t => t.toLowerCase().includes("vegan"));
        const isVegetarian = (menu.dietary_tags || []).some(t => t.toLowerCase().includes("vegetar"));
        if (isVegan) {
          highlight = "Alta Cozinha Botânica";
          winePairingSuggestion = "Vinho Biológico Branco do Douro (Niepoort Redoma)";
          explanation = `Uma sinfonia requintada de texturas puramente vegetais e ingredientes sazonais premium, provando que a gastronomia vegana atinge o expoente do luxo sob a mestria do nosso chef privado.`;
        } else if (isVegetarian) {
          highlight = "Harmonia Vegetal";
          winePairingSuggestion = "Vinho Verde Alvarinho Quinta de Soalheiro";
          explanation = `Pratos vegetarianos refinados e inovadores que celebram o frescor da horta orgânica com técnicas de vanguarda. Uma experiência de chef at home memorável e equilibrada.`;
        }
        
        return {
          menuId: menu.id,
          matchScore: item.score,
          explanation,
          highlight,
          winePairingSuggestion,
          menu,
          chef
        };
      });
    };

    try {
      // Slicing to 8 menus instead of 15 speeds up AI processing significantly, avoiding proxy timeout
      const lightweightMenus = availableMenus.slice(0, 8).map(m => ({
        id: m.id,
        nome: m.nome,
        descricao: m.descricao,
        preco: m.preco,
        cuisine_type: m.cuisine_type || "",
        tags: m.tags || [],
        dietary_tags: m.dietary_tags || [],
        cookId: m.cookId || m.cook_id || ""
      }));

      // If we don't have enough available menus, run the fallback immediately
      if (lightweightMenus.length === 0) {
        const fallbackRecs = getLocalFallbackRecommendations();
        setRecommendations(fallbackRecs);
        setIsLoadingRecs(false);
        return;
      }

      const response = await apiFetch("/api/gemini/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuisinesToUse, restrictionsToUse, lightweightMenus, language: getTrLanguage() })
      });

      if (!response.ok) {
        throw new Error(tr("Falha ao comunicar com o servidor de IA."));
      }

      const resData = await response.json();
      const responseText = resData.text || "";
      if (!responseText) {
        throw new Error(tr("Resposta de IA vazia"));
      }

      const sanitizedResponseText = responseText
        .trim()
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); 

      let parsed = JSON.parse(sanitizedResponseText);
      if (!Array.isArray(parsed)) {
        if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
          parsed = parsed.recommendations;
        } else if (typeof parsed === "object") {
          parsed = Object.values(parsed).find(v => Array.isArray(v)) || [];
        } else {
          parsed = [];
        }
      }

      const fullRecommendations = parsed.map((rec: any) => {
        const menu = allMenusList.find(m => m.id === rec.menuId);
        if (!menu) return null;
        const chef = (cooks || []).find(c => c.id === (menu.cookId || menu.cook_id));
        return {
          ...rec,
          menu,
          chef
        };
      }).filter(Boolean);

      // If AI didn't successfully match any existing menus, use fallback
      if (fullRecommendations.length === 0) {
        const fallbackRecs = getLocalFallbackRecommendations();
        setRecommendations(fallbackRecs);
      } else {
        setRecommendations(fullRecommendations);
      }
    } catch (e) {
      console.warn("Erro ao carregar recomendações de IA (ativando fallback local de luxo):", e);
      // Seamlessly activate our local luxury recommendations matching engine instead of showing errors
      const fallbackRecs = getLocalFallbackRecommendations();
      setRecommendations(fallbackRecs);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  // Trigger initial recommendations when menus are loaded
  useEffect(() => {
    if (allMenusList.length > 0) {
      const cuisinesToUse = (currentUser?.cuisine_preferences || []).length > 0
        ? currentUser?.cuisine_preferences
        : ["italiana", "mediterrânica", "sushi"];
      const restrictionsToUse = currentUser?.dietary_restrictions || [];
      fetchAIRecommendations(cuisinesToUse, restrictionsToUse);
    }
  }, [allMenusList.length, currentUser?.id]);

  const handleTogglePreference = async (type: "cuisine" | "dietary", value: string) => {
    let updatedCuisines = [...userCuisines];
    let updatedRestrictions = [...userRestrictions];

    if (type === "cuisine") {
      updatedCuisines = userCuisines.includes(value)
        ? userCuisines.filter(v => v !== value)
        : [...userCuisines, value];
      setUserCuisines(updatedCuisines);
    } else {
      updatedRestrictions = userRestrictions.includes(value)
        ? userRestrictions.filter(v => v !== value)
        : [...userRestrictions, value];
      setUserRestrictions(updatedRestrictions);
    }

    if (currentUser) {
      try {
        await supabaseService.updateUserProfile(currentUser.id, {
          cuisine_preferences: updatedCuisines,
          dietary_restrictions: updatedRestrictions
        });
      } catch (err) {
        console.warn("Aviso ao salvar preferências:", err);
      }
    }
    
    // Immediately regenerate with the new set of tags
    fetchAIRecommendations(updatedCuisines, updatedRestrictions);
  };

  const activeCollection = useMemo(
    () => collections.find((c) => c.id === activeCollectionId),
    [activeCollectionId, collections],
  );

  const today = todayLocal();
  const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const maxDateObj = new Date();
  maxDateObj.setMonth(new Date().getMonth() + 2);
  const maxDate = toLocalDateStr(maxDateObj);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCity("Todas");
    onDateChange(null);
    onTimeChange?.(null);
    setSelectedCuisine("all");
    setActiveCollectionId(null);
    setSelectedDietary([]);
    setSelectedPriceRange("all");
    setSelectedRating(0);
  };

  const handleCollectionClick = (collection: CookrCollection) => {
    if (activeCollectionId === collection.id) {
      setActiveCollectionId(null);
    } else {
      setActiveCollectionId(collection.id);
      setSelectedCuisine("all");
      const resultsAnchor = document.getElementById("chef-results-anchor");
      if (resultsAnchor) {
        resultsAnchor.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleRitualClick = async (ritualId: string, cookId: string) => {
    try {
      await supabaseService.incrementMenuViews(ritualId);
    } catch (e) {
      console.warn("Erro ao registar tracking de clique:", e);
    }
    onSelectChef(cookId);
  };

  const [isSmartSearching, setIsSmartSearching] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const currentBanner = useMemo(() => {
    const item = BANNER_ITEMS[currentBannerIndex];
    if (language === "pt") return item;

    const bannerTrans: Record<string, Record<number, { tag: string; title: string; highlight: string; description?: string }>> = {
      es: {
        1: { tag: "Selección Premium", title: "El Ritual de la", highlight: "Alta Cocina." },
        2: { tag: "Consejo del Chef", title: "El Sabor es", highlight: "Paciencia.", description: "Deje reposar las carnes tras cocinarlas para mantener la jugosidad." },
        3: { tag: "Sugerencia", title: "Menú de", highlight: "Degustación.", description: "Un viaje sensorial de 7 momentos exclusivos en su mesa." },
        4: { tag: "Inspiración", title: "El Alma de la", highlight: "Casa.", description: "Los mejores momentos ocurren alrededor de una mesa bien servida." },
      },
      en: {
        1: { tag: "Premium Selection", title: "The Ritual of", highlight: "Haute Cuisine." },
        2: { tag: "Chef's Tip", title: "Flavor is", highlight: "Patience.", description: "Let meat rest after cooking to maintain juiciness." },
        3: { tag: "Suggestion", title: "Tasting", highlight: "Menu.", description: "A sensory journey through 7 exclusive moments at your table." },
        4: { tag: "Inspiration", title: "The Soul of the", highlight: "Home.", description: "The best moments happen around a well-served table." },
      },
      fr: {
        1: { tag: "Sélection Premium", title: "Le Rituel de la", highlight: "Haute Cuisine." },
        2: { tag: "Conseil du Chef", title: "Le Goût est", highlight: "Patience.", description: "Laissez reposer la viande après cuisson pour conserver son jus." },
        3: { tag: "Suggestion", title: "Menu de", highlight: "Dégustation.", description: "Un voyage sensoriel à travers 7 moments exclusifs à votre table." },
        4: { tag: "Inspiration", title: "L'Âme de la", highlight: "Maison.", description: "Les meilleurs moments se passent autour d'une table bien servie." },
      },
    };

    const trans = bannerTrans[language]?.[item.id];
    return {
      ...item,
      tag: trans?.tag || item.tag,
      title: trans?.title || item.title,
      highlight: trans?.highlight || item.highlight,
      description: trans?.description || item.description,
    };
  }, [currentBannerIndex, language]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % BANNER_ITEMS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const handleSmartSearch = async () => {
    if (!searchTerm.trim() || isSmartSearching) return;
    setIsSmartSearching(true);
    try {
      const response = await apiFetch("/api/gemini/smart-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchTerm,
          collections,
          PORTUGAL_CITIES,
          CUISINES,
        }),
      });

      if (!response.ok) {
        throw new Error(tr("Falha ao comunicar com o servidor de IA."));
      }

      const result = await response.json();
      if (result.city && result.city !== "Todas") setSelectedCity(result.city);

      if (result.cuisine && result.cuisine !== "all") {
        const foundCuisine = CUISINES.find(
          (c) =>
            c.label.toLowerCase() === result.cuisine.toLowerCase() ||
            c.id.toLowerCase() === result.cuisine.toLowerCase(),
        );
        if (foundCuisine) {
          setSelectedCuisine(foundCuisine.id);
        }
      }

      if (result.collection) {
        const found = collections.find((c) =>
          c.title.toLowerCase().includes(result.collection.toLowerCase()),
        );
        if (found) setActiveCollectionId(found.id);
      }

      setSearchTerm("");
    } catch (e) {
      console.error("Smart Search Error:", e);
    } finally {
      setIsSmartSearching(false);
    }
  };

  // Group menus by cookId in linear time to optimize Chef Search performance and complexity
  const menusByCookId = useMemo(() => {
    const map: Record<string, MenuItem[]> = {};
    const len = allMenusList.length;
    for (let i = 0; i < len; i++) {
      const m = allMenusList[i];
      if (m.cookId) {
        if (!map[m.cookId]) {
          map[m.cookId] = [];
        }
        map[m.cookId].push(m);
      }
    }
    return map;
  }, [allMenusList]);

  const filteredCooks = useMemo(() => {
    return (cooks || []).filter((cook) => {
      if (!cook) return false;

      // Um chef deve estar aprovado OU ativo OU com bypass ativado para aparecer
      const isApproved =
        cook.approvedByAdmin || cook.status === UserStatus.ACTIVE || cook.bypass_haccp_restrictions;
      if (!isApproved) return false;

      const chefMenus = menusByCookId[cook.id] || [];

      // We also require chefs to have at least one menu to be shown to customers
      if (chefMenus.length === 0) return false;

      const dispo = getParsedDisponibilidade(cook);
      const todayStr = todayLocal();
      const hasFutureScheduledSlots = Object.keys(dispo).some(
        (date) => date >= todayStr && (dispo[date] || []).length > 0
      );

      // Elegibilidade de Marketplace:
      // O cook é elegível se estiver Online agora (imediato), OU tiver slots futuros programados na agenda, OU bypass admin
      if (!cook.isAvailable && !hasFutureScheduledSlots && !cook.bypass_haccp_restrictions) {
        return false;
      }

      // 5. Date & Time Filter
      if (selectedDate) {
        const dayAvailability = dispo?.[selectedDate] || [];
        const isToday = selectedDate === todayStr;

        if (selectedTime) {
          if (isToday && cook.isAvailable) {
            // Se for hoje e estiver online, aceita se for horário futuro viável ou se estiver nos slots
            const [th, tm] = selectedTime.split(":").map(Number);
            const now = new Date();
            const targetMin = th * 60 + tm;
            const currentMinWithLead = now.getHours() * 60 + now.getMinutes() + 15;
            if (targetMin < currentMinWithLead && !dayAvailability.includes(selectedTime)) {
              return false;
            }
          } else {
            // Se escolheu hora num dia futuro ou cook está offline, tem de ter essa hora programada
            if (!dayAvailability.includes(selectedTime)) return false;
          }
        } else {
          // Se não escolheu hora (Qualquer Hora):
          if (isToday) {
            // Se for hoje: elegível se estiver Online OU tiver slots para o resto do dia
            if (!cook.isAvailable) {
              const now = new Date();
              const currentHour = now.getHours();
              const currentMin = now.getMinutes();
              const hasFutureSlot = dayAvailability.some((slot: string) => {
                const [h, m] = slot.split(":").map(Number);
                return h > currentHour || (h === currentHour && m > currentMin);
              });
              if (!hasFutureSlot) return false;
            }
          } else {
            // Se for data futura, tem de ter slots programados para esse dia
            if (dayAvailability.length === 0) return false;
          }
        }
      }

      const matchesCity =
        selectedCity === "Todas" ||
        (cook.localizacao || "Lisboa").toLowerCase() ===
          selectedCity.toLowerCase();
      if (!matchesCity) return false;

      if (selectedCuisine !== "all") {
        const hasTaggedItem = chefMenus.some(
          (m) =>
            m.tags
              ?.map((t) => t.toLowerCase())
              .includes(selectedCuisine.toLowerCase()) ||
            m.cuisine_type?.toLowerCase() === selectedCuisine.toLowerCase(),
        );
        const hasSpecialty = (cook.especialidades || []).some(
          (s) => s.toLowerCase() === selectedCuisine.toLowerCase(),
        );
        if (!hasTaggedItem && !hasSpecialty) return false;
      }

      if (activeCollection) {
        const { criteria } = activeCollection;
        if (criteria) {
          const matchingMenus = chefMenus.filter((m) => {
            const hasMoodTag = m.tags?.some((t) =>
              criteria.tags.includes(t.toLowerCase()),
            );
            const hasChefMoodSpec = (cook.especialidades || []).some((s) =>
              criteria.tags.includes(s.toLowerCase()),
            );
            if (!hasMoodTag && !hasChefMoodSpec) return false;
            if (
              criteria.minCourses &&
              (m.courses?.length || 0) < criteria.minCourses
            )
              return false;
            return true;
          });
          if (matchingMenus.length === 0) return false;
        }
      }

      // 6. Dietary Restrictions Filter (intelligent matching on Portuguese/English terms)
      if (selectedDietary.length > 0) {
        const matchesAllDietary = selectedDietary.every((restriction) => {
          const rLower = restriction.toLowerCase();
          
          const matchText = (text: string) => {
            const t = text.toLowerCase();
            if (rLower.includes("vegan")) {
              return t.includes("vegan") || t.includes("vege");
            }
            if (rLower.includes("vegetar")) {
              return t.includes("vegetar") || t.includes("vegan") || t.includes("vege") || t === "veg";
            }
            if (rLower.includes("glúten") || rLower.includes("gluten") || rLower.includes("glú")) {
              return t.includes("glúten") || t.includes("gluten") || t.includes("gluten-free") || t.includes("sem glú") || t.includes("sem glu");
            }
            if (rLower.includes("lactose") || rLower.includes("lac")) {
              return t.includes("lactose") || t.includes("lactose-free") || t.includes("sem lac") || t.includes("sem leite") || t.includes("sem lact");
            }
            if (rLower.includes("saudá") || rLower.includes("sauda") || rLower.includes("health") || rLower.includes("fit")) {
              return t.includes("saudá") || t.includes("sauda") || t.includes("health") || t.includes("fit") || t.includes("light") || t.includes("low carb") || t.includes("orgânico") || t.includes("organico");
            }
            return t.includes(rLower);
          };

          const chefDietary = cook.dietary_restrictions || [];
          const chefSpecs = cook.especialidades || [];
          const bio = cook.biografia || "";
          
          const chefMatches = 
            chefDietary.some(d => matchText(d)) || 
            chefSpecs.some(s => matchText(s)) ||
            matchText(bio);

          if (chefMatches) return true;

          const menuMatches = chefMenus.some((m) => {
            const mTags = m.tags || [];
            const mDietaryTags = m.dietary_tags || [];
            const textToTest = `${m.nome} ${m.descricao} ${m.cuisine_type || ""}`;
            return (
              mTags.some(t => matchText(t)) ||
              mDietaryTags.some(dt => matchText(dt)) ||
              matchText(textToTest)
            );
          });

          return menuMatches;
        });

        if (!matchesAllDietary) return false;
      }

      // 7. Price Range Filter (based on actual menus of the chef, fallback to cook.precoMedio)
      if (selectedPriceRange !== "all") {
        const chefPrices = chefMenus.map((m) => Number(m.preco) || 0).filter(p => p > 0);
        const avgPrice = chefPrices.length > 0 
          ? chefPrices.reduce((sum, p) => sum + p, 0) / chefPrices.length 
          : Number(cook.precoMedio) || 0;

        if (selectedPriceRange === "under30") {
          if (avgPrice > 30) return false;
        } else if (selectedPriceRange === "30to60") {
          if (avgPrice < 30 || avgPrice > 60) return false;
        } else if (selectedPriceRange === "above60") {
          if (avgPrice < 60) return false;
        }
      }

      // 7.5. Average Rating Filter
      if (selectedRating > 0) {
        if ((cook.rating || 0) < selectedRating) return false;
      }

      const matchesSearch =
        searchTerm === "" ||
        cook.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cook.especialidades || []).some((s) =>
          s.toLowerCase().includes(searchTerm.toLowerCase()),
        );
      if (!matchesSearch) return false;

      return true;
    });
  }, [
    cooks,
    searchTerm,
    selectedCity,
    selectedCuisine,
    selectedDietary,
    selectedPriceRange,
    selectedRating,
    selectedDate,
    selectedTime,
    activeCollection,
    allMenusList,
  ]);

  return (
    <div className="space-y-6 md:space-y-12 animate-in fade-in duration-1000 max-w-5xl mx-auto pb-2 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-8 text-left overflow-x-hidden">
      {/* 1. HERO CAROUSEL */}
      <section className="relative h-[280px] sm:h-[320px] md:h-[340px] rounded-2xl md:rounded-[2rem] overflow-hidden shadow-2xl bg-slate-900 group">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBannerIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) {
                setCurrentBannerIndex(
                  (prev) => (prev + 1) % BANNER_ITEMS.length,
                );
              } else if (info.offset.x > 50) {
                setCurrentBannerIndex(
                  (prev) =>
                    (prev - 1 + BANNER_ITEMS.length) % BANNER_ITEMS.length,
                );
              }
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <img
              key={currentBanner.id}
              src={currentBanner.image}
              className="w-full h-full object-cover transition-opacity duration-1000"
              alt={currentBanner.tag}
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src !== currentBanner.fallback) {
                  img.src = currentBanner.fallback;
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />
            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between">
              {/* Top Left Badge */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1 md:px-4 md:py-1.5 rounded-full w-fit shadow-xl"
                >
                  <ICONS.Sparkles
                    size={10}
                    className="text-orange-500 fill-orange-500 md:w-3 md:h-3"
                  />
                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">
                    {tr(currentBanner.tag as any) as any}
                  </span>
                </motion.div>
              </div>

              {/* Center Content */}
              <div className="space-y-1 md:space-y-2 max-w-2xl my-auto">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase leading-tight"
                >
                  {tr(currentBanner.title as any) as any} <br />
                  <span className="text-orange-500">
                    {currentBanner.highlight}
                  </span>
                </motion.h1>

                {currentBanner.description && (
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/80 text-[10px] sm:text-xs md:text-sm font-medium max-w-xl italic leading-relaxed"
                  >
                    "{tr(currentBanner.description as any) as any}"
                  </motion.p>
                )}
              </div>

              {/* Bottom Spacer for indicators breathing room */}
              <div className="h-4" />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Indicators */}
        <div className="absolute bottom-4 right-6 md:bottom-6 md:right-8 flex gap-2 z-30 pb-2">
          {BANNER_ITEMS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentBannerIndex(idx)}
              className={`h-1.5 transition-all duration-500 rounded-full cursor-pointer ${idx === currentBannerIndex ? "w-8 bg-orange-500" : "w-2 bg-white/30 hover:bg-white/50"}`}
            />
          ))}
        </div>

        {/* Navigation Arrows */}
        <div className="absolute top-1/2 -translate-y-1/2 left-6 right-6 flex justify-between pointer-events-none z-30 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentBannerIndex(
                (prev) =>
                  (prev - 1 + BANNER_ITEMS.length) % BANNER_ITEMS.length,
              );
            }}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white pointer-events-auto hover:bg-orange-500 hover:border-orange-500 transition-all"
          >
            <ICONS.ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentBannerIndex((prev) => (prev + 1) % BANNER_ITEMS.length);
            }}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white pointer-events-auto hover:bg-orange-500 hover:border-orange-500 transition-all"
          >
            <ICONS.ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* 2. FILTERS */}
      <section className="space-y-6 md:space-y-10" id="chef-results-anchor">
        <div className="relative -mt-6 md:-mt-8 z-20 space-y-4 md:space-y-6">
          <div className="bg-white rounded-2xl md:rounded-[2rem] shadow-luxury p-3 sm:p-4 md:p-5 flex flex-col gap-3 sm:gap-4 border border-slate-100 overflow-hidden">
            {/* LINHA 1: Bloco de Seletores Dinâmicos (Local, Data, Hora) */}
            <div className="w-full">
              <div className="grid grid-cols-1 min-[360px]:grid-cols-3 divide-y min-[360px]:divide-y-0 min-[360px]:divide-x divide-slate-200/80 w-full items-center">
                {/* 1. Seletor Local */}
                <div className="flex items-center gap-2.5 sm:gap-3 px-2.5 sm:px-4 py-2 sm:py-2.5 min-w-0">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center shrink-0 text-orange-500">
                    <ICONS.MapPin size={14} className="shrink-0" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 text-left">
                    <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 truncate">
                      {t("local")}
                    </span>
                    {currentUser?.addresses && currentUser.addresses.length > 0 ? (
                      <select
                        value={currentUser.addresses.find(a => a.city === selectedCity)?.id || selectedCity}
                        onChange={(e) => {
                          const val = e.target.value;
                          const foundAddr = currentUser.addresses?.find(a => a.id === val);
                          if (foundAddr) {
                            setSelectedCity(foundAddr.city);
                          } else {
                            setSelectedCity(val);
                          }
                        }}
                        className="w-full bg-transparent font-black text-[10px] sm:text-[11px] md:text-xs uppercase outline-none text-slate-900 cursor-pointer min-w-0 truncate leading-tight pr-1"
                      >
                        <optgroup label={tr("Meus Endereços (Raio Validado)")}>
                          {currentUser.addresses.map((addr, addrIdx) => (
                            <option key={addr.id || `addr-${addrIdx}`} value={addr.id}>
                              📍 {tr(addr.label as any) as any} ({addr.city})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label={tr("Todas as Cidades")}>
                          <option value="Todas">{tr("Portugal Inteiro")}</option>
                          {PORTUGAL_CITIES.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    ) : (
                      <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="w-full bg-transparent font-black text-[10px] sm:text-[11px] md:text-xs uppercase outline-none text-slate-900 cursor-pointer min-w-0 truncate leading-tight pr-1"
                      >
                        <option value="Todas">{tr("Portugal")}</option>
                        {PORTUGAL_CITIES.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* 2. Seletor Data */}
                <div className="flex items-center gap-2.5 sm:gap-3 px-2.5 sm:px-4 py-2 sm:py-2.5 min-w-0">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center shrink-0 text-orange-500">
                    <ICONS.Calendar size={14} className="shrink-0" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 text-left">
                    <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 truncate">
                      {t("date")}
                    </span>
                    <input
                      type="date"
                      min={today}
                      max={maxDate}
                      value={selectedDate || ""}
                      onChange={(e) => onDateChange(e.target.value || null)}
                      className="w-full bg-transparent font-black text-[10px] sm:text-[11px] md:text-xs uppercase outline-none text-slate-900 cursor-pointer leading-tight min-w-0"
                    />
                  </div>
                </div>

                {/* 3. Seletor Hora */}
                <div className="flex items-center gap-2.5 sm:gap-3 px-2.5 sm:px-4 py-2 sm:py-2.5 min-w-0">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center shrink-0 text-orange-500">
                    <ICONS.Clock size={14} className="shrink-0" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 text-left">
                    <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 truncate">
                      {t("time")}
                    </span>
                    <select
                      value={selectedTime || ""}
                      onChange={(e) => onTimeChange?.(e.target.value || null)}
                      className="w-full bg-transparent font-black text-[10px] sm:text-[11px] md:text-xs uppercase outline-none text-slate-900 cursor-pointer min-w-0 truncate leading-tight pr-1"
                    >
                      <option value="">{t("any_time")}</option>
                      {TIME_SLOTS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* LINHA 2: Campo de Busca Principal com Botão Magic Embutido */}
            <div className="w-full flex items-center gap-2.5 bg-slate-100/60 hover:bg-slate-100/90 border border-slate-200/60 rounded-full pl-3.5 sm:pl-4 pr-1.5 h-11 sm:h-12 transition-colors">
              <ICONS.Search
                size={15}
                className="text-slate-400 shrink-0"
              />
              <input
                type="text"
                placeholder={t("magic_search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSmartSearch()}
                className="flex-1 min-w-0 bg-transparent outline-none font-bold text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 h-full py-2"
              />
              <button
                type="button"
                onClick={handleSmartSearch}
                disabled={!searchTerm.trim() || isSmartSearching}
                className="h-8 sm:h-9 px-3.5 bg-slate-950 text-white rounded-full flex items-center gap-1.5 hover:bg-orange-500 transition-all active:scale-95 disabled:opacity-20 group/magic cursor-pointer shadow-xs shrink-0"
              >
                {isSmartSearching ? (
                  <ICONS.Clock
                    size={12}
                    className="animate-spin"
                  />
                ) : (
                  <>
                    <ICONS.Zap
                      size={12}
                      className="text-orange-500 group-hover/magic:text-white transition-colors"
                    />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {tr("Magic")}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* LINHA 3: Botões de Ação Padronizados */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Botão Filtros Avançados */}
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(true)}
                className={`h-10 sm:h-11 px-4 sm:px-5 rounded-full font-black text-[10px] sm:text-[11px] uppercase tracking-wider border transition-all active:scale-95 flex items-center justify-center gap-2 group shadow-xs shrink-0 cursor-pointer ${
                  selectedDietary.length > 0 || selectedPriceRange !== "all" || selectedCuisine !== "all" || selectedRating > 0
                    ? "bg-orange-500 border-orange-500 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ICONS.Filter
                  size={13}
                  className={isFilterDrawerOpen ? "animate-pulse" : ""}
                />
                <span>{selectedDietary.length > 0 || selectedPriceRange !== "all" || selectedCuisine !== "all" || selectedRating > 0 ? t("filters_active") : t("advanced_filters")}</span>
              </button>

              {/* Botão Limpar */}
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-10 sm:h-11 px-4 sm:px-5 bg-slate-50 border border-slate-200 text-slate-500 rounded-full font-black text-[10px] sm:text-[11px] uppercase tracking-wider hover:bg-slate-950 hover:text-white hover:border-slate-950 transition-all active:scale-95 flex items-center justify-center gap-2 group shadow-xs shrink-0 cursor-pointer"
              >
                <ICONS.XCircle
                  size={13}
                  className="group-hover:rotate-90 transition-transform duration-300"
                />
                <span>{t("clear")}</span>
              </button>
            </div>
          </div>

        {currentUser?.addresses && currentUser.addresses.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-3 bg-orange-500/[0.03] rounded-2xl border border-orange-500/10 text-[11px] font-semibold text-slate-800 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white shrink-0 shadow-[0_2px_6px_rgba(249,115,22,0.3)]">
                <ICONS.MapPin size={10} />
              </span>
              <span>
                {tr("A pesquisar para:")} <strong className="text-slate-950 font-black">{
                  currentUser.addresses.find(a => a.city === selectedCity)?.label || tr("Localização Atual")
                }</strong> {currentUser.addresses.find(a => a.city === selectedCity)?.address ? `(${currentUser.addresses.find(a => a.city === selectedCity)?.address})` : `(${selectedCity})`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-orange-600 tracking-wider bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100/50">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              {tr("Raio de Cobertura Validado")}
            </div>
          </motion.div>
        )}

          <div className="flex gap-3 md:gap-6 overflow-x-auto scrollbar-hide -mx-5 px-5 py-1 md:mx-0 md:px-0 md:justify-center">
            <button
              onClick={() => {
                setSelectedCuisine("all");
                setActiveCollectionId(null);
              }}
              className="flex flex-col items-center gap-1.5 shrink-0 group"
            >
              <div
                className={`w-12 h-12 md:w-16 md:h-16 rounded-full p-0.5 transition-all duration-500 border-2 ${selectedCuisine === "all" && !activeCollectionId ? "border-orange-500 scale-105 shadow-md" : "border-slate-100"}`}
              >
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
                  <CuisineImage
                    src={ALL_CUISINES_IMG}
                    alt={t("all") || tr("Todos")}
                  />
                </div>
              </div>
              <span
                className={`text-[9px] md:text-[10px] font-black uppercase transition-colors ${selectedCuisine === "all" && !activeCollectionId ? "text-orange-600" : "text-slate-400"}`}
              >
                {t("all")}
              </span>
            </button>
            {CUISINES.map((cuisine) => (
              <button
                key={cuisine.id}
                onClick={() => {
                  setSelectedCuisine(cuisine.id);
                  setActiveCollectionId(null);
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <div
                  className={`w-12 h-12 md:w-16 md:h-16 rounded-full p-0.5 transition-all duration-500 border-2 ${selectedCuisine === cuisine.id ? "border-orange-500 scale-105 shadow-md" : "border-slate-100"}`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
                    {cuisine.img ? (
                      <CuisineImage
                        src={cuisine.img}
                        alt={cuisine.label}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <ICONS.Utensils size={16} className="text-slate-300" />
                      </div>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[9px] md:text-[10px] font-black uppercase transition-colors ${selectedCuisine === cuisine.id ? "text-orange-600" : "text-slate-400"}`}
                >
                  {tr(cuisine.label as any) as any}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-1">
            <div className="space-y-0.5 text-left">
              <h2 className="text-lg md:text-4xl font-black text-slate-950 tracking-tighter uppercase leading-none">
                {language === "pt" ? tr("Chefs em") : language === "en" ? tr("Chefs in") : tr("Chefs à")} <span className="text-orange-500">{selectedCity}</span>
                {activeCollectionId && (
                  <span className="text-slate-300 ml-2">
                    / {tr(activeCollection?.title as any) as any}
                  </span>
                )}
              </h2>
              {(selectedDate || activeCollectionId) && (
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                  {language === "pt" ? tr("Seleção Inteligente Ativa") : language === "en" ? tr("Active Smart Selection") : tr("Sélection Intelligente Active")}
                </p>
              )}
            </div>

            {/* Mobile "See All" Button */}
            {!showAllChefs && filteredCooks.length > 4 && (
              <button
                onClick={() => setShowAllChefs(true)}
                className="md:hidden flex items-center gap-1.5 text-orange-500 font-black text-[10px] uppercase tracking-widest self-start mt-1"
              >
                {language === "pt" ? tr("Ver Todos") : language === "en" ? tr("See All") : tr("Voir Tout")} <ICONS.ArrowRight size={10} />
              </button>
            )}
            {showAllChefs && (
              <button
                onClick={() => setShowAllChefs(false)}
                className="md:hidden flex items-center gap-1.5 text-slate-400 font-black text-[10px] uppercase tracking-widest self-start mt-1"
              >
                {language === "pt" ? tr("Recolher") : language === "en" ? tr("Collapse") : tr("Réduire")} <ICONS.ChevronLeft size={10} />
              </button>
            )}
          </div>

          {isLoading ? (
            <>
              {/* Desktop Grid & Mobile "Show All" Grid Skeletons */}
              <div
                className={`${!showAllChefs ? "hidden md:grid" : "grid"} grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6`}
              >
                {[...Array(8)].map((_, i) => (
                  <ChefCardSkeleton key={i} />
                ))}
              </div>

              {/* Mobile Horizontal Swipe Skeletons */}
              {!showAllChefs && (
                <div className="md:hidden overflow-x-auto scrollbar-hide -mx-5 px-5 pb-4">
                  <div className="grid grid-rows-2 grid-flow-col gap-3 w-max pr-5">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-[130px]">
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-100/80 border-[2px] border-white shadow-md animate-pulse">
                          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-slate-900/35 via-transparent to-transparent space-y-1">
                            <div className="h-3 w-3/4 bg-slate-200 rounded" />
                            <div className="h-2 w-1/2 bg-slate-200/80 rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : filteredCooks.length > 0 ? (
            <>
              {/* Desktop Grid & Mobile "Show All" Grid */}
              <div
                className={`${!showAllChefs ? "hidden md:grid" : "grid"} grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6`}
              >
                {filteredCooks.map((cook, cookIdx) => (
                  <div
                    key={cook.id || `cook-grid-${cookIdx}`}
                    onClick={() => onSelectChef(cook.id)}
                    className="group cursor-pointer"
                  >
                    <div className="relative aspect-[3/4] rounded-xl md:rounded-[2.5rem] overflow-hidden bg-slate-100 transition-all duration-700 hover:shadow-xl hover:-translate-y-1 border-[2px] md:border-[4px] border-white shadow-md">
                      {cook.avatar_url && cook.avatar_url !== "" ? (
                        <img
                          src={cook.avatar_url}
                          className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 font-black text-slate-300 text-xl md:text-2xl italic">
                          {(cook.nome || "U").charAt(0)}
                        </div>
                      )}

                      {/* Top Badges Stack (High Rating, Sustainability, Allergen) */}
                      <div className="absolute top-2 left-2 md:top-4 md:left-4 flex flex-col items-start gap-1 z-10">
                        {/* High Rating / Elite Chef Badge */}
                        {((cook.rating === undefined ? 5.0 : cook.rating) >= 4.7) && (
                          <div className="px-2 py-0.5 md:px-2.5 md:py-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 text-[7.5px] md:text-[9px] font-black uppercase tracking-wider rounded-full shadow-md border border-amber-200/90 backdrop-blur-md flex items-center gap-1 animate-in fade-in zoom-in duration-300">
                            <ICONS.Star size={10} className="fill-slate-950 text-slate-950 shrink-0" />
                            <span>{(cook.rating !== undefined ? cook.rating : 5.0).toFixed(1)} {tr("Top Rated")}</span>
                          </div>
                        )}

                        {cook.sustainability_badges && cook.sustainability_badges.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-emerald-600/90 backdrop-blur-md text-white text-[7px] md:text-[8px] font-black uppercase rounded-full shadow-sm flex items-center gap-0.5">
                            <span>🌱</span>
                            <span className="hidden md:inline">{tr("Eco Chef")}</span>
                          </span>
                        )}
                        {cook.allergen_certifications && cook.allergen_certifications.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-amber-600/90 backdrop-blur-md text-white text-[7px] md:text-[8px] font-black uppercase rounded-full shadow-sm flex items-center gap-0.5">
                            <span>🛡️</span>
                            <span className="hidden md:inline">{tr("Sem Alergénios")}</span>
                          </span>
                        )}
                      </div>

                      {/* Online vs Scheduled Badge */}
                      {(() => {
                        const isOnline = cook.isAvailable;
                        if (isOnline) {
                          return (
                            <div className="absolute top-2 right-2 md:top-6 md:right-6 flex items-center gap-1 md:gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 bg-emerald-500 text-white rounded-full shadow-lg animate-in zoom-in duration-500">
                              <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-white rounded-full animate-pulse" />
                              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">
                                {t("common.online") || tr("Online")}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div className="absolute top-2 right-2 md:top-6 md:right-6 flex items-center gap-1 md:gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 bg-slate-900/80 backdrop-blur-md text-slate-200 rounded-full shadow-md border border-slate-700/50">
                            <ICONS.Calendar size={10} className="text-orange-400" />
                            <span className="text-[7.5px] md:text-[8.5px] font-black uppercase tracking-widest">
                              {t("agenda.scheduled_badge") || tr("Agenda")}
                            </span>
                          </div>
                        );
                      })()}

                      <div className="absolute inset-x-0 bottom-0 p-2 md:p-6 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent text-white text-left">
                        <h3 className="text-[10px] md:text-xl font-black tracking-tighter uppercase leading-tight truncate">
                          {cook.nome}
                        </h3>
                        <div className="flex items-center gap-1 md:gap-1.5 mt-0.5 md:mt-1">
                          <ICONS.ChefHat
                            size={6}
                            className="text-orange-500 md:w-[10px] md:h-[10px]"
                          />
                          <p className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase tracking-widest truncate">
                            {cook.especialidades?.[0]}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Horizontal Swipe (2 Rows) */}
              {!showAllChefs && (
                <div className="md:hidden overflow-x-auto scrollbar-hide -mx-5 px-5 pb-4">
                  <div className="grid grid-rows-2 grid-flow-col gap-3 w-max pr-5">
                    {filteredCooks.map((cook, cookIdx) => (
                      <div
                        key={cook.id || `cook-swipe-${cookIdx}`}
                        onClick={() => onSelectChef(cook.id)}
                        className="w-[130px] group cursor-pointer"
                      >
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 border-[2px] border-white shadow-md">
                          {cook.avatar_url && cook.avatar_url !== "" ? (
                            <img
                              src={cook.avatar_url}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 font-black text-slate-300 text-xl italic">
                              {(cook.nome || "U").charAt(0)}
                            </div>
                          )}

                          {/* High Rating / Elite Chef Badge Mobile */}
                          {((cook.rating === undefined ? 5.0 : cook.rating) >= 4.7) && (
                            <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[7px] font-black uppercase rounded-full shadow-md border border-amber-200">
                              <ICONS.Star size={8} className="fill-slate-950 text-slate-950 shrink-0" />
                              <span>{(cook.rating !== undefined ? cook.rating : 5.0).toFixed(1)}</span>
                            </div>
                          )}

                          {/* Online vs Scheduled Badge - Mobile */}
                          {(() => {
                            const isOnline = cook.isAvailable;
                            if (isOnline) {
                              return (
                                <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500 text-white rounded-full shadow-lg">
                                  <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                                  <span className="text-[8px] font-black uppercase tracking-widest">
                                    {t("common.online") || tr("Online")}
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-slate-900/80 backdrop-blur-md text-slate-200 rounded-full shadow-md border border-slate-700/50">
                                <ICONS.Calendar size={8} className="text-orange-400" />
                                <span className="text-[7px] font-black uppercase tracking-widest">
                                  {t("agenda.scheduled_badge") || tr("Agenda")}
                                </span>
                              </div>
                            );
                          })()}

                          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent text-white text-left">
                            <h3 className="text-[9px] font-black tracking-tighter uppercase leading-tight truncate">
                              {cook.nome}
                            </h3>
                            <div className="flex items-center gap-1 mt-0.5">
                              <ICONS.ChefHat
                                size={6}
                                className="text-orange-500"
                              />
                              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest truncate">
                                {cook.especialidades?.[0]}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* End of list "See All" card */}
                    {filteredCooks.length > 4 && (
                      <div
                        onClick={() => setShowAllChefs(true)}
                        className="w-[140px] aspect-[3/4] rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 cursor-pointer active:bg-slate-100 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <ICONS.ArrowRight
                            size={14}
                            className="text-orange-500"
                          />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest">
                          {language === "pt" ? tr("Ver Todos") : language === "en" ? tr("See All") : tr("Voir Tout")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center space-y-4">
              <ICONS.ChefHat size={32} className="text-slate-100" />
              <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest italic">
                {language === "pt" 
                  ? `Nenhum chef corresponde ao mood de ${activeCollection?.title || "pesquisa"} em ${selectedCity}.`
                  : language === "en"
                  ? `No chefs match the mood of ${activeCollection?.title || "search"} in ${selectedCity}.`
                  : `Aucun chef ne correspond à l'ambiance ${activeCollection?.title || "recherche"} à ${selectedCity}.`}
              </p>
              <button
                onClick={handleResetFilters}
                className="text-[8px] font-black uppercase text-orange-500 border-b border-orange-500"
              >
                {language === "pt" ? tr("Limpar Mood") : language === "en" ? tr("Clear Mood") : tr("Effacer l'Ambiance")}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3. EXCLUSIVE COLLECTIONS */}
      <section className="space-y-4 md:space-y-6">
        <div className="text-left space-y-0.5 md:space-y-1">
          <h2 className="text-lg md:text-3xl lg:text-4xl font-black text-slate-950 tracking-tighter uppercase leading-none">
            {language === "pt" ? (
              <>{tr("Coleções")} <span className="text-orange-500">{tr("Exclusivas.")}</span></>
            ) : language === "en" ? (
              <>{tr("Exclusive")} <span className="text-orange-500">{tr("Collections.")}</span></>
            ) : (
              <>{tr("Collections")} <span className="text-orange-500">{tr("Exclusives.")}</span></>
            )}
          </h2>
          <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
            {language === "pt" ? tr("Momentos desenhados com rigor.") : language === "en" ? tr("Meticulously designed moments.") : tr("Moments méticuleusement conçus.")}
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {COOKR_COLLECTIONS.map((col, colIdx) => (
            <div
              key={col.id || `col-${colIdx}`}
              onClick={() => handleCollectionClick(col)}
              className={`group relative h-32 md:h-72 rounded-xl md:rounded-[2.5rem] overflow-hidden cursor-pointer shadow-lg transition-all duration-700 border-[3px] md:border-4 ${activeCollectionId === col.id ? "border-orange-500 scale-105 shadow-orange-500/20" : "border-transparent"}`}
            >
              {col.image ? (
                <img
                  src={col.image}
                  className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-slate-100" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-4 text-left">
                <p className="text-[8px] md:text-[9px] font-black text-orange-500 uppercase tracking-widest mb-0.5 md:mb-1">
                  {language === "pt" ? col.subtitle : language === "es" ? col.subtitle_es || col.subtitle : language === "en" ? col.subtitle_en || col.subtitle : col.subtitle_fr || col.subtitle}
                </p>
                <h3 className="text-[9px] md:text-2xl font-black text-white uppercase tracking-tighter leading-none">
                  {language === "pt" ? col.title : language === "es" ? col.title_es || col.title : language === "en" ? col.title_en || col.title : col.title_fr || col.title}
                </h3>
              </div>
              {activeCollectionId === col.id && (
                <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-orange-500 text-white p-1 rounded-lg">
                  <ICONS.CheckCircle
                    size={12}
                    className="md:w-[14px] md:h-[14px]"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 4. COOK DAILY - MEAL PREP (CORRIGIDO PARA LARANJA) */}
      <section className="space-y-8 pt-4">
        <div className="text-left space-y-1">
          <div className="flex items-center gap-2 text-orange-500">
            <div className="w-6 h-0.5 bg-orange-500 rounded-full" />
            <span className="text-[8px] font-black uppercase tracking-widest italic">
              {language === "pt" ? tr("A Despensa do Chef") : language === "en" ? tr("The Chef's Pantry") : tr("Le Garde-Manger du Chef")}
            </span>
          </div>
          <h2 className="text-xl md:text-3xl lg:text-4xl font-black text-slate-950 tracking-tighter uppercase leading-none">
            {language === "pt" ? (
              <>{tr("O Seu Chef no")} <span className="text-orange-500">{tr("Dia-a-Dia.")}</span></>
            ) : language === "en" ? (
              <>{tr("Your Everyday")} <span className="text-orange-500">{tr("Chef.")}</span></>
            ) : (
              <>{tr("Votre Chef au")} <span className="text-orange-500">{tr("Quotidien.")}</span></>
            )}
          </h2>
          <p className="text-[9px] md:text-xl font-medium text-slate-400 italic">
            {t("meal_preps_subtitle")}
          </p>
        </div>

        <div className="flex gap-4 md:gap-8 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-4 snap-x snap-mandatory">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div
                key={i}
                className="min-w-[240px] md:min-w-[400px] h-[350px] md:h-[450px] bg-slate-100/60 rounded-[2rem] md:rounded-[3rem] border border-slate-50 animate-pulse relative overflow-hidden flex flex-col justify-between"
              >
                <div className="h-48 md:h-64 bg-slate-200" />
                <div className="p-4 md:p-10 space-y-3 flex-1 flex flex-col justify-end text-left">
                  <div className="h-4 md:h-6 w-3/4 bg-slate-200 rounded animate-pulse" />
                  <div className="h-3 md:h-4 w-1/4 bg-slate-200 rounded animate-pulse" />
                  <div className="flex gap-1.5 pt-2">
                    <div className="h-5 w-14 bg-slate-200 rounded-md" />
                    <div className="h-5 w-14 bg-slate-200 rounded-md" />
                  </div>
                </div>
              </div>
            ))
          ) : mealPrepPlans.length > 0 ? (
            mealPrepPlans.map((plan, planIdx) => {
              const chef = cooks.find((c) => c.id === plan.cookId);
              return (
                <div
                  key={plan.id || `plan-${planIdx}`}
                  className="min-w-[240px] md:min-w-[400px] bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-700 group overflow-hidden snap-start"
                >
                  <div className="h-48 md:h-64 relative overflow-hidden">
                    {plan.imageUrl ? (
                      <img
                        src={plan.imageUrl}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <ICONS.Utensils size={18} className="text-slate-200" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 bg-orange-500 text-white px-2.5 py-1 rounded-full text-[7px] font-black uppercase shadow-lg flex items-center gap-1 leading-none">
                      <ICONS.Calendar size={7} className="text-white shrink-0" />
                      {tr("Pack")} {plan.pack_size} {language === "pt" ? tr("Refeições") : language === "en" ? tr("Meals") : tr("Repas")}
                    </div>
                    {plan.delivery_type === "delivery" && (
                      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase text-slate-950 shadow-sm flex items-center gap-1">
                        <ICONS.Zap size={8} className="text-orange-500" />{" "}
                        {language === "pt" ? tr("Entrega ao Domicílio") : language === "en" ? tr("Home Delivery") : tr("Livraison à Domicile")}
                      </div>
                    )}
                  </div>
                  <div className="p-4 md:p-10 text-left space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-base md:text-2xl font-black text-slate-950 uppercase tracking-tighter leading-none truncate">
                        {plan.nome}
                      </h4>
                      <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {language === "pt" ? `Preparado por Chef ${chef?.nome}` : language === "en" ? `Prepared by Chef ${chef?.nome}` : `Préparé par Chef ${chef?.nome}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {plan.tags?.slice(0, 3).map((tag, tagIdx) => (
                        <span
                          key={`${plan.id || planIdx}-tag-${tag}-${tagIdx}`}
                          className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md text-[9px] font-black uppercase text-slate-400 tracking-widest"
                        >
                          #{tag}
                        </span>
                      ))}
                      <DietaryBadges tags={plan.dietary_tags} compact={true} />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-lg md:text-3xl font-black text-orange-600 italic leading-none">
                        {formatPrice(plan.preco)}
                      </p>
                      <button
                        onClick={() => onSelectChef(plan.cookId!)}
                        className="px-4 py-2 bg-slate-950 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-md"
                      >
                        {language === "pt" ? tr("Ver Pack") : language === "en" ? tr("View Pack") : tr("Voir Formule")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="w-full py-16 text-center border-2 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center space-y-4 opacity-50">
              <ICONS.Inbox size={40} className="text-slate-100" />
              <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest italic max-w-xs leading-relaxed">
                {language === "pt" 
                  ? tr("Novos packs \"Cookr Daily\" a caminho da sua região.") 
                  : language === "en" 
                  ? tr("New \"Cookr Daily\" packs coming soon to your region.") 
                  : tr("Nouveaux packs \"Cookr Daily\" bientôt disponibles dans votre région.")}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 5. CURADORIA LÍDER */}
      <section className="space-y-8 pt-4">
        <div className="flex items-end justify-between">
          <div className="text-left space-y-1">
            <div className="flex items-center gap-2 text-orange-500">
              <div className="w-6 h-0.5 bg-orange-500 rounded-full" />
              <span className="text-[8px] font-black uppercase tracking-widest italic">
                {language === "pt" ? `Trending em ${selectedCity}` : language === "en" ? `Trending in ${selectedCity}` : `Populaire à ${selectedCity}`}
              </span>
            </div>
            <h2 className="text-xl md:text-3xl lg:text-4xl font-black text-slate-950 tracking-tighter uppercase leading-none">
              {language === "pt" ? (
                <>{tr("Curadoria")} <span className="text-orange-500">{tr("Líder.")}</span></>
              ) : language === "en" ? (
                <>{tr("Top")} <span className="text-orange-500">{tr("Curations.")}</span></>
              ) : (
                <>{tr("Sélection de")} <span className="text-orange-500">{tr("Référence.")}</span></>
              )}
            </h2>
          </div>
        </div>

        <div className="flex gap-4 md:gap-8 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-4 snap-x snap-mandatory min-h-[400px]">
          {isLoadingTrending ? (
            [...Array(4)].map((_, i) => (
              <div
                key={i}
                className="min-w-[220px] md:min-w-[380px] bg-slate-100/60 rounded-[1.5rem] md:rounded-[3rem] border border-slate-50 h-[380px] md:h-[450px] animate-pulse relative overflow-hidden text-left flex flex-col justify-between"
              >
                <div className="h-44 md:h-60 bg-slate-200" />
                <div className="p-4 md:p-8 space-y-4 flex-1 flex flex-col justify-end text-left">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5 flex-1 pr-4">
                      <div className="h-4 md:h-6 w-3/4 bg-slate-200 rounded" />
                      <div className="h-3 md:h-4 w-1/2 bg-slate-200/80 rounded" />
                    </div>
                    <div className="h-4 md:h-6 w-12 bg-slate-200 rounded" />
                  </div>
                  <div className="h-10 md:h-14 w-full bg-slate-200 rounded-xl" />
                </div>
              </div>
            ))
          ) : trendingRituals.length > 0 ? (
            trendingRituals.map((rit, idx) => (
              <div
                key={rit.id || `trending-ritual-${idx}`}
                className="min-w-[220px] md:min-w-[380px] bg-white rounded-[1.5rem] md:rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-700 group overflow-hidden snap-start"
              >
                <div className="h-44 md:h-60 relative overflow-hidden">
                  {rit.image_url ? (
                    <img
                      src={rit.image_url}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]"
                      alt={rit.nome}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                      <ICONS.Utensils size={32} className="text-slate-200" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[7px] font-black uppercase text-slate-950 shadow-sm">
                    #{rit.tag || tr("Ritual")}
                  </div>
                  <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-[7px] font-black uppercase shadow-lg animate-in slide-in-from-right-2">
                    Nº {idx + 1} {language === "pt" ? "em" : language === "en" ? "in" : "à"} {selectedCity}
                  </div>
                </div>
                <div className="p-4 md:p-8 text-left space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                      <h4 className="text-sm md:text-2xl font-black text-slate-950 uppercase tracking-tighter leading-none truncate max-w-[200px]">
                        {rit.nome}
                      </h4>
                      <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {tr("Chef")} {rit.chef_name}
                      </p>
                      <DietaryBadges tags={rit.dietary_tags} compact={true} />
                    </div>
                    <p className="text-sm md:text-2xl font-black text-orange-500 italic">
                      {rit.preco}€
                    </p>
                  </div>
                  <button
                    onClick={() => handleRitualClick(rit.id, rit.cook_id)}
                    className="w-full py-3.5 md:py-5 bg-slate-950 text-white rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest group-hover:bg-orange-500 transition-all active:scale-95 shadow-md"
                  >
                    {language === "pt" ? tr("Explorar Ritual") : language === "en" ? tr("Explore Ritual") : tr("Explorer le Rituel")}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="w-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center space-y-4">
              <ICONS.Inbox size={40} className="text-slate-100" />
              <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest italic max-w-xs leading-relaxed">
                {language === "pt" ? `Ainda sem rituais em tendência em ${selectedCity}.` : language === "en" ? `No trending rituals yet in ${selectedCity}.` : `Pas encore de rituels tendance à ${selectedCity}.`}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 6. PREMIUM TESTIMONIALS */}
      <section className="py-8 md:py-24 bg-slate-50 rounded-[2rem] md:rounded-[5rem] px-4 md:px-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 p-10 opacity-[0.02] text-slate-950">
          <ICONS.Quote size={180} />
        </div>
        <div className="relative z-10 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-xl md:text-3xl lg:text-4xl font-black text-slate-950 tracking-tighter uppercase leading-none">
              {language === "pt" ? (
                <>{tr("A Voz da")} <span className="text-orange-500">{tr("Comunidade.")}</span></>
              ) : language === "en" ? (
                <>{tr("Voice of the")} <span className="text-orange-500">{tr("Community.")}</span></>
              ) : (
                <>{tr("La Voix de la")} <span className="text-orange-500">{tr("Communauté.")}</span></>
              )}
            </h2>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
              {language === "pt" ? tr("Excelência validada por membros Platinum.") : language === "en" ? tr("Excellence validated by Platinum members.") : tr("Excellence validée par nos membres Platinum.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-10">
            {[
              {
                name: "Bernardo M.",
                role: language === "pt" ? "Cliente Platinum" : language === "en" ? "Platinum Client" : "Client Platinum",
                text: language === "pt" 
                  ? "O Chef Ricardo transformou a nossa sala de jantar num restaurante Michelin por uma noite. Impecável."
                  : language === "en"
                  ? "Chef Ricardo transformed our dining room into a Michelin restaurant for one night. Flawless."
                  : "Chef Ricardo a transformé notre salle à manger en restaurant Michelin pour une nuit. Impeccable.",
                rating: 5,
              },
              {
                name: "Sofia L.",
                role: language === "pt" ? "Empresária" : language === "en" ? "Entrepreneur" : "Entrepreneuse",
                text: language === "pt"
                  ? "Fizemos um Business Lunch e o Concierge da Cookr tratou de tudo. A comida estava divina."
                  : language === "en"
                  ? "We hosted a Business Lunch and the Cookr Concierge took care of everything. The food was divine."
                  : "Nous avons organisé un déjeuner d'affaires et le concierge de Cookr s'est occupé de tout. La nourriture était divine.",
                rating: 5,
              },
              {
                name: "Duarte P.",
                role: language === "pt" ? "Cliente Gold" : language === "en" ? "Gold Client" : "Client Gold",
                text: language === "pt"
                  ? "Incrível o rigor e a limpeza. Não tive de me preocupar com nada, apenas com os convidados."
                  : language === "en"
                  ? "Incredible rigor and cleanliness. I didn't have to worry about anything, just the guests."
                  : "Rigueur et propreté incroyables. Je n'ai eu à me soucier de rien, seulement des invités.",
                rating: 5,
              },
            ].map((rev, i) => (
              <div
                key={i}
                className="bg-white p-5 md:p-10 rounded-[1.5rem] md:rounded-[3.5rem] shadow-sm space-y-6 text-left border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div className="space-y-3">
                  <div className="flex gap-0.5 text-amber-500">
                    {[...Array(rev.rating)].map((_, j) => (
                      <ICONS.Star
                        key={j}
                        size={10}
                        className="fill-amber-500"
                      />
                    ))}
                  </div>
                  <p className="text-[11px] md:text-base font-medium text-slate-600 leading-relaxed italic">
                    "{tr(rev.text as any) as any}"
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border overflow-hidden shrink-0">
                    <img
                      src={`https://i.pravatar.cc/100?u=${rev.name}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-black text-[10px] uppercase tracking-tighter text-slate-950">
                      {tr(rev.name as any) as any}
                    </p>
                    <p className="text-[7px] font-black text-orange-500 uppercase tracking-widest">
                      {rev.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. GALLERY / INSPIRATION */}
      <PremiumInteractiveGallery />

      {/* AI RECOMMENDATION ENGINE */}
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-10 text-white relative overflow-hidden border border-white/5 shadow-2xl">
        <div className="absolute top-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header - Compact & Premium */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-full">
                <ICONS.Sparkles size={10} className="text-orange-400 animate-pulse" />
                <span className="text-[8px] md:text-[9px] font-black tracking-widest text-orange-300 uppercase">
                  {tr("CONCIERGE DE IA SMART")}
                </span>
              </div>
              <h2 className="text-xl md:text-3xl font-black tracking-tight uppercase leading-none">
                {tr("Menu Curado")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">{tr("Para Si.")}</span>
              </h2>
              <p className="text-slate-400 text-[11px] md:text-xs font-medium">
                {tr("Sincronização gastronómica instantânea. Altere as preferências abaixo para atualizar o seu menu.")}
              </p>
            </div>

            <button
              onClick={() => fetchAIRecommendations(userCuisines, userRestrictions)}
              disabled={isLoadingRecs}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-white self-start md:self-auto"
            >
              <ICONS.RefreshCw size={12} className={`${isLoadingRecs ? "animate-spin text-orange-400" : ""}`} />
              {tr("RECALCULAR")}
            </button>
          </div>

          {/* Unified Compact Preferences Bar */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
              {/* Cuisines Sub-section */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block text-left">
                  {tr("Cozinhas Favoritas")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "sushi", label: "Sushi 🍣" },
                    { id: "italiana", label: "Italiana 🍝" },
                    { id: "portuguesa", label: "Portuguesa 🇵🇹" },
                    { id: "mediterrânica", label: "Mediterrânica 🥗" },
                    { id: "mexicana", label: "Mexicana 🌮" },
                  ].map((cuisine) => {
                    const active = userCuisines.includes(cuisine.id);
                    return (
                      <button
                        key={cuisine.id}
                        onClick={() => handleTogglePreference("cuisine", cuisine.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                          active
                            ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                            : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5"
                        }`}
                      >
                        {tr(cuisine.label as any) as any}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-8 w-[1px] bg-white/10 hidden md:block self-center mx-1" />

              {/* Restrictions Sub-section */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block text-left">
                  {tr("Restrições")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "Glúten", label: "Sem Glúten 🌾" },
                    { id: "Lactose", label: "Sem Lactose 🥛" },
                    { id: "Vegetariano", label: "Vegetariano 🥦" },
                    { id: "Vegano", label: "Vegano 🌱" },
                  ].map((res) => {
                    const active = userRestrictions.includes(res.id);
                    return (
                      <button
                        key={res.id}
                        onClick={() => handleTogglePreference("dietary", res.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                          active
                            ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                            : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5"
                        }`}
                      >
                        {tr(res.label as any) as any}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {!currentUser && (
              <div className="text-right shrink-0">
                <span className="text-[8px] text-slate-500 italic block">
                  {tr("💡 Autentique-se para gravar de forma permanente.")}
                </span>
              </div>
            )}
          </div>

          {/* Recommendations Render */}
          {isLoadingRecs ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3 animate-pulse h-80 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-full h-24 bg-white/10 rounded-lg" />
                    <div className="h-3 bg-white/10 rounded w-2/3" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2.5 bg-white/10 rounded w-full" />
                    <div className="h-2.5 bg-white/10 rounded w-5/6" />
                  </div>
                  <div className="h-8 bg-white/10 rounded-full w-full" />
                </div>
              ))}
            </div>
          ) : recsError ? (
            <div className="text-center py-8 bg-white/5 border border-white/5 rounded-2xl space-y-3">
              <ICONS.AlertCircle size={30} className="text-orange-400 mx-auto animate-bounce" />
              <p className="text-xs font-medium text-slate-300">{recsError}</p>
              <button
                onClick={() => fetchAIRecommendations(userCuisines, userRestrictions)}
                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer text-white"
              >
                {tr("Tentar Novamente")}
              </button>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-8 bg-white/5 border border-white/5 rounded-2xl space-y-3">
              <ICONS.ChefHat size={30} className="text-slate-400 mx-auto animate-pulse" />
              <p className="text-xs font-medium text-slate-300">
                {tr("Não existem menus correspondentes ativos de momento.")}
              </p>
              <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                {tr("Selecione outras cozinhas para receber sugestões imediatas.")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendations.map((rec, idx) => (
                <motion.div
                  key={rec.menu?.id ? `${rec.menu.id}-${idx}` : `rec-${idx}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white/5 hover:bg-white/[0.08] border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-lg hover:shadow-orange-500/5"
                >
                  {/* Card Image Banner */}
                  <div className="relative h-28 overflow-hidden shrink-0">
                    <img
                      src={rec.menu.imageUrl || rec.menu.image_url || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600&auto=format&fit=crop"}
                      alt={rec.menu.nome}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                    
                    {/* Badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-orange-500 text-white text-[8px] font-black uppercase tracking-wider rounded-md shadow-md">
                      {rec.highlight || tr("Opção Premium")}
                    </div>

                    {/* Match Score */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 border border-white/10 backdrop-blur-sm text-amber-400 text-[8px] font-black rounded-md">
                      🔥 {rec.matchScore}{tr("% MATCH")}
                    </div>

                    {/* Chef Overlay */}
                    {rec.chef && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full border border-white/50 overflow-hidden bg-slate-800 shrink-0">
                          <img
                            src={rec.chef.avatar_url || "https://i.pravatar.cc/100"}
                            alt={rec.chef.nome}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="text-left">
                          <p className="text-[9px] font-extrabold text-white leading-tight truncate max-w-[120px]">
                            {rec.chef.nome}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1 text-left">
                      <div className="flex justify-between items-start gap-1.5">
                        <h3 className="font-extrabold text-xs text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                          {rec.menu.nome}
                        </h3>
                        <span className="text-[11px] font-black text-orange-400 shrink-0">
                          {rec.menu.preco}€<span className="text-[8px] font-normal text-slate-400">/pax</span>
                        </span>
                      </div>
                    </div>

                    {/* Compact Verdict */}
                    <div className="bg-white/[0.03] border-l-2 border-orange-500 rounded-r-lg p-2 text-left">
                      <p className="text-[9px] text-slate-300 italic leading-relaxed line-clamp-3">
                        "{rec.explanation}"
                      </p>
                    </div>

                    {/* Wine Pairing */}
                    {rec.winePairingSuggestion && (
                      <div className="flex items-center gap-1.5 text-left shrink-0">
                        <ICONS.Coffee size={10} className="text-amber-500 shrink-0" />
                        <p className="text-[8px] text-slate-400 leading-none truncate">
                          <span className="font-black text-amber-500 uppercase text-[7px] mr-1">{tr("VINHO:")}</span>
                          {rec.winePairingSuggestion}
                        </p>
                      </div>
                    )}

                    {/* Action Button - More compact */}
                    <button
                      onClick={() => onSelectChef(rec.menu.cookId || rec.menu.cook_id)}
                      className="w-full py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-md hover:shadow-orange-500/20 transition-all active:scale-95 cursor-pointer"
                    >
                      <span>{tr("Reservar Menu")}</span>
                      <ICONS.ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 8. STANDARD OF EXCELLENCE */}
      <section className="bg-slate-950 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-20 text-white relative overflow-hidden shadow-luxury">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px]" />
        <div className="relative z-10 space-y-12">
          <div className="space-y-4 text-center md:text-left">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto md:mx-0 text-white shadow-xl shadow-orange-500/20">
              <ICONS.ShieldCheck size={24} />
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter uppercase leading-none">
              {tr("O Padrão de")} <br />
              <span className="text-orange-500">{tr("Excelência.")}</span>
            </h2>
            <p className="text-slate-400 text-sm md:text-lg font-medium italic max-w-md mx-auto md:mx-0">
              {tr("Garantimos o rigor em cada detalhe operacional.")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-10">
            {[
              {
                title: "Elite",
                desc: "Apenas 10% aprovados.",
                icon: <ICONS.Award size={16} />,
              },
              {
                title: "Logística",
                desc: "Tudo incluído.",
                icon: <ICONS.Zap size={16} />,
              },
              {
                title: "HACCP",
                desc: "Rigor absoluto.",
                icon: <ICONS.ShieldCheck size={16} />,
              },
              {
                title: "Segurança",
                desc: "Proteção Total.",
                icon: <ICONS.CreditCard size={16} />,
              },
            ].map((item, i) => (
              <div
                key={i}
                className="space-y-2 p-4 md:p-8 bg-white/5 rounded-2xl md:rounded-[2.5rem] border border-white/5 hover:bg-white/10 transition-all text-center md:text-left"
              >
                <div className="text-orange-500 flex justify-center md:justify-start">
                  {item.icon}
                </div>
                <h4 className="font-black text-slate-950 md:text-sm uppercase tracking-tight">
                  {tr(item.title as any) as any}
                </h4>
                <p className="text-[7px] md:text-xs text-slate-500 font-medium leading-tight">
                  {tr(item.desc as any) as any}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SLIDE-OVER FILTER DRAWER */}
      <AnimatePresence>
        {isFilterDrawerOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] cursor-pointer"
            />

            {/* Drawer Content Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[10000] flex flex-col text-left overflow-hidden border-l border-slate-100"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
                    {t("advanced_filters")}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                    {language === "pt" ? tr("Personalize os seus resultados") : tr("Customize your results")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                >
                  <ICONS.X size={16} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                {/* 1. Price Range */}
                <div className="space-y-3.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-widest flex items-center gap-1.5 leading-none">
                    <ICONS.CreditCard size={13} className="text-orange-500" />
                    {t("price_range")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "all", label: t("all") },
                      { id: "under30", label: language === "pt" ? "Até 30€" : "Under 30€" },
                      { id: "30to60", label: "30€-60€" },
                      { id: "above60", label: "+ 60€" },
                    ].map((range) => {
                      const isSelected = selectedPriceRange === range.id;
                      return (
                        <button
                          key={range.id}
                          type="button"
                          onClick={() => setSelectedPriceRange(range.id)}
                          className={`py-3 px-4 rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-center transition-all cursor-pointer border ${
                            isSelected
                              ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-100"
                          }`}
                        >
                          {tr(range.label as any) as any}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                    {language === "pt" ? tr("Com base no preço médio por pessoa do menu do chef.") : tr("Based on average menu price per person.")}
                  </p>
                </div>

                {/* 2. Cuisine Type */}
                <div className="space-y-3.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-widest flex items-center gap-1.5 leading-none">
                    <ICONS.ChefHat size={13} className="text-orange-500" />
                    {t("cuisine")}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCuisine}
                      onChange={(e) => {
                        setSelectedCuisine(e.target.value);
                        setActiveCollectionId(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-3 font-extrabold text-[10px] uppercase outline-none text-slate-800 cursor-pointer shadow-xs appearance-none"
                    >
                      <option value="all">{t("select_cuisine")}</option>
                      {CUISINES.map((cuisine) => (
                        <option key={cuisine.id} value={cuisine.id}>
                          {tr(cuisine.label as any) as any}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500">
                      <ICONS.ChevronDown size={14} />
                    </div>
                  </div>
                </div>

                {/* 3. Average Rating */}
                <div className="space-y-3.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-widest flex items-center gap-1.5 leading-none">
                    <ICONS.Star size={13} className="text-orange-500" />
                    {language === "pt" ? tr("Classificação Média") : tr("Average Rating")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 0, label: language === "pt" ? "Qualquer classificação" : "Any rating" },
                      { value: 4.8, label: "Excelente (4.8+ ★)" },
                      { value: 4.5, label: "Muito Bom (4.5+ ★)" },
                      { value: 4.0, label: "Bom (4.0+ ★)" },
                    ].map((opt) => {
                      const isSelected = selectedRating === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSelectedRating(opt.value)}
                          className={`py-3 px-4 rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-center transition-all cursor-pointer border ${
                            isSelected
                              ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-100"
                          }`}
                        >
                          {tr(opt.label as any) as any}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Dietary Restrictions */}
                <div className="space-y-3.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-widest flex items-center gap-1.5 leading-none">
                    <ICONS.Leaf size={13} className="text-orange-500" />
                    {t("dietary")}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "vegan", label: "Vegan" },
                      { id: "vegetariano", label: language === "pt" ? "Vegetariano" : "Vegetarian" },
                      { id: "gluten", label: language === "pt" ? "Sem Glúten" : "Gluten-Free" },
                      { id: "lactose", label: language === "pt" ? "Sem Lactose" : "Lactose-Free" },
                      { id: "saudavel", label: language === "pt" ? "Saudável / Fit" : "Healthy / Fit" },
                    ].map((diet) => {
                      const isSelected = selectedDietary.includes(diet.id);
                      return (
                        <button
                          key={diet.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDietary((prev) =>
                                prev.filter((item) => item !== diet.id)
                              );
                            } else {
                              setSelectedDietary((prev) => [...prev, diet.id]);
                            }
                          }}
                          className={`px-3 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border ${
                            isSelected
                              ? "bg-orange-500 border-orange-500 text-white shadow-xs"
                              : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          {isSelected && <ICONS.CheckCircle size={10} />}
                          {tr(diet.label as any) as any}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Actions Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleResetFilters();
                    setIsFilterDrawerOpen(false);
                  }}
                  className="flex-1 py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-650 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer text-center"
                >
                  {language === "pt" ? tr("Limpar Filtros") : tr("Clear Filters")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer text-center shadow-lg shadow-orange-500/15"
                >
                  {language === "pt" ? `Ver ${filteredCooks.length} Chefs` : `Show ${filteredCooks.length} Chefs`}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <footer className="pt-2 pb-2 text-center space-y-2">
        <div className="flex items-center justify-center gap-1.5 opacity-20">
          <ICONS.ChefHat size={14} className="text-slate-900" />
          <span className="text-xs font-black tracking-tighter">{tr("Cookr")}</span>
        </div>
        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-300">
          {tr("© 2026 LUXURY GASTRONOMY HUB PORTUGAL")}
        </p>
      </footer>
    </div>
  );
};

export default React.memo(ChefSearch);
