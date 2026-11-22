import React from "react";
import { ICONS } from "../constants";

interface PasswordStrengthProps {
  password?: string;
}

const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password = "" }) => {
  const currentPassword = password || "";

  const rules = [
    {
      id: "min_length",
      label: "Mínimo 8 caracteres",
      test: (p: string) => p.length >= 8,
    },
    {
      id: "uppercase",
      label: "Letra maiúscula (A-Z)",
      test: (p: string) => /[A-Z]/.test(p),
    },
    {
      id: "lowercase",
      label: "Letra minúscula (a-z)",
      test: (p: string) => /[a-z]/.test(p),
    },
    {
      id: "number",
      label: "Número (0-9)",
      test: (p: string) => /[0-9]/.test(p),
    },
    {
      id: "special",
      label: "Símbolo (!@#$%...)",
      test: (p: string) => /[^A-Za-z0-9]/.test(p),
    },
  ];

  const passedRulesCount = rules.filter((r) => r.test(currentPassword)).length;

  const strengthLabels = [
    "Não preenchida",
    "Muito Fraca",
    "Fraca",
    "Média",
    "Forte",
    "Excelente / Segura",
  ];

  const strengthColors = [
    "bg-slate-200 text-slate-400",
    "bg-red-500 text-red-600",
    "bg-orange-500 text-orange-600",
    "bg-amber-500 text-amber-600",
    "bg-emerald-500 text-emerald-600",
    "bg-emerald-600 text-emerald-700",
  ];

  return (
    <div className="mt-3.5 space-y-3 animate-in fade-in duration-300">
      {/* Strength Bar & Progress Label */}
      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 space-y-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
            <ICONS.ShieldCheck
              size={13}
              className={passedRulesCount === 5 ? "text-emerald-500 animate-bounce" : "text-slate-400"}
            />
            Regras da Palavra-passe
          </span>
          <span
            className={`text-[8px] font-black uppercase tracking-widest transition-all px-2 py-0.5 rounded-full ${
              currentPassword.length === 0
                ? "text-slate-400 bg-slate-100"
                : passedRulesCount === 5
                ? "text-emerald-700 bg-emerald-100 font-extrabold"
                : "text-amber-700 bg-amber-100 font-bold"
            }`}
          >
            {currentPassword.length === 0
              ? "POR PREENCHER (0/5)"
              : passedRulesCount === 5
              ? "VÁLIDA & CONCLUÍDA (5/5)"
              : `INCOMPLETA (${passedRulesCount}/5)`}
          </span>
        </div>

        {/* Dynamic Strength Bar Steps */}
        <div className="h-1.5 w-full bg-slate-200/60 rounded-full overflow-hidden flex gap-1 p-0.5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`h-full flex-1 rounded-full transition-all duration-300 ${
                step <= passedRulesCount
                  ? passedRulesCount === 5
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                  : "bg-slate-200/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Rules Checklist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rules.map((rule) => {
          const isMet = rule.test(currentPassword);
          return (
            <div
              key={rule.id}
              className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-200 ${
                isMet
                  ? "bg-emerald-50/90 border-emerald-200/90 shadow-2xs"
                  : "bg-slate-50/40 border-slate-100"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isMet
                      ? "bg-emerald-500 text-white shadow-xs scale-105"
                      : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {isMet ? (
                    <ICONS.Check size={11} strokeWidth={3} />
                  ) : (
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                  )}
                </div>
                <span
                  className={`text-[9.5px] tracking-tight transition-colors truncate ${
                    isMet ? "text-emerald-950 font-black" : "text-slate-400 font-bold"
                  }`}
                >
                  {rule.label}
                </span>
              </div>
              {isMet && (
                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-100/90 px-1.5 py-0.5 rounded-md shrink-0 ml-1">
                  Concluída
                </span>
              )}
            </div>
          );
        })}
      </div>

      {passedRulesCount < 5 && currentPassword.length > 0 && (
        <p className="text-[9px] font-bold text-amber-600/90 px-1 flex items-center gap-1">
          <ICONS.Info size={11} className="shrink-0" />
          Conclua todas as 5 regras para desbloquear o próximo passo.
        </p>
      )}
    </div>
  );
};

export default React.memo(PasswordStrength);

