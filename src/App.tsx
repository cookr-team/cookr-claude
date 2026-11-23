import React, { useState, useEffect, useMemo, useRef, Suspense, useCallback } from "react";
import { persistableUser } from "./lib/persistUser";
import Layout from "./components/Layout";
import { paymentService } from "./services/paymentService";
import LandingPage from "./components/LandingPage";
import Logo from "./components/Logo";

// Dynamic code-splitting for high performance & ultra-fast initial load
const ChefSearch = React.lazy(() => import("./components/ChefSearch"));
const AdminDashboard = React.lazy(() => import("./components/AdminDashboard"));
const ChefProfileView = React.lazy(() => import("./components/ChefProfileView"));
const ProfileDashboard = React.lazy(() => import("./components/ProfileDashboard"));
const CookDashboard = React.lazy(() => import("./components/CookDashboard"));
const ClientAgenda = React.lazy(() => import("./components/ClientAgenda"));
const CookEarnings = React.lazy(() => import("./components/CookEarnings"));
const CookProfile = React.lazy(() => import("./components/CookProfile"));
const ClientOnboarding = React.lazy(() => import("./components/ClientOnboarding"));
const CookOnboarding = React.lazy(() => import("./components/CookOnboarding"));
const ChefExplore = React.lazy(() => import("./components/ChefExplore"));
const AdminInsights = React.lazy(() => import("./components/AdminInsights"));
const ChatView = React.lazy(() => import("./components/ChatView"));
const TermsConditions = React.lazy(() => import("./components/TermsConditions"));
const PrivacyPolicy = React.lazy(() => import("./components/PrivacyPolicy"));
const HaccpPolicy = React.lazy(() => import("./components/HaccpPolicy"));
const HelpView = React.lazy(() => import("./components/HelpView"));
const SettingsView = React.lazy(() => import("./components/SettingsView").then(m => ({ default: m.SettingsView })));
const FineDiningCategoryModal = React.lazy(() => import("./components/FineDiningCategoryModal"));
const FineDiningPage = React.lazy(() => import("./components/FineDiningPage"));
const SushiDeAutorPage = React.lazy(() => import("./components/SushiDeAutorPage"));
const TradicionalLusaPage = React.lazy(() => import("./components/TradicionalLusaPage"));
import { VersionCheckUtility } from "./components/VersionCheckUtility";
import { useLanguage } from "./contexts/LanguageContext";

// Luxe minimal loading indicator for Code-Splitting Suspense transitions
const ViewLoadingPlaceholder = () => {
  const { getLangText } = useLanguage();
  return (
    <div className="flex-1 w-full min-h-[50vh] flex flex-col justify-center items-center gap-4 animate-pulse">
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-t-2 border-orange-500 border-r-2 border-r-transparent animate-spin"></div>
        <div className="absolute w-7 h-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
        </div>
      </div>
      <div className="space-y-0.5 text-center">
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.25em] italic">
          {getLangText({ pt: "Carregando", es: "Cargando", en: "Loading", fr: "Chargement" })}
        </p>
        <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest italic">{tr("Cookr Command Center")}</p>
      </div>
    </div>
  );
};
import {
  User,
  UserRole,
  UserStatus,
  Booking,
  ChefRecipe,
  MenuItem,
  BookingStatus,
  Review,
} from "./types";
import { supabaseService, signOutAndClearLocalData, sanitizeUserUrls, waitForAuthInit, getVerifiedSessionUserId, isValidUUID, toValidUUID } from "./services/supabaseService";
import { supabase, isSupabaseConfigured, isSupabaseReachable } from "./lib/supabaseClient";
import { pushNotificationService } from "./services/pushNotificationService";
import { syncOfflineBookings } from "./services/bookingQueue";
import {
  mockUsers,
  mockMenus,
  mockRecipes,
  mockBookings,
} from "./services/mockData.ts.tsx";
import { ICONS, PLATFORM_NAME, COOKR_COLLECTIONS } from "./constants";
import toast, { Toaster } from "react-hot-toast";
import { PremiumToastContainer, Toast } from "./components/PremiumToast";

import { tr } from "./lib/tr";
function cleanUserData(user: any): User | null {
  if (!user) return null;
  const sanitized = sanitizeUserUrls(user);
  let userId = String(sanitized.id || "");
  if (!isValidUUID(userId)) {
    userId = toValidUUID(userId || sanitized.email || "user");
  }
  return {
    id: userId,
    nome: String(sanitized.nome || "Utilizador Cookr"),
    email: String(sanitized.email || ""),
    telefone: sanitized.telefone ? String(sanitized.telefone) : undefined,
    role: sanitized.role || UserRole.CLIENT,
    status: sanitized.status || UserStatus.ACTIVE,
    avatar_url: sanitized.avatar_url ? String(sanitized.avatar_url) : undefined,
    cover_url: sanitized.cover_url ? String(sanitized.cover_url) : undefined,
    especialidades: Array.isArray(user.especialidades) ? user.especialidades.map(String) : undefined,
    localizacao: user.localizacao ? String(user.localizacao) : undefined,
    cidade: user.cidade ? String(user.cidade) : undefined,
    morada: user.morada ? String(user.morada) : undefined,
    experiencia: typeof user.experiencia === "number" ? user.experiencia : undefined,
    approvedByAdmin: typeof user.approvedByAdmin === "boolean" ? user.approvedByAdmin : undefined,
    bypass_haccp_restrictions: typeof user.bypass_haccp_restrictions === "boolean" ? user.bypass_haccp_restrictions : undefined,
    disponibilidade: user.disponibilidade ? JSON.parse(JSON.stringify(user.disponibilidade)) : undefined,
    addresses: Array.isArray(user.addresses) ? JSON.parse(JSON.stringify(user.addresses)) : undefined,
    admin_notes: user.admin_notes ? String(user.admin_notes) : undefined,
    rating: typeof user.rating === "number" ? user.rating : undefined,
    total_reservas: typeof user.total_reservas === "number" ? user.total_reservas : undefined,
    biografia: user.biografia ? String(user.biografia) : undefined,
    idiomas: Array.isArray(user.idiomas) ? user.idiomas.map(String) : undefined,
    equipamento: Array.isArray(user.equipamento) ? user.equipamento.map(String) : undefined,
    diferenciais: Array.isArray(user.diferenciais) ? user.diferenciais.map(String) : undefined,
    nif: user.nif ? String(user.nif) : undefined,
    iban: user.iban ? String(user.iban) : undefined,
    fiscal_name: user.fiscal_name ? String(user.fiscal_name) : undefined,
    billing_address: user.billing_address ? String(user.billing_address) : undefined,
    billing_street: user.billing_street ? String(user.billing_street) : undefined,
    billing_number: user.billing_number ? String(user.billing_number) : undefined,
    billing_floor: user.billing_floor ? String(user.billing_floor) : undefined,
    billing_zip: user.billing_zip ? String(user.billing_zip) : undefined,
    billing_city: user.billing_city ? String(user.billing_city) : undefined,
    billing_country: user.billing_country ? String(user.billing_country) : undefined,
    zip_code: user.zip_code ? String(user.zip_code) : undefined,
    dietary_restrictions: Array.isArray(user.dietary_restrictions) ? user.dietary_restrictions.map(String) : undefined,
    cuisine_preferences: Array.isArray(user.cuisine_preferences) ? user.cuisine_preferences.map(String) : undefined,
    certifications_and_awards: Array.isArray(user.certifications_and_awards) ? JSON.parse(JSON.stringify(user.certifications_and_awards)) : undefined,
    faqs: Array.isArray(user.faqs) ? JSON.parse(JSON.stringify(user.faqs)) : undefined,
    sustainability_badges: Array.isArray(user.sustainability_badges) ? user.sustainability_badges.map(String) : undefined,
    sustainability_notes: user.sustainability_notes ? String(user.sustainability_notes) : undefined,
    allergen_certifications: Array.isArray(user.allergen_certifications) ? user.allergen_certifications.map(String) : undefined,
    allergen_notes: user.allergen_notes ? String(user.allergen_notes) : undefined,
    portfolio_images: Array.isArray(user.portfolio_images) ? user.portfolio_images.map(String) : undefined,
    precoMedio: typeof user.precoMedio === "number" ? user.precoMedio : undefined,
    isAvailable: typeof user.isAvailable === "boolean" ? user.isAvailable : undefined,
    is_available: typeof user.is_available === "boolean" ? user.is_available : (typeof user.isAvailable === "boolean" ? user.isAvailable : undefined),
    is_chef: typeof user.is_chef === "boolean" ? user.is_chef : undefined,
    offers_wine_pairing: typeof user.offers_wine_pairing === "boolean" ? user.offers_wine_pairing : undefined,
    kitchenNotes: user.kitchenNotes ? String(user.kitchenNotes) : undefined,
    favoriteChefIds: Array.isArray(user.favoriteChefIds) ? user.favoriteChefIds.map(String) : undefined,
    loyalty_points: typeof user.loyalty_points === "number" ? user.loyalty_points : undefined,
    badges: Array.isArray(user.badges) ? user.badges.map(String) : undefined,
    created_at: user.created_at ? String(user.created_at) : undefined,
    language: user.language || undefined,
    notification_settings: user.notification_settings ? {
      email_enabled: typeof user.notification_settings.email_enabled === "boolean" ? user.notification_settings.email_enabled : true,
      push_enabled: typeof user.notification_settings.push_enabled === "boolean" ? user.notification_settings.push_enabled : true,
      sms_enabled: typeof user.notification_settings.sms_enabled === "boolean" ? user.notification_settings.sms_enabled : false,
      booking_updates: typeof user.notification_settings.booking_updates === "boolean" ? user.notification_settings.booking_updates : true,
      booking_reminders: typeof user.notification_settings.booking_reminders === "boolean" ? user.notification_settings.booking_reminders : true,
      chef_messages: typeof user.notification_settings.chef_messages === "boolean" ? user.notification_settings.chef_messages : true,
      marketing_offers: typeof user.notification_settings.marketing_offers === "boolean" ? user.notification_settings.marketing_offers : false,
      system_alerts: typeof user.notification_settings.system_alerts === "boolean" ? user.notification_settings.system_alerts : true,
    } : undefined,
  };
}

function safeJSONStringify(obj: any): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return undefined;
      }
      seen.add(value);
    }
    return value;
  });
}

