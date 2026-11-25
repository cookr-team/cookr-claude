import React, { useState, useMemo, useEffect } from "react";
import {
  User,
  Booking,
  UserRole,
  UserStatus,
  BookingStatus,
  MenuItem,
  ChefRecipe,
  Review,
} from "../types";
import { ICONS, formatPrice, COMMISSION_RATE } from "../constants";
import { supabaseService, ADMIN_SUPPORT_UUID } from "../services/supabaseService";
import { supabase, isSupabaseConfigured, isSupabaseReachable } from "../lib/supabaseClient";
import { apiFetch } from "../lib/apiClient";
import {
  mockUsers,
  mockMenus,
  mockRecipes,
  mockBookings,
} from "../services/mockData.ts.tsx";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Mail, Send, Loader2, RotateCw, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface AdminDashboardProps {
  users: User[];
  bookings: Booking[];
  allMenus: MenuItem[];
  allReviews?: Review[];
  onRefresh: () => void;
  onNotify: (msg: string, type?: "success" | "error" | "info") => void;
  onImpersonateUser?: (user: User) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  bookings,
  allMenus,
  allReviews = [],
  onRefresh,
  onNotify,
  onImpersonateUser,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "support" | "menus" | "reviews" | "bookings" | "community" | "financial" | "logs" | "settings" | "backstage"
  >("overview");

  const [isSeeding, setIsSeeding] = useState(false);
  const [stripePayments, setStripePayments] = useState<any[]>([]);
  const [isActionPending, setIsActionPending] = useState<string | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [logSearchText, setLogSearchText] = useState("");
  const [logActionFilter, setLogActionFilter] = useState<"ALL" | "OVERRIDES" | "MODERATION" | "SETTINGS" | "DELETIONS">("ALL");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [settings, setSettings] = useState<any>({});

  // CRUD & Extra state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearchText, setUserSearchText] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatus | "ALL">("ALL");
  const [suspensionReason, setSuspensionReason] = useState("");

  // Menu Moderation
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [bulkDiscount, setBulkDiscount] = useState<number>(0);
  const [bulkCategory, setBulkCategory] = useState<string>("");
  const [menuFeedback, setMenuFeedback] = useState<Record<string, string>>({});
  const [menusSearchText, setMenusSearchText] = useState("");
  const [menusChefFilter, setMenusChefFilter] = useState("ALL");
  const [menusTypeFilter, setMenusTypeFilter] = useState("ALL");
  const [menusStatusTab, setMenusStatusTab] = useState<"pending" | "active" | "rejected">("pending");
  const [menusPage, setMenusPage] = useState(1);
  const [expandedMenuIds, setExpandedMenuIds] = useState<string[]>([]);
  const [reviewFilter, setReviewFilter] = useState<"flagged" | "all" | "hidden">("flagged");

  // Disputes & Booking
  const [selectedBookingForDispute, setSelectedBookingForDispute] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [bookingSearchText, setBookingSearchText] = useState("");

  // Support & Intercept State
  const [selectedSupportUser, setSelectedSupportUser] = useState<User | null>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [newSupportMessageText, setNewSupportMessageText] = useState("");
  const [supportConversations, setSupportConversations] = useState<any[]>([]);
  const [isLoadingSupportConversations, setIsLoadingSupportConversations] = useState(false);
  const [isLoadingSupportMessages, setIsLoadingSupportMessages] = useState(false);
  const [selectedInterceptBooking, setSelectedInterceptBooking] = useState<Booking | null>(null);
  const [interceptMessages, setInterceptMessages] = useState<any[]>([]);
  const [isLoadingInterceptMessages, setIsLoadingInterceptMessages] = useState(false);
  const [interceptSearchText, setInterceptSearchText] = useState("");

  const filteredBookings = useMemo(() => {
    if (!bookingSearchText.trim()) return bookings;
    const term = bookingSearchText.toLowerCase();
    return bookings.filter((b) => {
      const client = (b.clientName || "").toLowerCase();
      const chef = (b.cookName || "").toLowerCase();
      return client.includes(term) || chef.includes(term);
    });
  }, [bookings, bookingSearchText]);

  // AI Insights Custom tasks
  const [customTasks, setCustomTasks] = useState<{ id: string; text: string; done: boolean }[]>(() => {
    const saved = localStorage.getItem("cookr_admin_custom_tasks");
    return saved ? JSON.parse(saved) : [];
  });
  const [newCustomTaskText, setNewCustomTaskText] = useState("");
  const [overviewChartTab, setOverviewChartTab] = useState<"growth" | "seasonality">("growth");

  // Fetch log audits and system parameters
  const fetchLogs = async () => {
    try {
      const logs = await supabaseService.getAdminLogs();
      setAdminLogs(logs || []);
    } catch (e) {}
  };

  const fetchSettings = async () => {
    try {
      const s = await supabaseService.getPlatformSettings();
      setSettings(s || {});
    } catch (e) {}
  };

  // Email Service Integration State (Resend / Supabase Edge Functions / SMTP)
  const [emailConfig, setEmailConfig] = useState<{
    configured: boolean;
    resendConfigured?: boolean;
    resendMasked?: string;
    fromEmail?: string;
    provider?: string;
    smtpConfigured?: boolean;
    host?: string;
    port?: string;
    from?: string;
    userMasked?: string;
    functionsEnvLoaded?: boolean;
  } | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testEmailType, setTestEmailType] = useState<string>("welcome_client");
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailEvents, setEmailEvents] = useState<any[]>([]);
  const [isLoadingEmailEvents, setIsLoadingEmailEvents] = useState(false);
  const [retryingEventId, setRetryingEventId] = useState<string | null>(null);

  const fetchEmailConfig = async () => {
    try {
      const res = await apiFetch("/api/email/config-status");
      const data = await res.json();
      setEmailConfig(data);
    } catch (e) {}
  };

  const fetchEmailEvents = async () => {
    setIsLoadingEmailEvents(true);
    try {
      const res = await apiFetch("/api/email/events?limit=30");
      const data = await res.json();
      if (data.events) {
        setEmailEvents(data.events);
      }
    } catch (e) {
    } finally {
      setIsLoadingEmailEvents(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress) {
      onNotify("Por favor, introduza um endereço de email para o teste.", "warning");
      return;
    }
    setIsTestingEmail(true);
    try {
      const res = await apiFetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: testEmailAddress,
          emailType: testEmailType,
          language: "pt",
        }),
      });
      const data = await res.json();
      if (data.success || data.status === "sent") {
        onNotify(`Email de teste (${testEmailType}) despachado com sucesso via ${data.provider.toUpperCase()}!`, "success");
        fetchEmailEvents();
      } else {
        onNotify(data.error || "Falha no envio do email de teste", "error");
      }
    } catch (err: any) {
      onNotify("Erro de rede ao testar serviço de email: " + err.message, "error");
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleRetryEmail = async (eventId: string) => {
    setRetryingEventId(eventId);
    try {
      const res = await apiFetch("/api/email/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      if (data.success || data.status === "sent") {
        onNotify("Reenvio de email transacional efetuado com sucesso!", "success");
        fetchEmailEvents();
      } else {
        onNotify(data.error || data.reason || "Não foi possível reenviar o email", "error");
      }
    } catch (err: any) {
      onNotify("Erro de rede ao reenviar email: " + err.message, "error");
    } finally {
      setRetryingEventId(null);
    }
  };

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cookr_audit_trail_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onNotify("Exportação de auditoria efetuada com sucesso!", "success");
  };

  useEffect(() => {
    fetchLogs();
    fetchSettings();
    fetchEmailConfig();
    fetchEmailEvents();
  }, [activeTab]);

  // Persist customized tasks
  useEffect(() => {
    localStorage.setItem("cookr_admin_custom_tasks", JSON.stringify(customTasks));
  }, [customTasks]);

  // State elements for Auditing messages & Moderating reviews (Módulos 2 e 3)
  const [disputeMessages, setDisputeMessages] = useState<any[]>([]);
  const [isLoadingDisputeMessages, setIsLoadingDisputeMessages] = useState(false);
  const [chefReviews, setChefReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Fetch dispute messages in real time (Auditoria)
  useEffect(() => {
    if (!selectedBookingForDispute) {
      setDisputeMessages([]);
      return;
    }
    const cId = selectedBookingForDispute.clientId;
    const kId = selectedBookingForDispute.cookId;
    if (!cId || !kId) return;

    setIsLoadingDisputeMessages(true);
    const fetchDisputeMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(`and(sender_id.eq.${cId},receiver_id.eq.${kId}),and(sender_id.eq.${kId},receiver_id.eq.${cId})`)
          .order("created_at", { ascending: true });
        if (!error && data) {
          setDisputeMessages(data);
        }
      } catch (err) {
        console.warn("[Dispute Audit Chat Error]:", err);
      } finally {
        setIsLoadingDisputeMessages(false);
      }
    };
    fetchDisputeMessages();

    if (!isSupabaseConfigured() || !isSupabaseReachable()) {
      return;
    }

    const channel = supabase
      .channel(`dispute-${selectedBookingForDispute.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchDisputeMessages();
      })
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
  }, [selectedBookingForDispute]);

  // Fetch reviews of selected chef
  useEffect(() => {
    if (!selectedUser || selectedUser.role !== UserRole.COOK) {
      setChefReviews([]);
      return;
    }
    setIsLoadingReviews(true);
    const getChefReviews = async () => {
      try {
        const list = await supabaseService.getReviewsByCookId(selectedUser.id);
        setChefReviews(list || []);
      } catch (err) {
        console.warn("Error loading chef reviews:", err);
      } finally {
        setIsLoadingReviews(false);
      }
    };
    getChefReviews();
  }, [selectedUser]);

  // Real-time listener for support conversations grouping
  useEffect(() => {
    if (activeTab !== "support") return;

    setIsLoadingSupportConversations(true);
    const fetchSupportConvs = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(`receiver_id.eq.${ADMIN_SUPPORT_UUID},sender_id.eq.${ADMIN_SUPPORT_UUID}`);

        if (!error && data) {
          const conversationsMap: Record<string, any> = {};
          data.forEach((m: any) => {
            const partnerId = (m.sender_id === ADMIN_SUPPORT_UUID || m.sender_id === "admin-support") ? m.receiver_id : m.sender_id;
            if (!partnerId) return;

            if (!conversationsMap[partnerId]) {
              conversationsMap[partnerId] = {
                partnerId,
                lastMessage: m.content,
                lastTimestamp: m.created_at,
                unread: !m.read && (m.receiver_id === ADMIN_SUPPORT_UUID || m.receiver_id === "admin-support"),
                messagesCount: 1,
              };
            } else {
              conversationsMap[partnerId].messagesCount += 1;
              if (new Date(m.created_at).getTime() > new Date(conversationsMap[partnerId].lastTimestamp).getTime()) {
                conversationsMap[partnerId].lastMessage = m.content;
                conversationsMap[partnerId].lastTimestamp = m.created_at;
                if (!m.read && (m.receiver_id === ADMIN_SUPPORT_UUID || m.receiver_id === "admin-support")) {
                  conversationsMap[partnerId].unread = true;
                }
              }
            }
          });

          const list = Object.values(conversationsMap).sort(
            (a: any, b: any) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
          );
          setSupportConversations(list);
        }
      } catch (err) {
        console.warn("Note loading support conversations:", err);
      } finally {
        setIsLoadingSupportConversations(false);
      }
    };
    fetchSupportConvs();

    if (!isSupabaseConfigured() || !isSupabaseReachable()) {
      return;
    }

    const channel = supabase
      .channel("admin-support-convs")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchSupportConvs();
      })
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
  }, [activeTab]);

  // Real-time listener for selected support user messages
  useEffect(() => {
    if (!selectedSupportUser) {
      setSupportMessages([]);
      return;
    }

    setIsLoadingSupportMessages(true);
    const fetchSupportUserMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(`and(sender_id.eq.${selectedSupportUser.id},receiver_id.eq.${ADMIN_SUPPORT_UUID}),and(sender_id.eq.${ADMIN_SUPPORT_UUID},receiver_id.eq.${selectedSupportUser.id})`)
          .order("created_at", { ascending: true });

        if (!error && data) {
          setSupportMessages(data);
        }
      } catch (err) {
        console.warn("Note loading selected support user messages:", err);
      } finally {
        setIsLoadingSupportMessages(false);
      }
    };
    fetchSupportUserMessages();

    if (!isSupabaseConfigured() || !isSupabaseReachable()) {
      return;
    }

    const channel = supabase
      .channel(`admin-support-${selectedSupportUser.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchSupportUserMessages();
      })
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
  }, [selectedSupportUser]);

  // Real-time listener for active intercept chat (conversations between client and cook of the selected booking)
  useEffect(() => {
    if (!selectedInterceptBooking) {
      setInterceptMessages([]);
      return;
    }

    const cId = selectedInterceptBooking.clientId;
    const kId = selectedInterceptBooking.cookId;
    if (!cId || !kId) return;

    setIsLoadingInterceptMessages(true);
    const fetchInterceptMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(`and(sender_id.eq.${cId},receiver_id.eq.${kId}),and(sender_id.eq.${kId},receiver_id.eq.${cId})`)
          .order("created_at", { ascending: true });

        if (!error && data) {
          setInterceptMessages(data);
        }
      } catch (err) {
        console.warn("Note loading intercept messages:", err);
      } finally {
        setIsLoadingInterceptMessages(false);
      }
    };
    fetchInterceptMessages();

    if (!isSupabaseConfigured() || !isSupabaseReachable()) {
      return;
    }

    const channel = supabase
      .channel(`intercept-${selectedInterceptBooking.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchInterceptMessages();
      })
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
  }, [selectedInterceptBooking]);

  // Handler to send support messages
  const handleSendSupportMessage = async () => {
    if (!newSupportMessageText.trim() || !selectedSupportUser) return;
    const msg = {
      id: crypto.randomUUID(),
      sender_id: ADMIN_SUPPORT_UUID,
      receiver_id: selectedSupportUser.id,
      content: newSupportMessageText.trim(),
      created_at: new Date().toISOString(),
    };
    try {
      const { error } = await supabase.from("messages").insert(msg);
      if (!error) {
        setSupportMessages((prev) => [...prev, msg]);
      }
      setNewSupportMessageText("");
      onNotify("Mensagem de suporte enviada!", "success");
    } catch (err) {
      console.warn("Note sending support message:", err);
      onNotify("Erro ao enviar mensagem.", "error");
    }
  };

  // 1. Calculations: Dynamic user billing volume based on real Firestore bookings
  const userVolumes = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach((b) => {
      const val = typeof b.valorTotal === "string" ? parseFloat(b.valorTotal) : b.valorTotal || 0;
      if (b.status === BookingStatus.COMPLETED || b.status === BookingStatus.ACCEPTED) {
        if (b.clientId) map[b.clientId] = (map[b.clientId] || 0) + val;
        if (b.cookId) map[b.cookId] = (map[b.cookId] || 0) + val;
      }
    });
    return map;
  }, [bookings]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalVolume = bookings
      .filter((b) => b.status === BookingStatus.COMPLETED)
      .reduce((sum, b) => sum + (typeof b.valorTotal === "string" ? parseFloat(b.valorTotal) : b.valorTotal || 0), 0);
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter((b) => b.status === BookingStatus.COMPLETED).length;
    const commissionRate = settings.commission_rate || COMMISSION_RATE;
    const platformRevenue = totalVolume * commissionRate;
    const activeCooks = users.filter((u) => u.role === UserRole.COOK && u.status === UserStatus.ACTIVE).length;

    return {
      totalVolume,
      platformRevenue,
      totalBookings,
      completedBookings,
      activeCooks,
    };
  }, [users, bookings, settings.commission_rate]);

  // 2. AI Insights Friction Scanner (Módulo 4)
  const frictionAlerts = useMemo(() => {
    const list: { id: string; type: "critical" | "warning" | "info"; title: string; desc: string }[] = [];

    // Alert: Supply Gap (Chef with 0 published menus)
    users.forEach((u) => {
      if (u.role === UserRole.COOK && u.status === UserStatus.ACTIVE) {
        const chefMenus = allMenus.filter((m) => m.cookId === u.id);
        if (chefMenus.length === 0) {
          list.push({
            id: `supply_gap_${u.id}`,
            type: "warning",
            title: `Lacuna de Oferta: Chef ${u.nome}`,
            desc: "Chef está ativo no ecossistema, mas não tem menus criados.",
          });
        }
      }
    });

    // Alert: Dropoff
    const cancelledCount = bookings.filter((b) => b.status === BookingStatus.CANCELLED).length;
    const totalCount = bookings.length;
    if (totalCount > 0 && cancelledCount / totalCount >= 0.25) {
      list.push({
        id: "high_refunds",
        type: "critical",
        title: "Fricção: Alerta de Cancelamentos",
        desc: `Taxa de reservas reembolsadas/canceladas é de ${( (cancelledCount / totalCount) * 100 ).toFixed(1)}%.`,
      });
    }

    // Alert: Unapproved chefs
    const pendingChefsCount = users.filter((u) => u.role === UserRole.COOK && (u.status === UserStatus.PENDING || u.status === UserStatus.UNDER_REVIEW)).length;
    if (pendingChefsCount > 0) {
      list.push({
        id: "under_review_chefs",
        type: "info",
        title: `Curadoria Pendente`,
        desc: `${pendingChefsCount} chefs aguardam validação de perfil pelo curador técnico.`,
      });
    }

    return list;
  }, [users, allMenus, bookings]);

  // Dynamic Completed Bookings & Volume growth aggregation with full 12-month seasonality representation
  const monthlyData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    // Só dados reais: cada mês começa a zero e soma as reservas existentes.
    const baseline: Record<string, { monthName: string; completed: number; total: number; gmv: number; cancelled: number }> = {};
    months.forEach((name, i) => {
      baseline[String(i)] = { monthName: name, completed: 0, total: 0, gmv: 0, cancelled: 0 };
    });

    // Safely add dynamic completed bookings
    bookings.forEach((b) => {
      let monthIdx = 5; // Default to Jun
      const dateStr = b.data || b.createdAt;
      if (dateStr) {
        const match = dateStr.match(/-(\d{2})-/);
        if (match) {
          monthIdx = parseInt(match[1]) - 1;
        } else {
          const strLower = dateStr.toLowerCase();
          if (strLower.includes("jan")) monthIdx = 0;
          else if (strLower.includes("fev")) monthIdx = 1;
          else if (strLower.includes("mar")) monthIdx = 2;
          else if (strLower.includes("abr")) monthIdx = 3;
          else if (strLower.includes("mai")) monthIdx = 4;
          else if (strLower.includes("jun")) monthIdx = 5;
          else if (strLower.includes("jul")) monthIdx = 6;
          else if (strLower.includes("ago")) monthIdx = 7;
          else if (strLower.includes("set")) monthIdx = 8;
          else if (strLower.includes("out")) monthIdx = 9;
          else if (strLower.includes("nov")) monthIdx = 10;
          else if (strLower.includes("dez")) monthIdx = 11;
        }
      }
      
      const key = monthIdx.toString();
      if (!baseline[key]) {
        baseline[key] = {
          monthName: months[monthIdx] || "Mês",
          completed: 0,
          total: 0,
          gmv: 0,
          cancelled: 0
        };
      }
      
      baseline[key].total += 1;
      
      if (b.status === BookingStatus.COMPLETED) {
        baseline[key].completed += 1;
        const valObj = typeof b.valorTotal === "string" ? parseFloat(b.valorTotal) : b.valorTotal || 0;
        baseline[key].gmv += Number(valObj);
      } else if (b.status === BookingStatus.CANCELLED) {
        baseline[key].cancelled += 1;
      }
    });

    return Object.keys(baseline)
      .map(Number)
      .sort((a, b) => a - b)
      .map((k) => baseline[k.toString()]);
  }, [bookings]);

  // 3. Auto action tasks combined with custom ones
  const activeToDoList = useMemo(() => {
    const generated: { id: string; text: string; done: boolean; auto: boolean }[] = [];
    
    // Automatically generate actionable items from anomalies
    frictionAlerts.forEach((alert) => {
      generated.push({
        id: alert.id,
        text: `[AI Alert] Resolver: ${alert.title} - ${alert.desc}`,
        done: false,
        auto: true,
      });
    });

    return [
      ...generated,
      ...customTasks.map((t) => ({ id: t.id, text: t.text, done: t.done, auto: false })),
    ];
  }, [frictionAlerts, customTasks]);

  // Filters users list dynamically
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const textMatch =
        (u.nome || "").toLowerCase().includes(userSearchText.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(userSearchText.toLowerCase());
      const roleMatch = userRoleFilter === "ALL" || u.role === userRoleFilter;
      const statusMatch = userStatusFilter === "ALL" || u.status === userStatusFilter;
      return textMatch && roleMatch && statusMatch;
    });
  }, [users, userSearchText, userRoleFilter, userStatusFilter]);

  // Sort and display filtered users optionally by accumulated volume
  const sortedAndFilteredUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const volA = userVolumes[a.id] || 0;
      const volB = userVolumes[b.id] || 0;
      return volB - volA; // Highest billing first
    });
  }, [filteredUsers, userVolumes]);

  // High performance search, categorisation structure for Menus (Big Data curation)
  const filteredAndCategorizedMenus = useMemo(() => {
    const pendingList: MenuItem[] = [];
    const activeList: MenuItem[] = [];
    const rejectedList: MenuItem[] = [];

    allMenus.forEach((menu) => {
      // Logic matching isAvailable flag from supabaseService
      if (menu.isAvailable === true) {
        activeList.push(menu);
      } else if (menu.isAvailable === false && (menu.adminNotes || menu.admin_notes)) {
        rejectedList.push(menu);
      } else {
        pendingList.push(menu);
      }
    });

    let baseList = pendingList;
    if (menusStatusTab === "active") {
      baseList = activeList;
    } else if (menusStatusTab === "rejected") {
      baseList = rejectedList;
    }

    const result = baseList.filter((menu) => {
      if (menusSearchText) {
        const query = menusSearchText.toLowerCase();
        const nameMatch = (menu.nome || "").toLowerCase().includes(query);
        const descMatch = (menu.descricao || "").toLowerCase().includes(query);
        const idMatch = (menu.id || "").toLowerCase().includes(query);
        const cookId = menu.cookId || menu.cook_id;
        const chefName = users.find((u) => u.id === cookId)?.nome?.toLowerCase() || "";
        const chefMatch = chefName.includes(query);

        if (!nameMatch && !descMatch && !idMatch && !chefMatch) {
          return false;
        }
      }

      if (menusChefFilter !== "ALL") {
        const cookId = menu.cookId || menu.cook_id;
        if (cookId !== menusChefFilter) {
          return false;
        }
      }

      if (menusTypeFilter !== "ALL") {
        if (menu.type !== menusTypeFilter) {
          return false;
        }
      }

      return true;
    });

    return {
      pendingCount: pendingList.length,
      activeCount: activeList.length,
      rejectedCount: rejectedList.length,
      list: result,
    };
  }, [allMenus, menusStatusTab, menusSearchText, menusChefFilter, menusTypeFilter, users]);

  // stable IP generator helper for logs UI
  const generateIpForLog = (logId: string) => {
    if (!logId) return "192.168.1.10";
    let hash = 0;
    for (let i = 0; i < logId.length; i++) {
      hash = logId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const octet1 = 180 + (Math.abs(hash) % 50);
    const octet2 = Math.abs(hash >> 8) % 256;
    const octet3 = Math.abs(hash >> 16) % 256;
    const octet4 = Math.abs(hash >> 24) % 256;
    return `${octet1}.${octet2}.${octet3}.${octet4}`;
  };

  const filteredLogs = useMemo(() => {
    return adminLogs.filter((log) => {
      // Search text match
      const searchText = logSearchText.toLowerCase();
      const matchesSearch =
        !searchText ||
        (log.notes && log.notes.toLowerCase().includes(searchText)) ||
        (log.action && log.action.toLowerCase().includes(searchText)) ||
        (log.target_id && log.target_id.toLowerCase().includes(searchText)) ||
        (log.admin_id && log.admin_id.toLowerCase().includes(searchText));

      if (!matchesSearch) return false;

      // Category match
      if (logActionFilter === "ALL") return true;
      const act = log.action || "";
      if (logActionFilter === "OVERRIDES") {
        return (
          act.includes("STATUS_CHANGE") ||
          act.includes("FORCE_") ||
          act.includes("RESCHEDULE") ||
          act.includes("EDIT_CHEF") ||
          act.includes("ADJUST") ||
          act.includes("ROLE") ||
          act.includes("BULK") ||
          act.includes("BYPASS")
        );
      }
      if (logActionFilter === "MODERATION") {
        return (
          act.includes("REVIEW") ||
          act.includes("MODERATE") ||
          act.includes("AUDIT_") ||
          act.includes("APPROVED")
        );
      }
      if (logActionFilter === "SETTINGS") {
        return (
          act.includes("SETTING") ||
          act.includes("BROADCAST") ||
          act.includes("SEED")
        );
      }
      if (logActionFilter === "DELETIONS") {
        return act.startsWith("DELETE_");
      }
      return true;
    });
  }, [adminLogs, logSearchText, logActionFilter]);

  const logStats = useMemo(() => {
    let total = adminLogs.length;
    let overrides = 0;
    let moderations = 0;
    let settingsChanges = 0;

    adminLogs.forEach((log) => {
      const act = log.action || "";
      if (
        act.includes("STATUS_CHANGE") ||
        act.includes("FORCE_") ||
        act.includes("RESCHEDULE") ||
        act.includes("EDIT_CHEF") ||
        act.includes("ADJUST") ||
        act.includes("ROLE") ||
        act.includes("BULK") ||
          act.includes("BYPASS")
      ) {
        overrides++;
      } else if (
        act.includes("REVIEW") ||
        act.includes("MODERATE") ||
        act.includes("AUDIT_") ||
          act.includes("APPROVED")
      ) {
        moderations++;
      } else if (
        act.includes("SETTING") ||
        act.includes("BROADCAST") ||
        act.includes("SEED")
      ) {
        settingsChanges++;
      }
    });

    return { total, overrides, moderations, settingsChanges };
  }, [adminLogs]);

  // State update handlers mapping to supabaseService
  const handleUpdateStatus = async (userId: string, status: UserStatus, notes: string = "") => {
    setIsActionPending(userId);
    try {
      await supabaseService.updateUserProfile(userId, {
        status,
        admin_notes: notes,
      });
      await supabaseService.createAdminLog(
        "ADMIN",
        `STATUS_CHANGE_${status}`,
        userId,
        `Alterado para ${status}. Notas: ${notes}`
      );
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, status, admin_notes: notes } : null));
      }
      onNotify(`Utilizador atualizado para ${status}`, "success");
      onRefresh();
    } catch (e) {
      onNotify("Erro ao atualizar status.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  useEffect(() => {
    if (activeTab !== "financial" || !isSupabaseConfigured()) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("booking_payments")
          .select("booking_id,amount_cents,platform_fee_cents,chef_payout_cents,status,updated_at")
          .order("updated_at", { ascending: false })
          .limit(50);
        if (!cancelled) setStripePayments(data || []);
      } catch {
        if (!cancelled) setStripePayments([]);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab]);

  const handleApproveChef = async (target: any) => {
    if (!target?.id) return;
    setIsActionPending(target.id);
    try {
      await supabaseService.updateUserProfile(target.id, {
        status: UserStatus.ACTIVE,
        approvedByAdmin: true,
        admin_notes: "",
      });
      await supabaseService.createAdminLog(
        "ADMIN",
        "CHEF_APPROVED",
        target.id,
        `Candidatura de chef aprovada: ${target.nome} (${target.email}).`
      );
      setSelectedUser((prev) => (prev && prev.id === target.id ? { ...prev, status: UserStatus.ACTIVE, approvedByAdmin: true } : prev));
      onNotify(`Candidatura de ${target.nome} aprovada. O chef já aparece no catálogo.`, "success");
      fetchLogs();
      onRefresh();
    } catch (e) {
      console.error(e);
      onNotify("Erro ao aprovar a candidatura.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  const statusLabel = (st: string) =>
    st === UserStatus.ACTIVE ? "Ativa"
    : st === UserStatus.UNDER_REVIEW ? "Em revisão"
    : st === UserStatus.PENDING ? "Pendente"
    : st === UserStatus.SUSPENDED ? "Suspensa"
    : st;

  const handleDelete = async (type: "user" | "menu" | "booking", id: string) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar irreversivelmente este ${type}?`)) return;
    setIsActionPending(id);
    try {
      if (type === "user") {
        await supabaseService.deleteUser(id);
        if (selectedUser?.id === id) setSelectedUser(null);
      }
      if (type === "menu") await supabaseService.deleteMenu(id);
      if (type === "booking") {
        await supabaseService.deleteBooking(id);
        if (selectedBookingForDispute?.id === id) setSelectedBookingForDispute(null);
      }
      await supabaseService.createAdminLog("ADMIN", `DELETE_${type.toUpperCase()}`, id, `Eliminado do sistema.`);
      onNotify(`${type} eliminado com sucesso.`, "success");
      onRefresh();
    } catch (e) {
      onNotify("Erro ao eliminar item.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm("Tem a certeza que deseja eliminar esta avaliação de cliente de forma permanente?")) return;
    setIsActionPending(reviewId);
    try {
      await supabaseService.deleteReview(reviewId);
      setChefReviews((prev) => prev.filter((r) => r.id !== reviewId));
      await supabaseService.createAdminLog(
        "ADMIN",
        "DELETE_REVIEW",
        reviewId,
        "Avaliação moderada/eliminada pelo Administrador."
      );
      onNotify("Avaliação eliminada com sucesso.", "success");
      onRefresh();
    } catch (e) {
      onNotify("Erro ao eliminar avaliação.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  // Adjust loyalty points directly in Firestore (Módulo 2 Power Upgrade)
  const handleUpdateLoyaltyPoints = async (userId: string, points: number) => {
    setIsActionPending("loyalty_" + userId);
    try {
      await supabaseService.updateUserProfile(userId, { loyalty_points: points });
      await supabaseService.createAdminLog("ADMIN", "ADJUST_POINTS", userId, `Credito promocional de ${points} pontos.`);
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, loyalty_points: points } : null));
      }
      onNotify("Crédito promocional injetado!", "success");
      onRefresh();
    } catch (e) {
      onNotify("Erro ao ajustar pontos.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  // Change user roles directly
  const handleUpdateRole = async (userId: string, role: UserRole) => {
    setIsActionPending("role_" + userId);
    try {
      await supabaseService.updateUserProfile(userId, { role });
      await supabaseService.createAdminLog("ADMIN", "CHANGE_USER_ROLE", userId, `Novo papel: ${role}`);
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, role } : null));
      }
      onNotify(`Papel alterado para ${role}`, "success");
      onRefresh();
    } catch (e) {
      onNotify("Erro ao atualizar papel.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  const handleUpdateUserProfileDirect = async (userId: string, updatedFields: Partial<User>) => {
    setIsActionPending("edit_profile_" + userId);
    try {
      await supabaseService.updateUserProfile(userId, updatedFields);
      await supabaseService.createAdminLog(
        "ADMIN",
        "EDIT_USER_PROFILE_DIRECT",
        userId,
        `Perfil editado diretamente. Campos: ${Object.keys(updatedFields).join(", ")}`
      );
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
      }
      onNotify("Perfil atualizado com sucesso!", "success");
      onRefresh();
    } catch (e) {
      console.error(e);
      onNotify("Erro ao atualizar o perfil.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  const handleResetPasswordDirect = async (userId: string, newPassword: string) => {
    if (!newPassword || newPassword.trim().length < 6) {
      onNotify("A palavra-passe deve ter pelo menos 6 caracteres.", "error");
      return;
    }
    setIsActionPending("reset_pass_" + userId);
    try {
      const targetUser = users.find((u) => u.id === userId) || selectedUser;
      if (targetUser?.email) {
        await supabaseService.resetPasswordForEmail(targetUser.email);
      }
      await supabaseService.createAdminLog(
        "ADMIN",
        "RESET_USER_PASSWORD",
        userId,
        `Email de redefinição segura de palavra-passe disparado via Supabase Auth para ${targetUser?.email || userId}.`
      );
      onNotify("Email de redefinição segura de palavra-passe enviado com sucesso!", "success");
      onRefresh();
    } catch (e: any) {
      console.error(e);
      onNotify("Erro ao disparar redefinição de palavra-passe: " + (e?.message || ""), "error");
    } finally {
      setIsActionPending(null);
    }
  };

  // Envia o email oficial de recuperação (link real, gerado e assinado pelo Supabase Auth).
  const handleGenerateRecoveryLink = async (user: User) => {
    try {
      await supabaseService.resetPasswordForEmail(user.email);
      await supabaseService.createAdminLog(
        "ADMIN",
        "SEND_RESET_EMAIL",
        user.id,
        `Email de recuperação de palavra-passe enviado para ${user.email}`
      );
      fetchLogs();
      onNotify("Email de recuperação enviado.", "success");
    } catch (e: any) {
      onNotify("Não foi possível enviar o email de recuperação: " + (e?.message || ""), "error");
    }
  };

  // Live Menu Moderation actions
  const handleModerateMenu = async (menu: MenuItem, status: "live" | "rejected" | "boosted") => {
    setIsActionPending(menu.id);
    try {
      let notesText = "";
      if (status === "live") {
        // Toggle live tag/approval active
        await supabaseService.createMenu({ ...menu, isAvailable: true });
        notesText = "Menu aprovado e publicado ao vivo.";
      } else if (status === "rejected") {
        const feedback = menuFeedback[menu.id] || "Menu não cumpre as regras de imagem.";
        await supabaseService.createMenu({ ...menu, isAvailable: false, adminNotes: feedback });
        notesText = `Menu rejeitado com feedback: ${feedback}`;
      } else if (status === "boosted") {
        const curPopular = !!menu.is_meal_prep; // Or another flag in database. Let's toggle is_meal_prep or a dynamic property
        await supabaseService.createMenu({ ...menu, is_meal_prep: !curPopular });
        notesText = !curPopular ? "Adicionado aos destaques da home." : "Removido dos destaques.";
      }

      await supabaseService.createAdminLog("ADMIN", `MODERATE_MENU_${status.toUpperCase()}`, menu.id, notesText);
      onNotify(`Menu atualizado: ${status.toUpperCase()}`, "success");
      onRefresh();
    } catch (e) {
      onNotify("Erro ao moderar menu.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  const handleApproveReview = async (reviewId: string) => {
    setIsActionPending(reviewId);
    try {
      await supabaseService.approveReview(reviewId);
      await supabaseService.createAdminLog("ADMIN", "APPROVE_REVIEW", reviewId, "Review mantida ativa após revisão de denúncia.");
      onNotify("Review aprovada! A denúncia foi arquivada.", "success");
      onRefresh();
    } catch (err: any) {
      console.error("Erro ao aprovar review:", err);
      onNotify("Erro ao aprovar a review.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  const handleHideReview = async (reviewId: string) => {
    setIsActionPending(reviewId);
    try {
      await supabaseService.hideReview(reviewId);
      await supabaseService.createAdminLog("ADMIN", "HIDE_REVIEW", reviewId, "Review ocultada por conteúdo impróprio/ofensivo.");
      onNotify("Review ocultada com sucesso!", "success");
      onRefresh();
    } catch (err: any) {
      console.error("Erro ao ocultar review:", err);
      onNotify("Erro ao ocultar a review.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  // Bulk menu modifier (Módulo 2 Action Group)
  const handleApplyBulkMenuAction = async () => {
    if (selectedMenus.length === 0) {
      onNotify("Selecione pelo menos um menu.", "error");
      return;
    }
    setIsActionPending("bulk_menu");
    try {
      let count = 0;
      for (const menuId of selectedMenus) {
        const match = allMenus.find((m) => m.id === menuId);
        if (match) {
          let updated = { ...match };
          if (bulkDiscount > 0) {
            updated.preco = Math.round(match.preco * (1 - bulkDiscount / 100));
          }
          if (bulkCategory) {
            updated.cuisine_type = bulkCategory;
          }
          await supabaseService.createMenu(updated);
          count++;
        }
      }
      await supabaseService.createAdminLog(
        "ADMIN",
        "BULK_MENU_ACTION",
        "MULTIPLE",
        `Modificação em massa de ${count} menus. Desconto: ${bulkDiscount}%, Culinária: ${bulkCategory}`
      );
      onNotify(`Alterações em bloco aplicadas a ${count} menus!`, "success");
      setSelectedMenus([]);
      onRefresh();
    } catch (e) {
      onNotify("Erro nas alterações em massa.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  // Toggle selection for bulk modifier
  const toggleMenuSelection = (mId: string) => {
    setSelectedMenus((prev) =>
      prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
    );
  };

  // Force booking completions / cancellation refunds / rescheduling (Módulo 3)
  const handleUpdateBookingStatusAdmin = async (bId: string, status: BookingStatus) => {
    setIsActionPending(bId);
    try {
      await supabaseService.updateBookingStatus(bId, status);
      await supabaseService.createAdminLog(
        "ADMIN",
        `FORCE_BOOKING_${status.toUpperCase()}`,
        bId,
        "Intervenção de disputa forçada pelo Administrador."
      );
      onNotify(`Reserva atualizada para ${status}!`, "success");
      onRefresh();
    } catch (e: any) {
      onNotify(e?.message || "Erro ao forçar estado da reserva.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  const handleRescheduleBooking = async (bId: string) => {
    if (!rescheduleDate) {
      onNotify("Indique a nova data.", "error");
      return;
    }
    setIsActionPending("resched_" + bId);
    try {
      await supabaseService.updateBookingStatus(bId, BookingStatus.RESCHEDULE_REQUESTED, {
        data: rescheduleDate,
        hora: rescheduleTime || "20:00",
      });
      await supabaseService.createAdminLog(
        "ADMIN",
        "RESCHEDULE_BOOKING",
        bId,
        `Reagendado para ${rescheduleDate} às ${rescheduleTime}`
      );
      onNotify(`Reserva reagendada!`, "success");
      setRescheduleDate("");
      setRescheduleTime("");
      onRefresh();
    } catch (e) {
      onNotify("Erro ao reagendar.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  // Chef Menu Direct Firestore Editor inside Admin User Drawer (Módulo 1)
  const handleSaveChefMenuDirect = async (editingMenu: MenuItem) => {
    setIsActionPending("menu_edit_" + editingMenu.id);
    try {
      await supabaseService.createMenu(editingMenu);
      await supabaseService.createAdminLog(
        "ADMIN",
        "EDIT_CHEF_MENU_DIRECT",
        editingMenu.id,
        "Alteração de Menu de Chef efetuada via Drawer de Administrador."
      );
      onNotify("Menu de Chef atualizado!", "success");
      onRefresh();
    } catch (e) {
      onNotify("Erro ao guardar alterações de menu.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  const handleExportCSV = () => {
    try {
      const listToExport = filteredAndCategorizedMenus.list;
      if (listToExport.length === 0) {
        onNotify("Nenhum prato na lista filtrada para exportar.", "error");
        return;
      }

      // Headers of the CSV
      const headers = [
        "ID",
        "Nome do Prato",
        "Descricao",
        "Tipo",
        "Preco",
        "Chef ID",
        "Nome do Chef",
        "Disponivel",
        "Categoria/Cuisine",
        "Min Pax",
        "Max Pax"
      ];

      // Convert rows to arrays of escaped strings
      const rows = listToExport.map((menu) => {
        const cookId = menu.cookId || menu.cook_id;
        const chefName = users.find((u) => u.id === cookId)?.nome || "Nao Atribuido";
        const isAvailableText = menu.isAvailable ? "Sim (Ativo)" : "Nao (Rascunho/Rejeitado)";

        return [
          menu.id || "",
          menu.nome || "",
          menu.descricao || "",
          menu.type || "",
          menu.preco !== undefined ? String(menu.preco) : "",
          cookId || "",
          chefName,
          isAvailableText,
          menu.categoria || "",
          menu.minPax !== undefined ? String(menu.minPax) : "",
          menu.maxPax !== undefined ? String(menu.maxPax) : ""
        ];
      });

      // Escape quotes and wrap values in quotes
      const csvContent = [
        headers,
        ...rows
      ]
        .map((row) =>
          row
            .map((val) => {
              const cleaned = val.replace(/"/g, '""'); // Double escape quotes
              return `"${cleaned}"`;
            })
            .join(",")
        )
        .join("\n");

      // Generate BOM for Excel Encoding support (with UTF-8)
      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", url);
      link.setAttribute("download", `pratos_moderacao_auditoria_${timestamp}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onNotify(`CSV Exportado com sucesso: ${listToExport.length} pratos.`, "success");
    } catch (error) {
      console.error("Erro na exportacao para CSV:", error);
      onNotify("Erro ao gerar ficheiro CSV.", "error");
    }
  };

  const handleExportUsersCSV = () => {
    try {
      const listToExport = sortedAndFilteredUsers;
      if (listToExport.length === 0) {
        onNotify("Nenhum utilizador encontrado para exportar.", "error");
        return;
      }

      const headers = [
        "ID",
        "Nome",
        "Email",
        "Telefone",
        "Papel (Role)",
        "Estado (Status)",
        "Aprovado Admin",
        "Bypass HACCP",
        "Cidade / Localizacao",
        "Volume Vendas (EUR)",
        "Classificacao (Rating)",
        "Total Reservas",
        "NIF",
        "IBAN",
        "Data Registo"
      ];

      const rows = listToExport.map((user) => {
        const volumeCalculated = userVolumes[user.id] || 0;
        return [
          user.id || "",
          user.nome || "",
          user.email || "",
          user.telefone || "",
          user.role || "",
          user.status || "",
          user.approvedByAdmin ? "Sim" : "Nao",
          user.bypass_haccp_restrictions ? "Sim" : "Nao",
          user.cidade || user.localizacao || "",
          volumeCalculated.toString(),
          user.rating !== undefined ? String(user.rating) : "",
          user.total_reservas !== undefined ? String(user.total_reservas) : "",
          user.nif || "",
          user.iban || "",
          user.created_at || ""
        ];
      });

      const csvContent = [headers, ...rows]
        .map((row) =>
          row
            .map((val) => {
              const cleaned = String(val).replace(/"/g, '""');
              return `"${cleaned}"`;
            })
            .join(",")
        )
        .join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", url);
      link.setAttribute("download", `cookr_utilizadores_${timestamp}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onNotify(`CSV de Utilizadores exportado com sucesso (${listToExport.length} registos).`, "success");
      supabaseService.createAdminLog("ADMIN", "EXPORT_USERS_CSV", "SYSTEM", `Exportacao de ${listToExport.length} utilizadores em CSV.`);
    } catch (error) {
      console.error("Erro na exportacao de utilizadores para CSV:", error);
      onNotify("Erro ao gerar ficheiro CSV de utilizadores.", "error");
    }
  };

  const handleExportBookingsCSV = () => {
    try {
      const listToExport = filteredBookings;
      if (listToExport.length === 0) {
        onNotify("Nenhuma reserva encontrada para exportar.", "error");
        return;
      }

      const headers = [
        "ID Reserva",
        "Cliente ID",
        "Nome do Cliente",
        "Chef ID",
        "Nome do Chef",
        "Data do Servico",
        "Hora",
        "Menu Selecionado",
        "Numero de Pessoas",
        "Valor Total (EUR)",
        "Gorjeta (EUR)",
        "Estado da Reserva",
        "Morada / Local do Evento",
        "Possui Harmonizacao Vinhos",
        "PIN de Servico",
        "Data de Criacao"
      ];

      const rows = listToExport.map((b) => {
        const valor = typeof b.valorTotal === "string" ? b.valorTotal : String(b.valorTotal || 0);
        return [
          b.id || "",
          b.clientId || "",
          b.clientName || "",
          b.cookId || "",
          b.cookName || "",
          b.data || "",
          b.hora || "",
          b.menu_selected || "",
          b.numPessoas !== undefined ? String(b.numPessoas) : "",
          valor,
          b.gorjeta !== undefined ? String(b.gorjeta) : "0",
          b.status || "",
          b.morada || "",
          b.wine_pairing ? "Sim" : "Nao",
          b.service_pin || "",
          b.createdAt || ""
        ];
      });

      const csvContent = [headers, ...rows]
        .map((row) =>
          row
            .map((val) => {
              const cleaned = String(val).replace(/"/g, '""');
              return `"${cleaned}"`;
            })
            .join(",")
        )
        .join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", url);
      link.setAttribute("download", `cookr_reservas_${timestamp}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onNotify(`CSV de Reservas exportado com sucesso (${listToExport.length} registos).`, "success");
      supabaseService.createAdminLog("ADMIN", "EXPORT_BOOKINGS_CSV", "SYSTEM", `Exportacao de ${listToExport.length} reservas em CSV.`);
    } catch (error) {
      console.error("Erro na exportacao de reservas para CSV:", error);
      onNotify("Erro ao gerar ficheiro CSV de reservas.", "error");
    }
  };

  // Broadcast System
  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setIsActionPending("broadcast");
    try {
      await supabaseService.broadcastNotification(broadcastMsg, "info");
      await supabaseService.createAdminLog("ADMIN", "BROADCAST", "SYSTEM", broadcastMsg);
      onNotify("Mensagem enviada a toda a comunidade!", "success");
      setBroadcastMsg("");
    } catch (e) {
      onNotify("Erro ao enviar broadcast.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  const handleUpdateSetting = async (key: string, value: any) => {
    setIsActionPending(key);
    try {
      await supabaseService.updatePlatformSetting(key, value);
      setSettings((prev: any) => ({ ...prev, [key]: value }));
      await supabaseService.createAdminLog("ADMIN", "SETTING_CHANGED", key, `Novo valor: ${value}`);
      onNotify(`Configuração ${key} atualizada.`, "success");
    } catch (e) {
      onNotify("Erro ao atualizar configuração.", "error");
    } finally {
      setIsActionPending(null);
    }
  };

  const handleSeedData = async () => {
    if (!import.meta.env.DEV) {
      onNotify("A sementeira de dados de teste está desativada em produção.", "error");
      return;
    }
    if (!window.confirm("Deseja popular os dados em tempo real no Supabase?")) return;
    setIsSeeding(true);
    try {
      await supabaseService.seedDatabase(mockUsers, mockMenus, mockRecipes, mockBookings);
      await supabaseService.createAdminLog("ADMIN", "SEED_DATABASE", "SUPABASE", "Popular tabelas iniciais");
      onNotify("Banco de dados populado com sucesso!", "success");
      onRefresh();
    } catch (error: any) {
      onNotify("Erro ao popular banco.", "error");
    } finally {
      setIsSeeding(false);
    }
  };

  // Custom actionable plan task engine UI actions
  const handleAddCustomTask = () => {
    if (!newCustomTaskText.trim()) return;
    const newTask = {
      id: "custom_" + Date.now().toString(),
      text: newCustomTaskText,
      done: false,
    };
    setCustomTasks((prev) => [...prev, newTask]);
    setNewCustomTaskText("");
    onNotify("Tarefa adicionada ao plano de ação!", "info");
  };

  const handleToggleTaskStatus = (id: string, isAuto: boolean) => {
    if (isAuto) {
      onNotify("Tarefas de anomalias de IA são resolvidas resolvendo o estado da base de dados.", "info");
      return;
    }
    setCustomTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const handleRemoveCustomTask = (id: string) => {
    setCustomTasks((prev) => prev.filter((t) => t.id !== id));
    onNotify("Tarefa removida.", "info");
  };

  return (
    <div id="command_center_viewport" className="min-h-dvh bg-slate-50/50 text-slate-800 font-sans pb-24">
      {/* Premium Admin Header */}
      <div className="border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-40 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center border border-orange-400 shadow-md shadow-orange-500/10">
              <ICONS.ShieldCheck className="text-white animate-pulse" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight uppercase italic text-orange-600 font-sans">
                  Cookr Command Center
                </h1>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-extrabold border border-indigo-150 uppercase tracking-widest rounded-md">
                  Enterprise v3.4
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-extrabold border border-emerald-150 uppercase tracking-widest rounded-md">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  Realtime
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wide mt-0.5">
                Sessão Segura: Administrador Consolidado • Infraestrutura Cloud Supabase Ativa
              </p>
            </div>
          </div>

          {/* Quick Stats overview */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="px-3.5 py-1.5 bg-white/80 border border-slate-200/80 rounded-xl shadow-xs">
              <span className="text-slate-400 text-[10px] font-sans font-bold uppercase tracking-wider mr-1.5">Volume GMV:</span>{" "}
              <span className="text-emerald-600 font-black tracking-tight">{formatPrice(stats.totalVolume)}</span>
            </div>
            <div className="px-3.5 py-1.5 bg-white/80 border border-slate-200/80 rounded-xl shadow-xs hidden md:block">
              <span className="text-slate-400 text-[10px] font-sans font-bold uppercase tracking-wider mr-1.5">Faturação Host:</span>{" "}
              <span className="text-orange-600 font-black tracking-tight">{formatPrice(stats.platformRevenue)}</span>
            </div>
            <button
              onClick={onRefresh}
              className="relative p-2 bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white rounded-xl border border-orange-100/80 transition-all duration-200 shadow-xs focus:ring-2 focus:ring-orange-500/20"
              title="Sincronizar dados"
            >
              <ICONS.RefreshCw className="animate-spin-slow" size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Navigation Sidebar/Tab Tabs Layout */}
        <div className="flex mb-8 pb-3 border-b border-slate-200/50 overflow-x-auto scrollbar-none">
          <div className="flex gap-1.5 p-1.5 bg-slate-100/60 rounded-2xl border border-slate-200/55 max-w-full overflow-x-auto shrink-0">
            {[
              { id: "overview", label: "Painel Geral", icon: ICONS.LayoutDashboard },
              { id: "users", label: "Cockpit Perfis", icon: ICONS.Users },
              { id: "support", label: "Suporte & Interceptação", icon: ICONS.MessageSquare },
              { id: "menus", label: "Triagem Menus", icon: ICONS.Utensils },
              { id: "reviews", label: "Reviews Denunciadas", icon: ICONS.AlertTriangle },
              { id: "bookings", label: "Reservas & Kanban", icon: ICONS.Calendar },
              { id: "community", label: "Bulletins Coletivos", icon: ICONS.Megaphone },
              { id: "financial", label: "Finanças & GMV", icon: ICONS.CreditCard },
              { id: "settings", label: "Definições Sistema", icon: ICONS.Settings },
              { id: "logs", label: "Rastreios Audit", icon: ICONS.List },
              { id: "backstage", label: "Sandboxes DevOps", icon: ICONS.Database },
            ].filter((tab) => tab.id !== "backstage" || import.meta.env.DEV).map((tab) => {
              const isTabActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-[10px] sm:text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    isTabActive
                      ? "bg-white text-orange-600 shadow-xs border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                  }`}
                >
                  <tab.icon size={13} className={isTabActive ? "text-orange-500" : "text-slate-400"} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: OVERVIEW & AI COMMANDS */}
        {/* ---------------------------------------------------- */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "GMV Transacionado", val: formatPrice(stats.totalVolume), pct: "Geral", icon: ICONS.TrendingUp, color: "text-emerald-600", bg: "bg-emerald-500/5", border: "border-emerald-500/10" },
                { label: "Comissão Plataforma", val: formatPrice(stats.platformRevenue), pct: `${( (settings.commission_rate || COMMISSION_RATE) * 100 ).toFixed(0)}% Taxa Retida`, icon: ICONS.Percent, color: "text-orange-600", bg: "bg-orange-500/5", border: "border-orange-500/10" },
                { label: "Chefs Registados", val: `${users.filter(u=>u.role===UserRole.COOK).length} chefs`, pct: `${stats.activeCooks} ativos atualmente`, icon: ICONS.ChefHat, color: "text-indigo-600", bg: "bg-indigo-500/5", border: "border-indigo-500/10" },
                { label: "Rituais de Vendas", val: stats.totalBookings, pct: `${stats.completedBookings} concluídas com sucesso`, icon: ICONS.Calendar, color: "text-amber-600", bg: "bg-amber-500/5", border: "border-amber-500/10" },
              ].map((card, i) => (
                <div key={i} className="bg-white border border-slate-200/80 p-6 rounded-2xl flex justify-between items-start shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <div className="space-y-2.5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">{card.label}</p>
                    <p className={`text-2xl font-black italic tracking-tighter ${card.color}`}>{card.val}</p>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${card.bg} ${card.color} ${card.border}`}>
                      {card.pct}
                    </span>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg} border ${card.border}`}>
                    <card.icon className={`${card.color}`} size={16} />
                  </div>
                </div>
              ))}
            </div>

            {/* Recharts LineChart growth & Seasonality trend components */}
            <div className="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm text-left">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100">
                      <ICONS.TrendingUp className="text-orange-500" size={18} />
                    </div>
                    <h3 className="text-lg font-black tracking-tight uppercase italic text-orange-500">
                      Tendência de Procura & Análise de Crescimento
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Visualização em tempo real de crescimento da plataforma, volume financeiro e picos sazonais de procura por chefs.
                  </p>
                </div>

                {/* Switcher Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-inner shrink-0">
                  <button
                    onClick={() => setOverviewChartTab("growth")}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                      overviewChartTab === "growth"
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200/20"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <ICONS.TrendingUp size={11} />
                    Crescimento & GMV
                  </button>
                  <button
                    onClick={() => setOverviewChartTab("seasonality")}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                      overviewChartTab === "seasonality"
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200/20"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <ICONS.Calendar size={11} />
                    Procura Sazonal
                  </button>
                </div>
              </div>

              {overviewChartTab === "growth" ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-4 justify-end">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-orange-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Reservas Concluídas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Volume Total (GMV €)</span>
                    </div>
                  </div>

                  <div className="h-72 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <LineChart
                        data={monthlyData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="monthName"
                          stroke="#64748b"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          yAxisId="left"
                          stroke="#64748b"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          dx={-5}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#64748b"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          dx={5}
                          tickFormatter={(value) => `€${value}`}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-lg space-y-2 text-xs text-slate-800 text-left">
                                  <p className="font-extrabold uppercase tracking-widest text-slate-500 text-[10px] border-b border-slate-100 pb-1">
                                    {data.monthName} (Progresso Mensal)
                                  </p>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-6">
                                      <span className="text-slate-500">Reservas Concluídas:</span>
                                      <span className="font-black text-orange-600 text-sm">{data.completed}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-1">
                                      <span className="text-slate-500">Transacionado (GMV):</span>
                                      <span className="font-black text-emerald-600 text-sm">€{data.gmv}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-6 text-[10px] text-slate-400 italic">
                                      <span>Total Registadas:</span>
                                      <span>{data.total} rituais</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="completed"
                          stroke="#f97316"
                          strokeWidth={3}
                          dot={{ fill: "#f97316", strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, strokeWidth: 0, fill: "#ffedd5" }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="gmv"
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ fill: "#10b981", strokeWidth: 1, r: 3 }}
                          activeDot={{ r: 5, strokeWidth: 0, fill: "#ecfdf5" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                /* NEW 'Monthly Bookings' Seasonality and Demand chart */
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Picos do Ano</p>
                      <p className="text-xs font-bold text-slate-800">Verão (Jul/Ago) & Natal (Dez)</p>
                      <p className="text-[10px] text-slate-500">Aumento acentuado na reserva de Chefs Privados e Banquetes.</p>
                    </div>
                    <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200/60 pt-2.5 md:pt-0 md:pl-4">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Fator de Variação</p>
                      <p className="text-xs font-bold text-slate-800">Sazonalidade Climatérica</p>
                      <p className="text-[10px] text-slate-500">Preferencia por menus leves e BBQs no verão; jantares de conforto no inverno.</p>
                    </div>
                    <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200/60 pt-2.5 md:pt-0 md:pl-4">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Ação Recomendada</p>
                      <p className="text-xs font-bold text-orange-600">Promover Menus Sazonais</p>
                      <p className="text-[10px] text-slate-500">Incentivar chefs a criarem experiências gastronómicas temáticas.</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 justify-end">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Procura Total (Pedidos)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Reservas Concluídas (Sucesso)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Cancelados / Perdas</span>
                    </div>
                  </div>

                  <div className="h-72 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart
                        data={monthlyData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="monthName"
                          stroke="#64748b"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          stroke="#64748b"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          dx={-5}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const peakSeasonMonths = ["Jun", "Jul", "Ago", "Dez"];
                              const isPeak = peakSeasonMonths.includes(data.monthName);
                              return (
                                <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-lg space-y-2 text-xs text-slate-800 text-left">
                                  <p className="font-extrabold uppercase tracking-widest text-slate-500 text-[10px] border-b border-slate-100 pb-1 flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                      <ICONS.Calendar size={11} className="text-orange-500" />
                                      {data.monthName} (Sazonalidade)
                                    </span>
                                    {isPeak && (
                                      <span className="text-[7px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md font-black uppercase">
                                        Pico de Procura
                                      </span>
                                    )}
                                  </p>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-6">
                                      <span className="text-slate-500">Pedidos Efetuados (Procura):</span>
                                      <span className="font-black text-amber-600 text-sm">{data.total}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-1">
                                      <span className="text-slate-500 text-emerald-600 font-semibold">Sucesso (Concluídos):</span>
                                      <span className="font-black text-emerald-600 text-sm">{data.completed}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-1">
                                      <span className="text-slate-500 text-red-500 font-semibold">Cancelamentos:</span>
                                      <span className="font-black text-red-500 text-sm">{data.cancelled}</span>
                                    </div>
                                    <div className="text-[8.5px] text-slate-400 italic font-bold border-t border-slate-50 pt-1.5 flex items-center justify-between">
                                      <span>Taxa de Conversão:</span>
                                      <span className="text-slate-700">
                                        {data.total > 0 ? ((data.completed / data.total) * 100).toFixed(0) : 0}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="total"
                          fill="#f59e0b"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={16}
                          name="Procura"
                        />
                        <Bar
                          dataKey="completed"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={16}
                          name="Sucesso"
                        />
                        <Bar
                          dataKey="cancelled"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={16}
                          name="Cancelamentos"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* AI Commander Insights Section + ToDo List Checklist */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Dynamic Friction Scans (Orange / Red Cards) */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-8 space-y-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100">
                    <ICONS.Sparkles className="text-orange-500" size={18} />
                  </div>
                  <h3 className="text-lg font-black tracking-tight uppercase italic text-orange-500">
                    AI Insights & Fricção de Negócio
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Algoritmo de análise instantânea do banco de dados para evitar gargalos e perdas operacionais.
                </p>

                <div className="space-y-4">
                  {frictionAlerts.length === 0 ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 shadow-inner">
                      <ICONS.CheckCircle className="text-emerald-500" size={20} />
                      <div>
                        <p className="text-xs font-bold text-emerald-800 uppercase">Segurança Operacional 100%</p>
                        <p className="text-[10px] text-slate-500">Nenhum gargalo de oferta ou canibalização de menus detetada.</p>
                      </div>
                    </div>
                  ) : (
                    frictionAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-2xl border flex items-start gap-3 justify-between ${
                          alert.type === "critical"
                            ? "bg-red-50 border-red-150"
                            : alert.type === "warning"
                            ? "bg-orange-50 border-orange-100"
                            : "bg-indigo-50 border-indigo-150"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <ICONS.AlertTriangle
                            className={
                              alert.type === "critical"
                                ? "text-red-500"
                                : alert.type === "warning"
                                ? "text-orange-500"
                                : "text-indigo-500"
                            }
                            size={18}
                          />
                          <div>
                            <p
                              className={`text-xs font-black uppercase italic ${
                                alert.type === "critical"
                                  ? "text-red-600"
                                  : alert.type === "warning"
                                  ? "text-orange-600"
                                  : "text-indigo-600"
                              }`}
                            >
                              {alert.title}
                            </p>
                            <p className="text-[10px] text-slate-600 mt-1">{alert.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Actionable Executive Plan (To - Do Checklist UI) */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-8 space-y-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100">
                    <ICONS.Target className="text-orange-500" size={18} />
                  </div>
                  <h3 className="text-lg font-black tracking-tight uppercase italic text-orange-500">
                    Plano de Ação Executivo
                  </h3>
                </div>

                {/* Add Custom Task field */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Adicionar tarefa manual (ex: ligar para Chef Maria)..."
                    value={newCustomTaskText}
                    onChange={(e) => setNewCustomTaskText(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={handleAddCustomTask}
                    className="relative px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg text-white font-bold text-[10px] uppercase before:absolute before:inset-y-[-8px] before:inset-x-0 before:sm:hidden before:content-['']"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Combined Tasks List */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {activeToDoList.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-8">Nenhuma tarefa operacional registada.</p>
                  ) : (
                    activeToDoList.map((t) => (
                      <div
                        key={t.id}
                        className={`p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-4 transition-all ${
                          t.done ? "opacity-55" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={t.done}
                            onChange={() => handleToggleTaskStatus(t.id, t.auto)}
                            className="w-4 h-4 accent-orange-500 rounded border-slate-200 bg-white cursor-pointer"
                          />
                          <span className={`text-[11px] font-bold ${t.done ? "line-through text-slate-400" : "text-slate-700"}`}>
                            {t.text}
                          </span>
                        </div>
                        {!t.auto && (
                          <button
                            onClick={() => handleRemoveCustomTask(t.id)}
                            className="relative text-slate-400 hover:text-red-500 transition-colors p-1.5 before:absolute before:-inset-2 before:sm:-inset-0 before:content-['']"
                          >
                            <ICONS.Trash2 size={13} />
                          </button>
                        )}
                        {t.auto && (
                          <span className="text-[7px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100 font-mono">
                            AUTO (IA)
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: GLOBAL MANAGEMENT OF USERS (COCKPIT) */}
        {activeTab === "users" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header with quick filters */}
            <div className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-4 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-black italic uppercase text-orange-500 tracking-tight">
                  Tabela Automática de Clientes, Chefs & Staff
                </h2>
                <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                  <input
                    type="text"
                    placeholder="Filtrar por nome ou email..."
                    value={userSearchText}
                    onChange={(e) => setUserSearchText(e.target.value)}
                    className="flex-1 md:w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value as any)}
                    className="bg-white text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold outline-none hover:bg-slate-50 cursor-pointer"
                  >
                    <option value="ALL">Todos os Papéis</option>
                    <option value={UserRole.CLIENT}>Clientes</option>
                    <option value={UserRole.COOK}>Chefs</option>
                    <option value={UserRole.ADMIN}>Administradores</option>
                  </select>
                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value as any)}
                    className="bg-white text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold outline-none hover:bg-slate-50 cursor-pointer"
                  >
                    <option value="ALL">Todos os Estados</option>
                    <option value={UserStatus.ACTIVE}>Ativos</option>
                    <option value={UserStatus.PENDING}>Pendentes</option>
                    <option value={UserStatus.SUSPENDED}>Suspensos</option>
                  </select>
                  <button
                    onClick={handleExportUsersCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
                    title="Exportar lista de utilizadores para ficheiro CSV"
                  >
                    <ICONS.FileText size={14} />
                    <span>Exportar CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Main table dynamic list */}
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider">Perfil</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider">Papel</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider">Volume de Vendas (Reservas)</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider">Estado da Conta</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedAndFilteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-20 text-center text-slate-400 italic text-xs">
                          Nenhum utilizador encontrado com esta filtragem.
                        </td>
                      </tr>
                    ) : (
                      sortedAndFilteredUsers.map((user) => {
                        const volumeCalculated = userVolumes[user.id] || 0;
                        return (
                          <tr
                            key={user.id}
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                            onClick={() => setSelectedUser(user)}
                          >
                            {/* Avatar & Identificação */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                                  {user.avatar_url ? (
                                    <img src={user.avatar_url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                                  ) : (
                                    <span className="font-black text-xs text-orange-500">{user.nome?.charAt(0) || "U"}</span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-black uppercase italic tracking-tight text-slate-800">{user.nome}</p>
                                  <p className="text-[10px] text-slate-400">{user.email}</p>
                                </div>
                              </div>
                            </td>

                            {/* Badge Papel */}
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                                  user.role === UserRole.COOK
                                    ? "bg-amber-50 text-amber-700 border-amber-100"
                                    : user.role === UserRole.ADMIN
                                    ? "bg-purple-50 text-purple-700 border-purple-100"
                                    : "bg-slate-100 text-slate-650 border-slate-200"
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>

                            {/* Faturação do usuário */}
                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-650">
                              {formatPrice(volumeCalculated)}
                            </td>

                            {/* Estado da conta */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span
                                  className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                                    user.status === UserStatus.ACTIVE
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                      : user.status === UserStatus.PENDING
                                      ? "bg-amber-50 text-amber-700 border-amber-100"
                                      : "bg-red-50 text-red-700 border-red-100"
                                  }`}
                                >
                                  {user.status}
                                </span>
                                {user.bypass_haccp_restrictions && (
                                  <span className="px-2 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider bg-amber-500 text-white border border-amber-600 shadow-2xs flex items-center gap-1">
                                    <span>◆</span> Bypass HACCP Ativo
                                  </span>
                                )}
                                {user.status === UserStatus.PENDING && (
                                  <span className="px-2 py-0.5 rounded text-[7.5px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                                    <span>◆</span> Aguardando Revisão
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Delete, Simular and view button */}
                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => onImpersonateUser?.(user)}
                                  className="relative p-1 px-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 hover:text-white rounded-lg text-[9px] uppercase font-bold text-indigo-700 transition-all flex items-center gap-1 shadow-2xs"
                                  title="Ver aplicação como este utilizador"
                                >
                                  <ICONS.Eye size={11} />
                                  <span>Simular</span>
                                </button>
                                <button
                                  onClick={() => setSelectedUser(user)}
                                  className="relative p-1 px-2.5 bg-slate-50 border border-slate-200 hover:border-orange-500 hover:bg-orange-50 rounded-lg text-[9px] uppercase font-bold text-slate-600 hover:text-orange-600 transition-all"
                                >
                                  Gerir
                                </button>
                                <button
                                  onClick={() => handleDelete("user", user.id)}
                                  className="relative p-1 px-2 bg-red-50 border border-red-100 hover:bg-red-500 hover:text-white text-red-500 rounded-lg transition-all"
                                  title="Terminar Conta"
                                >
                                  <ICONS.Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedUser && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
                <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-dvh overflow-y-auto p-4 sm:p-6 md:p-8 shadow-2xl flex flex-col justify-between text-slate-800">
                  <div>
                    {/* Drawer header */}
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center font-black text-orange-500">
                          {selectedUser.nome?.charAt(0) || "U"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-md font-black uppercase tracking-tight text-slate-800">{selectedUser.nome}</h3>
                            {selectedUser.bypass_haccp_restrictions && (
                              <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[8px] font-black uppercase tracking-wider">
                                Bypass HACCP Ativo
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">ID: {selectedUser.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const u = selectedUser;
                            setSelectedUser(null);
                            onImpersonateUser?.(u);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                          title="Entrar/Ver aplicação como este utilizador"
                        >
                          <ICONS.Eye size={12} />
                          <span>Simular Utilizador</span>
                        </button>
                        <button
                          onClick={() => setSelectedUser(null)}
                          className="relative p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all"
                        >
                          <ICONS.X size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Informação básica da conta */}
                    <div className="grid grid-cols-2 gap-4 mb-6 text-[10px] bg-slate-50 p-4 rounded-xl border border-slate-150/60 font-mono">
                      <div>
                        <span className="text-slate-400">Perfil:</span>{" "}
                        <span className="text-slate-700">{selectedUser.role}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Estado:</span>{" "}
                        <span className="text-slate-700">{statusLabel(selectedUser.status)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Pontos Loyalty:</span>{" "}
                        <span className="text-amber-600 font-bold">{selectedUser.loyalty_points || 0} pts</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Morada:</span>{" "}
                        <span className="text-slate-700 truncate block">{selectedUser.morada || "N/A"}</span>
                      </div>
                    </div>

                    {/* Módulo 1 Action panel - Ban Account, Change Roles, Inject Loyalty */}
                    <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-6 mb-6 space-y-4">
                      <h4 className="text-xs font-black uppercase text-orange-500 italic">Central de Super-Poderes</h4>
                      
                      <div className="space-y-4">
                        {/* Aprovação de candidatura de chef */}
                        {selectedUser.role === UserRole.COOK &&
                          (selectedUser.status === UserStatus.UNDER_REVIEW || selectedUser.status === UserStatus.PENDING) && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-3">
                              <div>
                                <h5 className="text-[11px] font-black uppercase text-emerald-900 tracking-wider">Candidatura de chef por aprovar</h5>
                                <p className="text-[9.5px] text-emerald-800 font-medium leading-relaxed mt-0.5">
                                  Ao aprovar, a conta fica ativa e o chef passa a aparecer no catálogo e a poder receber reservas.
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={isActionPending === selectedUser.id}
                                onClick={() => handleApproveChef(selectedUser)}
                                className="px-3 py-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-sm shrink-0"
                              >
                                Aprovar candidatura
                              </button>
                            </div>
                          )}
                        {/* Bypass de Documentação & Regras HACCP (Admin Override) */}
                        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h5 className="text-[11px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                                <span>◆</span>
                                <span>Bypass de Documentação & Regras HACCP</span>
                              </h5>
                              <p className="text-[9.5px] text-amber-800 font-medium leading-relaxed mt-0.5">
                                Toggle de override para forçar a aprovação e publicação imediata do chef/utilizador na pesquisa e catálogo, mesmo que existam documentos ou certidões HACCP pendentes.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const newBypass = !selectedUser.bypass_haccp_restrictions;
                                const updated = {
                                  ...selectedUser,
                                  bypass_haccp_restrictions: newBypass,
                                  status: newBypass ? UserStatus.ACTIVE : selectedUser.status,
                                  approvedByAdmin: newBypass ? true : selectedUser.approvedByAdmin
                                };
                                try {
                                  await supabaseService.updateUserProfile(selectedUser.id, {
                                    bypass_haccp_restrictions: newBypass,
                                    status: newBypass ? UserStatus.ACTIVE : selectedUser.status,
                                    approvedByAdmin: newBypass ? true : selectedUser.approvedByAdmin
                                  });
                                  await supabaseService.createAdminLog(
                                    "ADMIN",
                                    newBypass ? "BYPASS_HACCP_ENABLED" : "BYPASS_HACCP_DISABLED",
                                    selectedUser.id,
                                    `Bypass de restrições HACCP/Docs ${newBypass ? "ativado" : "desativado"} para ${selectedUser.nome}`
                                  );
                                  setSelectedUser(updated);
                                  fetchLogs();
                                  onNotify(
                                    newBypass
                                      ? "Bypass de HACCP & Documentação ATIVADO! Chef visível sem restrições."
                                      : "Bypass Desativado. Regras padrão de aprovação restabelecidas.",
                                    "success"
                                  );
                                  onRefresh();
                                } catch (err) {
                                  console.error(err);
                                  onNotify("Erro ao atualizar o estado de bypass.", "error");
                                }
                              }}
                              className={`px-3 py-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all border shrink-0 ${
                                selectedUser.bypass_haccp_restrictions
                                  ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm"
                                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-amber-400"
                              }`}
                            >
                              {selectedUser.bypass_haccp_restrictions ? "Bypass Ativo (Ativado)" : "Ativar Bypass"}
                            </button>
                          </div>
                        </div>
                        {/* Change state status */}
                        <div className="space-y-1.5 border-b border-slate-105 pb-4">
                          <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Estado da Conta & Suspensão</label>
                          
                          <div className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  selectedUser.status === UserStatus.SUSPENDED
                                    ? "bg-red-500 animate-pulse"
                                    : selectedUser.status === UserStatus.PENDING || selectedUser.status === UserStatus.UNDER_REVIEW
                                    ? "bg-amber-500 animate-pulse"
                                    : "bg-emerald-500"
                                }`}
                              />
                              <span className="text-[11px] font-black uppercase italic tracking-tight text-slate-700">
                                {selectedUser.status === UserStatus.SUSPENDED ? "Conta Suspensa / Banida" : `Conta ${statusLabel(selectedUser.status)}`}
                              </span>
                            </div>
                            {selectedUser.admin_notes && (
                              <span className="text-[9px] text-red-500 font-medium max-w-[180px] truncate italic" title={selectedUser.admin_notes}>
                                "{selectedUser.admin_notes}"
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 pt-2">
                            <label className="text-[8px] text-slate-400 uppercase font-bold block">Nota / Justificação da Ação (Salva nos logs e mostrada ao utilizador)</label>
                            <input
                              type="text"
                              placeholder="Escreva a justificação da suspensão ou reabilitação..."
                              value={suspensionReason}
                              onChange={(e) => setSuspensionReason(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-orange-500"
                            />
                          </div>

                          <div className="flex gap-2 pt-1.5">
                            {selectedUser.status === UserStatus.SUSPENDED ? (
                              <button
                                onClick={() => {
                                  const note = suspensionReason.trim() || "Reabilitado pelo Admin";
                                  handleUpdateStatus(selectedUser.id, UserStatus.ACTIVE, note);
                                  setSuspensionReason("");
                                }}
                                className="relative w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl text-[10px] uppercase shadow transition-all flex items-center justify-center gap-1.5"
                              >
                                <ICONS.Check size={12} />
                                Ativar & Desbanir Conta
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  const note = suspensionReason.trim() || "Suspenso por violação das regras da comunidade";
                                  handleUpdateStatus(selectedUser.id, UserStatus.SUSPENDED, note);
                                  setSuspensionReason("");
                                }}
                                className="relative w-full py-2 bg-red-500 hover:bg-red-600 text-white font-extrabold rounded-xl text-[10px] uppercase shadow transition-all flex items-center justify-center gap-1.5"
                              >
                                <ICONS.XCircle size={12} />
                                Banir / Suspender Conta
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Change permission level */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-slate-500 uppercase font-black block">Permissão do Sistema</label>
                          <select
                            value={selectedUser.role}
                            onChange={(e) => handleUpdateRole(selectedUser.id, e.target.value as UserRole)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-50"
                          >
                            <option value={UserRole.CLIENT}>Client (Padrão)</option>
                            <option value={UserRole.COOK}>Cook / Chef Privado</option>
                            <option value={UserRole.ADMIN}>Administrador</option>
                          </select>
                        </div>
                      </div>

                      {/* Adjust Promotional Loyalty Points balance */}
                      <div className="space-y-2 border-t border-slate-100 pt-4">
                        <label className="text-[9px] text-slate-500 uppercase font-black block">Injetar Saldo Promocional (Fidelidade)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Pontos de Loyalty (ex: 250)..."
                            defaultValue={selectedUser.loyalty_points || 0}
                            id={`pts_adjust_input_${selectedUser.id}`}
                            className="w-32 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none"
                          />
                          <button
                            onClick={() => {
                              const inputEl = document.getElementById(`pts_adjust_input_${selectedUser.id}`) as HTMLInputElement;
                              if (inputEl) {
                                handleUpdateLoyaltyPoints(selectedUser.id, parseInt(inputEl.value) || 0);
                              }
                            }}
                            className="relative px-3 py-1 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded text-[9px] uppercase before:absolute before:inset-y-[-8px] before:inset-x-0 before:sm:hidden before:content-['']"
                          >
                            Atualizar Saldo
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Módulo 3 - Edição Direta de Perfil */}
                    <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-6 mb-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <ICONS.Edit3 size={14} className="text-orange-500" />
                        <h4 className="text-xs font-black uppercase text-orange-500 italic">Edição Direta de Perfil</h4>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Corrige pequenos erros cadastrais a pedido do utilizador (ex: IBAN do chef, morada de entrega, telefone ou NIF).
                      </p>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          const updated: Partial<User> = {
                            nome: fd.get("nome") as string,
                            email: fd.get("email") as string,
                            telefone: fd.get("telefone") as string,
                            nif: fd.get("nif") as string,
                            morada: fd.get("morada") as string,
                          };
                          
                          if (selectedUser.role === UserRole.COOK) {
                            updated.iban = fd.get("iban") as string;
                          }
                          
                          handleUpdateUserProfileDirect(selectedUser.id, updated);
                        }}
                        className="space-y-3 text-left"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8px] text-slate-500 uppercase font-bold">Nome Completo</label>
                            <input
                              type="text"
                              name="nome"
                              defaultValue={selectedUser.nome}
                              required
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-705 outline-none focus:border-orange-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] text-slate-500 uppercase font-bold">Endereço de Email</label>
                            <input
                              type="email"
                              name="email"
                              defaultValue={selectedUser.email}
                              required
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-705 outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8px] text-slate-500 uppercase font-bold">Telefone / Telemóvel</label>
                            <input
                              type="text"
                              name="telefone"
                              defaultValue={selectedUser.telefone || ""}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-705 outline-none focus:border-orange-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] text-slate-500 uppercase font-bold">NIF (Contribuinte)</label>
                            <input
                              type="text"
                              name="nif"
                              defaultValue={selectedUser.nif || ""}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-705 outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>

                        {selectedUser.role === UserRole.COOK && (
                          <div className="space-y-1">
                            <label className="text-[8px] text-slate-500 uppercase font-bold text-amber-600 font-extrabold block">IBAN do Chef (Para faturamento de serviços)</label>
                            <input
                              type="text"
                              name="iban"
                              defaultValue={selectedUser.iban || ""}
                              placeholder="PT50 0007 0000 ..."
                              className="w-full px-3 py-1.5 bg-amber-50/30 border border-amber-200 rounded-lg text-xs font-mono text-slate-705 outline-none focus:border-orange-500"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[8px] text-slate-500 uppercase font-bold">Morada de Entrega / Principal</label>
                          <input
                            type="text"
                            name="morada"
                            defaultValue={selectedUser.morada || ""}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-705 outline-none focus:border-orange-500"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isActionPending !== null}
                          className="relative w-full py-2.5 bg-slate-900 hover:bg-orange-500 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-xl shadow transition-all disabled:opacity-40"
                        >
                          {isActionPending === "edit_profile_" + selectedUser.id ? "A gravar..." : "Guardar Alterações do Perfil"}
                        </button>
                      </form>
                    </div>

                    {/* Módulo 3 - Segurança & Recuperação */}
                    <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-6 mb-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <ICONS.Lock size={14} className="text-orange-500" />
                        <h4 className="text-xs font-black uppercase text-orange-500 italic">Segurança & Recuperação de Acesso</h4>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Ajuda o utilizador que perdeu o acesso à conta redefinindo a palavra-passe ou gerando um link direto de recuperação.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                        {/* Reset password directly */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            const newPass = fd.get("newPassword") as string;
                            handleResetPasswordDirect(selectedUser.id, newPass);
                            e.currentTarget.reset();
                          }}
                          className="space-y-2 text-left"
                        >
                          <label className="text-[8px] text-slate-500 uppercase font-bold block">Definir Nova Palavra-Passe</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              name="newPassword"
                              placeholder="Mínimo 6 caracteres..."
                              required
                              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-orange-500"
                            />
                            <button
                              type="submit"
                              disabled={isActionPending !== null}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[9px] font-bold uppercase transition-all disabled:opacity-50"
                            >
                              Definir
                            </button>
                          </div>
                        </form>

                        {/* Send reset recovery link */}
                        <div className="space-y-2 flex flex-col justify-end">
                          <label className="text-[8px] text-slate-500 uppercase font-bold block">Recuperação de Acesso</label>
                          <button
                            type="button"
                            onClick={() => handleGenerateRecoveryLink(selectedUser)}
                            className="relative w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-[10px] uppercase shadow transition-all flex items-center justify-center gap-1.5"
                          >
                            <ICONS.Link size={12} />
                            Enviar Email de Recuperação
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Historical direct bookings of user */}
                    <div className="space-y-3 mb-6 bg-slate-50/50 border border-slate-150 p-6 rounded-2xl">
                      <h4 className="text-xs font-black uppercase text-orange-500 italic">Histórico de Transações</h4>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar text-[10px]">
                        {bookings.filter((b) => b.clientId === selectedUser.id || b.cookId === selectedUser.id).length === 0 ? (
                          <p className="text-slate-400 italic">Nenhum serviço agendado ou efetuado por este utilizador.</p>
                        ) : (
                          bookings
                             .filter((b) => b.clientId === selectedUser.id || b.cookId === selectedUser.id)
                             .map((b) => (
                               <div key={b.id} className="p-3 bg-white rounded-xl border border-slate-150/60 flex justify-between items-center shadow-inner">
                                 <div>
                                   <p className="font-bold text-slate-700">#{b.id.slice(0, 8)} - {b.menu_selected}</p>
                                   <p className="text-[8px] text-slate-400">{b.data} • {b.clientName} → {b.cookName}</p>
                                 </div>
                                 <div className="text-right">
                                   <p className="font-bold text-amber-600">{formatPrice(b.valorTotal)}</p>
                                   <p className="text-[7px] uppercase font-mono text-indigo-600">{b.status}</p>
                                 </div>
                               </div>
                             ))
                        )}
                      </div>
                    </div>

                    {/* If CHEFE: Direct menu management block (Módulo 1 requirement) */}
                    {selectedUser.role === UserRole.COOK && (
                      <div className="space-y-4 border-t border-slate-200/80 pt-6">
                        <h4 className="text-xs font-black uppercase text-orange-500 italic">Chef Menu Manager Direct</h4>
                        <div className="space-y-4">
                          {allMenus.filter((m) => m.cookId === selectedUser.id).length === 0 ? (
                            <p className="text-xs text-slate-500 italic">Este chef não disponibiliza qualquer menu no momento.</p>
                          ) : (
                            allMenus
                              .filter((m) => m.cookId === selectedUser.id)
                              .map((menu) => (
                                <form
                                  key={menu.id}
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.currentTarget);
                                    const edited: MenuItem = {
                                      ...menu,
                                      nome: fd.get("nome") as string,
                                      preco: parseFloat(fd.get("preco") as string) || 0,
                                      descricao: fd.get("descricao") as string,
                                      imageUrl: fd.get("imageUrl") as string,
                                      tags: (fd.get("tags") as string).split(",").map((s) => s.trim()),
                                    };
                                    handleSaveChefMenuDirect(edited);
                                  }}
                                  className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-3"
                                >
                                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-[10px] font-black uppercase text-orange-600">Menu: {menu.nome}</span>
                                    <span className="text-[8px] text-slate-400">ID: {menu.id}</span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[8px] text-slate-500 uppercase font-bold">Título do Menu</label>
                                      <input
                                        type="text"
                                        name="nome"
                                        defaultValue={menu.nome}
                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-700 outline-none focus:border-orange-500"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[8px] text-slate-500 uppercase font-bold">Preço (€)</label>
                                      <input
                                        type="number"
                                        name="preco"
                                        defaultValue={menu.preco}
                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-700 outline-none focus:border-orange-500"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[8px] text-slate-500 uppercase font-bold">Descrição</label>
                                    <textarea
                                      name="descricao"
                                      defaultValue={menu.descricao}
                                      rows={2}
                                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-700 outline-none resize-none focus:border-orange-500"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[8px] text-slate-500 uppercase font-bold">Imagem Cover URL</label>
                                      <input
                                        type="text"
                                        name="imageUrl"
                                        defaultValue={menu.imageUrl}
                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-700 outline-none focus:border-orange-500"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[8px] text-slate-500 uppercase font-bold">Tags Alergénios (Vírgulas)</label>
                                      <input
                                        type="text"
                                        name="tags"
                                        defaultValue={menu.tags?.join(", ") || ""}
                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-700 outline-none focus:border-orange-500"
                                      />
                                    </div>
                                  </div>

                                  <button
                                    type="submit"
                                    className="relative w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold uppercase text-xs tracking-widest rounded-xl shadow-md transition-all active:scale-97 before:absolute before:inset-y-[-8px] before:inset-x-0 before:sm:hidden before:content-['']"
                                  >
                                    Guardar Menu
                                  </button>
                                </form>
                              ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* If CHEFE: Ratings & Reviews Moderation Form (Módulo 3 requirement) */}
                    {selectedUser.role === UserRole.COOK && (
                      <div className="space-y-4 border-t border-slate-200/80 pt-6 mt-6 text-left animate-in fade-in duration-200">
                        <span className="text-xs font-black uppercase text-orange-500 italic block">Moderação de Avaliações de Clientes</span>
                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                          {isLoadingReviews ? (
                            <p className="text-[10px] text-slate-400 italic font-sans block py-4 animate-pulse">A carregar registo de comentários...</p>
                          ) : chefReviews.length === 0 ? (
                            <p className="text-[10px] text-slate-500 italic font-sans py-2">Este chef não possui avaliações no momento.</p>
                          ) : (
                            chefReviews.map((r) => (
                              <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-[10px] space-y-2 relative group text-left">
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <span className="font-extrabold text-slate-700 block text-[10px]">{r.clientName}</span>
                                    <div className="flex items-center gap-0.5 mt-0.5 text-amber-500">
                                      {Array.from({ length: 5 }).map((_, idx) => (
                                        <ICONS.Star
                                          key={idx}
                                          size={10}
                                          fill={idx < r.rating ? "currentColor" : "none"}
                                          stroke="currentColor"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteReview(r.id)}
                                    disabled={isActionPending === r.id}
                                    className="px-2 py-1 bg-red-50 text-red-650 hover:bg-red-500 hover:text-white rounded border border-red-100 transition-all uppercase text-[8px] font-bold shrink-0 self-start disabled:opacity-40"
                                    title="Remover avaliação abusivamente injusta"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                                <p className="text-slate-650 italic leading-relaxed whitespace-pre-wrap font-sans block py-0.5">{r.comment}</p>
                                {r.created_at && (
                                  <span className="text-[7px] text-slate-400 block text-right font-mono">
                                    {new Date(r.created_at).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                      }}
                      className="relative w-full py-3 bg-slate-950 hover:bg-orange-500 text-white rounded-xl font-extrabold text-xs uppercase tracking-widest transition-all active:scale-97 shadow-md before:absolute before:inset-y-[-8px] before:inset-x-0 before:sm:hidden before:content-[''] border border-white/5"
                    >
                      Fechar Configuração
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: GESTÃO E CURADORIA AVANÇADA DE MENUS */}
        {/* ---------------------------------------------------- */}
        {activeTab === "menus" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Title with Scale Info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left border-b border-dashed border-slate-150 pb-4">
              <div className="space-y-1">
                <h2 className="text-xl font-black italic uppercase text-orange-500 tracking-tight">
                  Hub de Moderação & Curadoria de Pratos (Big Data Scale)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Painel corporativo otimizado para triagem em massa e curadoria de menus do ecossistema.
                </p>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase rounded-xl transition-all shadow-sm shrink-0 self-start sm:self-center"
              >
                <ICONS.FileText size={14} />
                <span>Exportar CSV</span>
              </button>
            </div>

            {/* Workflow Tabs */}
            <div className="flex flex-wrap border-b border-slate-200 font-bold text-xs gap-1 text-left bg-slate-50 p-1.5 rounded-2xl">
              <button
                onClick={() => {
                  setMenusStatusTab("pending");
                  setMenusPage(1);
                }}
                className={`px-4 py-2 rounded-xl transition-all uppercase flex items-center gap-2 ${
                  menusStatusTab === "pending"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-slate-600 hover:text-orange-500 hover:bg-white/50"
                }`}
              >
                <span>⚠️ Aguardar Revisão</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${menusStatusTab === "pending" ? "bg-white text-orange-600" : "bg-slate-250 text-slate-700"}`}>
                  {filteredAndCategorizedMenus.pendingCount}
                </span>
              </button>
              <button
                onClick={() => {
                  setMenusStatusTab("active");
                  setMenusPage(1);
                }}
                className={`px-4 py-2 rounded-xl transition-all uppercase flex items-center gap-2 ${
                  menusStatusTab === "active"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-slate-600 hover:text-orange-500 hover:bg-white/50"
                }`}
              >
                <span>✓ Ativos</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${menusStatusTab === "active" ? "bg-white text-orange-600" : "bg-slate-250 text-slate-700"}`}>
                  {filteredAndCategorizedMenus.activeCount}
                </span>
              </button>
              <button
                onClick={() => {
                  setMenusStatusTab("rejected");
                  setMenusPage(1);
                }}
                className={`px-4 py-2 rounded-xl transition-all uppercase flex items-center gap-2 ${
                  menusStatusTab === "rejected"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-slate-600 hover:text-orange-500 hover:bg-white/50"
                }`}
              >
                <span>✕ Rejeitados/Arquivo</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${menusStatusTab === "rejected" ? "bg-white text-orange-600" : "bg-slate-250 text-slate-700"}`}>
                  {filteredAndCategorizedMenus.rejectedCount}
                </span>
              </button>
            </div>

            {/* Filter and Bulk controls box */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm text-left">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                {/* Search Term */}
                <div className="lg:col-span-4 relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <ICONS.Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Procurar por Prato, ID ou Chef..."
                    value={menusSearchText}
                    onChange={(e) => {
                      setMenusSearchText(e.target.value);
                      setMenusPage(1);
                    }}
                    className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all font-bold"
                  />
                </div>

                {/* Chef Filter */}
                <div className="lg:col-span-2">
                  <select
                    value={menusChefFilter}
                    onChange={(e) => {
                      setMenusChefFilter(e.target.value);
                      setMenusPage(1);
                    }}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none hover:bg-slate-100 cursor-pointer transition-all font-bold"
                  >
                    <option value="ALL">-- Todos os Chefs --</option>
                    {users.filter(u => u.role === "cook" || u.role === UserRole.COOK).map((chef) => (
                      <option key={chef.id} value={chef.id}>
                        {chef.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Filter */}
                <div className="lg:col-span-2">
                  <select
                    value={menusTypeFilter}
                    onChange={(e) => {
                      setMenusTypeFilter(e.target.value);
                      setMenusPage(1);
                    }}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none hover:bg-slate-100 cursor-pointer transition-all font-bold"
                  >
                    <option value="ALL">-- Todos os Tipos --</option>
                    <option value="dish">Prato (Dish)</option>
                    <option value="experience">Experiência (Experience)</option>
                  </select>
                </div>

                {/* Spacer line of architecture */}
                <div className="hidden lg:block lg:col-span-1 border-r border-slate-200 h-6 mx-auto"></div>

                {/* Bulk tools */}
                <div className="lg:col-span-3 flex items-center justify-end">
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="number"
                      placeholder="Desconto %"
                      onChange={(e) => setBulkDiscount(parseInt(e.target.value) || 0)}
                      className="w-24 px-3 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-orange-500 outline-none font-bold shadow-sm"
                    />
                    <select
                      onChange={(e) => setBulkCategory(e.target.value)}
                      className="bg-slate-50 text-slate-700 border border-slate-200 px-3 h-11 rounded-xl text-xs outline-none hover:bg-slate-100 cursor-pointer font-bold shadow-sm flex-1 md:flex-none"
                    >
                      <option value="">-- Mudar Cuisine --</option>
                      <option value="Tradicional Portuguesa">Tradicional Portuguesa</option>
                      <option value="Sushi & Asiática">Sushi & Asiática</option>
                      <option value="Italiana & Massas">Italiana & Massas</option>
                      <option value="Vegana & Saudável">Vegana & Vegana</option>
                    </select>
                    <button
                      onClick={handleApplyBulkMenuAction}
                      disabled={selectedMenus.length === 0}
                      className="h-11 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-extrabold text-xs uppercase rounded-xl shadow-md transition-all active:scale-95"
                    >
                      Massa ({selectedMenus.length})
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Corporate Data Table */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm text-left">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3.5 text-center w-12">
                        <input
                          type="checkbox"
                          checked={
                            filteredAndCategorizedMenus.list.length > 0 &&
                            filteredAndCategorizedMenus.list.every((m) => selectedMenus.includes(m.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const toAdd = filteredAndCategorizedMenus.list.map((m) => m.id);
                              setSelectedMenus((prev) => Array.from(new Set([...prev, ...toAdd])));
                            } else {
                              const toRemove = filteredAndCategorizedMenus.list.map((m) => m.id);
                              setSelectedMenus((prev) => prev.filter((id) => !toRemove.includes(id)));
                            }
                          }}
                          className="w-4 h-4 accent-orange-500 border-slate-300 bg-white cursor-pointer rounded mx-auto"
                        />
                      </th>
                      <th className="px-6 py-3.5 text-[10px] font-black uppercase text-slate-500">Conteúdo / Prato</th>
                      <th className="px-6 py-3.5 text-[10px] font-black uppercase text-slate-500">Chef</th>
                      <th className="px-6 py-3.5 text-[10px] font-black uppercase text-slate-500">Tipo</th>
                      <th className="px-6 py-3.5 text-[10px] font-black uppercase text-slate-500">Categorias / Tags</th>
                      <th className="px-6 py-3.5 text-[10px] font-black uppercase text-slate-500">Preço</th>
                      <th className="px-6 py-3.5 text-[10px] font-black uppercase text-slate-500">Estado</th>
                      <th className="px-6 py-3.5 text-right text-[10px] font-black uppercase text-slate-500 w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAndCategorizedMenus.list.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-24 text-center text-slate-400 italic font-mono text-xs">
                          Nenhum prato corresponde aos critérios de revisão de dados.
                        </td>
                      </tr>
                    ) : (
                      filteredAndCategorizedMenus.list
                        .slice((menusPage - 1) * 25, menusPage * 25)
                        .map((menu) => {
                          const isChecked = selectedMenus.includes(menu.id);
                          const isExpanded = expandedMenuIds.includes(menu.id);
                          const cookId = menu.cookId || menu.cook_id;
                          const chefName = users.find((u) => u.id === cookId)?.nome || "Chef Desconhecido";

                          return (
                            <React.Fragment key={menu.id}>
                              <tr
                                className={`hover:bg-slate-50/40 transition-colors ${
                                  isChecked ? "bg-orange-50/15" : ""
                                } ${isExpanded ? "bg-slate-50/20" : ""}`}
                              >
                                {/* Selection Checkbox */}
                                <td className="px-5 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setSelectedMenus((prev) =>
                                        prev.includes(menu.id)
                                          ? prev.filter((id) => id !== menu.id)
                                          : [...prev, menu.id]
                                      );
                                    }}
                                    className="w-4 h-4 accent-orange-500 border-slate-300 bg-white cursor-pointer rounded mx-auto"
                                  />
                                </td>

                                {/* Main Prato info with cover pic */}
                                <td className="px-6 py-3">
                                  <div className="flex items-center gap-3">
                                    {menu.imageUrl ? (
                                      <img
                                        src={menu.imageUrl}
                                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-none"
                                        alt=""
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-none">
                                        <ICONS.Utensils size={16} />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-800 text-xs truncate max-w-[200px]" title={menu.nome}>
                                        {menu.nome}
                                      </p>
                                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                        #{menu.id.slice(0, 8)}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                {/* Chef name */}
                                <td className="px-6 py-3 text-xs text-slate-700 font-bold">
                                  {chefName}
                                </td>

                                {/* Dish style type */}
                                <td className="px-6 py-3">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider inline-block ${
                                    menu.type === "experience" 
                                      ? "bg-indigo-50 text-indigo-700 border border-indigo-150" 
                                      : "bg-teal-50 text-teal-700 border border-teal-150"
                                  }`}>
                                    {menu.type}
                                  </span>
                                </td>

                                {/* Tags category preview */}
                                <td className="px-6 py-3">
                                  <div className="flex flex-wrap gap-1 max-w-[220px]">
                                    {menu.cuisine_type && (
                                      <span className="px-1.5 py-0.5 bg-orange-50 border border-orange-100 rounded text-[8px] text-orange-700 font-bold uppercase">
                                        {menu.cuisine_type}
                                      </span>
                                    )}
                                    {menu.tags && menu.tags.slice(0, 2).map((tag) => (
                                      <span
                                        key={tag}
                                        className="px-1.5 py-0.5 bg-slate-100 border border-slate-200/50 rounded text-[7px] text-slate-600 uppercase font-bold"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                    {menu.tags && menu.tags.length > 2 && (
                                      <span className="text-[8px] font-mono text-slate-400 self-center">
                                        +{menu.tags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Price label */}
                                <td className="px-6 py-3 text-xs font-mono font-bold text-slate-800">
                                  {formatPrice(menu.preco)}
                                </td>

                                {/* Active status badge representation */}
                                <td className="px-6 py-3">
                                  {menu.isAvailable === true ? (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded text-[8px] font-bold uppercase inline-block">
                                      ATIVO
                                    </span>
                                  ) : menu.isAvailable === false && (menu.adminNotes || menu.admin_notes) ? (
                                    <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-150 rounded text-[8px] font-bold uppercase inline-block">
                                      REJEITADO
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-750 border border-amber-150 rounded text-[8px] font-bold uppercase inline-block animate-pulse">
                                      REVISÃO
                                    </span>
                                  )}
                                </td>

                                {/* Action item trigger drawer */}
                                <td className="px-6 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setExpandedMenuIds((prev) =>
                                          prev.includes(menu.id)
                                            ? prev.filter((id) => id !== menu.id)
                                            : [...prev, menu.id]
                                        );
                                      }}
                                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-all cursor-pointer"
                                      title="Expandir Detalhes & Moderação"
                                    >
                                      <div className={`transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                                        <ICONS.ChevronDown size={16} />
                                      </div>
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Collapsible details / moderation drawer block */}
                              {isExpanded && (
                                <tr className="bg-slate-50/50">
                                  <td colSpan={8} className="p-5 border-y border-dashed border-slate-200 shadow-inner">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                      {/* Description and full tags */}
                                      <div className="md:col-span-7 space-y-4">
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Descrição Completa do Prato</span>
                                          <p className="text-xs text-slate-700 mt-1.5 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-150 font-bold">
                                            {menu.descricao || "Sem descrição disponível."}
                                          </p>
                                        </div>

                                        {menu.tags && menu.tags.length > 0 && (
                                          <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider mb-2">Todas as Etiquetas de Alergénios e Características</span>
                                            <div className="flex flex-wrap gap-1.5">
                                              {menu.tags.map((tag) => (
                                                <span
                                                  key={tag}
                                                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[9px] text-slate-700 uppercase font-black"
                                                >
                                                  {tag}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Moderation Controls Input/Action buttons */}
                                      <div className="md:col-span-5 space-y-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                        <div>
                                          <label className="text-[10px] font-black uppercase text-slate-500 block tracking-wider mb-2">
                                            Feedback de Rejeição (Escrever caso rejeite o prato)
                                          </label>
                                          <input
                                            type="text"
                                            placeholder="Ex: imagem desfocada, ou prato sem conformidade..."
                                            value={menuFeedback[menu.id] || ""}
                                            onChange={(e) => setMenuFeedback({ ...menuFeedback, [menu.id]: e.target.value })}
                                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all font-bold"
                                          />
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                          <button
                                            onClick={() => handleModerateMenu(menu, "live")}
                                            className="py-2 px-1 bg-emerald-50 hover:bg-emerald-500 border border-emerald-150 hover:border-emerald-500 text-emerald-700 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer text-center"
                                          >
                                            Aprovar
                                          </button>
                                          <button
                                            onClick={() => handleModerateMenu(menu, "rejected")}
                                            className="py-2 px-1 bg-red-50 hover:bg-red-500 border border-red-150 hover:border-red-500 text-red-700 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer text-center"
                                          >
                                            Rejeitar
                                          </button>
                                          <button
                                            onClick={() => handleModerateMenu(menu, "boosted")}
                                            className={`py-2 px-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center justify-center border ${
                                              menu.is_meal_prep
                                                ? "bg-orange-500 text-white border-orange-500 hover:bg-orange-600"
                                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                                            }`}
                                            title="Destacar no Carrossel da Página Inicial"
                                          >
                                            Destaque
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Data Table Pagination */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-500">
                <div>
                  A exibir{" "}
                  <span className="font-bold text-slate-700">
                    {filteredAndCategorizedMenus.list.length === 0 ? 0 : (menusPage - 1) * 25 + 1}
                  </span>
                  -
                  <span className="font-bold text-slate-700">
                    {Math.min(menusPage * 25, filteredAndCategorizedMenus.list.length)}
                  </span>{" "}
                  de <span className="font-bold text-slate-700">{filteredAndCategorizedMenus.list.length}</span> pratos
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMenusPage((p) => Math.max(1, p - 1))}
                    disabled={menusPage === 1}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 rounded-lg shadow-sm flex items-center gap-1.5 transition-all text-[11px] uppercase font-black"
                  >
                    <ICONS.ChevronLeft size={14} /> Anterior
                  </button>
                  <div className="text-slate-400 px-1 font-mono text-[11px]">
                    {menusPage} / {Math.ceil(filteredAndCategorizedMenus.list.length / 25) || 1}
                  </div>
                  <button
                    onClick={() => setMenusPage((p) => Math.min(Math.ceil(filteredAndCategorizedMenus.list.length / 25) || 1, p + 1))}
                    disabled={menusPage >= (Math.ceil(filteredAndCategorizedMenus.list.length / 25) || 1)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 rounded-lg shadow-sm flex items-center gap-1.5 transition-all text-[11px] uppercase font-black"
                  >
                    Seguinte <ICONS.ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3.5: MODERAÇÃO DE AVALIAÇÕES (REVIEWS) */}
        {/* ---------------------------------------------------- */}
        {activeTab === "reviews" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Header and description */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
              <div>
                <h2 className="text-xl font-black italic uppercase text-orange-500 tracking-tight">
                  Moderação de Conteúdo & Avaliações
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Valide denúncias, verifique a conduta dos utilizadores e garanta a integridade, qualidade e segurança das avaliações na plataforma.
                </p>
              </div>

              {/* Filtering tabs */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-start sm:self-center shrink-0">
                {[
                  { id: "flagged", label: "Denunciadas", count: allReviews.filter((r) => r.isFlagged).length, icon: ICONS.AlertTriangle },
                  { id: "all", label: "Todas", count: allReviews.filter((r) => !r.isHidden).length, icon: ICONS.Star },
                  { id: "hidden", label: "Ocultadas", count: allReviews.filter((r) => r.isHidden).length, icon: ICONS.EyeOff },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setReviewFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      reviewFilter === f.id
                        ? "bg-white text-orange-600 shadow-xs font-black border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <f.icon size={12} />
                    <span>{f.label}</span>
                    <span className="px-1.5 py-0.5 bg-slate-200/70 text-slate-700 text-[8px] font-mono font-bold rounded">
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                  <ICONS.AlertTriangle size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Aguardar Moderação</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block leading-none font-mono">
                    {allReviews.filter((r) => r.isFlagged).length}
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                  <ICONS.CheckCircle size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Avaliações Ativas</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block leading-none font-mono">
                    {allReviews.filter((r) => !r.isHidden).length}
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <ICONS.EyeOff size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Avaliações Ocultadas</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block leading-none font-mono">
                    {allReviews.filter((r) => r.isHidden).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Reviews list representation */}
            <div className="bg-white rounded-[2rem] border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 font-black">
                      <th className="px-6 py-3.5 text-[10px] font-black uppercase text-slate-500">Autor / Utilizador</th>
                      <th className="px-6 py-3.5 text-[10px] font-black uppercase text-slate-500">Chef Alvo</th>
                      <th className="px-6 py-3.5 text-[10px] font-black uppercase text-slate-500">Pontuação</th>
                      <th className="px-6 py-3.5 text-[10px] font-black uppercase text-slate-500">Comentário</th>
                      <th className="px-6 py-3.5 text-[10px] font-black uppercase text-slate-500">Denúncia / Alerta</th>
                      <th className="px-6 py-3.5 text-right text-[10px] font-black uppercase text-slate-500 w-44">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const list = allReviews.filter((r) => {
                        if (reviewFilter === "flagged") return r.isFlagged;
                        if (reviewFilter === "hidden") return r.isHidden;
                        return !r.isHidden;
                      });

                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="py-20 text-center text-slate-400 italic font-mono text-xs">
                              Nenhuma avaliação encontrada nesta categoria.
                            </td>
                          </tr>
                        );
                      }

                      return list.map((rev) => {
                        const targetChef = users.find((u) => u.id === rev.cookId)?.nome || "Chef Desconhecido";
                        return (
                          <tr key={rev.id} className="hover:bg-slate-50/40 transition-colors">
                            {/* Author */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                                  {rev.clientName ? rev.clientName.charAt(0).toUpperCase() : "C"}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 text-xs uppercase leading-tight">
                                    {rev.clientName || "Cliente"}
                                  </p>
                                  <span className="text-[8px] font-mono text-slate-400 block mt-0.5">
                                    #{rev.id.slice(0, 8)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Target Chef */}
                            <td className="px-6 py-4 text-xs font-bold text-slate-700">
                              {targetChef}
                            </td>

                            {/* Stars */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-0.5 text-amber-500">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <ICONS.Star
                                    key={i}
                                    size={10}
                                    fill={i < rev.rating ? "currentColor" : "none"}
                                    className={i < rev.rating ? "text-amber-500" : "text-slate-200"}
                                  />
                                ))}
                                <span className="text-[10px] font-black text-slate-700 ml-1.5 font-mono">
                                  {rev.rating.toFixed(1)}
                                </span>
                              </div>
                            </td>

                            {/* Comment */}
                            <td className="px-6 py-4 max-w-xs text-left">
                              <p className="text-xs text-slate-600 font-medium italic truncate" title={rev.comment}>
                                "{rev.comment}"
                              </p>
                            </td>

                            {/* Flags / Alert */}
                            <td className="px-6 py-4 text-left">
                              {rev.isFlagged ? (
                                <div className="flex flex-col gap-1 items-start">
                                  <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-150 rounded text-[8px] font-bold uppercase inline-block">
                                    DENUNCIADA
                                  </span>
                                  {rev.flaggedReason && (
                                    <span className="text-[9px] text-red-500 font-semibold italic max-w-[200px] truncate" title={rev.flaggedReason}>
                                      "{rev.flaggedReason}"
                                    </span>
                                  )}
                                </div>
                              ) : rev.isHidden ? (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[8px] font-bold uppercase inline-block">
                                  OCULTADA
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded text-[8px] font-bold uppercase inline-block">
                                  APROVADA / ATIVA
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {rev.isFlagged && (
                                  <button
                                    onClick={() => handleApproveReview(rev.id)}
                                    disabled={isActionPending === rev.id}
                                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-500 border border-emerald-200 hover:border-emerald-500 text-emerald-700 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                    title="Manter avaliação ativa e remover denúncia"
                                  >
                                    {isActionPending === rev.id ? (
                                      <ICONS.Clock size={10} className="animate-spin" />
                                    ) : (
                                      <ICONS.Check size={10} />
                                    )}
                                    Aprovar
                                  </button>
                                )}
                                {!rev.isHidden && (
                                  <button
                                    onClick={() => handleHideReview(rev.id)}
                                    disabled={isActionPending === rev.id}
                                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-500 border border-red-200 hover:border-red-500 text-red-700 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                    title="Ocultar avaliação da visualização pública"
                                  >
                                    {isActionPending === rev.id ? (
                                      <ICONS.Clock size={10} className="animate-spin" />
                                    ) : (
                                      <ICONS.EyeOff size={10} />
                                    )}
                                    Ocultar
                                  </button>
                                )}
                                {rev.isHidden && (
                                  <button
                                    onClick={() => handleApproveReview(rev.id)}
                                    disabled={isActionPending === rev.id}
                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-700 border border-slate-200 hover:border-slate-700 text-slate-600 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                    title="Restaurar avaliação ocultada"
                                  >
                                    {isActionPending === rev.id ? (
                                      <ICONS.Clock size={10} className="animate-spin" />
                                    ) : (
                                      <ICONS.Eye size={10} />
                                    )}
                                    Restaurar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: REAL-TIME OPERATIONS KANBAN & PIPELINE */}
        {/* ---------------------------------------------------- */}
        {activeTab === "bookings" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black italic uppercase text-orange-500 tracking-tight">
                  Logística Reservas & Kanban Pipeline
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Acompanhe o percurso operacional da preparação até a conclusão. Mude estados ou gerencie contratempos críticos.
                </p>
              </div>

              {/* Real-time filtering input bar and Export CSV */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <ICONS.Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Filtrar por Cliente ou Chef..."
                    value={bookingSearchText}
                    onChange={(e) => setBookingSearchText(e.target.value)}
                    className="w-full h-10 pl-9 pr-8 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/10 transition-all font-bold shadow-xs"
                  />
                  {bookingSearchText && (
                    <button
                      onClick={() => setBookingSearchText("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <ICONS.X size={14} />
                    </button>
                  )}
                </div>
                <button
                  onClick={handleExportBookingsCSV}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 h-10 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
                  title="Exportar reservas em ficheiro CSV"
                >
                  <ICONS.FileText size={14} />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            {/* Split pipelines Kanban columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Pendente / Orçamento", statuses: [BookingStatus.PENDING, BookingStatus.QUOTE_REQUESTED] },
                { title: "Aceita / Agendada", statuses: [BookingStatus.ACCEPTED, BookingStatus.RESCHEDULE_REQUESTED] },
                { title: "Execução / Concluída", statuses: [BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED] },
                { title: "Cancelada / Disputada", statuses: [BookingStatus.CANCELLED, BookingStatus.CANCELLED_PARTIAL_REFUND, BookingStatus.REJECTED] },
              ].map((column, colIdx) => {
                const columnBookings = filteredBookings.filter((b) => column.statuses.includes(b.status));
                return (
                  <div key={colIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border-b border-slate-100 shadow-sm">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">{column.title}</span>
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-mono rounded font-bold">
                        {columnBookings.length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1 flex-1 custom-scrollbar">
                      {columnBookings.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-[10px] italic">Sem reservas nesta fase.</div>
                      ) : (
                        columnBookings.map((b) => (
                          <div
                            key={b.id}
                            className="p-4 bg-white border border-slate-200 hover:border-orange-500/50 rounded-xl shadow-sm hover:shadow transition-all space-y-3 relative group"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[9px] font-mono text-slate-400 font-bold">#{b.id.slice(0, 8)}</span>
                              <span
                                className={`px-1.5 py-0.5 text-[6px] font-black uppercase rounded tracking-widest border ${
                                  b.status === BookingStatus.COMPLETED
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : b.status === BookingStatus.CANCELLED
                                    ? "bg-red-50 text-red-700 border-red-100"
                                    : "bg-amber-50 text-amber-700 border-amber-100"
                                }`}
                              >
                                {b.status}
                              </span>
                            </div>

                            <div>
                              <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">
                                {b.menu_selected}
                              </p>
                              <p className="text-[9px] text-slate-500 mt-1">
                                {b.clientName} → {b.cookName}
                              </p>
                              <p className="text-[9px] text-orange-600 font-bold mt-1 font-mono">
                                Data: {b.data} {b.hora ? `às ${b.hora}` : ""}
                              </p>
                            </div>

                            {/* Service Pin details if accepted */}
                            {b.service_pin && (
                              <div className="p-1 px-2 bg-indigo-50 text-indigo-700 text-[8px] font-mono rounded border border-indigo-100 block shrink-0">
                                PIN: {b.service_pin}
                              </div>
                            )}

                            {/* Direct Action Transitions */}
                            <div className="border-t border-slate-100 pt-2 flex flex-col gap-1.5">
                              <div className="flex justify-between gap-1.5">
                                <button
                                  onClick={() => handleUpdateBookingStatusAdmin(b.id, BookingStatus.ACCEPTED)}
                                  className="relative flex-1 py-1 bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white text-[8px] uppercase font-bold rounded border border-emerald-100 tracking-wider transition-all before:absolute before:inset-y-[-8px] before:inset-x-0 before:sm:hidden before:content-['']"
                                >
                                  Aceitar
                                </button>
                                <button
                                  onClick={() => handleUpdateBookingStatusAdmin(b.id, BookingStatus.COMPLETED)}
                                  className="relative flex-1 py-1 bg-indigo-50 hover:bg-indigo-500 text-indigo-700 hover:text-white text-[8px] uppercase font-bold rounded border border-indigo-100 tracking-wider transition-all before:absolute before:inset-y-[-8px] before:inset-x-0 before:sm:hidden before:content-['']"
                                >
                                  Concluir
                                </button>
                              </div>

                              <button
                                onClick={() => setSelectedBookingForDispute(b)}
                                className="relative w-full py-1 bg-slate-50 hover:bg-orange-500 hover:text-white text-slate-600 border border-slate-200 text-[8px] uppercase font-bold rounded transition-all before:absolute before:inset-y-[-8px] before:inset-x-0 before:sm:hidden before:content-['']"
                              >
                                Centro de Disputas & Reagendar
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* EXPANDED DISPUTE INTERVENTION MODAL CONTROL PANEL */}
            {selectedBookingForDispute && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-6 text-slate-800">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black uppercase text-orange-500 italic">Resolução de Disputa e Operações</h3>
                    <button
                      onClick={() => setSelectedBookingForDispute(null)}
                      className="relative p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 before:absolute before:-inset-2 before:sm:-inset-0 before:content-['']"
                    >
                      <ICONS.X size={16} />
                    </button>
                  </div>

                  <div className="space-y-2 text-[11px] font-mono bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p><span className="text-slate-400">Reserva ID:</span> {selectedBookingForDispute.id}</p>
                    <p><span className="text-slate-400">Prato:</span> {selectedBookingForDispute.menu_selected}</p>
                    <p><span className="text-slate-400">Cliente:</span> {selectedBookingForDispute.clientName}</p>
                    <p><span className="text-slate-400">Chef:</span> {selectedBookingForDispute.cookName}</p>
                    <p><span className="text-slate-400">Valor Pago:</span> <span className="text-emerald-600 font-bold">{formatPrice(selectedBookingForDispute.valorTotal)}</span></p>
                    <p><span className="text-slate-400">Estado Atual:</span> <span className="text-orange-600">{selectedBookingForDispute.status}</span></p>
                  </div>

                  {/* Immediate Operational Tools */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        handleUpdateBookingStatusAdmin(selectedBookingForDispute.id, BookingStatus.CANCELLED);
                        setSelectedBookingForDispute(null);
                      }}
                      className="relative py-3 px-4 bg-red-50 text-red-700 hover:bg-red-500 hover:text-white text-xs font-extrabold uppercase tracking-widest rounded-xl border border-red-200 transition-all shadow-sm before:absolute before:inset-y-[-8px] before:inset-x-0 before:sm:hidden before:content-['']"
                    >
                      Forçar Cancelamento Reembolso
                    </button>
                    <button
                      onClick={() => {
                        handleUpdateBookingStatusAdmin(selectedBookingForDispute.id, BookingStatus.COMPLETED);
                        setSelectedBookingForDispute(null);
                      }}
                      className="relative py-3 px-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white text-xs font-extrabold uppercase tracking-widest rounded-xl border border-emerald-200 transition-all shadow-sm before:absolute before:inset-y-[-8px] before:inset-x-0 before:sm:hidden before:content-['']"
                    >
                      Forçar Confirmação Faturação
                    </button>
                  </div>

                  {/* Operational Reschedule form in dispute */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3 text-left">
                    <span className="text-[10px] font-black uppercase text-slate-600 block">Alterar Agendamento</span>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none text-center"
                      />
                      <input
                        type="time"
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none text-center"
                      />
                    </div>
                    <button
                      onClick={() => {
                        handleRescheduleBooking(selectedBookingForDispute.id);
                        setSelectedBookingForDispute(null);
                      }}
                      className="relative w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase text-xs rounded-xl shadow-md transition-all active:scale-97 before:absolute before:inset-y-[-8px] before:inset-x-0 before:sm:hidden before:content-['']"
                    >
                      Confirmar Reagendamento
                    </button>
                  </div>

                  {/* Operational Chat audit history block */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3 text-left">
                    <span className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1.5">
                      <ICONS.MessageSquare size={14} /> Auditoria de Chat Interno
                    </span>
                    <p className="text-[9px] text-slate-500 leading-relaxed font-sans">
                      Histórico confidencial das conversas trocadas entre o cliente e o chef sobre esta reserva.
                    </p>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 max-h-[160px] overflow-y-auto space-y-2.5 custom-scrollbar text-[10px]">
                      {isLoadingDisputeMessages ? (
                        <p className="text-center text-slate-400 italic font-sans block py-4 animate-pulse">A carregar registo do chat...</p>
                      ) : disputeMessages.length === 0 ? (
                        <p className="text-center text-slate-400 block py-4 italic font-sans animate-pulse">Sem mensagens trocadas entre estes perfis.</p>
                      ) : (
                        disputeMessages.map((m) => {
                          const isCookSender = m.sender_id === selectedBookingForDispute.cookId;
                          return (
                            <div key={m.id} className="space-y-0.5">
                              <span className={`font-black text-[9px] uppercase tracking-wider block ${isCookSender ? 'text-amber-600' : 'text-slate-655'}`}>
                                {isCookSender ? `Chef (${selectedBookingForDispute.cookName})` : `Cliente (${selectedBookingForDispute.clientName})`}:
                              </span>
                              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 leading-relaxed word-break whitespace-pre-wrap font-sans">
                                {m.content}
                              </div>
                              <span className="text-[8px] text-slate-400 block font-mono text-right shrink-0">
                                {new Date(m.created_at).toLocaleString()}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedBookingForDispute(null)}
                    className="relative w-full py-3 bg-slate-950 hover:bg-orange-500 text-white rounded-xl font-extrabold text-xs uppercase tracking-widest transition-all active:scale-97 shadow-md before:absolute before:inset-y-[-8px] before:inset-x-0 before:sm:hidden before:content-[''] border border-white/5"
                  >
                    Fechar Painel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB: SUPORTE DIRECTO & INTERCEPTADOR DE CHATS */}
        {/* ---------------------------------------------------- */}
        {activeTab === "support" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in duration-200">
            {/* LEFT COLUMN: DIRECT SUPPORT CHAT PANEL (8 cols) */}
            <div className="xl:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col h-[650px] shadow-sm text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-black uppercase text-orange-600 flex items-center gap-2">
                    <ICONS.MessageSquare size={16} /> Chat de Suporte Direto
                  </h3>
                  <p className="text-[10px] text-slate-400">Canal direto de mediação e apoio com utilizadores em tempo real</p>
                </div>
                {/* Initiate Chat Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">Novo Chat:</span>
                  <select
                    onChange={(e) => {
                      const uId = e.target.value;
                      if (!uId) return;
                      const targetUser = users.find((u) => u.id === uId);
                      if (targetUser) setSelectedSupportUser(targetUser);
                      e.target.value = "";
                    }}
                    className="p-1 px-2 bg-slate-50 border border-slate-200 text-[10px] rounded font-bold text-slate-700 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Escolher Utilizador --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        [{u.role.toUpperCase()}] {u.nome} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Support Content Split Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
                {/* Conversas Ativas List */}
                <div className="md:col-span-1 border-r border-slate-100 pr-4 overflow-y-auto space-y-2 custom-scrollbar">
                  <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest mb-1">Conversas Ativas</span>
                  {isLoadingSupportConversations ? (
                    <div className="text-center py-6 text-slate-400 text-[10px] animate-pulse italic">A carregar conversas...</div>
                  ) : supportConversations.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-[10px] italic">Sem conversas de suporte ativas. Selecione um utilizador para iniciar.</div>
                  ) : (
                    supportConversations.map((conv) => {
                      const u = users.find((usr) => usr.id === conv.partnerId);
                      const isSelected = selectedSupportUser?.id === conv.partnerId;
                      return (
                        <button
                          key={conv.partnerId}
                          onClick={() => setSelectedSupportUser(u || { id: conv.partnerId, nome: "Utilizador Desconhecido", email: "", role: UserRole.CLIENT, status: UserStatus.ACTIVE })}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all relative flex flex-col gap-1 ${
                            isSelected
                              ? "bg-orange-50 border-orange-200 text-orange-950 shadow-xs"
                              : "bg-slate-50 border-slate-150 hover:bg-slate-100/60 text-slate-700"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-[10px] truncate max-w-[100px]">
                              {u?.nome || "Desconhecido"}
                            </span>
                            <span className="text-[7px] font-mono uppercase px-1.5 py-0.2 bg-slate-200/80 text-slate-600 rounded">
                              {u?.role || "user"}
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-400 truncate leading-snug">
                            {conv.lastMessage}
                          </p>
                          <div className="flex justify-between items-center text-[7px] text-slate-400 font-mono mt-1">
                            <span>{new Date(conv.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {conv.unread && (
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Active Chat Feed */}
                <div className="md:col-span-2 flex flex-col h-full min-h-0 justify-between">
                  {selectedSupportUser ? (
                    <>
                      {/* Active Partner Info */}
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center font-black text-orange-600 text-xs">
                            {selectedSupportUser.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-extrabold text-[11px] text-slate-800 block">{selectedSupportUser.nome}</span>
                            <span className="text-[8px] font-mono text-slate-400 block">{selectedSupportUser.email} · Status: {selectedSupportUser.status}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedSupportUser(null)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
                        >
                          <ICONS.X size={14} />
                        </button>
                      </div>

                      {/* Chat Messages Log */}
                      <div className="flex-1 overflow-y-auto space-y-3 p-2 border border-slate-100 rounded-2xl bg-slate-50/50 mb-3 custom-scrollbar">
                        {isLoadingSupportMessages ? (
                          <div className="text-center py-10 text-slate-400 text-[10px] animate-pulse italic">A carregar histórico do chat...</div>
                        ) : supportMessages.length === 0 ? (
                          <div className="text-center py-12 text-slate-400 text-[10px] italic">Inicie a conversa enviando uma mensagem abaixo.</div>
                        ) : (
                          supportMessages.map((m, idx) => {
                            const isMe = m.sender_id === "admin-support" || m.sender_id === ADMIN_SUPPORT_UUID;
                            return (
                              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-2.5 rounded-xl text-left ${
                                  isMe
                                    ? "bg-slate-900 text-white rounded-tr-none shadow-xs"
                                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs"
                                }`}>
                                  <span className="text-[7px] font-black uppercase tracking-wider block opacity-40 mb-0.5">
                                    {isMe ? "Admin Suporte" : selectedSupportUser.nome}
                                  </span>
                                  <p className="text-[10px] leading-relaxed break-words font-sans">{m.content}</p>
                                  <span className="text-[6px] font-mono block text-right mt-1 opacity-50">
                                    {new Date(m.created_at).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Messaging input block */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSupportMessageText}
                          onChange={(e) => setNewSupportMessageText(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleSendSupportMessage()}
                          placeholder={`Responder a ${selectedSupportUser.nome}...`}
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-orange-500 font-sans"
                        />
                        <button
                          onClick={handleSendSupportMessage}
                          className="p-2 px-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95 flex items-center justify-center shrink-0"
                        >
                          <ICONS.Send size={12} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                      <ICONS.MessageSquare className="text-slate-300 mb-2" size={32} />
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Nenhum chat selecionado</p>
                      <p className="text-[9px] text-slate-400 max-w-[220px] mt-1">Selecione uma conversa ativa na barra lateral ou escolha um utilizador no menu superior.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: ACTIVE SYSTEM CHAT AUDIT / INTERCEPTOR (5 cols) */}
            <div className="xl:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col h-[650px] shadow-sm text-left">
              <div className="border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-sm font-black uppercase text-indigo-600 flex items-center gap-2">
                  <ICONS.Eye size={16} /> Interceptador de Chats Ativos
                </h3>
                <p className="text-[10px] text-slate-400">Pesquise por qualquer reserva ativa ou disputa para analisar a conversa</p>
              </div>

              {/* Filter search box for interceptor */}
              <div className="mb-3 relative">
                <ICONS.Search className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
                <input
                  type="text"
                  placeholder="Filtrar por nome de Cliente ou Chef..."
                  value={interceptSearchText}
                  onChange={(e) => setInterceptSearchText(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 flex-1 min-h-0 overflow-hidden">
                {/* Bookings/Chats listing */}
                <div className="max-h-[220px] overflow-y-auto space-y-2 border-b border-slate-100 pb-3 custom-scrollbar font-sans">
                  <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest mb-1">Listagem de Rituais / Reservas</span>
                  {bookings.filter((b) => {
                    const searchLower = interceptSearchText.toLowerCase();
                    return (
                      b.clientName.toLowerCase().includes(searchLower) ||
                      b.cookName.toLowerCase().includes(searchLower) ||
                      b.menu_selected.toLowerCase().includes(searchLower)
                    );
                  }).length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-[10px] italic">Nenhuma reserva encontrada.</div>
                  ) : (
                    bookings
                      .filter((b) => {
                        const searchLower = interceptSearchText.toLowerCase();
                        return (
                          b.clientName.toLowerCase().includes(searchLower) ||
                          b.cookName.toLowerCase().includes(searchLower) ||
                          b.menu_selected.toLowerCase().includes(searchLower)
                        );
                      })
                      .map((b) => {
                        const isSelected = selectedInterceptBooking?.id === b.id;
                        const isDispute = b.status === BookingStatus.RESCHEDULE_REQUESTED || b.status === BookingStatus.CANCELLED;
                        return (
                          <button
                            key={b.id}
                            onClick={() => setSelectedInterceptBooking(b)}
                            className={`w-full p-2 rounded-lg border text-left transition-all flex justify-between items-center ${
                              isSelected
                                ? "bg-indigo-50 border-indigo-200 text-indigo-950"
                                : "bg-slate-50 border-slate-150 hover:bg-slate-100/60 text-slate-700"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[9px] truncate max-w-[120px]">{b.menu_selected}</span>
                                {isDispute && (
                                  <span className="px-1 py-0.2 bg-orange-100 text-orange-700 border border-orange-150 rounded text-[6px] font-bold uppercase">Disputa</span>
                                )}
                              </div>
                              <p className="text-[8px] text-slate-400">{b.clientName} → {b.cookName}</p>
                            </div>
                            <span className="text-[8px] font-mono text-indigo-600 font-bold">{formatPrice(b.valorTotal)}</span>
                          </button>
                        );
                      })
                  )}
                </div>

                {/* Audit view console */}
                <div className="flex-1 flex flex-col min-h-0">
                  {selectedInterceptBooking ? (
                    <div className="flex-1 flex flex-col min-h-0 justify-between">
                      {/* Active booking intercept details header */}
                      <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[9px] rounded-xl space-y-1 relative mb-2">
                        <p><span className="text-slate-500">RESERVA ID:</span> {selectedInterceptBooking.id}</p>
                        <p><span className="text-slate-500">CLIENTE:</span> {selectedInterceptBooking.clientName} <span className="text-slate-500">| CHEF:</span> {selectedInterceptBooking.cookName}</p>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                          <p><span className="text-slate-500">ESTADO:</span> <span className="text-orange-400 uppercase font-black">{selectedInterceptBooking.status}</span></p>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                const cli = users.find((u) => u.id === selectedInterceptBooking.clientId);
                                if (cli) setSelectedSupportUser(cli);
                              }}
                              className="px-1.5 py-0.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-[8px] font-bold uppercase"
                              title="Iniciar suporte direto com o Cliente"
                            >
                              Suporte Cliente
                            </button>
                            <button
                              onClick={() => {
                                const ck = users.find((u) => u.id === selectedInterceptBooking.cookId);
                                if (ck) setSelectedSupportUser(ck);
                              }}
                              className="px-1.5 py-0.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-[8px] font-bold uppercase"
                              title="Iniciar suporte direto com o Chef"
                            >
                              Suporte Chef
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Intercept messages logger */}
                      <div className="flex-1 overflow-y-auto space-y-2.5 bg-slate-50 border border-slate-200 rounded-xl p-2.5 custom-scrollbar text-[9px]">
                        {isLoadingInterceptMessages ? (
                          <div className="text-center py-8 text-slate-400 animate-pulse italic">A escutar base de dados...</div>
                        ) : interceptMessages.length === 0 ? (
                          <div className="text-center py-10 text-slate-400 italic">Nenhuma mensagem trocada entre estes utilizadores para esta reserva.</div>
                        ) : (
                          interceptMessages.map((m, idx) => {
                            const isCookSender = m.sender_id === selectedInterceptBooking.cookId;
                            return (
                              <div key={idx} className="space-y-0.5 border-b border-slate-100/60 pb-1.5 text-left">
                                <span className={`font-black text-[8px] uppercase tracking-wider block ${isCookSender ? 'text-amber-600' : 'text-slate-650'}`}>
                                  {isCookSender ? `Chef (${selectedInterceptBooking.cookName})` : `Cliente (${selectedInterceptBooking.clientName})`}:
                                </span>
                                <p className="text-[10px] text-slate-700 font-sans leading-relaxed block py-0.5">{m.content}</p>
                                <span className="text-[7px] text-slate-400 block text-right font-mono shrink-0">
                                  {new Date(m.created_at).toLocaleString()}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                      <ICONS.Eye className="text-slate-300 mb-2" size={32} />
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Análise de Chat em Tempo Real</p>
                      <p className="text-[9px] text-slate-400 max-w-[220px] mt-1">Selecione uma reserva ou rito culinário acima para ler instantaneamente a auditoria confidencial do chat.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 5: GLOBAL BROADCAST FORUMS */}
        {/* ---------------------------------------------------- */}
        {activeTab === "community" && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-6 duration-200 py-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-orange-50 border border-orange-200 text-orange-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <ICONS.Megaphone size={28} />
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800 font-sans">Broadcast Global Bulletins</h2>
              <p className="text-xs text-slate-500">
                Dispara notificações push/chat instantâneas que aparecem na conta de todos os utilizadores (Chefs e Clientes).
              </p>
            </div>

            <div className="bg-white p-8 border border-slate-200 rounded-3xl space-y-4 text-left shadow-sm">
              <label className="text-[9px] font-black uppercase tracking-widest text-[#FF6B00]">Mensagem a Transmitir</label>
              <textarea
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                rows={5}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 resize-none font-medium"
                placeholder="Exemplo: Bem-vindos à nova atualização do ecossistema Cookr! Temos novas regras HACCP para a curadoria..."
              />
              <button
                disabled={isActionPending === "broadcast" || !broadcastMsg.trim()}
                onClick={handleBroadcast}
                className="relative w-full h-10 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold uppercase tracking-wider text-xs rounded-lg transition-all before:absolute before:inset-y-[-4px] before:inset-x-0 before:sm:hidden before:content-['']"
              >
                {isActionPending === "broadcast" ? "A Enviar Broadcast..." : "Transmitir Notificação"}
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 6: FINANCIAL */}
        {/* ---------------------------------------------------- */}
        {activeTab === "financial" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Split statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Completed Extrato lists */}
              <div className="bg-white border border-slate-200 p-8 rounded-3xl text-left space-y-6 shadow-sm">
                <h3 className="text-lg font-black uppercase italic text-orange-500 tracking-tight">Extrato das Últimas Reservas</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {bookings
                    .filter((b) => b.status === BookingStatus.COMPLETED || b.status === BookingStatus.ACCEPTED)
                    .map((item) => (
                      <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-150 flex flex-col sm:flex-row justify-between sm:items-center gap-2 shadow-sm">
                        <div>
                          <p className="text-xs font-black uppercase text-slate-800">{item.menu_selected}</p>
                          <p className="text-[10px] text-slate-550 mt-0.5">{item.data} • {item.clientName}</p>
                        </div>
                        <div className="text-right font-mono">
                          <p className="text-xs font-black text-slate-700">{formatPrice(item.valorTotal)}</p>
                          <p className="text-[8px] font-bold text-orange-600 uppercase tracking-wide">
                            Taxa: {formatPrice(parseFloat(item.valorTotal as string) * (settings.commission_rate || COMMISSION_RATE))}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Financial growth mock metrics */}
              <div className="bg-white border border-slate-200 p-8 rounded-3xl text-left space-y-6 shadow-sm">
                <h3 className="text-lg font-black uppercase italic text-orange-500 tracking-tight">Resumo Financeiro</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex justify-between items-center shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-500">Total Faturado Coletivo</span>
                    <span className="font-black italic text-emerald-600 text-lg">{formatPrice(stats.totalVolume)}</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex justify-between items-center shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-500">Comissões Retidas Chef</span>
                    <span className="font-black italic text-orange-600 text-lg">
                      {formatPrice(stats.totalVolume * (settings.commission_rate || COMMISSION_RATE))}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex justify-between items-center shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-500">Adesão Total de Reservas</span>
                    <span className="font-black italic text-indigo-650 text-lg">{stats.totalBookings} reservas</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Pagamentos Stripe */}
            <div className="bg-white border border-slate-200 p-8 rounded-3xl text-left space-y-4 shadow-sm">
              <h3 className="text-lg font-black uppercase italic text-orange-500 tracking-tight">Pagamentos Stripe</h3>
              {stripePayments.length === 0 ? (
                <p className="text-xs text-slate-500">Ainda não há pagamentos registados.</p>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2">
                  {stripePayments.map((pay) => (
                    <div key={pay.booking_id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex justify-between items-center gap-3 font-mono">
                      <div>
                        <p className="text-[10px] font-black text-slate-700">#{String(pay.booking_id).slice(0, 8)}</p>
                        <p className="text-[9px] uppercase text-slate-500">{pay.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-700">{formatPrice((pay.amount_cents || 0) / 100)}</p>
                        <p className="text-[8px] font-bold text-orange-600 uppercase">
                          Comissão {formatPrice((pay.platform_fee_cents || 0) / 100)} • Chef {formatPrice((pay.chef_payout_cents || 0) / 100)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 7: PARAMETERS */}
        {/* ---------------------------------------------------- */}
        {activeTab === "settings" && (
          <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-6 duration-200 py-6">
            <h2 className="text-xl font-black italic uppercase text-orange-500 tracking-tight text-center">Configurações Base de Infraestrutura</h2>

            <div className="bg-white p-8 border border-slate-200 rounded-3xl space-y-6 text-left shadow-sm">
              {/* Toggle platforms switches */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                <div>
                  <span className="text-[10px] font-black uppercase block text-slate-700">Plataforma em Manutenção</span>
                  <p className="text-[9px] text-slate-500 mt-1">Impede clientes de criar novas marcações gastronómicas.</p>
                </div>
                <button
                  onClick={() => handleUpdateSetting("maintenance_mode", !settings.maintenance_mode)}
                  className={`w-12 h-6 rounded-full relative transition-all before:absolute before:-inset-2 before:sm:-inset-0 before:content-[''] ${
                    settings.maintenance_mode ? "bg-orange-500" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      settings.maintenance_mode ? "right-1" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle registrations */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                <div>
                  <span className="text-[10px] font-black uppercase block text-slate-700">Permitir Novos Registos</span>
                  <p className="text-[9px] text-slate-500 mt-1">Permite novas contas de Chefs ou clientes.</p>
                </div>
                <button
                  onClick={() => handleUpdateSetting("allow_new_registrations", !settings.allow_new_registrations)}
                  className={`w-12 h-6 rounded-full relative transition-all before:absolute before:-inset-2 before:sm:-inset-0 before:content-[''] ${
                    settings.allow_new_registrations ? "bg-orange-500" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      settings.allow_new_registrations ? "right-1" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* Slider / commission modifier */}
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-3">
                <div>
                  <span className="text-[10px] font-black uppercase block text-slate-700">Taxa de Comissão Cookr</span>
                  <p className="text-[9px] text-slate-500 mt-1">Margem retida em cada transação de chef.</p>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={(settings.commission_rate || COMMISSION_RATE) * 100}
                    onChange={(e) => handleUpdateSetting("commission_rate", parseFloat(e.target.value) / 100)}
                    className="flex-1 accent-orange-500"
                  />
                  <span className="font-mono text-xs font-bold text-orange-600">
                    {Math.round((settings.commission_rate || COMMISSION_RATE) * 100)}%
                  </span>
                </div>
              </div>

              {/* Transactional Email System & Resend Integration Status */}
              <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-4 shadow-md border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-orange-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                        Emails Transacionais (Resend / Edge Function)
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Disparo automático com proteção estrita contra duplicados (Idempotência)
                      </p>
                    </div>
                  </div>
                  <span className={`self-start sm:self-auto px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    emailConfig?.resendConfigured
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : emailConfig?.configured
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${emailConfig?.configured ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                    {emailConfig?.resendConfigured
                      ? "Resend Ativo"
                      : emailConfig?.smtpConfigured
                      ? "SMTP Ativo"
                      : "Modo Emulação (Audit Trail)"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-slate-300">
                  <div>
                    <span className="text-slate-500 uppercase text-[8px] block">Motor de Envio</span>
                    <span className="font-semibold text-slate-200">
                      {emailConfig?.resendConfigured ? "Resend API REST" : emailConfig?.smtpConfigured ? "SMTP Transporter" : "Emulação Local (Logs)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[8px] block">Endereço Remetente</span>
                    <span className="truncate block font-semibold text-slate-200">
                      {emailConfig?.fromEmail || emailConfig?.from || "Cookr <onboarding@resend.dev>"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[8px] block">Proteção de Idempotência</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> Ativa (Zero Duplicações)
                    </span>
                  </div>
                </div>

                {/* Email Test Dispatch Controls */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">
                      Disparo de Teste de Template Transacional
                    </label>
                    <span className="text-[9px] text-slate-500">Testa a renderização responsiva e o envio</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={testEmailType}
                      onChange={(e) => setTestEmailType(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                    >
                      <option value="welcome_client">1. Cliente — Boas-Vindas (Conta Criada)</option>
                      <option value="chef_registration">2. Chef — Registo / Candidatura</option>
                      <option value="booking_created_client">3. Cliente — Pedido de Reserva</option>
                      <option value="booking_created_chef">4. Chef — Novo Pedido Recebido</option>
                      <option value="booking_confirmed_client">5. Cliente — Reserva Confirmada</option>
                      <option value="booking_confirmed_chef">6. Chef — Reserva Confirmada</option>
                      <option value="payment_confirmed_client">7. Cliente — Pagamento Confirmado</option>
                      <option value="booking_cancelled_client">8. Cliente — Reserva Cancelada</option>
                      <option value="booking_cancelled_chef">9. Chef — Reserva Cancelada</option>
                      <option value="booking_reminder_client">10. Cliente — Lembrete 24h</option>
                      <option value="booking_reminder_chef">11. Chef — Lembrete 24h</option>
                    </select>

                    <input
                      type="email"
                      placeholder="destinatario@dominio.pt"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500 min-w-0"
                    />

                    <button
                      onClick={handleTestEmail}
                      disabled={isTestingEmail}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0"
                    >
                      {isTestingEmail ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>A enviar...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Testar Template</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Recent Dispatched Emails Log Table */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Rastreio de Emails Transacionais (Últimos Eventos)
                    </span>
                    <button
                      onClick={fetchEmailEvents}
                      disabled={isLoadingEmailEvents}
                      className="text-[9px] text-orange-400 hover:text-orange-300 flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingEmailEvents ? "animate-spin" : ""}`} />
                      Atualizar
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-[11px] font-mono">
                    {emailEvents.length === 0 ? (
                      <div className="text-center py-4 text-slate-500 text-xs font-sans">
                        Nenhum email transacional registado ainda. Dispare um teste ou faça uma reserva para ver os eventos.
                      </div>
                    ) : (
                      emailEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                  evt.status === "sent"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : evt.status === "failed"
                                    ? "bg-rose-500/20 text-rose-400"
                                    : "bg-amber-500/20 text-amber-400"
                                }`}
                              >
                                {evt.status}
                              </span>
                              <span className="text-slate-300 font-bold truncate">
                                {evt.email_type}
                              </span>
                              <span className="text-slate-500 text-[10px] hidden sm:inline">
                                ({evt.provider})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              Para: <span className="text-slate-200">{evt.recipient_email}</span>
                              {evt.sent_at && (
                                <span className="ml-2 text-slate-500">
                                  {new Date(evt.sent_at).toLocaleTimeString("pt-PT")}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {evt.status === "failed" && (
                              <button
                                onClick={() => handleRetryEmail(evt.id)}
                                disabled={retryingEventId === evt.id}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded text-[10px] font-bold flex items-center gap-1"
                              >
                                {retryingEventId === evt.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RotateCw className="w-3 h-3" />
                                )}
                                Reenviar
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 8: AUDIT TRAILS */}
        {/* ---------------------------------------------------- */}
        {activeTab === "logs" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-black italic uppercase text-orange-500 tracking-tight">Audit Trail do Command Center</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Histórico cronológico completo de ações administrativas, overrides manuais, moderações e ajustes de configuração no ecossistema Cookr.
                </p>
              </div>
              <button
                onClick={handleExportLogs}
                disabled={filteredLogs.length === 0}
                className="relative flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white hover:bg-slate-850 disabled:bg-slate-100 disabled:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed before:absolute before:-inset-2 before:sm:-inset-0 before:content-['']"
              >
                <ICONS.FileText size={13} />
                <span>Exportar JSON</span>
              </button>
            </div>

            {/* STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-left">
                <div className="flex justify-between items-start">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Rastreios</div>
                  <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-500">
                    <ICONS.List size={14} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-800 font-mono">{logStats.total}</div>
                <div className="text-[9px] text-slate-400 mt-1">Registos no Supabase</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-left">
                <div className="flex justify-between items-start">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overrides & Bypasses</div>
                  <div className="p-1.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-500">
                    <ICONS.Lock size={14} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-amber-600 font-mono">{logStats.overrides}</div>
                <div className="text-[9px] text-slate-400 mt-1">Controlo e bypass direto</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-left">
                <div className="flex justify-between items-start">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Moderações & Review</div>
                  <div className="p-1.5 bg-orange-50 border border-orange-100 rounded-lg text-orange-500">
                    <ICONS.AlertTriangle size={14} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-orange-600 font-mono">{logStats.moderations}</div>
                <div className="text-[9px] text-slate-400 mt-1">Moderação e aprovação</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-left">
                <div className="flex justify-between items-start">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ajustes de Sistema</div>
                  <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-550">
                    <ICONS.Settings size={14} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-700 font-mono">{logStats.settingsChanges}</div>
                <div className="text-[9px] text-slate-400 mt-1">Configs globais modificadas</div>
              </div>
            </div>

            {/* SEARCH AND FILTER BAR */}
            <div className="flex flex-col md:flex-row gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-left">
              <div className="flex-1 relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <ICONS.Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Pesquisar por notas, ID de alvo, ação ou administrador..."
                  value={logSearchText}
                  onChange={(e) => setLogSearchText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500/50 focus:bg-white transition-all font-mono"
                />
                {logSearchText && (
                  <button
                    onClick={() => setLogSearchText("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <ICONS.X size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                  <span className="text-slate-400">
                    <ICONS.Filter size={13} />
                  </span>
                  <select
                    value={logActionFilter}
                    onChange={(e) => setLogActionFilter(e.target.value as any)}
                    className="bg-transparent border-none text-slate-700 font-bold uppercase tracking-wider text-[10px] focus:outline-none focus:ring-0 cursor-pointer"
                  >
                    <option value="ALL">Todas as Ações</option>
                    <option value="OVERRIDES">Overrides e Bypasses</option>
                    <option value="MODERATION">Aprovações e Moderação</option>
                    <option value="SETTINGS">Ajustes de Sistema</option>
                    <option value="DELETIONS">Exclusões Irreversíveis</option>
                  </select>
                </div>

                {(logSearchText || logActionFilter !== "ALL") && (
                  <button
                    onClick={() => {
                      setLogSearchText("");
                      setLogActionFilter("ALL");
                    }}
                    className="px-3.5 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            </div>

            {/* AUDIT LOGS TABLE */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm text-left">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500">Data / Timestamp</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500">Auditor</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500">Ação de Auditor</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500">IP Originário</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500">Alvo ID</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[10px] text-slate-600">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-slate-400 italic">
                          Nenhum registo de auditoria corresponde aos filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        const isOverride =
                          log.action?.includes("STATUS_CHANGE") ||
                          log.action?.includes("FORCE_") ||
                          log.action?.includes("RESCHEDULE") ||
                          log.action?.includes("EDIT_CHEF") ||
                          log.action?.includes("ADJUST") ||
                          log.action?.includes("ROLE") ||
                          log.action?.includes("BULK") ||
                          log.action?.includes("BYPASS");
                        
                        const isDeletion = log.action?.startsWith("DELETE_");

                        return (
                          <tr
                            key={log.id}
                            onClick={() => setSelectedLog(log)}
                            className="hover:bg-slate-50/70 transition-colors cursor-pointer animate-in fade-in duration-100"
                          >
                            <td className="px-6 py-4 text-slate-400">
                              {log.created_at ? new Date(log.created_at).toLocaleString() : "N/A"}
                            </td>
                            <td className="px-6 py-4 text-slate-700 font-bold truncate max-w-[100px]">
                              {log.admin_id ? (users.find((u) => u.id === log.admin_id)?.nome || String(log.admin_id).slice(0, 8)) : "SYSTEM"}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-0.5 text-[8px] font-black border rounded flex-none inline-block uppercase tracking-wider ${
                                  isDeletion
                                    ? "bg-red-50 text-red-600 border-red-100"
                                    : isOverride
                                    ? "bg-amber-50 text-amber-600 border-amber-100"
                                    : "bg-orange-50 text-orange-600 border-orange-100"
                                }`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-400">
                              {generateIpForLog(log.id)}
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-semibold">
                              #{log.target_id?.slice(0, 8) || "N/A"}
                            </td>
                            <td className="px-6 py-4 text-slate-550 truncate max-w-xs font-sans">
                              {log.notes}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DETAILED LOG INSPECTOR MODAL */}
            {selectedLog && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 text-slate-800 text-left">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black uppercase text-orange-500 italic flex items-center gap-2">
                      <ICONS.Lock size={14} />
                      <span>Rastreio de Auditoria Detalhado</span>
                    </h3>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="relative p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer before:absolute before:-inset-2 before:content-['']"
                    >
                      <ICONS.X size={16} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-mono bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block uppercase text-[8px] font-bold tracking-wider">Log ID</span>
                        <span className="text-slate-700 select-all">{selectedLog.id}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase text-[8px] font-bold tracking-wider">Timestamp</span>
                        <span className="text-slate-700 font-bold">
                          {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString() : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase text-[8px] font-bold tracking-wider">Auditor / Operador</span>
                        <span className="text-slate-700 font-bold">{selectedLog.admin_id || "SYSTEM"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase text-[8px] font-bold tracking-wider">IP Originário</span>
                        <span className="text-slate-700 font-bold">{generateIpForLog(selectedLog.id)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase text-[8px] font-bold tracking-wider">Ação</span>
                        <span className="text-orange-600 font-bold">{selectedLog.action}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase text-[8px] font-bold tracking-wider">Alvo ID</span>
                        <span className="text-slate-700 font-bold select-all">#{selectedLog.target_id || "N/A"}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Detalhes / Notas Administrativas</h4>
                      <div className="bg-orange-50/30 border border-orange-100/50 rounded-2xl p-4 text-xs text-slate-700 font-sans leading-relaxed">
                        {selectedLog.notes || "Sem notas especificadas para esta ação."}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dados do Evento Raw JSON</h4>
                      <pre className="text-[9px] font-mono bg-slate-950 text-slate-200 p-4 rounded-2xl border border-slate-800 overflow-x-auto max-h-40 select-all">
                        {JSON.stringify(selectedLog, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      Fechar Painel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 9: DEV OPERATIONS AND SEEDERS (BACKSTAGE) */}
        {/* ---------------------------------------------------- */}
        {activeTab === "backstage" && import.meta.env.DEV && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-6 duration-200 py-6 text-left">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-orange-50 border border-orange-200 text-orange-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <ICONS.Database size={28} />
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">DevOps & Sandbox Seeder</h2>
              <p className="text-xs text-slate-500">
                Lugar exclusivo para sementeira de dados e correções de banco. Evita poluição visual das operações de negócio cotidianas.
              </p>
            </div>

            {/* Sementeira de dados de teste: só em desenvolvimento (o separador está oculto em produção) */}
            <div className="bg-white p-8 border border-slate-200 rounded-3xl space-y-6 shadow-sm">
              <h3 className="text-sm font-black uppercase text-orange-500 italic">Sementeira de dados de teste (só desenvolvimento)</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Injeta utilizadores, menus e reservas de demonstração. Nunca usar em produção.
              </p>
              <button
                onClick={handleSeedData}
                disabled={isSeeding}
                className="relative w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold uppercase tracking-wider text-xs rounded-lg transition-all"
              >
                {isSeeding ? "A Popular Supabase..." : "Popular Banco com Mock Data"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(AdminDashboard);
