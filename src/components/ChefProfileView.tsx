import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  User,
  MenuItem,
  Booking,
  BookingStatus,
  ChefRecipe,
  Review,
} from "../types";
import { ICONS, formatPrice, SUSTAINABILITY_BADGES_LIST, ALLERGEN_CERTIFICATIONS_LIST } from "../constants";
import { supabaseService } from "../services/supabaseService";
import { useLanguage } from "../contexts/LanguageContext";

import ChefAvailabilityCalendar from "./ChefAvailabilityCalendar";
import { DietaryBadges } from "./DietaryBadges";
import { GoogleAddressAutocomplete, AddressData } from "./GoogleAddressAutocomplete";
import { formatPostalCode } from "../utils/formatters";
import { toLocalDateStr } from "../lib/dateUtils";

import { tr, trLocale } from "../lib/tr";
export interface WineOption {
  id: string;
  nome: string;
  produtor: string;
  tipo: string;
  descricao: string;
  price: number;
}

export const WINE_PAIRING_OPTIONS: WineOption[] = [
  {
    id: "alvarinho_premium",
    nome: "Soalheiro Alvarinho Reserva",
    produtor: "Quinta de Soalheiro (Melgaço)",
    tipo: "Branco / Alvarinho Premium",
    descricao: "Vinho Verde Alvarinho premium com estágio em barricas de carvalho francês. Aromas intensos de frutas cítricas, mineralidade vibrante e corpo elegante.",
    price: 15,
  },
  {
    id: "douro_reserva",
    nome: "Quinta do Crasto Douro Reserva",
    produtor: "Quinta do Crasto (Douro)",
    tipo: "Tinto / Douro Reserva",
    descricao: "Vinho Tinto encorpado do Douro elaborado a partir de vinhas velhas. Notas de frutos silvestres pretos maduros, cacau e especiarias doces.",
    price: 22,
  },
  {
    id: "espumante_vintage",
    nome: "Murganheira Czar Grand Vintage Bruto",
    produtor: "Caves da Murganheira (Távora-Varosa)",
    tipo: "Espumante Vintage",
    descricao: "Espumante de método clássico superlativo. Bolha extremamente fina, notas de brioche amanteigado, frutos secos e uma frescura crocante.",
    price: 18,
  }
];

export const getSuggestedWine = (menuCuisine: string = "", tags: string[] = []): WineOption => {
  const cuisineLower = (menuCuisine || "").toLowerCase();
  const tagsLower = (tags || []).map(t => t.toLowerCase());
  
  if (
    cuisineLower.includes("sushi") || 
    cuisineLower.includes("japonesa") || 
    cuisineLower.includes("peixe") || 
    cuisineLower.includes("marisco") || 
    cuisineLower.includes("asiática") ||
    cuisineLower.includes("vegetar") ||
    cuisineLower.includes("vegan") ||
    tagsLower.includes("peixe") ||
    tagsLower.includes("marisco") ||
    tagsLower.includes("vegetariano") ||
    tagsLower.includes("vegano")
  ) {
    return WINE_PAIRING_OPTIONS[0]; // Alvarinho Premium
  }
  
  if (
    cuisineLower.includes("carne") || 
    cuisineLower.includes("tinto") || 
    cuisineLower.includes("italiana") || 
    cuisineLower.includes("portuguesa") ||
    tagsLower.includes("carne") ||
    tagsLower.includes("massa")
  ) {
    return WINE_PAIRING_OPTIONS[1]; // Douro Reserva
  }
  
  return WINE_PAIRING_OPTIONS[2]; // Espumante Vintage
};

interface ChefProfileViewProps {
  cook: User;
  user: User;
  menus: MenuItem[];
  currentUser: User | null;
  onBack: () => void;
  onBook: (data: any) => Promise<void>;
  onOpenChat: (partnerId: string) => void;
  onNavigate: (view: string, tab?: string) => void;
  onRefresh?: () => void;
  onNotify?: (
    message: string,
    type?: "error" | "success" | "info" | "new_order",
  ) => void;
  initialDate?: string | null;
  initialTime?: string | null;
  initialStep?:
    | "summary"
    | "confirm"
    | "logistics"
    | "desires"
    | "checkout"
    | "success"
    | null;
  recipes?: ChefRecipe[];
  reviews?: Review[];
  bookings?: Booking[];
  allUsers?: User[];
  isLoading?: boolean;
}

const MenuCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-slate-100 p-2.5 space-y-2.5 animate-pulse shadow-sm">
    <div className="aspect-video rounded-lg bg-slate-200" />
    <div className="space-y-1.5 p-1 text-left">
      <div className="h-4 w-3/4 bg-slate-200 rounded" />
      <div className="h-3 w-1/2 bg-slate-200/80 rounded" />
    </div>
  </div>
);

const RecipeCardSkeleton = () => (
  <div className="rounded-lg overflow-hidden bg-slate-50 border border-slate-100 p-1.5 space-y-1.5 animate-pulse">
    <div className="aspect-square rounded bg-slate-200" />
    <div className="space-y-1 p-0.5 text-left">
      <div className="h-3 w-3/4 bg-slate-200 rounded" />
      <div className="h-2 w-1/2 bg-slate-200/80 rounded" />
    </div>
  </div>
);

interface PublicMenuCardProps {
  menu: MenuItem;
  selectedMenuId: string | undefined;
  chefId: string;
  currentUserId: string | undefined;
  onSelectMenu: (menu: MenuItem) => void;
  onDeleteItem: (info: { id: string; name: string; type: string }) => void;
}

