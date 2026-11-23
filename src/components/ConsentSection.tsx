import React, { Suspense, useState } from "react";
import { ICONS } from "../constants";
import { tr } from "../lib/tr";

const TermsConditions = React.lazy(() => import("./TermsConditions"));
const PrivacyPolicy = React.lazy(() => import("./PrivacyPolicy"));

export interface ConsentState {
  terms_accepted: boolean;
  privacy_accepted: boolean;
  age_confirmed: boolean;
  marketing_opt_in: boolean;
}

interface ConsentSectionProps {
  value: ConsentState;
  onChange: (next: ConsentState) => void;
  /** Texto adicional obrigatório (ex.: declaração do chef). */
  extra?: { id: string; checked: boolean; label: React.ReactNode; onToggle: () => void }[];
  /** Mostra aviso de tratamento de dados de saúde (alergias). */
  healthData?: boolean;
}

const Check: React.FC<{ checked: boolean; onClick: () => void; children: React.ReactNode; required?: boolean }> = ({
  checked,
  onClick,
  children,
  required,
}) => (
  <div className="flex items-start gap-3 text-left">
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
        checked ? "bg-orange-500 border-orange-500" : "border-slate-300 bg-white hover:border-orange-300"
      }`}
    >
      {checked && <ICONS.Check className="text-white" size={12} />}
    </button>
    <span className="text-xs leading-relaxed text-slate-600 font-medium">
      {children}
      {required && <span className="text-orange-500 ml-1">*</span>}
    </span>
  </div>
);

const ConsentSection: React.FC<ConsentSectionProps> = ({ value, onChange, extra, healthData }) => {
  const [legal, setLegal] = useState<null | "terms" | "privacy">(null);
  const set = (patch: Partial<ConsentState>) => onChange({ ...value, ...patch });

  const linkCls = "font-bold text-slate-900 underline underline-offset-2 hover:text-orange-500 cursor-pointer";

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
      <Check checked={value.terms_accepted && value.privacy_accepted} required onClick={() => {
        const next = !(value.terms_accepted && value.privacy_accepted);
        set({ terms_accepted: next, privacy_accepted: next });
      }}>
        {tr("Li e aceito os")}{" "}
        <span className={linkCls} onClick={(e) => { e.stopPropagation(); setLegal("terms"); }}>
          {tr("Termos e Condições")}
        </span>{" "}
        {tr("e a")}{" "}
        <span className={linkCls} onClick={(e) => { e.stopPropagation(); setLegal("privacy"); }}>
          {tr("Política de Privacidade")}
        </span>
        .
      </Check>

      <Check checked={value.age_confirmed} required onClick={() => set({ age_confirmed: !value.age_confirmed })}>
        {tr("Confirmo que tenho 18 anos ou mais.")}
      </Check>

      {extra?.map((e) => (
        <Check key={e.id} checked={e.checked} required onClick={e.onToggle}>
          {e.label}
        </Check>
      ))}

      <Check checked={value.marketing_opt_in} onClick={() => set({ marketing_opt_in: !value.marketing_opt_in })}>
        {tr("Quero receber novidades e ofertas da Cookr (opcional). Posso cancelar a qualquer momento.")}
      </Check>

      {healthData && (
        <p className="text-[11px] leading-relaxed text-slate-400 pl-8">
          {tr("As alergias e restrições que indicar são dados de saúde: são usadas apenas para garantir a sua segurança alimentar e partilhadas com o chef da sua reserva.")}
        </p>
      )}

      {legal && (
        <div className="fixed inset-0 z-[1300] bg-white overflow-y-auto" role="dialog" aria-modal="true">
          <Suspense fallback={<div className="p-10 text-center text-sm text-slate-400">…</div>}>
            {legal === "terms" ? (
              <TermsConditions onBack={() => setLegal(null)} />
            ) : (
              <PrivacyPolicy onBack={() => setLegal(null)} />
            )}
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default ConsentSection;
