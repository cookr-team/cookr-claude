import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ICONS, PORTUGAL_CITIES } from "../constants";
import PasswordStrength from "./PasswordStrength";
import { formatPostalCode } from "../utils/formatters";
import {
  isValidEmail,
  isValidPhone,
  isValidNIF,
  isValidPostalCode,
  isValidName,
  formatPhoneInput,
  LEGAL_VERSION,
} from "../utils/validators";
import ConsentSection, { ConsentState } from "./ConsentSection";

import { tr } from "../lib/tr";
import { useLanguage } from "../contexts/LanguageContext";
interface ClientOnboardingProps {
  onComplete: (data: any) => void;
  onBack: () => void;
}

const ClientOnboarding: React.FC<ClientOnboardingProps> = ({
  onComplete,
  onBack,
}) => {
  useLanguage();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isAccountCreated, setIsAccountCreated] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    password: "",
    nif: "",
    fiscal_name: "",
    billing_street: "",
    billing_number: "",
    billing_floor: "",
    billing_zip: "",
    billing_city: "",
    billing_country: "Portugal",
    use_as_main_address: true,
    cidade: "",
    morada: "",
    zip_code: "",
    dietary_restrictions: [] as string[],
    cuisine_preferences: [] as string[],
    kitchenNotes: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const [consents, setConsents] = useState<ConsentState>({
    terms_accepted: false,
    privacy_accepted: false,
    age_confirmed: false,
    marketing_opt_in: false,
  });
  const consentsOk = consents.terms_accepted && consents.privacy_accepted && consents.age_confirmed;
  const FieldError: React.FC<{ show: boolean; msg: string }> = ({ show, msg }) =>
    show ? <p role="alert" className="text-[11px] text-red-500 font-medium ml-2 mt-1">{msg}</p> : null;

  const accountOk =
    isValidName(formData.nome) &&
    isValidEmail(formData.email) &&
    isValidPhone(formData.telefone);
  // Faturação é opcional; se o NIF for preenchido tem de estar completo e válido.
  const fiscalFilled = !!formData.nif.trim();
  const fiscalOk =
    !fiscalFilled ||
    (isValidNIF(formData.nif) &&
      !!formData.billing_street.trim() &&
      isValidPostalCode(formData.billing_zip) &&
      !!formData.billing_city);
  const addressOk =
    !!formData.cidade && !!formData.morada.trim() && isValidPostalCode(formData.zip_code);

  const isPasswordStrong = (p: string) => {
    if (!p) return false;
    const rules = [
      p.length >= 8,
      /[A-Z]/.test(p),
      /[a-z]/.test(p),
      /[0-9]/.test(p),
      /[^A-Za-z0-9]/.test(p),
    ];
    return rules.every(Boolean); // Requires ALL 5 rules (100% complete) to advance
  };

  const formatZipCode = (value: string) => {
    return formatPostalCode(value);
  };

  const handleComplete = async () => {
    if (accountOk && isPasswordStrong(formData.password) && fiscalOk && addressOk && consentsOk) {
      setIsSubmitting(true);
      try {
        const success = await onComplete({
          ...formData,
          email: formData.email.trim().toLowerCase(),
          nome: formData.nome.trim().replace(/\s+/g, " "),
          consents: {
            ...consents,
            version: LEGAL_VERSION,
            accepted_at: new Date().toISOString(),
          },
        });
        if (success) {
          setIsAccountCreated(true);
          // O ecrã de sucesso fica visível por 3 segundos antes do redirecionamento (que é controlado pelo App.tsx mas aqui garantimos a visualização)
          await new Promise((resolve) => setTimeout(resolve, 3500));
        }
      } catch (error) {
        console.error("Erro ao finalizar registo:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const steps = [
    { id: 1, label: "Conta" },
    { id: 2, label: "Fiscal" },
    { id: 3, label: "Morada" },
    { id: 4, label: "Gostos" },
  ];

  const dietaryOptions = [
    "Vegetariano",
    "Vegan",
    "Keto",
    "Sem Glúten",
    "Paleo",
    "Low Carb",
    "Sem Lactose",
    "Sem Frutos Secos",
    "Sem Marisco",
    "Sem Peixe",
    "Sem Ovos",
    "Sem Soja",
  ];
  const cuisineOptions = [
    "Italiana",
    "Japonesa",
    "Portuguesa",
    "Francesa",
    "Mexicana",
    "Mediterrânea",
    "Indiana",
    "Tailandesa",
  ];

  const progress = (step / 4) * 100;

  return (
    <div className="min-h-dvh bg-slate-50/30 flex flex-col items-center py-12 px-6 animate-in fade-in duration-700">
      {/* Premium Account Creation Overlay */}
      <AnimatePresence>
        {isAccountCreated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="relative mb-12">
              {/* Animated Rings */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="w-32 h-32 border-t-2 border-r-2 border-orange-500 rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 w-32 h-32 border-b-2 border-l-2 border-slate-950 rounded-full scale-75"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <ICONS.CheckCircle
                  className="text-emerald-500 animate-pulse"
                  size={40}
                />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-4xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">
                {tr("Estamos a criar a")} <br />
                {tr("sua conta")} <span className="text-orange-500">{tr("Premium.")}</span>
              </h2>
              <p className="text-xs font-medium text-slate-400 italic tracking-widest uppercase">
                {tr("A preparar a sua experiência gastronómica exclusiva...")}
              </p>
            </motion.div>

            {/* Subtle Progress Bar */}
            <div className="mt-16 w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 3 }}
                className="h-full bg-orange-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-12 gap-4 mt-2">
        <button
          onClick={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              onBack();
            }
          }}
          className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-950 hover:scale-105 transition-all shadow-md shadow-slate-100 border border-slate-100 cursor-pointer"
        >
          <ICONS.ChevronLeft size={20} />
        </button>
        
        {/* Responsive Stepper directly in the header flow */}
        <div className="flex items-center gap-3 sm:gap-6">
          {steps.map((s) => (
            <button
              key={s.id}
              onClick={() => s.id < step && setStep(s.id)}
              disabled={s.id >= step}
              className="relative flex flex-col items-center group disabled:cursor-default"
            >
              <div
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center text-[10px] sm:text-[11px] font-black transition-all duration-500 ${
                  step === s.id
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105 rotate-3"
                    : step > s.id
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10"
                      : "bg-white text-slate-300 border border-slate-100"
                } ${s.id < step ? "group-hover:scale-105 transition-transform" : ""}`}
              >
                {step > s.id ? <ICONS.CheckCircle size={14} className="sm:size-4" /> : s.id}
              </div>
              <div
                className={`absolute -bottom-5 text-[7px] font-black uppercase tracking-widest transition-opacity duration-300 whitespace-nowrap ${step === s.id ? "opacity-100 text-orange-500" : "opacity-0"}`}
              >
                {tr(s.label as any) as any}
              </div>
            </button>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{tr("Cliente")}</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden relative animate-in slide-in-from-bottom-8 duration-700">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-50">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]"
          />
        </div>

        <div className="p-6 sm:p-10 text-center">
          <AnimatePresence mode="wait">
            {/* Phase 1: Account */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto border border-slate-100/50 shadow-inner">
                  <ICONS.Users className="text-slate-300" size={24} />
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">
                    {tr("Criar Conta")} <span className="text-orange-500">{tr("Segura.")}</span>
                  </h2>
                  <p className="text-[11px] font-medium text-slate-400 italic">
                    {tr("Inicie a sua jornada gastronómica privada.")}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        {tr("Nome Completo")}
                      </label>
                      <input
                        autoComplete="name"
                        maxLength={80}
                        className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                        placeholder={tr("Nome")}
                        value={formData.nome}
                        onBlur={() => touch("nome")}
                        onChange={(e) =>
                          setFormData({ ...formData, nome: e.target.value })
                        }
                      />
                      <FieldError show={!!touched.nome && !isValidName(formData.nome)} msg={tr("Indique o seu nome.")} />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        {tr("Telemóvel")}
                      </label>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                        placeholder={tr("9xx xxx xxx")}
                        value={formData.telefone}
                        onBlur={() => touch("telefone")}
                        onChange={(e) =>
                          setFormData({ ...formData, telefone: formatPhoneInput(e.target.value) })
                        }
                      />
                      <FieldError show={!!touched.telefone && !isValidPhone(formData.telefone)} msg={tr("Indique um telemóvel válido (ex.: 912 345 678).")} />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      {tr("Email")}
                    </label>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                      placeholder={tr("seu@email.com")}
                      value={formData.email}
                      onBlur={() => touch("email")}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                    <FieldError show={!!touched.email && !isValidEmail(formData.email)} msg={tr("Indique um email válido.")} />
                  </div>
                  <div className="space-y-1.5 text-left relative">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      {tr("Palavra-passe")}
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                      placeholder={tr("Mínimo 8 caracteres")}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? tr("Ocultar palavra-passe") : tr("Mostrar palavra-passe")}
                      className="absolute right-4 bottom-3 text-slate-300 hover:text-slate-950 transition-colors"
                    >
                      {showPassword ? (
                        <ICONS.EyeOff size={16} />
                      ) : (
                        <ICONS.Eye size={16} />
                      )}
                    </button>
                  </div>

                  <PasswordStrength password={formData.password} />
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!accountOk || !isPasswordStrong(formData.password)}
                  className="w-full h-13 bg-slate-950 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-orange-500 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none transition-all active:scale-[0.98]"
                >
                  {tr("Continuar para Dados Fiscais")}
                </button>
              </motion.div>
            )}

            {/* Phase 2: Fiscal */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto border border-slate-100/50 shadow-inner">
                  <ICONS.Briefcase className="text-slate-300" size={24} />
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">
                    {tr("Dados de")} <span className="text-orange-500">{tr("Faturação.")}</span>
                  </h2>
                  <p className="text-[11px] font-medium text-slate-400 italic">
                    {tr("Opcional: só é necessário se quiser fatura com NIF. Pode saltar e adicionar mais tarde no perfil.")}
                  </p>
                </div>

                <div className="space-y-4 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        {tr("NIF")}
                      </label>
                      <input
                        inputMode="numeric"
                        maxLength={9}
                        className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                        placeholder={tr("Ex: 123456789")}
                        value={formData.nif}
                        onBlur={() => touch("nif")}
                        onChange={(e) =>
                          setFormData({ ...formData, nif: e.target.value.replace(/\D/g, "").slice(0, 9) })
                        }
                      />
                      <FieldError show={!!touched.nif && fiscalFilled && !isValidNIF(formData.nif)} msg={tr("NIF inválido. Confirme os 9 dígitos.")} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        {tr("Nome Fiscal (Opcional)")}
                      </label>
                      <input
                        className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                        placeholder={tr("Nome para faturação")}
                        value={formData.fiscal_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            fiscal_name: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      {tr("Morada de Faturação Premium")}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-2">
                          {tr("Rua / Avenida")}
                        </label>
                        <input
                          className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                          placeholder={tr("Nome da rua")}
                          value={formData.billing_street}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              billing_street: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-2">
                          {tr("Nº / Porta")}
                        </label>
                        <input
                          className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                          placeholder={tr("Ex: 12A")}
                          value={formData.billing_number}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              billing_number: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-2">
                          {tr("Andar / Apart.")}
                        </label>
                        <input
                          className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                          placeholder={tr("Opcional")}
                          value={formData.billing_floor}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              billing_floor: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-2">
                          {tr("Cód. Postal")}
                        </label>
                        <input
                          className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                          placeholder="0000-000"
                          value={formData.billing_zip}
                          maxLength={8}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              billing_zip: formatZipCode(e.target.value),
                            })
                          }
                          onBlur={() => touch("billing_zip")}
                        />
                        <FieldError show={!!touched.billing_zip && fiscalFilled && !isValidPostalCode(formData.billing_zip)} msg={tr("Formato 0000-000.")} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-2">
                          {tr("Cidade")}
                        </label>
                        <div className="relative">
                          <select
                            className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all text-slate-900 appearance-none cursor-pointer"
                            value={formData.billing_city}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                billing_city: e.target.value,
                              })
                            }
                          >
                            <option value="">{tr("Selecionar")}</option>
                            {PORTUGAL_CITIES.map((city) => (
                              <option key={city} value={city}>
                                {city}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ICONS.ChevronDown size={14} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-2">
                        {tr("País")}
                      </label>
                      <input
                        className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                        placeholder={tr("Portugal")}
                        value={formData.billing_country}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            billing_country: e.target.value,
                          })
                        }
                      />
                    </div>

                    <button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          use_as_main_address: !formData.use_as_main_address,
                        })
                      }
                      className="flex items-center gap-2.5 mt-2 group cursor-pointer"
                    >
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                          formData.use_as_main_address
                            ? "bg-orange-500 border-orange-500"
                            : "border-slate-200 group-hover:border-orange-200"
                        }`}
                      >
                        {formData.use_as_main_address && (
                          <ICONS.Check className="text-white" size={12} />
                        )}
                      </div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        {tr("Usar como morada principal de serviço")}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="h-13 px-8 bg-white border border-slate-100 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    {tr("Voltar")}
                  </button>
                  <button
                    onClick={() => {
                      if (formData.use_as_main_address && fiscalFilled) {
                        setFormData({
                          ...formData,
                          morada: `${formData.billing_street}${formData.billing_number ? ", " + formData.billing_number : ""}${formData.billing_floor ? ", " + formData.billing_floor : ""}`,
                          cidade: formData.billing_city,
                          zip_code: formData.billing_zip,
                        });
                      }
                      setStep(3);
                    }}
                    disabled={!fiscalOk}
                    className="flex-1 h-13 bg-slate-950 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-orange-500 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none transition-all cursor-pointer"
                  >
                    {fiscalFilled ? tr("Próximo Passo") : tr("Saltar por agora")}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Phase 3: Address */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto border border-slate-100/50 shadow-inner">
                  <ICONS.MapPin className="text-slate-300" size={24} />
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">
                    {tr("Onde o")} <span className="text-orange-500">{tr("Chef vai?")}</span>
                  </h2>
                  <p className="text-[11px] font-medium text-slate-400 italic">
                    {tr("Indique a morada onde as experiências acontecem.")}
                  </p>
                </div>

                <div className="space-y-4 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        {tr("Cidade")}
                      </label>
                      <div className="relative">
                        <select
                          className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all text-slate-900 appearance-none cursor-pointer"
                          value={formData.cidade}
                          onChange={(e) =>
                            setFormData({ ...formData, cidade: e.target.value })
                          }
                        >
                          <option value="">{tr("Selecionar")}</option>
                          {PORTUGAL_CITIES.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ICONS.ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        {tr("Código Postal")}
                      </label>
                      <input
                        inputMode="numeric"
                        autoComplete="postal-code"
                        className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                        placeholder="0000-000"
                        value={formData.zip_code}
                        maxLength={8}
                        onBlur={() => touch("zip_code")}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            zip_code: formatZipCode(e.target.value),
                          })
                        }
                      />
                      <FieldError show={!!touched.zip_code && !isValidPostalCode(formData.zip_code)} msg={tr("Formato 0000-000.")} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      {tr("Morada Principal")}
                    </label>
                    <input
                      className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                      autoComplete="street-address"
                      placeholder={tr("Rua, número, andar (onde o Chef deve cozinhar)")}
                      value={formData.morada}
                      onChange={(e) =>
                        setFormData({ ...formData, morada: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(2)}
                    className="h-13 px-8 bg-white border border-slate-100 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    {tr("Voltar")}
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    disabled={!addressOk}
                    className="flex-1 h-13 bg-slate-950 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-orange-500 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none transition-all cursor-pointer"
                  >
                    {tr("Personalizar Gostos")}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Phase 4: Preferences */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto border border-slate-100/50 shadow-inner">
                  <ICONS.Heart className="text-slate-300" size={24} />
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">
                    {tr("As Tuas")} <span className="text-orange-500">{tr("Preferências.")}</span>
                  </h2>
                  <p className="text-[11px] font-medium text-slate-400 italic">
                    {tr("Ajude-nos a personalizar os seus menus.")}
                  </p>
                </div>

                <div className="space-y-5 text-left">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      {tr("Restrições Alimentares")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {dietaryOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            const current = formData.dietary_restrictions;
                            const updated = current.includes(opt)
                              ? current.filter((o) => o !== opt)
                              : [...current, opt];
                            setFormData({
                              ...formData,
                              dietary_restrictions: updated,
                            });
                          }}
                          className={`h-10 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                            formData.dietary_restrictions.includes(opt)
                              ? "bg-orange-500 text-white border-orange-500 shadow-md scale-[1.02]"
                              : "bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {tr(opt as any) as any}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      {tr("Cozinhas Favoritas")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {cuisineOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            const current = formData.cuisine_preferences;
                            const updated = current.includes(opt)
                              ? current.filter((o) => o !== opt)
                              : [...current, opt];
                            setFormData({
                              ...formData,
                              cuisine_preferences: updated,
                            });
                          }}
                          className={`h-10 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                            formData.cuisine_preferences.includes(opt)
                              ? "bg-slate-950 text-white border-slate-950 shadow-md scale-[1.02]"
                              : "bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {tr(opt as any) as any}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      {tr("Notas sobre a sua Cozinha")}
                    </label>
                    <textarea
                      className="w-full h-24 p-4 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all resize-none placeholder:text-slate-300"
                      placeholder={tr("Ex: Tenho forno a gás, placa de indução, etc.")}
                      value={formData.kitchenNotes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          kitchenNotes: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <ConsentSection value={consents} onChange={setConsents} healthData />

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(3)}
                    className="h-13 px-8 bg-white border border-slate-100 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    {tr("Voltar")}
                  </button>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isSubmitting || !consentsOk}
                    className={`flex-1 h-13 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all flex items-center justify-center gap-2.5 ${
                      !isSubmitting && consentsOk
                        ? "bg-slate-950 text-white hover:bg-orange-500 active:scale-[0.98] cursor-pointer"
                        : "bg-slate-100 text-slate-300 cursor-not-allowed"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <ICONS.RefreshCw size={14} className="animate-spin" />
                        {tr("A Processar...")}
                      </>
                    ) : (
                      tr("Finalizar Registo")
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-md overflow-hidden relative"
              id="client-confirm-onboarding-modal"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-orange-50 text-orange-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user-check"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                </div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-950">
                  {tr("Confirmar Registo")}
                </h3>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                  {tr("Tem a certeza de que deseja finalizar o seu registo de cliente na Cookr? Por favor, confirme se os seus dados estão corretos.")}
                </p>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="uppercase text-[9px] tracking-wider text-slate-400">{tr("Nome")}</span>
                    <span className="text-slate-950">{formData.nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="uppercase text-[9px] tracking-wider text-slate-400">{tr("E-mail")}</span>
                    <span className="text-slate-950 text-right break-all">{formData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="uppercase text-[9px] tracking-wider text-slate-400">{tr("Telefone")}</span>
                    <span className="text-slate-950">{formData.telefone}</span>
                  </div>
                  {formData.nif && (
                    <div className="flex justify-between">
                      <span className="uppercase text-[9px] tracking-wider text-slate-400">{tr("NIF")}</span>
                      <span className="text-slate-950">{formData.nif}</span>
                    </div>
                  )}
                  {formData.billing_city && (
                    <div className="flex justify-between">
                      <span className="uppercase text-[9px] tracking-wider text-slate-400">{tr("Cidade")}</span>
                      <span className="text-slate-950">{formData.billing_city}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 h-14 rounded-2xl border border-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all cursor-pointer"
                >
                  {tr("Rever Dados")}
                </button>
                <button
                  onClick={async () => {
                    setShowConfirmModal(false);
                    await handleComplete();
                  }}
                  className="flex-1 h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-orange-100 active:scale-95 cursor-pointer"
                >
                  {tr("Sim, Registar")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientOnboarding;