const PublicMenuCard: React.FC<PublicMenuCardProps> = React.memo(({
  menu,
  selectedMenuId,
  chefId,
  currentUserId,
  onSelectMenu,
  onDeleteItem,
}) => {
  useLanguage();
  return (
    <div
      onClick={() => onSelectMenu(menu)}
      className={`group cursor-pointer bg-white rounded-xl border transition-all p-2.5 space-y-2.5 ${selectedMenuId === menu.id ? "border-orange-500 shadow-md scale-[1.01]" : "border-slate-100 hover:border-orange-200 shadow-sm"}`}
    >
      <div className="aspect-video rounded-lg overflow-hidden relative">
        {menu.imageUrl ? (
          <img
            src={menu.imageUrl}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
            referrerPolicy="no-referrer"
            loading="lazy"
            alt={menu.nome}
          />
        ) : (
          <div className="w-full h-full bg-slate-50 flex items-center justify-center">
            {menu.is_meal_prep || menu.type === "daily" ? (
              <ICONS.Calendar size={15} className="text-slate-300 shrink-0" />
            ) : menu.type === "dish" ? (
              <ICONS.Utensils size={15} className="text-slate-300 shrink-0" />
            ) : (
              <ICONS.Sparkles size={15} className="text-slate-300 shrink-0" />
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {currentUserId === chefId && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const typeLabel = menu.is_meal_prep
                ? "Daily"
                : menu.type === "dish"
                  ? "Prato"
                  : "Ritual";
              onDeleteItem({
                id: menu.id,
                name: menu.nome,
                type: typeLabel,
              });
            }}
            className="absolute top-2 left-2 w-6 h-6 bg-slate-900/85 backdrop-blur-md rounded text-white hover:text-red-550 hover:bg-white transition-all flex items-center justify-center shadow-md z-20"
          >
            <ICONS.XCircle size={11} />
          </button>
        )}

        <div className="absolute top-2 right-2 px-2 py-0.5 bg-white/95 backdrop-blur-md rounded-md text-[8px] font-bold text-slate-950 shadow-sm border border-slate-100">
          {formatPrice(menu.preco)}
        </div>
        {menu.is_meal_prep && (
          <div
            className={`absolute ${currentUserId === chefId ? "top-10" : "top-2"} left-2 px-1.5 py-0.5 bg-orange-500 text-white rounded-md text-[6.5px] font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-1`}
          >
            <ICONS.Calendar size={6} className="text-white shrink-0" />
            {tr("Pack")} {menu.pack_size}
          </div>
        )}
      </div>
      
      <div className="space-y-1 text-left px-0.5">
        <div className="flex justify-between items-start gap-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight group-hover:text-orange-500 transition-colors leading-tight">
            {menu.nome}
          </h4>
          {menu.calories && (
            <span className="shrink-0 px-1 py-0.5 bg-slate-50 text-slate-500 text-[6.5px] font-bold uppercase rounded border border-slate-100">
              {menu.calories} kcal
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 font-medium line-clamp-2 leading-relaxed">
          {menu.descricao}
        </p>
        <div className="pt-1">
          <DietaryBadges tags={menu.dietary_tags} compact={true} />
        </div>
      </div>
    </div>
  );
});

const ChefProfileView: React.FC<ChefProfileViewProps> = ({
  cook: chef,
  menus,
  currentUser,
  onBack,
  onBook,
  onOpenChat,
  onNavigate,
  onRefresh,
  onNotify,
  initialDate,
  initialTime,
  initialStep,
  reviews = [],
  bookings = [],
  recipes = [],
  isLoading = false,
}) => {
  const { t, language } = useLanguage();
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [addWinePairing, setAddWinePairing] = useState<boolean>(false);
  const [selectedWineId, setSelectedWineId] = useState<string>("espumante_vintage");

  const translatedWineOptions = useMemo(() => {
    return WINE_PAIRING_OPTIONS.map(wine => {
      if (wine.id === "alvarinho_premium") {
        return {
          ...wine,
          nome: t("wine_alvarinho_name"),
          tipo: t("wine_alvarinho_type"),
          descricao: t("wine_alvarinho_desc")
        };
      }
      if (wine.id === "douro_reserva") {
        return {
          ...wine,
          nome: t("wine_douro_name"),
          tipo: t("wine_douro_type"),
          descricao: t("wine_douro_desc")
        };
      }
      if (wine.id === "espumante_vintage") {
        return {
          ...wine,
          nome: t("wine_espumante_name"),
          tipo: t("wine_espumante_type"),
          descricao: t("wine_espumante_desc")
        };
      }
      return wine;
    });
  }, [t]);

  const suggestedWine = useMemo(() => {
    if (!selectedMenu) return translatedWineOptions[2];
    const baseSuggested = getSuggestedWine(selectedMenu.cuisine_type || "", selectedMenu.tags || []);
    return translatedWineOptions.find(w => w.id === baseSuggested.id) || translatedWineOptions[2];
  }, [selectedMenu, translatedWineOptions]);

  // Synchronize selectedWineId with suggestedWine when selectedMenu changes
  useEffect(() => {
    if (suggestedWine) {
      setSelectedWineId(suggestedWine.id);
    }
  }, [suggestedWine]);
  const handleSelectMenu = useCallback((menu: MenuItem) => {
    setSelectedMenu(menu);
    setBookingStep("summary");
  }, []);

  const handleRequestDeleteItem = useCallback((info: { id: string; name: string; type: string }) => {
    setItemToDelete(info);
  }, []);

  const [bookingStep, setBookingStep] = useState<
    | "summary"
    | "confirm"
    | "logistics"
    | "desires"
    | "checkout"
    | "success"
    | null
  >(initialStep || null);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || "");
  // Horários ocupados por QUALQUER cliente (o cliente só vê as suas reservas por RLS).
  const [remoteBusy, setRemoteBusy] = useState<{ data: string; hora: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (chef?.id) {
      supabaseService.getChefBusySlots(chef.id).then((rows) => {
        if (!cancelled) setRemoteBusy(rows);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [chef?.id]);
  const [selectedTime, setSelectedTime] = useState<string>(initialTime || "");
  const [numPessoas, setNumPessoas] = useState<number>(2);
  const [kitchenNotes, setKitchenNotes] = useState<string>("");
  const [guests, setGuests] = useState<{ name: string; allergies: string[]; customAllergy?: string }[]>([]);

  useEffect(() => {
    setGuests(prev => {
      const arr = [...prev];
      if (arr.length < numPessoas) {
        for (let i = arr.length; i < numPessoas; i++) {
          arr.push({ name: `Convidado ${i + 1}`, allergies: [], customAllergy: "" });
        }
      } else if (arr.length > numPessoas) {
        arr.splice(numPessoas);
      }
      return arr;
    });
  }, [numPessoas]);

  const [splitEnabled, setSplitEnabled] = useState<boolean>(false);
  const [splitEmails, setSplitEmails] = useState<string[]>([]);

  useEffect(() => {
    if (splitEnabled) {
      setSplitEmails(prev => {
        const targetLen = Math.max(0, numPessoas - 1);
        const arr = [...prev];
        if (arr.length < targetLen) {
          for (let i = arr.length; i < targetLen; i++) {
            arr.push("");
          }
        } else if (arr.length > targetLen) {
          arr.splice(targetLen);
        }
        return arr;
      });
    } else {
      setSplitEmails([]);
    }
  }, [numPessoas, splitEnabled]);

  const [giftCode, setGiftCode] = useState("");
  const [appliedGiftCard, setAppliedGiftCard] = useState<any | null>(null);

  const handleApplyGiftCard = async () => {
    if (!giftCode.trim()) return;
    try {
      const card = await supabaseService.redeemGiftCard(giftCode);
      setAppliedGiftCard(card);
      onNotify?.(tr("Vale de oferta aplicado com sucesso!"), "success");
    } catch (e: any) {
      onNotify?.(e.message || "Erro ao aplicar vale de oferta.", "error");
    }
  };

  const [customMorada, setCustomMorada] = useState<string>("");
  const [customRua, setCustomRua] = useState<string>("");
  const [customNumero, setCustomNumero] = useState<string>("");
  const [customCodPostal, setCustomCodPostal] = useState<string>("");
  const [customLocalidade, setCustomLocalidade] = useState<string>("");

  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistDate, setWaitlistDate] = useState("");
  const [morada, setMorada] = useState(() => {
    if (currentUser) {
      if (currentUser.morada) {
        return currentUser.localizacao
          ? `${currentUser.morada}, ${currentUser.localizacao}`
          : currentUser.morada;
      }
      const defaultAddress =
        currentUser.addresses?.find((a) => a.isDefault) ||
        currentUser.addresses?.[0];
      if (defaultAddress)
        return `${defaultAddress.address}, ${defaultAddress.city}`;
      return currentUser.localizacao || "";
    }
    return "";
  });

  useEffect(() => {
    if (morada === "custom") {
      const parts = [
        customRua.trim(),
        customNumero.trim() ? `nº ${customNumero.trim()}` : "",
        customCodPostal.trim(),
        customLocalidade.trim()
      ].filter(Boolean);
      setCustomMorada(parts.join(", "));
    }
  }, [customRua, customNumero, customCodPostal, customLocalidade, morada]);
  const [isBooking, setIsBooking] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWaitlisting, setIsWaitlisting] = useState(false);
  const [activeTab, setActiveTab] = useState<"experience" | "dish" | "daily">(
    "experience",
  );
  const [reviewsSortBy, setReviewsSortBy] = useState<string>("date_desc");
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [tipPercentage, setTipPercentage] = useState<number | "custom">(0);
  const [customTipValue, setCustomTipValue] = useState<string>("");

  const [reportedReviewIds, setReportedReviewIds] = useState<string[]>([]);

  const handleReportReview = async (reviewId: string) => {
    const reason = window.prompt("Motivo para denunciar esta avaliação (ex: linguagem inapropriada, spam, ofensa):");
    if (reason === null) return; // User cancelled
    
    try {
      await supabaseService.flagReview(reviewId, reason || "Denúncia de utilizador");
      setReportedReviewIds(prev => [...prev, reviewId]);
      if (onNotify) {
        onNotify(tr("Avaliação reportada com sucesso. Um administrador irá analisá-la em breve."), "success");
      } else {
        alert(tr("Avaliação reportada com sucesso. Um administrador irá analisá-la em breve."));
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Erro ao reportar avaliação:", err);
      alert(tr("Erro ao reportar avaliação. Tente novamente."));
    }
  };

  const filteredMenus = useMemo(() => {
    if (activeTab === "daily") return menus.filter((m) => m.is_meal_prep);
    return menus.filter((m) => m.type === activeTab && !m.is_meal_prep);
  }, [menus, activeTab]);

  const sortedReviews = useMemo(() => {
    if (!reviews) return [];
    return [...reviews].sort((a, b) => {
      if (reviewsSortBy === "date_desc") {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      }
      if (reviewsSortBy === "date_asc") {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateA - dateB;
      }
      if (reviewsSortBy === "rating_desc") {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (reviewsSortBy === "rating_asc") {
        return (a.rating || 0) - (b.rating || 0);
      }
      return 0;
    });
  }, [reviews, reviewsSortBy]);

  const completedBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter(
      (b) => b.cookId === chef.id && b.status === BookingStatus.COMPLETED
    );
  }, [bookings, chef.id]);

  const isVerified = useMemo(() => {
    const chefRating = chef.rating !== undefined ? chef.rating : 5.0;
    const completedCount = completedBookings.length || chef.total_reservas || 0;
    return chefRating > 4.5 && completedCount >= 3;
  }, [chef.rating, chef.total_reservas, completedBookings]);

  useEffect(() => {
    if (currentUser && !morada) {
      if (currentUser.morada) {
        setMorada(
          currentUser.localizacao
            ? `${currentUser.morada}, ${currentUser.localizacao}`
            : currentUser.morada,
        );
      } else {
        const defaultAddress =
          currentUser.addresses?.find((a) => a.isDefault) ||
          currentUser.addresses?.[0];
        if (defaultAddress) {
          setMorada(`${defaultAddress.address}, ${defaultAddress.city}`);
        } else if (currentUser.localizacao) {
          setMorada(currentUser.localizacao);
        }
      }
    }
  }, [currentUser, morada]);

  const clientUpcomingBookings = useMemo(() => {
    if (!currentUser || !bookings) return [];
    return bookings
      .filter(
        (b) =>
          b.clientId === currentUser.id &&
          (b.status === BookingStatus.PENDING ||
            b.status === BookingStatus.ACCEPTED ||
            b.status === BookingStatus.IN_PROGRESS),
      )
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [currentUser, bookings]);

  useEffect(() => {
    const checkFav = async () => {
      if (currentUser) {
        const favs = await supabaseService.getFavorites(currentUser.id);
        setIsFavorite(favs.includes(chef.id));
      }
    };
    checkFav();
  }, [currentUser, chef.id]);

  const handleToggleFavorite = async () => {
    if (!currentUser) return;
    const result = await supabaseService.toggleFavorite(
      currentUser.id,
      chef.id,
    );
    setIsFavorite(result);
    if (result) {
      onNotify?.(tr("Chef adicionado aos favoritos!"), "success");
      onNavigate("profile", "favorites");
    }
  };

  const availableDates = useMemo(() => {
    let dispo = chef.disponibilidade || {};
    if (typeof dispo === "string") {
      try {
        dispo = JSON.parse(dispo);
      } catch (e) {
        dispo = {};
      }
    }

    const now = new Date();
    const todayStr = toLocalDateStr(now);

    const dates = new Set(
      Object.keys(dispo).filter((date) => {
        const times = dispo[date] || [];
        return times.length > 0 && date >= todayStr;
      }),
    );

    // Se o chef está online, hoje está sempre disponível
    if (chef.isAvailable) {
      dates.add(todayStr);
    }

    return Array.from(dates).sort();
  }, [chef?.disponibilidade, chef?.isAvailable]);

  const availableTimes = useMemo(() => {
    if (!chef || !selectedDate) return [];

    let dispo = chef.disponibilidade || {};
    if (typeof dispo === "string") {
      try {
        dispo = JSON.parse(dispo);
      } catch (e) {
        dispo = {};
      }
    }

    const now = new Date();
    const todayStr = toLocalDateStr(now);
    const isToday = selectedDate === todayStr;

    const scheduledToday = dispo[todayStr] || [];
    let times = [...(dispo[selectedDate] || [])];

    // Se for hoje:
    if (isToday) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const minLeadTimeMinutes = currentHour * 60 + currentMinute + 30; // 30 min lead time

      if (chef.isAvailable) {
        // Se o chef está ONLINE:
        // Caso A: Se não tinha slots configurados para hoje, geramos disponibilidade imediata dinâmica
        // Caso B: Se tinha slots configurados, permitimos os slots configurados + disponibilidade imediata
        const dynamicSlots = [];
        for (let h = 8; h <= 23; h++) {
          for (let m of ["00", "30"]) {
            if (h === 23 && m === "30") break;
            const slotTimeInMinutes = h * 60 + Number(m);
            if (slotTimeInMinutes >= minLeadTimeMinutes) {
              dynamicSlots.push(`${h.toString().padStart(2, "0")}:${m}`);
            }
          }
        }

        if (scheduledToday.length === 0) {
          // Disponibilidade imediata pura sem agenda prévia
          times = dynamicSlots;
        } else {
          // Merge não destrutivo: horários programados futuros + slots dinâmicos válidos
          const validScheduled = scheduledToday.filter(s => {
            const [sh, sm] = s.split(":").map(Number);
            return (sh * 60 + sm) >= minLeadTimeMinutes;
          });
          times = Array.from(new Set([...validScheduled, ...dynamicSlots])).sort();
        }
      } else {
        // Se o chef está OFFLINE: apenas os slots explicitamente programados na agenda que ainda são futuros
        times = scheduledToday.filter(s => {
          const [sh, sm] = s.split(":").map(Number);
          return (sh * 60 + sm) >= minLeadTimeMinutes;
        });
      }
    }

    // Filtrar conflitos com reservas ativas existentes
    const busySlots = new Set<string>();
    const inactive = ["cancelled", "cancelled_partial_refund", "rejected", "expired", "cancelada", "rejeitada"];
    const ownBusy = (bookings || [])
      .filter(b => {
        const isChefBooking = b.cookId === chef.id || (b as any).chef_id === chef.id;
        return isChefBooking && !inactive.includes(String(b.status)) && b.data && b.hora;
      })
      .map(b => ({ data: b.data as string, hora: b.hora as string }));

    [...ownBusy, ...remoteBusy].forEach(b => {
      if (b.data === selectedDate && b.hora) {
        busySlots.add(b.hora);
        // Bloquear janela de serviço de 90 minutos para evitar sobreposição
        const [bh, bm] = b.hora.split(":").map(Number);
        if (!isNaN(bh) && !isNaN(bm)) {
          const bTotal = bh * 60 + bm;
          for (let offset = 30; offset <= 90; offset += 30) {
            const oMins = bTotal + offset;
            const oh = Math.floor(oMins / 60);
            const om = oMins % 60;
            if (oh <= 23) {
              busySlots.add(`${oh.toString().padStart(2, "0")}:${om.toString().padStart(2, "0")}`);
            }
          }
        }
      }
    });

    times = times.filter(t => !busySlots.has(t)).sort();

    return times;
  }, [selectedDate, chef?.disponibilidade, chef?.isAvailable, bookings, remoteBusy]);

  // Efeito para validar e pre-encher data/hora
  useEffect(() => {
    let dispo = chef.disponibilidade;
    if (typeof dispo === "string") {
      try {
        dispo = JSON.parse(dispo);
      } catch (e) {
        dispo = {};
      }
    }

    if (initialDate && availableDates.includes(initialDate)) {
      setSelectedDate(initialDate);
      // Se houver uma hora inicial e for válida para essa data
      if (initialTime && dispo?.[initialDate]?.includes(initialTime)) {
        setSelectedTime(initialTime);
      } else if (dispo?.[initialDate]?.length === 1) {
        // Se houver apenas uma hora disponível, seleciona-a automaticamente
        setSelectedTime(dispo[initialDate][0]);
      }
    } else if (selectedDate && !availableDates.includes(selectedDate)) {
      // Se a data selecionada deixar de estar disponível (ex: realtime), limpar seleção
      setSelectedDate("");
      setSelectedTime("");
    }
  }, [
    initialDate,
    initialTime,
    availableDates,
    chef.disponibilidade,
    selectedDate,
  ]);

  if (!chef) return null;

  const handleBooking = async () => {
    if (!currentUser) {
      onNotify?.(tr("Por favor, faça login para reservar."), "error");
      return;
    }
    if (!selectedMenu || !selectedDate || !selectedTime || !morada) {
      onNotify?.(tr("Por favor, preencha todos os campos."), "error");
      return;
    }

    setIsBooking(true);
    try {
      const isVipGold = (currentUser?.loyalty_points || 0) >= 500;
      const feeRate = isVipGold ? 0.05 : 0.1;
      
      const activeWine = translatedWineOptions.find(w => w.id === selectedWineId) || translatedWineOptions[2];
      const winePricePerPerson = addWinePairing ? activeWine.price : 0;
      const totalMenuAndWine = (selectedMenu.preco + winePricePerPerson) * numPessoas;
      
      const totalWithFee = totalMenuAndWine * (1 + feeRate);
      
      const calculatedTip = tipPercentage === "custom"
        ? (parseFloat(customTipValue) || 0)
        : (totalMenuAndWine * (tipPercentage / 100));
      
      const discount = appliedGiftCard ? appliedGiftCard.value : 0;
      const finalTotal = Math.max(0, totalWithFee + calculatedTip - discount);

      let finalKitchenNotes = kitchenNotes;
      if (calculatedTip > 0) {
        const tipText = `[Gorjeta ao Chef: ${calculatedTip.toFixed(2)}€]`;
        finalKitchenNotes = finalKitchenNotes ? `${finalKitchenNotes}\n${tipText}` : tipText;
      }
      if (addWinePairing) {
        const wineText = `[Harmonização de Vinhos Selecionada: ${activeWine.nome} (${activeWine.tipo}) - +${activeWine.price}€/pax]`;
        finalKitchenNotes = finalKitchenNotes ? `${finalKitchenNotes}\n${wineText}` : wineText;
      }
      if (appliedGiftCard) {
        const giftText = `[Vale de Oferta Aplicado: ${appliedGiftCard.experienceName} (-${appliedGiftCard.value}€)]`;
        finalKitchenNotes = finalKitchenNotes ? `${finalKitchenNotes}\n${giftText}` : giftText;
      }

      const allergyCounts: Record<string, number> = {};
      guests.forEach(g => {
        g.allergies?.forEach(a => {
          const allergyName = a === "Outro" ? (g.customAllergy?.trim() || "Outro") : a;
          allergyCounts[allergyName] = (allergyCounts[allergyName] || 0) + 1;
        });
      });
      const allergyParts = Object.entries(allergyCounts).map(([allergy, count]) => `${count} ${allergy}`);
      const guestsSummaryText = `${guests.length} convidados` + (allergyParts.length > 0 ? `: ${allergyParts.join(", ")}` : " sem restrições alimentares");

      const validEmails = splitEmails.filter(e => e && e.trim().length > 0);
      const splitBillData = splitEnabled && validEmails.length > 0 ? {
        emails: validEmails,
        paidEmails: [currentUser.email || ""],
        status: 'pending' as const,
        shareAmount: parseFloat((finalTotal / (validEmails.length + 1)).toFixed(2))
      } : null;

      const bookingData = {
        clientId: currentUser.id,
        clientName: currentUser.nome,
        cookId: chef.id,
        cookName: chef.nome,
        data: selectedDate,
        hora: selectedTime,
        numPessoas: numPessoas,
        kitchenNotes: finalKitchenNotes,
        status: BookingStatus.PENDING,
        valorTotal: finalTotal,
        gorjeta: calculatedTip,
        menu_selected: selectedMenu.nome,
        morada: morada === "custom" ? customMorada : morada,
        is_meal_prep: selectedMenu.is_meal_prep,
        menu_type: selectedMenu.type || "experience",
        wine_pairing: addWinePairing ? {
          nome: activeWine.nome,
          preco_por_pessoa: activeWine.price,
          produtor: activeWine.produtor
        } : null,
        guests: guests,
        guestsSummary: guestsSummaryText,
        splitBill: splitBillData,
      };

      await onBook(bookingData);
      setBookingStep("success");
    } catch (e: any) {
      onNotify?.(
        tr("Erro ao reservar: {v0}", { v0: e.message || "Erro desconhecido" }),
        "error",
      );
    } finally {
      setIsBooking(false);
    }
  };

  const handleWaitlist = async () => {
    if (!currentUser) {
      onNotify?.(
        tr("Por favor, faça login para entrar na lista de espera."),
        "error",
      );
      return;
    }
    if (!waitlistDate) {
      onNotify?.(tr("Por favor, selecione uma data."), "error");
      return;
    }

    setIsWaitlisting(true);
    try {
      await supabaseService.joinWaitlist({
        cook_id: chef.id,
        client_id: currentUser.id,
        preferred_date: waitlistDate,
      });
      onNotify?.(
        "Adicionado à lista de espera! Notificaremos se houver desistências para o dia " +
          waitlistDate,
        "success",
      );
      setShowWaitlistModal(false);
      setWaitlistDate("");
    } catch (e: any) {
      onNotify?.(
        tr("Erro ao entrar na lista de espera: {v0}", { v0: e.message || "Erro desconhecido" }),
        "error",
      );
    } finally {
      setIsWaitlisting(false);
    }
  };

  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);

  const handleDeleteItem = async (id: string) => {
    console.log("[ChefProfileView] Requesting delete for item:", id);
    try {
      console.log("[ChefProfileView] Calling supabaseService.deleteMenu...");
      await supabaseService.deleteMenu(id);
      console.log("[ChefProfileView] Delete successful, refreshing...");
      if (onRefresh) onRefresh();
      setItemToDelete(null);
      alert(tr("Item eliminado com sucesso."));
    } catch (err: any) {
      console.error("[ChefProfileView] Erro ao eliminar item:", err);
      alert(tr("Erro ao eliminar item: {v0}", { v0: err.message || "Erro desconhecido" }));
    }
  };

  return (
    <div className="min-h-dvh bg-white pb-32 animate-in fade-in duration-1000">
      {/* 1. Summary Modal (Image 1) */}
      {bookingStep === "summary" && selectedMenu && (
        <div className="fixed inset-0 z-[150] overflow-y-auto flex items-start sm:items-center justify-center p-4 md:p-10 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white rounded-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 relative my-auto border border-slate-100">
            <button
              onClick={() => setBookingStep(null)}
              className="absolute top-4 right-4 w-8 h-8 bg-black/45 hover:bg-black/65 backdrop-blur-md rounded-full flex items-center justify-center text-white/90 hover:text-white transition-all duration-200 border border-white/15 z-20 shadow-sm"
            >
              <ICONS.X size={14} />
            </button>

            {/* Left: Image */}
            <div className="md:w-1/2 h-56 md:h-auto relative">
              {selectedMenu.imageUrl ? (
                <img
                  src={selectedMenu.imageUrl}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  alt={selectedMenu.nome}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                  <ICONS.Utensils size={32} className="text-slate-200" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
            </div>

            {/* Right: Info */}
            <div className="md:w-1/2 p-6 md:p-10 flex flex-col justify-center space-y-5 md:space-y-6 text-left">
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-50 text-orange-500 border border-orange-100 rounded-md w-fit">
                  <ICONS.ChefHat size={10} />
                  <span className="text-[8px] font-bold uppercase tracking-wider">
                    {selectedMenu.is_meal_prep || selectedMenu.type === "daily"
                      ? tr("Pack Daily")
                      : selectedMenu.type === "dish"
                      ? tr("Prato Gastronómico")
                      : tr("Ritual Gastronómico")}
                  </span>
                </div>
                <h2 className="text-xl md:text-3xl font-extrabold text-slate-900 tracking-tight uppercase leading-tight">
                  {selectedMenu.nome}
                </h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg md:text-xl font-extrabold text-orange-500">
                    {formatPrice(selectedMenu.preco)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    {tr("/ Pessoa")}
                  </span>
                </div>
              </div>

              {/* Características do Menu */}
              <div className="space-y-3 bg-slate-50/50 border border-slate-100/60 rounded-2xl p-4 md:p-5">
                {selectedMenu.descricao && (
                  <p className="text-xs text-slate-600 font-medium leading-relaxed italic border-l-2 border-orange-500/30 pl-3 text-left">
                    "{selectedMenu.descricao}"
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1.5 justify-start text-left">
                  {selectedMenu.cuisine_type && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white text-slate-700 border border-slate-200/50 rounded-lg text-[9px] font-bold shadow-2xs">
                      <span className="text-slate-400 font-black uppercase tracking-wider text-[8px]">{tr("Cozinha:")}</span>
                      <span className="text-slate-900 uppercase font-black">{selectedMenu.cuisine_type}</span>
                    </div>
                  )}

                  {selectedMenu.calories && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white text-slate-700 border border-slate-200/50 rounded-lg text-[9px] font-bold shadow-2xs">
                      <span className="text-slate-400 font-black uppercase tracking-wider text-[8px]">{tr("Energia:")}</span>
                      <span className="text-slate-900 uppercase font-black">{selectedMenu.calories} kcal</span>
                    </div>
                  )}

                  {selectedMenu.pack_size && selectedMenu.pack_size > 1 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white text-slate-700 border border-slate-200/50 rounded-lg text-[9px] font-bold shadow-2xs">
                      <span className="text-slate-400 font-black uppercase tracking-wider text-[8px]">{tr("Pack:")}</span>
                      <span className="text-slate-900 uppercase font-black">{selectedMenu.pack_size} {tr("Refeições")}</span>
                    </div>
                  )}

                  {selectedMenu.delivery_type && (selectedMenu.is_meal_prep || selectedMenu.type === "daily") && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white text-slate-700 border border-slate-200/50 rounded-lg text-[9px] font-bold shadow-2xs">
                      <span className="text-slate-400 font-black uppercase tracking-wider text-[8px]">{tr("Formato:")}</span>
                      <span className="text-slate-900 uppercase font-black">
                        {selectedMenu.delivery_type === "both"
                          ? tr("Domicílio ou Takeaway")
                          : selectedMenu.delivery_type === "pickup"
                          ? tr("Takeaway")
                          : tr("Domicílio")}
                      </span>
                    </div>
                  )}

                  {selectedMenu.dietary_tags && selectedMenu.dietary_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedMenu.dietary_tags.map((tag, tIdx) => (
                        <div key={tIdx} className="px-2.5 py-1 bg-orange-500/10 text-orange-600 border border-orange-500/15 rounded-lg text-[9px] font-black uppercase tracking-wider">
                          {tag}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedMenu.dynamic_pricing?.enabled && (
                    <div className="w-full flex flex-wrap gap-1.5 mt-1 border-t border-slate-200/30 pt-2">
                      {selectedMenu.dynamic_pricing.weekend_surcharge ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/5 text-amber-600 border border-amber-500/15 rounded-lg text-[9px] font-bold">
                          <span className="text-amber-500 font-black uppercase text-[8px] tracking-wider">{tr("Fim de Semana:")}</span>
                          <span className="font-extrabold">+{selectedMenu.dynamic_pricing.weekend_surcharge}%</span>
                        </div>
                      ) : null}
                      {selectedMenu.dynamic_pricing.group_discount ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/5 text-emerald-600 border border-emerald-500/15 rounded-lg text-[9px] font-bold">
                          <span className="text-emerald-500 font-black uppercase text-[8px] tracking-wider">{tr("Desconto Grupo:")}</span>
                          <span className="font-extrabold">-{selectedMenu.dynamic_pricing.group_discount}%</span>
                          <span className="text-slate-400 text-[8px] font-normal tracking-wide">{tr("(mín.")} {selectedMenu.dynamic_pricing.min_group_size || 5} {tr("pax)")}</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3.5 bg-slate-950 rounded-full" />
                  <h4 className="text-[9px] font-bold text-slate-950 uppercase tracking-wider">
                    {tr("A Sequência Gastronómica")}
                  </h4>
                </div>

                <div className="space-y-3 md:space-y-4 ml-1 border-l border-slate-100 pl-5">
                  {selectedMenu.courses && selectedMenu.courses.length > 0 ? (
                    selectedMenu.courses.map((course, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[24px] top-1 w-1.5 h-1.5 rounded-full bg-white border border-orange-500" />
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          {course.tipo}
                        </p>
                        <p className="text-xs font-semibold text-slate-800 uppercase tracking-tight">
                          {course.conteudo}
                        </p>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="relative">
                        <div className="absolute -left-[24px] top-1 w-1.5 h-1.5 rounded-full bg-white border border-orange-500" />
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          {tr("Entrada")}
                        </p>
                        <p className="text-xs font-semibold text-slate-800 uppercase tracking-tight">
                          {tr("Criação do Chef para despertar os sentidos")}
                        </p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[24px] top-1 w-1.5 h-1.5 rounded-full bg-white border border-orange-500" />
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          {tr("Prato Principal")}
                        </p>
                        <p className="text-xs font-semibold text-slate-800 uppercase tracking-tight">
                          {selectedMenu.nome}
                        </p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[24px] top-1 w-1.5 h-1.5 rounded-full bg-white border border-orange-500" />
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          {tr("Sobremesa")}
                        </p>
                        <p className="text-xs font-semibold text-slate-800 uppercase tracking-tight">
                          {tr("Finalização doce e memorável")}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Sommelier & Wine Pairing Section */}
              {(chef.diferenciais?.includes("vinho") || chef.offers_wine_pairing) && (
                <div className="bg-orange-50/20 border border-orange-100 rounded-xl p-3 space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <ICONS.Wine size={12} className="text-orange-500 animate-pulse" />
                        <h4 className="text-[9px] font-bold uppercase text-slate-900 tracking-wider">
                          {t("wine_service_title")}
                        </h4>
                      </div>
                      <p className="text-[8px] text-slate-500 font-medium">
                        {t("wine_service_desc")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddWinePairing(!addWinePairing)}
                      className={`px-2.5 py-1 rounded-lg text-[8px] font-extrabold uppercase tracking-wider transition-all border ${
                        addWinePairing
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-slate-700 border-slate-200 hover:border-orange-300"
                      }`}
                    >
                      {addWinePairing ? t("wine_added") : t("wine_add")}
                    </button>
                  </div>

                  {addWinePairing && (
                    <div className="pt-2 border-t border-orange-100/40 space-y-2 animate-in slide-in-from-top-1 duration-200">
                      <p className="text-[8px] font-extrabold text-orange-500 uppercase tracking-widest">
                        {t("wine_suggestion_title")}
                      </p>
                      
                      <div className="grid grid-cols-3 gap-1.5">
                        {translatedWineOptions.map((wine) => {
                          const isSelected = selectedWineId === wine.id;
                          const isRecommended = suggestedWine.id === wine.id;
                          return (
                            <button
                              key={wine.id}
                              type="button"
                              onClick={() => setSelectedWineId(wine.id)}
                              className={`p-2 rounded-lg border text-left transition-all relative flex flex-col justify-between h-[48px] ${
                                isSelected
                                  ? "bg-orange-50/50 border-orange-400 shadow-sm ring-1 ring-orange-400"
                                  : "bg-white border-slate-100 hover:border-slate-200"
                              }`}
                            >
                              {isRecommended && (
                                <span className="absolute -top-1.5 -right-1 px-1 py-0.5 bg-slate-950 text-white text-[5px] font-extrabold uppercase tracking-wider rounded">
                                  {t("wine_ideal")}
                                </span>
                              )}
                              <div className="w-full">
                                <p className="text-[7px] font-extrabold text-slate-900 truncate uppercase tracking-tight">
                                  {wine.nome}
                                </p>
                              </div>
                              <div className="flex items-baseline justify-between w-full">
                                <span className="text-[6px] font-bold text-slate-400 truncate uppercase tracking-widest max-w-[40px]">
                                  {wine.tipo.split(" / ")[0]}
                                </span>
                                <span className="text-[8px] font-extrabold text-orange-600 shrink-0">
                                  +{wine.price}€<span className="text-[5px] font-normal text-slate-400 uppercase">/{t("wine_pax")}</span>
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Active wine detail description */}
                      {(() => {
                        const selectedWineObj = translatedWineOptions.find(w => w.id === selectedWineId) || translatedWineOptions[2];
                        return (
                          <div className="bg-white/60 border border-slate-100 rounded-lg p-2 flex gap-2 items-start">
                            <div className="p-1 bg-orange-50 rounded-md text-orange-600 shrink-0 mt-0.5">
                              <ICONS.Wine size={10} />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[8px] font-extrabold text-slate-800 leading-none">
                                {selectedWineObj.nome} <span className="text-slate-400 font-semibold">({selectedWineObj.produtor})</span>
                              </p>
                              <p className="text-[8px] text-slate-500 font-medium leading-tight italic">
                                "{selectedWineObj.descricao}"
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 pt-1 md:pt-2">
                <div className="flex gap-3">
                  <button
                    onClick={() => setBookingStep(null)}
                    className="w-10 h-10 bg-slate-50 border border-slate-100 text-slate-500 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-all duration-200 active:scale-95"
                  >
                    <ICONS.ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setBookingStep("confirm")}
                    className="flex-1 h-10 bg-slate-950 hover:bg-orange-500 text-white rounded-lg flex items-center justify-center gap-2 group transition-all duration-200 shadow-sm"
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider">
                      {selectedMenu?.is_meal_prep || selectedMenu?.type === "daily" ? tr("Agendar este Pack") : tr("Agendar este Ritual")}
                    </span>
                    <ICONS.ArrowRight
                      size={14}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                </div>
                <p className="text-[6px] font-semibold text-slate-400 uppercase tracking-widest text-center">
                  {tr("Inclui: Ingredientes, Confecção, Serviço e Limpeza")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Confirmation Modal (Image 2) */}
      {bookingStep === "confirm" && selectedMenu && (
        <div className="fixed inset-0 z-[150] overflow-y-auto flex items-start sm:items-center justify-center p-4 md:p-10 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-slate-950 rounded-2xl p-5 md:p-8 max-w-xs w-full shadow-2xl border border-white/5 animate-in zoom-in-95 duration-500 relative overflow-hidden my-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
              <div className="h-full bg-orange-500 w-1/5 transition-all duration-500" />
            </div>

            <div className="space-y-4 md:space-y-5 text-left">
              <div className="space-y-1">
                <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight">
                  {tr("Agendar.")}
                </h2>
                <p className="text-[9px] font-medium text-white/40 leading-relaxed">
                  {tr("Inicie o ritual escolhendo uma das experiências ou pratos disponíveis na ementa.")}
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-5 space-y-1.5">
                <p className="text-[8px] font-bold text-white/30 uppercase tracking-wider">
                  {tr("Item Selecionado")}
                </p>
                <p className="text-sm md:text-base font-bold text-orange-500 uppercase tracking-tight">
                  {selectedMenu.nome}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setBookingStep("summary")}
                  className="w-10 h-10 bg-white/5 border border-white/10 text-white/50 rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white transition-all active:scale-95"
                >
                  <ICONS.ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setBookingStep("logistics")}
                  className="flex-1 h-10 bg-white hover:bg-orange-500 hover:text-white text-slate-950 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all duration-200"
                >
                  {tr("Continuar")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Logistics Modal (Logística) */}
      {bookingStep === "logistics" && (
        <div className="fixed inset-0 z-[150] overflow-y-auto flex items-start sm:items-center justify-center p-4 md:p-10 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-slate-950 rounded-2xl p-5 md:p-8 max-w-sm w-full shadow-2xl border border-white/5 animate-in zoom-in-95 duration-500 relative overflow-hidden my-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
              <div className="h-full bg-orange-500 w-2/5 transition-all duration-500" />
            </div>

            <div className="space-y-4 md:space-y-5 text-left">
              <div className="space-y-1">
                <div className="w-8 h-8 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-center text-orange-500 mb-1">
                  <ICONS.MapPin size={14} />
                </div>
                <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight leading-none">
                  {tr("Logística.")}
                </h2>
                <p className="text-[8px] font-bold text-white/30 uppercase tracking-wider">
                  {tr("Onde e quando a magia acontece.")}
                </p>
              </div>

              <div className="space-y-3.5 md:space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-bold text-white/30 uppercase tracking-wider ml-1">
                    {tr("Disponibilidade Mensal")}
                  </label>
                  <ChefAvailabilityCalendar
                     chef={chef}
                     selectedDate={selectedDate}
                     onSelectDate={(date) => setSelectedDate(date)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-bold text-white/30 uppercase tracking-wider ml-1">
                    {tr("Localização")}
                  </label>
                  <div className="relative group">
                    <select
                      className="w-full h-10 bg-white/5 border border-white/10 rounded-lg text-white font-semibold text-xs outline-none appearance-none focus:border-orange-500 focus:bg-white/10 transition-all cursor-pointer px-4"
                      value={morada || ""}
                      onChange={(e) => setMorada(e.target.value)}
                    >
                      <option value="" className="bg-slate-900">
                        {tr("Selecionar Morada")}
                      </option>
                      {currentUser?.addresses?.map((addr, idx) => (
                        <option
                          key={idx}
                          value={`${addr.address}, ${addr.city}`}
                          className="bg-slate-900"
                        >
                          {addr.label || tr("Morada")} ({addr.city})
                        </option>
                      ))}
                      <option value="custom" className="bg-slate-900">
                        {tr("Outra morada...")}
                      </option>
                    </select>
                    <ICONS.ChevronDown
                      size={12}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none group-hover:text-orange-500 transition-colors"
                    />
                  </div>
                </div>

                {morada === "custom" && (
                  <div className="space-y-2.5 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[8px] font-bold text-white/30 uppercase tracking-wider ml-1">
                          {tr("Rua")}
                        </label>
                        <GoogleAddressAutocomplete
                          theme="dark"
                          className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white font-semibold text-xs outline-none focus:border-orange-500 focus:bg-white/10 transition-all placeholder:text-white/15"
                          placeholder={tr("Rua, avenida, praça...")}
                          value={customRua || ""}
                          onChange={(val) => setCustomRua(val)}
                          onAddressSelect={(addressData) => {
                            if (addressData.address) setCustomRua(addressData.address);
                            if (addressData.door_number) setCustomNumero(addressData.door_number);
                            if (addressData.zip_code) setCustomCodPostal(addressData.zip_code);
                            if (addressData.city) setCustomLocalidade(addressData.city);
                          }}
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[8px] font-bold text-white/30 uppercase tracking-wider ml-1">
                          {tr("Número / Apt")}
                        </label>
                        <input
                          type="text"
                          className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white font-semibold text-xs outline-none focus:border-orange-500 focus:bg-white/10 transition-all placeholder:text-white/15"
                          placeholder="Nº..."
                          value={customNumero || ""}
                          onChange={(e) => setCustomNumero(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-white/30 uppercase tracking-wider ml-1">
                          {tr("Código Postal")}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={8}
                          className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white font-semibold text-xs outline-none focus:border-orange-500 focus:bg-white/10 transition-all placeholder:text-white/15"
                          placeholder="1000-001"
                          value={customCodPostal || ""}
                          onChange={(e) => setCustomCodPostal(formatPostalCode(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-white/30 uppercase tracking-wider ml-1">
                          {tr("Localidade")}
                        </label>
                        <input
                          type="text"
                          className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white font-semibold text-xs outline-none focus:border-orange-500 focus:bg-white/10 transition-all placeholder:text-white/15"
                          placeholder={tr("Cidade...")}
                          value={customLocalidade || ""}
                          onChange={(e) => setCustomLocalidade(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (selectedMenu) setBookingStep("confirm");
                    else setBookingStep(null);
                  }}
                  className="w-12 h-12 bg-white/5 border border-white/10 text-white/50 rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white transition-all active:scale-95"
                >
                  {selectedMenu ? (
                    <ICONS.ChevronLeft size={16} />
                  ) : (
                    <ICONS.X size={16} />
                  )}
                </button>
                <button
                  onClick={() => {
                    if (selectedMenu) setBookingStep("desires");
                    else setBookingStep(null);
                  }}
                  disabled={
                    !selectedDate || 
                    !morada || 
                    (morada === "custom" && (
                      !customRua.trim() || 
                      !customCodPostal.trim() || 
                      !customLocalidade.trim()
                    ))
                  }
                  className="flex-1 h-12 bg-white text-slate-950 hover:bg-orange-500 hover:text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-20 active:scale-95"
                >
                  {selectedMenu ? tr("Seguinte") : tr("Escolher Menu")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Desires Modal (Desejos) */}
      {bookingStep === "desires" && selectedMenu && (
        <div className="fixed inset-0 z-[150] overflow-y-auto flex items-start sm:items-center justify-center p-4 md:p-10 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-slate-950 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-white/5 animate-in zoom-in-95 duration-500 relative overflow-hidden my-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
              <div className="h-full bg-orange-500 w-3/5 transition-all duration-500" />
            </div>

            <div className="space-y-4 md:space-y-5 text-left">
              <div className="space-y-1">
                <div className="w-8 h-8 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-center text-orange-500 mb-1">
                  <ICONS.Utensils size={14} />
                </div>
                <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight leading-none">
                  {tr("Desejos.")}
                </h2>
                <p className="text-[8px] font-bold text-white/30 uppercase tracking-wider">
                  {tr("Personaliza a tua experiência.")}
                </p>
              </div>

              <div className="space-y-3.5 md:space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-bold text-white/30 uppercase tracking-wider ml-1">
                      {tr("Pax")}
                    </label>
                    <div className="relative group">
                      <input
                        type="number"
                        min="1"
                        className="w-full h-10 bg-white/5 border border-white/10 rounded-lg text-white font-semibold text-xs outline-none focus:border-orange-500 focus:bg-white/10 transition-all px-4"
                        value={numPessoas}
                        onChange={(e) =>
                          setNumPessoas(parseInt(e.target.value) || 1)
                        }
                      />
                      <ICONS.Users
                        size={12}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none group-hover:text-orange-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-bold text-white/30 uppercase tracking-wider ml-1">
                      {tr("Hora")}
                    </label>
                    <div className="relative group">
                      <select
                        className="w-full h-10 bg-white/5 border border-white/10 rounded-lg text-white font-semibold text-xs outline-none appearance-none focus:border-orange-500 focus:bg-white/10 transition-all cursor-pointer px-4"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                      >
                        <option value="" className="bg-slate-900">
                          {tr("Hora")}
                        </option>
                        {availableTimes.map((t) => (
                          <option key={t} value={t} className="bg-slate-900">
                            {t}
                          </option>
                        ))}
                      </select>
                      <ICONS.Clock
                        size={12}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none group-hover:text-orange-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Guest Profiler Section */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest block">
                    Perfis de Convidados & Alergias
                  </span>
                  <div className="max-h-40 overflow-y-auto space-y-2.5 pr-1 scrollbar-hide">
                    {guests.map((g, idx) => (
                      <div key={idx} className="bg-white/[0.02] border border-white/5 p-2.5 rounded-lg space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[8px] font-bold text-white/40 uppercase">{tr("Convidado")} {idx + 1}</span>
                          <input
                            type="text"
                            placeholder={tr("Nome (Opcional)")}
                            value={g.name || ""}
                            onChange={(e) => {
                              const updated = [...guests];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setGuests(updated);
                            }}
                            className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[10px] text-white font-medium outline-none focus:border-orange-500 w-36"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {["Vegetariano", "Vegano", "Sem Glúten", "Sem Lactose", "Sem Frutos Secos", "Sem Marisco", "Sem Porco", "Diabético", "Outro"].map((allergy) => {
                            const isSelected = g.allergies.includes(allergy);
                            return (
                              <button
                                key={allergy}
                                type="button"
                                onClick={() => {
                                  const updated = [...guests];
                                  const currentAllergies = g.allergies || [];
                                  const nextAllergies = currentAllergies.includes(allergy)
                                    ? currentAllergies.filter(a => a !== allergy)
                                    : [...currentAllergies, allergy];
                                  updated[idx] = { ...updated[idx], allergies: nextAllergies };
                                  setGuests(updated);
                                }}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border transition-all ${
                                  isSelected
                                    ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                                    : "bg-white/5 text-white/40 border-white/5 hover:border-white/10"
                                }`}
                              >
                                {allergy}
                              </button>
                            );
                          })}
                        </div>
                        {g.allergies.includes("Outro") && (
                          <div className="mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200 text-left">
                            <input
                              type="text"
                              placeholder={tr("Especifique a restrição alimentar...")}
                              value={g.customAllergy || ""}
                              onChange={(e) => {
                                const updated = [...guests];
                                updated[idx] = { ...updated[idx], customAllergy: e.target.value };
                                setGuests(updated);
                              }}
                              className="w-full h-8 bg-white/5 border border-white/10 rounded px-2.5 text-[9px] text-white font-medium outline-none focus:border-orange-500 transition-all placeholder:text-white/20"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Split Bill Section */}
                {numPessoas > 1 && (
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">
                        {tr("Dividir Conta (Split Bill)")}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSplitEnabled(!splitEnabled)}
                        className={`px-2.5 py-1 rounded text-[8px] font-bold uppercase border transition-all ${
                          splitEnabled
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white/5 text-white/40 border-white/5 hover:border-white/10"
                        }`}
                      >
                        {splitEnabled ? tr("Ativado") : tr("Desativado")}
                      </button>
                    </div>
                    {splitEnabled && (
                      <div className="space-y-2">
                        <p className="text-[8px] text-white/40 leading-normal">
                          {tr("Insere os e-mails dos restantes")} {numPessoas - 1} {tr("convidados. Cada um pagará a sua parte proporcional.")}
                        </p>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {splitEmails.map((email, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-[8px] font-bold text-white/40 uppercase w-14 shrink-0">{tr("E-mail")} {idx + 1}</span>
                              <input
                                type="email"
                                placeholder={tr("exemplo@cookr.pt")}
                                value={email || ""}
                                onChange={(e) => {
                                  const updated = [...splitEmails];
                                  updated[idx] = e.target.value;
                                  setSplitEmails(updated);
                                }}
                                className="flex-1 h-8 bg-white/5 border border-white/10 rounded px-2 text-[10px] text-white font-medium outline-none focus:border-orange-500"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  <label className="text-[8px] font-bold text-white/30 uppercase tracking-wider ml-1">
                    {tr("Notas Extra para o Chef")}
                  </label>
                  <textarea
                    className="w-full h-12 p-2 bg-white/5 border border-white/10 rounded-lg text-white font-semibold text-xs outline-none focus:border-orange-500 focus:bg-white/10 transition-all resize-none placeholder:text-white/15"
                    placeholder={tr("Algum pedido especial...")}
                    value={kitchenNotes}
                    onChange={(e) => setKitchenNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setBookingStep("logistics")}
                  className="w-12 h-12 bg-white/5 border border-white/10 text-white/50 rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white transition-all active:scale-95"
                >
                  <ICONS.ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setBookingStep("checkout")}
                  disabled={!selectedTime}
                  className="flex-1 h-12 bg-white text-slate-950 hover:bg-orange-500 hover:text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-20 active:scale-95"
                >
                  {tr("Resumo")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Checkout Modal (Checkout) */}
      {bookingStep === "checkout" && selectedMenu && (
        <div className="fixed inset-0 z-[150] overflow-y-auto flex items-start sm:items-center justify-center p-4 md:p-10 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-slate-950 rounded-2xl p-5 md:p-8 max-w-sm w-full shadow-2xl border border-white/5 animate-in zoom-in-95 duration-500 relative overflow-hidden my-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
              <div className="h-full bg-orange-500 w-4/5 transition-all duration-500" />
            </div>

            {/* Floating Help Tooltip */}
            <div className="absolute top-4 right-4 z-[160]">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  onMouseEnter={() => setShowHelpTooltip(true)}
                  onMouseLeave={() => setShowHelpTooltip(false)}
                  className="w-7 h-7 bg-white/5 hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 text-white/40 hover:text-orange-500 rounded-full flex items-center justify-center transition-all cursor-pointer focus:outline-none"
                  title={tr("Termos & Condições")}
                >
                  <ICONS.HelpCircle size={14} />
                </button>

                {showHelpTooltip && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-white/10 p-4 rounded-xl shadow-2xl z-[170] text-left space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                      <ICONS.HelpCircle size={12} className="text-orange-500" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                        {tr("Políticas do Ritual Cookr")}
                      </span>
                    </div>
                    <div className="space-y-2 text-[9px] text-white/70 leading-relaxed font-medium">
                      <div>
                        <p className="font-extrabold text-orange-400 uppercase tracking-wider text-[7px] mb-0.5">
                          Cancelamento & Reagendamento
                        </p>
                        <p>
                          {tr("Reembolso total ou alteração gratuita até 48h antes do ritual. Cancelamentos com menos de 48h não são reembolsáveis para salvaguardar os custos logísticos e de aquisição do Chef.")}
                        </p>
                      </div>
                      <div>
                        <p className="font-extrabold text-orange-400 uppercase tracking-wider text-[7px] mb-0.5">
                          Matérias-Primas & Serviço
                        </p>
                        <p>
                          {tr("O Chef seleciona e adquire os ingredientes mais frescos, confeciona as receitas e assegura a limpeza total do espaço da sua cozinha.")}
                        </p>
                      </div>
                      <div>
                        <p className="font-extrabold text-orange-400 uppercase tracking-wider text-[7px] mb-0.5">
                          {tr("Segurança Alimentar (HACCP)")}
                        </p>
                        <p>
                          {tr("Todos os parceiros da plataforma cumprem com as exigentes normas HACCP para garantir a máxima qualidade, higiene e segurança.")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 md:space-y-5 text-left">
              <div className="space-y-1">
                <div className="w-8 h-8 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-center text-orange-500 mb-1">
                  <ICONS.CreditCard size={14} />
                </div>
                <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight leading-none">
                  {tr("Checkout.")}
                </h2>
                <p className="text-[8px] font-bold text-white/30 uppercase tracking-wider">
                  {tr("Confirmação final da reserva.")}
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-5 space-y-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-orange-500/20 transition-colors" />

                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-wider">
                      {tr("Menu Selecionado")}
                    </p>
                    <p className="text-sm font-bold text-white uppercase tracking-tight leading-none">
                      {selectedMenu.nome}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-wider">
                      {tr("Preço Base")}
                    </p>
                    <p className="text-[10px] font-bold text-white/60">
                      {formatPrice(selectedMenu.preco)}/pax
                    </p>
                  </div>
                </div>

                {addWinePairing && (
                  <>
                    <div className="h-px bg-white/5 relative z-10" />
                    <div className="flex justify-between items-start relative z-10">
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-wider">
                          {t("wine_selected")}
                        </p>
                        <p className="text-xs font-bold text-orange-400 uppercase tracking-tight leading-none flex items-center gap-1">
                          <ICONS.Wine size={10} className="animate-pulse text-orange-400" />
                          {translatedWineOptions.find(w => w.id === selectedWineId)?.nome || tr("Vinho Selecionado")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-wider">
                          {t("wine_supplement")}
                        </p>
                        <p className="text-[10px] font-bold text-orange-400">
                          +{formatPrice(translatedWineOptions.find(w => w.id === selectedWineId)?.price || 0)}/pax
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div className="h-px bg-white/10 relative z-10" />

                {/* Gorjeta Helper Section */}
                <div className="space-y-2 relative z-10 bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                  <div className="flex justify-between items-center">
                    <p className="text-[8px] font-bold text-white/40 uppercase tracking-wider">
                      {tr("Gratificação ao Chef (Opcional)")}
                    </p>
                    <span className="text-[9px] font-bold text-orange-400">
                      {(() => {
                        const activeWine = translatedWineOptions.find(w => w.id === selectedWineId) || translatedWineOptions[2];
                        const base = (selectedMenu.preco + (addWinePairing ? activeWine.price : 0)) * numPessoas;
                        const tip = tipPercentage === "custom"
                          ? (parseFloat(customTipValue) || 0)
                          : (base * (tipPercentage / 100));
                        return tip > 0 ? `+ ${formatPrice(tip)}` : "Sem gorjeta";
                      })()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-1">
                    {[0, 5, 10, 15].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setTipPercentage(pct);
                          setCustomTipValue("");
                        }}
                        className={`py-1 rounded text-[8px] font-bold uppercase transition-all border ${
                          tipPercentage === pct
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white/5 text-white/60 border-white/5 hover:border-white/10"
                        }`}
                      >
                        {pct === 0 ? "0%" : `${pct}%`}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTipPercentage("custom")}
                      className={`py-1 rounded text-[8px] font-bold uppercase transition-all border ${
                        tipPercentage === "custom"
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white/5 text-white/60 border-white/5 hover:border-white/10"
                      }`}
                    >
                      {tr("Outro")}
                    </button>
                  </div>

                  {tipPercentage === "custom" && (
                    <div className="relative mt-1.5 animate-in slide-in-from-top-1 duration-150">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-white/40">
                        {tr("EUR (€)")}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder={tr("Valor personalizado")}
                        value={customTipValue}
                        onChange={(e) => setCustomTipValue(e.target.value)}
                        className="w-full h-7 bg-white/5 border border-white/10 rounded-md pl-10 pr-2 text-[9px] text-white font-semibold focus:border-orange-500/50 focus:outline-none transition-all placeholder:text-white/20"
                      />
                    </div>
                  )}
                </div>

                <div className="h-px bg-white/10 relative z-10" />

                {/* Gift Card Redemption Section */}
                <div className="space-y-2 bg-white/[0.02] border border-white/5 rounded-lg p-2.5 relative z-10">
                  <p className="text-[8px] font-bold text-white/40 uppercase tracking-wider">
                    {tr("Aplicar Vale de Oferta / Gift Card")}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={tr("Código do Vale (ex: COOKR-GIFT-XXXX)")}
                      value={giftCode}
                      onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                      disabled={appliedGiftCard !== null}
                      className="flex-1 h-7 bg-white/5 border border-white/10 rounded-md px-2 text-[9px] text-white font-semibold focus:border-orange-500/50 focus:outline-none transition-all placeholder:text-white/20 uppercase"
                    />
                    {appliedGiftCard ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedGiftCard(null);
                          setGiftCode("");
                        }}
                        className="px-2 h-7 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md text-[8px] font-bold uppercase transition-all"
                      >
                        {tr("Remover")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyGiftCard}
                        disabled={!giftCode.trim()}
                        className="px-3 h-7 bg-orange-500 text-white rounded-md text-[8px] font-bold uppercase transition-all hover:bg-orange-600 disabled:opacity-30"
                      >
                        {tr("Aplicar")}
                      </button>
                    )}
                  </div>
                  {appliedGiftCard && (
                    <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider animate-pulse">
                      {tr("✓ Vale de")} {formatPrice(appliedGiftCard.value)} {tr("aplicado!")}
                    </p>
                  )}
                </div>

                <div className="h-px bg-white/10 relative z-10" />

                <div className="flex justify-between items-end relative z-10">
                  <div className="space-y-1">
                    <p className="text-[8px] font-bold text-orange-500 uppercase tracking-wider">
                      {tr("Total a Pagar")}
                    </p>
                    <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-none">
                      {(() => {
                        const activeWine = translatedWineOptions.find(w => w.id === selectedWineId) || translatedWineOptions[2];
                        const basePrice = (selectedMenu.preco + (addWinePairing ? activeWine.price : 0)) * numPessoas;
                        const feeRate = (currentUser?.loyalty_points || 0) >= 500 ? 1.05 : 1.1;
                        const totalWithFee = basePrice * feeRate;
                        const calculatedTip = tipPercentage === "custom"
                          ? (parseFloat(customTipValue) || 0)
                          : (basePrice * (tipPercentage / 100));
                        const discount = appliedGiftCard ? appliedGiftCard.value : 0;
                        return formatPrice(Math.max(0, totalWithFee + calculatedTip - discount));
                      })()}
                    </span>
                    <p className="text-[6px] font-bold text-white/30 uppercase tracking-wider">
                      {tr("Inclui taxa de serviço")}{" "}
                      {(currentUser?.loyalty_points || 0) >= 500
                        ? tr("reduzida (5%)")
                        : "(10%)"}
                    </p>
                  </div>
                  <div className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-[8px] font-bold text-white/60 uppercase tracking-wider">
                      {numPessoas} {tr("Pessoas")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setBookingStep("desires")}
                  className="w-12 h-12 bg-white/5 border border-white/10 text-white/50 rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white transition-all active:scale-95"
                >
                  <ICONS.ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleBooking}
                  disabled={isBooking}
                  className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {isBooking ? tr("A Processar...") : tr("Confirmar Reserva")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Success Modal */}
      {bookingStep === "success" && (
        <div className="fixed inset-0 z-[150] overflow-y-auto flex items-start sm:items-center justify-center p-4 md:p-10 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-700">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-700 relative overflow-hidden my-auto border border-slate-100">
            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full -mr-24 -mt-24 blur-2xl animate-pulse" />

            <div className="relative">
              <div className="w-12 h-12 bg-orange-500 text-white rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-orange-500/30 animate-pulse relative">
                <span className="absolute -inset-1 rounded-xl bg-orange-500/20 animate-ping duration-1000" />
                <ICONS.Clock size={20} className="relative z-10 animate-spin-slow" />
              </div>
            </div>

            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
              <h2 className="text-xl font-bold text-slate-950 uppercase tracking-tight leading-tight">
                {tr("Pedido")} <br />
                <span className="text-orange-500 font-extrabold">{tr("Enviado.")}</span>
              </h2>
              <p className="text-[11px] font-medium text-slate-500 max-w-xs mx-auto">
                {tr("O seu pedido de reserva foi enviado e aguarda confirmação pelo Chef. O chef entrará em contacto em breve.")}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setBookingStep(null);
                  onNavigate("agenda");
                }}
                className="w-full h-12 bg-slate-950 hover:bg-orange-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all duration-200 active:scale-95"
              >
                {tr("Ver Minha Agenda")}
              </button>
              <button
                onClick={() => setBookingStep(null)}
                className="mt-3 text-[8px] font-bold text-slate-400 uppercase tracking-widest hover:text-orange-500 transition-colors w-full text-center active:scale-95"
              >
                {tr("Voltar ao Perfil")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waitlist Modal */}
      {showWaitlistModal && (
        <div className="fixed inset-0 z-[150] overflow-y-auto flex items-start sm:items-center justify-center p-4 md:p-10 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-slate-950 rounded-[2rem] sm:rounded-[3rem] p-10 md:p-16 max-w-md w-full shadow-3xl border border-white/5 animate-in zoom-in-95 duration-500 relative overflow-hidden my-auto">
            <button
              onClick={() => setShowWaitlistModal(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all duration-200 backdrop-blur-md shrink-0"
            >
              <ICONS.X size={16} />
            </button>

            <div className="space-y-10 text-left">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-orange-500 mb-4">
                  <ICONS.Bell size={24} />
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
                  {tr("Lista de")} <br />
                  {tr("Espera.")}
                </h2>
                <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest">
                  {tr("Notificaremos se houver desistências.")}
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4">
                    {tr("Data Preferencial")}
                  </label>
                  <div className="relative group">
                    <input
                      type="date"
                      className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl text-white font-black text-xs outline-none focus:border-orange-500 focus:bg-white/10 transition-all px-6 [color-scheme:dark]"
                      value={waitlistDate}
                      onChange={(e) => setWaitlistDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowWaitlistModal(false)}
                  className="w-14 h-14 md:w-16 md:h-16 bg-white/5 border border-white/10 text-white/40 rounded-2xl flex items-center justify-center hover:bg-white/10 hover:text-white transition-all active:scale-90"
                >
                  <ICONS.ChevronLeft size={20} />
                </button>
                <button
                  onClick={handleWaitlist}
                  disabled={isWaitlisting || !waitlistDate}
                  className="flex-1 h-16 bg-white text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-orange-500 hover:text-white transition-all shadow-xl disabled:opacity-20 active:scale-95 flex items-center justify-center gap-3"
                >
                  {isWaitlisting ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ICONS.Bell size={16} />
                      {tr("Entrar na Lista")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <ICONS.Trash2 className="text-red-500" size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-950 text-center mb-2 italic uppercase tracking-tighter">
              {tr("Eliminar")} {itemToDelete.type}?
            </h3>
            <p className="text-slate-500 text-center text-[10px] font-black uppercase tracking-widest mb-8">
              {tr("Tem a certeza que deseja eliminar o")}{" "}
              {itemToDelete.type.toLowerCase()}{" "}
              <span className="text-slate-900">"{tr(itemToDelete.name as any) as any}"</span>{tr("? Esta ação não pode ser desfeita.")}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleDeleteItem(itemToDelete.id)}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-200"
              >
                {tr("Sim, eliminar permanentemente")}
              </button>
              <button
                onClick={() => setItemToDelete(null)}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                {tr("Cancelar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section with Cover Photo */}
      <div className="h-[200px] md:h-[260px] relative overflow-hidden group">
        {chef.cover_url ? (
          <img
            src={chef.cover_url}
            className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105"
            alt={tr("Chef Cover")}
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <img
            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105"
            alt={tr("Chef Cover Fallback")}
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-white/95" />

        <button
          onClick={onBack}
          className="absolute top-3 left-3 md:top-4 md:left-4 w-8 h-8 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-center shadow-md hover:bg-slate-900/60 transition-all z-50 active:scale-95 group"
        >
          <ICONS.ChevronLeft
            size={14}
            className="text-white group-hover:-translate-x-0.5 transition-transform"
          />
        </button>

        {/* Floating Status & Actions */}
        <div className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center gap-1.5 z-20">
          {currentUser?.id === chef.id && (
            <button
              onClick={() => onNavigate("profile")}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-950 text-white text-[7.5px] font-bold uppercase rounded-lg tracking-wider shadow-md border border-white/10 hover:bg-orange-500 transition-all group/edit"
            >
              <ICONS.Settings
                size={9}
                className="group-hover/edit:rotate-90 transition-transform"
              />
              <span>{tr("Mais Opções")}</span>
            </button>
          )}
          {chef.isAvailable ? (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/90 backdrop-blur-md text-white text-[7.5px] font-bold uppercase rounded-full tracking-wider border border-emerald-400/20 shadow-md">
              <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
              <span>{t("common.available_now") || tr("Disponível Agora")}</span>
            </div>
          ) : availableDates.length > 0 ? (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md text-slate-200 text-[7.5px] font-bold uppercase rounded-full tracking-wider border border-slate-700/50 shadow-md">
              <ICONS.Calendar size={10} className="text-orange-400" />
              <span>{t("agenda.available_by_booking") || tr("Agenda Disponível")}</span>
            </div>
          ) : null}
          <button
            onClick={handleToggleFavorite}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all backdrop-blur-md border ${isFavorite ? "bg-red-500 text-white border-red-400 shadow-md" : "bg-slate-900/40 text-white border-white/10 hover:bg-slate-900/60"}`}
          >
            <ICONS.Heart
              size={13}
              fill={isFavorite ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 -mt-8 md:-mt-12 relative z-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Avatar, name, story, and main Menu/Ementa grid */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Header Identity Card */}
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex flex-col sm:flex-row items-center sm:items-end gap-4 text-left">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-slate-50 border-2 border-white shadow-md overflow-hidden shrink-0 relative group">
                <img
                  key={chef.avatar_url}
                  src={chef.avatar_url || "https://picsum.photos/400/400?chef"}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                {!chef.isAvailable && availableDates.length === 0 && (
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="px-1.5 py-0.5 bg-white/90 text-slate-950 text-[6.5px] font-bold uppercase rounded tracking-wider shadow">
                      {t("common.unavailable") || tr("Indisponível")}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1 text-center sm:text-left">
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-1.5">
                  {isVerified ? (
                    <div className="relative group/verify">
                      <span className="px-2 py-0.5 bg-emerald-500 text-white text-[7.5px] font-extrabold uppercase rounded-md tracking-wider flex items-center gap-1 shadow-sm border border-emerald-400 cursor-help">
                        <ICONS.ShieldCheck size={10} className="shrink-0" />
                        {tr("Chef Verificado")}
                      </span>
                      {/* Tooltip */}
                      <div className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:-translate-x-0 bottom-full mb-2 w-48 hidden group-hover/verify:block bg-slate-950 text-white text-[8px] font-extrabold p-3 rounded-xl border border-white/10 shadow-xl z-50 animate-in fade-in slide-in-from-bottom-1 uppercase tracking-wider leading-relaxed">
                        <p className="font-black text-emerald-400 mb-1">{tr("✓ Selo de Verificação")}</p>
                        <p className="text-white/70 font-bold normal-case">{tr("Este Chef cumpre os padrões mais elevados com Classificação superior a 4.5 e mais de 3 reservas concluídas.")}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group/verify">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 hover:text-slate-950 text-[7.5px] font-bold uppercase rounded-md tracking-wider border border-slate-200 flex items-center gap-1 cursor-help transition-colors">
                        <ICONS.Info size={10} className="shrink-0 text-slate-400" />
                        {tr("Chef Parceiro")}
                      </span>
                      {/* Tooltip */}
                      <div className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:-translate-x-0 bottom-full mb-2 w-52 hidden group-hover/verify:block bg-slate-950 text-white text-[8px] font-bold p-3 rounded-xl border border-white/10 shadow-xl z-50 animate-in fade-in slide-in-from-bottom-1 uppercase tracking-wider leading-relaxed text-left">
                        <p className="font-black text-orange-400 mb-1">{tr("Como obter Verificação?")}</p>
                        <p className="text-white/60 mb-2 font-medium normal-case">{tr("Para obter o selo de verificação, o Chef beneficia de atingir os seguintes objetivos:")}</p>
                        <div className="space-y-1 text-white/50 text-[7.5px]">
                          <div className="flex justify-between items-center bg-white/5 p-1 rounded">
                            <span>Média de Avaliação &gt; 4.5</span>
                            <span className={chef.rating && chef.rating > 4.5 ? "text-emerald-400" : "text-amber-400"}>
                              {chef.rating !== undefined ? chef.rating.toFixed(1) : "5.0"}/5.0
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-white/5 p-1 rounded">
                            <span>{tr("Reservas Concluídas (Min. 3)")}</span>
                            <span className={(completedBookings.length || chef.total_reservas || 0) >= 3 ? "text-emerald-400" : "text-amber-400"}>
                              {completedBookings.length || chef.total_reservas || 0}/3
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100 text-[7.5px] font-bold uppercase tracking-wider">
                    <ICONS.Star size={9} fill="currentColor" />
                    <span>{chef.rating !== undefined ? chef.rating : "5.0"} • {completedBookings.length || chef.total_reservas || 0} {tr("Reservas")}</span>
                  </div>
                </div>

                <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight uppercase leading-none">
                  {tr("Chef")} <span className="text-orange-500">{chef.nome.replace(/^chef\s+/gi, "")}.</span>
                </h1>

                <div className="flex flex-wrap justify-center sm:justify-start gap-1">
                  {chef.especialidades?.slice(0, 4).map((esp) => (
                    <span
                      key={esp}
                      className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 text-[7.5px] font-bold uppercase rounded tracking-wider transition-all"
                    >
                      #{esp}
                    </span>
                  ))}
                </div>

                {((chef.sustainability_badges && chef.sustainability_badges.length > 0) ||
                  (chef.allergen_certifications && chef.allergen_certifications.length > 0)) && (
                  <div className="flex flex-wrap justify-center sm:justify-start gap-1 pt-1">
                    {chef.sustainability_badges?.map((badgeId) => {
                      const b = SUSTAINABILITY_BADGES_LIST.find((item) => item.id === badgeId);
                      if (!b) return null;
                      return (
                        <span
                          key={badgeId}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider border shadow-2xs ${b.badgeClass}`}
                          title={b.description[(language as any) || "pt"] || b.description.pt}
                        >
                          <span>{b.icon}</span>
                          <span>{b.shortLabel[(language as any) || "pt"] || b.shortLabel.pt}</span>
                        </span>
                      );
                    })}
                    {chef.allergen_certifications?.map((certId) => {
                      const c = ALLERGEN_CERTIFICATIONS_LIST.find((item) => item.id === certId);
                      if (!c) return null;
                      return (
                        <span
                          key={certId}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider border shadow-2xs ${c.badgeClass}`}
                          title={c.description[(language as any) || "pt"] || c.description.pt}
                        >
                          <span>{c.icon}</span>
                          <span>{c.shortLabel[(language as any) || "pt"] || c.shortLabel.pt}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* History Card */}
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-left space-y-2.5">
              <div className="space-y-0.5">
                <span className="text-[7.5px] font-bold text-orange-500 uppercase tracking-widest leading-none">
                  {tr("A Minha Essência")}
                </span>
                <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider leading-none">
                  {tr("A Minha História")}
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed italic border-l-2 border-orange-500/50 pl-3">
                {chef.biografia ||
                  tr("Especialista em criar rituais gastronómicos únicos no conforto da sua casa, transformando ingredientes frescos em memórias inesquecíveis.")}
              </p>
            </div>

            {/* Galeria de Portefólio */}
            {chef.portfolio_images && chef.portfolio_images.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-left space-y-3">
                <div className="space-y-0.5 border-b border-slate-100 pb-2.5">
                  <span className="text-[7.5px] font-bold text-orange-500 uppercase tracking-widest leading-none block">
                    {tr("A Minha Arte")}
                  </span>
                  <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider leading-none flex items-center gap-1.5">
                    <ICONS.Camera size={14} className="text-orange-500" />
                    <span>{tr("Galeria de Portefólio")}</span>
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {chef.portfolio_images.map((imgUrl, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer border border-slate-100">
                      <img 
                        src={imgUrl} 
                        alt={`Portefólio ${idx + 1}`} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certificações e Prémios do Chef */}
            {chef.certifications_and_awards && chef.certifications_and_awards.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-left space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] font-bold text-orange-500 uppercase tracking-widest leading-none block">
                      Excelência & Credenciais
                    </span>
                    <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider leading-none flex items-center gap-1.5">
                      <ICONS.Award size={14} className="text-orange-500" />
                      <span>Certificações & Reconhecimentos</span>
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[7.5px] font-bold uppercase tracking-wider">
                    {chef.certifications_and_awards.length} {chef.certifications_and_awards.length === 1 ? tr("Distinção") : tr("Distinções")}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {chef.certifications_and_awards.map((cert) => {
                    const isAward = cert.type === "award";
                    const isTraining = cert.type === "training";

                    return (
                      <div
                        key={cert.id}
                        className={`p-3 rounded-lg border text-left space-y-1.5 transition-all ${
                          isAward
                            ? "bg-amber-50/30 border-amber-200/80"
                            : isTraining
                              ? "bg-emerald-50/30 border-emerald-200/80"
                              : "bg-slate-50/60 border-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[6.5px] font-black uppercase tracking-wider ${
                              isAward
                                ? "bg-amber-500 text-white"
                                : isTraining
                                  ? "bg-emerald-500 text-white"
                                  : "bg-slate-900 text-white"
                            }`}
                          >
                            {isAward
                              ? tr("Prémio")
                              : isTraining
                                ? tr("Formação")
                                : tr("Certificação")}
                          </span>
                          {cert.year && (
                            <span className="text-[8px] font-extrabold text-slate-400">
                              {cert.year}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-[10.5px] font-extrabold text-slate-900 leading-tight">
                            {tr(cert.title as any) as any}
                          </h4>
                          <p className="text-[8.5px] font-semibold text-slate-500">
                            {cert.issuer}
                          </p>
                        </div>

                        {cert.description && (
                          <p className="text-[8px] text-slate-600 leading-relaxed italic border-l border-orange-400/50 pl-2">
                            "{tr(cert.description as any) as any}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sustentabilidade & Origem dos Ingredientes */}
            {((chef.sustainability_badges && chef.sustainability_badges.length > 0) || chef.sustainability_notes) && (
              <div className="bg-emerald-50/30 rounded-xl border border-emerald-100 p-4 shadow-sm text-left space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] font-bold text-emerald-600 uppercase tracking-widest leading-none block">
                      Responsabilidade & Origem
                    </span>
                    <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider leading-none flex items-center gap-1.5">
                      <span className="text-sm">🌱</span>
                      <span>Sustentabilidade & Ingredientes Locais</span>
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[7.5px] font-black uppercase tracking-wider shadow-2xs">
                    {tr("Eco Chef")}
                  </span>
                </div>

                {chef.sustainability_badges && chef.sustainability_badges.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {chef.sustainability_badges.map((badgeId) => {
                      const badge = SUSTAINABILITY_BADGES_LIST.find((b) => b.id === badgeId);
                      if (!badge) return null;
                      const langLabel = badge.label[(language as any) || "pt"] || badge.label.pt;
                      const langDesc = badge.description[(language as any) || "pt"] || badge.description.pt;

                      return (
                        <div
                          key={badgeId}
                          className="bg-white/80 p-2.5 rounded-lg border border-emerald-100 text-left space-y-1"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{badge.icon}</span>
                            <h4 className="text-[10px] font-extrabold text-slate-900 uppercase">
                              {langLabel}
                            </h4>
                          </div>
                          <p className="text-[8px] text-slate-500 leading-snug">
                            {langDesc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {chef.sustainability_notes && (
                  <p className="text-[8.5px] text-slate-600 leading-relaxed italic bg-white/70 p-2.5 rounded-lg border border-emerald-100/60 border-l-2 border-l-emerald-500">
                    "{chef.sustainability_notes}"
                  </p>
                )}
              </div>
            )}

            {/* Gestão de Alergénios e Dietas Especiais (Sem Contaminação Cruzada) */}
            {((chef.allergen_certifications && chef.allergen_certifications.length > 0) || chef.allergen_notes) && (
              <div className="bg-amber-50/30 rounded-xl border border-amber-100 p-4 shadow-sm text-left space-y-3">
                <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] font-bold text-amber-600 uppercase tracking-widest leading-none block">
                      Segurança Alimentar & Prevenção
                    </span>
                    <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider leading-none flex items-center gap-1.5">
                      <span className="text-sm">🛡️</span>
                      <span>Gestão de Alergénios & Dietas Especiais</span>
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[7.5px] font-black uppercase tracking-wider shadow-2xs">
                    {tr("Sem Contaminação")}
                  </span>
                </div>

                {chef.allergen_certifications && chef.allergen_certifications.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {chef.allergen_certifications.map((certId) => {
                      const cert = ALLERGEN_CERTIFICATIONS_LIST.find((c) => c.id === certId);
                      if (!cert) return null;
                      const langLabel = cert.label[(language as any) || "pt"] || cert.label.pt;
                      const langDesc = cert.description[(language as any) || "pt"] || cert.description.pt;

                      return (
                        <div
                          key={certId}
                          className="bg-white/80 p-2.5 rounded-lg border border-amber-100 text-left space-y-1"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{cert.icon}</span>
                            <h4 className="text-[10px] font-extrabold text-slate-900 uppercase">
                              {langLabel}
                            </h4>
                          </div>
                          <p className="text-[8px] text-slate-500 leading-snug">
                            {langDesc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {chef.allergen_notes && (
                  <p className="text-[8.5px] text-slate-600 leading-relaxed italic bg-white/70 p-2.5 rounded-lg border border-amber-100/60 border-l-2 border-l-amber-500">
                    "{chef.allergen_notes}"
                  </p>
                )}
              </div>
            )}

            {/* FAQ do Chef (Perguntas Frequentes do Chef) */}
            {chef.faqs && chef.faqs.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-left space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] font-bold text-orange-500 uppercase tracking-widest leading-none block">
                      Transparência & Confiança
                    </span>
                    <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider leading-none flex items-center gap-1.5">
                      <ICONS.HelpCircle size={14} className="text-orange-500" />
                      <span>{tr("Perguntas Frequentes do Chef (FAQ)")}</span>
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-100 rounded text-[7.5px] font-bold uppercase tracking-wider">
                    {chef.faqs.length} {chef.faqs.length === 1 ? tr("Resposta") : tr("Respostas")}
                  </span>
                </div>

                <div className="space-y-2">
                  {chef.faqs.map((faq) => {
                    const catMap: Record<string, { label: string; color: string }> = {
                      alergias: { label: "Alergias & Restrições", color: "bg-rose-50 text-rose-700 border-rose-200" },
                      logistica: { label: "Logística & Cozinha", color: "bg-blue-50 text-blue-700 border-blue-200" },
                      ingredientes: { label: "Ingredientes", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                      geral: { label: "Geral", color: "bg-slate-100 text-slate-700 border-slate-200" }
                    };
                    const catInfo = catMap[faq.category || 'geral'] || catMap.geral;

                    return (
                      <div
                        key={faq.id}
                        className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 space-y-1.5 transition-all hover:bg-slate-50 hover:border-slate-200"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[6.5px] font-black uppercase tracking-wider border ${catInfo.color}`}>
                            {tr(catInfo.label as any) as any}
                          </span>
                        </div>

                        <h4 className="text-[11px] font-bold text-slate-900 leading-snug">
                          {tr(faq.question as any) as any}
                        </h4>

                        <p className="text-[9.5px] font-medium text-slate-600 leading-relaxed pt-0.5 border-t border-slate-200/50">
                          {tr(faq.answer as any) as any}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Menus Section */}
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3 text-left">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 leading-none">
                    {tr("Ementas do Chef")}
                  </h3>
                  <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">
                    {activeTab === "experience"
                      ? tr("Descobre as criações exclusivas do Chef")
                      : activeTab === "dish"
                        ? tr("Pratos individuais para o teu dia-a-dia")
                        : tr("Packs semanais de refeições prontas")}
                  </p>
                </div>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setActiveTab("experience")}
                    className={`px-2.5 py-1 rounded-md text-[7.5px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === "experience" ? "bg-orange-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    <ICONS.Sparkles size={11} className="shrink-0" />
                    {tr("Rituais")}
                  </button>
                  <button
                    onClick={() => setActiveTab("dish")}
                    className={`px-2.5 py-1 rounded-md text-[7.5px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === "dish" ? "bg-orange-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    <ICONS.Utensils size={11} className="shrink-0" />
                    {tr("Pratos")}
                  </button>
                  <button
                    onClick={() => setActiveTab("daily")}
                    className={`px-2.5 py-1 rounded-md text-[7.5px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === "daily" ? "bg-orange-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    <ICONS.Calendar size={11} className="shrink-0" />
                    {tr("Daily")}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <MenuCardSkeleton key={i} />
                  ))
                ) : filteredMenus.length > 0 ? (
                  filteredMenus.map((menu) => (
                    <PublicMenuCard
                      key={menu.id}
                      menu={menu}
                      selectedMenuId={selectedMenu?.id}
                      chefId={chef.id}
                      currentUserId={currentUser?.id}
                      onSelectMenu={handleSelectMenu}
                      onDeleteItem={handleRequestDeleteItem}
                    />
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <ICONS.Utensils
                      size={20}
                      className="mx-auto text-slate-300 mb-1.5"
                    />
                    <p className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider">
                      {tr("Sem itens nesta categoria.")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Chef's Signature Recipes Section (Galeria de Especialidades) */}
            {(isLoading || (recipes && recipes.length > 0)) && (
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-left space-y-3">
                <div className="space-y-0.5 border-b border-slate-50 pb-2">
                  <span className="text-[7.5px] font-bold text-orange-500 uppercase tracking-widest leading-none">
                    {tr("Culinária de Assinatura")}
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider leading-none">
                    Especialidades & Galeria
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {isLoading ? (
                    [...Array(6)].map((_, i) => (
                      <RecipeCardSkeleton key={i} />
                    ))
                  ) : (
                    recipes.map((item) => (
                      <div key={item.id} className="group relative rounded-lg overflow-hidden bg-slate-50 border border-slate-100 p-1.5 space-y-1.5">
                        <div className="aspect-square rounded overflow-hidden relative">
                          <img 
                            src={item.imageUrl} 
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500" 
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                          {item.isPopular && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-orange-500 text-white text-[5.5px] font-bold rounded uppercase tracking-wider shadow">
                              {tr("Popular")}
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-slate-800 line-clamp-1 uppercase leading-tight">{item.nome}</p>
                          {item.descricao && (
                            <p className="text-[8.5px] text-slate-400 font-medium line-clamp-1">{item.descricao}</p>
                          )}
                          {item.preco && (
                            <p className="text-[9px] font-bold text-orange-500">{formatPrice(item.preco)}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Cookr Client Reviews Section (Testemunhos) */}
            <div id="chef-reviews-section-container" className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-left space-y-4">
              <div id="chef-reviews-header-block" className="space-y-0.5 border-b border-slate-50 pb-2 flex justify-between items-center">
                <div>
                  <span className="text-[7.5px] font-bold text-orange-500 uppercase tracking-widest leading-none">
                    {tr("A Opinião de Quem Provou")}
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider leading-none">
                    {tr("Avaliações dos Clientes")}
                  </h3>
                </div>
                <div id="chef-reviews-badge" className="flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-md px-2 py-0.5 text-[8px] font-semibold">
                  <ICONS.Star size={10} fill="currentColor" />
                  <span>{chef.rating || "5.0"} • {reviews.length} {tr("Opiniões")}</span>
                </div>
              </div>

              {/* Opções de Ordenação */}
              {reviews && reviews.length > 0 && (
                <div id="chef-reviews-sorting-container" className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-2 text-[10px]">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider">{tr("Ordenar por:")}</span>
                  <select
                    id="reviews-sort-by-select"
                    value={reviewsSortBy}
                    onChange={(e) => setReviewsSortBy(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2 py-1 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 text-[10px] cursor-pointer"
                  >
                    <option value="date_desc">{tr("Mais Recentes")}</option>
                    <option value="date_asc">{tr("Mais Antigas")}</option>
                    <option value="rating_desc">{tr("Melhor Classificação (Alta → Baixa)")}</option>
                    <option value="rating_asc">{tr("Menor Classificação (Baixa → Alta)")}</option>
                  </select>
                </div>
              )}

              {sortedReviews && sortedReviews.length > 0 ? (
                <div id="chef-reviews-list-container" className="space-y-3">
                  {sortedReviews.map((rev) => (
                    <div id={`chef-review-item-${rev.id}`} key={rev.id} className="border-b border-slate-50 last:border-b-0 pb-3 last:pb-0 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center font-bold text-[9px] text-slate-600 border border-slate-200">
                            {rev.clientName ? rev.clientName.charAt(0).toUpperCase() : "C"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-[10px] leading-none uppercase">{rev.clientName || tr("Cliente")}</p>
                            <span className="text-[7.5px] text-slate-400 font-semibold uppercase tracking-wider">
                              {rev.created_at ? new Date(rev.created_at).toLocaleDateString(trLocale()) : tr("Recentemente")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <ICONS.Star
                              key={i}
                              size={8}
                              fill={i < Math.floor(rev.rating) ? "currentColor" : "none"}
                              className={i < Math.floor(rev.rating) ? "text-amber-500" : "text-slate-200"}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic flex-1">
                          "{rev.comment}"
                        </p>
                        {reportedReviewIds.includes(rev.id) || rev.isFlagged ? (
                          <span className="text-[8px] font-bold text-red-500 uppercase flex items-center gap-1 shrink-0 bg-red-50 px-1.5 py-0.5 rounded">
                            <ICONS.AlertTriangle size={10} /> {tr("Reportada")}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleReportReview(rev.id)}
                            className="text-[8px] font-black uppercase text-slate-400 hover:text-red-500 flex items-center gap-0.5 transition-colors shrink-0 bg-slate-50 hover:bg-red-50 px-1.5 py-0.5 rounded cursor-pointer"
                            title={tr("Denunciar comentário inapropriado")}
                          >
                            <ICONS.AlertTriangle size={10} /> {tr("Denunciar")}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div id="chef-reviews-empty-state" className="py-6 text-center text-slate-400">
                  <ICONS.Star size={16} className="mx-auto text-slate-200 mb-1" />
                  <p className="text-[8px] font-bold uppercase tracking-wider">{tr("Ainda sem avaliações escritas.")}</p>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Float actions, stats, calendar widget (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4 text-left">
            
            {/* Bento Stats Block */}
            <div className="bg-slate-950 rounded-xl p-4 shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -mr-12 -mt-12 blur-xl group-hover:bg-orange-500/10 transition-colors duration-1000" />
              
              <div className="grid grid-cols-3 gap-1 relative z-10 text-center divide-x divide-white/5">
                <div className="space-y-1 px-1">
                  <div className="w-6 h-6 bg-orange-500/15 text-orange-400 rounded-md flex items-center justify-center mx-auto">
                    <ICONS.Star size={11} fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white tracking-tight leading-none">
                      {chef.rating || "5.0"}
                    </p>
                    <p className="text-[6.5px] font-bold text-white/35 uppercase tracking-wider">{tr("Rating")}</p>
                  </div>
                </div>

                <div className="space-y-1 px-1">
                  <div className="w-6 h-6 bg-blue-500/15 text-blue-400 rounded-md flex items-center justify-center mx-auto">
                    <ICONS.CheckCircle size={11} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white tracking-tight leading-none">
                      {chef.total_reservas || "0"}
                    </p>
                    <p className="text-[6.5px] font-bold text-white/35 uppercase tracking-wider">{tr("Reservas")}</p>
                  </div>
                </div>

                <div className="space-y-1 px-1">
                  <div className="w-6 h-6 bg-emerald-500/15 text-emerald-400 rounded-md flex items-center justify-center mx-auto">
                    <ICONS.Zap size={11} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white tracking-tight leading-none">&lt; 1h</p>
                    <p className="text-[6.5px] font-bold text-white/35 uppercase tracking-wider">{tr("Resposta")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-50 pb-1.5 leading-none">
                {tr("Opções Rápidas")}
              </h4>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onOpenChat(chef.id)}
                  className="w-full h-11 bg-slate-950 hover:bg-orange-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-sm flex items-center justify-center gap-1.5 group"
                >
                  <ICONS.MessageSquare size={12} className="group-hover:scale-105 transition-transform" />
                  <span>{tr("Mensagem Direta")}</span>
                </button>

                {(!chef.isAvailable || availableDates.length === 0) && (
                  <button
                    onClick={() => setShowWaitlistModal(true)}
                    className="w-full h-11 bg-white border border-slate-200 text-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 active:scale-95 group"
                  >
                    <ICONS.Bell size={12} className="text-orange-500" />
                    <span>{tr("Lista de Espera")}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Pro Credentials Bento (Idiomas, Equipamento, etc) */}
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-3.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-50 pb-1.5 leading-none">
                {tr("Credenciais de Qualidade")}
              </h4>

              <div className="space-y-3 text-[10px]">
                {/* Languages */}
                <div className="space-y-1">
                  <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">{tr("Idiomas de Trabalho")}</p>
                  <div className="flex flex-wrap gap-1">
                    {chef.idiomas && chef.idiomas.length > 0 ? (
                      chef.idiomas.map((lg) => (
                        <span key={lg} className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[7.5px] uppercase border border-slate-205/30">{lg}</span>
                      ))
                    ) : (
                      <>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[7.5px] uppercase">{tr("Português (PT)")}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[7.5px] uppercase">{tr("Inglês (EN)")}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Specialties / Equipamentos */}
                <div className="space-y-1">
                  <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">{tr("Equipamento Profissional")}</p>
                  <div className="flex flex-wrap gap-1">
                    {chef.equipamento && chef.equipamento.length > 0 ? (
                      chef.equipamento.map((eq) => (
                        <span key={eq} className="px-2 py-0.5 bg-orange-50 text-orange-700 font-semibold rounded text-[7.5px] uppercase border border-orange-100">{eq}</span>
                      ))
                    ) : (
                      <>
                        <span className="px-2 py-0.5 bg-orange-50 text-orange-700 font-semibold rounded text-[7.5px] uppercase">{tr("Facas Profissionais")}</span>
                        <span className="px-2 py-0.5 bg-orange-50 text-orange-700 font-semibold rounded text-[7.5px] uppercase">{tr("Kit de Degustação")}</span>
                        <span className="px-2 py-0.5 bg-orange-50 text-orange-700 font-semibold rounded text-[7.5px] uppercase">{tr("Acessórios de Precisão")}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Diferenciais / Selos */}
                <div className="space-y-1">
                  <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">Valores & Padrões</p>
                  <div className="flex flex-wrap gap-1">
                    {chef.diferenciais && chef.diferenciais.length > 0 ? (
                      chef.diferenciais.map((dif) => (
                        <span key={dif} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded text-[7.5px] uppercase border border-emerald-100">{dif}</span>
                      ))
                    ) : (
                      <>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded text-[7.5px] uppercase">{tr("Higiene HACCP")}</span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded text-[7.5px] uppercase">{tr("Ingredientes Biológicos")}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
          
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChefProfileView);
