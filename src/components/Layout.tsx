import React, { useState, useEffect } from "react";
import { User, UserRole } from "../types";
import { ICONS, PLATFORM_NAME } from "../constants";
import Logo from "./Logo";
import { motion } from "motion/react";
import { supabase, isSupabaseConfigured, isSupabaseReachable } from "../lib/supabaseClient";
import { isValidUUID, toValidUUID } from "../services/supabaseService";
import { NotificationCenter } from "./NotificationCenter";
import { Bell } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

import { tr } from "../lib/tr";
interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  currentView: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  user,
  onLogout,
  onNavigate,
  currentView,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}) => {
  const { language, setLanguage, t } = useLanguage();

  const navItems = [
    {
      id: "search",
      label: user?.role === UserRole.ADMIN ? t("nav_insights") : t("nav_explore"),
      icon: user?.role === UserRole.ADMIN ? ICONS.Zap : ICONS.Search,
      roles: [UserRole.CLIENT, UserRole.COOK, UserRole.ADMIN],
    },
    {
      id: "agenda",
      label: t("nav_agenda"),
      icon: ICONS.Calendar,
      roles: [UserRole.CLIENT],
    },
    { id: "ops", label: t("nav_operations"), icon: ICONS.Zap, roles: [UserRole.COOK] },
    {
      id: "kitchen",
      label: t("nav_kitchen"),
      icon: ICONS.ChefHat,
      roles: [UserRole.COOK],
    },
    {
      id: "earnings",
      label: t("nav_earnings"),
      icon: ICONS.CreditCard,
      roles: [UserRole.COOK],
    },
    {
      id: "admin",
      label: t("nav_admin"),
      icon: ICONS.Shield,
      roles: [UserRole.ADMIN],
    },
    {
      id: "settings",
      label: t("nav_settings"),
      icon: ICONS.Settings,
      roles: [UserRole.CLIENT, UserRole.COOK, UserRole.ADMIN],
    },
    {
      id: "profile",
      label: t("nav_profile"),
      icon: ICONS.Users,
      roles: [UserRole.CLIENT, UserRole.COOK],
    },
  ];

  const filteredNav = navItems.filter(
    (item) => !user || item.roles.includes(user.role),
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [brokenAvatar, setBrokenAvatar] = useState<string | null>(null);
  const [isNotifCenterOpen, setIsNotifCenterOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !user.id || !isSupabaseConfigured() || !isSupabaseReachable()) {
      setUnreadCount(0);
      return;
    }
    const effectiveUserId = isValidUUID(user.id) ? user.id : toValidUUID(user.id);

    const fetchCount = async () => {
      if (!isSupabaseReachable()) return;
      try {
        const { count, error } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", effectiveUserId)
          .eq("is_read", false);

        if (error) {
          console.warn("Aviso ao carregar contagem de notificações do Supabase:", error.message || error);
          return;
        }
        if (count !== null) {
          setUnreadCount(count);
        }
      } catch (err) {
        console.warn("Aviso ao carregar contagem de notificações do Supabase:", err);
      }
    };

    fetchCount();

    const channel = supabase
      .channel(`layout-notifs-${effectiveUserId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${effectiveUserId}`,
        },
        () => {
          fetchCount();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          try {
            supabase.removeChannel(channel);
          } catch {
            // ignore cleanup
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const checkModal = () => {
      // Look for elements that represent modals (z-indices: 150, 500, 600, 1000, 1100, 2000, 10000, etc.)
      const modalElements = document.querySelectorAll(
        '.fixed.z-\\[100\\], .fixed.z-\\[150\\], .fixed.z-\\[500\\], .fixed.z-\\[600\\], .fixed.z-\\[1000\\], .fixed.z-\\[1100\\], .fixed.z-\\[2000\\], .fixed.z-\\[10000\\]'
      );
      
      const hasActiveModal = Array.from(modalElements).some(el => {
        const tagName = el.tagName.toLowerCase();
        // Exclude the bottom nav and the mobile header which shouldn't count as modals
        if (
          (tagName === 'nav' && el.className.includes('bottom-')) ||
          tagName === 'header'
        ) {
          return false;
        }
        const className = el.className || "";
        return className.includes("bg-slate-950") || className.includes("backdrop-blur") || className.includes("bg-black") || className.includes("bg-white");
      });

      setIsModalOpen(hasActiveModal);
    };

    checkModal();

    // Agrupa mutações num único frame (antes corria querySelectorAll a cada alteração do DOM).
    let rafId = 0;
    const observer = new MutationObserver(() => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        checkModal();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  return (
    <div className="min-h-dvh bg-white flex flex-col md:flex-row w-full max-w-full overflow-x-hidden">
      {/* Sidebar - Desktop & Tablet */}
      {user && (
        <aside className="hidden md:flex w-20 lg:w-72 bg-slate-950 border-r border-white/5 flex-col sticky top-0 h-dvh z-40 shrink-0 overflow-y-auto overflow-x-hidden select-none transition-all duration-200">
          {/* Header section in sidebar */}
          <div className="p-3 lg:p-6 flex flex-col lg:flex-row items-center justify-between gap-3 border-b border-white/5 shrink-0">
            <div className="flex items-center justify-center shrink-0">
              <Logo
                size="sm"
                variant="light"
                className="lg:hidden"
                showText={false}
                onClick={() => onNavigate("search")}
              />
              <Logo
                size="md"
                variant="light"
                className="hidden lg:flex"
                onClick={() => onNavigate("search")}
              />
            </div>
            
            <div className="flex items-center justify-center gap-2 shrink-0">
              {/* Notification Bell Desktop */}
              <button
                onClick={() => setIsNotifCenterOpen(true)}
                className="relative w-9 h-9 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 group border border-white/5 shrink-0"
                title={tr("Alertas do Sistema")}
                aria-label={tr("Alertas do Sistema")}
              >
                <Bell size={16} className="group-hover:animate-bounce shrink-0" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-orange-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-slate-950">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full border border-white/5 shrink-0">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse shrink-0" />
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest whitespace-nowrap">
                  {tr("Live")}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-2.5 lg:px-4 py-4 lg:py-6 space-y-1.5 overflow-y-auto overflow-x-hidden">
            {filteredNav.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3.5 px-2.5 lg:px-4 py-3 rounded-xl transition-all duration-200 group relative cursor-pointer
                    ${isActive 
                      ? "bg-white/5 text-orange-500 font-bold border-l-2 border-orange-500 md:border-l-0 lg:border-l-2" 
                      : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
                    }`}
                >
                  <item.icon
                    size={18}
                    className={`shrink-0 transition-colors ${
                      isActive
                        ? "text-orange-500"
                        : "group-hover:text-orange-500"
                    }`}
                  />
                  <span className="hidden lg:block text-[11px] font-bold uppercase tracking-wider truncate">
                    {tr(item.label as any) as any}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Footer Section in Sidebar */}
          <div className="p-3 lg:p-4 border-t border-white/5 space-y-2.5 shrink-0">
            {/* Language Selector: Full on lg, Compact toggle button on md */}
            <div className="w-full">
              {/* Expanded on Large screens */}
              <div className="hidden lg:flex px-3 py-2 items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate mr-2">
                  {t("select_language")}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {(["pt", "en", "fr", "es"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`px-1.5 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${
                        language === lang
                          ? "bg-orange-500 text-white shadow-sm"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compact Toggle on Medium / Collapsed screens */}
              <div className="lg:hidden flex justify-center w-full">
                <button
                  type="button"
                  onClick={() => {
                    const langs = ["pt", "en", "fr", "es"] as const;
                    const next = langs[(langs.indexOf(language as any) + 1) % langs.length];
                    setLanguage(next);
                  }}
                  title={`Idioma: ${language.toUpperCase()} (Clique para alternar)`}
                  className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 hover:border-orange-500/50 hover:bg-white/[0.08] text-slate-300 hover:text-white flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 group shrink-0"
                >
                  <span className="text-[7px] font-mono font-bold text-slate-400 group-hover:text-orange-400 uppercase leading-none">
                    {tr("LANG")}
                  </span>
                  <span className="text-[10px] font-black text-orange-500 leading-tight">
                    {language.toUpperCase()}
                  </span>
                </button>
              </div>
            </div>

            {/* User Profile Card */}
            {user && (
              <div 
                onClick={() => onNavigate("profile")}
                title={`${user.nome} (${user.email})`}
                className="flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-900 overflow-hidden border border-white/10 shrink-0 flex items-center justify-center">
                  {user.avatar_url && user.avatar_url !== "" && user.avatar_url !== brokenAvatar ? (
                    <img
                      src={user.avatar_url}
                      onError={() => setBrokenAvatar(user.avatar_url || null)}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      alt={user.nome}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-white/40 text-[11px]">
                      {(user.nome || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="hidden lg:block overflow-hidden min-w-0">
                  <p className="text-[11px] font-bold text-white uppercase tracking-wider truncate">
                    {user.nome}
                  </p>
                  <p className="text-[9px] text-white/40 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={onLogout}
              title={t("nav_logout")}
              className="w-full flex items-center justify-center lg:justify-start gap-3 px-2.5 lg:px-4 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all group duration-200 cursor-pointer"
            >
              <ICONS.XCircle size={18} className="shrink-0" />
              <span className="hidden lg:block text-[11px] font-bold uppercase tracking-wider truncate">
                {t("nav_logout")}
              </span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative min-w-0 max-w-full overflow-x-hidden bg-white">
        {/* Mobile Header */}
        {user && (
          <>
            <header className="md:hidden fixed top-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] bg-white border-b border-slate-100 flex items-center justify-between px-3 sm:px-5 z-[55] shadow-[0_1px_0_rgba(15,23,42,0.06)]">
              <Logo size="sm" onClick={() => onNavigate("search")} />
              <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                {/* Notification Bell Mobile */}
                <button
                  onClick={() => setIsNotifCenterOpen(true)}
                  className="relative w-9 h-9 sm:w-10 sm:h-10 bg-slate-50 border border-slate-150 hover:bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
                  aria-label={tr("Notificações")}
                >
                  <Bell size={17} className="shrink-0" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 bg-orange-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                <div
                  onClick={() => onNavigate("profile")}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-50 overflow-hidden border border-slate-150 shrink-0 cursor-pointer flex items-center justify-center"
                >
                  {user.avatar_url && user.avatar_url !== "" && user.avatar_url !== brokenAvatar ? (
                    <img
                      src={user.avatar_url}
                      onError={() => setBrokenAvatar(user.avatar_url || null)}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      alt={user.nome}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-xs">
                      {(user.nome || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-950 active:scale-95 transition-all shrink-0 cursor-pointer"
                  aria-label={tr("Menu")}
                >
                  {isMobileMenuOpen ? (
                    <ICONS.XCircle size={18} className="shrink-0" />
                  ) : (
                    <ICONS.List size={18} className="shrink-0" />
                  )}
                </button>
              </div>
            </header>
            <div className="md:hidden h-[calc(4rem+env(safe-area-inset-top,0px))] shrink-0" />
          </>
        )}

        {/* Mobile Menu Overlay */}
        {user && isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-2xl flex flex-col justify-between p-5 sm:p-6 pt-[calc(5rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="space-y-5">
              {/* User Header in Menu */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-white/10">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                  {user.avatar_url && user.avatar_url !== "" && user.avatar_url !== brokenAvatar ? (
                    <img
                      src={user.avatar_url}
                      onError={() => setBrokenAvatar(user.avatar_url || null)}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      alt={user.nome}
                    />
                  ) : (
                    <span className="text-sm font-extrabold text-white/40">
                      {(user.nome || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="overflow-hidden min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 block">
                    {t("nav_active_session")}
                  </span>
                  <h4 className="text-base font-bold text-white tracking-tight truncate leading-tight">
                    {user.nome}
                  </h4>
                  <p className="text-[11px] text-white/50 truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Language Selector Mobile */}
              <div className="p-3 bg-white/[0.04] border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t("select_language")}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(["pt", "en", "fr", "es"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                        language === lang
                          ? "bg-orange-500 text-white shadow-sm"
                          : "text-slate-400 hover:text-white bg-white/[0.02]"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nav Items */}
              <nav className="space-y-1.5">
                {filteredNav.map((item) => {
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer
                        ${isActive 
                          ? "bg-white/10 text-orange-500 border-l-2 border-orange-500 font-bold" 
                          : "text-slate-300 hover:text-white active:bg-white/[0.05]"
                        }`}
                    >
                      <item.icon size={18} className={`shrink-0 ${isActive ? "text-orange-500" : "text-current"}`} />
                      <span className="text-xs font-bold uppercase tracking-wider truncate">
                        {tr(item.label as any) as any}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Logout button */}
            <div className="border-t border-white/10 pt-4 mt-6">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/15 active:bg-red-500/10 transition-colors cursor-pointer"
              >
                <ICONS.XCircle size={18} className="text-red-400 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider truncate">
                  {t("nav_logout_account")}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* View Content Wrapper with Safe Bottom Offset */}
        <div className={`flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden ${user ? "pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-10" : "pb-0"}`}>
          {children}
        </div>

        {/* Mobile Bottom Floating Nav */}
        {user && !isModalOpen && !isMobileMenuOpen && (
          <nav className="md:hidden fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-6 sm:right-6 max-w-md mx-auto h-[58px] bg-slate-900/90 backdrop-blur-2xl rounded-full border border-white/10 flex items-center justify-around px-3 sm:px-5 z-30 shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
            {filteredNav.filter((item) => item.id !== "settings").slice(0, 5).map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  className="relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeMobileTabBubble"
                      className="absolute inset-0 bg-white/10 rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    />
                  )}
                  <item.icon
                    size={19}
                    strokeWidth={isActive ? 2.2 : 1.75}
                    className={`relative z-10 transition-colors duration-200 shrink-0 ${
                      isActive ? "text-orange-500 scale-105" : "text-white/50 hover:text-white/80"
                    }`}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="activeMobileTabDot"
                      className="absolute -bottom-1 w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Real-time Notification Center */}
        {user && (
          <NotificationCenter
            user={user}
            isOpen={isNotifCenterOpen}
            onClose={() => setIsNotifCenterOpen(false)}
          />
        )}
      </main>
    </div>
  );
};

export default Layout;
