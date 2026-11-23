import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Check, AlertCircle, Info, X, Sparkles, ChefHat } from "lucide-react";

import { tr } from "../lib/tr";
import { useLanguage } from "../contexts/LanguageContext";
export interface Toast {
  id: string;
  message: string;
  type: "error" | "success" | "info" | "new_order";
}

interface PremiumToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const formatNotificationMessage = (msg: string): string => {
  if (!msg) return "";
  let formatted = msg;
  
  // 1. Convert all-caps messages to beautifully readable Sentence Case
  if (formatted === formatted.toUpperCase() && formatted.length > 5) {
    formatted = formatted.toLowerCase();
    // Capitalize first letter of sentences/exclamations
    formatted = formatted.replace(/(^\s*|[.!?]\s+)([a-zà-ÿ])/g, (match, separator, char) => {
      return separator + char.toUpperCase();
    });
  }

  // 2. Format ISO Dates (e.g. 2026-06-18) into readable Portuguese date
  const dateRegex = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  formatted = formatted.replace(dateRegex, (match, y, m, d) => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const monthIdx = parseInt(m, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${parseInt(d, 10)} de ${months[monthIdx]}`;
    }
    return match;
  });

  return formatted;
};

const getToastMeta = (type: string, message: string) => {
  const msgLower = message.toLowerCase();
  
  if (type === "new_order" || msgLower.includes("novo pedido")) {
    return {
      title: "Novo Pedido",
      subTitle: "Ritual solicitado",
      colorClass: "from-orange-500 to-amber-600",
      accentColor: "border-orange-500/20",
      iconBg: "bg-orange-500/10 border border-orange-500/20",
      iconColor: "text-orange-400",
      progressBg: "bg-orange-500",
      glowColor: "shadow-orange-500/20",
      duration: 15000,
    };
  }
  
  if (type === "error" || msgLower.includes("erro") || msgLower.includes("cancelado") || msgLower.includes("recusou")) {
    return {
      title: msgLower.includes("cancelado") ? "Cancelamento" : "Alerta",
      subTitle: msgLower.includes("cancelado") ? "Reserva cancelada" : "Atenção necessária",
      colorClass: "from-rose-500 to-red-600",
      accentColor: "border-rose-500/20",
      iconBg: "bg-rose-500/10 border border-rose-500/20",
      iconColor: "text-rose-400",
      progressBg: "bg-rose-500",
      glowColor: "shadow-rose-500/20",
      duration: 6000,
    };
  }
  
  if (type === "success" || msgLower.includes("sucesso") || msgLower.includes("confirmado") || msgLower.includes("excelente") || msgLower.includes("bem-vindo")) {
    return {
      title: msgLower.includes("bem-vindo") ? "Sessão Iniciada" : "Sucesso",
      subTitle: msgLower.includes("bem-vindo") ? "Bem-vindo à Cookr" : "Ação concluída",
      colorClass: "from-emerald-500 to-teal-600",
      accentColor: "border-emerald-500/20",
      iconBg: "bg-emerald-500/10 border border-emerald-500/20",
      iconColor: "text-emerald-400",
      progressBg: "bg-emerald-400",
      glowColor: "shadow-emerald-500/20",
      duration: 5000,
    };
  }

  return {
    title: "Notificação",
    subTitle: "Informação de sistema",
    colorClass: "from-sky-500 to-indigo-600",
    accentColor: "border-sky-500/20",
    iconBg: "bg-slate-800 border border-slate-700",
    iconColor: "text-sky-400",
    progressBg: "bg-sky-400",
    glowColor: "shadow-sky-500/20",
    duration: 5000,
  };
};

export const PremiumToast: React.FC<PremiumToastProps> = ({ toast, onClose }) => {
  useLanguage();
  const meta = useMemo(() => getToastMeta(toast.type, toast.message), [toast.type, toast.message]);
  const displayMsg = useMemo(() => formatNotificationMessage(toast.message), [toast.message]);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / meta.duration) * 100);
      setProgress(remaining);
      if (elapsed >= meta.duration) {
        clearInterval(interval);
        onClose(toast.id);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [meta.duration, toast.id, onClose]);

  // Select icon dynamically
  const renderIcon = () => {
    const msgLower = toast.message.toLowerCase();
    if (toast.type === "new_order" || msgLower.includes("pedido")) {
      return <ChefHat size={16} className="animate-bounce" />;
    }
    if (toast.type === "error" || msgLower.includes("cancelado")) {
      return <AlertCircle size={16} />;
    }
    if (toast.type === "success" || msgLower.includes("sucesso")) {
      return <Check size={16} className="scale-110" />;
    }
    if (msgLower.includes("bem-vindo")) {
      return <Sparkles size={16} className="animate-pulse" />;
    }
    return <Info size={16} />;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } }}
      className={`relative w-full overflow-hidden rounded-2xl bg-slate-900/95 border border-white/10 text-white shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-white/15 ${meta.glowColor} pointer-events-auto group p-4 flex gap-3.5`}
    >
      {/* Icon frame with custom soft ambient glow */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg} ${meta.iconColor} shadow-inner`}>
        {renderIcon()}
      </div>

      {/* Main information content */}
      <div className="flex-1 text-left select-none pr-4">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-[9px] font-black tracking-widest text-slate-200 uppercase">
            {tr(meta.title as any) as any}
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
            {meta.subTitle}
          </span>
        </div>
        <p className="font-semibold text-[10.5px] text-slate-300 leading-relaxed mt-1 tracking-tight">
          {displayMsg}
        </p>
      </div>

      {/* Modern interactive close button */}
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="absolute top-3 right-3 w-5 h-5 rounded-md bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
        aria-label={tr("Dismiss notification")}
      >
        <X size={10} />
      </button>

      {/* High-end smooth progress timeline indicator */}
      <div className="absolute bottom-0 left-0 w-full h-[2.5px] bg-white/5">
        <div
          className={`h-full ${meta.progressBg} transition-all ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
};

interface PremiumToastContainerProps {
  toasts: Toast[];
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
}

export const PremiumToastContainer: React.FC<PremiumToastContainerProps> = ({ toasts, setToasts }) => {
  const handleClose = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div aria-live="polite" role="status" className="fixed top-[calc(env(safe-area-inset-top,0px)+1rem)] left-1/2 -translate-x-1/2 z-[20000] flex flex-col gap-2.5 pointer-events-none w-full max-w-[340px] px-4">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <PremiumToast key={toast.id} toast={toast} onClose={handleClose} />
        ))}
      </AnimatePresence>
    </div>
  );
};
