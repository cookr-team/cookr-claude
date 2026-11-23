import React, { useState, useEffect, useRef } from "react";
import { User, UserRole } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import { supabaseService } from "../services/supabaseService";
import { pushNotificationService } from "../services/pushNotificationService";
import { motion, AnimatePresence } from "motion/react";
import { 
  User as UserIcon,
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  Calendar, 
  Megaphone, 
  ShieldCheck, 
  FileText, 
  CreditCard, 
  Hash, 
  Lock, 
  LogOut, 
  Check, 
  RefreshCw, 
  AlertCircle,
  ExternalLink,
  Phone,
  Shield,
  Clock,
  Globe
} from "lucide-react";

interface SettingsViewProps {
  user: User;
  onRefresh: (userOverride?: User) => void;
  onNavigate: (view: string) => void;
  onNotify?: (message: string, type: "success" | "error" | "info") => void;
}
import { formatPostalCode } from "../utils/formatters";
import { tr } from "../lib/tr";
export { formatPostalCode };

// Custom Accessible Premium Toggle
const SettingToggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  id?: string;
}> = ({ checked, onChange, disabled = false, id }) => {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 relative focus:outline-none focus:ring-2 focus:ring-orange-500/30 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-orange-500 shadow-sm" : "bg-slate-200 hover:bg-slate-300"
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      >
        {checked && <Check size={9} className="text-orange-600 stroke-[3]" />}
      </div>
    </button>
  );
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onRefresh,
  onNavigate,
  onNotify,
}) => {
  const { t, language, setLanguage, availableLanguages } = useLanguage();

  // Personal Profile States
  const [nome, setNome] = useState(user.nome || "");
  const [telefone, setTelefone] = useState(user.telefone || "");
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  // Billing Management States
  const [fiscalName, setFiscalName] = useState(user.fiscal_name || user.nome || "");
  const [nif, setNif] = useState(user.nif || "");
  const [iban, setIban] = useState(user.iban || "");
  const [billingAddress, setBillingAddress] = useState(user.billing_address || user.morada || "");
  const [billingCity, setBillingCity] = useState(user.billing_city || user.cidade || "");
  const [billingZip, setBillingZip] = useState(formatPostalCode(user.billing_zip || user.zip_code || ""));
  const [isSavingBilling, setIsSavingBilling] = useState(false);

  // Notification Settings States
  const [notifSettings, setNotifSettings] = useState({
    booking_updates: user.notification_settings?.booking_updates ?? true,
    booking_reminders: user.notification_settings?.booking_reminders ?? true,
    chef_messages: user.notification_settings?.chef_messages ?? true,
    system_alerts: user.notification_settings?.system_alerts ?? true,
    marketing_offers: user.notification_settings?.marketing_offers ?? false,
    email_enabled: user.notification_settings?.email_enabled ?? true,
    push_enabled: user.notification_settings?.push_enabled ?? true,
  });

  const [showAutoSavedIndicator, setShowAutoSavedIndicator] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isRequestingPush, setIsRequestingPush] = useState(false);
  const [hasPushPermission, setHasPushPermission] = useState(false);

  const lastUserIdRef = useRef<string | null>(null);

  // Synchronize state when user prop changes
  useEffect(() => {
    if (user && lastUserIdRef.current !== user.id) {
      lastUserIdRef.current = user.id;
      setNome(user.nome || "");
      setTelefone(user.telefone || "");
      setFiscalName(user.fiscal_name || user.nome || "");
      setNif(user.nif || "");
      setIban(user.iban || "");
      setBillingAddress(user.billing_address || user.morada || "");
      setBillingCity(user.billing_city || user.cidade || "");
      setBillingZip(formatPostalCode(user.billing_zip || user.zip_code || ""));
      setNotifSettings({
        booking_updates: user.notification_settings?.booking_updates ?? true,
        booking_reminders: user.notification_settings?.booking_reminders ?? true,
        chef_messages: user.notification_settings?.chef_messages ?? true,
        system_alerts: user.notification_settings?.system_alerts ?? true,
        marketing_offers: user.notification_settings?.marketing_offers ?? false,
        email_enabled: user.notification_settings?.email_enabled ?? true,
        push_enabled: user.notification_settings?.push_enabled ?? true,
      });
    }
  }, [user]);

  // Check push permission status
  useEffect(() => {
    const updatePushStatus = () => {
      if (typeof window !== "undefined" && "Notification" in window) {
        setHasPushPermission(Notification.permission === "granted");
      }
    };
    updatePushStatus();
    window.addEventListener("focus", updatePushStatus);
    return () => window.removeEventListener("focus", updatePushStatus);
  }, []);

  // 1. Save Personal Details
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPersonal(true);
    try {
      const updatedProfile: Partial<User> = {
        nome: nome.trim(),
        telefone: telefone.trim(),
      };
      await supabaseService.updateUserProfile(user.id, updatedProfile);
      onRefresh({ ...user, ...updatedProfile });
      if (onNotify) onNotify("Dados pessoais atualizados com sucesso!", "success");
    } catch (err: any) {
      console.error(err);
      if (onNotify) onNotify("Erro ao atualizar dados pessoais.", "error");
    } finally {
      setIsSavingPersonal(false);
    }
  };

  // 2. Real-time Notification Toggle with Auto-save
  const handleToggle = async (key: keyof typeof notifSettings) => {
    const updatedSettings = {
      ...notifSettings,
      [key]: !notifSettings[key],
    };
    setNotifSettings(updatedSettings);

    try {
      const updatedProfile: Partial<User> = {
        notification_settings: updatedSettings,
      };
      await supabaseService.updateUserProfile(user.id, updatedProfile);
      onRefresh({ ...user, ...updatedProfile });

      setShowAutoSavedIndicator(true);
      setTimeout(() => setShowAutoSavedIndicator(false), 2200);
      if (onNotify) onNotify("Preferência guardada!", "success");
    } catch (error) {
      console.error(error);
      setNotifSettings(notifSettings);
      if (onNotify) onNotify("Erro ao atualizar preferência.", "error");
    }
  };

  // Enable Device Push Notifications
  const handleEnableDevicePush = async () => {
    setIsRequestingPush(true);
    try {
      const granted = await pushNotificationService.requestPermission(user.id);
      if (granted) {
        setHasPushPermission(true);
        if (!notifSettings.push_enabled) {
          handleToggle("push_enabled");
        }
        if (onNotify) onNotify("Notificações no dispositivo ativadas com sucesso!", "success");
      } else {
        if (onNotify) onNotify("Permissão de notificações não foi concedida pelo navegador.", "info");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRequestingPush(false);
    }
  };

  // 3. Save Billing Details
  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBilling(true);
    try {
      const updatedProfile: Partial<User> = {
        fiscal_name: fiscalName.trim(),
        nif: nif.trim(),
        iban: iban.trim(),
        billing_address: billingAddress.trim(),
        billing_city: billingCity.trim(),
        billing_zip: billingZip.trim(),
      };

      await supabaseService.updateUserProfile(user.id, updatedProfile);
      onRefresh({ ...user, ...updatedProfile });

      if (onNotify) onNotify("Dados de faturação guardados com sucesso!", "success");
    } catch (err: any) {
      console.error(err);
      if (onNotify) onNotify("Erro ao guardar dados de faturação.", "error");
    } finally {
      setIsSavingBilling(false);
    }
  };

  // 4. Password Reset Request
  const handleResetPassword = async () => {
    if (!user.email) return;
    setIsResettingPassword(true);
    try {
      await supabaseService.resetPasswordForEmail(user.email);
      if (onNotify) {
        onNotify(`Enviámos instruções de redefinição para ${user.email}. Verifique o seu email.`, "success");
      }
    } catch (err: any) {
      if (onNotify) onNotify("Erro ao enviar pedido de recuperação: " + (err.message || "Tente mais tarde"), "error");
    } finally {
      setIsResettingPassword(false);
    }
  };

  // 5. Sign Out
  const handleSignOut = async () => {
    try {
      await supabaseService.signOut();
      window.location.reload();
    } catch {
      window.location.href = "/";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 text-left min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/80 pb-5 sm:pb-6">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block">
              {t("nav_settings")}
            </span>
            <span className="w-1 h-1 bg-slate-300 rounded-full" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {user.role === UserRole.COOK ? (t("settings.chef_profile") || tr("Perfil de Chef")) : (t("settings.client_account") || tr("Conta Cliente"))}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-slate-900 leading-tight">
            {t("settings.title")}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {t("settings.subtitle")}
          </p>
        </div>

        {/* Discrete auto-save notification indicator */}
        <AnimatePresence>
          {showAutoSavedIndicator && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-[10px] font-bold uppercase tracking-wider shrink-0"
            >
              <Check size={12} className="text-emerald-600 stroke-[3]" />
              {t("common.auto_saved")}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* ================================================================= */}
        {/* IDIOMA DE PREFERÊNCIA */}
        {/* ================================================================= */}
        <section className="bg-white p-5 sm:p-7 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center border border-orange-100">
                <Globe size={18} />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  {t("settings.language_section") || tr("Idioma de Preferência")}
                </h2>
                <p className="text-[11px] text-slate-500 font-normal">
                  {t("settings.language_desc") || tr("Escolha o idioma no qual pretende visualizar a plataforma. Toda a interface e notificações serão adaptadas.")}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 border border-orange-100">
              {language.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {availableLanguages.map((item) => {
              const isCurrent = language === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setLanguage(item.code);
                    onNotify?.(t("common.saved") || "Idioma atualizado com sucesso", "success");
                  }}
                  className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                    isCurrent
                      ? "bg-orange-500 text-white border-orange-500 shadow-md ring-2 ring-orange-200 scale-[1.02]"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-xl">{item.flag}</span>
                    {isCurrent && <Check size={14} className="stroke-[3]" />}
                  </div>
                  <span className={`text-xs font-black uppercase tracking-wider ${isCurrent ? "text-white" : "text-slate-900"}`}>
                    {item.label}
                  </span>
                  <span className={`text-[9px] font-mono mt-0.5 ${isCurrent ? "text-orange-100" : "text-slate-400"}`}>
                    {item.code.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ================================================================= */}
        {/* 1. DADOS PESSOAIS / CONTA */}
        {/* ================================================================= */}
        <section className="bg-white p-5 sm:p-7 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center border border-orange-100">
                <UserIcon size={18} />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  {t("settings.personal_section")}
                </h2>
                <p className="text-[11px] text-slate-500 font-normal">
                  {t("settings.personal_desc")}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0">
              {user.role === UserRole.COOK ? tr("Chef Verificado") : tr("Cliente Cookr")}
            </span>
          </div>

          <form onSubmit={handleSavePersonal} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  {t("auth.name")}
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder={tr("Seu nome")}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all font-medium"
                  required
                />
              </div>

              {/* Email (Readonly identity) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    {t("auth.email")}
                  </label>
                  <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                    <ShieldCheck size={11} /> {t("common.active")}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 text-slate-500 rounded-xl text-xs font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Telefone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  {t("auth.phone")}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400">
                    <Phone size={13} />
                  </span>
                  <input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="+351 912 345 678"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Membro desde / Estado */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  {t("common.status")}
                </label>
                <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                  <span className="font-semibold text-slate-700 capitalize flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {t("common.active")}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {tr("ID:")} {user.id ? user.id.slice(0, 8) : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingPersonal}
                className="px-5 py-2.5 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingPersonal ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                {isSavingPersonal ? t("common.saving") : t("settings.save_personal")}
              </button>
            </div>
          </form>
        </section>

        {/* ================================================================= */}
        {/* 2. DADOS DE FATURAÇÃO */}
        {/* ================================================================= */}
        <section className="bg-white p-5 sm:p-7 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-9 h-9 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center border border-orange-100">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                {t("settings.billing_section")}
              </h2>
              <p className="text-[11px] text-slate-500 font-normal">
                {t("settings.billing_desc")}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveBilling} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome Fiscal */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  {tr("Nome Fiscal / Razão Social")}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400">
                    <FileText size={13} />
                  </span>
                  <input
                    type="text"
                    value={fiscalName}
                    onChange={(e) => setFiscalName(e.target.value)}
                    placeholder={tr("Nome completo na fatura")}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all font-medium"
                  />
                </div>
              </div>

              {/* NIF */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  {tr("NIF (Número de Identificação Fiscal)")}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400">
                    <Hash size={13} />
                  </span>
                  <input
                    type="text"
                    value={nif}
                    onChange={(e) => setNif(e.target.value)}
                    placeholder={tr("Ex: 123456789")}
                    maxLength={12}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all font-mono font-medium"
                  />
                </div>
              </div>

              {/* Morada de Faturação */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  {tr("Morada de Faturação")}
                </label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder={tr("Rua, número e andar")}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all font-medium"
                />
              </div>

              {/* Cidade */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  {tr("Cidade")}
                </label>
                <input
                  type="text"
                  value={billingCity}
                  onChange={(e) => setBillingCity(e.target.value)}
                  placeholder={tr("Ex: Lisboa")}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all font-medium"
                />
              </div>

              {/* Código Postal */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  {tr("Código Postal")}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={billingZip}
                  onChange={(e) => setBillingZip(formatPostalCode(e.target.value))}
                  placeholder="1000-001"
                  maxLength={8}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all font-medium font-mono"
                />
              </div>

              {/* IBAN */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  {tr("IBAN (Para Reembolsos ou Repartição de Conta)")}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400">
                    <CreditCard size={13} />
                  </span>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder={tr("PT50 0000 0000 0000 0000 0000 0")}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all font-mono font-medium uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingBilling}
                className="px-5 py-2.5 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingBilling ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                {isSavingBilling ? t("common.saving") : t("settings.save_billing")}
              </button>
            </div>
          </form>
        </section>

        {/* ================================================================= */}
        {/* 3. PREFERÊNCIAS DE NOTIFICAÇÕES */}
        {/* ================================================================= */}
        <section className="bg-white p-5 sm:p-7 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-9 h-9 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center border border-orange-100">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                {t("settings.notifications_section")}
              </h2>
              <p className="text-[11px] text-slate-500 font-normal">
                {t("settings.notifications_desc")}
              </p>
            </div>
          </div>

          {/* Essential Notifications Notice */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-xs flex items-start gap-2.5 leading-relaxed">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px]">
              <strong className="text-slate-900 font-bold">{tr("Notificações Essenciais Ativas:")}</strong> {tr("As comunicações operacionais críticas — tais como confirmações de reserva, alterações de agendamento, cancelamentos e segurança da conta — são sempre enviadas para salvaguardar a sua experiência.")}
            </p>
          </div>

          <div className="space-y-6 pt-1">
            {/* CATEGORIA A: RESERVAS */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-orange-600 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <Calendar size={13} />
                {tr("Reservas")}
              </h3>

              <div className="space-y-2.5">
                <div
                  onClick={() => handleToggle("booking_updates")}
                  className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-colors cursor-pointer"
                >
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900">{tr("Atualizações das reservas")}</h4>
                    <p className="text-[11px] text-slate-500">
                      {tr("Receba avisos imediatos quando um Chef aceita o seu pedido ou atualiza os detalhes do ritual.")}
                    </p>
                  </div>
                  <SettingToggle
                    checked={notifSettings.booking_updates}
                    onChange={() => handleToggle("booking_updates")}
                  />
                </div>

                <div
                  onClick={() => handleToggle("booking_reminders")}
                  className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-colors cursor-pointer"
                >
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900">{tr("Lembretes das reservas")}</h4>
                    <p className="text-[11px] text-slate-500">
                      {tr("Lembretes automáticos com 24h e 2h de antecedência para preparar a receção do Chef.")}
                    </p>
                  </div>
                  <SettingToggle
                    checked={notifSettings.booking_reminders}
                    onChange={() => handleToggle("booking_reminders")}
                  />
                </div>
              </div>
            </div>

            {/* CATEGORIA B: MENSAGENS */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-orange-600 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <MessageSquare size={13} />
                {tr("Mensagens")}
              </h3>

              <div
                onClick={() => handleToggle("chef_messages")}
                className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-colors cursor-pointer"
              >
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900">{tr("Mensagens dos Chefs")}</h4>
                  <p className="text-[11px] text-slate-500">
                    {tr("Notificação quando um Chef responder a dúvidas de ementa ou coordenação de menu.")}
                  </p>
                </div>
                <SettingToggle
                  checked={notifSettings.chef_messages}
                  onChange={() => handleToggle("chef_messages")}
                />
              </div>
            </div>

            {/* CATEGORIA C: CONTA */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-orange-600 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <Shield size={13} />
                {tr("Conta")}
              </h3>

              <div
                onClick={() => handleToggle("system_alerts")}
                className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-colors cursor-pointer"
              >
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900">{tr("Alertas importantes da conta")}</h4>
                  <p className="text-[11px] text-slate-500">
                    {tr("Comunicações de segurança, comprovativos de faturação e avisos cadastrais essenciais.")}
                  </p>
                </div>
                <SettingToggle
                  checked={notifSettings.system_alerts}
                  onChange={() => handleToggle("system_alerts")}
                />
              </div>
            </div>

            {/* CATEGORIA D: COMUNICAÇÕES */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-orange-600 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <Megaphone size={13} />
                {tr("Comunicações")}
              </h3>

              <div
                onClick={() => handleToggle("marketing_offers")}
                className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-colors cursor-pointer"
              >
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900">{tr("Novidades e ofertas")}</h4>
                  <p className="text-[11px] text-slate-500">
                    {tr("Descoberta de novos chefs na sua região, menus sazonais exclusivos e benefícios especiais.")}
                  </p>
                </div>
                <SettingToggle
                  checked={notifSettings.marketing_offers}
                  onChange={() => handleToggle("marketing_offers")}
                />
              </div>
            </div>

            {/* Dispositivo móvel / Alertas no Ecrã do Dispositivo */}
            <div className="pt-1">
              <div
                onClick={() => {
                  if (hasPushPermission) {
                    handleToggle("push_enabled");
                  }
                }}
                className={`flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-colors ${
                  hasPushPermission ? "cursor-pointer" : ""
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Smartphone size={14} className="text-slate-600 shrink-0" />
                    {tr("Alertas no Ecrã do Dispositivo")}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {hasPushPermission
                      ? tr("Notificações push ativas no navegador e telemóvel para respostas de Chefs e confirmações.")
                      : tr("Receba alertas no ecrã do telemóvel quando os Chefs aceitarem ou confirmarem serviços.")}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {hasPushPermission ? (
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <Check size={11} className="text-emerald-600 stroke-[3]" />
                        {tr("Ativo neste dispositivo")}
                      </span>
                      <SettingToggle
                        checked={notifSettings.push_enabled}
                        onChange={() => handleToggle("push_enabled")}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEnableDevicePush();
                      }}
                      disabled={isRequestingPush}
                      className="px-4 py-2 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isRequestingPush ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>{tr("A autorizar...")}</span>
                        </>
                      ) : (
                        <span>{tr("Permitir no Dispositivo")}</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 4. PRIVACIDADE E SEGURANÇA */}
        {/* ================================================================= */}
        <section className="bg-white p-5 sm:p-7 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-9 h-9 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center border border-orange-100">
              <Lock size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Privacidade &amp; Segurança
              </h2>
              <p className="text-[11px] text-slate-500 font-normal">
                {tr("Proteção de credenciais, sessão de utilizador e conformidade com o RGPD")}
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 space-y-4">
            {/* Palavra-passe */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900">{tr("Palavra-passe de Acesso")}</h4>
                <p className="text-[11px] text-slate-500">
                  {tr("Pode solicitar a qualquer momento um link seguro para alterar a sua palavra-passe de acesso.")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isResettingPassword}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
              >
                {isResettingPassword ? tr("A enviar...") : tr("Redefinir Palavra-passe")}
              </button>
            </div>

            {/* Sessão / Dispositivos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900">{tr("Sessão Ativa")}</h4>
                <p className="text-[11px] text-slate-500">
                  {tr("Sessão iniciada na plataforma com a conta")} <strong className="text-slate-800">{user.email}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0 self-start sm:self-auto flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <LogOut size={13} className="text-slate-500" />
                {tr("Terminar Sessão")}
              </button>
            </div>

            {/* Privacidade e Termos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900">Políticas &amp; Proteção de Dados</h4>
                <p className="text-[11px] text-slate-500">
                  {tr("Consulte os termos legais de serviço e o tratamento dos seus dados nos termos da legislação portuguesa e europeia.")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => onNavigate("privacy")}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {tr("Privacidade")} <ExternalLink size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("terms")}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {tr("Termos")} <ExternalLink size={11} />
                </button>
              </div>
            </div>

            {/* Eliminar Conta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900">{tr("Eliminação da Conta")}</h4>
                <p className="text-[11px] text-slate-500">
                  {tr("Direito ao esquecimento (RGPD). Pode solicitar a eliminação definitiva de todos os seus dados cadastrais.")}
                </p>
              </div>
              <a
                href="mailto:dpo@cookr.pt?subject=Pedido%20de%20Elimina%C3%A7%C3%A3o%20de%20Conta%20Cookr"
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0 self-start sm:self-auto inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <AlertCircle size={13} className="text-red-500" />
                {tr("Solicitar Eliminação")}
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* Subtle Footer info */}
      <div className="flex justify-center items-center gap-4 text-slate-400 pt-4 text-xs">
        <button
          type="button"
          onClick={() => onNavigate("privacy")}
          className="hover:text-slate-900 transition-colors"
        >
          {t("about")}
        </button>
        <span className="w-1 h-1 bg-slate-300 rounded-full" />
        <button
          type="button"
          onClick={() => onNavigate("terms")}
          className="hover:text-slate-900 transition-colors"
        >
          {t("details")}
        </button>
      </div>
    </div>
  );
};
