import React, { useState, useEffect, useCallback } from "react";
import { User } from "../types";
import { supabase, isSupabaseConfigured, isSupabaseReachable } from "../lib/supabaseClient";
import { supabaseService, isValidUUID, toValidUUID } from "../services/supabaseService";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, 
  BellOff, 
  X, 
  XCircle, 
  Check, 
  CheckCircle, 
  AlertTriangle, 
  Trash2 
} from "lucide-react";

interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  read?: boolean;
  created_at: string;
}

interface NotificationCenterProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (message: string, type: "success" | "info" | "error" | "warning") => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  user,
  isOpen,
  onClose,
  onNotify
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "info" | "warning" | "success">("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user || !user.id || !isSupabaseConfigured() || !isSupabaseReachable()) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    const effectiveUserId = isValidUUID(user.id) ? user.id : toValidUUID(user.id);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Aviso ao carregar notificações do Supabase:", error.message || error);
        setNotifications([]);
        return;
      }

      const list: Notification[] = (data || []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        message: r.message,
        type: r.type || "info",
        read: !!r.is_read,
        created_at: r.created_at || new Date().toISOString()
      }));

      setNotifications(list);
    } catch (error) {
      console.warn("Aviso ao carregar notificações do Supabase:", error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Subscribe to real-time notifications for the current user via Supabase Realtime
  useEffect(() => {
    if (!user || !user.id || !isSupabaseConfigured() || !isSupabaseReachable()) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    const effectiveUserId = isValidUUID(user.id) ? user.id : toValidUUID(user.id);

    setIsLoading(true);
    fetchNotifications();

    const channel = supabase
      .channel(`user-notifs-${effectiveUserId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${effectiveUserId}`,
        },
        () => {
          fetchNotifications();
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
  }, [user, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await supabaseService.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.warn(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabaseService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (onNotify) onNotify("Notificação eliminada.", "info");
    } catch (err) {
      console.warn(err);
    }
  };

  const handleMarkAllRead = async () => {
    if (notifications.length === 0) return;
    try {
      await supabaseService.markAllNotificationsAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      if (onNotify) onNotify("Todas as notificações marcadas como lidas.", "success");
    } catch (err) {
      console.warn(err);
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    if (window.confirm("Tem a certeza que deseja eliminar todo o histórico de alertas?")) {
      try {
        await supabaseService.clearAllNotifications(user.id);
        setNotifications([]);
        if (onNotify) onNotify("Histórico de alertas limpo.", "success");
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const filteredNotifs = notifications.filter((notif) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !notif.read;
    return notif.type === activeFilter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="text-amber-500 shrink-0" size={18} />;
      case "success":
        return <CheckCircle className="text-emerald-500 shrink-0" size={18} />;
      case "error":
        return <XCircle className="text-rose-500 shrink-0" size={18} />;
      default:
        return <Bell className="text-sky-500 shrink-0" size={18} />;
    }
  };

  const getNotificationBadgeClass = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-amber-50 text-amber-800 border-amber-100";
      case "success":
        return "bg-emerald-50 text-emerald-800 border-emerald-100";
      case "error":
        return "bg-rose-50 text-rose-800 border-rose-100";
      default:
        return "bg-sky-50 text-sky-800 border-sky-100";
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours} h`;
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `Há ${diffDays} dias`;
    return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 w-[calc(100%-1rem)] sm:w-full sm:max-w-md flex">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="w-full h-full bg-white shadow-2xl flex flex-col pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center relative">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Alertas do Sistema
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Centro de Notificações
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-950 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Controls bar */}
          {notifications.length > 0 && (
            <div className="px-6 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span>{notifications.length} Alertas no total</span>
              <div className="flex items-center gap-4">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-orange-500 hover:text-orange-600 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Check size={12} strokeWidth={3} />
                    Ler tudo
                  </button>
                )}
                <button
                  onClick={handleClearAll}
                  className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  Limpar histórico
                </button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 bg-white">
            {[
              { id: "all", label: "Todas" },
              { id: "unread", label: `Não Lidas (${unreadCount})` },
              { id: "info", label: "Info" },
              { id: "success", label: "Sucesso" },
              { id: "warning", label: "Avisos" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border whitespace-nowrap
                  ${activeFilter === f.id
                    ? "bg-slate-950 border-slate-950 text-white shadow-sm"
                    : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/30">
            {isLoading ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-wider">A carregar alertas...</span>
              </div>
            ) : filteredNotifs.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                  <BellOff size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                    Nenhum alerta encontrado
                  </h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                    Não existem notificações correspondentes a este filtro no seu histórico.
                  </p>
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredNotifs.map((notif) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-2xl border text-left bg-white shadow-sm relative group flex gap-3 transition-all
                      ${!notif.read ? "border-l-4 border-l-orange-500 pl-3.5 shadow-[0_2px_8px_rgba(249,115,22,0.04)]" : "border-slate-100"}`}
                  >
                    {getNotificationIcon(notif.type)}

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider border ${getNotificationBadgeClass(notif.type)}`}>
                          {notif.type}
                        </span>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
                        )}
                        <span className="text-[8.5px] font-mono text-slate-400 uppercase tracking-widest ml-auto">
                          {formatTime(notif.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 font-medium leading-relaxed break-words">
                        {notif.message}
                      </p>

                      <div className="flex items-center gap-2 pt-1.5">
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="text-[9px] font-black text-orange-500 uppercase tracking-widest hover:text-orange-600 cursor-pointer"
                          >
                            Marcar como lida
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notif.id)}
                          className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest cursor-pointer ml-auto"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
