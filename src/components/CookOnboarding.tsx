import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ICONS, CUISINES, PLATFORM_NAME, PORTUGAL_CITIES } from "../constants";
import Logo from "./Logo";
import PasswordStrength from "./PasswordStrength";
import { FileText, Check, ShieldCheck } from "lucide-react";
import { formatPostalCode } from "../utils/formatters";

import { tr } from "../lib/tr";
import { useLanguage } from "../contexts/LanguageContext";
interface CookOnboardingProps {
  onComplete: (data: any) => void;
  onBack: () => void;
  onFinish?: () => void;
  onLogin?: () => void;
  onJoin?: () => void;
}

const CookOnboarding: React.FC<CookOnboardingProps> = ({
  onComplete,
  onBack,
  onLogin,
  onJoin,
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
    password: "",
    telefone: "",
    biografia: "",
    especialidades: [] as string[],
    experiencia: 1,
    cidade: "Lisboa",
    nif: "",
    fiscal_name: "",
    billing_street: "",
    billing_number: "",
    billing_floor: "",
    billing_zip: "",
    billing_city: "",
    billing_country: "Portugal",
    use_as_main_address: true,
    diferenciais: [] as string[],
    equipamento: [] as string[],
    idiomas: ["português"] as string[],
    morada: "",
    zip_code: "",
    haccp_accepted: false,
    terms_accepted: false,
  });

  const formatZipCode = (value: string) => {
    return formatPostalCode(value);
  };

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

  const handleComplete = async () => {
    if (
      formData.nome &&
      formData.email &&
      isPasswordStrong(formData.password)
    ) {
      setIsSubmitting(true);
      try {
        const fullBillingStreet = [
          formData.billing_street,
          formData.billing_number ? `nº ${formData.billing_number}` : "",
          formData.billing_floor
        ].filter(Boolean).join(", ").trim();

        const fullBillingAddress = fullBillingStreet || formData.morada;
        const resolvedBillingCity = formData.billing_city || formData.cidade || "Lisboa";
        const resolvedBillingZip = formData.billing_zip || formData.zip_code;
        const resolvedMorada = formData.morada || fullBillingAddress;
        const resolvedZip = formData.zip_code || resolvedBillingZip;
        const resolvedCity = formData.cidade || resolvedBillingCity;
        const resolvedFiscalName = formData.fiscal_name || formData.nome;

        const preparedData = {
          ...formData,
          morada: resolvedMorada,
          zip_code: resolvedZip,
          cidade: resolvedCity,
          fiscal_name: resolvedFiscalName,
          billing_address: fullBillingAddress,
          billing_city: resolvedBillingCity,
          billing_zip: resolvedBillingZip,
          billing_country: formData.billing_country || "Portugal",
        };

        const success = await onComplete(preparedData);
        if (success) {
          setIsAccountCreated(true);
          // O ecrã de sucesso fica visível por 3.5 segundos antes do redirecionamento
          await new Promise((resolve) => setTimeout(resolve, 3500));
        }
      } catch (error) {
        console.error("Erro ao finalizar registo do chef:", error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      alert(
        "Por favor, preencha todos os campos obrigatórios e garanta uma palavra-passe segura.",
      );
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const isStepValid = (s: number) => {
    switch (s) {
      case 1:
        return (
          formData.nome &&
          formData.email &&
          isPasswordStrong(formData.password) &&
          formData.telefone
        );
      case 2:
        return formData.experiencia > 0 && formData.nif && formData.cidade;
      case 5:
        return formData.morada && formData.zip_code && formData.terms_accepted;
      default:
        return true;
    }
  };

  const progress = (step / 5) * 100;

  return (
    <div className="min-h-dvh bg-slate-50/30 flex flex-col animate-in fade-in duration-700">
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
                {tr("Estamos a criar a sua")} <br />
                {tr("conta de")} <span className="text-orange-500">{tr("Chef Premium.")}</span>
              </h2>
              <p className="text-xs font-medium text-slate-400 italic tracking-widest uppercase">
                {tr("A preparar o seu perfil profissional exclusivo...")}
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

      {/* Top Navigation */}
      <nav className="w-full px-6 py-6 md:px-16 flex justify-between items-center bg-white border-b border-slate-50">
        <button
          onClick={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              onBack();
            }
          }}
          className="group flex items-center gap-2 cursor-pointer"
        >
          <Logo size="sm" />
          <span className="hidden sm:inline-block text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
            {tr("Passo")} {step} {tr("de 5")}
          </span>
        </button>
        <div className="flex items-center gap-6">
          <button
            onClick={onLogin}
            className="text-[10px] font-black uppercase tracking-widest text-slate-950 hover:text-orange-500 transition-colors"
          >
            {tr("Entrar")}
          </button>
          <button
            onClick={onJoin}
            className="px-6 py-2.5 bg-slate-950 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-orange-500 transition-all"
          >
            {tr("Aderir")}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center py-12 px-6">
        {/* Horizontal Stepper */}
        <div className="flex items-center gap-2 sm:gap-4 md:gap-8 mb-16">
          {[
            { id: 1, label: "Identidade" },
            { id: 2, label: "Métricas" },
            { id: 3, label: "Equipamento" },
            { id: 4, label: "Percurso" },
            { id: 5, label: "Validação" }
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => s.id < step && setStep(s.id)}
              disabled={s.id >= step}
              className="relative flex flex-col items-center group disabled:cursor-default"
            >
              <div
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center text-[10px] sm:text-[11px] font-black transition-all duration-500 ${
                  step === s.id
                    ? "bg-orange-500 text-white shadow-xl shadow-orange-500/30 scale-105 rotate-3"
                    : step > s.id
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10"
                      : "bg-white text-slate-300 border border-slate-100"
                } ${s.id < step ? "group-hover:scale-105 transition-transform" : ""}`}
              >
                {step > s.id ? <ICONS.CheckCircle size={14} className="sm:size-4" /> : s.id}
              </div>
              <div
                className={`absolute -bottom-5 text-[7px] font-black uppercase tracking-widest transition-opacity duration-300 whitespace-nowrap ${step === s.id ? "opacity-100 text-orange-500 font-black" : "opacity-0 text-slate-300"}`}
              >
                {s.label}
              </div>
            </button>
          ))}
        </div>

        {/* Form Card */}
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden relative animate-in slide-in-from-bottom-8 duration-700">
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
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Profile Image Placeholder */}
                  <div className="w-20 h-20 mx-auto border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center group cursor-pointer hover:border-orange-500 hover:bg-orange-50/30 transition-all">
                    <ICONS.Plus
                      size={20}
                      className="text-slate-300 group-hover:text-orange-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">
                      {tr("Identidade")} <span className="text-orange-500">{tr("Chef.")}</span>
                    </h2>
                    <p className="text-[11px] font-medium text-slate-400 italic">
                      {tr("Como os clientes verão a sua marca.")}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="group relative text-left space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                          {tr("Nome Profissional")}
                        </label>
                        <input
                          className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                          placeholder={tr("Ex: Chef Silva")}
                          value={formData.nome}
                          onChange={(e) =>
                            setFormData({ ...formData, nome: e.target.value })
                          }
                        />
                      </div>
                      <div className="group relative text-left space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                          {tr("Telemóvel")}
                        </label>
                        <input
                          className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                          placeholder={tr("Telemóvel")}
                          value={formData.telefone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              telefone: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="text-left space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        {tr("Email")}
                      </label>
                      <input
                        className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                        placeholder={tr("Email")}
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="relative text-left space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        {tr("Password de Acesso")}
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
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
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        fiscal_name: prev.fiscal_name || prev.nome
                      }));
                      setStep(2);
                    }}
                    disabled={!isStepValid(1)}
                    className="w-full h-13 bg-slate-950 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-orange-500 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {tr("Seguinte: Métricas")}
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">
                      {tr("Métricas de")}{" "}
                      <span className="text-orange-500">{tr("Serviço.")}</span>
                    </h2>
                    <p className="text-[11px] font-medium text-slate-400 italic">
                      {tr("O seu rigor operacional e capacidade logística.")}
                    </p>
                  </div>

                  <div className="space-y-4 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                          {tr("Anos de Experiência")}
                        </label>
                        <input
                          type="number"
                          className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                          placeholder="1"
                          value={formData.experiencia}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              experiencia: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                          {tr("NIF (Fiscal)")}
                        </label>
                        <input
                          className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                          placeholder={tr("NIF")}
                          value={formData.nif}
                          onChange={(e) =>
                            setFormData({ ...formData, nif: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                          {tr("Nome Fiscal")}
                        </label>
                        <input
                          className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300"
                          placeholder={tr("Nome para faturas")}
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
                          />
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

                      {/* Pergunta e Botão de Dados de Faturação Iguais */}
                      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5 mt-3 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                              <FileText size={16} />
                            </div>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                                Morada de Serviço & Faturação
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                {tr("Deseja que os dados de faturação sejam os mesmos da sua morada de cozinha/serviço?")}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = !formData.use_as_main_address;
                              const fullStreet = [
                                formData.billing_street,
                                formData.billing_number ? `nº ${formData.billing_number}` : "",
                                formData.billing_floor
                              ].filter(Boolean).join(", ").trim();

                              setFormData({
                                ...formData,
                                use_as_main_address: nextVal,
                                morada: nextVal && fullStreet ? fullStreet : formData.morada,
                                cidade: nextVal && formData.billing_city ? formData.billing_city : formData.cidade,
                                zip_code: nextVal && formData.billing_zip ? formData.billing_zip : formData.zip_code,
                              });
                            }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 border ${
                              formData.use_as_main_address
                                ? "bg-slate-950 text-amber-400 border-amber-400/30 shadow-xs"
                                : "bg-white text-slate-700 border-slate-300 hover:border-orange-400 hover:bg-orange-50/50"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                                formData.use_as_main_address
                                  ? "bg-amber-400 text-slate-950"
                                  : "border border-slate-300 bg-white"
                              }`}
                            >
                              {formData.use_as_main_address && (
                                <Check size={12} strokeWidth={3} />
                              )}
                            </div>
                            <span>
                              {formData.use_as_main_address
                                ? tr("Sim, Usar Mesmos Dados")
                                : tr("Definir Separadamente")}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        {tr("Cidade Base")}
                      </label>
                      <div className="relative">
                        <select
                          className="w-full h-12 px-5 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all text-slate-900 appearance-none cursor-pointer"
                          value={formData.cidade}
                          onChange={(e) =>
                            setFormData({ ...formData, cidade: e.target.value })
                          }
                        >
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

                    <div className="space-y-2 pt-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        {tr("Diferenciais Operativos")}
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          {
                            id: "loiça",
                            label: "Loiça Própria",
                            icon: <ICONS.Utensils size={14} />,
                          },
                          {
                            id: "limpeza",
                            label: "Limpeza Incluída",
                            icon: <ICONS.Sparkles size={14} />,
                          },
                          {
                            id: "apoio",
                            label: "Apoio de Mesa",
                            icon: <ICONS.Users size={14} />,
                          },
                        ].map((item) => {
                          const isSelected = formData.diferenciais.includes(
                            item.id,
                          );
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                const newDifs = isSelected
                                  ? formData.diferenciais.filter(
                                      (d) => d !== item.id,
                                    )
                                  : [...formData.diferenciais, item.id];
                                setFormData({
                                  ...formData,
                                  diferenciais: newDifs,
                                });
                              }}
                              className={`h-10 rounded-lg flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest transition-all border ${
                                isSelected
                                  ? "bg-slate-950 text-white border-slate-950 shadow-md scale-[1.02]"
                                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {item.icon}
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
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
                        if (formData.use_as_main_address) {
                          setFormData({
                            ...formData,
                            morada: `${formData.billing_street}${formData.billing_number ? ", " + formData.billing_number : ""}${formData.billing_floor ? ", " + formData.billing_floor : ""}`,
                            cidade: formData.billing_city,
                            zip_code: formData.billing_zip,
                          });
                        }
                        setStep(3);
                      }}
                      disabled={!isStepValid(2)}
                      className="flex-1 h-13 bg-orange-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-slate-950 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none transition-all cursor-pointer"
                    >
                      {tr("Equipamento Profissional")}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">
                      {tr("Equipamento")} <span className="text-orange-500">{tr("Profissional.")}</span>
                    </h2>
                    <p className="text-[11px] font-medium text-slate-400 italic">
                      {tr("O que traz consigo para garantir a excelência.")}
                    </p>
                  </div>

                  <div className="space-y-4 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        {
                          id: "facas",
                          label: "Set de Facas Próprio",
                          icon: <ICONS.Zap size={14} />,
                        },
                        {
                          id: "fardamento",
                          label: "Fardamento Completo",
                          icon: <ICONS.ShieldCheck size={14} />,
                        },
                        {
                          id: "pequenos_electro",
                          label: "Pequenos Eletrodomésticos",
                          icon: <ICONS.RefreshCw size={14} />,
                        },
                        {
                          id: "transporte",
                          label: "Transporte Próprio",
                          icon: <ICONS.MapPin size={14} />,
                        },
                        {
                          id: "termometro",
                          label: "Termómetro Digital",
                          icon: <ICONS.Target size={14} />,
                        },
                        {
                          id: "balanca",
                          label: "Balança de Precisão",
                          icon: <ICONS.Zap size={14} />,
                        },
                      ].map((item) => {
                        const isSelected = formData.equipamento.includes(
                          item.id,
                        );
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              const newEquip = isSelected
                                ? formData.equipamento.filter(
                                    (e) => e !== item.id,
                                  )
                                : [...formData.equipamento, item.id];
                              setFormData({
                                ...formData,
                                equipamento: newEquip,
                              });
                            }}
                            className={`h-12 px-4 rounded-xl flex items-center gap-3 font-black text-[9px] uppercase tracking-widest transition-all border ${
                              isSelected
                                ? "bg-slate-950 text-white border-slate-950 shadow-md scale-[1.01]"
                                : "bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${isSelected ? "bg-orange-500 text-white" : "bg-slate-50 text-slate-400"}`}
                            >
                              {item.icon}
                            </div>
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
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
                      className="flex-1 h-13 bg-slate-950 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-orange-500 transition-all cursor-pointer"
                    >
                      {tr("Identidade e Percurso")}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">
                      História & <span className="text-orange-500">{tr("Percurso.")}</span>
                    </h2>
                    <p className="text-[11px] font-medium text-slate-400 italic">
                      {tr("Apresente-se à comunidade Cookr.")}
                    </p>
                  </div>

                  <div className="space-y-4 text-left">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        {tr("Biografia Curta")}
                      </label>
                      <textarea
                        className="w-full h-28 p-4 bg-slate-50/50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all resize-none placeholder:text-slate-300"
                        placeholder={tr("Conte o seu percurso, as suas influências...")}
                        value={formData.biografia}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            biografia: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        {tr("Especialidades (Até 4)")}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Portuguesa",
                          "Mediterrânica",
                          "Italiana",
                          "Japonesa",
                          "Vegana",
                          "Marisco",
                          "Fogo & Brasa",
                          "Fine Dining",
                        ].map((spec) => {
                          const isSelected =
                            formData.especialidades.includes(spec);
                          return (
                            <button
                              key={spec}
                              onClick={() => {
                                const newSpecs = isSelected
                                  ? formData.especialidades.filter(
                                      (s) => s !== spec,
                                    )
                                  : formData.especialidades.length < 4
                                    ? [...formData.especialidades, spec]
                                    : formData.especialidades;
                                setFormData({
                                  ...formData,
                                  especialidades: newSpecs,
                                });
                              }}
                              className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all border ${
                                isSelected
                                  ? "bg-orange-500 text-white border-orange-500 shadow-md scale-[1.02]"
                                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {spec}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        {tr("Idiomas de Serviço")}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: "português", label: "Português" },
                          { id: "english", label: "English" },
                          { id: "español", label: "Español" },
                          { id: "français", label: "Français" },
                        ].map((lang) => {
                          const isSelected = formData.idiomas.includes(lang.id);
                          return (
                            <button
                              key={lang.id}
                              onClick={() => {
                                const newLangs = isSelected
                                  ? formData.idiomas.filter(
                                      (l) => l !== lang.id,
                                    )
                                  : [...formData.idiomas, lang.id];
                                setFormData({ ...formData, idiomas: newLangs });
                              }}
                              className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all border ${
                                isSelected
                                  ? "bg-slate-950 text-white border-slate-950 shadow-md scale-[1.02]"
                                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {lang.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep(3)}
                      className="h-13 px-8 bg-white border border-slate-100 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      {tr("Voltar")}
                    </button>
                    <button
                      onClick={() => setStep(5)}
                      className="flex-1 h-13 bg-orange-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-slate-950 transition-all cursor-pointer"
                    >
                      Conformidade & Morada
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Icon Header */}
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-14 h-14 bg-orange-50/50 rounded-xl flex items-center justify-center text-orange-500 shadow-sm border border-orange-100/30">
                      <ICONS.Briefcase size={22} />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">
                        Validação & <span className="text-orange-500">{tr("Cozinha Base.")}</span>
                      </h2>
                      <p className="text-[11px] font-medium text-slate-400 italic">
                        {tr("O rigor administrativo obrigatório da Cookr.")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 text-left">
                    {/* Address Section */}
                    <div className="p-5 bg-slate-50/50 border border-slate-100/50 rounded-xl space-y-4">
                      {/* Botão no registo a perguntar se deseja que os dados de faturação sejam os mesmos */}
                      <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                            <FileText size={14} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-900">
                              {tr("Dados de Faturação")}
                            </p>
                            <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                              {tr("Deseja que os dados de faturação sejam os mesmos desta morada?")}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const fullBilling = [
                              formData.billing_street,
                              formData.billing_number ? `nº ${formData.billing_number}` : "",
                              formData.billing_floor
                            ].filter(Boolean).join(", ").trim();

                            if (fullBilling || formData.billing_zip || formData.billing_city) {
                              setFormData({
                                ...formData,
                                morada: fullBilling || formData.morada,
                                zip_code: formData.billing_zip || formData.zip_code,
                                cidade: formData.billing_city || formData.cidade,
                                use_as_main_address: true,
                              });
                            } else {
                              setFormData({
                                ...formData,
                                billing_street: formData.morada,
                                billing_zip: formData.zip_code,
                                billing_city: formData.cidade,
                                use_as_main_address: true,
                              });
                            }
                          }}
                          className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 border ${
                            formData.use_as_main_address
                              ? "bg-slate-950 text-amber-400 border-amber-400/30 shadow-xs"
                              : "bg-white text-orange-600 border-orange-200 hover:bg-orange-50/50"
                          }`}
                        >
                          <Check size={12} strokeWidth={formData.use_as_main_address ? 3 : 2} />
                          <span>
                            {formData.use_as_main_address
                              ? tr("Mesmos Dados de Faturação")
                              : tr("Copiar Dados de Faturação")}
                          </span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                          {tr("Morada Principal da Cozinha")}
                        </label>
                        <input
                          className="w-full h-12 px-5 bg-white rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300 shadow-sm"
                          placeholder={tr("Rua e Número")}
                          value={formData.morada}
                          onChange={(e) =>
                            setFormData({ ...formData, morada: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          className="w-full h-12 px-5 bg-white rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300 shadow-sm"
                          placeholder={tr("Cód. Postal")}
                          value={formData.zip_code}
                          maxLength={8}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              zip_code: formatZipCode(e.target.value),
                            })
                          }
                        />
                        <div className="relative">
                          <select
                            className="w-full h-12 px-5 bg-white rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-500 focus:bg-white transition-all text-slate-900 appearance-none cursor-pointer shadow-sm"
                            value={formData.cidade}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                cidade: e.target.value,
                              })
                            }
                          >
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

                    {/* HACCP Section */}
                    <div className="p-4 bg-slate-50/50 border border-slate-100/50 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 group hover:bg-slate-100/50 transition-colors">
                      <div className="space-y-0.5">
                        <h4 className="text-[10px] font-black text-slate-950 uppercase tracking-widest">
                          {tr("Certificação HACCP")}
                        </h4>
                        <p className="text-[9px] text-slate-400 italic">
                          {tr("Upload do certificado de higiene e segurança.")}
                        </p>
                      </div>
                      <button className="px-5 py-2.5 bg-white rounded-lg border border-slate-100 flex items-center gap-2 font-black text-[9px] uppercase tracking-widest text-slate-950 hover:border-orange-500 hover:text-orange-500 transition-all shadow-sm cursor-pointer">
                        <ICONS.Camera size={14} />
                        {tr("Upload")}
                      </button>
                    </div>

                    {/* Terms Section */}
                    <button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          terms_accepted: !formData.terms_accepted,
                        })
                      }
                      className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all border text-left ${
                        formData.terms_accepted
                          ? "bg-orange-50/50 border-orange-100 shadow-inner"
                          : "bg-slate-50/30 border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                          formData.terms_accepted
                            ? "bg-orange-500 text-white shadow-md rotate-3"
                            : "bg-white border border-slate-100"
                        }`}
                      >
                        {formData.terms_accepted && (
                          <ICONS.CheckCircle size={14} />
                        )}
                      </div>
                      <span className="text-[10px] font-black text-slate-950 uppercase tracking-widest">
                        {tr("Aceito os Termos de Curadoria Profissional Cookr")}
                      </span>
                    </button>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep(4)}
                      className="h-13 px-8 bg-white border border-slate-100 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      {tr("Voltar")}
                    </button>
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      disabled={!isStepValid(5) || isSubmitting}
                      className={`flex-1 h-13 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all flex items-center justify-center gap-2.5 ${
                        isStepValid(5) && !isSubmitting
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
                        tr("Submeter Candidatura")
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
              id="cook-confirm-onboarding-modal"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-orange-50 text-orange-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user-check"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                </div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-950">
                  {tr("Submeter Candidatura")}
                </h3>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                  {tr("Tem a certeza de que deseja submeter a sua candidatura de Chef profissional na Cookr? Por favor, confirme se todos os dados inseridos estão corretos.")}
                </p>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="uppercase text-[9px] tracking-wider text-slate-400">{tr("Chef")}</span>
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
                  <div className="flex justify-between">
                    <span className="uppercase text-[9px] tracking-wider text-slate-400">{tr("Experiência")}</span>
                    <span className="text-slate-950">{formData.experiencia} {tr("Anos")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="uppercase text-[9px] tracking-wider text-slate-400">{tr("Cidade")}</span>
                    <span className="text-slate-950">{formData.cidade}</span>
                  </div>
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
                  {tr("Confirmar e Submeter")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CookOnboarding;
