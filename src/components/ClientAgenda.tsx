import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Booking, BookingStatus, User, Review, MenuItem } from "../types";
import { ICONS, formatPrice } from "../constants";
import { supabaseService } from "../services/supabaseService";
import { CancellationModal } from "./CancellationModal";
import { Download, RefreshCw } from "lucide-react";
import { useLanguage, getLangText } from "../contexts/LanguageContext";

import { tr } from "../lib/tr";
interface UpcomingBookingCardProps {
  b: Booking;
  cooks: User[];
  onSelectDetail: (b: Booking) => void;
  onCancel: (b: Booking) => void;
  onOpenChat: (partnerId: string) => void;
  onDownloadICS: (b: Booking) => void;
  onAcceptReschedule: (b: Booking) => void;
  onRejectReschedule: (b: Booking) => void;
}

const UpcomingBookingCard: React.FC<UpcomingBookingCardProps> = React.memo(({
  b,
  cooks,
  onSelectDetail,
  onCancel,
  onOpenChat,
  onDownloadICS,
  onAcceptReschedule,
  onRejectReschedule,
}) => {
  const { language } = useLanguage();

  const isToday = useMemo(() => {
    if (!b.data) return false;
    const todayObj = new Date();
    const yyyy = todayObj.getFullYear();
    const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
    const dd = String(todayObj.getDate()).padStart(2, '0');
    const todayYYYYMMDD = `${yyyy}-${mm}-${dd}`;
    const todayDDMMYYYY = `${dd}/${mm}/${yyyy}`;
    const todayDDMMYYYY_dash = `${dd}-${mm}-${yyyy}`;
    const cleanData = b.data.trim();
    return (
      cleanData === todayYYYYMMDD ||
      cleanData === todayDDMMYYYY ||
      cleanData === todayDDMMYYYY_dash ||
      cleanData.toLowerCase().includes("hoje") ||
      cleanData.toLowerCase().includes("today") ||
      cleanData.toLowerCase().includes("aujourd'hui")
    );
  }, [b.data]);

  const statusConfig = useMemo(() => {
    switch (b.status) {
      case BookingStatus.IN_PROGRESS:
        return {
          label: getLangText(language, { pt: "Em Preparação", es: "En Preparación", en: "In Preparation", fr: "En Préparation" }),
          classes: "bg-slate-950 text-white shadow-sm font-black text-[8px] md:text-[9px] uppercase tracking-wider px-2 md:px-2.5 py-0.5 rounded-md"
        };
      case BookingStatus.RESCHEDULE_REQUESTED:
        return {
          label: getLangText(language, { pt: "Reagendamento Solicitado", es: "Reagendamiento Solicitado", en: "Reschedule Requested", fr: "Report Demandé" }),
          classes: "bg-amber-500 text-slate-950 shadow-sm font-black text-[8px] md:text-[9px] uppercase tracking-wider px-2 md:px-2.5 py-0.5 rounded-md animate-pulse"
        };
      case BookingStatus.ACCEPTED:
        return {
          label: getLangText(language, { pt: "Confirmado", es: "Confirmado", en: "Confirmed", fr: "Confirmé" }),
          classes: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-black text-[8px] md:text-[9px] uppercase tracking-wider px-2 md:px-2.5 py-0.5 rounded-md"
        };
      default:
        return {
          label: b.status,
          classes: "bg-orange-500 text-white font-black text-[8px] md:text-[9px] uppercase tracking-wider px-2 md:px-2.5 py-0.5 rounded-md shadow-sm"
        };
    }
  }, [b.status, language]);

  return (
    <div
      className={`bg-white p-5 md:p-6 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group relative overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_35px_rgba(0,0,0,0.04)] pl-5 md:pl-6 ${
        isToday
          ? "border-l-4 border-l-orange-500 border-y-slate-100/80 border-r-slate-100/80 hover:border-r-slate-200 hover:border-y-slate-200"
          : "border-l-4 border-l-slate-200 border-y-slate-100/80 border-r-slate-100/80 hover:border-l-orange-500/40 hover:border-r-slate-200 hover:border-y-slate-200"
      }`}
    >
      {b.status === BookingStatus.IN_PROGRESS && (
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500 to-amber-500 animate-pulse" />
      )}

      <div className="flex-1 text-left space-y-2">
        <div className="flex items-center flex-wrap gap-1.5">
          <span className={statusConfig.classes}>
            {tr(statusConfig.label as any) as any}
          </span>

          {isToday && (
            <div className="flex items-center gap-1 bg-orange-500/10 text-orange-600 border border-orange-500/20 rounded-md px-2.5 py-0.5 text-[9px] font-black tracking-widest animate-pulse">
              <span className="w-1 h-1 rounded-full bg-orange-500 animate-ping" />
              <span>{getLangText(language, { pt: "HOJE", es: "HOY", en: "TODAY", fr: "AUJOURD'HUI" })}</span>
            </div>
          )}

          <div className="flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-100 rounded-md px-2.5 py-0.5 text-[9px] font-semibold">
            <ICONS.Calendar size={10} className="text-slate-400 shrink-0" />
            <span>
              {b.status === BookingStatus.RESCHEDULE_REQUESTED ? (
                <span className="text-orange-600 font-bold">
                  {b.proposed_date} {getLangText(language, { pt: "às", es: "a las", en: "at", fr: "à" })} {b.proposed_time}
                </span>
              ) : (
                `${b.data} ${getLangText(language, { pt: "às", es: "a las", en: "at", fr: "à" })} ${b.hora}`
              )}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-base md:text-lg font-black text-slate-950 uppercase tracking-tight group-hover:text-orange-500 transition-colors leading-tight">
            {b.menu_selected}
          </h3>
          
          <div className="flex items-center gap-2">
            <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 overflow-hidden flex items-center justify-center shadow-sm shrink-0">
              {(() => {
                const avatarUrl = cooks?.find((u) => u.id === b.cookId)?.avatar_url;
                return avatarUrl ? (
                  <img
                    src={avatarUrl}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    alt={tr("Chef avatar")}
                  />
                ) : (
                  <span className="text-white font-extrabold text-[8px]">
                    {(b.cookName || "C").charAt(0).toUpperCase()}
                  </span>
                );
              })()}
            </div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              {tr("Chef")} {b.cookName}
            </p>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">
              {getLangText(language, { pt: "Autor do Conceito", es: "Autor del Concepto", en: "Concept Author", fr: "Auteur du Concept" })}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50/80 border border-slate-100 rounded-md">
            <ICONS.MapPin size={10} className="text-slate-400 shrink-0" />
            <span className="text-[9px] font-medium text-slate-600 truncate max-w-[150px] md:max-w-[220px]">
              {b.morada}
            </span>
          </div>

          {b.service_pin && (b.status === BookingStatus.ACCEPTED || b.status === BookingStatus.IN_PROGRESS) && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/5 border border-emerald-500/10 rounded-md text-emerald-700">
              <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600">{tr("🔑 PIN:")}</span>
              <span className="text-[9px] font-mono font-black tracking-widest">{b.service_pin}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between w-full md:w-auto gap-4 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100/60">
        <div className="text-left md:text-right space-y-0.5">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
            {getLangText(language, { pt: "Valor Total", es: "Valor Total", en: "Total Price", fr: "Montant Total" })}
          </p>
          <p className="text-base md:text-lg font-black text-slate-950 tracking-tight leading-none">
            {formatPrice(b.valorTotal)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 justify-start sm:justify-end w-full sm:w-auto">
          {b.status === BookingStatus.RESCHEDULE_REQUESTED ? (
            <>
              <button
                onClick={() => onAcceptReschedule(b)}
                className="h-9 px-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                {getLangText(language, { pt: "Aceitar", es: "Aceptar", en: "Accept", fr: "Accepter" })}
              </button>
              <button
                onClick={() => onRejectReschedule(b)}
                className="h-9 px-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                {getLangText(language, { pt: "Rejeitar", es: "Rechazar", en: "Reject", fr: "Rejeter" })}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onSelectDetail(b)}
                className="h-9 px-3.5 bg-white border border-slate-200 hover:border-slate-800 hover:bg-slate-50 text-slate-800 hover:text-slate-950 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                {getLangText(language, { pt: "Detalhes", es: "Detalles", en: "Details", fr: "Détails" })}
              </button>
              <button
                onClick={() => onCancel(b)}
                className="h-9 px-3.5 bg-white border border-rose-100 hover:bg-rose-50 text-rose-600 hover:text-rose-700 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                {getLangText(language, { pt: "Cancelar", es: "Cancelar", en: "Cancel", fr: "Annuler" })}
              </button>
            </>
          )}

          <button
            onClick={() => onOpenChat(b.cookId)}
            className="w-9 h-9 bg-slate-50 hover:bg-orange-50 border border-slate-200/80 hover:border-orange-200 text-slate-700 hover:text-orange-600 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95 duration-200 cursor-pointer"
            title={getLangText(language, { pt: "Abrir Chat", es: "Abrir Chat", en: "Open Chat", fr: "Ouvrir le Chat" })}
          >
            <ICONS.MessageSquare size={13} />
          </button>

          <button
            onClick={() => onDownloadICS(b)}
            className="w-9 h-9 bg-slate-50 hover:bg-orange-50 border border-slate-200/80 hover:border-orange-200 text-slate-700 hover:text-orange-600 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95 duration-200 cursor-pointer text-slate-600"
            title={getLangText(language, { pt: "Descarregar Calendário (.ics)", es: "Guardar en Calendario (.ics)", en: "Download Calendar (.ics)", fr: "Télécharger l'Agenda (.ics)" })}
          >
            <Download size={13} />
          </button>

          {b.is_finalizing && (
            <div className="h-9 px-2.5 bg-orange-500 text-white rounded-xl flex flex-col items-center justify-center shadow-sm animate-pulse shrink-0">
              <span className="text-[7px] font-black uppercase tracking-wider leading-none">{tr("PIN")}</span>
              <span className="text-[9px] font-mono font-black leading-none mt-0.5">{b.service_pin}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

interface HistoryBookingCardProps {
  b: Booking;
  reviews: Review[];
  cooks: User[];
  getStatusLabel: (b: Booking) => string;
  getStatusBadgeClass: (b: Booking) => string;
  onSelectDetail: (b: Booking) => void;
  onReview: (b: Booking) => void;
}

const HistoryBookingCard: React.FC<HistoryBookingCardProps> = React.memo(({
  b,
  reviews,
  cooks,
  getStatusLabel,
  getStatusBadgeClass,
  onSelectDetail,
  onReview,
}) => {
  useLanguage();
  const isReviewed = reviews.some((r) => r.bookingId === b.id);
  return (
    <div
      className="bg-slate-50/40 p-4 md:p-5 rounded-xl border border-slate-100 hover:border-slate-200/80 transition-all flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 group"
    >
      <div className="flex-1 text-left space-y-1.5">
        <div className="flex items-center gap-2.5">
          <span
            className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md tracking-wider ${getStatusBadgeClass(b)}`}
          >
            {getStatusLabel(b)}
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            {b.data}
          </span>
        </div>
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-500 transition-colors leading-tight">
            {b.menu_selected}
          </h4>
          <div className="flex items-center gap-1.5">
            <div className="w-[14px] h-[14px] rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
              {(() => {
                const avatarUrl = cooks?.find(
                  (u) => u.id === b.cookId,
                )?.avatar_url;
                return avatarUrl ? (
                  <img
                    src={avatarUrl}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    alt={tr("Cook avatar")}
                  />
                ) : (
                  <span className="text-slate-500 font-extrabold text-[7px]" />
                );
              })()}
            </div>
            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">
              {tr("Chef")} {b.cookName}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between md:justify-end gap-4">
        <p className="text-sm md:text-base font-bold text-slate-900">
          {formatPrice(b.valorTotal)}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSelectDetail(b)}
            className="h-11 px-5 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-950 text-slate-700 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-sm"
          >
            {tr("Detalhes")}
          </button>
          {b.status === BookingStatus.COMPLETED ? (
            isReviewed ? (
              <div className="h-11 px-5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border border-emerald-100">
                <ICONS.CheckCircle size={12} />
                {tr("Avaliado")}
              </div>
            ) : (
              <button
                onClick={() => onReview(b)}
                className="h-11 px-5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md shadow-orange-500/10"
              >
                {tr("Avaliar")}
              </button>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
});

interface ClientAgendaProps {
  user: User;
  bookings: Booking[];
  reviews: Review[];
  cooks: User[];
  onSelectChef: (id: string) => void;
  onNavigate: (view: string) => void;
  onOpenChat: (partnerId: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

const ClientAgenda: React.FC<ClientAgendaProps> = ({
  user,
  bookings,
  reviews,
  cooks,
  onSelectChef,
  onOpenChat,
  onNavigate,
  onRefresh,
  isLoading = false,
}) => {
  useLanguage();
  const [reviewingBooking, setReviewingBooking] =
    useState<Booking | null>(null);
  const [viewingDetail, setViewingDetail] = useState<Booking | null>(
    null,
  );
  const [cancellingBooking, setCancellingBooking] =
    useState<Booking | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportDemoBookings = async () => {
    if (!user) return;
    setIsImporting(true);
    try {
      const success = await supabaseService.importDemoBookingsForNewClient(user.id, user.nome);
      if (success) {
        if (onRefresh) onRefresh();
        alert(tr("As suas reservas de demonstração foram sincronizadas com sucesso à sua nova conta Cookr!"));
      } else {
        alert(tr("Não encontrámos novas reservas de demonstração para sincronizar (ou estas já foram todas associadas)."));
      }
    } catch (err) {
      console.error(err);
      alert(tr("Ocorreu um erro ao sincronizar as reservas."));
    } finally {
      setIsImporting(false);
    }
  };

  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState<"all" | "completed" | "cancelled" | "pending_pin" | "expired_rejected">("all");
  const [historySort, setHistorySort] = useState<"newest" | "oldest">("newest");
  const [historyDate, setHistoryDate] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 5;

  const [activeTab, setActiveTab] = useState<
    "all" | "experience" | "dish" | "daily"
  >("all");

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historyStatus, historySort, historyDate, activeTab]);

  const handleDownloadICS = useCallback((b: Booking) => {
    try {
      const chefName = b.cookName || "Chef";
      const menuName = b.menu_selected || "Menu Especial";
      const address = b.morada || "";
      const numPessoas = b.numPessoas || 1;
      
      let dateStr = b.data;
      if (b.status === BookingStatus.RESCHEDULE_REQUESTED && b.proposed_date) {
        dateStr = b.proposed_date;
      }
      
      let timeStr = b.hora || "20:00";
      if (b.status === BookingStatus.RESCHEDULE_REQUESTED && b.proposed_time) {
        timeStr = b.proposed_time;
      }
      
      let year = "2026";
      let month = "01";
      let day = "01";
      
      if (dateStr.includes("-")) {
        const parts = dateStr.split("-");
        if (parts[0].length === 4) {
          year = parts[0];
          month = parts[1].padStart(2, "0");
          day = parts[2].padStart(2, "0");
        } else {
          day = parts[0].padStart(2, "0");
          month = parts[1].padStart(2, "0");
          year = parts[2];
        }
      } else if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        if (parts[2]?.length === 4) {
          day = parts[0].padStart(2, "0");
          month = parts[1].padStart(2, "0");
          year = parts[2];
        } else if (parts[0]?.length === 4) {
          year = parts[0];
          month = parts[1].padStart(2, "0");
          day = parts[2].padStart(2, "0");
        }
      }
      
      const timeParts = timeStr.split(":");
      const hours = (timeParts[0] || "20").padStart(2, "0");
      const minutes = (timeParts[1] || "00").padStart(2, "0");
      
      const startDateTime = `${year}${month}${day}T${hours}${minutes}00`;
      
      let endHoursNum = parseInt(hours) + 3;
      let endYear = year;
      let endMonth = month;
      let endDay = day;
      
      if (endHoursNum >= 24) {
        endHoursNum = endHoursNum - 24;
        const dObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day) + 1);
        endYear = `${dObj.getFullYear()}`;
        endMonth = `${dObj.getMonth() + 1}`.padStart(2, "0");
        endDay = `${dObj.getDate()}`.padStart(2, "0");
      }
      const endHours = `${endHoursNum}`.padStart(2, "0");
      const endDateTime = `${endYear}${endMonth}${endDay}T${endHours}${minutes}00`;
      
      const icsLines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Cookr//Kitchen Ritual//PT",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        `SUMMARY:Ritual Cookr: ${menuName}`,
        `DTSTART:${startDateTime}`,
        `DTEND:${endDateTime}`,
        `DESCRIPTION:Ritual gastronómico Cookr com o Chef ${chefName}.\\n\\nMenu: ${menuName}\\nMorada: ${address}\\nNum de Pessoas: ${numPessoas} PAX`,
        `LOCATION:${address.replace(/,/g, "\\,")}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR"
      ];
      
      const icsContent = icsLines.join("\r\n");
      
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ritual_cookr_${b.id || "booking"}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error creating ICS file:", err);
    }
  }, []);

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
          console.error("Error fetching menu:", e);
        } finally {
          setIsLoadingMenu(false);
        }
      } else {
        setSelectedMenu(null);
      }
    };
    fetchMenu();
  }, [viewingDetail]);

  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);

  useEffect(() => {
    if (hasAutoTriggered || bookings.length === 0) return;

    // Find the first completed booking where no review exists in reviews prop
    const unreviewed = bookings.find(
      (b) => b.status === BookingStatus.COMPLETED && !reviews.some((r) => r.bookingId === b.id)
    );

    if (unreviewed) {
      setReviewingBooking(unreviewed);
      setHasAutoTriggered(true);
    }
  }, [bookings, reviews, hasAutoTriggered]);

  const filteredBookings = useMemo(() => {
    if (activeTab === "all") return bookings;
    if (activeTab === "daily") {
      return bookings.filter((b) => b.is_meal_prep || b.menu_type === "daily" || b.menu_selected?.toLowerCase().includes('daily') || b.menu_selected?.toLowerCase().includes('pack'));
    }
    return bookings.filter((b) => {
      const isDaily = b.is_meal_prep || b.menu_type === 'daily' || b.menu_selected?.toLowerCase().includes('daily') || b.menu_selected?.toLowerCase().includes('pack');
      if (isDaily) return false;

      const hasRitualKeyword = b.menu_selected?.toLowerCase().includes('menu') || b.menu_selected?.toLowerCase().includes('experiência') || b.menu_selected?.toLowerCase().includes('degustação') || b.menu_selected?.toLowerCase().includes('ritual');
      const isDish = b.menu_type === 'dish' || b.menu_selected?.toLowerCase().includes('prato') || !hasRitualKeyword;

      if (activeTab === "dish") {
        return isDish;
      }
      if (activeTab === "experience") {
        return !isDish;
      }
      return false;
    });
  }, [bookings, activeTab]);

  const isPastBooking = useCallback((b: Booking) => {
    try {
      if (!b.data) return false;
      const now = new Date();
      const bookingDateTime = new Date(`${b.data}T${b.hora || "23:59"}`);
      return bookingDateTime.getTime() < now.getTime();
    } catch (e) {
      return false;
    }
  }, []);

  const getStatusLabel = useCallback((b: Booking) => {
    if (b.status === BookingStatus.COMPLETED) return "Concluído";
    if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.CANCELLED_PARTIAL_REFUND) return "Cancelado";
    if (b.status === BookingStatus.REJECTED) return "Rejeitado";
    
    if (isPastBooking(b)) {
      if (b.status === BookingStatus.PENDING) return "Expirado (Sem Resposta)";
      if (b.status === BookingStatus.ACCEPTED || b.status === BookingStatus.IN_PROGRESS) {
        return "Realizado (Pendente PIN)";
      }
      return "Expirado";
    }
    
    if (b.status === BookingStatus.PENDING) return "Pendente";
    if (b.status === BookingStatus.ACCEPTED) return "Aceitar";
    if (b.status === BookingStatus.IN_PROGRESS) return "Em Preparação";
    if (b.status === BookingStatus.RESCHEDULE_REQUESTED) return "Reagendamento Solicitado";
    return b.status;
  }, [isPastBooking]);

  const getStatusBadgeClass = useCallback((b: Booking) => {
    if (b.status === BookingStatus.COMPLETED) {
      return "bg-emerald-50 text-emerald-600 border border-emerald-100";
    }
    if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.CANCELLED_PARTIAL_REFUND) {
      return "bg-red-50 text-red-600 border border-red-100";
    }
    if (b.status === BookingStatus.REJECTED) {
      return "bg-slate-100 text-slate-500 border border-slate-200";
    }
    if (isPastBooking(b)) {
      if (b.status === BookingStatus.PENDING) {
        return "bg-slate-100 text-slate-400 border border-slate-200";
      }
      if (b.status === BookingStatus.ACCEPTED || b.status === BookingStatus.IN_PROGRESS) {
        return "bg-amber-50 text-amber-600 border border-amber-100 animate-pulse";
      }
      return "bg-slate-100 text-slate-400 border border-slate-200";
    }
    return "bg-orange-50 text-orange-600 border border-orange-100";
  }, [isPastBooking]);

  const upcomingBookings = filteredBookings
    .filter(
      (b) =>
        !isPastBooking(b) &&
        b.status !== BookingStatus.COMPLETED &&
        b.status !== BookingStatus.CANCELLED &&
        b.status !== BookingStatus.REJECTED &&
        b.status !== BookingStatus.CANCELLED_PARTIAL_REFUND,
    )
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  const completedBookings = useMemo(() => {
    let list = filteredBookings.filter(
      (b) =>
        isPastBooking(b) ||
        b.status === BookingStatus.COMPLETED ||
        b.status === BookingStatus.CANCELLED ||
        b.status === BookingStatus.REJECTED ||
        b.status === BookingStatus.CANCELLED_PARTIAL_REFUND,
    );

    // Apply search filter
    if (historySearch.trim() !== "") {
      const q = historySearch.toLowerCase();
      list = list.filter(
        (b) =>
          b.cookName?.toLowerCase().includes(q) ||
          b.menu_selected?.toLowerCase().includes(q) ||
          b.morada?.toLowerCase().includes(q) ||
          b.data?.toLowerCase().includes(q)
      );
    }

    // Apply specific date filter
    if (historyDate) {
      const [year, month, day] = historyDate.split("-");
      const formattedDDMMYYYY = `${day}/${month}/${year}`;
      const formattedDDMMYYYYDash = `${day}-${month}-${year}`;
      
      list = list.filter((b) => {
        if (!b.data) return false;
        const cleanData = b.data.trim();
        return (
          cleanData === historyDate ||
          cleanData === formattedDDMMYYYY ||
          cleanData === formattedDDMMYYYYDash ||
          cleanData.includes(historyDate) ||
          cleanData.includes(formattedDDMMYYYY)
        );
      });
    }

    // Apply status filter
    if (historyStatus !== "all") {
      list = list.filter((b) => {
        const isPast = isPastBooking(b);
        if (historyStatus === "completed") {
          return b.status === BookingStatus.COMPLETED;
        }
        if (historyStatus === "cancelled") {
          return b.status === BookingStatus.CANCELLED || b.status === BookingStatus.CANCELLED_PARTIAL_REFUND;
        }
        if (historyStatus === "pending_pin") {
          return isPast && (b.status === BookingStatus.ACCEPTED || b.status === BookingStatus.IN_PROGRESS);
        }
        if (historyStatus === "expired_rejected") {
          return b.status === BookingStatus.REJECTED || (isPast && b.status === BookingStatus.PENDING);
        }
        return true;
      });
    }

    // Apply sorting
    list.sort((a, b) => {
      const dateA = new Date(a.data).getTime();
      const dateB = new Date(b.data).getTime();
      return historySort === "newest" ? dateB - dateA : dateA - dateB;
    });

    return list;
  }, [filteredBookings, historySearch, historyStatus, historySort, historyDate]);

  const paginatedHistoryBookings = useMemo(() => {
    const startIndex = (historyPage - 1) * itemsPerPage;
    return completedBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [completedBookings, historyPage]);

  const totalPages = Math.ceil(completedBookings.length / itemsPerPage);

  const handleSubmitReview = useCallback(async () => {
    if (!reviewingBooking) return;
    setIsSubmitting(true);
    try {
      await supabaseService.createReview({
        clientId: user.id,
        cookId: reviewingBooking.cookId,
        bookingId: reviewingBooking.id,
        rating,
        comment,
        clientName: user.nome,
      });
      onRefresh();
      setReviewingBooking(null);
      setComment("");
      setRating(5);
      onRefresh();
    } catch (e: any) {
      alert(e?.message || tr("Erro ao enviar avaliação."));
    } finally {
      setIsSubmitting(false);
    }
  }, [reviewingBooking, user, rating, comment, onRefresh]);

  const handleAcceptReschedule = useCallback(async (b: Booking) => {
    if (!b.proposed_date || !b.proposed_time) return;
    try {
      const { error } = await supabaseService.updateBookingStatus(
        b.id,
        BookingStatus.ACCEPTED,
        {
          data: b.proposed_date,
          hora: b.proposed_time,
          proposed_date: null,
          proposed_time: null,
        },
      );
      if (error) throw error;
      onRefresh();
      alert(tr("Reagendamento aceite com sucesso!"));
    } catch (e) {
      console.error("Erro ao aceitar reagendamento:", e);
      alert(tr("Erro ao aceitar reagendamento."));
    }
  }, [onRefresh]);

  const handleRejectReschedule = useCallback(async (b: Booking) => {
    try {
      const result = await supabaseService.handleCancellation(
        b.id,
        user.id,
        "Reagendamento rejeitado pelo cliente.",
      );
      if (result.success) {
        onRefresh();
        alert(tr("Reagendamento rejeitado. A reserva foi cancelada."));
      } else {
        alert(result.message);
      }
    } catch (e) {
      console.error("Erro ao rejeitar reagendamento:", e);
      alert(tr("Erro ao rejeitar reagendamento."));
    }
  }, [user.id, onRefresh]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 md:space-y-12 pb-24 pt-4 md:pt-12 px-4 md:px-6 animate-in fade-in duration-700">
      {/* Cancellation Modal */}
      {cancellingBooking && (
        <CancellationModal
          isOpen={!!cancellingBooking}
          onClose={() => setCancellingBooking(null)}
          booking={cancellingBooking}
          userId={user.id}
          onSuccess={(msg) => {
            onRefresh();
            setCancellingBooking(null);
          }}
        />
      )}

      {/* Review Modal */}
      {reviewingBooking && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-12 space-y-6 md:space-y-8 shadow-3xl animate-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">
                {tr("Avaliar Experiência")}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {tr("Como foi o seu ritual com o Chef")} {reviewingBooking.cookName}?
              </p>
            </div>

            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${rating >= star ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-slate-50 text-slate-300"}`}
                >
                  <ICONS.Star
                    size={24}
                    fill={rating >= star ? "currentColor" : "none"}
                  />
                </button>
              ))}
            </div>

            <textarea
              className="w-full h-32 p-6 bg-slate-50 rounded-3xl border border-slate-100 outline-none focus:border-orange-500 font-bold text-xs transition-all resize-none"
              placeholder={tr("Partilhe a sua opinião sobre a comida e o serviço...")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            <div className="flex gap-4">
              <button
                onClick={() => setReviewingBooking(null)}
                className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all"
              >
                {tr("Cancelar")}
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={isSubmitting}
                className="flex-1 py-4 bg-slate-950 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-500 transition-all shadow-xl"
              >
                {isSubmitting ? tr("A Enviar...") : tr("Enviar Avaliação")}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-8">
        <div className="text-left space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 uppercase">
            {tr("Minha")} <span className="text-orange-500">{tr("Agenda")}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {tr("Gerir e acompanhar as suas ricas experiências gastronómicas.")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "all" ? "bg-white text-slate-950 shadow-sm border border-slate-200/10" : "text-slate-500 hover:text-slate-700"}`}
            >
              {tr("Todos")}
            </button>
            <button
              onClick={() => setActiveTab("experience")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "experience" ? "bg-white text-slate-950 shadow-sm border border-slate-200/10" : "text-slate-500 hover:text-slate-700"}`}
            >
              <ICONS.Sparkles size={11} className="shrink-0" />
              {tr("Rituais")}
            </button>
            <button
              onClick={() => setActiveTab("dish")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "dish" ? "bg-white text-slate-950 shadow-sm border border-slate-200/10" : "text-slate-500 hover:text-slate-700"}`}
            >
              <ICONS.Utensils size={11} className="shrink-0" />
              {tr("Pratos")}
            </button>
            <button
              onClick={() => setActiveTab("daily")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "daily" ? "bg-white text-slate-950 shadow-sm border border-slate-200/10" : "text-slate-500 hover:text-slate-700"}`}
            >
              <ICONS.Calendar size={11} className="shrink-0" />
              {tr("Daily")}
            </button>
          </div>
          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100/80 flex items-center justify-center gap-2 text-slate-700 shrink-0 self-start sm:self-auto">
            <ICONS.Calendar size={12} className="text-orange-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800">
              {filteredBookings.length}{" "}
              {activeTab === "all"
                ? tr("Operações")
                : activeTab === "experience"
                  ? tr("Rituais")
                  : activeTab === "dish"
                    ? tr("Pratos")
                    : tr("Packs Daily")}
            </span>
          </div>
        </div>
      </header>

      <div className="space-y-12">
        {/* Upcoming Section */}
        <div className="space-y-5 md:space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-3.5 bg-orange-500 rounded-full" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              {tr("Próximos")}{" "}
              {activeTab === "experience"
                ? tr("Rituais")
                : activeTab === "dish"
                  ? tr("Pratos")
                  : activeTab === "daily"
                    ? tr("Packs Daily")
                    : tr("Serviços")}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:gap-5">
            {isLoading ? (
              [1, 2].map((n) => (
                <div
                  key={n}
                  className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden animate-pulse"
                >
                  <div className="flex-1 text-left space-y-3">
                    <div className="flex items-center flex-wrap gap-2.5">
                      <div className="w-16 h-4 bg-slate-200 rounded-md" />
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 bg-slate-100 rounded-full" />
                        <div className="w-24 h-3.5 bg-slate-100 rounded-full" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="h-6 w-3/4 bg-slate-200 rounded-full" />
                      <div className="flex items-center gap-2">
                        <div className="w-[18px] h-[18px] rounded-full bg-slate-250 animate-pulse" />
                        <div className="w-24 h-2.5 bg-slate-100 rounded-full animate-pulse" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="w-40 h-5 bg-slate-50 border border-slate-100 rounded-lg" />
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left md:text-right space-y-1">
                      <div className="w-12 h-2.5 bg-slate-100 rounded-full" />
                      <div className="w-16 h-5 bg-slate-200 rounded-full" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="h-10 w-24 bg-slate-100 rounded-xl" />
                      <div className="h-10 w-24 bg-slate-100 rounded-xl" />
                      <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                    </div>
                  </div>
                </div>
              ))
            ) : upcomingBookings.length > 0 ? (
              upcomingBookings.map((b) => {
                return (
                  <UpcomingBookingCard
                    key={b.id}
                    b={b}
                    cooks={cooks}
                    onSelectDetail={setViewingDetail}
                    onCancel={setCancellingBooking}
                    onOpenChat={onOpenChat}
                    onDownloadICS={handleDownloadICS}
                    onAcceptReschedule={handleAcceptReschedule}
                    onRejectReschedule={handleRejectReschedule}
                  />
                );
              })
            ) : (
              <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-100/80 flex flex-col items-center justify-center gap-4 px-6 max-w-sm mx-auto">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-300 border border-slate-100 shadow-sm">
                  <ICONS.Calendar size={20} className="text-slate-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">{tr("Nenhuma Atividade")}</h4>
                  <p className="text-[11px] text-slate-400 font-medium pb-2">
                    {tr("Não tem agendamentos ativos para esta seleção de rituais.")}
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

        {/* History Section */}
        <div className="space-y-5 md:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-3.5 bg-slate-300 rounded-full" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {tr("Histórico de")}{" "}
                {activeTab === "experience"
                  ? tr("Rituais")
                  : activeTab === "dish"
                    ? tr("Pratos")
                    : activeTab === "daily"
                      ? tr("Packs Daily")
                      : tr("Serviços")}
              </h2>
            </div>
            {completedBookings.length > 0 && (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100/60 px-2.5 py-1 rounded-full border border-slate-200/50 self-start sm:self-auto">
                {completedBookings.length} {completedBookings.length === 1 ? tr("Serviço") : tr("Serviços")}
              </span>
            )}
          </div>

          {/* History Controls Bar */}
          <div className="bg-slate-50/50 p-3.5 md:p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4 shadow-sm">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <ICONS.Search size={14} />
              </span>
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder={tr("Pesquisar por prato ou chef...")}
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all shadow-sm text-slate-800"
              />
              {historySearch && (
                <button
                  onClick={() => setHistorySearch("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 active:scale-90 transition-all"
                >
                  <ICONS.X size={12} />
                </button>
              )}
            </div>

            {/* Filters and Sort */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              {/* Status Selector */}
              <div className="relative flex-1 sm:flex-none">
                <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                  <ICONS.Filter size={11} />
                </span>
                <select
                  value={historyStatus}
                  onChange={(e: any) => setHistoryStatus(e.target.value)}
                  className="w-full sm:w-auto pl-8 pr-10 py-2.5 bg-white border border-slate-200/80 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 focus:outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="all">{tr("Todos os Estados")}</option>
                  <option value="completed">{tr("Concluídos")}</option>
                  <option value="cancelled">{tr("Cancelados")}</option>
                  <option value="pending_pin">{tr("Pendentes PIN")}</option>
                  <option value="expired_rejected">{tr("Expirados / Rejeitados")}</option>
                </select>
                <span className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400">
                  <ICONS.ChevronDown size={11} />
                </span>
              </div>

              {/* Date Selector */}
              <div className="relative flex-1 sm:flex-none">
                <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400 z-10">
                  <ICONS.Calendar size={11} className="text-slate-400" />
                </span>
                <div className="w-full sm:w-auto min-w-[150px] pl-8 pr-10 py-2.5 bg-white border border-slate-200/80 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-sm flex items-center justify-between min-h-[38px] max-h-[38px] cursor-pointer">
                  <span className="truncate">
                    {historyDate ? historyDate.split("-").reverse().join("/") : tr("Filtrar por data")}
                  </span>
                </div>
                <input
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                />
                <span className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 z-30">
                  {historyDate ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setHistoryDate("");
                      }}
                      className="hover:text-slate-600 active:scale-90 transition-all p-1"
                      title={tr("Limpar Data")}
                    >
                      <ICONS.X size={10} />
                    </button>
                  ) : (
                    <ICONS.ChevronDown size={11} className="pointer-events-none" />
                  )}
                </span>
              </div>

              {/* Sort Order */}
              <div className="relative flex-1 sm:flex-none">
                <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                  <ICONS.Calendar size={11} className="text-slate-400" />
                </span>
                <select
                  value={historySort}
                  onChange={(e: any) => setHistorySort(e.target.value)}
                  className="w-full sm:w-auto pl-8 pr-10 py-2.5 bg-white border border-slate-200/80 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 focus:outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="newest">{tr("Mais Recentes Primeiro")}</option>
                  <option value="oldest">{tr("Mais Antigos Primeiro")}</option>
                </select>
                <span className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400">
                  <ICONS.ChevronDown size={11} />
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {isLoading ? (
              [1, 2].map((n) => (
                <div
                  key={n}
                  className="bg-slate-50/40 p-4 md:p-5 rounded-xl border border-slate-100/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 animate-pulse"
                >
                  <div className="flex-1 text-left space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-14 h-4 bg-slate-200 rounded-md" />
                      <div className="w-16 h-3 bg-slate-100 rounded-full animate-pulse" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-4.5 w-1/2 bg-slate-200 rounded-full animate-pulse" />
                      <div className="flex items-center gap-1.5">
                        <div className="w-[14px] h-[14px] rounded-full bg-slate-150 animate-pulse" />
                        <div className="w-20 h-2.5 bg-slate-100 rounded-full animate-pulse" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-4">
                    <div className="w-14 h-5 bg-slate-200 rounded-full animate-pulse" />
                    <div className="flex items-center gap-1.5">
                      <div className="h-10 w-20 bg-white border border-slate-150 rounded-xl" />
                    </div>
                  </div>
                </div>
              ))
            ) : paginatedHistoryBookings.length > 0 ? (
              paginatedHistoryBookings.map((b) => (
                <HistoryBookingCard
                  key={b.id}
                  b={b}
                  reviews={reviews}
                  cooks={cooks}
                  getStatusLabel={getStatusLabel}
                  getStatusBadgeClass={getStatusBadgeClass}
                  onSelectDetail={setViewingDetail}
                  onReview={setReviewingBooking}
                />
              ))
            ) : (
              <div className="bg-slate-50/20 p-8 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tr("Nenhum serviço encontrado")}</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {historySearch || historyStatus !== "all" || historyDate
                    ? tr("Tente ajustar os seus filtros de pesquisa para encontrar o que procura.")
                    : tr("Ainda não completou nenhuma experiência nesta categoria.")}
                </p>
                {(historySearch || historyStatus !== "all" || historyDate) && (
                  <button
                    onClick={() => {
                      setHistorySearch("");
                      setHistoryStatus("all");
                      setHistoryDate("");
                    }}
                    className="mt-3 h-9 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all"
                  >
                    {tr("Limpar Filtros")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (() => {
            const maxVisible = 5;
            let start = Math.max(1, historyPage - Math.floor(maxVisible / 2));
            let end = start + maxVisible - 1;
            if (end > totalPages) {
              end = totalPages;
              start = Math.max(1, end - maxVisible + 1);
            }
            const visiblePages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

            return (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-6 gap-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {tr("A mostrar")} {Math.min(completedBookings.length, (historyPage - 1) * itemsPerPage + 1)}-{Math.min(completedBookings.length, historyPage * itemsPerPage)} de {completedBookings.length}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-hide">
                  <button
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed hover:bg-slate-50 active:scale-95 transition-all shrink-0"
                    title={tr("Página Anterior")}
                  >
                    <ICONS.ChevronLeft size={14} />
                  </button>

                  {start > 1 && (
                    <>
                      <button
                        onClick={() => setHistoryPage(1)}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-[10px] font-black text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all shrink-0"
                      >
                        1
                      </button>
                      {start > 2 && (
                        <span className="text-slate-400 text-xs px-0.5 font-bold select-none shrink-0">...</span>
                      )}
                    </>
                  )}

                  {visiblePages.map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setHistoryPage(pageNum)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all shrink-0 ${
                        historyPage === pageNum
                          ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  {end < totalPages && (
                    <>
                      {end < totalPages - 1 && (
                        <span className="text-slate-400 text-xs px-0.5 font-bold select-none shrink-0">...</span>
                      )}
                      <button
                        onClick={() => setHistoryPage(totalPages)}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-[10px] font-black text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all shrink-0"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}

                  <button
                    disabled={historyPage === totalPages}
                    onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed hover:bg-slate-50 active:scale-95 transition-all shrink-0"
                    title={tr("Próxima Página")}
                  >
                    <ICONS.ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
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
                      className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest italic border ${
                        viewingDetail.status === BookingStatus.COMPLETED
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : viewingDetail.status === BookingStatus.CANCELLED ||
                            viewingDetail.status === BookingStatus.CANCELLED_PARTIAL_REFUND
                            ? "bg-red-50 text-red-600 border-red-100"
                            : viewingDetail.status === BookingStatus.REJECTED
                              ? "bg-slate-100 text-slate-500 border-slate-200"
                              : isPastBooking(viewingDetail)
                                ? viewingDetail.status === BookingStatus.PENDING
                                  ? "bg-slate-100 text-slate-400 border-slate-200"
                                  : "bg-amber-50 text-amber-600 border-amber-100 animate-pulse"
                                : viewingDetail.status === BookingStatus.PENDING
                                  ? "bg-orange-500 text-white border-orange-600 animate-pulse"
                                  : viewingDetail.status === BookingStatus.ACCEPTED
                                    ? "bg-emerald-500 text-white border-emerald-600"
                                    : "bg-slate-950 text-white border-slate-900"
                      }`}
                    >
                      {getStatusLabel(viewingDetail)}
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
                        const avatarUrl = cooks?.find(
                          (u) => u.id === viewingDetail.cookId,
                        )?.avatar_url;
                        return avatarUrl ? (
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
                      <div className="space-y-3 animate-pulse" id="courses-skeleton">
                        {[1, 2, 3].map((n) => (
                          <div
                            key={n}
                            className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2"
                          >
                            <div className="h-2.5 w-16 bg-slate-200 rounded-full" />
                            <div className="h-3.5 w-full bg-slate-200 rounded-full" />
                          </div>
                        ))}
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

                  {/* Service PIN (if accepted or in progress) */}
                  {(viewingDetail.status === BookingStatus.ACCEPTED ||
                    viewingDetail.status === BookingStatus.IN_PROGRESS) &&
                    viewingDetail.service_pin && (
                      <div className="p-5 bg-emerald-50/55 border border-emerald-100 rounded-3xl flex items-center justify-between text-left">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <ICONS.ShieldCheck size={14} />
                            <span className="text-[8px] font-black uppercase tracking-widest italic leading-none">
                              {tr("PIN de Serviço Secreto")}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-[11px] font-black text-slate-900 uppercase">
                              {tr("Confirmação de Conclusão")}
                            </h4>
                            <p className="text-[9.5px] font-medium text-slate-500 leading-normal max-w-sm">
                              {tr("Forneça este código de 4 dígitos ao Chef apenas no final do serviço, para certificar que a experiência foi concluída com sucesso.")}
                            </p>
                          </div>
                          <div className="pt-1 flex items-center gap-2">
                            <span className="text-2xl font-black text-emerald-700 tracking-[0.4em] bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200/50 font-mono inline-block">
                              {viewingDetail.service_pin}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-3">
                <button
                  onClick={() => handleDownloadICS(viewingDetail)}
                  className="flex-1 min-h-[58px] py-4 px-6 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-full font-black text-xs md:text-sm uppercase tracking-widest transition-all active:scale-97 flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer"
                >
                  <Download size={14} />
                  {tr("Adicionar ao Calendário")}
                </button>
                {viewingDetail.status !== BookingStatus.COMPLETED &&
                  viewingDetail.status !== BookingStatus.CANCELLED &&
                  viewingDetail.status !== BookingStatus.REJECTED &&
                  viewingDetail.status !==
                    BookingStatus.CANCELLED_PARTIAL_REFUND &&
                  !isPastBooking(viewingDetail) && (
                    <button
                      onClick={() => {
                        setCancellingBooking(viewingDetail);
                        setViewingDetail(null);
                      }}
                      className="flex-1 min-h-[58px] py-4 px-6 bg-red-50 hover:bg-red-100 text-red-600 rounded-full font-black text-xs md:text-sm uppercase tracking-widest transition-all active:scale-97 border border-red-200/80 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      {tr("Cancelar Pedido")}
                    </button>
                  )}
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

export default React.memo(ClientAgenda);
