import React, { useState, useEffect, useRef, useMemo } from "react";
import { User, Booking, BookingStatus, MenuItem } from "../types";
import { ICONS, formatPrice, PORTUGAL_CITIES } from "../constants";
import { supabaseService } from "../services/supabaseService";
import { CancellationModal } from "./CancellationModal";
import { DietaryBadges } from "./DietaryBadges";
import { QuoteRequestOnboarding } from "./QuoteRequestOnboarding";
import { GoogleAddressAutocomplete } from "./GoogleAddressAutocomplete";
import { formatPostalCode } from "../utils/formatters";
import {
  Trash2,
  Plus,
  MapPin,
  Check,
  X as XIcon,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import { tr } from "../lib/tr";
import { useLanguage } from "../contexts/LanguageContext";
interface ProfileDashboardProps {
  user: User;
  bookings: Booking[];
  allUsers: User[];
  onRefresh: (userOverride?: User) => void;
  onOpenChat: (partnerId: string, isReadOnly?: boolean) => void;
  onSelectChef: (id: string, step?: any) => void;
  onNavigate: (view: string) => void;
  onNotify?: (
    message: string,
    type?: "error" | "success" | "info" | "new_order",
  ) => void;
  initialTab?:
    | "bookings"
    | "favorites"
    | "settings"
    | "giftcards"
    | "loyalty"
    | "moradas";
}

const ProfileDashboard: React.FC<ProfileDashboardProps> = ({
  user,
  bookings,
  allUsers,
  onRefresh,
  onOpenChat,
  onSelectChef,
  onNavigate,
  onNotify,
  initialTab,
}) => {
  useLanguage();
  const [activeTab, setActiveTab] = useState<
    "bookings" | "favorites" | "settings" | "giftcards" | "loyalty" | "moradas"
  >(initialTab || "bookings");
  const [viewingDetail, setViewingDetail] = useState<Booking | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loyaltyHistory, setLoyaltyHistory] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [selectedBookingForCancellation, setSelectedBookingForCancellation] =
    useState<Booking | null>(null);
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [selectedChefForQuote, setSelectedChefForQuote] = useState<User | null>(
    null,
  );
  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [isLoadingGiftCards, setIsLoadingGiftCards] = useState(false);

  useEffect(() => {
    const loadGiftCards = async () => {
      if (activeTab === "giftcards") {
        setIsLoadingGiftCards(true);
        try {
          const cards = await supabaseService.getGiftCards(user.email || "");
          setGiftCards(cards || []);
        } catch (e) {
          console.warn("Note loading gift cards:", e);
        } finally {
          setIsLoadingGiftCards(false);
        }
      }
    };
    loadGiftCards();
  }, [activeTab, user.email]);

  const [chefMenusForQuote, setChefMenusForQuote] = useState<MenuItem[]>([]);
  const [isLoadingMenusForQuote, setIsLoadingMenusForQuote] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [showPointsInfoModal, setShowPointsInfoModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [selectedGiftExperience, setSelectedGiftExperience] = useState<any | null>(null);
  const [giftRecipientName, setGiftRecipientName] = useState("");
  const [giftRecipientEmail, setGiftRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [isPurchasingGift, setIsPurchasingGift] = useState(false);

  const handlePurchaseGiftCard = async () => {
    if (!giftRecipientName || !giftRecipientEmail) {
      if (onNotify) onNotify(tr("Por favor, preencha o nome e e-mail do destinatário."), "error");
      return;
    }
    setIsPurchasingGift(true);
    try {
      const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `COOKR-GIFT-${randStr}`;

      const payload = {
        buyerId: user.id,
        buyerName: user.nome || "",
        buyerEmail: user.email || "",
        recipientName: giftRecipientName,
        recipientEmail: giftRecipientEmail.toLowerCase(),
        message: giftMessage,
        experienceName: selectedGiftExperience.nome,
        value: selectedGiftExperience.preco,
        code: code
      };

      await supabaseService.createGiftCard(payload);

      const cards = await supabaseService.getGiftCards(user.email || "");
      setGiftCards(cards || []);

      if (onNotify) onNotify(tr("Gift card comprado e enviado com sucesso!"), "success");
      
      setSelectedGiftExperience(null);
      setGiftRecipientName("");
      setGiftRecipientEmail("");
      setGiftMessage("");
    } catch (e: any) {
      console.error("Error purchasing gift card:", e);
      if (onNotify) onNotify(tr("Erro ao comprar gift card: {v0}", { v0: e.message }), "error");
    } finally {
      setIsPurchasingGift(false);
    }
  };

  const handleImportDemoBookings = async () => {
    if (!user) return;
    setIsImporting(true);
    try {
      const success = await supabaseService.importDemoBookingsForNewClient(user.id, user.nome);
      if (success) {
        if (onRefresh) onRefresh();
        if (onNotify) {
          onNotify(tr("Reservas de demonstração sincronizadas com sucesso!"), "success");
        } else {
          alert(tr("As suas reservas de demonstração foram sincronizadas com sucesso à sua nova conta Cookr!"));
        }
      } else {
        if (onNotify) {
          onNotify(tr("Nenhuma nova reserva encontrada para sincronizar."), "info");
        } else {
          alert(tr("Não encontrámos novas reservas de demonstração para sincronizar (ou estas já foram todas associadas)."));
        }
      }
    } catch (err) {
      console.error(err);
      if (onNotify) {
        onNotify(tr("Ocorreu um erro ao sincronizar as reservas."), "error");
      } else {
        alert(tr("Ocorreu um erro ao sincronizar as reservas."));
      }
    } finally {
      setIsImporting(false);
    }
  };

  // States for healthy diet recommendations
  const [allHealthyMenus, setAllHealthyMenus] = useState<MenuItem[]>([]);
  const [isLoadingHealthyMenus, setIsLoadingHealthyMenus] = useState(false);
  const [selectedDietCategory, setSelectedDietCategory] = useState<string>("all-healthy");

  // Filter states for client orders history
  const [filterType, setFilterType] = useState<"all" | "ritual" | "dish" | "daily">("all");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "this_month" | "last_30" | "last_90" | "custom">("all");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  const filteredBookingsList = useMemo(() => {
    let list = bookings || [];

    // Filter by type (Ritual, Prato, Daily)
    if (filterType !== "all") {
      list = list.filter((b) => {
        const isDaily = b.is_meal_prep || b.menu_type === 'daily' || b.menu_selected?.toLowerCase().includes('daily') || b.menu_selected?.toLowerCase().includes('pack');
        const hasRitualKeyword = b.menu_selected?.toLowerCase().includes('menu') || b.menu_selected?.toLowerCase().includes('experiência') || b.menu_selected?.toLowerCase().includes('degustação') || b.menu_selected?.toLowerCase().includes('ritual');
        const isDish = b.menu_type === 'dish' || b.menu_selected?.toLowerCase().includes('prato') || (!isDaily && !hasRitualKeyword);
        
        if (filterType === "daily") return isDaily;
        if (filterType === "dish") return isDish && !isDaily;
        if (filterType === "ritual") return !isDaily && !isDish;
        return true;
      });
    }

    // Filter by Period
    if (filterPeriod !== "all") {
      const now = new Date();
      list = list.filter((b) => {
        if (!b.data) return false;
        const bDate = new Date(b.data);
        if (isNaN(bDate.getTime())) return false;

        if (filterPeriod === "this_month") {
          return bDate.getMonth() === now.getMonth() && bDate.getFullYear() === now.getFullYear();
        }
        if (filterPeriod === "last_30") {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          return bDate >= thirtyDaysAgo && bDate <= now;
        }
        if (filterPeriod === "last_90") {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(now.getDate() - 90);
          return bDate >= ninetyDaysAgo && bDate <= now;
        }
        return true;
      });
    }

    // Filter by custom date inputs
    if (filterPeriod === "custom") {
      if (filterStartDate) {
        const start = new Date(filterStartDate);
        list = list.filter((b) => {
          if (!b.data) return false;
          const bDate = new Date(b.data);
          return bDate >= start;
        });
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        list = list.filter((b) => {
          if (!b.data) return false;
          const bDate = new Date(b.data);
          return bDate <= end;
        });
      }
    }

    return list;
  }, [bookings, filterType, filterPeriod, filterStartDate, filterEndDate]);

  const recommendedHealthyMenus = useMemo(() => {
    if (!allHealthyMenus) return [];
    
    // Normalizar texto para busca
    const norm = (str?: string) => (str || "").toLowerCase().trim();
    
    return allHealthyMenus.filter((menu) => {
      const tags = (menu.tags || []).map(t => norm(t));
      const dietaryTags = (menu.dietary_tags || []).map(dt => norm(dt));
      const desc = norm(menu.descricao);
      const name = norm(menu.nome);
      const cuisine = norm(menu.cuisine_type);
      
      // Combinar todas as tags informativas do prato
      const allTextTags = [...tags, ...dietaryTags, desc, name, cuisine];
      
      // 1. Determinar se o prato é geralmente saudável ou se se enquadra na dieta saudável requisitada
      const isHealthyGeneral = 
        allTextTags.some(tag => 
          tag.includes("saudá") || tag.includes("sauda") || tag.includes("healthy") || 
          tag.includes("fit") || tag.includes("low carb") || tag.includes("lowcarb") || 
          tag.includes("light") || tag.includes("vegetari") || tag.includes("vegano") || 
          tag.includes("vegan") || tag.includes("salada") || tag.includes("sopa") || 
          tag.includes("grelhado") || tag.includes("sem gl") || tag.includes("gluten-free") ||
          tag.includes("lactose-free") || tag.includes("diet")
        ) || 
        (menu.calories && menu.calories < 750);
      
      if (!isHealthyGeneral) return false;
      
      // 2. Se o usuário selecionou uma categoria específica de dieta saudável no seletor do widget
      if (selectedDietCategory === "low-carb") {
        const isLowCarb = allTextTags.some(tag => tag.includes("low carb") || tag.includes("lowcarb") || tag.includes("proteic") || tag.includes("cetogenic") || tag.includes("keto") || tag.includes("grelhado"));
        if (!isLowCarb) return false;
      }
      
      if (selectedDietCategory === "vegan-veg") {
        const isVeg = allTextTags.some(tag => tag.includes("vegan") || tag.includes("vegano") || tag.includes("vegetari") || tag.includes("plant-based") || tag.includes("plant based"));
        if (!isVeg) return false;
      }
      
      if (selectedDietCategory === "gluten-free") {
        const isGlutenFree = allTextTags.some(tag => tag.includes("sem gl") || tag.includes("gluten-free") || tag.includes("glúten-free") || tag.includes("gluten free"));
        if (!isGlutenFree) return false;
      }
      
      if (selectedDietCategory === "lactose-free") {
        const isLactoseFree = allTextTags.some(tag => tag.includes("sem lac") || tag.includes("lactose-free") || tag.includes("lactose free") || tag.includes("sem leite") || tag.includes("dairy-free") || tag.includes("dairy free"));
        if (!isLactoseFree) return false;
      }
      
      // 3. SE a categoria for "all-healthy" (a recomendação personalizada automática padrão), 
      //    então filtramos baseado em restrições alimentares do usuário e suas preferências cadastradas
      if (selectedDietCategory === "all-healthy") {
        const userRestrictions = user.dietary_restrictions || [];
        
        // Se o usuário tem restrições cadastradas, o prato NÃO PODE conter os alergénicos.
        for (const restriction of userRestrictions) {
          const resNorm = norm(restriction);
          if (resNorm.includes("glúten") || resNorm.includes("gluten") || resNorm.includes("sem gl")) {
            const hasGlutenMention = allTextTags.some(t => t.includes("trigo") || t.includes("cevada") || t.includes("centeio") || (t.includes("glúten") && !t.includes("sem glúten") && !t.includes("gluten-free")));
            if (hasGlutenMention) return false;
          }
          if (resNorm.includes("lactose") || resNorm.includes("latic") || resNorm.includes("leite") || resNorm.includes("sem lac")) {
            const hasLactoseMention = allTextTags.some(t => (t.includes("leite") || t.includes("queijo") || t.includes("natas") || t.includes("lactose")) && !t.includes("sem lactose") && !t.includes("lactose-free") && !t.includes("vegan"));
            if (hasLactoseMention) return false;
          }
          if (resNorm.includes("marisco") || resNorm.includes("crust")) {
            const hasShellfish = allTextTags.some(t => t.includes("marisco") || t.includes("camarão") || t.includes("ameijoa") || t.includes("caranguejo") || t.includes("lagosta"));
            if (hasShellfish) return false;
          }
          if (resNorm.includes("nozes") || resNorm.includes("fruto sec") || resNorm.includes("amendo")) {
            const hasNuts = allTextTags.some(t => t.includes("nozes") || t.includes("amendoim") || t.includes("avelã") || t.includes("castanha") || t.includes("pistacio"));
            if (hasNuts) return false;
          }
          if (resNorm.includes("vegetariano") || resNorm.includes("vegano") || resNorm.includes("vegan")) {
            const hasMeatOrFish = allTextTags.some(t => t.includes("carne") || t.includes("porco") || t.includes("vaca") || t.includes("frango") || t.includes("peixe") || t.includes("marisco") || t.includes("bacon"));
            const isVegPrato = allTextTags.some(t => t.includes("vegan") || t.includes("vegano") || t.includes("vegetari"));
            if (hasMeatOrFish && !isVegPrato) return false;
          }
        }
      }
      
      return true;
    });
  }, [allHealthyMenus, user.dietary_restrictions, user.cuisine_preferences, selectedDietCategory]);

  useEffect(() => {
    setAvatarError(false);
  }, [editedUser.avatar_url]);

  useEffect(() => {
    if (!isEditing) {
      setEditedUser(user);
    }
  }, [user, isEditing]);

  useEffect(() => {
    const loadLoyaltyHistory = async () => {
      if (activeTab === "loyalty") {
        try {
          const history = await supabaseService.getLoyaltyHistory(user.id);
          setLoyaltyHistory(history);
        } catch (e) {
          console.warn("Note loading loyalty history:", e);
        }
      }
    };
    loadLoyaltyHistory();
  }, [activeTab, user.id]);

  useEffect(() => {
    const loadHealthyMenus = async () => {
      setIsLoadingHealthyMenus(true);
      try {
        const list = await supabaseService.getAllMenusList();
        setAllHealthyMenus(list || []);
      } catch (err) {
        console.warn("Note loading menus in ProfileDashboard for healthy diet suggestions:", err);
      } finally {
        setIsLoadingHealthyMenus(false);
      }
    };
    loadHealthyMenus();
  }, [user.id]);

  useEffect(() => {
    const fetchMenu = async () => {
      if (viewingDetail) {
        setIsLoadingMenu(true);
        try {
          const menu = await supabaseService.getMenuByName(
            viewingDetail.menu_selected,
            viewingDetail.cookId,
          );
          setSelectedMenu(menu);
        } catch (e) {
          console.warn("Note fetching menu:", e);
        } finally {
          setIsLoadingMenu(false);
        }
      } else {
        setSelectedMenu(null);
      }
    };
    fetchMenu();
  }, [viewingDetail]);

  const handleOpenQuoteRequest = async (chef: User) => {
    setIsLoadingMenusForQuote(true);
    try {
      const allMenus = await supabaseService.getAllMenusList();
      const chefMenus = allMenus.filter((m) => m.cookId === chef.id);
      setChefMenusForQuote(chefMenus);
      setSelectedChefForQuote(chef);
    } catch (e) {
      console.warn("Note fetching chef menus:", e);
      onNotify?.(tr("Erro ao carregar ementa do chef."), "error");
    } finally {
      setIsLoadingMenusForQuote(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        onNotify?.(tr("A imagem é demasiado grande. Máximo 2MB."), "error");
        return;
      }

      setUploading(true);
      try {
        const url = await supabaseService.uploadAvatar(user.id, file);
        if (!url) {
          onNotify?.(tr("Erro ao carregar imagem. Tenta novamente."), "error");
          return;
        }
        const finalUrl = url.startsWith("data:") ? url : `${url}?t=${Date.now()}`;

        // Update local state immediately
        const updatedUser = { ...user, avatar_url: finalUrl };
        setEditedUser(updatedUser);

        // Update database
        await supabaseService.updateUserProfile(user.id, {
          avatar_url: finalUrl,
        });

        // Refresh global state with override
        onRefresh(updatedUser);

        onNotify?.(tr("Foto de perfil atualizada!"), "success");
      } catch (err: any) {
        onNotify?.(
          tr("Erro: {v0}", { v0: err.message || "Não foi possível carregar a imagem" }),
          "error",
        );
      } finally {
        setUploading(false);
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (
      !window.confirm(tr("Tens a certeza que queres remover a tua foto de perfil?"))
    )
      return;

    setUploading(true);
    try {
      await supabaseService.updateUserProfile(user.id, { avatar_url: null });
      const updatedUser = { ...user, avatar_url: null };
      setEditedUser(updatedUser);
      onRefresh(updatedUser);
      onNotify?.(tr("Foto de perfil removida."), "success");
    } catch (err: any) {
      onNotify?.(tr("Erro ao remover foto."), "error");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const loadFavs = async () => {
      try {
        const favs = await supabaseService.getFavorites(user.id);
        setFavorites(favs);
      } catch (e) {}
    };
    loadFavs();
  }, [user.id]);

  const handleToggleFavorite = async (cookId: string) => {
    try {
      const isFav = await supabaseService.toggleFavorite(user.id, cookId);
      setFavorites((prev) =>
        isFav ? [...prev, cookId] : prev.filter((id) => id !== cookId),
      );
    } catch (e) {}
  };

  const handleQuickUpdateDietary = async (restriction: string) => {
    try {
      const currentRestrictions = user.dietary_restrictions || [];
      let newRestrictions: string[];
      if (currentRestrictions.includes(restriction)) {
        newRestrictions = currentRestrictions.filter((r) => r !== restriction);
      } else {
        newRestrictions = [...currentRestrictions, restriction];
      }
      
      const updatedUserCopy = { ...user, dietary_restrictions: newRestrictions };
      await supabaseService.updateUserProfile(user.id, { dietary_restrictions: newRestrictions });
      onRefresh(updatedUserCopy);
      // No notification needed for rapid in-page toggles as the state is clearly reflected visually
    } catch (e) {
      onNotify?.(tr("Erro ao atualizar restrições dietéticas."), "error");
    }
  };

  const handleQuickUpdateCuisine = async (cuisine: string) => {
    try {
      const currentCuisines = user.cuisine_preferences || [];
      let newCuisines: string[];
      if (currentCuisines.includes(cuisine)) {
        newCuisines = currentCuisines.filter((c) => c !== cuisine);
      } else {
        newCuisines = [...currentCuisines, cuisine];
      }
      
      const updatedUserCopy = { ...user, cuisine_preferences: newCuisines };
      await supabaseService.updateUserProfile(user.id, { cuisine_preferences: newCuisines });
      onRefresh(updatedUserCopy);
      // No notification needed for rapid in-page toggles as the state is clearly reflected visually
    } catch (e) {
      onNotify?.(tr("Erro ao atualizar preferências culinárias."), "error");
    }
  };

  const handleSaveProfile = async (silent = false) => {
    setIsSaving(true);
    try {
      await supabaseService.updateUserProfile(user.id, editedUser);
      if (!silent) {
        setIsEditing(false);
        onRefresh();
      }
    } catch (e: any) {
      if (!silent)
        onNotify?.(
          tr("Erro ao guardar perfil: {v0}", { v0: e.message || "Erro desconhecido" }),
          "error",
        );
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (
      !securityData.currentPassword ||
      !securityData.newPassword ||
      !securityData.confirmPassword
    ) {
      onNotify?.("Preencha todos os campos.", "error");
      return;
    }

    if (securityData.newPassword !== securityData.confirmPassword) {
      onNotify?.(tr("As novas palavras-passe não coincidem."), "error");
      return;
    }

    try {
      setIsSaving(true);
      await supabaseService.updatePassword(securityData.newPassword);
      onNotify?.(tr("Palavra-passe atualizada com sucesso no Supabase Auth!"), "success");
      setShowSecurityModal(false);
      setSecurityData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      onRefresh();
    } catch (e: any) {
      console.error("[ProfileDashboard] Erro ao atualizar palavra-passe:", e);
      onNotify?.(e?.message || "Erro ao atualizar palavra-passe no Supabase Auth.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsSaving(true);
      await supabaseService.deleteUser(user.id);
      onNotify?.(tr("Conta eliminada permanentemente."), "success");
      onNavigate("landing");
      window.location.reload();
    } catch (e) {
      onNotify?.(tr("Erro ao eliminar conta."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const addAddress = () => {
    const newAddress = {
      id: Math.random().toString(36).substr(2, 9),
      label: "Nova Morada",
      address: "",
      door_number: "",
      floor: "",
      zip_code: "",
      city: "Lisboa",
      isDefault: false,
    };
    const currentAddresses = editedUser.addresses || [];
    setEditedUser({
      ...editedUser,
      addresses: [...currentAddresses, newAddress],
    });
  };

  const removeAddress = async (id: string) => {
    setEditedUser((prev) => {
      const updatedAddresses = (prev.addresses || []).filter(
        (a) => String(a.id) !== String(id),
      );
      return { ...prev, addresses: updatedAddresses };
    });

    // Persistir imediatamente
    try {
      const updatedAddresses = (editedUser.addresses || []).filter(
        (a) => String(a.id) !== String(id),
      );
      await supabaseService.updateUserProfile(user.id, {
        addresses: updatedAddresses,
      });
      onRefresh();
    } catch (e) {
      onNotify?.(tr("Erro ao eliminar morada."), "error");
    }
  };

  const setPrimaryAddress = async (id: string) => {
    const updated = (editedUser.addresses || []).map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    const primary = updated.find((a) => a.id === id);
    if (primary) {
      const newUserState = {
        ...editedUser,
        addresses: updated,
        morada: primary.address,
        cidade: primary.city,
        localizacao: primary.city,
      };
      setEditedUser(newUserState);

      // Persistir imediatamente para ser real-time
      try {
        await supabaseService.updateUserProfile(user.id, newUserState);
        onRefresh();
      } catch (e) {
        onNotify?.(tr("Erro ao definir morada principal."), "error");
      }
    }
  };

  const updateAddressField = (id: string, field: string, value: string) => {
    const updated = (editedUser.addresses || []).map((a) =>
      a.id === id ? { ...a, [field]: value } : a,
    );
    setEditedUser({ ...editedUser, addresses: updated });
  };

  const togglePreference = (
    field: "dietary_restrictions" | "cuisine_preferences",
    value: string,
  ) => {
    const current = (editedUser[field] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setEditedUser({ ...editedUser, [field]: updated });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 pb-6 pt-2 md:pt-4 px-4 animate-in fade-in duration-700">
      {/* Profile Header */}
      <header className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100/80 shadow-[0_4px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_4px_40px_rgba(0,0,0,0.03)] transition-all duration-500 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 text-center md:text-left relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-orange-50 rounded-full -mr-24 -mt-24 md:-mr-32 md:-mt-32 blur-3xl opacity-50" />

        <div className="relative group shrink-0 z-10">
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-slate-50 border border-slate-100/80 shadow-[0_8px_24px_rgba(0,0,0,0.04)] overflow-hidden relative group cursor-pointer"
          >
            {editedUser.avatar_url && editedUser.avatar_url !== "" && !avatarError ? (
              <img
                src={editedUser.avatar_url}
                onError={() => setAvatarError(true)}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
                alt={tr("Avatar")}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-extrabold text-slate-400 bg-slate-100 text-2xl md:text-3xl">
                {(editedUser.nome || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ICONS.Camera className="text-white" size={20} />
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <ICONS.Clock
                  className="animate-spin text-orange-500"
                  size={20}
                />
              </div>
            )}
          </div>
          {editedUser.avatar_url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveAvatar();
              }}
              className="absolute -top-1 -right-1 w-8 h-8 bg-white text-red-500 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:bg-red-50 border border-slate-100 transition-all active:scale-90"
              title={tr("Remover foto")}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarUpload}
          className="hidden"
          accept="image/*"
        />

        <div className="flex-1 space-y-4 md:space-y-4 relative z-10 w-full">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="px-3 py-1 bg-orange-500/10 text-orange-600 border border-orange-200/50 text-[9px] font-extrabold uppercase rounded-full tracking-wider">
                {tr("Cliente Premium")}
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 border border-slate-200/50 text-[9px] font-extrabold uppercase rounded-full tracking-wider">
                <ICONS.Zap size={9} className="text-orange-500 shrink-0" />
                <span>{user.loyalty_points || 0} {tr("Pontos")}</span>
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight uppercase">
              {editedUser.nome}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              {editedUser.email}
            </p>
          </div>
          <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/40 w-full md:w-auto overflow-x-auto no-scrollbar gap-1">
            <button
              onClick={() => setActiveTab("bookings")}
              className={`flex-1 md:flex-none px-4 sm:px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === "bookings" ? "bg-white text-slate-950 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/20" : "text-slate-500 hover:text-slate-700"}`}
            >
              {tr("Reservas")}
            </button>
            <button
              onClick={() => setActiveTab("favorites")}
              className={`flex-1 md:flex-none px-4 sm:px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === "favorites" ? "bg-white text-slate-950 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/20" : "text-slate-500 hover:text-slate-700"}`}
            >
              {tr("Favoritos")}
            </button>
            <button
              onClick={() => setActiveTab("moradas")}
              className={`flex-1 md:flex-none px-4 sm:px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === "moradas" ? "bg-white text-slate-950 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/20" : "text-slate-500 hover:text-slate-700"}`}
            >
              {tr("Moradas")}
            </button>
            <button
              onClick={() => setActiveTab("loyalty")}
              className={`flex-1 md:flex-none px-4 sm:px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === "loyalty" ? "bg-white text-slate-950 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/20" : "text-slate-500 hover:text-slate-700"}`}
            >
              {tr("Pontos")}
            </button>
            <button
              onClick={() => setActiveTab("giftcards")}
              className={`flex-1 md:flex-none px-4 sm:px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === "giftcards" ? "bg-white text-slate-950 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/20" : "text-slate-500 hover:text-slate-700"}`}
            >
              {tr("Vouchers")}
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-1 md:flex-none px-4 sm:px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === "settings" ? "bg-white text-slate-950 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/20" : "text-slate-500 hover:text-slate-700"}`}
            >
              {tr("Informações")}
            </button>
          </div>
        </div>
      </header>

      {/* NEW: Client Loyalty Points Progress Widget */}
      {activeTab === "loyalty" && (
        <div id="loyalty-points-widget-card" className="bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-white border border-orange-100/60 rounded-3xl p-6 shadow-[0_4px_24px_rgba(249,115,22,0.02)] text-left flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(249,115,22,0.05)]">
          <div id="loyalty-widget-main" className="flex items-start gap-4 flex-1">
            <div id="loyalty-points-icon-ring" className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-[0_8px_16px_rgba(249,115,22,0.2)]">
              <ICONS.Zap size={22} fill="currentColor" />
            </div>
            <div id="loyalty-widget-content" className="space-y-1.5 flex-1">
              <div id="loyalty-widget-meta" className="flex items-center gap-2 flex-wrap">
                <span id="loyalty-badge-label" className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-100/50 px-2.5 py-0.5 rounded-full border border-orange-200/30">
                  {tr("Fidelidade Cookr")}
                </span>
                <span id="loyalty-meta-divider" className="text-slate-300 text-xs font-semibold">•</span>
                <span id="loyalty-meta-balance" className="text-xs font-bold text-slate-700">
                  {tr("Saldo atual:")} <span id="loyalty-points-span" className="text-orange-600 font-extrabold">{user.loyalty_points || 0} {tr("Pts")}</span>
                </span>
              </div>
              
              {/* Dynamic tier calculation and progress bar */}
              {(() => {
                const currentPoints = user.loyalty_points || 0;
                const LOYALTY_TIERS = [
                  { name: "Bronze", targetPoints: 100, label: "Próximo nível: Silver (100 pts)" },
                  { name: "Silver", targetPoints: 250, label: "Próximo nível: VIP Gold (250 pts)" },
                  { name: "Gold", targetPoints: 500, label: "Próximo nível: VIP Gold Plus (500 pts)" },
                  { name: "Platinum VIP", targetPoints: 1000, label: "Nível VIP Máximo (1000 pts)" }
                ];
                
                // Find first target points that is greater than current points
                const targetTier = LOYALTY_TIERS.find(t => currentPoints < t.targetPoints) || LOYALTY_TIERS[LOYALTY_TIERS.length - 1];
                const isMaxPoints = currentPoints >= targetTier.targetPoints;
                
                const percent = isMaxPoints ? 100 : Math.min(100, (currentPoints / targetTier.targetPoints) * 100);
                const pointsNeeded = targetTier.targetPoints - currentPoints;
                
                return (
                  <div id="loyalty-bar-container" className="space-y-2">
                    <div id="loyalty-bar-labels" className="flex items-baseline justify-between text-xs font-bold text-slate-800">
                      <span id="loyalty-points-needed-text" className="text-slate-900 font-black tracking-tight text-xs uppercase italic">
                        {isMaxPoints ? tr("Nível de Elite Alcançado!") : `Faltam ${pointsNeeded} pontos para o próximo nível (${targetTier.name})`}
                      </span>
                      <span id="loyalty-percentage-text" className="text-orange-600 text-xs font-extrabold">{Math.round(percent)}%</span>
                    </div>
                    
                    {/* Progress bar */}
                    <div id="loyalty-progress-track" className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
                      <div 
                        id="loyalty-progress-fill" 
                        className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 transition-all duration-1000 shadow-[0_0_8px_rgba(249,115,22,0.3)]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    
                    <p id="loyalty-incentive-text" className="text-[10px] text-slate-400 font-medium">
                      {isMaxPoints 
                        ? tr("Parabéns! Desbloqueou todas as vantagens do clube de fidelidade Cookr.") 
                        : `Atingir os ${targetTier.targetPoints} pontos garante descontos automáticos e experiências gastronómicas premium.`}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
          
          {/* Quick info actions */}
          <div id="loyalty-widget-actions" className="flex md:flex-col gap-2 w-full md:w-auto shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
            <button
              id="loyalty-rewards-btn"
              type="button"
              onClick={() => setActiveTab("loyalty")}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] cursor-pointer"
            >
              <ICONS.Gift size={13} />
              {tr("Ver Recompensas")}
            </button>
          </div>
        </div>
      )}



      {activeTab === "bookings" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
              {tr("Histórico de Pedidos")}
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/50">
              {filteredBookingsList.length} {filteredBookingsList.length === 1 ? tr("Operação") : tr("Operações")}
            </span>
          </div>

          {/* Elegant Filter Panel */}
          <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 md:p-5 space-y-4 text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Type Filter */}
              <div className="space-y-1.5 flex-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                  {tr("Filtrar por Categoria")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "all", label: "Todos", icon: null },
                    { id: "ritual", label: "Rituais", icon: <ICONS.Sparkles size={11} className="shrink-0" /> },
                    { id: "dish", label: "Pratos", icon: <ICONS.Utensils size={11} className="shrink-0" /> },
                    { id: "daily", label: "Daily (Meal prep)", icon: <ICONS.Calendar size={11} className="shrink-0" /> },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setFilterType(t.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all duration-300 flex items-center gap-1.5 ${
                        filterType === t.id
                          ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100/50"
                      }`}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Period Filter */}
              <div className="space-y-1.5 flex-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                  {tr("Filtrar por Período")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "all", label: "Todo o tempo" },
                    { id: "this_month", label: "Este Mês" },
                    { id: "last_30", label: "30 Dias" },
                    { id: "last_90", label: "90 Dias" },
                    { id: "custom", label: "Personalizado" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setFilterPeriod(p.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all duration-300 ${
                        filterPeriod === p.id
                          ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100/50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Dates Fields if selected */}
            {filterPeriod === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">{tr("De:")}</span>
                  <input
                    type="date"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">{tr("Até:")}</span>
                  <input
                    type="date"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredBookingsList.length > 0 ? (
              filteredBookingsList.map((b) => (
                <div
                  key={b.id}
                  className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100/80 hover:border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group relative overflow-hidden"
                >
                  <div className="flex-1 text-left space-y-2.5">
                    <div className="flex items-center flex-wrap gap-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider text-white shadow-sm ${
                          b.status === BookingStatus.COMPLETED
                            ? "bg-emerald-500"
                            : b.status === BookingStatus.CANCELLED ||
                                b.status === BookingStatus.REJECTED
                              ? "bg-red-500"
                              : "bg-orange-500"
                        }`}
                      >
                        {b.status}
                      </span>
                      <div className="flex items-center gap-1 text-slate-400">
                        <ICONS.Calendar size={11} className="text-slate-400 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {b.data} {tr("às")} {b.hora}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg md:text-xl font-bold text-slate-950 uppercase tracking-tight group-hover:text-orange-500 transition-colors leading-tight">
                        {b.menu_selected}
                      </h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {tr("Chef")} {b.cookName}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        {tr("Total Pago")}
                      </p>
                      <p className="text-base md:text-lg font-black text-slate-950 tracking-tight">
                        {formatPrice(b.valorTotal)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setViewingDetail(b)}
                        className="h-11 px-5 bg-slate-50 border border-slate-250 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 text-slate-800 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-sm"
                      >
                        {tr("Detalhes")}
                      </button>
                      {(b.status === BookingStatus.PENDING ||
                        b.status === BookingStatus.ACCEPTED) && (
                        <button
                          onClick={() => {
                            setSelectedBookingForCancellation(b);
                            setIsCancellationModalOpen(true);
                          }}
                          className="h-11 px-5 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-sm"
                        >
                          {tr("Cancelar")}
                        </button>
                      )}
                      <button
                        onClick={() =>
                          onOpenChat(
                            b.cookId,
                            [
                              BookingStatus.COMPLETED,
                              BookingStatus.CANCELLED,
                              BookingStatus.REJECTED,
                            ].includes(b.status),
                          )
                        }
                        className="w-11 h-11 bg-slate-900 hover:bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-md hover:shadow-orange-500/15 transition-all active:scale-95"
                        title={tr("Mensagem")}
                      >
                        <ICONS.MessageSquare
                          size={15}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-100/80 flex flex-col items-center justify-center gap-4 px-6 max-w-sm mx-auto">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-300 border border-slate-100 shadow-sm">
                  <ICONS.Calendar size={20} className="text-slate-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">{tr("Sem Registos")}</h4>
                  <p className="text-[11px] text-slate-400 font-medium pb-2">
                    {tr("Nenhum pedido encontrado no histórico para os filtros selecionados.")}
                  </p>
                  <button
                    onClick={handleImportDemoBookings}
                    disabled={isImporting}
                    className="mt-3 inline-flex items-center gap-2 h-10 px-5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all shadow-md shadow-orange-500/10 active:scale-95 cursor-pointer"
                  >
                    <RefreshCw size={12} className={isImporting ? "animate-spin" : ""} />
                    {isImporting ? tr("Sincronizando...") : tr("Sincronizar reservas demo")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "favorites" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-orange-500/10 text-orange-600 border border-orange-200/50 rounded-lg flex items-center justify-center shadow-sm">
                  <ICONS.Heart size={16} className="fill-orange-600 text-orange-600" />
                </div>
                <h3 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">
                  {tr("Meus")} <span className="text-orange-500">{tr("Favoritos")}</span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {tr("A tua curadoria pessoal dos melhores talentos gastronómicos.")}
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4">
              <div className="flex -space-x-2">
                {favorites.slice(0, 3).map((favId, i) => {
                  const chef = allUsers.find((u) => u.id === favId);
                  return (
                    <div
                      key={favId}
                      className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm"
                      style={{ zIndex: 3 - i }}
                    >
                      {chef?.avatar_url && chef.avatar_url !== "" ? (
                        <img
                          src={chef.avatar_url}
                          className="w-full h-full object-cover"
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${favId}`}
                          className="w-full h-full object-cover"
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                  );
                })}
                {favorites.length > 3 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-950 flex items-center justify-center text-[9px] font-extrabold text-white shadow-sm z-0">
                    +{favorites.length - 3}
                  </div>
                )}
              </div>
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
              <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  {tr("Total")}
                </span>
                <span className="text-xs font-black text-slate-800">
                  {favorites.length}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favorites.length > 0 ? (
              favorites.map((favId) => {
                const chef = allUsers.find((u) => u.id === favId);
                if (!chef) return null;
                return (
                  <div
                    key={favId}
                    className="group relative bg-white rounded-2xl border border-slate-100/90 hover:border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    {/* Card Header/Image - Compact */}
                    <div
                      className="relative aspect-square overflow-hidden cursor-pointer"
                      onClick={() => onSelectChef(favId)}
                    >
                      {chef.avatar_url ? (
                        <img
                          src={chef.avatar_url}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                          alt={chef.nome}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 font-extrabold text-slate-300 text-2xl uppercase">
                          {(chef.nome || "C").charAt(0)}
                        </div>
                      )}

                      {/* Overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-50 group-hover:opacity-75 transition-opacity" />

                      {/* Status Badge & Top Rated Badge */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                        {chef.isAvailable ? (
                          <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
                          </span>
                        ) : (
                          <div className="w-2.5 h-2.5 bg-slate-400 rounded-full border border-white shadow-sm" />
                        )}

                        {((chef.rating === undefined ? 5.0 : chef.rating) >= 4.7) && (
                          <span className="px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[7px] font-black uppercase tracking-wider rounded-full shadow-sm flex items-center gap-0.5 border border-amber-200">
                            <ICONS.Star size={8} className="fill-slate-950 text-slate-950 shrink-0" />
                            <span>{tr("Top Chef")}</span>
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(favId);
                        }}
                        className="absolute top-2.5 right-2.5 w-7.5 h-7.5 bg-white/90 backdrop-blur-md text-red-500 hover:text-white hover:bg-red-500 rounded-full flex items-center justify-center shadow-sm border border-slate-100 transition-all duration-300 active:scale-90"
                      >
                        <ICONS.Heart size={12} className="fill-current text-red-500 group-hover/btn:scale-110 active:scale-90" />
                      </button>

                      {/* Bottom Info Overlay - Compact */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <ICONS.Star
                            size={9}
                            fill="#fb923c"
                            className="text-orange-400"
                          />
                          <span className="text-[10px] font-black text-white">
                            {chef.rating?.toFixed(1) || "5.0"}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-tight leading-tight truncate">
                          {chef.nome}
                        </h4>
                      </div>
                    </div>

                    {/* Card Content/Actions - Compact */}
                    <div className="p-3 space-y-2.5 bg-white flex-1 flex flex-col justify-between">
                      <div className="flex flex-wrap gap-1">
                        {chef.especialidades?.slice(0, 2).map((esp) => (
                          <span
                            key={esp}
                            className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[8px] font-medium uppercase tracking-wider rounded-md border border-slate-100"
                          >
                            {esp}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 w-full mt-auto pt-1">
                        <button
                          onClick={() => handleOpenQuoteRequest(chef)}
                          disabled={isLoadingMenusForQuote}
                          className="flex-grow min-w-0 h-11 bg-slate-950 hover:bg-orange-500 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-1.5 px-2.5 disabled:opacity-50 shadow-md hover:shadow-orange-500/10 cursor-pointer"
                        >
                          {isLoadingMenusForQuote &&
                          selectedChefForQuote?.id === chef.id ? (
                            <ICONS.RefreshCw
                              className="animate-spin shrink-0 text-orange-400"
                              size={14}
                            />
                          ) : (
                            <ICONS.FileText className="shrink-0 text-orange-400" size={14} />
                          )}
                          <span className="truncate">{tr("Orçamento")}</span>
                        </button>
                        <button
                          onClick={() => onOpenChat(favId)}
                          className="w-11 h-11 shrink-0 bg-slate-50 border border-slate-200/80 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 text-slate-800 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-[0.98] shadow-sm cursor-pointer hover:shadow-md"
                          title={tr("Falar com Chef")}
                        >
                          <ICONS.MessageSquare className="shrink-0 text-slate-500 group-hover:text-orange-600" size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 md:py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-100/80 flex flex-col items-center justify-center gap-4 px-6 max-w-sm mx-auto">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-300 border border-slate-100 shadow-sm">
                  <ICONS.Heart size={20} className="text-slate-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">{tr("Sem Favoritos")}</h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {tr("Explora a nossa seleção de chefs e guarda os teus preferidos para acesso rápido.")}
                  </p>
                </div>
                <button
                  onClick={() => onNavigate("home")}
                  className="h-11 px-6 bg-slate-950 hover:bg-orange-500 text-white rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center"
                >
                  {tr("Explorar Talentos")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "moradas" && (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center justify-between px-2 md:px-4">
            <div className="space-y-1">
              <span className="text-[9px] font-extrabold text-orange-500 uppercase tracking-widest block">
                Privacidade & Logística
              </span>
              <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-slate-950 leading-none">
                {tr("Gestão de Moradas.")}
              </h3>
            </div>
            
            <button
              onClick={addAddress}
              className="relative group overflow-hidden px-5 py-3 bg-slate-950 text-white rounded-2xl flex items-center gap-2 shadow-md hover:shadow-[0_12px_24px_-6px_rgba(249,115,22,0.35)] hover:bg-orange-500 transition-all duration-300 active:scale-95"
            >
              <ICONS.Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="text-[10px] font-black uppercase tracking-widest">{tr("Nova Morada")}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:gap-8">
            {(editedUser.addresses || []).map((addr) => (
              <div
                key={addr.id}
                className={`p-6 md:p-10 rounded-[2rem] border transition-all relative overflow-hidden group ${
                  addr.isDefault 
                    ? "bg-gradient-to-br from-white to-orange-500/[0.015] border-orange-500/25 shadow-[0_20px_50px_-15px_rgba(249,115,22,0.08)] hover:border-orange-500/40" 
                    : "bg-white border-slate-200/60 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.02)] hover:border-slate-300/80 hover:shadow-[0_20px_45px_-10px_rgba(0,0,0,0.045)]"
                } duration-500`}
              >
                {addr.isDefault && (
                  <div className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 text-orange-600 border border-orange-200/40 text-[9px] font-extrabold uppercase rounded-full tracking-wider shadow-inner">
                    <ICONS.Sparkles size={10} className="text-orange-500 shrink-0" />
                    <span>{tr("Principal")}</span>
                  </div>
                )}

                <div className="flex flex-col gap-6 md:gap-8">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0 ${
                          addr.isDefault 
                            ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                            : "bg-slate-50 text-slate-400 border border-slate-100"
                        }`}
                      >
                        <ICONS.Home size={18} className="md:w-5 md:h-5" />
                      </div>
                      <div className="space-y-0.5 md:space-y-1 flex-1 min-w-0">
                        <input
                          className="bg-transparent font-black text-lg md:text-2xl text-slate-950 uppercase italic tracking-tighter outline-none w-full focus:text-orange-500 border-b border-transparent focus:border-slate-150 transition-all truncate pb-0.5"
                          value={addr.label}
                          onChange={(e) =>
                            updateAddressField(
                              addr.id!,
                              "label",
                              e.target.value,
                            )
                          }
                          placeholder={tr("Ex: Casa / Escritório")}
                        />
                        <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">
                          {tr("Etiqueta da Morada")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!addr.isDefault && (
                        <button
                          onClick={() => setPrimaryAddress(addr.id!)}
                          className="hidden md:flex px-5 py-2.5 bg-slate-950 hover:bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm hover:shadow-[0_8px_20px_-6px_rgba(249,115,22,0.2)] active:scale-95 items-center gap-1.5"
                        >
                          <ICONS.Sparkles size={10} className="text-orange-400 shrink-0" />
                          <span>{tr("Definir Principal")}</span>
                        </button>
                      )}
                      <button
                        onClick={() => removeAddress(addr.id!)}
                        className="w-10 h-10 md:w-11 md:h-11 bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all duration-300 shadow-xs active:scale-90"
                        title={tr("Remover Morada")}
                      >
                        <ICONS.Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {!addr.isDefault && (
                    <button
                      onClick={() => setPrimaryAddress(addr.id!)}
                      className="md:hidden w-full py-3 bg-slate-950 text-white text-[9px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all shadow-sm hover:bg-orange-500"
                    >
                      {tr("Definir como Morada Principal")}
                    </button>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-12 gap-4 md:gap-6">
                    <div className="col-span-2 md:col-span-8 space-y-2">
                      <label className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest ml-1 block">
                        {tr("Rua / Avenida")}
                      </label>
                      <div className="relative group/input flex items-center">
                        <ICONS.MapPin
                          className="absolute left-4 text-slate-300 group-focus-within/input:text-orange-500 group-focus-within/input:scale-105 transition-all duration-300 pointer-events-none"
                          size={14}
                        />
                        <GoogleAddressAutocomplete
                          theme="light"
                          className="w-full h-11 md:h-12 pl-11 pr-4 bg-slate-50/40 hover:bg-slate-50 rounded-xl md:rounded-2xl font-semibold text-xs md:text-sm outline-none border border-slate-200/50 focus:border-orange-500/60 focus:bg-white transition-all duration-300 shadow-inner"
                          value={addr.address || ""}
                          onChange={(val) =>
                            updateAddressField(
                              addr.id!,
                              "address",
                              val,
                            )
                          }
                          onAddressSelect={(addressData) => {
                            const updated = (editedUser.addresses || []).map((a) =>
                              a.id === addr.id
                                ? {
                                    ...a,
                                    address: addressData.address || a.address,
                                    door_number: addressData.door_number || a.door_number,
                                    zip_code: addressData.zip_code ? formatPostalCode(addressData.zip_code) : a.zip_code,
                                    city: addressData.city || a.city,
                                  }
                                : a
                            );
                            setEditedUser({ ...editedUser, addresses: updated });
                          }}
                          placeholder={tr("Nome da rua, praça ou avenida...")}
                        />
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest ml-1 block">
                        Nº
                      </label>
                      <div className="relative group/input">
                        <input
                          className="w-full h-11 md:h-12 px-4 bg-slate-50/40 hover:bg-slate-50 rounded-xl md:rounded-2xl font-semibold text-xs md:text-sm outline-none border border-slate-200/50 focus:border-orange-500/60 focus:bg-white transition-all duration-300 shadow-inner text-center"
                          value={addr.door_number || ""}
                          onChange={(e) =>
                            updateAddressField(
                              addr.id!,
                              "door_number",
                              e.target.value,
                            )
                          }
                          placeholder="123"
                        />
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest ml-1 block">
                        {tr("Andar")}
                      </label>
                      <div className="relative group/input">
                        <input
                          className="w-full h-11 md:h-12 px-4 bg-slate-50/40 hover:bg-slate-50 rounded-xl md:rounded-2xl font-semibold text-xs md:text-sm outline-none border border-slate-200/50 focus:border-orange-500/60 focus:bg-white transition-all duration-300 shadow-inner text-center"
                          value={addr.floor || ""}
                          onChange={(e) =>
                            updateAddressField(addr.id!, "floor", e.target.value)
                          }
                          placeholder={tr("2º Esq")}
                        />
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-4 space-y-2">
                      <label className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest ml-1 block">
                        {tr("Código Postal")}
                      </label>
                      <div className="relative group/input">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={8}
                          className="w-full h-11 md:h-12 px-4 bg-slate-50/40 hover:bg-slate-50 rounded-xl md:rounded-2xl font-semibold text-xs md:text-sm outline-none border border-slate-200/50 focus:border-orange-500/60 focus:bg-white transition-all duration-300 shadow-inner"
                          value={addr.zip_code || ""}
                          onChange={(e) =>
                            updateAddressField(
                              addr.id!,
                              "zip_code",
                              formatPostalCode(e.target.value),
                            )
                          }
                          placeholder="1000-001"
                        />
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-8 space-y-2">
                      <label className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest ml-1 block">
                        {tr("Cidade / Distrito")}
                      </label>
                      <div className="relative group/select">
                        <select
                          className="w-full h-11 md:h-12 px-4 bg-slate-50/40 hover:bg-slate-50 rounded-xl md:rounded-2xl font-semibold text-xs md:text-sm outline-none border border-slate-200/50 focus:border-orange-500/60 focus:bg-white transition-all duration-300 shadow-inner appearance-none cursor-pointer"
                          value={addr.city || ""}
                          onChange={(e) =>
                            updateAddressField(addr.id!, "city", e.target.value)
                          }
                        >
                          {PORTUGAL_CITIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <ICONS.ChevronDown
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/select:text-orange-500 group-focus-within/select:rotate-180 transition-all duration-300 pointer-events-none"
                          size={14}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <button
              onClick={() => handleSaveProfile()}
              disabled={isSaving}
              className="w-full h-14 relative group overflow-hidden bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 transition-all duration-500 ease-out shadow-lg hover:shadow-[0_12px_30px_-6px_rgba(249,115,22,0.4)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <ICONS.RefreshCw className="animate-spin text-orange-400" size={14} />
                  <span>{tr("A Guardar Alterações...")}</span>
                </>
              ) : (
                <>
                  <ICONS.MapPin size={14} className="text-orange-400 group-hover:text-white transition-colors duration-300" />
                  <span>{tr("Guardar Definições de Morada")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === "loyalty" && (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Points Overview Card */}
          <div className="bg-slate-950 p-6 md:p-12 rounded-[2.5rem] md:rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-slate-950/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full -mr-32 -mt-32 blur-[100px] opacity-20" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 rounded-full -ml-24 -mb-24 blur-[80px] opacity-10" />

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="space-y-4 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                    <ICONS.Zap size={14} className="text-orange-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {tr("Programa de Fidelidade")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPointsInfoModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 transition-all duration-300 backdrop-blur-md rounded-full border border-white/15 text-[10px] font-black uppercase tracking-widest text-orange-400 hover:text-orange-300 cursor-pointer"
                  >
                    <ICONS.Info size={14} />
                    <span>{tr("Como Funciona?")}</span>
                  </button>
                </div>
                <div className="space-y-1">
                  <h3 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
                    {user.loyalty_points || 0}{" "}
                    <span className="text-orange-500">{tr("Pts.")}</span>
                  </h3>
                  <p className="text-xs md:text-sm font-medium text-slate-400 italic">
                    {tr("Equivalente a")}{" "}
                    {formatPrice((user.loyalty_points || 0) * 0.01)} {tr("em descontos.")}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full md:w-auto">
                <div className="p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/5 space-y-2">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                    {(user.loyalty_points || 0) >= 500
                      ? tr("Nível Atual")
                      : tr("Próximo Nível")}
                  </p>
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-sm font-black italic uppercase">
                      {tr("VIP Gold")}
                    </span>
                    {(user.loyalty_points || 0) < 500 ? (
                      <span className="text-xs font-bold text-orange-500">
                        {500 - (user.loyalty_points || 0)} {tr("pts para atingir")}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-500">
                        {tr("Nível Atingido!")}
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all duration-1000"
                      style={{
                        width: `${Math.min(100, ((user.loyalty_points || 0) / 500) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* History Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-950">
                {tr("Histórico de Pontos.")}
              </h3>
              <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest">
                {loyaltyHistory.length} {tr("Movimentos")}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {loyaltyHistory.length > 0 ? (
                loyaltyHistory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.type === "earn" ? "bg-emerald-50 text-emerald-500" : "bg-orange-50 text-orange-500"}`}
                      >
                        {item.type === "earn" ? (
                          <ICONS.ArrowUpRight size={20} />
                        ) : (
                          <ICONS.ArrowDownRight size={20} />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-black text-slate-950 uppercase italic tracking-tight">
                          {item.description}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {new Date(item.created_at).toLocaleDateString(
                            "pt-PT",
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-lg font-black italic ${item.type === "earn" ? "text-emerald-500" : "text-orange-500"}`}
                      >
                        {item.type === "earn" ? "+" : "-"}
                        {item.points}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-4 opacity-30">
                  <ICONS.Zap size={40} />
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] italic">
                    {tr("Ainda não tens movimentos de pontos.")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Perks Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`p-6 rounded-[2rem] border transition-all ${(user.loyalty_points || 0) >= 500 ? "bg-emerald-50 border-emerald-100" : "bg-white border-slate-100 opacity-60"}`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${(user.loyalty_points || 0) >= 500 ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}
                >
                  <ICONS.Percent size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase italic tracking-tight">
                    {tr("Taxa de Reserva Reduzida")}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {tr("Benefício VIP GOLD")}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 font-medium italic leading-relaxed">
                {tr("Como membro VIP GOLD, usufruis de taxas de serviço reduzidas em todas as tuas reservas.")}
              </p>
            </div>

            <div
              className={`p-6 rounded-[2rem] border transition-all ${(user.loyalty_points || 0) >= 500 ? "bg-blue-50 border-blue-100" : "bg-white border-slate-100 opacity-60"}`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${(user.loyalty_points || 0) >= 500 ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-400"}`}
                >
                  <ICONS.ChefHat size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase italic tracking-tight">
                    {tr("Acesso Prioritário")}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {tr("Benefício VIP GOLD")}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 font-medium italic leading-relaxed">
                {tr("Acesso exclusivo e antecipado a menus sazonais de Chefs Michelin e eventos gastronómicos de elite.")}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "giftcards" && (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-750">
          <div className="bg-gradient-to-br from-white to-[#fbfbfa] p-6 md:p-14 rounded-[2.5rem] md:rounded-[4rem] border border-slate-200/55 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.02)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/[0.015] rounded-full -mr-40 -mt-40 blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-10">
              <div className="text-center max-w-xl mx-auto space-y-3">
                <span className="px-3 py-1 bg-orange-500/10 text-orange-600 rounded-full text-[9px] font-black uppercase tracking-widest inline-block">
                  {tr("Oferecer Cookr")}
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                  Vales de Oferta & Experiências
                </h2>
                <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
                  {tr("Surpreenda quem mais ama com uma jornada gastronómica inesquecível de Chef Privado no conforto do seu lar.")}
                </p>
              </div>

              {/* Catalog Section */}
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 text-left">
                  {tr("1. Escolha uma Experiência")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    {
                      nome: "Jantar Romântico para Dois",
                      preco: 150,
                      pax: 2,
                      descricao: "Menu premium de 3 pratos confecionado ao vivo por um Chef privado. Perfeito para aniversários de casamento ou momentos especiais.",
                      image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=600"
                    },
                    {
                      nome: "Workshop de Sushi Premium",
                      preco: 200,
                      pax: 2,
                      descricao: "Aula técnica interativa de sushiman com 3 horas de duração, incluindo ingredientes frescos de alta qualidade e degustação harmonizada.",
                      image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=600"
                    },
                    {
                      nome: "Brunch Gourmet em Família",
                      preco: 120,
                      pax: 4,
                      descricao: "Brunch sumptuoso com pastelaria fina, ovos beneditinos e sumos prensados a frio, preparado de raiz num domingo memorável.",
                      image: "https://images.unsplash.com/photo-1513442542250-854d436a73f2?auto=format&fit=crop&q=80&w=600"
                    },
                    {
                      nome: "Experiência Chef's Table",
                      preco: 250,
                      pax: 2,
                      descricao: "O expoente máximo da alta cozinha. Menu de degustação requintado de 5 pratos com histórias partilhadas pessoalmente pelo Chef.",
                      image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600"
                    }
                  ].map((exp, idx) => (
                    <div key={idx} className="group bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row gap-5">
                      <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden shrink-0 relative bg-slate-100">
                        <img src={exp.image} alt={exp.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                        <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 bg-white/90 backdrop-blur rounded text-[8px] font-bold text-slate-800 uppercase">
                          {exp.pax} {tr("Pax")}
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-between text-left space-y-3">
                        <div className="space-y-1">
                          <h4 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                            {exp.nome}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                            {exp.descricao}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-lg font-black text-slate-900">
                            {formatPrice(exp.preco)}
                          </span>
                          <button
                            onClick={() => setSelectedGiftExperience(exp)}
                            className="h-8 px-4 bg-slate-950 hover:bg-orange-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                          >
                            {tr("Oferecer")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* My Vouchers Section */}
              <div className="space-y-6 pt-10 border-t border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 text-left">
                  {tr("Os Meus Vouchers (")}{giftCards.length})
                </h3>
                {isLoadingGiftCards ? (
                  <div className="text-center py-10">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3">{tr("A carregar vouchers...")}</p>
                  </div>
                ) : giftCards.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-3">
                    <div className="w-10 h-10 bg-slate-200/50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                      <ICONS.Gift size={18} />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">{tr("Ainda não tem Vales de Oferta adquiridos ou recebidos.")}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{tr("Os vales que comprar ou que forem oferecidos para o seu email aparecerão listados aqui.")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {giftCards.map((card, idx) => {
                      const isBuyer = card.buyerEmail === user.email;
                      return (
                        <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
                          {/* Ticket notch circles */}
                          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#fbfbfa] border border-slate-100 rounded-full z-10" />
                          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#fbfbfa] border border-slate-100 rounded-full z-10" />
                          
                          <div className="flex justify-between items-start text-left">
                            <div className="space-y-2">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                card.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-400 line-through'
                              }`}>
                                {card.status === 'active' ? tr("Ativo / Disponível") : tr("Resgatado")}
                              </span>
                              <h4 className="text-base font-extrabold text-slate-800 leading-none pt-1">
                                {card.experienceName}
                              </h4>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {tr("Valor:")} {formatPrice(card.value)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest leading-none mb-1">
                                {tr("Código do Vale")}
                              </p>
                              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                                <span className="font-mono text-xs font-bold text-slate-800 select-all tracking-wider">
                                  {card.code}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(card.code);
                                    if (onNotify) onNotify(tr("Código copiado!"), "success");
                                  }}
                                  className="text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                                  title={tr("Copiar Código")}
                                >
                                  <ICONS.Check size={10} />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="h-px bg-dashed border-t border-slate-200/50 my-4 relative z-0" />

                          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left">
                            <div>
                              <p className="text-[7px] text-slate-300">{tr("Oferecido a")}</p>
                              <p className="text-slate-700">{card.recipientName} ({card.recipientEmail})</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[7px] text-slate-300">{tr("Tipo de Envio")}</p>
                              <p className="text-orange-500">{isBuyer ? tr("Comprado por Si") : tr("Recebido de Oferta")}</p>
                            </div>
                          </div>

                          {card.message && (
                            <div className="mt-3.5 bg-slate-50 rounded-xl p-3 text-left">
                              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mb-1">{tr("Dedicatória")}</p>
                              <p className="text-[10px] text-slate-600 font-medium italic">"{card.message}"</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Purchasing Modal */}
          {selectedGiftExperience && (
            <div className="fixed inset-0 z-[150] overflow-y-auto flex items-start sm:items-center justify-center p-4 md:p-10 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500 relative overflow-hidden my-auto text-left space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest block">{tr("Adquirir Voucher")}</span>
                    <h3 className="text-xl font-bold text-slate-950">{selectedGiftExperience.nome}</h3>
                    <p className="text-xs font-semibold text-slate-500">{formatPrice(selectedGiftExperience.preco)} ({selectedGiftExperience.pax} {tr("Pax)")}</p>
                  </div>
                  <button
                    onClick={() => setSelectedGiftExperience(null)}
                    className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-950 transition-colors cursor-pointer"
                  >
                    <ICONS.X size={14} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider ml-1">{tr("Nome do Destinatário")}</label>
                      <input
                        type="text"
                        placeholder={tr("Nome de quem recebe")}
                        value={giftRecipientName}
                        onChange={(e) => setGiftRecipientName(e.target.value)}
                        className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider ml-1">{tr("E-mail do Destinatário")}</label>
                      <input
                        type="email"
                        placeholder={tr("email@exemplo.pt")}
                        value={giftRecipientEmail}
                        onChange={(e) => setGiftRecipientEmail(e.target.value)}
                        className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider ml-1">{tr("Dedicatória Especial")}</label>
                    <textarea
                      placeholder={tr("Escreva uma mensagem carinhosa...")}
                      value={giftMessage}
                      onChange={(e) => setGiftMessage(e.target.value)}
                      className="w-full h-20 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
                  <div className="flex justify-between text-xs font-bold text-slate-800">
                    <span>{tr("Subtotal")}</span>
                    <span>{formatPrice(selectedGiftExperience.preco)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>{tr("Taxa de Envio Digital")}</span>
                    <span className="text-emerald-600 font-black uppercase">{tr("Grátis")}</span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex justify-between text-base font-black text-slate-900">
                    <span>{tr("Total")}</span>
                    <span>{formatPrice(selectedGiftExperience.preco)}</span>
                  </div>
                </div>

                <button
                  onClick={handlePurchaseGiftCard}
                  disabled={isPurchasingGift}
                  className="w-full h-12 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                >
                  {isPurchasingGift ? (
                    tr("A processar compra...")
                  ) : (
                    <>
                      <ICONS.CreditCard size={12} />
                      {tr("Comprar e Oferecer")}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-750">
          <div className="bg-gradient-to-br from-white to-[#fbfbfa] p-6 md:p-14 rounded-[2.5rem] md:rounded-[4rem] border border-slate-200/55 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.02)] relative overflow-hidden">
            {/* Elegant Luxury Accents */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/[0.015] rounded-full -mr-40 -mt-40 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-slate-500/[0.01] rounded-full -ml-40 -mb-40 blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-12">
              <div className="flex flex-col md:flex-row justify-between items-center md:items-center gap-6 text-center md:text-left border-b border-slate-100 pb-8">
                <div className="space-y-2">
                  <span className="text-[9px] font-extrabold text-orange-500 uppercase tracking-[0.25em] block leading-none">
                    {tr("Área de Cliente")}
                  </span>
                  <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-slate-950 leading-none">
                    {tr("Informações de")}{" "}
                    <span className="text-orange-500">{tr("Perfil.")}</span>
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest italic">
                    {tr("Gere as tuas informações e preferências gastronómicas.")}
                  </p>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-3">
                    <span className="px-3 py-1 bg-slate-950 text-[#d4af37] border border-[#d4af37]/20 text-[8px] font-black uppercase rounded-full tracking-[0.2em] shadow-sm flex items-center gap-1.5">
                      <ICONS.Sparkles size={9} className="text-[#d4af37]" />
                      {tr("Cliente Premium")}
                    </span>
                    <span className="px-3 py-1 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-600 border border-orange-100/30 text-[8px] font-black uppercase rounded-full tracking-[0.15em] flex items-center gap-1 shadow-sm">
                      <ICONS.Zap size={10} className="text-orange-500" />
                      {user.loyalty_points || 0} {tr("Pontos acum.")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() =>
                    isEditing ? handleSaveProfile() : setIsEditing(true)
                  }
                  className={`w-full md:w-auto px-8 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-md active:scale-95 flex items-center justify-center gap-2.5 ${
                    isEditing
                      ? "bg-orange-500 text-white shadow-[0_10px_25px_-6px_rgba(249,115,22,0.45)] hover:bg-slate-950"
                      : "bg-slate-950 text-white shadow-[0_10px_25px_-6px_rgba(15,23,42,0.3)] hover:bg-orange-500 hover:shadow-[0_10px_25px_-6px_rgba(249,115,22,0.3)]"
                  }`}
                >
                  {isEditing ? (
                    <>
                      <ICONS.Check size={14} className="animate-bounce" />
                      {tr("Guardar Alterações")}
                    </>
                  ) : (
                    <>
                      <ICONS.Edit3 size={14} />
                      {tr("Editar Perfil")}
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                {/* Profile Photo Section (New) */}
                <div className="md:col-span-2 bg-[#fdfdfc] p-6 md:p-8 rounded-[2rem] border border-slate-200/50 flex flex-col md:flex-row items-center gap-6 md:gap-8 group hover:bg-white hover:border-orange-500/15 hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.035)] transition-all duration-500">
                  <div className="relative group/avatar shrink-0">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-[1.75rem] md:rounded-[2.25rem] bg-white border-4 border-white shadow-[0_15px_35px_-8px_rgba(0,0,0,0.07)] overflow-hidden relative">
                      {editedUser.avatar_url && editedUser.avatar_url !== "" ? (
                        <>
                          <img
                            src={editedUser.avatar_url}
                            className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-700"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement?.querySelector('.avatar-fallback')?.classList.remove('hidden');
                            }}
                          />
                          <div className="avatar-fallback hidden absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50/20 text-orange-500">
                            <span className="text-xl font-black uppercase tracking-tight italic">
                              {editedUser.nome ? editedUser.nome.substring(0, 2) : "C"}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50/20">
                          <ICONS.User size={36} className="text-slate-300" />
                        </div>
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    {isEditing && (
                      <div className="absolute -bottom-2 -right-2 flex gap-1">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-9 h-9 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-slate-950 transition-all active:scale-90"
                          title={tr("Carregar nova foto")}
                        >
                          <ICONS.Camera size={14} />
                        </button>
                        {editedUser.avatar_url && (
                          <button
                            onClick={handleRemoveAvatar}
                            className="w-9 h-9 bg-white text-slate-400 rounded-xl flex items-center justify-center shadow-md hover:text-red-500 hover:bg-red-50 transition-all active:scale-90 border border-slate-100"
                            title={tr("Remover foto")}
                          >
                            <ICONS.Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-center md:text-left space-y-2">
                    <span className="text-[8px] font-extrabold text-orange-500 uppercase tracking-widest block">
                      {tr("Imagem de Apresentação")}
                    </span>
                    <h4 className="text-lg font-black uppercase italic tracking-tighter text-slate-950">
                      {tr("Foto de Perfil")}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-sm">
                      {tr("Esta foto será visível para os Chefs e outros utilizadores na plataforma. Formatos suportados: JPG, PNG. Máx 2MB.")}
                    </p>
                    {isEditing && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 text-[9px] font-black text-orange-500 hover:text-slate-950 uppercase tracking-[0.2em] transition-colors border-b border-dashed border-orange-500/40 pb-0.5"
                      >
                        {tr("Alterar Imagem")}
                      </button>
                    )}
                  </div>
                </div>

                {/* Basic Info Section */}
                <div className="space-y-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-slate-950 rounded-xl flex items-center justify-center text-white shadow-xs">
                      <ICONS.User size={15} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-950">
                      {tr("Informação Base")}
                    </h4>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2 text-left group">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-orange-500 transition-colors block">
                        {tr("Nome Completo")}
                      </label>
                      <div className="relative flex items-center">
                        <ICONS.User className="absolute left-5 text-slate-300 group-focus-within/input:text-orange-500 transition-colors" size={16} />
                        <input
                          disabled={!isEditing}
                          className="w-full h-13 md:h-14 pl-12 pr-6 bg-slate-50/40 hover:bg-slate-50/70 focus:bg-white rounded-2xl font-semibold text-xs md:text-sm outline-none border border-slate-200/60 focus:border-orange-500/60 focus:shadow-[0_12px_30px_-10px_rgba(249,115,22,0.12)] transition-all duration-300 disabled:opacity-75 disabled:bg-slate-50/30 disabled:border-slate-100/50 disabled:text-slate-500"
                          value={editedUser.nome || ""}
                          onChange={(e) =>
                            setEditedUser({
                              ...editedUser,
                              nome: e.target.value,
                            })
                          }
                          placeholder={tr("Teu nome completo")}
                        />
                        {!isEditing && (
                          <div className="absolute right-5 flex items-center gap-1.5 px-2 py-1 bg-slate-100 border border-slate-200/20 rounded-md text-[8px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                            <ICONS.Lock size={10} className="text-slate-350" />
                            <span>{tr("Bloqueado")}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-left group">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 block">
                        {tr("Email de Contacto")}
                      </label>
                      <div className="relative flex items-center">
                        <ICONS.Mail className="absolute left-5 text-slate-300" size={16} />
                        <input
                          disabled
                          className="w-full h-13 md:h-14 pl-12 pr-6 bg-slate-50/30 rounded-2xl font-semibold text-xs md:text-sm outline-none border border-slate-200/40 text-slate-400 cursor-not-allowed italic"
                          value={editedUser.email || ""}
                        />
                        <div className="absolute right-5 flex items-center gap-1.5 px-2 py-1 bg-slate-100/70 border border-slate-100 rounded-md text-[8px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                          <ICONS.Lock size={10} className="text-slate-300" />
                          <span>{tr("Primário")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preferences Section */}
                <div className="space-y-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-xs">
                      <ICONS.Heart size={15} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-950">
                      {tr("Preferências")}
                    </h4>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4 text-left">
                      <span className="text-[9px] font-extrabold text-orange-500 uppercase tracking-wider block">
                        {tr("Estilo de Vida")}
                      </span>
                      <label className="text-[11px] font-black text-slate-950 uppercase tracking-widest ml-0.5 block leading-none">
                        {tr("Restrições Alimentares")}
                      </label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          "Vegetariano",
                          "Vegan",
                          "Keto",
                          "Sem Glúten",
                          "Sem Lactose",
                          "Alergia a Frutos Secos",
                        ].map((pref) => (
                          <button
                            key={pref}
                            disabled={!isEditing}
                            onClick={() =>
                              togglePreference("dietary_restrictions", pref)
                            }
                            className={`px-4 py-2.5 rounded-xl text-[9px] font-extrabold uppercase tracking-wider transition-all duration-350 border ${
                              editedUser.dietary_restrictions?.includes(pref)
                                ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10 scale-102"
                                : "bg-white text-slate-500 border-slate-200/60 hover:border-slate-350 hover:bg-slate-50/50"
                            } disabled:opacity-60 disabled:pointer-events-none`}
                          >
                            {pref}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 text-left">
                      <span className="text-[9px] font-extrabold text-orange-500 uppercase tracking-wider block">
                        Paladar & Cozinhas
                      </span>
                      <label className="text-[11px] font-black text-slate-950 uppercase tracking-widest ml-0.5 block leading-none">
                        {tr("Cozinhas Favoritas")}
                      </label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          "Portuguesa",
                          "Italiana",
                          "Japonesa",
                          "Francesa",
                          "Mexicana",
                          "Indiana",
                        ].map((pref) => (
                          <button
                            key={pref}
                            disabled={!isEditing}
                            onClick={() =>
                              togglePreference("cuisine_preferences", pref)
                            }
                            className={`px-4 py-2.5 rounded-xl text-[9px] font-extrabold uppercase tracking-wider transition-all duration-350 border ${
                              editedUser.cuisine_preferences?.includes(pref)
                                ? "bg-slate-950 text-white border-slate-950 shadow-md shadow-slate-950/20 scale-102"
                                : "bg-white text-slate-500 border-slate-200/60 hover:border-slate-350 hover:bg-slate-50/50"
                            } disabled:opacity-60 disabled:pointer-events-none`}
                          >
                            {pref}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kitchen Notes Section */}
                <div className="md:col-span-2 space-y-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-slate-950 rounded-xl flex items-center justify-center text-white shadow-xs">
                      <ICONS.Home size={15} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-950">
                      {tr("Notas sobre a Cozinha")}
                    </h4>
                  </div>

                  <div className="space-y-2 text-left group">
                    <label className="text-[9px] font-extrabold text-orange-500 uppercase tracking-[0.25em] ml-1 block leading-none">
                      {tr("Equipamento, Acessos e Detalhes Relevantes")}
                    </label>
                    <textarea
                      disabled={!isEditing}
                      className="w-full h-36 p-6 md:p-8 bg-slate-50/30 hover:bg-slate-50/60 focus:bg-white rounded-[2rem] font-medium text-xs md:text-sm outline-none border border-slate-200/50 focus:border-orange-500/60 transition-all duration-300 disabled:opacity-75 resize-none shadow-inner placeholder:text-slate-300 placeholder:italic placeholder:font-normal"
                      value={editedUser.kitchenNotes || ""}
                      onChange={(e) =>
                        setEditedUser({
                          ...editedUser,
                          kitchenNotes: e.target.value,
                        })
                      }
                      placeholder={tr("Ex: Tenho forno a gás de alta performance, placa de indução de 4 zonas, batedeira profissional de bancada, excelente iluminação natural...")}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone / Extra Info */}
          <div className="flex flex-col md:flex-row gap-6">
            <div
              onClick={() => setShowSecurityModal(true)}
              className="flex-1 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/60 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.015)] flex items-center justify-between group cursor-pointer hover:border-orange-500/35 hover:shadow-[0_15px_45px_-12px_rgba(249,115,22,0.05)] transition-all duration-500"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-slate-50 text-slate-400 group-hover:bg-orange-500 group-hover:text-white rounded-2xl flex items-center justify-center border border-slate-100 transition-all duration-500">
                  <ICONS.Shield size={18} />
                </div>
                <div className="text-left space-y-0.5">
                  <h5 className="text-xs font-black uppercase italic tracking-tight text-slate-900 group-hover:text-orange-600 transition-colors">
                    {tr("Segurança da Conta")}
                  </h5>
                  <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">
                    {tr("Alterar palavra-passe e acessos")}
                  </p>
                </div>
              </div>
              <ICONS.ChevronRight
                size={16}
                className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all duration-300 shrink-0"
              />
            </div>

            <div
              onClick={() => setShowDeleteModal(true)}
              className="flex-1 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/60 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.015)] flex items-center justify-between group cursor-pointer hover:border-red-500/35 hover:shadow-[0_15px_45px_-12px_rgba(239,68,68,0.05)] transition-all duration-500"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-slate-50 text-slate-450 group-hover:bg-red-500 group-hover:text-white rounded-2xl flex items-center justify-center border border-slate-100 transition-all duration-500">
                  <ICONS.Trash2 size={18} />
                </div>
                <div className="text-left space-y-0.5">
                  <h5 className="text-xs font-black uppercase italic tracking-tight text-slate-900 group-hover:text-red-650 transition-colors">
                    {tr("Eliminar Conta")}
                  </h5>
                  <p className="text-[8px] md:text-[9px] font-bold text-red-300 uppercase tracking-widest">
                    {tr("Apagar todos os dados permanentemente")}
                  </p>
                </div>
              </div>
              <ICONS.ChevronRight
                size={18}
                className="text-red-100 group-hover:text-red-500 transition-colors md:w-5 md:h-5"
              />
            </div>
          </div>

          {/* Legal & Support Links */}
          <div className="pt-8 md:pt-12 border-t border-slate-100 flex flex-wrap justify-center gap-x-8 md:gap-x-12 gap-y-4 md:gap-y-6">
            <button
              onClick={() => onNavigate("privacy")}
              className="group flex items-center gap-3 text-slate-400 hover:text-slate-950 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                <ICONS.Shield size={14} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                {tr("Privacidade")}
              </span>
            </button>
            <button
              onClick={() => onNavigate("terms")}
              className="group flex items-center gap-3 text-slate-400 hover:text-slate-950 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                <ICONS.FileText size={14} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                {tr("Termos")}
              </span>
            </button>
            <button
              onClick={() => onNavigate("help")}
              className="group flex items-center gap-3 text-slate-400 hover:text-slate-950 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                <ICONS.HelpCircle size={14} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                {tr("Ajuda")}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Points Info Modal */}
      {showPointsInfoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-8 md:p-10 shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[90dvh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                  <ICONS.Zap size={20} />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tight">
                  {tr("Como funcionam os pontos?")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPointsInfoModal(false)}
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] shrink-0"
              >
                <ICONS.X size={16} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-5 bg-slate-950 text-white rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 rounded-full -mr-16 -mt-16 blur-[50px] opacity-20" />
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{tr("O seu Saldo Atual")}</p>
                <h4 className="text-3xl font-black italic uppercase tracking-tight mt-1 text-orange-500">
                  {user.loyalty_points || 0} {tr("Pontos")}
                </h4>
                <p className="text-xs text-slate-300 mt-2">
                  {tr("Equivale a")} <strong className="text-white">{formatPrice((user.loyalty_points || 0) * 0.01)}</strong> {tr("de desconto acumulado para utilizar nas suas próximas experiências gastronómicas.")}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/50 transition-colors">
                  <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-orange-500 shrink-0 shadow-sm">
                    <ICONS.Smile size={18} />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">{tr("1. Como Ganhar Pontos")}</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                      {tr("Acumula automaticamente")} <strong className="text-slate-800">{tr("1 Ponto por cada 1€ gasto")}</strong> {tr("em reservas concluídas com os nossos Chefs Cookr.")}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/50 transition-colors">
                  <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-orange-500 shrink-0 shadow-sm">
                    <ICONS.Percent size={18} />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">{tr("2. Conversão e Descontos")}</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                      {tr("Cada ponto acumulado tem o valor de")} <strong className="text-slate-800">{tr("0,01€ de saldo real")}</strong>{tr(". Pode descontar o seu saldo acumulado diretamente ao realizar uma nova reserva de Menu ou Pack Daily.")}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-2xl bg-orange-50/50 border border-orange-100/50 transition-colors">
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md">
                    <ICONS.Award size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">{tr("3. Vantagens VIP Gold")}</h5>
                      <span className="text-[8px] font-bold text-white bg-orange-500 px-1.5 py-0.5 rounded-md uppercase tracking-wider">{tr("Premium")}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                      {tr("Ao atingir os")} <strong className="text-slate-900 font-extrabold font-black">{tr("500 pontos")}</strong>{tr(", desbloqueia permanentemente o nível")} <strong className="text-orange-600 font-extrabold font-black">{tr("VIP Gold")}</strong>{tr(", garantindo uma")} <strong className="text-slate-900 font-extrabold font-black">{tr("Taxa de Serviço reduzida de apenas 5%")}</strong> {tr("(em vez de 10%) em todas as futuras reservas!")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowPointsInfoModal(false)}
                className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all duration-200 cursor-pointer"
              >
                {tr("Entendido, obrigado!")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                  <ICONS.Lock size={20} />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tight">
                  {tr("Segurança")}
                </h3>
              </div>
              <button
                onClick={() => setShowSecurityModal(false)}
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] shrink-0"
              >
                <ICONS.X size={16} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase italic tracking-widest text-slate-400 ml-4">
                  {tr("Palavra-passe Atual")}
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={securityData.currentPassword}
                    onChange={(e) =>
                      setSecurityData({
                        ...securityData,
                        currentPassword: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        current: !showPasswords.current,
                      })
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                  >
                    {showPasswords.current ? (
                      <ICONS.EyeOff size={18} />
                    ) : (
                      <ICONS.Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase italic tracking-widest text-slate-400 ml-4">
                  {tr("Nova Palavra-passe")}
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={securityData.newPassword}
                    onChange={(e) =>
                      setSecurityData({
                        ...securityData,
                        newPassword: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        new: !showPasswords.new,
                      })
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                  >
                    {showPasswords.new ? (
                      <ICONS.EyeOff size={18} />
                    ) : (
                      <ICONS.Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase italic tracking-widest text-slate-400 ml-4">
                  {tr("Confirmar Nova Palavra-passe")}
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={securityData.confirmPassword}
                    onChange={(e) =>
                      setSecurityData({
                        ...securityData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        confirm: !showPasswords.confirm,
                      })
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                  >
                    {showPasswords.confirm ? (
                      <ICONS.EyeOff size={18} />
                    ) : (
                      <ICONS.Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={handleUpdatePassword}
                disabled={isSaving}
                className="w-full bg-black text-white rounded-2xl py-4 font-black uppercase italic tracking-widest text-xs hover:bg-orange-600 transition-all shadow-lg hover:shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <ICONS.RefreshCw className="animate-spin" size={16} />
                ) : (
                  <ICONS.ShieldCheck size={16} />
                )}
                {tr("Atualizar Segurança")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                  <ICONS.AlertTriangle size={20} />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tight text-red-900">
                  {tr("Eliminar Conta")}
                </h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] shrink-0"
              >
                <ICONS.X size={16} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                <p className="text-sm font-bold text-red-800 leading-relaxed">
                  {tr("Esta ação é irreversível. Todos os seus dados, reservas e histórico serão apagados permanentemente dos nossos servidores.")}
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isSaving}
                  className="w-full bg-red-600 text-white rounded-2xl py-4 font-black uppercase italic tracking-widest text-xs hover:bg-red-700 transition-all shadow-lg hover:shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <ICONS.RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <ICONS.Trash2 size={16} />
                  )}
                  {tr("Confirmar Eliminação")}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full bg-slate-100 text-slate-600 rounded-2xl py-4 font-black uppercase italic tracking-widest text-xs hover:bg-slate-200 transition-all"
                >
                  {tr("Cancelar")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedChefForQuote && (
        <QuoteRequestOnboarding
          chef={selectedChefForQuote}
          currentUser={user}
          chefMenus={chefMenusForQuote}
          onClose={() => setSelectedChefForQuote(null)}
          onSuccess={() => {
            setSelectedChefForQuote(null);
            onRefresh();
          }}
          onNotify={onNotify}
        />
      )}
      {selectedBookingForCancellation && (
        <CancellationModal
          isOpen={isCancellationModalOpen}
          onClose={() => {
            setIsCancellationModalOpen(false);
            setSelectedBookingForCancellation(null);
          }}
          booking={selectedBookingForCancellation}
          userId={user.id}
          onSuccess={(msg) => {
            onNotify?.(msg, "success");
            onRefresh();
          }}
        />
      )}
      {/* Detail Modal */}
      {viewingDetail && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] md:rounded-[4rem] max-w-2xl w-full max-h-[90dvh] overflow-y-auto scrollbar-hide shadow-3xl relative">
            {/* Header Background Accent */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-slate-50 border-b border-slate-100" />

            <div className="p-8 md:p-12 space-y-8 relative z-10">
              {/* Top Bar */}
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest italic ${
                        viewingDetail.status === BookingStatus.ACCEPTED
                          ? "bg-emerald-500 text-white"
                          : viewingDetail.status === BookingStatus.PENDING
                            ? "bg-orange-500 text-white"
                            : "bg-slate-950 text-white"
                      }`}
                    >
                      {viewingDetail.status}
                    </span>
                    {viewingDetail.is_meal_prep && (
                      <span className="px-3 py-1 bg-blue-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest italic">
                        {tr("Meal Prep")}
                      </span>
                    )}
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-slate-950 leading-none">
                    {tr("Detalhes do")} <span className="text-orange-500">{tr("Ritual.")}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setViewingDetail(null)}
                  className="w-8 h-8 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all duration-200 shadow-sm shrink-0"
                >
                  <ICONS.X size={13} />
                </button>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Chef & Logistics */}
                <div className="space-y-6">
                  {/* Chef Info */}
                  <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-150 rounded-2xl">
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/80 overflow-hidden shrink-0 shadow-xs">
                      {(() => {
                        const avatarUrl = allUsers.find(
                          (u) => u.id === viewingDetail.cookId,
                        )?.avatar_url;
                        return avatarUrl && avatarUrl !== "" ? (
                          <img
                            src={avatarUrl}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100">
                            <ICONS.Users size={18} className="text-slate-300" />
                          </div>
                        );
                      })()}
                    </div>
                    <div className="text-left">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 italic">
                        {tr("Chef")}
                      </p>
                      <p className="text-sm font-black text-slate-950 uppercase italic">
                        {viewingDetail.cookName}
                      </p>
                      <button
                        onClick={() => onOpenChat(viewingDetail.cookId)}
                        className="text-[8px] font-black text-orange-500 uppercase tracking-widest hover:underline mt-1"
                      >
                        {tr("Enviar Mensagem")}
                      </button>
                    </div>
                  </div>

                  {/* Logistics */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/5 border border-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                        <ICONS.Calendar size={13} />
                      </div>
                      <div className="text-left">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 italic">
                          {tr("Data e Hora")}
                        </p>
                        <p className="text-xs font-bold text-slate-950 leading-none">
                          {viewingDetail.data} {tr("às")}{" "}
                          {viewingDetail.hora || "--:--"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/5 border border-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                        <ICONS.MapPin size={13} />
                      </div>
                      <div className="text-left">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 italic">
                          {tr("Morada de Entrega/Serviço")}
                        </p>
                        <p className="text-xs font-bold text-slate-700 leading-normal">
                          {viewingDetail.morada}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/5 border border-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                        <ICONS.Users size={13} />
                      </div>
                      <div className="text-left">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 italic">
                          {tr("Número de Pessoas")}
                        </p>
                        <p className="text-xs font-bold text-slate-950 leading-none">
                          {viewingDetail.numPessoas || 1} {tr("Pessoas (PAX)")}
                        </p>
                      </div>
                    </div>

                    {/* Guest Profiler & Allergies Display */}
                    {viewingDetail.guestsSummary && (
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic text-left">
                          Resumo de Alergias & Convidados
                        </p>
                        <p className="text-[11px] font-semibold text-slate-700 leading-normal bg-orange-50/50 border border-orange-100/55 rounded-xl p-3 text-left italic">
                          "{viewingDetail.guestsSummary}"
                        </p>
                        {viewingDetail.guests && viewingDetail.guests.length > 0 && (
                          <div className="space-y-1.5 pl-2 text-left">
                            {viewingDetail.guests.map((guest: any, gIdx: number) => (
                              <div key={gIdx} className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                                <span>{guest.name || `Convidado ${gIdx + 1}`}</span>
                                <div className="flex gap-1">
                                  {guest.allergies && guest.allergies.length > 0 ? (
                                    guest.allergies.map((allergy: string, aIdx: number) => {
                                      const isOutro = allergy === "Outro";
                                      const label = isOutro ? (guest.customAllergy || "Outro") : allergy;
                                      return (
                                        <span key={aIdx} className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[8px] font-extrabold uppercase">
                                          {label}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="text-emerald-600 text-[8px] font-extrabold uppercase">
                                      {tr("Sem restrições")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Menu & Dishes */}
                <div className="space-y-8">
                  {/* Menu Selected */}
                  <div className="p-6 bg-slate-950 rounded-[2.5rem] text-white space-y-4 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <div className="relative z-10">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-2 italic">
                        {tr("Ritual Selecionado")}
                      </p>
                      <h4 className="text-xl font-black uppercase italic tracking-tight leading-tight">
                        {viewingDetail.menu_selected}
                      </h4>
                      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-white/30 uppercase tracking-widest italic">
                            {tr("Valor Total")}
                          </p>
                          <p className="text-lg font-black text-white italic">
                            {formatPrice(viewingDetail.valorTotal)}
                          </p>
                        </div>
                      </div>

                      {viewingDetail.splitBill && (
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                          <p className="text-[8px] font-black text-white/30 uppercase tracking-widest italic">
                            {tr("Divisão de Conta (Split Bill)")}
                          </p>
                          <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5 text-left">
                            <div className="flex justify-between items-center text-[10px] font-bold text-white/60">
                              <span>{tr("Parcela por Email:")}</span>
                              <span className="text-orange-400">{formatPrice(viewingDetail.splitBill.shareAmount)}</span>
                            </div>
                            <div className="space-y-1">
                              {/* Buyer share */}
                              <div className="flex justify-between items-center text-[9px] font-bold text-emerald-400">
                                <span>{user.email} {tr("(Comprador)")}</span>
                                <span>{tr("Pago")}</span>
                              </div>
                              {/* Guests shares */}
                              {viewingDetail.splitBill.emails.map((email: string, eIdx: number) => {
                                const isPaid = viewingDetail.splitBill.paidEmails?.includes(email);
                                return (
                                  <div key={eIdx} className="flex justify-between items-center text-[9px] font-bold">
                                    <span className="text-white/70">{email}</span>
                                    <span className={isPaid ? "text-emerald-400" : "text-amber-400 animate-pulse"}>
                                      {isPaid ? tr("Pago") : tr("Pendente")}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dishes / Courses */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <ICONS.Utensils size={14} className="text-orange-500" />
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">
                        {tr("Pratos do Ritual")}
                      </p>
                    </div>
                    {isLoadingMenu ? (
                      <div className="flex items-center justify-center py-8">
                        <ICONS.Clock
                          className="animate-spin text-orange-500"
                          size={24}
                        />
                      </div>
                    ) : selectedMenu?.courses &&
                      selectedMenu.courses.length > 0 ? (
                      <div className="space-y-3">
                        {selectedMenu.courses.map((course, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-slate-50 border border-slate-100 rounded-2xl"
                          >
                            <p className="text-[7px] font-black text-orange-500 uppercase tracking-widest mb-1">
                              {course.tipo}
                            </p>
                            <p className="text-xs font-bold text-slate-950">
                              {course.conteudo}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                        <p className="text-xs font-medium text-slate-400 italic">
                          {selectedMenu?.descricao ||
                            tr("Informação detalhada dos pratos não disponível.")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Kitchen Notes */}
                  {viewingDetail.kitchenNotes && (
                    <div className="space-y-3 text-left">
                      <div className="flex items-center gap-2">
                        <ICONS.MessageSquare
                          size={14}
                          className="text-orange-500"
                        />
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">
                          {tr("As tuas notas para o Chef")}
                        </p>
                      </div>
                      <div className="p-5 bg-orange-50/50 border border-orange-100 rounded-3xl">
                        <p className="text-xs font-medium text-slate-600 italic leading-relaxed">
                          {viewingDetail.kitchenNotes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-3">
                <button
                  onClick={() => setViewingDetail(null)}
                  className="flex-1 min-h-[58px] py-4 px-6 bg-slate-950 hover:bg-orange-500 text-white rounded-full font-black text-xs md:text-sm uppercase tracking-widest transition-all active:scale-97 shadow-lg flex items-center justify-center shrink-0 border border-white/15 cursor-pointer"
                >
                  {tr("Fechar Detalhes")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ProfileDashboard);