function areEntityArraysEqual<T extends { id?: string; updated_at?: string; status?: any; is_available?: boolean }>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const itemA = a[i];
    const itemB = b[i];
    if (itemA?.id !== itemB?.id) return false;
    if (itemA?.updated_at !== itemB?.updated_at) return false;
    if (itemA?.status !== itemB?.status) return false;
    if (itemA?.is_available !== itemB?.is_available) return false;
  }
  return true;
}

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>(() => mockUsers);
  const [bookings, setBookings] = useState<Booking[]>(() => mockBookings);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [allMenus, setAllMenus] = useState<MenuItem[]>(() => Object.values(mockMenus).flat());
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("cookr_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return cleanUserData(parsed);
        }
      }
    } catch (e) {
      // Ignore initial parse errors
    }
    return null;
  });
  const [realAdminUser, setRealAdminUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
 
   const { language, setLanguage, getLangText } = useLanguage();
   const prevUserIdRef = useRef<string | null>(null);

   // Sync context language with currentUser profile in both directions
   useEffect(() => {
     if (currentUser) {
       if (prevUserIdRef.current !== currentUser.id) {
         // User just logged in, loaded, or switched
         const savedExplicit = typeof window !== "undefined" ? localStorage.getItem("user_language") : null;
         if (savedExplicit && ["pt", "en", "fr", "es"].includes(savedExplicit)) {
           // User explicitly chose a language on this client; prioritize it and sync user profile
           if (language !== savedExplicit) {
             setLanguage(savedExplicit as any);
           }
           if (currentUser.language !== savedExplicit) {
             const updated = { ...currentUser, language: savedExplicit as any };
             setCurrentUser(updated);
             localStorage.setItem("cookr_user", safeJSONStringify(persistableUser(updated)));
             supabaseService.updateUserProfile(currentUser.id, { language: savedExplicit as any }).catch(() => {});
           }
         } else if (currentUser.language && currentUser.language !== language) {
           // No explicit local choice yet, adopt user profile preference
           setLanguage(currentUser.language);
         }
         prevUserIdRef.current = currentUser.id;
       } else {
         // Same user, but language in context changed (e.g., clicked flag/selector)
         if (currentUser.language !== language) {
           // Update local user state
           const updatedUser = { ...currentUser, language };
           setCurrentUser(updatedUser);
           localStorage.setItem("cookr_user", safeJSONStringify(persistableUser(updatedUser)));
           
           // Persist to database asynchronously
           supabaseService.updateUserProfile(currentUser.id, { language })
             .catch((err) => console.warn("Note updating user language in DB:", err));
         }
       }
     } else {
       prevUserIdRef.current = null;
     }
   }, [currentUser, language, setLanguage]);

   const activeRefresh = useRef<Promise<void> | null>(null);
   const hasInitialDataRef = useRef(false);

  const allMenusByChef = useMemo(() => {
    return allMenus.reduce((acc: Record<string, MenuItem[]>, item) => {
      if (item.cookId) {
        if (!acc[item.cookId]) acc[item.cookId] = [];
        acc[item.cookId].push(item);
      }
      return acc;
    }, {});
  }, [allMenus]);

  // Derivamento reativo em memória da tabela de receitas a partir do menus (Evita dupla consulta Firestore getDocs 'menus')
  const allRecipes = useMemo(() => {
    const map: Record<string, ChefRecipe[]> = {};
    for (const menu of allMenus) {
      const cookId = menu.cookId || menu.cook_id;
      if (menu.id && cookId) {
        if (!map[cookId]) map[cookId] = [];
        map[cookId].push({
          id: menu.id,
          cookId: cookId,
          nome: menu.nome,
          imageUrl: menu.imageUrl || menu.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
          descricao: menu.descricao,
          isPopular: true,
          preco: menu.preco
        });
      }
    }
    return map;
  }, [allMenus]);
  
  const saveAndSetUser = useCallback((user: User | null) => {
    if (!user) {
      setCurrentUser(null);
      localStorage.removeItem("cookr_user");
    } else {
      const cleaned = cleanUserData(user);
      if (cleaned) {
        setCurrentUser(cleaned);
        try {
          localStorage.setItem("cookr_user", safeJSONStringify(persistableUser(cleaned)));
        } catch (e) {
          console.error("Failed to serialize user to localStorage:", e);
        }
      }
    }
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path === "/fine-dining" || path === "/fine-dining/") return "fine-dining";
      if (path === "/sushi-de-autor" || path === "/sushi-de-autor/") return "sushi-de-autor";
      if (path === "/tradicional-lusa" || path === "/tradicional-lusa/" || path === "/tradicional" || path === "/tradicional/") return "tradicional-lusa";
      try {
        const saved = localStorage.getItem("cookr_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.role === UserRole.COOK) return "kitchen";
          if (parsed?.role === UserRole.CLIENT) return "home";
        }
      } catch (e) {}
    }
    return "landing";
  });
  const [currentTab, setCurrentTab] = useState<any>(null);
  const [selectedChefId, setSelectedChefId] = useState<string | null>(null);
  const [initialBookingStep, setInitialBookingStep] = useState<
    | "summary"
    | "confirm"
    | "logistics"
    | "desires"
    | "checkout"
    | "success"
    | null
  >(null);
  const [selectedChatPartnerId, setSelectedChatPartnerId] = useState<
    string | null
  >(null);
  const [selectedRoleForAuth, setSelectedRoleForAuth] =
    useState<UserRole | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [isFineDiningModalOpen, setIsFineDiningModalOpen] = useState(false);
  const [fineDiningIntentAfterAuth, setFineDiningIntentAfterAuth] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryPassword2, setRecoveryPassword2] = useState("");
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isRecoveryPending, setIsRecoveryPending] = useState(false);

  const [googlePendingUser, setGooglePendingUser] = useState<any | null>(null);
  const [showRoleSelectionModal, setShowRoleSelectionModal] =
    useState<boolean>(false);

  useEffect(() => {
    console.log("[App.tsx] Cookr app initialized with Supabase backend.");
  }, []);

  // Monitor offline actions, service worker registrations, and connection restoration
  useEffect(() => {
    // 1. Service Worker & Background Sync Registration
    try {
      if (typeof window !== "undefined" && typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[PWA] Service Worker registrado com sucesso:", registration.scope);
            
            // Request Sync registration if possible
            try {
              if (typeof window !== "undefined" && registration && "sync" in registration) {
                const isWindowActive = typeof document !== "undefined" && !document.hidden;
                if (isWindowActive) {
                  return (registration as any).sync.register("sync-data")
                    .then(() => console.log("[PWA] Background Sync 'sync-data' registrado com sucesso."))
                    .catch((err: any) => {
                      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : String(err);
                      if (msg.includes("registration tag too long") || msg.includes("missing window")) {
                        console.warn("[PWA] Background Sync tag/window constraint (suppressed):", msg);
                      } else {
                        console.warn("[PWA] Background Sync 'sync-data' falhou ao registrar:", err);
                      }
                    });
                }
              }
            } catch (syncErr: any) {
              const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
              if (msg.includes("registration tag too long") || msg.includes("missing window")) {
                console.warn("[PWA] Background Sync tag/window constraint error (suppressed):", msg);
              } else {
                console.warn("[PWA] Erro ao tentar registrar sync-data:", syncErr);
              }
            }
          })
          .catch((error) => {
            const msg = error instanceof Error ? error.message : String(error);
            if (
              msg.includes("registration tag too long") ||
              msg.includes("missing window") ||
              msg.includes("load failed") ||
              msg.includes("SecurityError") ||
              msg.includes("user denied")
            ) {
              console.warn("[PWA] Service Worker registration warning (suppressed):", msg);
            } else {
              console.warn("[PWA] Service Worker não foi ativado neste ambiente:", msg);
            }
          });
      }
    } catch (outerErr: any) {
      const msg = outerErr instanceof Error ? outerErr.message : String(outerErr);
      console.warn("[PWA] Service Worker registration outer block error (suppressed):", msg);
    }

    // 2. Broadcast Channel for Service Worker updates
    const syncChannel = new BroadcastChannel("booking-sync-channel");
    
    const triggerBookingSync = () => {
      console.log("[PWA] Sincronização offline despoletada do Service Worker.");
      syncOfflineBookings((msg, type) => {
        addToast(msg, type);
        if (type === "success") {
          refreshData(currentUser);
        }
      }).catch((err) => {
        console.warn("Erro na sincronização automática offline:", err);
      });
    };

    syncChannel.onmessage = (event) => {
      if (event.data && event.data.type === "TRIGGER_OFFLINE_SYNC") {
        triggerBookingSync();
      }
    };

    // 3. Fallback direct postMessage listener on service worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "TRIGGER_OFFLINE_SYNC") {
        triggerBookingSync();
      }
    };

    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    }

    const handleOnline = () => {
      setIsOnline(true);
      addToast(
        getLangText({
          pt: "Ligação à Internet restaurada. A sincronizar...",
          es: "Conexión a Internet restaurada. Sincronizando...",
          en: "Internet connection restored. Synchronizing...",
          fr: "Connexion Internet restaurée. Synchronisation en cours...",
        }),
        "success"
      );
      
      // Notify Service Worker about online status to trigger a sync event
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "TRIGGER_BOOKING_SYNC" });
      }

      syncOfflineBookings((msg, type) => {
        addToast(msg, type);
        if (type === "success") {
          refreshData(currentUser);
        }
      }).catch(err => {
        console.warn("Erro na sincronização de rituais:", err);
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      addToast(
        getLangText({
          pt: "Modo offline ativado. As suas ações de reserva serão guardadas localmente.",
          es: "Modo offline activado. Sus reservas se guardarán localmente.",
          en: "Offline mode activated. Your booking actions will be saved locally.",
          fr: "Mode hors ligne activé. Vos réservations seront enregistrées localement.",
        }),
        "info"
      );
    };

    const handleOfflineActionQueued = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.message) {
        addToast(customEvent.detail.message, "info");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline-action-queued", handleOfflineActionQueued);

    // Initial sync check on mount
    if (typeof navigator !== "undefined" && navigator.onLine) {
      syncOfflineBookings((msg, type) => {
        if (type === "success") {
          refreshData(currentUser);
        }
      }).catch(err => {
        console.warn("Erro na sincronização inicial:", err);
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline-action-queued", handleOfflineActionQueued);
      syncChannel.close();
      if (typeof navigator !== "undefined" && navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
      }
    };
  }, [currentUser]);

  const ADMIN_EMAIL = "cookr.team@gmail.com";

  const cooks = useMemo(
    () => (users || []).filter((u) => u.role === UserRole.COOK),
    [users],
  );

  const cookBookings = useMemo(() => {
    if (!currentUser || currentUser.role !== UserRole.COOK) return [];
    const safeBookings = bookings || [];
    const effId = isValidUUID(currentUser.id) ? currentUser.id : toValidUUID(currentUser.id);
    return safeBookings.filter((b) => b.cookId === currentUser.id || b.cookId === effId);
  }, [bookings, currentUser]);

  const clientBookings = useMemo(() => {
    if (!currentUser) return [];
    const safeBookings = bookings || [];
    const effId = isValidUUID(currentUser.id) ? currentUser.id : toValidUUID(currentUser.id);
    return safeBookings.filter(
      (b) => b.clientId === currentUser.id || b.clientId === effId || b.clientId === "11111111-1111-1111-1111-111111111111",
    );
  }, [bookings, currentUser]);

  // Periodic background scanner for 24h & 2h Client Event Push Reminders
  useEffect(() => {
    if (!bookings || bookings.length === 0) return;

    // Scan immediately
    pushNotificationService.scanAndDispatchBookingReminders(bookings).catch((err) => {
      console.warn("[Push Reminders] Error scanning event reminders:", err);
    });

    // Re-check every 60 seconds
    const interval = setInterval(() => {
      pushNotificationService.scanAndDispatchBookingReminders(bookings).catch(() => {});
    }, 60000);

    return () => clearInterval(interval);
  }, [bookings]);

  const reviewsByChef = useMemo(() => {
    const map: Record<string, Review[]> = {};
    for (const review of reviews || []) {
      const chefId = review.cook_id || review.cookId;
      if (chefId) {
        if (!map[chefId]) map[chefId] = [];
        map[chefId].push(review);
      }
    }
    return map;
  }, [reviews]);

  const selectedChef = useMemo(() => {
    if (!selectedChefId) return null;
    return cooks.find((c) => c.id === selectedChefId) || null;
  }, [cooks, selectedChefId]);

  const addToast = useCallback((
    message: string,
    type: "error" | "success" | "info" | "new_order" = "info",
  ) => {
    if (!message) return;

    setToasts((prev) => {
      // Prevent identical active messages to avoid overlapping/stacking of same alerts
      const isDuplicate = prev.some((t) => t.message.trim() === message.trim());
      if (isDuplicate) return prev;

      const newId = Math.random().toString(36).substr(2, 9);
      const updatedList = [...prev, { id: newId, message, type }];
      
      // Limit to max 3 items to preserve view cleanliness
      if (updatedList.length > 3) {
        return updatedList.slice(updatedList.length - 3);
      }
      return updatedList;
    });

    if (type === "new_order") {
      try {
        // Nitid notifications audio sound
        const audio = new Audio(
          "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
        );
        audio.volume = 0.8;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() =>
            console.warn(
              "Aviso: Notificação sonora bloqueada pelo browser. Interaja com a página para ativar.",
            ),
          );
        }
      } catch (e) {}

      // React-hot-toast for extra system level presence
      toast.success(
        getLangText({
          pt: "NOVO PEDIDO!",
          es: "¡NUEVO PEDIDO!",
          en: "NEW ORDER!",
          fr: "NOUVELLE COMMANDE !",
        }),
        {
        duration: 10000,
        position: "top-center",
        style: {
          background: "#f97316",
          color: "#fff",
          fontWeight: "900",
          fontSize: "14px",
          borderRadius: "20px",
          padding: "16px 24px",
          boxShadow:
            "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        },
        icon: "●",
      });
    }
  }, []);

  const handleImpersonateUser = useCallback((targetUser: User) => {
    if (!currentUser) return;
    if (currentUser.role !== UserRole.ADMIN && !realAdminUser) {
      addToast(tr("Apenas administradores podem simular utilizadores."), "error");
      return;
    }
    const adminToSave = realAdminUser || currentUser;
    setRealAdminUser(adminToSave);
    setCurrentUser(targetUser);

    // Record audit log for impersonation
    try {
      supabaseService.createAdminLog(
        adminToSave.id || "ADMIN",
        "IMPERSONATE_USER",
        targetUser.id,
        `Sessão de simulação iniciada para ${targetUser.nome} (${targetUser.role.toUpperCase()})`
      );
    } catch (e) {
      console.warn("Audit log error:", e);
    }

    if (targetUser.role === UserRole.COOK) {
      setCurrentView("kitchen");
    } else if (targetUser.role === UserRole.ADMIN) {
      setCurrentView("admin");
    } else {
      setCurrentView("home");
    }
    addToast(tr("Modo Simulação Ativo: A navegar como {v0} ({v1})", { v0: targetUser.nome, v1: targetUser.role.toUpperCase() }), "info");
  }, [currentUser, realAdminUser, addToast]);

  const handleStopImpersonation = useCallback(() => {
    if (realAdminUser) {
      setCurrentUser(realAdminUser);
      setRealAdminUser(null);
      setCurrentView("admin");
      addToast(tr("Modo de simulação encerrado. Regressado ao Painel de Administrador."), "success");
    }
  }, [realAdminUser, addToast]);

  const refreshData = useCallback(async (userOverride?: User | null) => {
    if (userOverride) {
      saveAndSetUser(userOverride);
    }
    if (activeRefresh.current) {
      return activeRefresh.current;
    }

    const runRefresh = async () => {
      if (!hasInitialDataRef.current) {
        setIsDataLoading(true);
      }
      const activeUser = userOverride !== undefined ? userOverride : currentUser;

      // Clear data if no user
      if (!activeUser) {
        setBookings([]);
        setUsers([]);
      }

      try {
        const bookingsPromise = activeUser
          ? activeUser.role === UserRole.ADMIN
            ? supabaseService.getBookings().catch(() => [])
            : isValidUUID(activeUser.id)
              ? supabaseService
                  .getBookingsByUserId(activeUser.id, activeUser.role)
                  .catch(() => [])
              : Promise.resolve([])
          : Promise.resolve([]);

        const usersPromise =
          activeUser && activeUser.role === UserRole.ADMIN
            ? supabaseService.getUsers().catch(() => [])
            : supabaseService.getUsersByRole(UserRole.COOK).catch(() => []);

        let [u, b, m, revs] = await Promise.all([
          usersPromise,
          bookingsPromise,
          supabaseService.getAllMenusList().catch(() => []),
          supabaseService.getAllReviews().catch(() => []),
        ]);

        if ((!u || u.length === 0) && isSupabaseReachable()) {
          console.log(
            "[Supabase Auto-Seed] Database is uninitialized. Seeding standard datasets..."
          );
          try {
            await supabaseService.seedDatabase(
              mockUsers,
              mockMenus,
              mockRecipes,
              mockBookings
            );
          } catch (seedErr) {
            console.warn("[Supabase Auto-Seed] Note during seedDatabase:", seedErr);
          }
          // Refetch after seeding
          u = await usersPromise.catch(() => mockUsers);
          if (!u || u.length === 0) u = mockUsers;
          const [newM, newRevs] = await Promise.all([
            supabaseService.getAllMenusList().catch(() => []),
            supabaseService.getAllReviews().catch(() => []),
          ]);
          m = newM && newM.length > 0 ? newM : Object.values(mockMenus).flat();
          revs = newRevs || [];
        }

        if (u) {
          let updatedList = u;
          if (userOverride) {
            updatedList = u.map((usr) =>
              usr.id === userOverride.id ? { ...usr, ...userOverride } : usr
            );
          }
          setUsers((prev) => {
            if (areEntityArraysEqual(prev, updatedList)) {
              return prev;
            }
            return updatedList;
          });
        }
        if (b) {
          setBookings((prev) => {
            if (areEntityArraysEqual(prev, b)) {
              return prev;
            }
            return b;
          });
        }
        if (revs) {
          setReviews((prev) => {
            if (areEntityArraysEqual(prev, revs)) {
              return prev;
            }
            return revs;
          });
        }

        if (m) {
          setAllMenus((prev) => {
            if (areEntityArraysEqual(prev, m)) {
              return prev;
            }
            return m;
          });
        }

        if (u && u.length > 0 && m && m.length > 0) {
          hasInitialDataRef.current = true;
        }

        if (activeUser) {
          const freshUser = await supabaseService
            .getProfileById(activeUser.id)
            .catch(() => null);
          const finalUser = userOverride
            ? freshUser
              ? { ...freshUser, ...userOverride }
              : { ...activeUser, ...userOverride }
            : freshUser || activeUser;

          if (finalUser) {
            saveAndSetUser(finalUser);
          }
        }
      } catch (e: any) {
        if (e?.code === 'SUPABASE_UNAVAILABLE' || e?.message?.includes("fetch") || e?.message?.includes("unavailable")) {
          console.warn("[App] Ligação remota indisponível durante refresh; a manter cache local.");
        } else if (e?.code === '42501' || e?.message?.includes('row-level security')) {
          console.warn("[App] RLS ativado no servidor durante refresh, usando dados em cache local.");
        } else {
          console.warn("[App] Refresh note:", e);
        }
      } finally {
        setIsDataLoading(false);
        activeRefresh.current = null;
      }
    };

    activeRefresh.current = runRefresh();
    return activeRefresh.current;
  }, [currentUser, saveAndSetUser]);

  // SUBSCRIPÇÃO REALTIME ULTRA-RESILIENTE (SUPABASE)
  useEffect(() => {
    if (!isSupabaseConfigured() || !isSupabaseReachable()) {
      return;
    }

    let isSubscribed = true;
    const rawId = currentUser?.id;
    const effectiveUserId = rawId ? (isValidUUID(rawId) ? rawId : toValidUUID(rawId)) : null;

    const channelName = effectiveUserId
      ? `cookr-rt-${effectiveUserId}-${Date.now()}`
      : `cookr-rt-guest-${Date.now()}`;

    const channel = supabase.channel(channelName);

    // 1. Reservas em tempo real (Bookings)
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bookings" },
      async (payload) => {
        if (!isSubscribed) return;
        try {
          if (!currentUser || !effectiveUserId) return;

          let freshBookings: Booking[] = [];
          if (currentUser.role === UserRole.ADMIN) {
            freshBookings = await supabaseService.getBookings();
          } else {
            freshBookings = await supabaseService.getBookingsByUserId(effectiveUserId, currentUser.role);
          }
          if (freshBookings) {
            setBookings(freshBookings);
          }

          if (payload.eventType === "INSERT") {
            const newBooking = payload.new as any;
            if (currentUser.role === UserRole.ADMIN) {
              addToast(
                getLangText({
                  pt: "NOVA RESERVA REGISTADA NO SISTEMA!",
                  es: "¡NUEVA RESERVA REGISTRADA!",
                  en: "NEW BOOKING REGISTERED!",
                  fr: "NOUVELLE RÉSERVATION ENREGISTRÉE !",
                }),
                "new_order"
              );
            } else if (currentUser.role === UserRole.COOK) {
              const bCookId = newBooking.cook_id || newBooking.cookId;
              if (bCookId === effectiveUserId || bCookId === rawId) {
                addToast(
                  getLangText({
                    pt: "NOVO PEDIDO DE RITUAL!",
                    es: "¡NUEVO PEDIDO DE RITUAL!",
                    en: "NEW RITUAL REQUEST!",
                    fr: "NOUVELLE DEMANDE DE RITUEL !",
                  }),
                  "new_order"
                );
              }
            } else {
              addToast(
                getLangText({
                  pt: "Pedido enviado! Aguarde que o Chef aceite o ritual.",
                  es: "¡Pedido enviado! Espere a que el Chef acepte el ritual.",
                  en: "Request sent! Please wait for the Chef to accept the ritual.",
                  fr: "Demande envoyée ! Attendez que le Chef accepte le rituel.",
                }),
                "success"
              );
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as any;
            if (currentUser.role === UserRole.CLIENT) {
              if (updated.status === BookingStatus.ACCEPTED) {
                addToast(
                  getLangText({
                    pt: "Excelente! O Chef aceitou o seu ritual.",
                    es: "¡Excelente! El Chef aceptó su ritual.",
                    en: "Great! The Chef accepted your ritual.",
                    fr: "Excellent ! Le Chef a accepté votre rituel.",
                  }),
                  "success"
                );
              } else if (updated.status === BookingStatus.REJECTED) {
                addToast(
                  getLangText({
                    pt: "O Chef recusou o seu pedido de ritual.",
                    es: "El Chef rechazó su pedido de ritual.",
                    en: "The Chef declined your ritual request.",
                    fr: "Le Chef a refusé votre demande de rituel.",
                  }),
                  "error"
                );
              } else if (updated.status === BookingStatus.COMPLETED) {
                addToast(
                  getLangText({
                    pt: "O seu ritual foi finalizado! Esperamos que tenha gostado.",
                    es: "¡Su ritual se ha completado! Esperamos que lo haya disfrutado.",
                    en: "Your ritual is completed! We hope you enjoyed it.",
                    fr: "Votre rituel est terminé ! Nous espérons que vous avez apprécié.",
                  }),
                  "success"
                );
              }
            } else if (currentUser.role === UserRole.COOK) {
              if (updated.status === BookingStatus.CANCELLED) {
                addToast(
                  getLangText({
                    pt: "Uma reserva foi cancelada pelo cliente.",
                    es: "Una reserva fue cancelada por el cliente.",
                    en: "A booking was cancelled by the client.",
                    fr: "Une réservation a été annulée par le client.",
                  }),
                  "error"
                );
              }
            }
          }
        } catch (e) {
          console.warn("[Supabase Realtime] bookings refresh warning:", e);
        }
      }
    );

    // 2. Notificações diretas do utilizador
    if (effectiveUserId) {
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${effectiveUserId}`,
        },
        (payload) => {
          if (!isSubscribed) return;
          if (payload.new && (payload.new as any).message) {
            addToast((payload.new as any).message, "info");
          }
        }
      );
    }

    // 3. Perfis e Chefs em tempo real (Aprovações de Admin, Estado, Disponibilidade)
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "profiles",
      },
      async (payload) => {
        if (!isSubscribed) return;
        try {
          const changed = payload.new as any;
          if (effectiveUserId && changed && (changed.id === effectiveUserId || changed.id === rawId)) {
            const profile = await supabaseService.getProfileById(effectiveUserId);
            if (profile) {
              setCurrentUser((prev) => (prev ? { ...prev, ...profile } : profile));
            }
          }

          // Atualização em tempo real de chefs no catálogo para todos os utilizadores
          const freshChefs = currentUser?.role === UserRole.ADMIN
            ? await supabaseService.getUsers()
            : await supabaseService.getUsersByRole(UserRole.COOK);
          if (freshChefs && freshChefs.length > 0) {
            setUsers(freshChefs);
          }
        } catch (e) {
          console.warn("[Supabase Realtime] profile refresh warning:", e);
        }
      }
    );

    // 3b. Chefs em tempo real: online/offline e agenda (horários livres/ocupados) chegam a todos na hora
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "chefs" },
      (payload) => {
        if (!isSubscribed) return;
        const row = payload.new as any;
        const chefId = row?.profile_id;
        if (!chefId) return;
        const patch: any = {};
        if (row.is_available !== undefined && row.is_available !== null) {
          patch.isAvailable = row.is_available;
          patch.is_available = row.is_available;
        }
        if (row.disponibilidade !== undefined) {
          patch.disponibilidade = row.disponibilidade;
        }
        if (Object.keys(patch).length === 0) return;
        setUsers((prev) => (prev || []).map((u: any) => (u.id === chefId ? { ...u, ...patch } : u)));
        setCurrentUser((prev: any) => (prev && prev.id === chefId ? { ...prev, ...patch } : prev));
      }
    );

    // 4. Menus em tempo real
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "menus" },
      async () => {
        if (!isSubscribed) return;
        try {
          const menus = await supabaseService.getAllMenusList();
          setAllMenus(menus);
        } catch (e) {
          console.warn("[Supabase Realtime] menus refresh warning:", e);
        }
      }
    );

    // 5. Avaliações (Reviews) em tempo real
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "reviews" },
      async () => {
        if (!isSubscribed) return;
        try {
          const reviewsList = await supabaseService.getAllReviews();
          setReviews(reviewsList);
        } catch (e) {
          console.warn("[Supabase Realtime] reviews refresh warning:", e);
        }
      }
    );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[Supabase Realtime] Conectado com sucesso (${channelName})`);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`[Supabase Realtime] Canal ${channelName} indisponível (${status}).`);
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore cleanup
        }
      }
    });

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.role]);

  const handleLogout = () => {
    if (currentUser?.id) {
      sessionStorage.removeItem(`cookr_user_draft_${currentUser.id}`);
      sessionStorage.removeItem(`cook_profile_draft_${currentUser.id}`);
    }
    localStorage.removeItem("cookr_user");
    setCurrentUser(null);
    setRealAdminUser(null);
    setBookings([]);
    setUsers([]);
    setReviews([]);
    navigateTo("landing");
    // Termina a sessão no Supabase e limpa dados pessoais guardados no dispositivo.
    signOutAndClearLocalData().catch(() => {});
  };

  const handleUpdateUser = async (data: Partial<User>) => {
    if (!currentUser) return;
    try {
      await supabaseService.updateUserProfile(currentUser.id, data);
      await refreshData(currentUser);
      addToast(
        getLangText({
          pt: "Perfil sincronizado!",
          es: "¡Perfil sincronizado!",
          en: "Profile synchronized!",
          fr: "Profil synchronisé !",
        }),
        "success"
      );
    } catch (e) {
      addToast(
        getLangText({
          pt: "Erro ao gravar no servidor.",
          es: "Error al guardar en el servidor.",
          en: "Error saving to server.",
          fr: "Erreur lors de l'enregistrement sur le serveur.",
        }),
        "error"
      );
    }
  };

  useEffect(() => {
    const init = async () => {
      // Normalização preventiva de IDs legados no localStorage
      try {
        const saved = localStorage.getItem("cookr_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id && !isValidUUID(parsed.id)) {
            parsed.id = toValidUUID(parsed.id);
            localStorage.setItem("cookr_user", JSON.stringify(persistableUser(parsed)));
          }
        }
      } catch (e) {
        // Silently ignore parsing errors
      }

      try {
        await waitForAuthInit().catch(() => {}); // Ensure Supabase Auth session is ready

        // Segurança: o utilizador guardado no browser só é aceite se existir uma sessão
        // Supabase válida para o mesmo id. Evita "entrar" editando o localStorage.
        const verifiedId = await getVerifiedSessionUserId();
        if (verifiedId !== undefined) {
          try {
            const rawSaved = localStorage.getItem("cookr_user");
            const savedUser = rawSaved ? JSON.parse(rawSaved) : null;
            if (savedUser && (!verifiedId || savedUser.id !== verifiedId)) {
              localStorage.removeItem("cookr_user");
            }
          } catch (_) {
            localStorage.removeItem("cookr_user");
          }
        }

        const saved = localStorage.getItem("cookr_user");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            let fresh: User | null = null;

            if (parsed.id && isValidUUID(parsed.id)) {
              fresh = await supabaseService.getProfileById(parsed.id).catch(() => null);
            } else if (parsed.email) {
              fresh = await supabaseService.getProfileByEmail(parsed.email).catch(() => null);
            }

            if (fresh) {
              if (
                fresh.role === UserRole.COOK &&
                (fresh.status === UserStatus.PENDING ||
                  fresh.status === UserStatus.UNDER_REVIEW) &&
                fresh.email !== ADMIN_EMAIL
              ) {
                localStorage.removeItem("cookr_user");
                await refreshData(null).catch(() => {});
              } else {
                saveAndSetUser(fresh);
                if (currentView === "landing") {
                  const defaultView =
                    fresh.role === UserRole.COOK ? "kitchen" : "home";
                  setCurrentView(defaultView);
                }
                await refreshData(fresh).catch(() => {});
              }
            } else {
              // Se o perfil não existe ou tinha ID legado, normalizar para UUID válido
              if (!parsed.id || !isValidUUID(parsed.id)) {
                parsed.id = toValidUUID(parsed.id || parsed.email || 'user');
              }
              // Auto-heal: garantir que o perfil existe em 'profiles' com UUID válido
              if (isSupabaseReachable()) {
                try {
                  await supabase.from('profiles').upsert({
                    id: parsed.id,
                    email: parsed.email?.toLowerCase().trim() || `${parsed.id}@cookr.local`,
                    nome: parsed.nome || 'Utilizador',
                    telefone: parsed.telefone || null,
                    role: parsed.role || UserRole.CLIENT,
                    status: parsed.status || UserStatus.ACTIVE,
                    avatar_url: parsed.avatar_url || null,
                    cover_url: parsed.cover_url || null,
                    morada: parsed.morada || null,
                    cidade: parsed.cidade || null,
                    localizacao: parsed.localizacao || null,
                  }, { onConflict: 'id' });
                } catch (upsertErr) {
                  console.warn('[App] Auto-heal legacy profile note:', upsertErr);
                }
              }

              saveAndSetUser(parsed);
              if (currentView === "landing") {
                const defaultView =
                  parsed.role === UserRole.COOK ? "kitchen" : "home";
                setCurrentView(defaultView);
              }
              await refreshData(parsed).catch(() => {});
            }
          } catch (e: any) {
            console.warn("[App] Erro ao validar sessão:", e.message);
            const saved = localStorage.getItem("cookr_user");
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.id && !isValidUUID(parsed.id)) {
                parsed.id = toValidUUID(parsed.id);
              }
              saveAndSetUser(parsed);
              if (currentView === "landing") {
                setCurrentView(
                  parsed.role === UserRole.COOK ? "kitchen" : "home",
                );
              }
            }
          }
        } else {
          await refreshData(null).catch(() => {});
        }
      } catch (globalInitErr) {
        console.warn("[App] Erro no carregamento de dados em segundo plano:", globalInitErr);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    // Periodic auto-expiry cron check (every 60 seconds)
    const expiryIntervalId = setInterval(async () => {
      try {
        await waitForAuthInit(); // Ensure auth is ready
        const saved = localStorage.getItem("cookr_user");
        if (saved) {
          const user = JSON.parse(saved);
          if (user?.id && user?.role && isValidUUID(user.id)) {
            await supabaseService.autoExpirePastBookings(user.id, user.role);
          }
        }
      } catch (err) {
        console.warn("[Periodic Expiry Warning]:", err);
      }
    }, 60000);

    return () => {
      clearInterval(expiryIntervalId);
    };
  }, []);

  // Link de recuperação de palavra-passe recebido por email: abre o ecrã para definir a nova.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryError(null);
        setShowRecoveryModal(true);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleForgotPassword = async () => {
    const email = loginEmail.toLowerCase().trim();
    if (!email || !email.includes("@")) {
      setLoginError(tr("Escreva primeiro o seu email e volte a clicar em \"Esqueci-me da palavra-passe\"."));
      return;
    }
    setLoginError(null);
    try {
      await supabaseService.resetPasswordForEmail(email);
    } catch (_) {
      // Resposta igual com ou sem conta, para não revelar que emails existem.
    }
    addToast(
      tr("Se existir uma conta com esse email, enviámos instruções para definir uma nova palavra-passe."),
      "success",
    );
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    if (recoveryPassword.length < 8 || !/[A-Za-z]/.test(recoveryPassword) || !/\d/.test(recoveryPassword)) {
      setRecoveryError(tr("A palavra-passe deve ter pelo menos 8 caracteres, com letras e números."));
      return;
    }
    if (recoveryPassword !== recoveryPassword2) {
      setRecoveryError(tr("As palavras-passe não coincidem."));
      return;
    }
    setIsRecoveryPending(true);
    try {
      await supabaseService.updatePassword(recoveryPassword);
      await supabase.auth.signOut().catch(() => {});
      try { localStorage.removeItem("cookr_user"); } catch (_) {}
      setShowRecoveryModal(false);
      setRecoveryPassword("");
      setRecoveryPassword2("");
      addToast(tr("Palavra-passe atualizada! Entre com a nova palavra-passe."), "success");
      navigateTo("login-selection");
    } catch (err: any) {
      setRecoveryError(err?.message || tr("Não foi possível atualizar a palavra-passe. Peça um novo link."));
    } finally {
      setIsRecoveryPending(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedEmail = loginEmail.toLowerCase().trim();
    if (!sanitizedEmail || !selectedRoleForAuth) return;

    setIsLoginPending(true);
    setLoginError(null);
    try {
      const user = await supabaseService.signIn(sanitizedEmail, loginPassword);

      if (user) {
        const isAdminMaster = sanitizedEmail === ADMIN_EMAIL;

        if (
          user.role === UserRole.COOK &&
          (user.status === UserStatus.PENDING ||
            user.status === UserStatus.UNDER_REVIEW) &&
          !isAdminMaster
        ) {
          setLoginError(
            user.status === UserStatus.UNDER_REVIEW
              ? getLangText({
                  pt: "Perfil em tratamento. Verifique o seu email.",
                  es: "Perfil en proceso. Verifique su correo electrónico.",
                  en: "Profile under review. Please check your email.",
                  fr: "Profil en cours de traitement. Vérifiez votre e-mail.",
                })
              : getLangText({
                  pt: "Aguarde a validação da administração.",
                  es: "Espere la validación de la administración.",
                  en: "Please wait for administration approval.",
                  fr: "Veuillez attendre la validation de l'administration.",
                }),
          );
          setIsLoginPending(false);
          return;
        }

        // Adaptar dinamicamente à role real da conta
        const effectiveRole = isAdminMaster ? UserRole.ADMIN : user.role;
        setSelectedRoleForAuth(effectiveRole);
        saveAndSetUser(user);
        await refreshData(user);

        // Navigate to role-specific default view
        if (isAdminMaster || effectiveRole === UserRole.ADMIN) {
          navigateTo("admin");
        } else if (effectiveRole === UserRole.COOK) {
          navigateTo("search");
        } else {
          if (fineDiningIntentAfterAuth) {
            setFineDiningIntentAfterAuth(false);
            setIsFineDiningModalOpen(true);
            navigateTo("search");
          } else {
            navigateTo("home");
          }
        }

        const roleLabel = effectiveRole === UserRole.COOK ? "Chef" : effectiveRole === UserRole.ADMIN ? "Admin" : "Cliente";
        addToast(`${getLangText({ pt: "Bem-vindo", es: "Bienvenido", en: "Welcome", fr: "Bienvenue" })}, ${user.nome}! (${roleLabel})`, "success");
      } else {
        setLoginError(
          getLangText({
            pt: "Utilizador não encontrado.",
            es: "Usuario no encontrado.",
            en: "User not found.",
            fr: "Utilisateur introuvable.",
          })
        );
      }
    } catch (err: any) {
      let msg = err?.message || "";
      if (typeof msg === "string" && msg.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(msg);
          if (parsed.error) {
            msg = parsed.error;
          }
        } catch (e) {
          // ignore parsing error, fallback to raw message
        }
      }

      const lowerMsg = String(msg).toLowerCase();
      if (lowerMsg.includes("invalid login credentials")) {
        msg = tr("Email ou palavra-passe incorretos.");
      } else if (lowerMsg.includes("email not confirmed")) {
        msg = tr("Confirme primeiro o seu email: abra a mensagem que lhe enviámos e clique no link.");
      } else if (lowerMsg.includes("rate limit") || lowerMsg.includes("too many")) {
        msg = tr("Demasiadas tentativas. Aguarde um minuto e tente de novo.");
      } else if (lowerMsg.includes("failed to fetch") || lowerMsg.includes("network")) {
        msg = tr("Sem ligação à internet. Verifique a rede e tente de novo.");
      }

      if (msg === "Palavra-passe incorreta.") {
        setLoginError(
          getLangText({
            pt: "Palavra-passe incorreta.",
            es: "Contraseña incorrecta.",
            en: "Incorrect password.",
            fr: "Mot de passe incorrect.",
          })
        );
      } else {
        const errorText = msg || getLangText({
          pt: "Erro de autenticação.",
          es: "Error de autenticación.",
          en: "Authentication error.",
          fr: "Erreur d'authentification.",
        });
        setLoginError(errorText);
        addToast(errorText, "error");
      }
    } finally {
      setIsLoginPending(false);
    }
  };

  const handleGoogleAuth = async (overrideRole?: UserRole | null) => {
    setIsLoginPending(true);
    setLoginError(null);
    try {
      const { user, isNew, oauthUser } =
        await supabaseService.signInWithGoogle();
      const currentOAuthUser = oauthUser;

      if (!isNew && user) {
        // User is already registered! Log them in immediately.
        const isAdminMaster = user.email === ADMIN_EMAIL;

        if (
          user.role === UserRole.COOK &&
          (user.status === UserStatus.PENDING ||
            user.status === UserStatus.UNDER_REVIEW) &&
          !isAdminMaster
        ) {
          addToast(
            user.status === UserStatus.UNDER_REVIEW
              ? getLangText({
                  pt: "Perfil em tratamento. Verifique o seu email.",
                  es: "Perfil en proceso. Verifique su correo electrónico.",
                  en: "Profile under review. Please check your email.",
                  fr: "Profil en cours de traitement. Vérifiez votre e-mail.",
                })
              : getLangText({
                  pt: "Aguarde a validação da administração.",
                  es: "Espere la validación de la administración.",
                  en: "Please wait for administration approval.",
                  fr: "Veuillez attendre la validation de l'administration.",
                }),
            "info",
          );
          setIsLoginPending(false);
          return;
        }

        saveAndSetUser(user);
        await refreshData(user);

        if (isAdminMaster || user.role === UserRole.ADMIN) {
          navigateTo("admin");
        } else if (user.role === UserRole.COOK) {
          navigateTo("search");
        } else {
          navigateTo("home");
        }

        addToast(`${getLangText({ pt: "Bem-vindo", es: "Bienvenido", en: "Welcome", fr: "Bienvenue" })}, ${user.nome}!`, "success");
      } else {
        // New user! If a specific role is explicitly/pre-selected, register them immediately.
        const activeRole = overrideRole || selectedRoleForAuth;
        if (activeRole) {
          const profile = await supabaseService.createProfileWithGoogle(
            currentOAuthUser,
            activeRole,
          );
          if (profile) {
            if (activeRole === UserRole.COOK) {
              await refreshData();
              addToast(
                getLangText({
                  pt: "Candidatura submetida com sucesso! Aguarde a nossa curadoria.",
                  es: "¡Solicitud enviada con éxito! Espere nuestra curaduría.",
                  en: "Application submitted successfully! Please wait for our review.",
                  fr: "Candidature soumise avec succès ! Attendez notre sélection.",
                }),
                "success",
              );
              navigateTo("landing");
            } else {
              saveAndSetUser(profile);
              await refreshData(profile);
              addToast(`${getLangText({ pt: "Bem-vindo", es: "Bienvenido", en: "Welcome", fr: "Bienvenue" })}, ${profile.nome}!`, "success");
              navigateTo("home");
            }
          }
        } else {
          // Open role selection modal so they can choose
          setGooglePendingUser(currentOAuthUser);
          setShowRoleSelectionModal(true);
        }
      }
    } catch (err: any) {
      console.warn("Google Auth Note:", err);
      // Suppress standard popup-closed errors from showing raw error toasts
      if (err && err.code !== "auth/popup-closed-by-user") {
        addToast(
          getLangText({
            pt: "Erro na autenticação com o Google.",
            es: "Error en la autenticación con Google.",
            en: "Google authentication error.",
            fr: "Erreur d'authentification avec Google.",
          }),
          "error"
        );
      }
    } finally {
      setIsLoginPending(false);
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigateTo = useCallback((view: string, tab?: string) => {
    console.log(`Navigating to: ${view}${tab ? ` (tab: ${tab})` : ""}`);
    setCurrentView(view);
    if (tab) setCurrentTab(tab);
    else setCurrentTab(null);

    if (typeof window !== "undefined") {
      const targetPath =
        view === "fine-dining"
          ? "/fine-dining"
          : view === "sushi-de-autor"
          ? "/sushi-de-autor"
          : view === "tradicional-lusa" || view === "tradicional"
          ? "/tradicional-lusa"
          : view === "landing"
          ? "/"
          : `/${view}`;
      if (window.location.pathname !== targetPath) {
        try {
          window.history.pushState(null, "", targetPath);
        } catch (e) {
          console.warn("Could not push state:", e);
        }
      }
    }

    window.scrollTo(0, 0);
    if (view === "chef-profile" || view === "home") refreshData();
    setIsMobileMenuOpen(false);
  }, [refreshData]);

  // Regresso do Stripe (pagamento do cliente / configuração de recebimentos do chef).
  useEffect(() => {
    if (!currentUser?.id || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const pay = params.get("payment");
    const connect = params.get("connect");
    if (!pay && !connect) return;
    window.history.replaceState({}, "", window.location.pathname);
    if (pay === "success") {
      addToast(tr("Pagamento autorizado! O valor só é cobrado quando o chef aceitar a reserva."), "success");
      navigateTo("agenda");
    } else if (pay === "cancelled") {
      addToast(tr("Pagamento cancelado. A reserva fica pendente; pode pagar a partir da Agenda."), "info");
      navigateTo("agenda");
    } else if (connect) {
      navigateTo("settings");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);


  const handleSelectChef = useCallback((
    chefId: string,
    date?: string,
    time?: string,
    step?: any,
  ) => {
    setSelectedChefId(chefId);
    setSelectedDate(date || null);
    setSelectedTime(time || null);
    setInitialBookingStep(step || null);
    navigateTo("chef-profile");
  }, [navigateTo]);

  const handleSelectChefFromDashboard = useCallback((id: string, step?: any) => {
    handleSelectChef(id, undefined, undefined, step);
  }, [handleSelectChef]);

  const [isChatReadOnly, setIsChatReadOnly] = useState(false);

  const handleOpenChat = useCallback((partnerId: string, isReadOnly: boolean = false) => {
    setSelectedChatPartnerId(partnerId);
    setIsChatReadOnly(isReadOnly);
    navigateTo("messages");
  }, [navigateTo]);

  const handleApproveCook = async (
    userId: string,
    action: "approve" | "reject" | "review",
    notes?: string,
  ) => {
    try {
      let status: UserStatus;
      switch (action) {
        case "approve":
          status = UserStatus.ACTIVE;
          break;
        case "reject":
          status = UserStatus.SUSPENDED;
          break;
        case "review":
          status = UserStatus.UNDER_REVIEW;
          break;
        default:
          status = UserStatus.PENDING;
      }
      const updateData: any = { status, admin_notes: notes };
      if (action === "approve") {
        updateData.approvedByAdmin = true;
      }
      await supabaseService.updateUserProfile(userId, updateData);
      await supabaseService.createAdminLog(
        currentUser?.id || "SYSTEM",
        `AUDIT_${action.toUpperCase()}`,
        userId,
        notes || "N/A",
      );
      await refreshData();
      addToast(tr("Curadoria atualizada."), "success");
      return true;
    } catch (e) {
      addToast(tr("Erro na curadoria."), "error");
      return false;
    }
  };

  const renderView = () => {
    if (isLoading)
      return (
        <div className="min-h-dvh flex items-center justify-center bg-white">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );

    // Supabase stack ativo

    if (currentView === "terms")
      return (
        <TermsConditions
          onBack={() => navigateTo(currentUser ? "home" : "landing")}
        />
      );
    if (currentView === "privacy")
      return (
        <PrivacyPolicy
          onBack={() => navigateTo(currentUser ? "home" : "landing")}
        />
      );
    if (currentView === "haccp")
      return (
        <HaccpPolicy
          onBack={() => navigateTo(currentUser ? "home" : "landing")}
        />
      );
    if (currentView === "help")
      return (
        <HelpView
          currentUser={currentUser}
          onOpenChat={handleOpenChat}
          onBack={() => navigateTo(currentUser ? "home" : "landing")}
        />
      );

    if (currentView === "register-client")
      return (
        <ClientOnboarding
          onComplete={async (d) => {
            try {
              const user = await supabaseService.createProfile(
                d,
                UserRole.CLIENT,
              );
              if (user && (user as any).pendingEmailConfirmation) {
                addToast(
                  tr("Conta criada! Enviámos um email para confirmar o seu endereço. Confirme e depois entre com a sua palavra-passe."),
                  "success",
                );
                setTimeout(() => navigateTo("login-selection"), 4000);
                return true;
              }
              if (user) {
                saveAndSetUser(user);
                await refreshData(user);
                addToast(`${getLangText({ pt: "Bem-vindo", es: "Bienvenido", en: "Welcome", fr: "Bienvenue" })}, ${user.nome}!`, "success");
                setTimeout(() => navigateTo("home"), 4000);
                return true;
              }
              return false;
            } catch (err: any) {
              console.warn("Erro no registo:", err);
              addToast(
                err.message ||
                  "Erro ao criar perfil. Verifique a base de dados.",
                "error",
              );
              return false;
            }
          }}
          onBack={() => navigateTo("register-selection")}
        />
      );
    if (currentView === "register-cook")
      return (
        <CookOnboarding
          onComplete={async (d) => {
            try {
              const user = await supabaseService.createProfile(
                d,
                UserRole.COOK,
              );
              if (user) {
                await refreshData();
                addToast(
                  (user as any).pendingEmailConfirmation
                    ? tr("Candidatura recebida! Confirme primeiro o seu email (enviámos-lhe uma mensagem). Depois aguarde a nossa curadoria.")
                    : tr("Candidatura submetida com sucesso! Aguarde a nossa curadoria."),
                  "success",
                );
                setTimeout(() => navigateTo("landing"), 4000); // Redirect after overlay
                return true;
              }
              return false;
            } catch (err: any) {
              console.warn("Signup note:", err);
              addToast(err.message || tr("Erro ao criar perfil de chef."), "error");
              return false;
            }
          }}
          onFinish={() => navigateTo("landing")}
          onBack={() => navigateTo("register-selection")}
          onLogin={() => navigateTo("login-selection")}
          onJoin={() => navigateTo("register-selection")}
        />
      );

    if (currentView === "login-selection")
      return (
        <div className="min-h-[100dvh] bg-slate-50/40 relative overflow-x-hidden overflow-y-auto flex flex-col justify-start items-center pt-[calc(env(safe-area-inset-top,0px)+56px)] sm:pt-20 md:pt-24 pb-8 px-3.5 sm:px-6 md:px-10 animate-in fade-in duration-700">
          {/* Light Ambient Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

          {/* Header with Logo/Back */}
          <nav className="fixed top-0 left-0 right-0 px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 md:pt-4 md:pb-4 md:px-16 flex justify-between items-center z-50 bg-white/80 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-b border-slate-100 sm:border-none">
            <Logo size="sm" onClick={() => navigateTo("landing")} />
            <div className="flex items-center gap-3 sm:gap-6">
              <button
                onClick={() => navigateTo("login-selection")}
                className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-950 hover:text-orange-500 transition-colors cursor-pointer"
              >
                {tr("Entrar")}
              </button>
              <button
                onClick={() => navigateTo("register-selection")}
                className="h-8.5 sm:h-10 px-4 sm:px-6 bg-[#0A0A0B] text-white rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all hover:bg-orange-500 shadow-md hover:shadow-orange-500/20 active:scale-95 flex items-center justify-center cursor-pointer relative before:absolute before:-inset-2 before:content-['']"
              >
                {tr("Aderir")}
              </button>
            </div>
          </nav>

          <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-center space-y-3 sm:space-y-4 md:space-y-6 text-center z-10 mt-2 sm:mt-4 md:mt-6">
            <div className="space-y-1 sm:space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-orange-50 px-2.5 py-0.5 sm:py-1 rounded-full border border-orange-100">
                <ICONS.ShieldCheck className="text-orange-500" size={10} />
                <span className="text-[8px] sm:text-[9px] font-bold text-orange-500 uppercase tracking-widest">
                  {tr("Acesso Seguro")}
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl md:text-5xl font-black text-slate-950 uppercase italic leading-none tracking-tighter">
                {tr("Entrar no")} <br className="sm:hidden" />
                <span className="text-orange-500">{tr("Portal Cookr.")}</span>
              </h2>
            </div>

            <div className="action-button-group flex flex-row gap-2.5 sm:gap-4 w-full max-w-md mx-auto items-stretch">
              <button
                onClick={() => {
                  setSelectedRoleForAuth(UserRole.CLIENT);
                  navigateTo("login-form");
                }}
                className="group relative flex-1 p-3.5 sm:p-6 bg-white rounded-xl sm:rounded-2xl border border-slate-150/80 hover:border-orange-500 transition-all shadow-md hover:shadow-orange-500/5 flex flex-col items-center justify-between gap-2.5 text-center overflow-hidden cursor-pointer min-h-[125px] sm:min-h-[160px] md:min-h-[180px]"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-orange-500/10 text-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-105 group-hover:bg-orange-500 group-hover:text-white transition-all duration-500 shadow-inner">
                  <ICONS.Users size={16} className="sm:w-5 sm:h-5" />
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <h3 className="text-[2xs] sm:text-sm md:text-base font-black uppercase italic tracking-tight text-slate-950">
                    {tr("Sou Cliente")}
                  </h3>
                  <p className="hidden sm:block text-[9px] sm:text-xs font-medium text-slate-400 leading-normal italic">
                    {tr("Aceda aos seus rituais e chefs favoritos.")}
                  </p>
                </div>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-slate-200/60 flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white group-hover:border-slate-950 transition-all duration-300">
                  <ICONS.ArrowRight size={10} className="sm:w-3.5 sm:h-3.5" />
                </div>
              </button>

              <button
                onClick={() => {
                  setSelectedRoleForAuth(UserRole.COOK);
                  navigateTo("login-form");
                }}
                className="group relative flex-1 p-3.5 sm:p-6 bg-slate-950 rounded-xl sm:rounded-2xl text-white hover:ring-4 hover:ring-orange-500/10 transition-all shadow-md flex flex-col items-center justify-between gap-2.5 text-center overflow-hidden cursor-pointer min-h-[125px] sm:min-h-[160px] md:min-h-[180px]"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/5 text-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-105 group-hover:bg-white group-hover:text-slate-950 transition-all duration-500 shadow-sm">
                  <ICONS.ChefHat size={16} className="sm:w-5 sm:h-5" />
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <h3 className="text-[2xs] sm:text-sm md:text-base font-black uppercase italic tracking-tight text-white">
                    {tr("Sou Chef")}
                  </h3>
                  <p className="hidden sm:block text-[9px] sm:text-xs font-medium text-slate-400 leading-normal italic">
                    {tr("Gerir a sua cozinha e reservas profissionais.")}
                  </p>
                </div>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-slate-950 group-hover:border-white transition-all duration-300">
                  <ICONS.ArrowRight size={10} className="sm:w-3.5 sm:h-3.5" />
                </div>
              </button>
            </div>

            <div className="w-full max-w-xs mx-auto pt-3 border-t border-slate-100 flex flex-col items-center gap-1.5">
              <div className="text-[7.5px] sm:text-[9px] font-bold uppercase text-slate-400 tracking-widest">
                {tr("Ou aceda num instante")}
              </div>
              <button
                type="button"
                onClick={() => handleGoogleAuth()}
                className="w-full h-9 sm:h-10 bg-white border border-slate-200 hover:border-slate-400 rounded-xl flex items-center justify-center gap-2 text-slate-800 font-bold text-[9px] sm:text-xs uppercase tracking-wider transition-all duration-300 relative before:absolute before:-inset-2 before:content-[''] cursor-pointer shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22.81-.6z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z"
                  />
                </svg>
                {tr("Entrar com o Google")}
              </button>
            </div>
          </div>
        </div>
      );

    if (currentView === "login-form")
      return (
        <div className="min-h-dvh bg-slate-50 flex items-center justify-center px-4 py-8">
          <div className="max-w-sm w-full bg-white p-6 md:p-8 rounded-[2rem] shadow-xl space-y-6 md:space-y-8 animate-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center mx-auto border border-slate-100 shadow-inner">
                {selectedRoleForAuth === UserRole.COOK ? (
                  <ICONS.ChefHat className="text-orange-500" size={24} />
                ) : (
                  <ICONS.Users className="text-orange-500" size={24} />
                )}
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                  {tr("Portal")}{" "}
                  {selectedRoleForAuth === UserRole.COOK ? tr("Chef") : tr("Cliente")}
                </h2>
                <p className="text-slate-400 font-medium italic text-xs">
                  {tr("Bem-vindo de volta à elite gastronómica.")}
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 md:space-y-5">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] ml-3">
                  {tr("Email de Acesso")}
                </label>
                <input
                  type="email"
                  required
                  className="w-full h-11 px-5 bg-slate-50 border-2 border-transparent rounded-xl focus:border-orange-500 focus:bg-white outline-none font-bold text-xs transition-all"
                  placeholder={tr("exemplo@cookr.pt")}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] ml-3">
                  {tr("Palavra-passe")}
                </label>
                <input
                  type="password"
                  required
                  className="w-full h-11 px-5 bg-slate-50 border-2 border-transparent rounded-xl focus:border-orange-500 focus:bg-white outline-none font-bold text-xs transition-all"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <div className="flex justify-end pr-1 pt-1">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] font-bold text-slate-500 hover:text-orange-500 underline-offset-2 hover:underline transition-colors cursor-pointer py-1"
                  >
                    {tr("Esqueci-me da palavra-passe")}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2.5 animate-in fade-in zoom-in duration-300">
                  <ICONS.AlertTriangle
                    className="text-red-500 shrink-0"
                    size={14}
                  />
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-tight leading-tight">
                    {loginError}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoginPending}
                className="w-full h-11 bg-slate-950 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-orange-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoginPending ? (
                  <ICONS.RefreshCw className="animate-spin mx-auto" size={16} />
                ) : (
                  tr("Entrar no Dashboard")
                )}
              </button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-[10px] font-black uppercase">
                  <span className="bg-white px-3 text-slate-300 tracking-widest">
                    {tr("Ou continue com")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleGoogleAuth(selectedRoleForAuth)}
                className="w-full h-11 bg-slate-50 border border-slate-200 hover:border-orange-500 rounded-xl flex items-center justify-center gap-2.5 text-slate-700 font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-orange-500 transition-all active:scale-[0.98]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22.81-.6z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z"
                  />
                </svg>
                {tr("Google")}
              </button>

              <button
                type="button"
                onClick={() => navigateTo("login-selection")}
                className="w-full text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-950 transition-colors"
              >
                {tr("Voltar à seleção")}
              </button>
            </form>
          </div>
        </div>
      );

    if (currentView === "register-selection")
      return (
        <div className="min-h-[100dvh] bg-slate-50/40 relative overflow-x-hidden overflow-y-auto flex flex-col justify-start items-center pt-[calc(env(safe-area-inset-top,0px)+56px)] sm:pt-20 md:pt-24 pb-8 px-3.5 sm:px-6 md:px-10 animate-in fade-in duration-700">
          {/* Light Ambient Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

          {/* Header with Logo/Back */}
          <nav className="fixed top-0 left-0 right-0 px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 md:pt-4 md:pb-4 md:px-16 flex justify-between items-center z-50 bg-white/80 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-b border-slate-100 sm:border-none">
            <Logo size="sm" onClick={() => navigateTo("landing")} />
            <div className="flex items-center gap-3 sm:gap-6">
              <button
                onClick={() => navigateTo("login-selection")}
                className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-950 hover:text-orange-500 transition-colors cursor-pointer"
              >
                {tr("Entrar")}
              </button>
              <button
                onClick={() => navigateTo("register-selection")}
                className="h-8.5 sm:h-10 px-4 sm:px-6 bg-[#0A0A0B] text-white rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all hover:bg-orange-500 shadow-md hover:shadow-orange-500/20 active:scale-95 flex items-center justify-center cursor-pointer relative before:absolute before:-inset-2 before:content-['']"
              >
                {tr("Aderir")}
              </button>
            </div>
          </nav>

          <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-center space-y-3 sm:space-y-4 md:space-y-6 text-center z-10 mt-2 sm:mt-4 md:mt-6">
            <div className="space-y-1 sm:space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-orange-50 px-2.5 py-0.5 sm:py-1 rounded-full border border-orange-100">
                <ICONS.Star className="text-orange-500" size={10} />
                <span className="text-[8px] sm:text-[9px] font-bold text-orange-500 uppercase tracking-widest">
                  {tr("Junte-se à Comunidade")}
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl md:text-5xl font-black text-slate-950 uppercase italic leading-none tracking-tighter">
                {tr("Criar Nova")} <br className="sm:hidden" />
                <span className="text-orange-500">{tr("Experiência.")}</span>
              </h2>
            </div>

            <div className="action-button-group flex flex-row gap-2.5 sm:gap-4 w-full max-w-md mx-auto items-stretch">
              <button
                onClick={() => navigateTo("register-client")}
                className="group relative flex-1 p-3.5 sm:p-6 bg-white rounded-xl sm:rounded-2xl border border-slate-150/80 hover:border-orange-500 transition-all shadow-md hover:shadow-orange-500/5 flex flex-col items-center justify-between gap-2.5 text-center overflow-hidden cursor-pointer min-h-[125px] sm:min-h-[160px] md:min-h-[180px]"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-orange-500/10 text-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-105 group-hover:bg-orange-500 group-hover:text-white transition-all duration-500 shadow-inner">
                  <ICONS.Plus size={16} className="sm:w-5 sm:h-5" />
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <h3 className="text-[2xs] sm:text-sm md:text-base font-black uppercase italic tracking-tight text-slate-950">
                    {tr("Registo Cliente")}
                  </h3>
                  <p className="hidden sm:block text-[9px] sm:text-xs font-medium text-slate-400 leading-normal italic">
                    {tr("Descubra os melhores chefs e menus exclusivos.")}
                  </p>
                </div>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-slate-200/60 flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white group-hover:border-slate-950 transition-all duration-300">
                  <ICONS.ArrowRight size={10} className="sm:w-3.5 sm:h-3.5" />
                </div>
              </button>

              <button
                onClick={() => navigateTo("register-cook")}
                className="group relative flex-1 p-3.5 sm:p-6 bg-slate-950 rounded-xl sm:rounded-2xl text-white hover:ring-4 hover:ring-orange-500/10 transition-all shadow-md flex flex-col items-center justify-between gap-2.5 text-center overflow-hidden cursor-pointer min-h-[125px] sm:min-h-[160px] md:min-h-[180px]"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/5 text-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-105 group-hover:bg-white group-hover:text-slate-950 transition-all duration-500 shadow-sm">
                  <ICONS.ChefHat size={16} className="sm:w-5 sm:h-5" />
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <h3 className="text-[2xs] sm:text-sm md:text-base font-black uppercase italic tracking-tight text-white">
                    {tr("Registo Chef")}
                  </h3>
                  <p className="hidden sm:block text-[9px] sm:text-xs font-medium text-slate-400 leading-normal italic">
                    {tr("Profissionalize o seu serviço e ganhe visibilidade.")}
                  </p>
                </div>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-slate-950 group-hover:border-white transition-all duration-300">
                  <ICONS.ArrowRight size={10} className="sm:w-3.5 sm:h-3.5" />
                </div>
              </button>
            </div>

            <div className="w-full max-w-xs mx-auto pt-3 border-t border-slate-100 flex flex-col items-center gap-1.5">
              <div className="text-[7.5px] sm:text-[9px] font-bold uppercase text-slate-400 tracking-widest">
                {tr("Ou registe-se num clique")}
              </div>
              <button
                type="button"
                onClick={() => handleGoogleAuth()}
                className="w-full h-9 sm:h-10 bg-white border border-slate-200 hover:border-orange-500 rounded-xl flex items-center justify-center gap-2 text-slate-800 font-bold text-[9px] sm:text-xs uppercase tracking-wider transition-all duration-300 relative before:absolute before:-inset-2 before:content-[''] cursor-pointer shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22.81-.6z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z"
                  />
                </svg>
                {tr("Aderir com o Google")}
              </button>
            </div>
          </div>
        </div>
      );

    if (currentView === "fine-dining") {
      return (
        <FineDiningPage
          onNavigate={navigateTo}
          onOpenAuth={(flow) => {
            setFineDiningIntentAfterAuth(true);
            navigateTo(flow === "register" ? "register-selection" : "login-selection");
          }}
        />
      );
    }

    if (currentView === "sushi-de-autor") {
      return (
        <SushiDeAutorPage
          onNavigate={navigateTo}
          onOpenAuth={(flow) => {
            navigateTo(flow === "register" ? "register-selection" : "login-selection");
          }}
        />
      );
    }

    if (currentView === "tradicional-lusa" || currentView === "tradicional") {
      return (
        <TradicionalLusaPage
          onNavigate={navigateTo}
          onOpenAuth={(flow) => {
            navigateTo(flow === "register" ? "register-selection" : "login-selection");
          }}
        />
      );
    }

    if (!currentUser)
      return (
        <>
          <LandingPage
            onStart={(role, flow) =>
              navigateTo(
                flow === "login" ? "login-selection" : "register-selection",
              )
            }
            onLogin={() => navigateTo("login-selection")}
            onNavigate={navigateTo}
            onOpenFineDiningModal={() => setIsFineDiningModalOpen(true)}
          />
          <FineDiningCategoryModal
            isOpen={isFineDiningModalOpen}
            onClose={() => setIsFineDiningModalOpen(false)}
            currentUser={currentUser}
            onOpenAuth={(flow) => {
              setIsFineDiningModalOpen(false);
              setFineDiningIntentAfterAuth(true);
              navigateTo(flow === "register" ? "register-selection" : "login-selection");
            }}
            allUsers={users}
            allMenus={allMenus}
            onSelectChef={(chefId) => {
              setIsFineDiningModalOpen(false);
              setSelectedChefId(chefId);
              navigateTo("chef-profile");
            }}
            onExploreFilteredSearch={() => {
              setIsFineDiningModalOpen(false);
              navigateTo("search");
            }}
          />
        </>
      );

    if (currentUser.status === UserStatus.SUSPENDED && currentUser.role !== UserRole.ADMIN) {
      return (
        <div className="min-h-dvh bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white border border-red-100 rounded-3xl p-8 shadow-xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
              <ICONS.AlertTriangle size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-800">
                {tr("Acesso Suspenso")}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {tr("A sua conta foi temporariamente suspensa por violação das diretrizes da comunidade ou termos de serviço da Cookr.")}
              </p>
            </div>

            {currentUser.admin_notes && (
              <div className="bg-red-50/50 border border-red-100/50 p-4 rounded-2xl text-left">
                <span className="text-[9px] font-bold uppercase text-red-700 block mb-1">{tr("Motivo administrativo:")}</span>
                <p className="text-xs text-slate-700 italic">
                  "{currentUser.admin_notes}"
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  window.location.href = "mailto:suporte@cookr.pt?subject=Conta%20Suspensa%20-%20" + encodeURIComponent(currentUser.email);
                }}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold uppercase text-xs tracking-widest rounded-xl shadow-md transition-all active:scale-97"
              >
                {tr("Contactar Suporte")}
              </button>
              <button
                onClick={handleLogout}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold uppercase text-xs rounded-xl transition-all"
              >
                {tr("Terminar Sessão")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    const safeBookings = bookings || [];

    if (currentView === "settings" && currentUser.role !== UserRole.CLIENT) {
      return (
        <SettingsView
          user={currentUser}
          onRefresh={refreshData}
          onNavigate={navigateTo}
          onNotify={addToast}
        />
      );
    }

    if (currentUser.role === UserRole.ADMIN) {
      if (currentView === "admin" || currentView === "home") {
        return (
          <AdminDashboard
            users={users}
            bookings={safeBookings}
            allMenus={allMenus}
            allReviews={reviews}
            onRefresh={refreshData}
            onNotify={addToast}
            onImpersonateUser={handleImpersonateUser}
          />
        );
      }
      // If admin navigates to other views (like 'search'), let it fall through
    }

    if (currentUser.role === UserRole.COOK) {
      if (currentView === "kitchen" || currentView === "ops") {
        return (
          <CookDashboard
            chefUser={currentUser}
            bookings={cookBookings}
            allUsers={users}
            onRefreshData={refreshData}
            onOpenChat={handleOpenChat}
            onNotify={addToast}
            initialView={currentView === "kitchen" ? "kitchen" : "ops"}
          />
        );
      }
      if (currentView === "profile")
        return (
          <CookProfile
            user={currentUser}
            onRefresh={refreshData}
            onLogout={handleLogout}
            onNavigate={navigateTo}
            onNotify={addToast}
          />
        );
      if (currentView === "messages")
        return (
          <ChatView
            currentUser={currentUser}
            bookings={cookBookings}
            allUsers={users}
            initialPartnerId={selectedChatPartnerId}
            onBack={() => navigateTo("home")}
          />
        );
      if (currentView === "search" || currentView === "home")
        return (
          <ChefExplore
            cooks={cooks}
            allMenus={allMenus}
            isLoading={isDataLoading}
            onSelectChef={handleSelectChefFromDashboard}
            onViewAllChefs={() => navigateTo("search")}
          />
        );
      return <CookEarnings bookings={cookBookings} />;
    }

    if (currentView === "chef-profile" && selectedChefId) {
      const chef = selectedChef;
      return chef ? (
        <ChefProfileView
          cook={chef}
          user={chef}
          currentUser={currentUser}
          bookings={safeBookings}
          recipes={allRecipes[selectedChefId] || []}
          menus={allMenusByChef[selectedChefId] || []}
          isLoading={isDataLoading}
          reviews={reviewsByChef[selectedChefId] || []}
          allUsers={users}
          onBack={() => {
            setSelectedChefId(null);
            setInitialBookingStep(null);
            navigateTo("home");
          }}
          onOpenChat={handleOpenChat}
          onRefresh={refreshData}
          onNotify={addToast}
          onBook={async (d) => {
            try {
              const created: any = await supabaseService.createBooking(d);
              await refreshData();
              // Pagamento: com o Stripe ativo, o cliente segue para o Checkout (o valor só fica retido; é cobrado quando o chef aceitar).
              if (created?.id && !created.offline && (await paymentService.isEnabled())) {
                try {
                  const url = await paymentService.startCheckout(created.id);
                  addToast(tr("A redirecionar para o pagamento seguro..."), "info");
                  window.location.href = url;
                  await new Promise(() => {});
                } catch (payErr: any) {
                  addToast(
                    tr("Reserva criada, mas não foi possível iniciar o pagamento. Pague a partir da Agenda.") + (payErr?.message ? ` (${payErr.message})` : ""),
                    "error"
                  );
                }
              }
              addToast(
                getLangText({
                  pt: "Ritual agendado com sucesso!",
                  es: "¡Ritual reservado con éxito!",
                  en: "Ritual booked successfully!",
                  fr: "Rituel réservé avec succès !",
                }),
                "success"
              );
            } catch (err: any) {
              console.warn("Aviso detalhado ao criar reserva:", err);
              const errorMsg = err.message || "Erro desconhecido";
              addToast(
                `${getLangText({ pt: "Não foi possível criar a reserva", es: "No se pudo crear la reserva", en: "Unable to create booking", fr: "Impossible de créer la réservation" })}: ${errorMsg}`,
                "error",
              );
              throw err;
            }
          }}
          onNavigate={navigateTo}
          initialDate={selectedDate}
          initialTime={selectedTime}
          initialStep={initialBookingStep}
        />
      ) : null;
    }

    if (currentView === "agenda")
      return (
        <ClientAgenda
          user={currentUser}
          bookings={clientBookings}
          reviews={reviews}
          cooks={cooks}
          onSelectChef={handleSelectChef}
          onNavigate={navigateTo}
          onOpenChat={handleOpenChat}
          onRefresh={refreshData}
          isLoading={isDataLoading}
        />
      );
    if (currentView === "messages")
      return (
        <ChatView
          currentUser={currentUser}
          partnerId={selectedChatPartnerId!}
          isReadOnly={isChatReadOnly}
          onBack={() => navigateTo("home")}
        />
      );
    if (currentView === "profile" || (currentView === "settings" && currentUser.role === UserRole.CLIENT))
      return (
        <ProfileDashboard
          user={currentUser}
          bookings={clientBookings}
          allUsers={users}
          onRefresh={refreshData}
          onOpenChat={handleOpenChat}
          onSelectChef={handleSelectChefFromDashboard}
          onNotify={addToast}
          onNavigate={navigateTo}
          initialTab={currentView === "settings" ? "definicoes" : currentTab}
        />
      );

    if (currentView === "search") {
      if (currentUser.role === UserRole.ADMIN) {
        return (
          <AdminInsights
            users={users}
            bookings={safeBookings}
            allMenus={allMenus}
          />
        );
      }
    }

    return (
      <ChefSearch
        cooks={cooks}
        users={users}
        currentUser={currentUser}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onDateChange={setSelectedDate}
        onTimeChange={setSelectedTime}
        onSelectChef={handleSelectChef}
        allMenusList={allMenus}
        collections={COOKR_COLLECTIONS}
        isLoading={isDataLoading}
      />
    );
  };

  return (
    <Layout
      user={currentUser}
      onLogout={handleLogout}
      onNavigate={navigateTo}
      currentView={currentView}
      isMobileMenuOpen={isMobileMenuOpen}
      setIsMobileMenuOpen={setIsMobileMenuOpen}
    >
      {realAdminUser && (
        <div className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] md:top-0 z-[45] w-full bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-bold shadow-2xl border-b border-white/20 animate-in slide-in-from-top duration-300 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <span className="bg-white/20 backdrop-blur-sm px-2 sm:px-2.5 py-0.5 rounded-md text-[9px] sm:text-[9.5px] font-black tracking-widest uppercase shadow-2xs">
              {tr("MODO SIMULAÇÃO")}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium">
              {tr("A visualizar como")} <strong className="underline decoration-amber-300 font-black">{currentUser?.nome}</strong> ({currentUser?.email} — <span className="uppercase font-bold">{currentUser?.role}</span>)
            </span>
          </div>
          <button
            onClick={handleStopImpersonation}
            className="self-end sm:self-auto bg-white text-slate-950 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <ICONS.X size={12} />
            <span>{tr("Sair da Simulação")}</span>
          </button>
        </div>
      )}
      <Toaster />
      <VersionCheckUtility />
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bottom-[calc(6.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 md:left-auto md:right-6 md:translate-x-0 z-[9999] max-w-[90vw] bg-slate-900 border border-slate-800 text-white rounded-full px-4 py-2 flex items-center gap-2.5 shadow-lg"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="text-[11px] font-black tracking-wider uppercase pr-0.5 whitespace-nowrap">{tr("Sem ligação")}</span>
        </div>
      )}
      <Suspense fallback={<ViewLoadingPlaceholder />}>
        {renderView()}
      </Suspense>

      {showRecoveryModal && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <form
            onSubmit={handleRecoverySubmit}
            className="bg-white rounded-[2rem] p-7 md:p-10 max-w-sm w-full shadow-2xl space-y-5 my-auto"
          >
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black tracking-tight">{tr("Nova palavra-passe")}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {tr("Escolha uma palavra-passe nova, com pelo menos 8 caracteres.")}
              </p>
            </div>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={tr("Nova palavra-passe")}
              value={recoveryPassword}
              onChange={(e) => setRecoveryPassword(e.target.value)}
              className="w-full h-12 px-5 bg-slate-50 border-2 border-transparent rounded-xl focus:border-orange-500 focus:bg-white outline-none font-bold text-sm"
            />
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={tr("Repita a palavra-passe")}
              value={recoveryPassword2}
              onChange={(e) => setRecoveryPassword2(e.target.value)}
              className="w-full h-12 px-5 bg-slate-50 border-2 border-transparent rounded-xl focus:border-orange-500 focus:bg-white outline-none font-bold text-sm"
            />
            {recoveryError && (
              <p role="alert" className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                {recoveryError}
              </p>
            )}
            <button
              type="submit"
              disabled={isRecoveryPending}
              className="w-full h-12 bg-slate-950 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isRecoveryPending ? tr("A guardar...") : tr("Guardar palavra-passe")}
            </button>
          </form>
        </div>
      )}

      {/* Role Selection Overlay for Google Signups */}
      {showRoleSelectionModal && googlePendingUser && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-sm w-full shadow-3xl text-center space-y-8 animate-in zoom-in-95 duration-500 my-auto">
            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <ICONS.ChefHat size={32} className="text-orange-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase italic tracking-tighter">
                {getLangText({ pt: "Escolha a sua Função", es: "Elija su Función", en: "Choose your Role", fr: "Choisissez votre Rôle" })}
              </h3>
              <p className="text-slate-400 font-medium italic text-[11px] leading-relaxed">
                {getLangText({ pt: "Olá", es: "Hola", en: "Hello", fr: "Bonjour" })}, {googlePendingUser.displayName || getLangText({ pt: "Gastrónomo", es: "Gastrónomo", en: "Gourmet", fr: "Gourmet" })}! <br />
                {getLangText({ pt: "Como deseja aderir ao Cookr?", es: "¿Cómo desea unirse a Cookr?", en: "How do you wish to join Cookr?", fr: "Comment souhaitez-vous rejoindre Cookr ?" })}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={async () => {
                  try {
                    const user = await supabaseService.createProfileWithGoogle(
                      googlePendingUser,
                      UserRole.CLIENT,
                    );
                    if (user) {
                      saveAndSetUser(user);
                      await refreshData(user);
                      addToast(`${getLangText({ pt: "Bem-vindo", es: "Bienvenido", en: "Welcome", fr: "Bienvenue" })}, ${user.nome}!`, "success");
                      setShowRoleSelectionModal(false);
                      setGooglePendingUser(null);
                      navigateTo("home");
                    }
                  } catch (err: any) {
                    addToast(getLangText({ pt: "Erro ao criar perfil Google.", es: "Error al crear perfil de Google.", en: "Error creating Google profile.", fr: "Erreur lors de la création du profil Google." }), "error");
                  }
                }}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <ICONS.Users size={14} />
                {getLangText({ pt: "Ser Cliente", es: "Ser Cliente", en: "Be a Client", fr: "Être Client" })}
              </button>

              <button
                onClick={async () => {
                  try {
                    const user = await supabaseService.createProfileWithGoogle(
                      googlePendingUser,
                      UserRole.COOK,
                    );
                    if (user) {
                      await refreshData();
                      addToast(
                        getLangText({
                          pt: "Candidatura submetida com sucesso! Aguarde a nossa curadoria.",
                          es: "¡Solicitud enviada con éxito! Espere nuestra curaduría.",
                          en: "Application submitted successfully! Please wait for our review.",
                          fr: "Candidature soumise avec succès ! Attendez notre sélection.",
                        }),
                        "success",
                      );
                      setShowRoleSelectionModal(false);
                      setGooglePendingUser(null);
                      navigateTo("landing");
                    }
                  } catch (err: any) {
                    addToast(getLangText({ pt: "Erro ao criar perfil de chef.", es: "Error al crear perfil de chef.", en: "Error creating chef profile.", fr: "Erreur lors de la création du profil de chef." }), "error");
                  }
                }}
                className="w-full py-4 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <ICONS.ChefHat size={14} />
                {getLangText({ pt: "Candidatar como Chef", es: "Postularse como Chef", en: "Apply as Chef", fr: "Postuler comme Chef" })}
              </button>
            </div>
            <button
              onClick={() => {
                setShowRoleSelectionModal(false);
                setGooglePendingUser(null);
              }}
              className="text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-950 transition-colors block mx-auto pt-2"
            >
              {getLangText({ pt: "Cancelar", es: "Cancelar", en: "Cancel", fr: "Annuler" })}
            </button>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        <FineDiningCategoryModal
          isOpen={isFineDiningModalOpen}
          onClose={() => setIsFineDiningModalOpen(false)}
          currentUser={currentUser}
          onOpenAuth={(flow) => {
            setIsFineDiningModalOpen(false);
            setFineDiningIntentAfterAuth(true);
            navigateTo(flow === "register" ? "register-selection" : "login-selection");
          }}
          allUsers={users}
          allMenus={allMenus}
          onSelectChef={(chefId) => {
            setIsFineDiningModalOpen(false);
            setSelectedChefId(chefId);
            navigateTo("chef-profile");
          }}
          onExploreFilteredSearch={() => {
            setIsFineDiningModalOpen(false);
            navigateTo("search");
          }}
        />
      </Suspense>

      <PremiumToastContainer toasts={toasts} setToasts={setToasts} />
    </Layout>
  );
};

export default App;
