import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  AlertTriangle,
  Info,
  Clock,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { Booking, BookingStatus } from "../types";
import { supabaseService } from "../services/supabaseService";

import { tr } from "../lib/tr";
import { useLanguage } from "../contexts/LanguageContext";
interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  userId: string;
  onSuccess: (message: string) => void;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({
  isOpen,
  onClose,
  booking,
  userId,
  onSuccess,
}) => {
  useLanguage();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [proposedDate, setProposedDate] = useState(booking.data);
  const [proposedTime, setProposedTime] = useState(booking.hora || "");
  const [showConfirmStep, setShowConfirmStep] = useState(false);
  const [consequence, setConsequence] = useState<{
    message: string;
    type: "free" | "partial" | "blocked";
    canCancel: boolean;
  }>({ message: "", type: "free", canCancel: true });

  const isChef = userId === booking.cookId;

  useEffect(() => {
    if (isOpen) {
      calculateConsequence();
      setIsRescheduling(false);
      setReason("");
      setProposedDate(booking.data);
      setProposedTime(booking.hora || "");
      setShowConfirmStep(false);
    }
  }, [isOpen, booking]);

  const calculateConsequence = () => {
    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.REJECTED
    ) {
      setConsequence({
        message: "Esta reserva já se encontra finalizada ou cancelada e não pode ser alterada.",
        type: "blocked",
        canCancel: false,
      });
      return;
    }

    if (isChef) {
      setConsequence({
        message:
          "Como Chef, pode cancelar a reserva a qualquer momento. O cliente será notificado e reembolsado se optar por cancelar.",
        type: "free",
        canCancel: true,
      });
      return;
    }

    const now = new Date();
    const bookingDateTime = new Date(
      `${booking.data}T${booking.hora || "23:59"}`,
    );
    const diffInMs = bookingDateTime.getTime() - now.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInMs < 0) {
      setConsequence({
        message: "Esta reserva já ocorreu (data no passado) e não pode ser cancelada.",
        type: "blocked",
        canCancel: false,
      });
      return;
    }

    if (
      booking.status === BookingStatus.PENDING ||
      booking.status === BookingStatus.QUOTE_REQUESTED
    ) {
      setConsequence({
        message: "Reserva/Orçamento pendente. O cancelamento é gratuito e imediato.",
        type: "free",
        canCancel: true,
      });
    } else if (
      booking.status === BookingStatus.ACCEPTED ||
      booking.status === BookingStatus.IN_PROGRESS ||
      booking.status === BookingStatus.RESCHEDULE_REQUESTED
    ) {
      if (diffInHours >= 48) {
        setConsequence({
          message:
            "Cancelamento com mais de 48h de antecedência. Reembolso integral ao cliente (100%).",
          type: "free",
          canCancel: true,
        });
      } else if (diffInHours >= 24) {
        setConsequence({
          message:
            "Cancelamento entre 24h e 48h de antecedência. Será aplicada uma taxa de retenção de 50% (reembolso de 50%).",
          type: "partial",
          canCancel: true,
        });
      } else {
        setConsequence({
          message:
            "Faltam menos de 24h para a reserva. O cancelamento automático está bloqueado. Por favor, contacte o suporte do Cookr ou o Chef diretamente no chat.",
          type: "blocked",
          canCancel: false,
        });
      }
    } else {
      setConsequence({
        message:
          "Esta reserva não pode ser cancelada automaticamente neste estado.",
        type: "blocked",
        canCancel: false,
      });
    }
  };

  const handleAction = async () => {
    setLoading(true);
    try {
      if (isRescheduling) {
        const result = await supabaseService.requestReschedule(
          booking.id,
          proposedDate,
          proposedTime,
          reason,
        );
        if (result.success) {
          onSuccess(result.message);
          onClose();
        }
      } else {
        const result = await supabaseService.handleCancellation(
          booking.id,
          userId,
          reason,
        );
        if (result.success) {
          onSuccess(result.message);
          onClose();
        } else {
          alert(result.message);
        }
      }
    } catch (error) {
      console.error("Erro na ação:", error);
      alert(tr("Ocorreu um erro ao processar o seu pedido."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] overflow-y-auto flex items-start sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden my-auto"
          >
            <div className="p-8">
              {showConfirmStep ? (
                <div className="animate-in fade-in duration-200">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-red-50 text-red-500 animate-pulse">
                        <AlertTriangle size={24} />
                      </div>
                      <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-950">
                        {isRescheduling ? tr("Confirmar Reagendamento") : tr("Confirmar Cancelamento")}
                      </h2>
                    </div>
                    <button
                      onClick={() => setShowConfirmStep(false)}
                      className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-300"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-4 my-6">
                    <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                      {isRescheduling
                        ? tr("Tem a certeza que deseja propor este novo horário ao cliente?")
                        : tr("Tem a certeza que deseja proceder com o cancelamento desta reserva?")}
                    </p>

                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600 space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                        <span className="uppercase text-[9px] tracking-wider text-slate-400">{tr("Estado Consequência")}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold ${
                          consequence.type === "free"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-orange-100 text-orange-700"
                        }`}>
                          {consequence.type === "free" ? tr("Sem Custos") : tr("Retenção de 50%")}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="uppercase text-[9px] tracking-wider text-slate-400">{tr("Reserva")}</span>
                        <span className="text-slate-950">{booking.menuNome || tr("Menu Especial")}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="uppercase text-[9px] tracking-wider text-slate-400">{tr("Data Original")}</span>
                        <span className="text-slate-950">{booking.data} {tr("às")} {booking.hora}</span>
                      </div>

                      {isRescheduling ? (
                        <div className="flex justify-between border-t border-slate-200/50 pt-2.5 mt-2">
                          <span className="uppercase text-[9px] tracking-wider text-orange-500 font-extrabold">{tr("Novo Horário Sugerido")}</span>
                          <span className="text-orange-600 font-black">{proposedDate} {tr("às")} {proposedTime}</span>
                        </div>
                      ) : (
                        reason && (
                          <div className="flex flex-col border-t border-slate-200/50 pt-2.5 mt-2 gap-1.5">
                            <span className="uppercase text-[9px] tracking-wider text-slate-400">{tr("Motivo Especificado")}</span>
                            <span className="text-slate-800 bg-white/90 p-3 rounded-xl border border-slate-100 italic font-medium leading-relaxed">
                              "{reason}"
                            </span>
                          </div>
                        )
                      )}
                    </div>

                    <div className="p-3 bg-red-50 rounded-xl text-[10px] text-red-600 font-extrabold uppercase tracking-tight flex items-center gap-2">
                      <Info size={14} className="shrink-0" />
                      <span>{tr("Esta ação é definitiva e não pode ser revertida.")}</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowConfirmStep(false)}
                      className="flex-1 min-h-[58px] py-4 rounded-full border border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-widest hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      {tr("Voltar")}
                    </button>
                    <button
                      onClick={handleAction}
                      disabled={loading}
                      className={`flex-1 min-h-[58px] py-4 rounded-full font-black uppercase text-[11px] tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50 cursor-pointer ${
                        isRescheduling
                          ? "bg-orange-500 text-white shadow-orange-200 hover:bg-orange-400"
                          : "bg-red-500 text-white shadow-red-200 hover:bg-red-400"
                      }`}
                    >
                      {loading ? tr("A processar...") : tr("Sim, Confirmar")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-3 rounded-2xl ${consequence.canCancel ? "bg-orange-50 text-orange-500" : "bg-red-50 text-red-500"}`}
                      >
                        <AlertTriangle size={24} />
                      </div>
                      <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-950">
                        {isRescheduling ? tr("Sugerir Horário") : tr("Cancelar Reserva")}
                      </h2>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-300"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div
                    className={`p-5 rounded-2xl mb-6 flex gap-4 ${
                      consequence.type === "free"
                        ? "bg-blue-50 text-blue-700"
                        : consequence.type === "partial"
                          ? "bg-orange-50 text-orange-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {consequence.type === "blocked" ? (
                        <AlertTriangle size={20} />
                      ) : (
                        <Info size={20} />
                      )}
                    </div>
                    <p className="text-[11px] font-bold leading-relaxed uppercase tracking-tight">
                      {consequence.message}
                    </p>
                  </div>

                  {consequence.canCancel && (
                    <div className="space-y-6">
                      {isChef && (
                        <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
                          <button
                            onClick={() => setIsRescheduling(false)}
                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!isRescheduling ? "bg-white text-slate-950 shadow-sm" : "text-slate-400"}`}
                          >
                            {tr("Cancelar")}
                          </button>
                          <button
                            onClick={() => setIsRescheduling(true)}
                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isRescheduling ? "bg-white text-slate-950 shadow-sm" : "text-slate-400"}`}
                          >
                            {tr("Reagendar")}
                          </button>
                        </div>
                      )}

                      {isRescheduling ? (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                              {tr("Nova Data")}
                            </label>
                            <input
                              type="date"
                              value={proposedDate}
                              onChange={(e) => setProposedDate(e.target.value)}
                              className="w-full h-12 px-4 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-orange-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                              {tr("Nova Hora")}
                            </label>
                            <input
                              type="time"
                              value={proposedTime}
                              onChange={(e) => setProposedTime(e.target.value)}
                              className="w-full h-12 px-4 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-orange-500 transition-all"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                            {isChef
                              ? tr("Explicação para o Cliente")
                              : tr("Motivo do Cancelamento (Opcional)")}
                          </label>
                          <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={
                              isChef
                                ? tr("Explique ao cliente o motivo do cancelamento ou sugira falar por chat...")
                                : tr("Ex: Mudança de planos, imprevisto...")
                            }
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-transparent focus:border-orange-500 outline-none transition-all resize-none h-28 text-xs font-bold"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[9px] font-black text-slate-400 bg-slate-50/50 p-4 rounded-2xl uppercase tracking-widest">
                        <Clock size={16} className="text-orange-500" />
                        <span>
                          {tr("Reserva original:")} {booking.data} {tr("às")} {booking.hora}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 flex gap-4">
                    <button
                      onClick={onClose}
                      className="flex-1 min-h-[58px] py-4 rounded-full border border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-widest hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      {tr("Voltar")}
                    </button>
                    {consequence.canCancel && (
                      <button
                        onClick={() => setShowConfirmStep(true)}
                        className={`flex-1 min-h-[58px] py-4 rounded-full font-black uppercase text-[11px] tracking-widest transition-all shadow-xl active:scale-95 cursor-pointer ${
                          isRescheduling
                            ? "bg-orange-500 text-white shadow-orange-200 hover:bg-orange-400"
                            : "bg-red-500 text-white shadow-red-200 hover:bg-red-400"
                        }`}
                      >
                        {tr("Confirmar")}
                      </button>
                    )}
                  </div>

                  {!consequence.canCancel && (
                    <button
                      onClick={() =>
                        (window.location.href = "mailto:suporte@cookr.pt")
                      }
                      className="w-full mt-4 min-h-[58px] py-4 rounded-full bg-slate-950 text-white font-black uppercase text-[11px] tracking-widest hover:bg-orange-500 transition-all shadow-xl cursor-pointer"
                    >
                      {tr("Contactar Suporte")}
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
