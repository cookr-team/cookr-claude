import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { 
  Save, 
  AlertTriangle, 
  Sparkles, 
  UtensilsCrossed, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Plus, 
  BookOpen, 
  CheckCircle2, 
  X, 
  ChefHat,
  Info
} from "lucide-react";
import { Booking, BookingStatus, User, MenuItem, HaccpChecklist, HaccpLog } from "../types";
import { ICONS, formatPrice, CUISINES } from "../constants";
import { supabaseService } from "../services/supabaseService";
import { CancellationModal } from "./CancellationModal";
import { DietaryBadges } from "./DietaryBadges";
import { useLanguage } from "../contexts/LanguageContext";
import { todayLocal } from "../lib/dateUtils";

const HaccpPanel: React.FC<{ chef: User; bookings: Booking[] }> = React.memo(({ chef, bookings }) => {
  const [activeModule, setActiveModule] = useState<"checklist" | "service_log">("service_log"); // Default to service_log as requested

  // --- Transport Checklist State ---
  const [checklists, setChecklists] = useState<HaccpChecklist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [haccpTab, setHaccpTab] = useState<"new" | "history">("new");

  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [transportTemp, setTransportTemp] = useState<number>(3.5);
  const [transportIsothermal, setTransportIsothermal] = useState(true);
  const [hygieneHands, setHygieneHands] = useState(true);
  const [hygieneHair, setHygieneHair] = useState(true);
  const [hygieneUniform, setHygieneUniform] = useState(true);
  const [sanitizedUtensils, setSanitizedUtensils] = useState(true);
  const [sanitizedSurfaces, setSanitizedSurfaces] = useState(true);
  const [separationRawCoo, setSeparationRawCoo] = useState(true);
  const [washedIngredients, setWashedIngredients] = useState(true);
  const [observations, setObservations] = useState("");
  const [signatureChecked, setSignatureChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedChecklistId, setExpandedChecklistId] = useState<string | null>(null);

  // --- Service Log State ---
  const [serviceLogs, setServiceLogs] = useState<HaccpLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [serviceLogTab, setServiceLogTab] = useState<"new" | "history">("new");

  const [logType, setLogType] = useState<"before_service" | "after_service">("before_service");
  const [logBookingId, setLogBookingId] = useState("");
  const [logDate, setLogDate] = useState(todayLocal());
  const [temperaturesOk, setTemperaturesOk] = useState(true);
  const [surfacesSanitized, setSurfacesSanitized] = useState(true);
  const [personalHygieneOk, setPersonalHygieneOk] = useState(true);
  const [wasteDisposed, setWasteDisposed] = useState(true);
  const [pestControlOk, setPestControlOk] = useState(true);
  const [rawReadySeparation, setRawReadySeparation] = useState(true);
  const [logObservations, setLogObservations] = useState("");
  const [logSignatureChecked, setLogSignatureChecked] = useState(false);
  const [isLogSubmitting, setIsLogSubmitting] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadChecklists = async () => {
    setIsLoading(true);
    try {
      const list = await supabaseService.getHaccpChecklistsByCookId(chef.id);
      setChecklists(list || []);
    } catch (e) {
      console.warn("Aviso ao carregar registos HACCP:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadServiceLogs = async () => {
    setIsLogsLoading(true);
    try {
      const logsList = await supabaseService.getHaccpLogsByCookId(chef.id);
      setServiceLogs(logsList || []);
    } catch (e) {
      console.warn("Aviso ao carregar diário de higiene de serviço:", e);
    } finally {
      setIsLogsLoading(false);
    }
  };

  useEffect(() => {
    loadChecklists();
    loadServiceLogs();
  }, [chef.id]);

  const eligibleBookings = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.cookId === chef.id &&
        [BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED].includes(b.status)
    );
  }, [bookings, chef.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureChecked) {
      alert("Por favor, declare sob compromisso de honra que as verificações foram efetuadas.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedBooking = eligibleBookings.find((b) => b.id === selectedBookingId);
      const clientName = selectedBooking ? selectedBooking.clientName : "Serviço Avulso";
      const bookingDate = selectedBooking ? selectedBooking.data : todayLocal();

      await supabaseService.createHaccpChecklist({
        cookId: chef.id,
        cookName: chef.nome,
        bookingId: selectedBookingId || "avulso",
        clientName,
        date: bookingDate,
        transportTemp,
        transportIsothermal,
        hygieneHands,
        hygieneHair,
        hygieneUniform,
        sanitizedUtensils,
        sanitizedSurfaces,
        separationRawCoo,
        washedIngredients,
        observations,
        signatureChecked,
      });

      // Reset Form to initial values
      setSelectedBookingId("");
      setTransportTemp(3.5);
      setTransportIsothermal(true);
      setHygieneHands(true);
      setHygieneHair(true);
      setHygieneUniform(true);
      setSanitizedUtensils(true);
      setSanitizedSurfaces(true);
      setSeparationRawCoo(true);
      setWashedIngredients(true);
      setObservations("");
      setSignatureChecked(false);

      alert("Registo HACCP Digital gravado com sucesso! Mantém-te seguro na cozinha.");
      await loadChecklists();
      setHaccpTab("history");
    } catch (err) {
      console.error(err);
      alert("Erro ao gravar registo HACCP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logSignatureChecked) {
      alert("Por favor, declare sob compromisso de honra que as verificações foram efetuadas.");
      return;
    }

    setIsLogSubmitting(true);
    try {
      const selectedBooking = eligibleBookings.find((b) => b.id === logBookingId);
      const clientName = selectedBooking ? selectedBooking.clientName : "Serviço Geral / Cozinha";

      await supabaseService.createHaccpLog({
        cookId: chef.id,
        cookName: chef.nome,
        bookingId: logBookingId || "geral",
        clientName,
        logType,
        date: logDate,
        temperaturesOk,
        surfacesSanitized,
        personalHygieneOk,
        wasteDisposed,
        pestControlOk,
        rawReadySeparation,
        observations: logObservations,
      });

      // Reset Form
      setLogBookingId("");
      setLogDate(todayLocal());
      setTemperaturesOk(true);
      setSurfacesSanitized(true);
      setPersonalHygieneOk(true);
      setWasteDisposed(true);
      setPestControlOk(true);
      setRawReadySeparation(true);
      setLogObservations("");
      setLogSignatureChecked(false);

      alert("Diário de Higiene de Serviço gravado com sucesso!");
      await loadServiceLogs();
      setServiceLogTab("history");
    } catch (err) {
      console.error(err);
      alert("Erro ao gravar diário de Higiene de Serviço.");
    } finally {
      setIsLogSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      {/* Module Switcher: Checklist de Transporte vs Registo de Higiene de Serviço */}
      <div className="bg-slate-900 p-5 rounded-[2.5rem] border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
            🛡️ Segurança Alimentar (HACCP)
          </h3>
          <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
            Monitoriza a cadeia de frio, higienização de bancadas e conformidade da cozinha
          </p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner w-full md:w-auto">
          <button
            onClick={() => setActiveModule("checklist")}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
              activeModule === "checklist"
                ? "bg-orange-500 text-white shadow-md"
                : "text-white/60 hover:text-white"
            }`}
          >
            🚚 Checklist de Transporte
          </button>
          <button
            onClick={() => setActiveModule("service_log")}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
              activeModule === "service_log"
                ? "bg-orange-500 text-white shadow-md"
                : "text-white/60 hover:text-white"
            }`}
          >
            🧼 Diário de Higiene de Serviço
          </button>
        </div>
      </div>

      {activeModule === "checklist" ? (
        <div className="space-y-6">
          {/* Subtab Headers */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 shadow-inner w-full sm:w-auto self-start flex-row inline-flex">
            <button
              onClick={() => setHaccpTab("new")}
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                haccpTab === "new"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <ICONS.Plus size={11} />
              Nova Verificação de Transporte
            </button>
            <button
              onClick={() => setHaccpTab("history")}
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                haccpTab === "history"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <ICONS.FileText size={11} />
              Histórico de Transportes ({checklists.length})
            </button>
          </div>

          {haccpTab === "new" ? (
            <form onSubmit={handleSubmit} className="bg-white p-5 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
                  Checklist de Transporte de Alimentos (HACCP)
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                  Registe a temperatura e o acondicionamento dos alimentos antes de iniciar a viagem
                </p>
              </div>

              {/* Booking Selection */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Ritual / Reserva Associada
                </label>
                <select
                  required
                  className="w-full h-12 px-4 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-orange-500 transition-all cursor-pointer text-slate-700"
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                >
                  <option value="">Seleciona um serviço do teu calendário...</option>
                  {eligibleBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.clientName} - {b.data} {b.hora ? `(${b.hora})` : ""} - {b.menu_selected}
                    </option>
                  ))}
                  <option value="avulso">-- Outro Serviço (Sem reserva direta no portal) --</option>
                </select>
                <p className="text-[9px] text-slate-400 italic font-medium ml-1">
                  Associa este checklist ao cliente para criar um comprovativo legal partilhável.
                </p>
              </div>

              {/* Section 1: Chain of Cold / Transportation */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                  <ICONS.Moon size={14} className="text-blue-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    1. Cadeia de Frio & Transporte de Alimentos
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Temperatura de Transporte (°C)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        required
                        className="w-full h-12 px-4 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-orange-500 transition-all"
                        value={transportTemp}
                        onChange={(e) => setTransportTemp(Number(e.target.value))}
                      />
                      <span className="text-xs font-black text-slate-600 bg-slate-100 h-12 w-12 rounded-xl flex items-center justify-center">
                        °C
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setTransportTemp(3.5)}
                        className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-[8px] font-bold uppercase rounded-md text-slate-600 hover:text-blue-600 transition"
                      >
                        Fresco (3.5°C)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransportTemp(-18.5)}
                        className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-[8px] font-bold uppercase rounded-md text-slate-600 hover:text-blue-600 transition"
                      >
                        Congelado (-18°C)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransportTemp(65.0)}
                        className="px-2 py-1 bg-slate-100 hover:bg-orange-50 text-[8px] font-bold uppercase rounded-md text-slate-600 hover:text-orange-600 transition"
                      >
                        Quente (&gt;60°C)
                      </button>
                    </div>
                  </div>

                  {/* Isothermal bag confirmation */}
                  <div className="flex items-center">
                    <label
                      onClick={() => setTransportIsothermal(!transportIsothermal)}
                      className={`w-full flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-300 ${
                        transportIsothermal
                          ? "bg-emerald-50/50 border-emerald-200"
                          : "bg-slate-50 border-transparent hover:border-slate-200"
                      }`}
                    >
                      <div
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          transportIsothermal
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {transportIsothermal && <ICONS.Check size={10} className="stroke-[3]" />}
                      </div>
                      <div className="space-y-0.5 text-left">
                        <p className="text-[10px] font-extrabold uppercase tracking-tight text-slate-900 leading-none">
                          Mala Isotérmica Limpa
                        </p>
                        <p className="text-[9px] text-slate-400 font-semibold">
                          Os ingredientes foram transportados com placas de gelo em malas adequadas.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 2: Personal Hygiene and Prep Standard */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                  <ICONS.ShieldCheck size={14} className="text-emerald-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    2. Higienização Pessoal, Utensílios e Bancada
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    {
                      id: "hands",
                      state: hygieneHands,
                      setter: setHygieneHands,
                      title: "Lavagem das Mãos",
                      desc: "Mãos lavadas cirurgicamente e desinfetadas com gel antibacteriano.",
                    },
                    {
                      id: "hair",
                      state: hygieneHair,
                      setter: setHygieneHair,
                      title: "Proteção de Cabelo",
                      desc: "Uso de barrete de proteção capilar e barba aparada ou protegida.",
                    },
                    {
                      id: "uniform",
                      state: hygieneUniform,
                      setter: setHygieneUniform,
                      title: "Fardamento Limpo",
                      desc: "Dólman, avental e fardamento imaculados e dedicados exclusivamente.",
                    },
                    {
                      id: "utensils",
                      state: sanitizedUtensils,
                      setter: setSanitizedUtensils,
                      title: "Utensílios Desinfetados",
                      desc: "Facas, tábuas de corte e recipientes desinfetados antes do uso.",
                    },
                    {
                      id: "surfaces",
                      state: sanitizedSurfaces,
                      setter: setSanitizedSurfaces,
                      title: "Bancadas Desinfetadas",
                      desc: "Superfícies de trabalho desinfetadas com agentes biodegradáveis.",
                    },
                    {
                      id: "separation",
                      state: separationRawCoo,
                      setter: setSeparationRawCoo,
                      title: "Sem Contaminação Cruzada",
                      desc: "Separação física absoluta entre alimentos crus e prontos a comer.",
                    },
                    {
                      id: "washed",
                      state: washedIngredients,
                      setter: setWashedIngredients,
                      title: "Ingredientes Lavados",
                      desc: "Legumes e vegetais lavados e higienizados minuciosamente.",
                    },
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => item.setter(!item.state)}
                      className={`p-4 rounded-xl border cursor-pointer select-none transition-all duration-300 flex items-start gap-3 text-left ${
                        item.state
                          ? "bg-emerald-50/40 border-emerald-200"
                          : "bg-slate-50 border-transparent hover:border-slate-200"
                      }`}
                    >
                      <div
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                          item.state
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {item.state && <ICONS.Check size={10} className="stroke-[3]" />}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 leading-none">
                          {item.title}
                        </p>
                        <p className="text-[8.5px] text-slate-400 font-semibold leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observations and notes */}
              <div className="space-y-1 text-left pt-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ICONS.Info size={13} className="text-slate-400" />
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    Observações Adicionais / Registo de Anomalias
                  </label>
                </div>
                <textarea
                  className="w-full h-20 p-4 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-orange-500 transition-all resize-none text-slate-700"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Ex: Todas as condições ideais. Cozinha do cliente equipada de acordo com as especificações. Sem contaminação..."
                />
              </div>

              {/* Legal commitment signature */}
              <div
                onClick={() => setSignatureChecked(!signatureChecked)}
                className={`p-5 rounded-2xl border cursor-pointer select-none transition-all duration-300 text-left flex items-start gap-3.5 ${
                  signatureChecked
                    ? "bg-orange-50/40 border-orange-200"
                    : "bg-slate-50/50 border-dashed border-slate-200 hover:border-orange-200"
                }`}
              >
                <div
                  className={`mt-1.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                    signatureChecked
                      ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {signatureChecked && <ICONS.Check size={12} className="stroke-[3]" />}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-950">
                    Compromisso de Honra e Responsabilidade Técnica
                  </p>
                  <p className="text-[9px] text-slate-500 font-semibold leading-relaxed">
                    Confirmo, sob compromisso de honra, que efetuei todas as verificações de segurança alimentar
                    acima selecionadas de acordo com as diretrizes do regulamento HACCP e o plano de segurança
                    Cookr. Autorizo o registo destes dados como prova de salvaguarda legal da minha atividade profissional.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !signatureChecked}
                className="w-full h-14 bg-slate-950 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all hover:bg-orange-500 disabled:opacity-50 disabled:bg-slate-400 disabled:hover:bg-slate-400 active:scale-97 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <ICONS.RefreshCw className="animate-spin" size={14} />
                    A Gravar Livro de Higiene...
                  </>
                ) : (
                  "Submeter e Validar Livro de Higiene Digital"
                )}
              </button>
            </form>
          ) : (
            /* History of records */
            <div className="space-y-4">
              {isLoading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                  <ICONS.RefreshCw className="animate-spin text-orange-500" size={32} />
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    A carregar registos HACCP...
                  </p>
                </div>
              ) : checklists.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-[2rem] border border-slate-100 flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100">
                    <ICONS.FileText size={24} />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      Sem Registos HACCP
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-relaxed">
                      Ainda não efetuou nenhuma verificação rápida de higiene nesta conta de Chef. Grave o seu primeiro registo antes do próximo serviço!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {checklists.map((log) => {
                    const isExpanded = expandedChecklistId === log.id;
                    const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    }) : "";

                    const checksCount = [
                      log.transportIsothermal,
                      log.hygieneHands,
                      log.hygieneHair,
                      log.hygieneUniform,
                      log.sanitizedUtensils,
                      log.sanitizedSurfaces,
                      log.separationRawCoo,
                      log.washedIngredients
                    ].filter(Boolean).length;

                    return (
                      <div
                        key={log.id}
                        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:border-slate-200 transition-all text-left"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-black text-slate-950 uppercase tracking-tight">
                                Cliente: {log.clientName}
                              </span>
                              <span className="text-[7.5px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-md">
                                Ref: {log.bookingId === "avulso" ? "Serviço Avulso" : log.bookingId.substring(0, 8)}
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">
                              Submetido a {dateStr}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Temperature indicator badge */}
                            <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase flex items-center gap-1 shadow-sm ${
                              log.transportTemp <= 4
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : log.transportTemp >= 60
                                ? "bg-orange-50 text-orange-700 border-orange-100"
                                : "bg-amber-50 text-amber-700 border-amber-100"
                            }`}>
                              <ICONS.Moon size={11} className="shrink-0" />
                              {log.transportTemp}°C
                            </div>

                            {/* Checks Count Badge */}
                            <span className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase rounded-xl">
                              {checksCount}/8 Tópicos
                            </span>

                            <button
                              onClick={() => setExpandedChecklistId(isExpanded ? null : log.id)}
                              className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <ICONS.ChevronDown size={14} className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-5 pt-4 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                  Parâmetros Auditados
                                </h5>
                                <ul className="space-y-1.5">
                                  {[
                                    { checked: log.transportIsothermal, label: "Mala Isotérmica Limpa" },
                                    { checked: log.hygieneHands, label: "Lavagem Cirúrgica de Mãos" },
                                    { checked: log.hygieneHair, label: "Touca / Proteção Capilar" },
                                    { checked: log.hygieneUniform, label: "Fardamento Exclusivo e Limpo" },
                                    { checked: log.sanitizedUtensils, label: "Desinfeção de Facas/Tábuas" },
                                    { checked: log.sanitizedSurfaces, label: "Desinfeção de Superfícies" },
                                    { checked: log.separationRawCoo, label: "Controlo de Contaminação Cruzada" },
                                    { checked: log.washedIngredients, label: "Higienização de Ingredientes" }
                                  ].map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                      {item.checked ? (
                                        <ICONS.CheckCircle size={12} className="text-emerald-500 shrink-0" />
                                      ) : (
                                        <ICONS.XCircle size={12} className="text-red-400 shrink-0" />
                                      )}
                                      <span className={`text-[10px] font-bold ${item.checked ? "text-slate-800" : "text-slate-400 font-medium"}`}>
                                        {item.label}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="space-y-3">
                                <div>
                                  <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Observações do Chef
                                  </h5>
                                  <p className="text-[10px] font-medium text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic min-h-[60px]">
                                    {log.observations || "Sem observações extra registadas."}
                                  </p>
                                </div>

                                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-left">
                                  <p className="text-[8px] font-black uppercase text-emerald-800 tracking-wide flex items-center gap-1">
                                    <ICONS.ShieldCheck size={11} />
                                    Autenticação & Validação de Conformidade
                                  </p>
                                  <p className="text-[7.5px] text-slate-500 font-bold leading-relaxed mt-1">
                                    Verificado e autenticado eletronicamente por <strong>Chef {log.cookName}</strong> sob o código do regulamento HACCP internacional e o sistema de qualidade Cookr.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* --- NEW SERVICE LOG MODULE --- */
        <div className="space-y-6">
          {/* Subtabs inside service_log */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 shadow-inner w-full sm:w-auto self-start flex-row inline-flex">
            <button
              onClick={() => setServiceLogTab("new")}
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                serviceLogTab === "new"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <ICONS.Plus size={11} />
              Novo Registo de Higiene
            </button>
            <button
              onClick={() => setServiceLogTab("history")}
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                serviceLogTab === "history"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <ICONS.FileText size={11} />
              Histórico de Serviço ({serviceLogs.length})
            </button>
          </div>

          {serviceLogTab === "new" ? (
            <form onSubmit={handleLogSubmit} className="bg-white p-5 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
                    Registo de Higiene da Cozinha (Antes / Após Serviço)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Garante e atesta a conformidade das condições de segurança na cozinha do cliente
                  </p>
                </div>
                
                {/* Log Type Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                  <button
                    type="button"
                    onClick={() => setLogType("before_service")}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all duration-200 ${
                      logType === "before_service"
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-950"
                    }`}
                  >
                    🟢 Antes do Serviço
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogType("after_service")}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all duration-200 ${
                      logType === "after_service"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-950"
                    }`}
                  >
                    🔵 Após o Serviço
                  </button>
                </div>
              </div>

              {/* Grid selectors for Date & Associated Booking */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Data do Serviço
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full h-12 px-4 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-orange-500 transition-all text-slate-700"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Serviço / Ritual Associado
                  </label>
                  <select
                    className="w-full h-12 px-4 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-orange-500 transition-all cursor-pointer text-slate-700"
                    value={logBookingId}
                    onChange={(e) => setLogBookingId(e.target.value)}
                  >
                    <option value="">-- Serviço Geral / Manutenção de Cozinha --</option>
                    {eligibleBookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.clientName} - {b.data} {b.hora ? `(${b.hora})` : ""} - {b.menu_selected}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick checks list with beautiful toggle boxes */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                  <ICONS.ShieldCheck size={14} className="text-orange-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Parâmetros de Controlo de Higiene {logType === "before_service" ? "Pré-Serviço" : "Pós-Serviço"}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    {
                      state: temperaturesOk,
                      setter: setTemperaturesOk,
                      title: "Temperatura Controlada",
                      desc: "Equipamentos de refrigeração e confeção com temperaturas ideais.",
                    },
                    {
                      state: surfacesSanitized,
                      setter: setSurfacesSanitized,
                      title: "Superfícies & Equipamentos",
                      desc: "Bancadas, pias e aparelhos higienizados e desinfetados antes/depois do uso.",
                    },
                    {
                      state: personalHygieneOk,
                      setter: setPersonalHygieneOk,
                      title: "Higiene Individual",
                      desc: "Lavagem frequente de mãos, uso de luvas/touca se necessário, fardamento limpo.",
                    },
                    {
                      state: rawReadySeparation,
                      setter: setRawReadySeparation,
                      title: "Contaminação Cruzada",
                      desc: "Separação física estrita de matérias-primas cruas e alimentos confecionados.",
                    },
                    {
                      state: wasteDisposed,
                      setter: setWasteDisposed,
                      title: "Gestão de Resíduos",
                      desc: "Lixo devidamente acondicionado em sacos fechados e contentores limpos.",
                    },
                    {
                      state: pestControlOk,
                      setter: setPestControlOk,
                      title: "Vedação & Pragas",
                      desc: "Ausência de quaisquer indícios de pragas e integridade sanitária do espaço.",
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      onClick={() => item.setter(!item.state)}
                      className={`p-4 rounded-xl border cursor-pointer select-none transition-all duration-300 flex items-start gap-3 text-left ${
                        item.state
                          ? "bg-emerald-50/40 border-emerald-200"
                          : "bg-red-50/40 border-red-200"
                      }`}
                    >
                      <div
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                          item.state
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "bg-red-500 border-red-500 text-white"
                        }`}
                      >
                        {item.state ? (
                          <ICONS.Check size={10} className="stroke-[3]" />
                        ) : (
                          <ICONS.X size={10} className="stroke-[3]" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 leading-none flex items-center gap-1.5">
                          {item.title}
                          {!item.state && (
                            <span className="text-[7px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">
                              Alerta
                            </span>
                          )}
                        </p>
                        <p className="text-[8.5px] text-slate-400 font-semibold leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Log observations */}
              <div className="space-y-1 text-left pt-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ICONS.Info size={13} className="text-slate-400" />
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    Observações de Higiene / Relato de Anomalias
                  </label>
                </div>
                <textarea
                  className="w-full h-20 p-4 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-orange-500 transition-all resize-none text-slate-700"
                  value={logObservations}
                  onChange={(e) => setLogObservations(e.target.value)}
                  placeholder="Ex: Cozinha em excelentes condições. Equipamentos elétricos higienizados. Ausência de anomalias..."
                />
              </div>

              {/* Legal commitment signature */}
              <div
                onClick={() => setLogSignatureChecked(!logSignatureChecked)}
                className={`p-5 rounded-2xl border cursor-pointer select-none transition-all duration-300 text-left flex items-start gap-3.5 ${
                  logSignatureChecked
                    ? "bg-orange-50/40 border-orange-200"
                    : "bg-slate-50/50 border-dashed border-slate-200 hover:border-orange-200"
                }`}
              >
                <div
                  className={`mt-1.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                    logSignatureChecked
                      ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {logSignatureChecked && <ICONS.Check size={12} className="stroke-[3]" />}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-950">
                    Declaração de Conformidade Sanitária e Qualidade
                  </p>
                  <p className="text-[9px] text-slate-500 font-semibold leading-relaxed">
                    Atesto e assino que as condições higiénico-sanitárias desta cozinha foram avaliadas e registadas
                    sob minha inteira responsabilidade profissional de acordo com as normas HACCP vigentes em território português.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLogSubmitting || !logSignatureChecked}
                className="w-full h-14 bg-slate-950 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all hover:bg-orange-500 disabled:opacity-50 disabled:bg-slate-400 disabled:hover:bg-slate-400 active:scale-97 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLogSubmitting ? (
                  <>
                    <ICONS.RefreshCw className="animate-spin" size={14} />
                    A submeter diário de higiene...
                  </>
                ) : (
                  `Validar e Registar Higiene (${logType === "before_service" ? "Pré-Serviço" : "Pós-Serviço"})`
                )}
              </button>
            </form>
          ) : (
            /* --- SERVICE LOG HISTORY --- */
            <div className="space-y-4">
              {isLogsLoading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                  <ICONS.RefreshCw className="animate-spin text-orange-500" size={32} />
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    A carregar diário de higiene...
                  </p>
                </div>
              ) : serviceLogs.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-[2rem] border border-slate-100 flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100">
                    <ICONS.ShieldCheck size={24} />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      Sem Diários de Higiene
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-relaxed">
                      Ainda não registou diários de higiene de cozinha (antes ou após serviço) para este perfil de Chef. Comece a registar para aumentar a confiança do cliente!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {serviceLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    }) : "";

                    const checksCount = [
                      log.temperaturesOk,
                      log.surfacesSanitized,
                      log.personalHygieneOk,
                      log.wasteDisposed,
                      log.pestControlOk,
                      log.rawReadySeparation
                    ].filter(Boolean).length;

                    return (
                      <div
                        key={log.id}
                        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:border-slate-200 transition-all text-left"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {log.logType === "before_service" ? (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-100 text-emerald-800">
                                  🟢 Pré-Serviço
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-blue-100 text-blue-800">
                                  🔵 Pós-Serviço
                                </span>
                              )}
                              <span className="text-[10px] font-black text-slate-950 uppercase tracking-tight">
                                {log.clientName}
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">
                              Logado a {dateStr}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Score indicator */}
                            <span className={`px-2.5 py-1.5 text-[9px] font-black uppercase rounded-xl border ${
                              checksCount === 6
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : checksCount >= 4
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : "bg-red-50 text-red-700 border-red-100"
                            }`}>
                              {checksCount}/6 Itens Conformes
                            </span>

                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <ICONS.ChevronDown size={14} className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-5 pt-4 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                  Parâmetros Verificados
                                </h5>
                                <ul className="space-y-1.5">
                                  {[
                                    { checked: log.temperaturesOk, label: "Temperaturas Controladas" },
                                    { checked: log.surfacesSanitized, label: "Superfícies & Equipamentos Sanitizados" },
                                    { checked: log.personalHygieneOk, label: "Higiene Individual Conforme" },
                                    { checked: log.rawReadySeparation, label: "Separação de Alimentos Evita Cruzamento" },
                                    { checked: log.wasteDisposed, label: "Resíduos e Lixo Eliminados" },
                                    { checked: log.pestControlOk, label: "Prevenção de Pragas Conforme" }
                                  ].map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                      {item.checked ? (
                                        <ICONS.CheckCircle size={12} className="text-emerald-500 shrink-0" />
                                      ) : (
                                        <ICONS.XCircle size={12} className="text-red-500 shrink-0" />
                                      )}
                                      <span className={`text-[10px] font-bold ${item.checked ? "text-slate-800" : "text-slate-400 font-medium"}`}>
                                        {item.label}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="space-y-3">
                                <div>
                                  <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Observações Higiénico-Sanitárias
                                  </h5>
                                  <p className="text-[10px] font-medium text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic min-h-[60px]">
                                    {log.observations || "Sem anotações extra de higiene registadas."}
                                  </p>
                                </div>

                                <div className="p-3 bg-slate-900 text-white rounded-xl text-left border border-slate-800">
                                  <p className="text-[8px] font-black uppercase text-orange-500 tracking-wide flex items-center gap-1">
                                    🛡️ Certificação Eletrónica Cookr HACCP
                                  </p>
                                  <p className="text-[7.5px] text-white/50 font-semibold leading-relaxed mt-1">
                                    Atestado digitalmente sob compromisso de honra por <strong>Chef {log.cookName}</strong>. Este registo constitui prova auditável de segurança alimentar.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

interface ProductEmptyStateProps {
  type: "experience" | "dish" | "daily" | "haccp";
  onAction: () => void;
  onLearnMore?: () => void;
}

const ProductEmptyState: React.FC<ProductEmptyStateProps> = ({
  type,
  onAction,
  onLearnMore,
}) => {
  const config = useMemo(() => {
    switch (type) {
      case "experience":
        return {
          icon: <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-orange-500" strokeWidth={1.5} />,
          badge: "Rituais de Assinatura",
          title: "Ainda não adicionou nenhum Ritual?",
          description:
            "Este é o seu espaço para gerir os rituais gastronómicos e menus de degustação. Crie já a sua primeira experiência culinária completa (entrada, prato principal e sobremesa) para começar a receber reservas exclusivas!",
          actionLabel: "Criar Primeiro Ritual",
          learnMoreLabel: "Saiba mais sobre Rituais",
          highlights: [
            "Menus completos em várias fases",
            "Preços personalizados por dimensão de grupo",
            "Aprovação e destaque na montra da Cookr",
          ],
        };
      case "dish":
        return {
          icon: <UtensilsCrossed className="w-10 h-10 md:w-12 md:h-12 text-orange-500" strokeWidth={1.5} />,
          badge: "Carta Individual",
          title: "Ainda não adicionou nenhum Prato?",
          description:
            "Adicione as suas especialidades gastronómicas individuais à carta da Cookr. Permite aos clientes encomendar pratos avulsos para o dia-a-dia ou desenhar menus personalizados para qualquer ocasião.",
          actionLabel: "Adicionar Primeiro Prato",
          learnMoreLabel: "Como estruturar Pratos",
          highlights: [
            "Ideal para refeições pontuais e avulsas",
            "Indicação clara de calorias e alergénios",
            "Vitrine destacada no perfil público do Chef",
          ],
        };
      case "daily":
        return {
          icon: <Calendar className="w-10 h-10 md:w-12 md:h-12 text-orange-500" strokeWidth={1.5} />,
          badge: "Packs Daily & Meal Prep",
          title: "Ainda não criou nenhum Pack Daily?",
          description:
            "Ofereça packs semanais de refeições frescas e saudáveis preparadas com antecedência para o dia-a-dia. Os clientes recebem as doses programadas para a semana toda, garantindo-lhe receita recorrente e previsível.",
          actionLabel: "Criar Pack Daily",
          learnMoreLabel: "Guia Meal Prep Daily",
          highlights: [
            "Packs de 5, 8 ou 10 doses semanais",
            "Entregas programadas ou recolha na cozinha",
            "Fidelização e receitas previsíveis",
          ],
        };
      case "haccp":
      default:
        return {
          icon: <ShieldCheck className="w-10 h-10 md:w-12 md:h-12 text-orange-500" strokeWidth={1.5} />,
          badge: "Segurança Alimentar HACCP",
          title: "Ainda não tem Registos de Segurança HACCP?",
          description:
            "Mantenha a conformidade higiossanitária com checklists de transporte e diários de higiene de bancada antes e após cada serviço. O rigor HACCP protege a sua atividade profissional e gera máxima confiança junto dos anfitriões.",
          actionLabel: "Iniciar Protocolo HACCP",
          learnMoreLabel: "Normas de Higiene HACCP",
          highlights: [
            "Auditoria de temperatura da mala isotérmica (≤ 4°C)",
            "Controlo de contaminação cruzada e desinfeção",
            "Histórico transparente auditável em reservas",
          ],
        };
    }
  }, [type]);

  return (
    <div className="bg-slate-50/70 rounded-2xl md:rounded-[2.5rem] border border-slate-200/80 p-8 md:p-12 text-left relative overflow-hidden transition-all duration-300 shadow-xs animate-in fade-in zoom-in-95">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 justify-between">
        {/* Left Icon Display */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-center relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent rounded-2xl md:rounded-3xl" />
            {config.icon}
            <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center shadow-md border-2 border-white">
              <Sparkles size={12} className="text-orange-400" />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 space-y-3 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100/70 text-orange-700 text-[9px] font-black uppercase tracking-wider">
              {config.badge}
            </span>
            <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">
              Catálogo Vazio
            </span>
          </div>

          <h3 className="text-lg md:text-2xl font-black text-slate-900 uppercase tracking-tight">
            {config.title}
          </h3>

          <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed max-w-xl">
            {config.description}
          </p>

          {/* Highlights */}
          <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-2">
            {config.highlights.map((h, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200/70 text-[9.5px] font-bold text-slate-700 shadow-2xs"
              >
                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                <span>{h}</span>
              </span>
            ))}
          </div>

          {/* Buttons */}
          <div className="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <button
              type="button"
              onClick={onAction}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-5 py-2.5 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-orange-200 transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={15} className="stroke-[2.5]" />
              <span>{config.actionLabel}</span>
            </button>

            {onLearnMore && (
              <button
                type="button"
                onClick={onLearnMore}
                className="border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-950 bg-white rounded-xl px-4 py-2.5 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                <BookOpen size={14} className="text-slate-400" />
                <span>{config.learnMoreLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const KitchenGuideModal: React.FC<{
  tab: string | null;
  onClose: () => void;
  onStart: () => void;
}> = ({ tab, onClose, onStart }) => {
  if (!tab) return null;

  const content = {
    experience: {
      title: "Como Criar um Ritual Gastronómico de Sucesso",
      subtitle: "Experiências completas ao domicílio que encantam anfitriões e convidados",
      icon: Sparkles,
      tips: [
        {
          title: "Estruturação por Fases",
          desc: "Um ritual clássico é composto por Entrada, Prato Principal e Sobremesa. Pode também adicionar Amuse-Bouche ou Digestivo.",
        },
        {
          title: "Fotografia e Apresentação",
          desc: "Utilize imagens em alta resolução com boa iluminação natural dos seus pratos finalizados.",
        },
        {
          title: "Preçário e Dimensão de Grupos",
          desc: "Defina o preço base por pessoa e utilize descontos para grupos maiores ou suplementos de fim de semana.",
        },
      ],
      action: "Criar Ritual Agora",
    },
    dish: {
      title: "Guia para Pratos da Carta Individual",
      subtitle: "Especialidades avulsas para jantares informais e preferências flexíveis",
      icon: UtensilsCrossed,
      tips: [
        {
          title: "Descrição Cativante dos Ingredientes",
          desc: "Destaque a proveniência dos ingredientes (ex: peixe fresco da costa, carnes DOP, vegetais de época).",
        },
        {
          title: "Alerta de Alergénios",
          desc: "Registe glúten, lactose, frutos secos ou marisco para que anfitriões com restrições alimentares comprem em total segurança.",
        },
        {
          title: "Porções e Sugestões",
          desc: "Indique o tamanho da dose ou sugestão de harmonização com vinho.",
        },
      ],
      action: "Adicionar Prato",
    },
    daily: {
      title: "Guia de Meal Prep & Packs Daily",
      subtitle: "Refeições da semana entregues na casa dos clientes com receita recorrente",
      icon: Calendar,
      tips: [
        {
          title: "Embalamento e Conservação",
          desc: "Embalagens herméticas, rotuladas com data de confeção e instruções simples de reaquecimento (fogão ou forno).",
        },
        {
          title: "Equilíbrio Nutricional",
          desc: "Menos gordura saturada, proteína equilibrada e hidratos complexos para o bem-estar diário dos clientes.",
        },
        {
          title: "Logística de Entrega",
          desc: "Combine entregas ao domingo à tarde ou segunda de manhã em malas térmicas certificadas.",
        },
      ],
      action: "Criar Pack Daily",
    },
    haccp: {
      title: "Manual de Rigor e Higiene HACCP",
      subtitle: "Procedimentos de transporte e confeção em casa do cliente",
      icon: ShieldCheck,
      tips: [
        {
          title: "Cadeia de Frio no Transporte",
          desc: "Mantenha alimentos refrigerados sempre abaixo de 4°C e congelados abaixo de -18°C durante a viagem.",
        },
        {
          title: "Controlo de Contaminação Cruzada",
          desc: "Separação estrita entre alimentos crus e cozinhados com tábuas e facas distintas.",
        },
        {
          title: "Higienização Cirúrgica de Bancadas",
          desc: "Desinfeção completa da bancada da cozinha antes do início da preparação e no término do serviço.",
        },
      ],
      action: "Iniciar Protocolo HACCP",
    },
  }[tab] || {
    title: "Guia de Gestão da Cozinha",
    subtitle: "Boas práticas Cookr",
    icon: Info,
    tips: [],
    action: "Começar",
  };

  const IconComp = content.icon;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 space-y-6 text-left relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-950 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
            <IconComp size={22} />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-black text-slate-950 uppercase tracking-tight">
              {content.title}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              {content.subtitle}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {content.tips.map((tip, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                {tip.title}
              </h4>
              <p className="text-[11px] text-slate-500 pl-7 leading-relaxed font-medium">
                {tip.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onStart();
            }}
            className="flex-1 py-3 px-5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-orange-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={15} />
            <span>{content.action}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

interface KitchenManagerProps {
  chef: User;
  onRefresh: () => void;
  onNavigate?: (view: "ops" | "agenda" | "kitchen") => void;
  bookings?: Booking[];
}

const KitchenManager: React.FC<KitchenManagerProps> = React.memo(({
  chef,
  onRefresh,
  onNavigate,
  bookings = [],
}) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<
    "experience" | "dish" | "daily" | "haccp"
  >("experience");
  const [showAdd, setShowAdd] = useState(false);
  const [showHaccpForm, setShowHaccpForm] = useState(false);
  const [haccpCount, setHaccpCount] = useState<number | null>(null);
  const [guideModalTab, setGuideModalTab] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState({
    nome: "",
    descricao: "",
    preco: 45,
    calories: undefined as number | undefined,
    cuisineType: "",
    category: "",
    selectedMood: "" as string,
    imageUrl: "",
    gallery: [] as string[],
    // Ritual Phases
    courses: [
      { tipo: "Entrada", conteudo: "", imageUrl: "", preco_adicional: 0 },
      { tipo: "Prato Principal", conteudo: "", imageUrl: "", preco_adicional: 0 },
    ],
    // Meal Prep fields
    packSize: 5,
    deliveryType: "delivery" as "delivery" | "pickup" | "both",
    dietaryTags: [] as string[],
    // Dynamic Pricing fields
    dynamicPricingEnabled: false,
    weekendSurcharge: 15,
    groupDiscount: 10,
    minGroupSize: 5,
  });

  const [uploadingPhaseIdx, setUploadingPhaseIdx] = useState<number | null>(null);

  const handlePhaseImageUpload = async (index: number, file: File) => {
    if (file) {
      setUploadingPhaseIdx(index);
      try {
        const url = await supabaseService.uploadAvatar(
          `course-${chef.id}-${index}-${Date.now()}`,
          file,
        );
        const updated = [...newItem.courses];
        updated[index] = {
          ...updated[index],
          imageUrl: url,
        };
        setNewItem((prev) => ({ ...prev, courses: updated }));
      } catch (err: any) {
        alert(err.message || "Erro ao carregar imagem do prato.");
      } finally {
        setUploadingPhaseIdx(null);
      }
    }
  };

  const loadMenu = async () => {
    try {
      const allMenus = await supabaseService.getAllMenusList();
      const chefMenus = allMenus.filter((m) => m.cookId === chef.id);
      setItems(chefMenus);
    } catch (e) {
      console.warn("Aviso ao carregar menus:", e);
    }
  };

  const checkHaccpStatus = useCallback(async () => {
    try {
      const [cList, lList] = await Promise.all([
        supabaseService.getHaccpChecklistsByCookId(chef.id),
        supabaseService.getHaccpLogsByCookId(chef.id),
      ]);
      setHaccpCount((cList?.length || 0) + (lList?.length || 0));
    } catch {
      setHaccpCount(0);
    }
  }, [chef.id]);

  useEffect(() => {
    loadMenu();
    checkHaccpStatus();
  }, [chef.id, checkHaccpStatus]);

  const handleOpenAddForSubTab = (tab: "experience" | "dish" | "daily" | "haccp") => {
    if (tab === "haccp") {
      setShowHaccpForm(true);
      return;
    }
    setEditingId(null);
    setNewItem({
      nome: "",
      descricao: "",
      preco: tab === "daily" ? 65 : tab === "dish" ? 22 : 45,
      calories: undefined,
      cuisineType: "",
      category: "",
      selectedMood: "",
      imageUrl: "",
      gallery: [],
      courses: [
        { tipo: "Entrada", conteudo: "", imageUrl: "", preco_adicional: 0 },
        { tipo: "Prato Principal", conteudo: "", imageUrl: "", preco_adicional: 0 },
      ],
      packSize: 5,
      deliveryType: "delivery",
      dietaryTags: [],
      dynamicPricingEnabled: false,
      weekendSurcharge: 15,
      groupDiscount: 10,
      minGroupSize: 5,
    });
    setActiveSubTab(tab);
    setShowAdd(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingImage(true);
      try {
        const url = await supabaseService.uploadAvatar(
          `menu-${chef.id}-${Date.now()}`,
          file,
        );
        if (!newItem.imageUrl) {
          setNewItem((prev) => ({
            ...prev,
            imageUrl: url,
            gallery: [...prev.gallery, url],
          }));
        } else {
          setNewItem((prev) => ({ ...prev, gallery: [...prev.gallery, url] }));
        }
      } catch (err: any) {
        alert(err.message || "Erro ao carregar imagem.");
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const addPhase = () => {
    setNewItem((prev) => ({
      ...prev,
      courses: [...prev.courses, { tipo: "", conteudo: "", imageUrl: "", preco_adicional: 0 }],
    }));
  };

  const updatePhase = (
    index: number,
    field: "tipo" | "conteudo" | "imageUrl" | "preco_adicional",
    value: any,
  ) => {
    const updated = [...newItem.courses];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setNewItem((prev) => ({ ...prev, courses: updated }));
  };

  const removePhase = (index: number) => {
    setNewItem((prev) => ({
      ...prev,
      courses: prev.courses.filter((_, i) => i !== index),
    }));
  };

  const handleAddItem = async () => {
    setIsSaving(true);
    try {
      const moodTags: Record<string, string[]> = {
        romantico: ["romântico", "intimista", "degustação", "luxo"],
        amigos: ["partilha", "tapas", "fingerfood", "amigos", "casual"],
        business: ["executivo", "rápido", "formal", "almoço"],
        familia: [
          "tradicional",
          "família",
          "conforto",
          "portuguesa",
          "abundante",
        ],
      };

      const payload: any = {
        ...(editingId ? { id: editingId } : {}),
        cook_id: chef.id,
        nome: newItem.nome,
        descricao:
          activeSubTab === "daily"
            ? `Pack Semanal de ${newItem.packSize} refeições.`
            : newItem.descricao,
        preco: newItem.preco,
        calories: newItem.calories,
        cuisine_type: newItem.cuisineType,
        type: activeSubTab === "daily" ? "dish" : activeSubTab,
        image_url: newItem.imageUrl,
        gallery_urls: newItem.gallery,
        courses: newItem.courses
          .filter((c) => c.conteudo)
          .map((c) => ({
            tipo: c.tipo,
            conteudo: c.conteudo,
            imageUrl: c.imageUrl || "",
            image_url: c.imageUrl || "",
            preco_adicional: Number(c.preco_adicional) || 0
          })),
        tags: [
          newItem.category.toLowerCase(),
          ...(moodTags[newItem.selectedMood] || []),
        ].filter((t) => t),
        is_meal_prep: activeSubTab === "daily",
        pack_size: activeSubTab === "daily" ? newItem.packSize : 1,
        delivery_type:
          activeSubTab === "daily" ? newItem.deliveryType : "delivery",
        dietary_tags: activeSubTab === "daily" ? newItem.dietaryTags : [],
        isAvailable: false, // Reset to "Pendente" until admin approves
        adminNotes: "",     // Clear previous admin rejection notes
        admin_notes: ""     // Clear previous admin rejection notes
      };

      if (newItem.dynamicPricingEnabled) {
        payload.dynamic_pricing = {
          enabled: true,
          weekend_surcharge: Number(newItem.weekendSurcharge) || 0,
          group_discount: Number(newItem.groupDiscount) || 0,
          min_group_size: Number(newItem.minGroupSize) || 0
        };
      } else {
        payload.dynamic_pricing = {
          enabled: false,
          weekend_surcharge: 0,
          group_discount: 0,
          min_group_size: 0
        };
      }

      await supabaseService.createMenu(payload);

      // Só chegamos aqui se não houver erro
      setShowConfirmModal(false);
      setShowAdd(false);
      setEditingId(null);
      setNewItem({
        nome: "",
        descricao: "",
        preco: 45,
        calories: undefined,
        cuisineType: "",
        category: "",
        selectedMood: "",
        imageUrl: "",
        gallery: [],
        courses: [
          { tipo: "Entrada", conteudo: "", imageUrl: "", preco_adicional: 0 },
          { tipo: "Prato Principal", conteudo: "", imageUrl: "", preco_adicional: 0 },
        ],
        packSize: 5,
        deliveryType: "delivery",
        dietaryTags: [],
        dynamicPricingEnabled: false,
        weekendSurcharge: 15,
        groupDiscount: 10,
        minGroupSize: 5,
      });

      // Recarregar dados de forma síncrona
      await loadMenu();
      onRefresh();

      // Feedback visual de sucesso (opcional, mas recomendado)
      if (onNavigate) onNavigate("ops");
    } catch (e: any) {
      console.error("Connection Error:", e);
      alert(`Erro de ligação: ${e.message || "Erro desconhecido"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);

  const deleteItem = async (id: string) => {
    console.log("[KitchenManager] Requesting delete for item:", id);
    try {
      console.log("[KitchenManager] Calling supabaseService.deleteMenu...");
      await supabaseService.deleteMenu(id);
      console.log("[KitchenManager] Delete successful, refreshing list...");
      await loadMenu();
      onRefresh();
      setItemToDelete(null);
      alert("Item eliminado com sucesso.");
    } catch (e: any) {
      console.error("[KitchenManager] Erro ao eliminar:", e);
      alert(`Erro ao eliminar: ${e.message || "Erro desconhecido"}`);
    }
  };

  const filteredItems = useMemo(() => {
    if (activeSubTab === "daily")
      return items.filter((i) => i.is_meal_prep === true);
    return items.filter((i) => i.type === activeSubTab && !i.is_meal_prep);
  }, [items, activeSubTab]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto px-2 md:px-1">
      {/* Custom Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <ICONS.Trash2 className="text-red-500" size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-950 text-center mb-2 italic uppercase tracking-tighter">
              Eliminar {itemToDelete.type}?
            </h3>
            <p className="text-slate-500 text-center text-[10px] font-black uppercase tracking-widest mb-8">
              Tem a certeza que deseja eliminar o{" "}
              {itemToDelete.type.toLowerCase()}{" "}
              <span className="text-slate-900">"{itemToDelete.name}"</span>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => deleteItem(itemToDelete.id)}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-200"
              >
                Sim, eliminar permanentemente
              </button>
              <button
                onClick={() => setItemToDelete(null)}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1">
        <div className="space-y-0.5 text-left">
          <h2 className="text-base font-extrabold italic uppercase tracking-tight">
            Gestão de <span className="text-orange-500">Produtos.</span>
          </h2>
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
            Rituais Gastronómicos e Packs Daily.
          </p>
        </div>
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-inner overflow-x-auto scrollbar-hide w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveSubTab("experience");
              setShowAdd(false);
            }}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all duration-250 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${activeSubTab === "experience" ? "bg-orange-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            <ICONS.Sparkles size={11} className="shrink-0" />
            Rituais
          </button>
          <button
            onClick={() => {
              setActiveSubTab("dish");
              setShowAdd(false);
            }}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all duration-250 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${activeSubTab === "dish" ? "bg-orange-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            <ICONS.Utensils size={11} className="shrink-0" />
            Pratos
          </button>
          <button
            onClick={() => {
              setActiveSubTab("daily");
              setShowAdd(false);
            }}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all duration-250 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${activeSubTab === "daily" ? "bg-orange-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            <ICONS.Calendar size={11} className="shrink-0" />
            Daily
          </button>
          <button
            onClick={() => {
              setActiveSubTab("haccp");
              setShowAdd(false);
              setShowHaccpForm(false);
            }}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all duration-250 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${activeSubTab === "haccp" ? "bg-slate-950 text-white shadow-sm animate-pulse" : "text-slate-500 hover:text-slate-900"}`}
          >
            <ICONS.ShieldCheck size={11} className="shrink-0" />
            Segurança HACCP
          </button>
        </div>
        {activeSubTab !== "haccp" ? (
          <button
            onClick={() => {
              if (!showAdd) {
                setEditingId(null);
                setNewItem({
                  nome: "",
                  descricao: "",
                  preco: activeSubTab === "daily" ? 65 : activeSubTab === "dish" ? 22 : 45,
                  calories: undefined,
                  cuisineType: "",
                  category: "",
                  selectedMood: "",
                  imageUrl: "",
                  gallery: [],
                  courses: [
                    { tipo: "Entrada", conteudo: "", imageUrl: "", preco_adicional: 0 },
                    { tipo: "Prato Principal", conteudo: "", imageUrl: "", preco_adicional: 0 },
                  ],
                  packSize: 5,
                  deliveryType: "delivery",
                  dietaryTags: [],
                  dynamicPricingEnabled: false,
                  weekendSurcharge: 15,
                  groupDiscount: 10,
                  minGroupSize: 5,
                });
              }
              setShowAdd(!showAdd);
            }}
            className="w-8 h-8 bg-slate-950 text-white rounded-lg flex items-center justify-center shadow-sm hover:shadow transition-all active:scale-95 shrink-0 cursor-pointer"
            title="Adicionar Item"
          >
            {showAdd ? <ICONS.XCircle size={14} /> : <ICONS.Plus size={14} />}
          </button>
        ) : (
          <button
            onClick={() => setShowHaccpForm(!showHaccpForm)}
            className="w-8 h-8 bg-slate-950 text-white rounded-lg flex items-center justify-center shadow-sm hover:shadow transition-all active:scale-95 shrink-0 cursor-pointer"
            title="Novo Registo de Segurança HACCP"
          >
            {showHaccpForm ? <ICONS.XCircle size={14} /> : <ICONS.Plus size={14} />}
          </button>
        )}
      </header>

      {showAdd && (
        <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-100 space-y-6 animate-in slide-in-from-top-4">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="flex flex-col gap-3 shrink-0">
              <div
                onClick={() => !uploadingImage && fileInputRef.current?.click()}
                className="w-28 h-28 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all overflow-hidden relative"
              >
                {uploadingImage ? (
                  <ICONS.Clock
                    className="animate-spin text-orange-500"
                    size={24}
                  />
                ) : newItem.imageUrl && newItem.imageUrl !== "" ? (
                  <img
                    src={newItem.imageUrl}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    alt="Preview"
                    loading="lazy"
                  />
                ) : (
                  <>
                    <ICONS.Camera size={24} className="text-slate-300" />
                    <span className="text-[7px] font-black uppercase text-slate-400 mt-2">
                      Capa Principal
                    </span>
                  </>
                )}
              </div>
              {/* Mini Gallery */}
              <div className="flex gap-2 max-w-[176px] overflow-x-auto scrollbar-hide py-1">
                {newItem.gallery.slice(1).map((img, idx) => (
                  <div
                    key={idx}
                    className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 shadow-sm shrink-0"
                  >
                    {img && img !== "" ? (
                      <img
                        src={img}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        alt={`Gallery ${idx}`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                        <ICONS.Camera size={12} className="text-slate-200" />
                      </div>
                    )}
                  </div>
                ))}
                {newItem.gallery.length > 0 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 hover:text-orange-500 transition-colors"
                  >
                    <ICONS.Plus size={14} />
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/*"
              />
            </div>

            <div className="flex-1 w-full space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {activeSubTab === "dish"
                      ? "Nome do Prato"
                      : activeSubTab === "daily"
                      ? "Nome do Pack Daily"
                      : "Nome do Ritual"}
                  </label>
                  <input
                    className="w-full h-12 px-5 bg-slate-50 rounded-xl font-bold text-xs outline-none focus:border-orange-500 border border-transparent transition-all"
                    value={newItem.nome ?? ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, nome: e.target.value })
                    }
                    placeholder={
                      activeSubTab === "dish"
                        ? "Ex: Robalo Selvagem com Risotto de Açafrão"
                        : activeSubTab === "daily"
                        ? "Ex: Pack Semanal Equilíbrio & Frescura (5 Refeições)"
                        : "Ex: Ritual das Arribas"
                    }
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {activeSubTab === "daily" ? "Preço do Pack (€)" : "Preço Total (€)"}
                  </label>
                  <input
                    type="number"
                    className="w-full h-12 px-5 bg-slate-50 rounded-xl font-bold text-xs outline-none focus:border-orange-500 border border-transparent transition-all"
                    value={newItem.preco ?? ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, preco: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Tipo de Cozinha
                  </label>
                  <select
                    className="w-full h-12 px-5 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-orange-500 transition-all"
                    value={newItem.cuisineType}
                    onChange={(e) =>
                      setNewItem({ ...newItem, cuisineType: e.target.value })
                    }
                  >
                    <option value="">Selecionar Cozinha</option>
                    {CUISINES.map((c) => (
                      <option key={c.id} value={c.label}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Categoria
                  </label>
                  <select
                    className="w-full h-12 px-5 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-orange-500 transition-all"
                    value={newItem.category}
                    onChange={(e) =>
                      setNewItem({ ...newItem, category: e.target.value })
                    }
                  >
                    <option value="">Selecionar Categoria</option>
                    <option value="Degustação">Menu Degustação</option>
                    <option value="Casual">Menu Casual</option>
                    <option value="Brunch">Menu Brunch</option>
                    <option value="Tradicional">Menu Tradicional</option>
                    <option value="Fine Dining">Fine Dining</option>
                    <option value="Carne">Carne</option>
                    <option value="Peixe">Peixe</option>
                    <option value="Vegetariano">Vegetariano</option>
                    <option value="Vegan">Vegan</option>
                    <option value="Pasta">Pasta</option>
                    <option value="Sushi">Sushi</option>
                    <option value="Sobremesa">Sobremesa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Coleção / Mood
                  </label>
                  <select
                    className="w-full h-12 px-5 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-orange-500 transition-all"
                    value={newItem.selectedMood}
                    onChange={(e) =>
                      setNewItem({ ...newItem, selectedMood: e.target.value })
                    }
                  >
                    <option value="">Nenhuma Coleção</option>
                    <option value="romantico">Jantar Romântico</option>
                    <option value="amigos">Convívio Amigos</option>
                    <option value="business">Business Lunch</option>
                    <option value="familia">Domingo em Família</option>
                  </select>
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Calorias (Opcional)
                  </label>
                  <input
                    type="number"
                    className="w-full h-12 px-5 bg-slate-50 rounded-xl font-bold text-xs outline-none focus:border-orange-500 border border-transparent transition-all"
                    value={newItem.calories ?? ""}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        calories: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Ex: 450"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {activeSubTab === "dish"
                    ? "Descrição do Prato"
                    : activeSubTab === "daily"
                    ? "Descrição do Pack Daily"
                    : "Descrição do Ritual"}
                </label>
                <textarea
                  className="w-full h-24 p-5 bg-slate-50 rounded-xl font-bold text-xs outline-none focus:border-orange-500 border border-transparent transition-all resize-none"
                  value={newItem.descricao}
                  onChange={(e) =>
                    setNewItem({ ...newItem, descricao: e.target.value })
                  }
                  placeholder={
                    activeSubTab === "dish"
                      ? "Descreve os ingredientes frescos, confeção e guarnições deste prato..."
                      : activeSubTab === "daily"
                      ? "Descreve a ementa semanal das doses, método de conservação e instruções de aquecimento..."
                      : "Descreve os detalhes, ingredientes principais ou a inspiração deste ritual..."
                  }
                />
              </div>

              {activeSubTab === "experience" && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-[10px] font-black uppercase text-slate-950 italic">
                      Fases do Ritual
                    </h4>
                    <button
                      onClick={addPhase}
                      className="text-[8px] font-black uppercase text-orange-500 flex items-center gap-1 hover:text-orange-600 transition-colors"
                    >
                      <ICONS.Plus size={10} /> Adicionar Fase
                    </button>
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-hide pr-2">
                    {newItem.courses.map((c, i) => (
                      <div key={i} className="flex flex-col sm:flex-row gap-3 items-end bg-slate-50/40 p-3 rounded-xl border border-slate-100/85">
                        
                        {/* Course Photo Uploader */}
                        <div className="shrink-0 space-y-1 text-left w-full sm:w-auto">
                          <label className="text-[7px] font-black text-slate-300 uppercase tracking-widest ml-1">
                            Foto
                          </label>
                          <div className="relative">
                            <input
                              type="file"
                              id={`phase-img-input-${i}`}
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhaseImageUpload(i, file);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById(`phase-img-input-${i}`)?.click()}
                              className="w-10 h-10 bg-white border border-slate-200 hover:border-orange-500 rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-500 transition-colors overflow-hidden relative shadow-sm cursor-pointer"
                              disabled={uploadingPhaseIdx === i}
                              title="Adicionar fotografia do prato"
                            >
                              {uploadingPhaseIdx === i ? (
                                <ICONS.Clock className="animate-spin text-orange-500" size={12} />
                              ) : c.imageUrl ? (
                                <img src={c.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Prato" />
                              ) : (
                                <ICONS.Camera size={14} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Course Name */}
                        <div className="flex-1 space-y-1 text-left w-full">
                          <label className="text-[7px] font-black text-slate-300 uppercase tracking-widest ml-1">
                            Fase (ex: Entrada)
                          </label>
                          <input
                            className="w-full h-10 px-4 bg-white border border-slate-100 focus:border-orange-200 rounded-lg text-[10px] font-bold outline-none transition-all shadow-sm"
                            value={c.tipo ?? ""}
                            onChange={(e) =>
                              updatePhase(i, "tipo", e.target.value)
                            }
                            placeholder="Entrada, Prato Principal, etc."
                          />
                        </div>

                        {/* Course Content / Description */}
                        <div className="flex-[2] space-y-1 text-left w-full">
                          <label className="text-[7px] font-black text-slate-300 uppercase tracking-widest ml-1">
                            Descrição do Prato
                          </label>
                          <input
                            className="w-full h-10 px-4 bg-white border border-slate-100 focus:border-orange-200 rounded-lg text-[10px] font-bold outline-none transition-all shadow-sm"
                            value={c.conteudo ?? ""}
                            onChange={(e) =>
                              updatePhase(i, "conteudo", e.target.value)
                            }
                            placeholder="Descreve o prato desta fase..."
                          />
                        </div>

                        {/* Optional Surcharge for this specific dish */}
                        <div className="w-full sm:w-20 space-y-1 text-left">
                          <label className="text-[7px] font-black text-slate-300 uppercase tracking-widest ml-1">
                            Extra (€)
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="w-full h-10 px-3 bg-white border border-slate-100 focus:border-orange-200 rounded-lg text-[10px] font-bold outline-none transition-all shadow-sm"
                            value={c.preco_adicional || ""}
                            onChange={(e) =>
                              updatePhase(i, "preco_adicional", Number(e.target.value))
                            }
                            placeholder="0"
                          />
                        </div>

                        {/* Remove Course */}
                        <button
                          type="button"
                          onClick={() => removePhase(i)}
                          className="w-10 h-10 bg-white hover:bg-red-50 border border-slate-100 hover:border-red-100 text-slate-300 hover:text-red-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
                        >
                          <ICONS.XCircle size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSubTab === "daily" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                  <div className="space-y-1 text-left">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Tamanho do Pack
                    </label>
                    <select
                      className="w-full h-12 px-5 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-orange-500 transition-all"
                      value={newItem.packSize}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          packSize: Number(e.target.value),
                        })
                      }
                    >
                      <option value={1}>Pack 1 Refeição</option>
                      <option value={5}>Pack 5 Refeições</option>
                      <option value={7}>Pack 7 Refeições</option>
                    </select>
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Logística
                    </label>
                    <select
                      className="w-full h-12 px-5 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-orange-500 transition-all"
                      value={newItem.deliveryType}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          deliveryType: e.target.value as any,
                        })
                      }
                    >
                      <option value="delivery">Apenas Entrega</option>
                      <option value="pickup">Apenas Recolha</option>
                      <option value="both">Entrega ou Recolha</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={isSaving || !newItem.nome || uploadingImage}
            className="w-full h-14 bg-slate-950 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all hover:bg-orange-500 active:scale-95 cursor-pointer"
          >
            {isSaving
              ? "A PROCESSAR..."
              : editingId
                ? "GUARDAR ALTERAÇÕES"
                : `PUBLICAR ${activeSubTab.toUpperCase()}`}
          </button>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[600] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] max-w-md w-full p-10 md:p-14 space-y-8 shadow-3xl text-center">
            <div className="w-20 h-20 rounded-3xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto shadow-inner">
              <ICONS.CheckCircle size={40} />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-950 leading-none">
                {editingId ? "Confirmar Alterações?" : "Confirmar Publicação?"}
              </h3>
              <p className="text-xs font-medium text-slate-500 italic leading-relaxed">
                O item{" "}
                <span className="text-slate-900 font-black">
                  "{newItem.nome}"
                </span>{" "}
                {editingId
                  ? "ficará pendente de aprovação pela moderação antes de ser publicado."
                  : "ficará pendente de aprovação pela moderação da Cookr antes de ficar visível."}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 pt-4">
              <button
                onClick={handleAddItem}
                className="h-14 bg-slate-950 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl flex items-center justify-center gap-2 hover:bg-orange-500 transition-colors cursor-pointer"
              >
                {isSaving ? (
                  <ICONS.Clock className="animate-spin" size={16} />
                ) : editingId ? (
                  "Sim, Guardar Alterações"
                ) : (
                  "Sim, Publicar Agora"
                )}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="h-14 bg-white border border-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-slate-950 transition-colors cursor-pointer"
              >
                Rever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Guia Educativo */}
      <KitchenGuideModal
        tab={guideModalTab}
        onClose={() => setGuideModalTab(null)}
        onStart={() => {
          if (guideModalTab) {
            handleOpenAddForSubTab(guideModalTab as any);
          }
        }}
      />

      {activeSubTab === "haccp" ? (
        haccpCount === 0 && !showHaccpForm ? (
          <ProductEmptyState
            type="haccp"
            onAction={() => setShowHaccpForm(true)}
            onLearnMore={() => setGuideModalTab("haccp")}
          />
        ) : (
          <HaccpPanel chef={chef} bookings={bookings} />
        )
      ) : showAdd ? null : filteredItems.length === 0 ? (
        <ProductEmptyState
          type={activeSubTab}
          onAction={() => handleOpenAddForSubTab(activeSubTab)}
          onLearnMore={() => setGuideModalTab(activeSubTab)}
        />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4 px-1">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white overflow-hidden rounded-2xl md:rounded-[2rem] border border-slate-150 shadow-xs flex flex-col group hover:shadow-lg transition-all duration-500"
            >
              <div className="h-24 md:h-36 relative overflow-hidden shrink-0">
                {item.imageUrl && item.imageUrl !== "" ? (
                  <img
                    src={item.imageUrl}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3s]"
                    referrerPolicy="no-referrer"
                    alt={item.nome}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                    {item.is_meal_prep || item.type === "daily" ? (
                      <ICONS.Calendar size={16} className="text-slate-400 shrink-0" />
                    ) : item.type === "dish" ? (
                      <ICONS.Utensils size={16} className="text-slate-400 shrink-0" />
                    ) : (
                      <ICONS.Sparkles size={16} className="text-slate-400 shrink-0" />
                    )}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                
                {/* Status Badge Overlays */}
                <div className="absolute top-2 left-2 md:top-3 md:left-3 z-20 flex flex-col gap-1 items-start">
                  {item.isAvailable === true ? (
                    <span className="px-1.5 py-0.5 md:px-2 md:py-0.5 bg-emerald-500 text-white text-[7px] md:text-[8px] font-black uppercase rounded-md tracking-wider shadow-sm">
                      Ativo
                    </span>
                  ) : item.isAvailable === false && (item.adminNotes || item.admin_notes) ? (
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="px-1.5 py-0.5 md:px-2 md:py-0.5 bg-red-500 text-white text-[7px] md:text-[8px] font-black uppercase rounded-md tracking-wider shadow-sm">
                        Rejeitado
                      </span>
                      <span className="text-[6.5px] bg-slate-950/85 backdrop-blur-md text-red-300 px-1.5 py-0.5 rounded-md font-bold max-w-[100px] truncate" title={item.adminNotes || item.admin_notes}>
                        {item.adminNotes || item.admin_notes}
                      </span>
                    </div>
                  ) : (
                    <span className="px-1.5 py-0.5 md:px-2 md:py-0.5 bg-amber-500 text-white text-[7px] md:text-[8px] font-black uppercase rounded-md tracking-wider shadow-sm animate-pulse">
                      Pendente
                    </span>
                  )}
                </div>

                {/* Edit Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingId(item.id);
                    setNewItem({
                      nome: item.nome || "",
                      descricao: item.descricao || "",
                      preco: item.preco || 0,
                      calories: item.calories,
                      cuisineType: item.cuisine_type || item.cuisineType || "",
                      category: item.tags?.[0] || "",
                      selectedMood: "",
                      imageUrl: item.imageUrl || item.image_url || "",
                      gallery: item.gallery || item.gallery_urls || [],
                      courses: item.courses?.map((c: any) => ({
                        tipo: c.tipo || "",
                        conteudo: c.conteudo || "",
                        imageUrl: c.imageUrl || c.image_url || "",
                        preco_adicional: Number(c.preco_adicional) || 0
                      })) || [
                        { tipo: "Entrada", conteudo: "", imageUrl: "", preco_adicional: 0 },
                        { tipo: "Prato Principal", conteudo: "", imageUrl: "", preco_adicional: 0 },
                      ],
                      packSize: item.pack_size || 5,
                      deliveryType: item.delivery_type || "delivery",
                      dietaryTags: item.dietary_tags || [],
                      dynamicPricingEnabled: item.dynamic_pricing?.enabled || false,
                      weekendSurcharge: item.dynamic_pricing?.weekend_surcharge ?? 15,
                      groupDiscount: item.dynamic_pricing?.group_discount ?? 10,
                      minGroupSize: item.dynamic_pricing?.min_group_size ?? 5,
                    });
                    setActiveSubTab(item.is_meal_prep ? "daily" : item.type === "dish" ? "dish" : "experience");
                    setShowAdd(true);
                    // Scroll to add form smoothly
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="absolute top-2 right-9 md:top-3 md:right-11 w-6 h-6 md:w-8 md:h-8 bg-slate-950/80 backdrop-blur-md rounded-lg md:rounded-xl text-white/80 hover:text-orange-500 hover:bg-white transition-all flex items-center justify-center shadow-md z-20 cursor-pointer"
                  title="Editar este menu"
                >
                  <ICONS.Edit3 size={11} />
                </button>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const typeLabel = item.is_meal_prep
                      ? "Daily"
                      : item.type === "dish"
                        ? "Prato"
                        : "Ritual";
                    setItemToDelete({
                      id: item.id,
                      name: item.nome,
                      type: typeLabel,
                    });
                  }}
                  className="absolute top-2 right-2 md:top-3 md:right-3 w-6 h-6 md:w-8 md:h-8 bg-slate-950/80 backdrop-blur-md rounded-lg md:rounded-xl text-white/80 hover:text-red-500 hover:bg-white transition-all flex items-center justify-center shadow-md z-20 cursor-pointer"
                >
                  <ICONS.XCircle size={12} />
                </button>
                <div className="absolute bottom-2 left-2 right-2 md:bottom-3 md:left-3 md:right-3 text-left">
                  <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[7px] md:text-[8px] font-black uppercase rounded-md tracking-wider shadow-sm">
                    {item.is_meal_prep
                      ? `Pack ${item.pack_size}`
                      : `#${item.tags?.[0] || "Ritual"}`}
                  </span>
                  <h4 className="font-black text-white text-[10px] md:text-sm uppercase tracking-tight mt-0.5 md:mt-1 truncate">
                    {item.nome}
                  </h4>
                </div>
              </div>

              {/* Courses Gallery with Individual Dish Photos */}
              {item.courses && item.courses.length > 0 && (
                <div className="px-2.5 py-2 bg-white border-b border-slate-50 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[6.5px] md:text-[7.5px] font-black text-slate-400 uppercase tracking-widest">
                      Fases do Menu
                    </span>
                    {item.dynamic_pricing?.enabled && (
                      <span className="flex items-center gap-0.5 px-1 py-0.2 bg-orange-100 text-orange-600 rounded text-[5.5px] md:text-[6.5px] font-black uppercase tracking-wider">
                        ⚡ Inteligente
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                    {item.courses.map((course: any, idx: number) => {
                      const img = course.imageUrl || course.image_url;
                      return (
                        <div key={idx} className="flex items-center gap-1 bg-slate-50/50 p-0.5 rounded-lg shrink-0 border border-slate-100 max-w-[110px]">
                          <div className="w-5 h-5 rounded-md bg-slate-100 overflow-hidden shrink-0 relative">
                            {img ? (
                              <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={course.tipo} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-400">
                                <ICONS.Utensils size={7} />
                              </div>
                            )}
                            <span className="absolute bottom-0 right-0 bg-orange-500 text-white font-extrabold text-[4.5px] w-2.5 h-2.5 rounded-tl-md flex items-center justify-center">
                              {idx + 1}
                            </span>
                          </div>
                          <div className="text-left overflow-hidden min-w-[35px]">
                            <h5 className="text-[6.5px] font-extrabold text-slate-800 uppercase truncate">
                              {course.tipo || `Fase ${idx + 1}`}
                            </h5>
                            {Number(course.preco_adicional) > 0 && (
                              <span className="text-[5.5px] font-black text-orange-600">
                                +{course.preco_adicional}€
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dietary Badges if present */}
              {item.dietary_tags && item.dietary_tags.length > 0 && (
                <div className="px-2.5 py-1.5 border-b border-slate-50 bg-white">
                  <DietaryBadges tags={item.dietary_tags} compact={true} />
                </div>
              )}

              {/* Dynamic Pricing Badges */}
              {item.dynamic_pricing?.enabled && (
                <div className="px-2.5 py-1.5 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-1 text-[6px] md:text-[7px] font-black uppercase tracking-wider text-slate-500">
                  <div className="flex items-center gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-orange-500"></span>
                    Fim de semana: <span className="text-slate-900">+{item.dynamic_pricing.weekend_surcharge}%</span>
                  </div>
                </div>
              )}

              <div className="p-2.5 md:p-3 flex justify-between items-center bg-slate-50/50 mt-auto">
                <p className="font-black text-slate-950 text-[11px] md:text-sm">
                  {formatPrice(item.preco)}
                </p>
                <div className="flex flex-col items-end gap-0.5">
                  {item.calories && (
                    <span className="text-[6.5px] md:text-[7.5px] font-black text-slate-400 uppercase tracking-widest">
                      {item.calories} kcal
                    </span>
                  )}
                  <div className="flex items-center gap-0.5 md:gap-1">
                    <ICONS.Zap size={8} className="text-orange-500" />
                    <span className="text-[6.5px] md:text-[7.5px] font-black uppercase text-slate-400">
                      {item.is_meal_prep
                        ? item.delivery_type
                        : `${item.courses?.length || 0} Fases`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

const BookingCalendarWidget: React.FC<{
  bookings: Booking[];
  onSelectBooking: (b: Booking) => void;
}> = React.memo(({ bookings, onSelectBooking }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startDayOfWeek = firstDayOfMonth.getDay();
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const days: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }

  const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const monthNamesInPortuguese = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const getBookingsForDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    return bookings.filter((b) => {
      if (
        b.status === BookingStatus.RESCHEDULE_REQUESTED &&
        b.proposed_date === dateStr
      ) {
        return true;
      }
      return b.data === dateStr;
    });
  };

  const sortedUpcomingBookings = useMemo(() => {
    const todayStr = todayLocal();
    return [...bookings]
      .filter((b) => {
        const isFutureOrToday = b.data >= todayStr;
        const isRelevantStatus = [
          BookingStatus.ACCEPTED,
          BookingStatus.PENDING,
          BookingStatus.IN_PROGRESS,
          BookingStatus.RESCHEDULE_REQUESTED,
          BookingStatus.QUOTE_REQUESTED,
        ].includes(b.status);
        return isFutureOrToday && isRelevantStatus;
      })
      .sort((a, b) => {
        if (a.data !== b.data) {
          return a.data.localeCompare(b.data);
        }
        const aTime = a.hora || "00:00";
        const bTime = b.hora || "00:00";
        return aTime.localeCompare(bTime);
      });
  }, [bookings]);

  return (
    <div className="bg-white p-4 rounded-3xl border border-slate-150 shadow-xs space-y-4 text-left">
      {/* Title */}
      <div className="flex items-center gap-1.5 text-left border-b border-slate-100 pb-2">
        <ICONS.Calendar size={13} className="text-orange-500" />
        <h4 className="text-xs md:text-sm font-extrabold text-slate-900 uppercase tracking-tight">
          Agenda Mensal
        </h4>
      </div>

      {/* Pagination Bar */}
      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1 px-2 hover:bg-slate-200/60 rounded-lg text-slate-600 transition cursor-pointer"
        >
          <ICONS.ChevronLeft size={14} className="stroke-[2.5]" />
        </button>
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-800">
          {monthNamesInPortuguese[month]} {year}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1 px-2 hover:bg-slate-200/60 rounded-lg text-slate-600 transition cursor-pointer"
        >
          <ICONS.ChevronRight size={14} className="stroke-[2.5]" />
        </button>
      </div>

      {/* Weekday Labels Grid */}
      <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-[8px] uppercase tracking-widest text-slate-400 py-1 mb-1">
        {weekdays.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const dayBookings = getBookingsForDate(day);
          const isSelected =
            selectedDate &&
            day.getDate() === selectedDate.getDate() &&
            day.getMonth() === selectedDate.getMonth() &&
            day.getFullYear() === selectedDate.getFullYear();

          const isToday = (() => {
            const t = new Date();
            return (
              day.getDate() === t.getDate() &&
              day.getMonth() === t.getMonth() &&
              day.getFullYear() === t.getFullYear()
            );
          })();

          const hasAccepted = dayBookings.some((b) =>
            [BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS].includes(
              b.status,
            ),
          );
          const hasPending = dayBookings.some(
            (b) =>
              b.status === BookingStatus.PENDING ||
              b.status === BookingStatus.QUOTE_REQUESTED,
          );
          const hasReschedule = dayBookings.some(
            (b) => b.status === BookingStatus.RESCHEDULE_REQUESTED,
          );

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => {
                if (isSelected) {
                  setSelectedDate(null);
                } else {
                  setSelectedDate(day);
                }
              }}
              className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-between transition-all relative border cursor-pointer hover:bg-orange-500/5 ${
                isSelected
                  ? "bg-orange-500 border-orange-500 text-white font-extrabold shadow-sm"
                  : isToday
                    ? "bg-slate-950 border-slate-950 text-white font-extrabold shadow-sm"
                    : "bg-slate-50/40 border-transparent text-slate-700 hover:border-slate-200"
              }`}
            >
              <span className="text-[10px] font-extrabold leading-none">
                {day.getDate()}
              </span>

              {/* Status dots */}
              <div className="flex gap-0.5 justify-center mt-auto pb-0.5 min-h-[4px]">
                {hasAccepted && (
                  <span
                    className={`w-1 h-1 rounded-full ${
                      isSelected ? "bg-white" : isToday ? "bg-emerald-400" : "bg-emerald-500"
                    }`}
                  />
                )}
                {hasPending && (
                  <span
                    className={`w-1 h-1 rounded-full ${
                      isSelected ? "bg-white" : isToday ? "bg-amber-400" : "bg-amber-500"
                    }`}
                  />
                )}
                {hasReschedule && (
                  <span
                    className={`w-1 h-1 rounded-full ${
                      isSelected ? "bg-white" : isToday ? "bg-rose-400" : "bg-rose-500"
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Details list under the calendar */}
      <div className="pt-3 border-t border-slate-100">
        {selectedDate ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-left">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                Reservas ({selectedDate.getDate()} {monthNamesInPortuguese[month].substring(0, 3)})
              </p>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-[8px] font-black uppercase text-orange-500 border-b border-orange-500 hover:text-orange-600 transition"
              >
                Ver Próximas
              </button>
            </div>

            {(() => {
              const matched = getBookingsForDate(selectedDate);
              if (matched.length === 0) {
                return (
                  <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 text-center">
                    <p className="text-[8px] text-slate-400 uppercase tracking-widest font-bold italic">
                      Sem reservas para este dia.
                    </p>
                  </div>
                );
              }
              return (
                <div className="space-y-1.5 font-sans">
                  {matched.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => onSelectBooking(b)}
                      className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 hover:border-orange-200 cursor-pointer shadow-xs text-left transition-all flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9.5px] font-extrabold text-slate-900 uppercase truncate">
                            {b.clientName}
                          </span>
                          <span className="text-[8px] font-black text-orange-500 shrink-0">
                            {b.hora}
                          </span>
                        </div>
                        <p className="text-[8.5px] font-medium text-slate-400 truncate italic">
                          "{b.menu_selected}"
                        </p>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded text-[7px] font-extrabold uppercase tracking-wide ${
                          b.status === BookingStatus.ACCEPTED
                            ? "bg-emerald-100 text-emerald-800"
                            : b.status === BookingStatus.PENDING
                              ? "bg-amber-100 text-amber-800"
                              : b.status === BookingStatus.IN_PROGRESS
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {b.status.substring(0, 8)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 text-left">
              Próximas Reservas
            </p>

            {sortedUpcomingBookings.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 text-center">
                <p className="text-[8px] text-slate-400 uppercase tracking-widest font-bold italic">
                  Sem reservas agendadas.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 font-sans">
                {sortedUpcomingBookings.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    onClick={() => onSelectBooking(b)}
                    className="bg-white p-2.5 rounded-xl border border-slate-100 hover:border-orange-200 cursor-pointer shadow-xs text-left transition-all flex items-center justify-between gap-2 group"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9.5px] font-extrabold text-slate-900 uppercase truncate">
                          {b.clientName}
                        </span>
                        <span className="text-[7.5px] font-black text-slate-400 bg-slate-50 p-0.5 px-1 rounded shrink-0">
                          {b.data.substring(5).replace("-", "/")} às {b.hora}
                        </span>
                      </div>
                      <p className="text-[8.5px] font-medium text-slate-450 truncate italic">
                        "{b.menu_selected}"
                      </p>
                    </div>
                    <ICONS.ChevronRight
                      size={11}
                      className="text-slate-300 group-hover:text-orange-500 transition-colors"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

interface CookBookingCardProps {
  b: Booking;
  client: User | undefined;
  isMealPrep: boolean;
  expiringSoon: boolean;
  pinValue: string;
  onPinChange: (val: string) => void;
  isUpdating: string | null;
  isPastBooking: (b: Booking) => boolean;
  onSelectDetail: (b: Booking) => void;
  onOpenChat: (clientId: string, isPast: boolean) => void;
  onCancel: (b: Booking) => void;
  onStatusChange: (id: string, status: BookingStatus) => void;
  onCompleteWithPin: (b: Booking) => void;
  onCancelFinalizing: (id: string) => void;
  onRequestPin: (id: string) => void;
  onRespondToQuote: (b: Booking) => void;
}

const CookBookingCard: React.FC<CookBookingCardProps> = React.memo(({
  b,
  client,
  isMealPrep,
  expiringSoon,
  pinValue,
  onPinChange,
  isUpdating,
  isPastBooking,
  onSelectDetail,
  onOpenChat,
  onCancel,
  onStatusChange,
  onCompleteWithPin,
  onCancelFinalizing,
  onRequestPin,
  onRespondToQuote,
}) => {
  return (
    <div
      className={`p-3.5 md:p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 transition-all ${
        expiringSoon
          ? "bg-amber-50/30 border-amber-200 shadow-[0_2px_12px_rgba(245,158,11,0.06)]"
          : "bg-white border-slate-100 shadow-sm"
      }`}
    >
      <div className="flex-1 text-left space-y-1 w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0 shadow-inner">
            {client?.avatar_url && client.avatar_url !== "" ? (
              <img
                key={client.avatar_url}
                src={client.avatar_url}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                alt={client.nome}
                loading="lazy"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.src.includes("retry=")) {
                    img.src = `${img.src}${img.src.includes("?") ? "&" : "?"}retry=${Date.now()}`;
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-slate-300 text-[9px]">
                {(b.clientName || "U").charAt(0)}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold text-slate-950 uppercase italic leading-none">
                {b.clientName}
              </span>
              {isMealPrep && (
                <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[8px] font-bold uppercase rounded shadow-sm">
                  Daily
                </span>
              )}
              {isPastBooking(b) && (
                <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[8px] font-bold uppercase rounded shadow-sm border border-red-100 animate-pulse">
                  Decorrido
                </span>
              )}
              {expiringSoon && (
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase rounded shadow-sm border border-amber-300 animate-pulse flex items-center gap-1 leading-none" title="Reserva com início nas próximas 24 horas">
                  <ICONS.Clock size={9} className="stroke-[3px]" />
                  Expira &lt; 24h
                </span>
              )}
            </div>
            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {isMealPrep ? "Entrega em" : "Ritual em"}{" "}
              {b.status === BookingStatus.RESCHEDULE_REQUESTED ? (
                <span className="text-orange-500 font-extrabold">
                  PROPOSTA: {b.proposed_date} às {b.proposed_time}
                </span>
              ) : (
                `${b.data} às ${b.hora}`
              )}
            </span>
          </div>
        </div>
        <div className="pl-0.5 space-y-0.5 mt-1">
          <p className="text-[10.5px] font-bold text-slate-700 italic leading-tight">
            "{b.menu_selected}"
          </p>
          <p className="text-[8px] font-semibold text-slate-400 truncate max-w-[200px] md:max-w-[300px]">
            {b.morada}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end w-full md:w-auto gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
        {/* Secondary Actions Group */}
        <div className="flex items-center gap-1.5 w-full md:w-auto justify-between md:justify-end">
          <div className="flex gap-1.5">
            <button
              onClick={() => onSelectDetail(b)}
              className="h-11 px-5 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-orange-50 transition-all shadow-sm"
            >
              Detalhes
            </button>
            <button
              onClick={() =>
                onOpenChat(
                  b.clientId,
                  [
                    BookingStatus.COMPLETED,
                    BookingStatus.CANCELLED,
                    BookingStatus.REJECTED,
                  ].includes(b.status),
                )
              }
              className="w-11 h-11 bg-slate-950 text-white rounded-xl flex items-center justify-center hover:bg-orange-500 transition-all shadow-md active:scale-95"
            >
              <ICONS.MessageSquare size={15} />
            </button>
          </div>

          {[
            BookingStatus.PENDING,
            BookingStatus.ACCEPTED,
            BookingStatus.IN_PROGRESS,
            BookingStatus.RESCHEDULE_REQUESTED,
          ].includes(b.status) &&
            !isPastBooking(b) && (
              <button
                onClick={() => onCancel(b)}
                className="h-11 px-5 bg-red-50 text-red-500 rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-red-100 transition-all shadow-sm border border-red-100 cursor-pointer"
              >
                Cancelar
              </button>
            )}
        </div>

        {/* Primary Actions Group */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          {b.status === BookingStatus.QUOTE_REQUESTED && (
            <>
              <button
                onClick={() => onRespondToQuote(b)}
                className="flex-1 md:flex-none h-11 px-5 bg-orange-500 text-white rounded-xl font-extrabold text-xs uppercase tracking-wider shadow-md hover:bg-orange-600 transition-all flex items-center justify-center gap-1.5"
              >
                <ICONS.Send size={13} />
                Enviar Orçamento
              </button>
              <button
                onClick={() => onStatusChange(b.id, BookingStatus.REJECTED)}
                className="flex-1 md:flex-none h-11 px-5 bg-white border border-slate-250 text-slate-600 rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm"
              >
                Recusar
              </button>
            </>
          )}

          {b.status === BookingStatus.PENDING && (
            isPastBooking(b) ? (
              <span className="text-xs font-black text-slate-400 uppercase italic">
                Pedido Expirado
              </span>
            ) : (
              <>
                <button
                  onClick={() => onStatusChange(b.id, BookingStatus.ACCEPTED)}
                  className="flex-1 md:flex-none h-11 px-5 bg-orange-500 text-white rounded-xl font-extrabold text-xs uppercase tracking-wider shadow-md hover:bg-orange-600 transition-all"
                >
                  Aceitar
                </button>
                <button
                  onClick={() => onStatusChange(b.id, BookingStatus.REJECTED)}
                  className="flex-1 md:flex-none h-11 px-5 bg-white border border-slate-250 text-slate-600 rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm"
                >
                  Recusar
                </button>
              </>
            )
          )}

          {b.status === BookingStatus.ACCEPTED && (
            <button
              onClick={() => onStatusChange(b.id, BookingStatus.IN_PROGRESS)}
              className="w-full md:w-auto h-11 px-6 rounded-xl font-extrabold text-xs uppercase tracking-wider shadow-md bg-orange-500 text-white hover:bg-orange-600 transition-all"
            >
              Iniciar
            </button>
          )}
        </div>

        {b.status === BookingStatus.IN_PROGRESS && (
          <div className="w-full md:w-auto">
            {b.is_finalizing ? (
              <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 shadow-xl animate-in zoom-in-95 min-w-[260px] md:min-w-[320px] space-y-4 relative overflow-hidden">
                <div className="space-y-1 text-center relative z-10">
                  <p className="text-[8px] font-bold text-orange-500 uppercase tracking-widest italic">
                    Procedimento Final
                  </p>
                  <p className="text-[9px] font-semibold text-white/80 leading-relaxed px-2">
                    Solicite o PIN de 4 dígitos ao Cliente para encerrar.
                  </p>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-3 relative z-10">
                  <div className="relative w-full md:w-28">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="0000"
                      className="w-full h-11 bg-white/5 border border-white/10 rounded-xl text-center font-bold text-lg text-orange-500 outline-none focus:border-orange-500/50 transition-all tracking-widest placeholder:text-white/5"
                      value={pinValue}
                      onChange={(e) => onPinChange(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                  <button
                    onClick={() => onCompleteWithPin(b)}
                    disabled={isUpdating === b.id}
                    className="w-full md:flex-1 h-11 bg-white text-slate-950 rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-orange-500 hover:text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {isUpdating === b.id ? (
                      <ICONS.Clock className="animate-spin mx-auto" size={15} />
                    ) : (
                      "Validar PIN"
                    )}
                  </button>
                </div>

                <button
                  onClick={() => onCancelFinalizing(b.id)}
                  className="w-full text-xs font-black text-white/45 uppercase tracking-widest hover:text-white transition-colors relative z-10"
                >
                  Voltar
                </button>
              </div>
            ) : (
              <button
                onClick={() => onRequestPin(b.id)}
                disabled={isUpdating === b.id}
                className="h-11 px-5 bg-slate-950 text-white rounded-xl font-extrabold uppercase text-xs tracking-wider shadow-md border border-orange-500 flex items-center justify-center gap-1.5 hover:bg-orange-500 transition-all active:scale-95 disabled:opacity-50"
              >
                {isUpdating === b.id ? (
                  <ICONS.Clock size={14} className="animate-spin" />
                ) : (
                  <ICONS.CheckCircle size={14} className="text-orange-500" />
                )}
                {isUpdating === b.id
                  ? "A Processar..."
                  : isMealPrep
                    ? "Entregue"
                    : "Concluir"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

interface OperationsManagerProps {
  bookings: Booking[];
  allUsers: User[];
  onRefresh: () => void;
  onOpenChat: (partnerId: string) => void;
  onNotify?: (msg: string, type: "success" | "error" | "info") => void;
  isImporting?: boolean;
  onImportDemo?: () => void;
}

const OperationsManager: React.FC<OperationsManagerProps> = React.memo(({
  bookings,
  allUsers,
  onRefresh,
  onOpenChat,
  onNotify,
  isImporting,
  onImportDemo,
}) => {
  const [activeTab, setActiveTab] = useState<BookingStatus | "waitlist" | "upcoming">(
    "upcoming",
  );
  const [activeType, setActiveType] = useState<"all" | "experience" | "dish" | "daily">(
    "all",
  );
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [viewingDetail, setViewingDetail] = useState<Booking | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [selectedBookingForCancellation, setSelectedBookingForCancellation] =
    useState<Booking | null>(null);
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [respondingToQuote, setRespondingToQuote] = useState<Booking | null>(
    null,
  );
  const [quoteResponse, setQuoteResponse] = useState({
    price: 0,
    date: "",
    time: "",
  });

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

  const isBookingExpiringSoon = useCallback((b: Booking) => {
    try {
      if (!b.data) return false;
      const now = new Date();
      const bookingDateTime = new Date(`${b.data}T${b.hora || "23:59"}`);
      const diffMs = bookingDateTime.getTime() - now.getTime();
      const needsAction =
        b.status === BookingStatus.PENDING ||
        b.status === BookingStatus.QUOTE_REQUESTED ||
        b.status === BookingStatus.RESCHEDULE_REQUESTED;
      return needsAction && diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
    } catch (e) {
      return false;
    }
  }, []);

  useEffect(() => {
    if (activeTab === "waitlist") {
      const chefId = bookings[0]?.cookId; // Simplified way to get chefId
      if (chefId) {
        supabaseService.getWaitlist(chefId).then(setWaitlist);
      }
    }
  }, [activeTab, bookings]);

  const nextUpcomingBooking = useMemo(() => {
    return bookings
      .filter(
        (b) =>
          !isPastBooking(b) &&
          [
            BookingStatus.ACCEPTED,
            BookingStatus.IN_PROGRESS,
            BookingStatus.PENDING,
            BookingStatus.RESCHEDULE_REQUESTED,
          ].includes(b.status),
      )
      .sort((a, b) => {
        const dateTimeA = new Date(`${a.data}T${a.hora || "00:00"}`).getTime();
        const dateTimeB = new Date(`${b.data}T${b.hora || "00:00"}`).getTime();
        return dateTimeA - dateTimeB;
      })[0];
  }, [bookings, isPastBooking]);

  const filteredBookings = useMemo(() => {
    if (activeTab === "waitlist") return [];
    let base: Booking[] = [];
    if (activeTab === "upcoming") {
      base = bookings
        .filter(
          (b) =>
            !isPastBooking(b) &&
            [
              BookingStatus.ACCEPTED,
              BookingStatus.IN_PROGRESS,
              BookingStatus.PENDING,
              BookingStatus.RESCHEDULE_REQUESTED,
            ].includes(b.status),
        )
        .sort((a, b) => {
          const dateTimeA = new Date(`${a.data}T${a.hora || "00:00"}`).getTime();
          const dateTimeB = new Date(`${b.data}T${b.hora || "00:00"}`).getTime();
          return dateTimeA - dateTimeB;
        });
    } else {
      base = bookings.filter((b) => b.status === activeTab);
    }

    // Se estiver em Orçamentos, Próximas ou se o sub-filtro for "all" (Todos), mostramos todos os pedidos desse estado
    if (
      activeTab === BookingStatus.QUOTE_REQUESTED ||
      activeTab === "upcoming" ||
      activeType === "all"
    )
      return base;

    if (activeType === "daily") {
      return base.filter((b) => b.is_meal_prep || b.menu_type === "daily" || b.menu_selected?.toLowerCase().includes('daily') || b.menu_selected?.toLowerCase().includes('pack'));
    }
    return base.filter((b) => {
      const isDaily = b.is_meal_prep || b.menu_type === 'daily' || b.menu_selected?.toLowerCase().includes('daily') || b.menu_selected?.toLowerCase().includes('pack');
      if (isDaily) return false;

      const hasRitualKeyword = b.menu_selected?.toLowerCase().includes('menu') || b.menu_selected?.toLowerCase().includes('experiência') || b.menu_selected?.toLowerCase().includes('degustação') || b.menu_selected?.toLowerCase().includes('ritual');
      const isDish = b.menu_type === 'dish' || b.menu_selected?.toLowerCase().includes('prato') || (!hasRitualKeyword && b.menu_type !== 'experience');

      if (activeType === "dish") {
        return isDish;
      }
      if (activeType === "experience") {
        return !isDish;
      }
      return false;
    });
  }, [bookings, activeTab, activeType, isPastBooking]);

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

  const handleStatusChange = useCallback(async (id: string, status: BookingStatus) => {
    setIsUpdating(id);
    try {
      await supabaseService.updateBookingStatus(id, status);
      onRefresh();
    } catch (e) {
      alert("Erro ao atualizar estado.");
    } finally {
      setIsUpdating(null);
    }
  }, [onRefresh]);

  const handleRequestPin = useCallback(async (id: string) => {
    setIsUpdating(id);
    try {
      await supabaseService.requestPinValidation(id);
      onRefresh();
    } catch (e) {
      alert("Erro ao solicitar conclusão.");
    } finally {
      setIsUpdating(null);
    }
  }, [onRefresh]);

  const handleCancelFinalizing = useCallback(async (id: string) => {
    setIsUpdating(id);
    try {
      await supabaseService.cancelPinValidation(id);
      onRefresh();
    } catch (e) {
      alert("Erro ao cancelar procedimento.");
    } finally {
      setIsUpdating(null);
    }
  }, [onRefresh]);

  const handleCompleteWithPin = useCallback(async (b: Booking) => {
    const inputPin = pinInputs[b.id] || "";
    setIsUpdating(b.id);
    try {
      const success = await supabaseService.verifyPinAndComplete(
        b.id,
        inputPin,
      );
      if (success) {
        onRefresh();
      } else {
        alert("PIN inválido.");
      }
    } catch (e) {
      alert("Erro ao validar PIN.");
    } finally {
      setIsUpdating(null);
    }
  }, [pinInputs, onRefresh]);

  const handleSendQuote = useCallback(async () => {
    if (!respondingToQuote) return;
    setIsUpdating(respondingToQuote.id);
    try {
      await supabaseService.updateBookingStatus(
        respondingToQuote.id,
        BookingStatus.PENDING,
        {
          valortotal: quoteResponse.price,
          data: quoteResponse.date || respondingToQuote.data,
          hora: quoteResponse.time || respondingToQuote.hora,
        },
      );
      onNotify?.("Orçamento enviado com sucesso!", "success");
      setRespondingToQuote(null);
      onRefresh();
    } catch (e) {
      onNotify?.("Erro ao enviar orçamento.", "error");
    } finally {
      setIsUpdating(null);
    }
  }, [respondingToQuote, quoteResponse, onRefresh, onNotify]);

  const statusTabs = [
    { id: "upcoming", label: "Próximas Reservas" },
    { id: BookingStatus.ACCEPTED, label: "Aceites" },
    { id: BookingStatus.PENDING, label: "Por Confirmar" },
    { id: BookingStatus.QUOTE_REQUESTED, label: "Orçamentos" },
    { id: BookingStatus.RESCHEDULE_REQUESTED, label: "Reagendamentos" },
    { id: BookingStatus.IN_PROGRESS, label: "Em Cozinha" },
    { id: BookingStatus.COMPLETED, label: "Concluídos" },
    { id: "waitlist", label: "Lista de Espera" },
    { id: BookingStatus.CANCELLED, label: "Cancelados" },
  ];

  // Helper to count bookings dynamically for each status tab
  const getCountForTab = (tabId: string) => {
    if (tabId === "waitlist") {
      return waitlist.length;
    }
    if (tabId === "upcoming") {
      return bookings.filter(
        (b) =>
          !isPastBooking(b) &&
          [
            BookingStatus.ACCEPTED,
            BookingStatus.IN_PROGRESS,
            BookingStatus.PENDING,
            BookingStatus.RESCHEDULE_REQUESTED,
          ].includes(b.status),
      ).length;
    }
    return bookings.filter((b) => b.status === tabId).length;
  };

  // Modern Bento Summary Metrics
  const stats = useMemo(() => {
    const upc = bookings.filter(
      (b) =>
        !isPastBooking(b) &&
        [
          BookingStatus.ACCEPTED,
          BookingStatus.IN_PROGRESS,
          BookingStatus.PENDING,
          BookingStatus.RESCHEDULE_REQUESTED,
        ].includes(b.status),
    ).length;
    const qc = bookings.filter((b) => b.status === BookingStatus.QUOTE_REQUESTED).length;
    const pc = bookings.filter((b) => b.status === BookingStatus.PENDING).length;
    const ac = bookings.filter((b) =>
      [BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS, BookingStatus.RESCHEDULE_REQUESTED].includes(b.status),
    ).length;
    const wc = waitlist.length;
    return [
      {
        id: "upcoming",
        label: "Próximas Reservas",
        count: upc,
        icon: ICONS.Calendar,
        color: "text-orange-500 bg-orange-500/10",
        activeBg: "bg-orange-600 border-orange-600",
      },
      {
        id: BookingStatus.QUOTE_REQUESTED,
        label: "Novas Propostas",
        count: qc,
        icon: ICONS.FileText,
        color: "text-amber-500 bg-amber-500/10",
        activeBg: "bg-amber-600 border-amber-600",
      },
      {
        id: BookingStatus.PENDING,
        label: "Por Confirmar",
        count: pc,
        icon: ICONS.Clock,
        color: "text-indigo-500 bg-indigo-500/10",
        activeBg: "bg-indigo-600 border-indigo-600",
      },
      {
        id: BookingStatus.ACCEPTED,
        label: "Ativos & Cozinha",
        count: ac,
        icon: ICONS.Zap,
        color: "text-emerald-500 bg-emerald-500/10",
        activeBg: "bg-emerald-600 border-emerald-600",
      },
      {
        id: "waitlist",
        label: "Lista de Espera",
        count: wc,
        icon: ICONS.Users,
        color: "text-slate-500 bg-slate-500/10",
        activeBg: "bg-slate-600 border-slate-600",
      },
    ];
  }, [bookings, waitlist, isPastBooking]);

  return (
    <div className="space-y-4 md:space-y-5 animate-in fade-in duration-500 max-w-4xl mx-auto px-2 md:px-1">
      {/* Spotlight Banner: Next Upcoming Booking */}
      {nextUpcomingBooking && (
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-5 rounded-2xl shadow-md border border-orange-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-1 z-10 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full text-[8.5px] font-black uppercase tracking-widest flex items-center gap-1">
                <ICONS.Sparkles size={10} />
                Próximo Serviço Agendado
              </span>
              <span className="text-[10px] font-extrabold text-slate-300">
                {nextUpcomingBooking.data} às {nextUpcomingBooking.hora}
              </span>
            </div>
            <h3 className="text-sm md:text-base font-extrabold italic text-white">
              "{nextUpcomingBooking.menu_selected}" — <span className="not-italic text-slate-300 font-bold">{nextUpcomingBooking.clientName}</span>
            </h3>
            <p className="text-[9px] text-slate-400 font-medium truncate max-w-md">
              📍 {nextUpcomingBooking.morada || "Morada a confirmar"}
            </p>
          </div>
          <div className="flex items-center gap-2 z-10 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setViewingDetail(nextUpcomingBooking)}
              className="flex-1 sm:flex-none h-10 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-extrabold text-[9.5px] uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ICONS.Eye size={12} />
              Ver Detalhes
            </button>
            <button
              onClick={() => onOpenChat(nextUpcomingBooking.clientId, false)}
              className="h-10 w-10 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="Abrir Chat"
            >
              <ICONS.MessageSquare size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Bento Analytics Cockpit */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-3">
        {stats.map((stat) => {
          // Check if this stat matches the current selected category view
          const isActive =
            activeTab === stat.id ||
            (stat.id === BookingStatus.ACCEPTED &&
              [BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS, BookingStatus.RESCHEDULE_REQUESTED].includes(activeTab as any));

          return (
            <button
              key={stat.id}
              onClick={() => {
                setActiveTab(stat.id as any);
              }}
              className={`p-3.5 rounded-xl border transition-all duration-300 text-left flex flex-col justify-between h-[85px] md:h-[95px] group relative overflow-hidden focus:outline-none ${
                isActive
                  ? "bg-slate-950 border-slate-950 text-white shadow-md scale-[1.01]"
                  : "bg-white hover:bg-slate-50/80 border-slate-100 hover:border-slate-300 text-slate-800 shadow-sm"
              }`}
            >
              {/* Subtle Ambient Wave Effect on Hover */}
              <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-[30px] opacity-10 transition-transform duration-700 pointer-events-none group-hover:scale-150 ${isActive ? "bg-white" : "bg-orange-500"}`} />

              <div className="flex justify-between items-start w-full z-10">
                <span
                  className={`text-[8.5px] font-bold uppercase tracking-wider leading-none ${
                    isActive ? "text-slate-300" : "text-slate-400"
                  }`}
                >
                  {stat.label}
                </span>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${
                  isActive ? "bg-white/10 text-white" : stat.color
                }`}>
                  <stat.icon size={11} className="stroke-[2]" />
                </div>
              </div>

              <div className="text-base sm:text-lg font-extrabold mt-1 flex items-baseline gap-1.5 font-sans z-10">
                {stat.count}
                <span className="text-[8.5px] font-semibold uppercase tracking-wider text-slate-400">
                  {stat.count === 1 ? "pedido" : "pedidos"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-start">
        {/* Left Column: Filters and bookings list */}
        <div className="lg:col-span-8 space-y-4 md:space-y-5">
          {/* Main Filter Control Panel */}
          <div className="flex flex-col gap-3 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-200/80 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col md:flex-row gap-3 justify-between items-center w-full">
              {/* Status Tabs Navigation */}
              <div className="flex items-center gap-2 w-full md:w-auto overflow-hidden">
                <div className="flex bg-slate-200/50 hover:bg-slate-200/80 p-0.5 rounded-lg border border-slate-200 shadow-inner overflow-x-auto scrollbar-hide flex-1 md:flex-none transition-colors">
                  {statusTabs.map((tab) => {
                    const count = getCountForTab(tab.id);
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all shrink-0 select-none ${
                          isActive
                            ? "bg-white text-slate-950 shadow-sm font-extrabold scale-[1.01]"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        {tab.label}
                        {count > 0 && (
                          <span
                            className={`inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full text-[8.5px] font-extrabold leading-none transition-colors ${
                              isActive
                                ? "bg-orange-500 text-white"
                                : "bg-orange-100 text-orange-600"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={onRefresh}
                  className="w-8 h-8 bg-white border border-slate-200 hover:border-orange-500 rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-500 transition-all shadow-sm shrink-0 hover:shadow"
                  title="Recarregar dados"
                >
                  <ICONS.RefreshCw
                    size={12}
                    className={isUpdating ? "animate-spin text-orange-500" : ""}
                  />
                </button>
              </div>

              {/* Sub Type Category Selectors */}
              <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-200 w-full md:w-auto shrink-0 justify-center overflow-x-auto scrollbar-hide">
                {(["all", "experience", "dish", "daily"] as const).map((type) => {
                  const isActive = activeType === type;
                  const labels: Record<string, string> = {
                    all: "Todos",
                    experience: "Rituais",
                    dish: "Pratos",
                    daily: "Daily",
                  };
                  const icons: Record<string, React.ReactNode> = {
                    all: <ICONS.List size={11} className="shrink-0" />,
                    experience: <ICONS.Sparkles size={11} className="shrink-0" />,
                    dish: <ICONS.Utensils size={11} className="shrink-0" />,
                    daily: <ICONS.Calendar size={11} className="shrink-0" />,
                  };
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveType(type)}
                      className={`flex-1 md:flex-none px-3 md:px-4 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all duration-250 flex items-center justify-center gap-1.5 cursor-pointer ${
                        isActive
                          ? "bg-orange-500 text-white shadow-sm font-extrabold"
                          : "text-slate-500 hover:text-slate-950"
                      }`}
                    >
                      {icons[type]}
                      {labels[type]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {activeTab === "waitlist" ? (
              waitlist.length > 0 ? (
                waitlist.map((w) => (
                  <div
                    key={w.id}
                    className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group"
                  >
                    <div className="text-left space-y-0.5">
                      <p className="text-[10px] font-extrabold text-slate-950 uppercase italic">
                        {w.users?.nome}
                      </p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                        Interesse para: {w.preferred_date}
                      </p>
                    </div>
                    <button
                      onClick={() => onOpenChat(w.client_id)}
                      className="w-8 h-8 bg-slate-950 text-white hover:bg-orange-500 rounded-lg flex items-center justify-center transition-all animate-none"
                    >
                      <ICONS.MessageSquare size={13} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 opacity-40">
                  <p className="text-[9px] font-bold uppercase tracking-wider italic">
                    Ninguém na lista de espera.
                  </p>
                </div>
              )
            ) : filteredBookings.length > 0 ? (
              filteredBookings.map((b) => {
                const client = allUsers.find((u) => u.id === b.clientId);
                const isMealPrep = b.is_meal_prep === true;
                const expiringSoon = isBookingExpiringSoon(b);

                return (
                  <CookBookingCard
                    key={b.id}
                    b={b}
                    client={client}
                    isMealPrep={isMealPrep}
                    expiringSoon={expiringSoon}
                    pinValue={pinInputs[b.id] || ""}
                    onPinChange={(val) =>
                      setPinInputs((prev) => ({
                        ...prev,
                        [b.id]: val,
                      }))
                    }
                    isUpdating={isUpdating}
                    isPastBooking={isPastBooking}
                    onSelectDetail={setViewingDetail}
                    onOpenChat={onOpenChat}
                    onCancel={(booking) => {
                      setSelectedBookingForCancellation(booking);
                      setIsCancellationModalOpen(true);
                    }}
                    onStatusChange={handleStatusChange}
                    onCompleteWithPin={handleCompleteWithPin}
                    onCancelFinalizing={handleCancelFinalizing}
                    onRequestPin={handleRequestPin}
                    onRespondToQuote={(booking) => {
                      setRespondingToQuote(booking);
                      setQuoteResponse({
                        price: 0,
                        date: booking.data,
                        time: booking.hora || "",
                      });
                    }}
                  />
                );
              })
            ) : (
              <div id="no-bookings-empty-state" className="py-16 md:py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center p-6 md:p-10 shadow-sm animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
                {/* Soft Ambient Light inside placeholder */}
                <div id="no-bookings-light" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-orange-500/5 rounded-full blur-[60px] pointer-events-none" />
                
                {/* Custom "No Bookings" Chef Graphic */}
                <div id="no-bookings-graphic" className="relative w-24 h-24 mb-6 flex items-center justify-center">
                  {/* Outer glowing orbital rings */}
                  <div className="absolute inset-0 rounded-full border border-orange-500/10 animate-spin" style={{ animationDuration: '60s' }} />
                  <div className="absolute inset-2 rounded-full border border-dashed border-slate-200" />
                  
                  {/* Plate and Cloche Clipart/Graphic */}
                  <div className="absolute w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 shadow-inner flex items-center justify-center text-slate-400">
                    <svg
                      width="38"
                      height="38"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-500"
                    >
                      {/* Stylized Empty Plate and Cloche representing "No Bookings" */}
                      <path d="M2 17h20c0-4.418-3.582-8-8-8h-4c-4.418 0-8 3.582-8 8z" className="stroke-orange-500" />
                      <path d="M12 9V6m0 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
                      <path d="M3 20h18" strokeWidth="2" />
                    </svg>
                  </div>
                  
                  {/* Subtle Checked Badge */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg border-2 border-white animate-bounce">
                    ✓
                  </div>
                </div>

                <div id="no-bookings-info-box" className="space-y-2.5 max-w-sm z-10 flex flex-col items-center">
                  <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-[8.5px] font-black uppercase tracking-widest rounded-full">
                    No Bookings • Sem Reservas
                  </span>
                  <h4 id="no-bookings-heading" className="text-sm md:text-base font-extrabold uppercase italic tracking-tight text-slate-900 leading-none">
                    Cozinha em dia!
                  </h4>
                  <p id="no-bookings-detail-desc" className="text-[10px] md:text-xs font-semibold text-slate-400 leading-relaxed italic">
                    {activeTab === BookingStatus.QUOTE_REQUESTED ? (
                      "Não tem pedidos de orçamento pendentes. Os rituais concluídos ou aceites estarão nas secções correspondentes."
                    ) : activeTab === BookingStatus.PENDING ? (
                      "Tudo limpo por aqui! Nenhuma reserva pendente de confirmação de momento."
                    ) : [BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS].includes(activeTab as any) ? (
                      "Nenhum ritual ativo de momento. Configure a sua agenda para receber novas reservas!"
                    ) : activeTab === "waitlist" ? (
                      "Nenhum cliente na lista de espera atualmente."
                    ) : (
                      `Sem operações registadas no estado de ${activeTab.replace("_", " ")}.`
                    )}
                  </p>
                  {onImportDemo && (
                    <button
                      onClick={onImportDemo}
                      disabled={isImporting}
                      className="mt-3 inline-flex items-center gap-2 h-11 px-5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl font-extrabold text-[9px] uppercase tracking-wider transition-all shadow-md shadow-orange-500/10 active:scale-95 cursor-pointer"
                    >
                      <ICONS.RefreshCw size={11} className={isImporting ? "animate-spin" : ""} />
                      {isImporting ? "Sincronizando..." : "Sincronizar dados demo"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Mini Calendar Widget */}
        <div className="lg:col-span-4 space-y-4">
          <BookingCalendarWidget
            bookings={bookings}
            onSelectBooking={(b) => setViewingDetail(b)}
          />
        </div>
      </div>

      {/* Quote Response Modal */}
      {respondingToQuote && (
        <div className="fixed inset-0 z-[1100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-8 md:p-12 max-w-md w-full shadow-3xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-950 italic uppercase tracking-tighter">
                  Enviar <span className="text-orange-500">Orçamento.</span>
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Defina o valor e confirme a data para o pedido de{" "}
                  {respondingToQuote.clientName}.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4">
                    Valor Total (€)
                  </label>
                  <input
                    type="number"
                    className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-slate-950 font-black text-xl outline-none focus:border-orange-500 transition-all"
                    value={quoteResponse.price}
                    onChange={(e) =>
                      setQuoteResponse({
                        ...quoteResponse,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4">
                      Data Solicitada
                    </label>
                    <input
                      type="date"
                      readOnly
                      disabled
                      className="w-full h-14 bg-slate-100 border border-slate-100 rounded-2xl px-4 text-slate-400 font-bold text-xs outline-none cursor-not-allowed"
                      value={quoteResponse.date}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4">
                      Hora Solicitada
                    </label>
                    <input
                      type="time"
                      readOnly
                      disabled
                      className="w-full h-14 bg-slate-100 border border-slate-100 rounded-2xl px-4 text-slate-400 font-bold text-xs outline-none cursor-not-allowed"
                      value={quoteResponse.time}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSendQuote}
                  disabled={
                    isUpdating === respondingToQuote.id ||
                    quoteResponse.price <= 0
                  }
                  className="w-full h-16 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdating === respondingToQuote.id ? (
                    <ICONS.RefreshCw className="animate-spin" size={18} />
                  ) : (
                    <>
                      <ICONS.Send size={18} />
                      Enviar Proposta
                    </>
                  )}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      handleStatusChange(
                        respondingToQuote.id,
                        BookingStatus.REJECTED,
                      );
                      setRespondingToQuote(null);
                    }}
                    className="h-14 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all"
                  >
                    Recusar Pedido
                  </button>
                  <button
                    onClick={() => setRespondingToQuote(null)}
                    className="h-14 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingDetail && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] md:rounded-[4rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide shadow-3xl relative">
            {/* Header Background Accent */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-slate-50 border-b border-slate-100" />

            <div className="p-8 md:p-12 space-y-8 relative z-10">
              {/* Top Bar */}
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest italic ${
                        viewingDetail.status === BookingStatus.ACCEPTED
                          ? "bg-emerald-500 text-white"
                          : viewingDetail.status === BookingStatus.PENDING
                            ? "bg-orange-500 text-white"
                            : "bg-slate-950 text-white"
                      }`}
                    >
                      {viewingDetail.status}
                    </span>
                    {viewingDetail.is_meal_prep && (
                      <span className="px-3 py-1 bg-blue-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest italic">
                        Meal Prep
                      </span>
                    )}
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-slate-950 leading-none">
                    Detalhes do <span className="text-orange-500">Ritual.</span>
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
                {/* Left Column: Client & Logistics */}
                <div className="space-y-6">
                  {/* Client Info */}
                  <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-150 rounded-2xl">
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/80 overflow-hidden shrink-0 shadow-xs">
                      {allUsers.find((u) => u.id === viewingDetail.clientId)
                        ?.avatar_url ? (
                        <img
                          src={
                            allUsers.find(
                              (u) => u.id === viewingDetail.clientId,
                            )?.avatar_url
                          }
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                          <ICONS.Users size={18} className="text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 italic">
                        Cliente
                      </p>
                      <p className="text-sm font-black text-slate-950 uppercase italic">
                        {viewingDetail.clientName}
                      </p>
                      <button
                        onClick={() => onOpenChat(viewingDetail.clientId)}
                        className="text-[8px] font-black text-orange-500 uppercase tracking-widest hover:underline mt-1"
                      >
                        Enviar Mensagem
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
                          Data e Hora
                        </p>
                        <p className="text-xs font-bold text-slate-950 leading-none">
                          {viewingDetail.data} às{" "}
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
                          Morada de Entrega/Serviço
                        </p>
                        <p className="text-xs font-bold text-slate-700 leading-normal">
                          {viewingDetail.morada}
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewingDetail.morada)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[8px] font-black text-orange-500 uppercase tracking-widest hover:underline mt-1.5 inline-block"
                        >
                          Ver no Google Maps
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/5 border border-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                        <ICONS.Users size={13} />
                      </div>
                      <div className="text-left">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 italic">
                          Número de Pessoas
                        </p>
                        <p className="text-xs font-bold text-slate-950 leading-none">
                          {viewingDetail.numPessoas || 1} Pessoas (PAX)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Menu & Financials */}
                <div className="space-y-8">
                  {/* Menu Selected */}
                  <div className="p-6 bg-slate-950 rounded-[2.5rem] text-white space-y-4 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <div className="relative z-10">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-2 italic">
                        O que vais cozinhar
                      </p>
                      <h4 className="text-xl font-black uppercase italic tracking-tight leading-tight">
                        {viewingDetail.menu_selected}
                      </h4>
                      {viewingDetail.wine_pairing && (
                        <div className="mt-2.5 p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2">
                          <ICONS.Wine size={14} className="text-orange-500 shrink-0" />
                          <div className="text-left">
                            <p className="text-[7px] font-black text-orange-500 uppercase tracking-widest leading-none mb-0.5">
                              Harmonização de Vinhos Selecionada
                            </p>
                            <p className="text-[10px] font-extrabold text-white leading-tight">
                              {viewingDetail.wine_pairing.nome}
                            </p>
                            <p className="text-[8px] text-white/50 leading-none mt-0.5">
                              {viewingDetail.wine_pairing.produtor} • +{viewingDetail.wine_pairing.preco_por_pessoa}€/pax
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-white/30 uppercase tracking-widest italic">
                            Valor Bruto
                          </p>
                          <p className="text-lg font-black text-white italic">
                            {formatPrice(viewingDetail.valorTotal)}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest italic">
                            O Teu Ganho (80%)
                          </p>
                          <p className="text-2xl font-black text-orange-500 italic">
                            {formatPrice(
                              Number(viewingDetail.valorTotal) * 0.8,
                            )}
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
                        Pratos do Ritual
                      </p>
                    </div>
                    {isLoadingMenu ? (
                      <div className="flex items-center justify-center py-8">
                        <ICONS.Clock
                          className="animate-spin text-orange-500"
                          size={24}
                        />
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
                            "Informação detalhada dos pratos não disponível."}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Kitchen Notes / Desires */}
                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-2">
                      <ICONS.Utensils size={14} className="text-orange-500" />
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">
                        Notas e Desejos do Cliente
                      </p>
                    </div>
                    <div className="p-5 bg-orange-50/50 border border-orange-100 rounded-3xl">
                      <p className="text-xs font-medium text-slate-600 italic leading-relaxed">
                        {viewingDetail.kitchenNotes ||
                          "O cliente não deixou notas adicionais para este ritual."}
                      </p>
                    </div>
                  </div>

                  {/* Service PIN Info Card (Secure & logical: Chef should not see the raw PIN beforehand) */}
                  {(viewingDetail.status === BookingStatus.ACCEPTED ||
                    viewingDetail.status === BookingStatus.IN_PROGRESS) && (
                      <div className="p-5 bg-orange-50/40 border border-orange-100 rounded-3xl flex items-start gap-3 text-left">
                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                          <ICONS.ShieldCheck size={16} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-orange-600 uppercase tracking-widest italic leading-none">
                            Segurança e Confirmação
                          </p>
                          <h4 className="text-[10px] font-black text-slate-900 uppercase">
                            Validação via PIN do Cliente
                          </h4>
                          <p className="text-[9.5px] font-medium text-slate-500 leading-normal">
                            Para garantir a segurança do serviço, o cliente possui um PIN exclusivo de 4 dígitos na sua agenda. Solicite este código ao cliente no final da experiência para validar e concluir o ritual na secção de Rituais Ativos.
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-3">
                <button
                  onClick={() => setViewingDetail(null)}
                  className="flex-1 min-h-[58px] py-4 px-6 bg-slate-950 hover:bg-orange-500 text-white rounded-full font-black text-xs md:text-sm uppercase tracking-widest transition-all active:scale-97 shadow-lg flex items-center justify-center shrink-0 border border-white/15 cursor-pointer"
                >
                  Fechar Detalhes
                </button>
                {viewingDetail.status === BookingStatus.PENDING && (
                  <button
                    onClick={() => {
                      handleStatusChange(
                        viewingDetail.id,
                        BookingStatus.ACCEPTED,
                      );
                      setViewingDetail(null);
                    }}
                    className="flex-1 min-h-[58px] py-4 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-black text-xs md:text-sm uppercase tracking-widest transition-all active:scale-97 shadow-lg flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    Aceitar Ritual Agora
                  </button>
                )}
                {[
                  BookingStatus.PENDING,
                  BookingStatus.ACCEPTED,
                  BookingStatus.IN_PROGRESS,
                  BookingStatus.RESCHEDULE_REQUESTED,
                  BookingStatus.QUOTE_REQUESTED,
                ].includes(viewingDetail.status) &&
                  !isPastBooking(viewingDetail) && (
                    <button
                      onClick={() => {
                        const bToCancel = viewingDetail;
                        setViewingDetail(null);
                        setSelectedBookingForCancellation(bToCancel);
                        setIsCancellationModalOpen(true);
                      }}
                      className="flex-1 min-h-[58px] py-4 px-6 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80 rounded-full font-black text-xs md:text-sm uppercase tracking-widest transition-all active:scale-97 shadow-sm flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      Cancelar Reserva
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedBookingForCancellation && (
        <CancellationModal
          isOpen={isCancellationModalOpen}
          onClose={() => {
            setIsCancellationModalOpen(false);
            setSelectedBookingForCancellation(null);
          }}
          booking={selectedBookingForCancellation}
          userId={selectedBookingForCancellation.cookId}
          onSuccess={(msg) => {
            if (onNotify) {
              onNotify(msg, "success");
            } else {
              alert(msg);
            }
            onRefresh();
          }}
        />
      )}
    </div>
  );
});

const AvailabilityManager: React.FC<{
  chef: User;
  bookings?: Booking[];
  onRefresh: () => void;
  onNotify?: (msg: string, type: "success" | "error" | "info") => void;
}> = React.memo(({
  chef,
  onRefresh,
  onNotify,
}) => {
  const { t } = useLanguage();
  const today = useMemo(() => todayLocal(), []);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const savedDate = sessionStorage.getItem("cookr_agenda_selected_date");
      if (savedDate) return savedDate;
    }
    return today;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(true);
  const [hasPendingChanges, setHasPendingChanges] = useState<boolean>(false);

  const parseDispo = (dispoVal: any): Record<string, string[]> => {
    if (!dispoVal) return {};
    if (typeof dispoVal === "string") {
      try {
        return JSON.parse(dispoVal);
      } catch (e) {
        return {};
      }
    }
    return dispoVal;
  };

  const [allDispo, setAllDispo] = useState<Record<string, string[]>>(() => parseDispo(chef?.disponibilidade));
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  // Remember selectedDate in sessionStorage for refresh continuity
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("cookr_agenda_selected_date", newDate);
    }
  };

  // 1. CARREGAMENTO INICIAL DE DADOS DA BASE DE DADOS (useEffect ao mudar selectedDate ou chef)
  useEffect(() => {
    if (!chef?.id) return;
    let isMounted = true;
    setIsLoadingSlots(true);

    supabaseService
      .getChefAvailability(chef.id, selectedDate)
      .then((res) => {
        if (!isMounted) return;
        const freshDispo = res.disponibilidade || {};
        setAllDispo(freshDispo);
        setSelectedSlots(res.slots || freshDispo[selectedDate] || []);
        setHasPendingChanges(false);
      })
      .catch((err) => {
        console.warn("Aviso ao carregar disponibilidade do chef:", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSlots(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate, chef?.id]);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 8; h <= 23; h++) {
      slots.push(`${h.toString().padStart(2, "0")}:00`);
      slots.push(`${h.toString().padStart(2, "0")}:30`);
    }
    return slots;
  }, []);

  const isAllSelected = useMemo(() => {
    return timeSlots.length > 0 && timeSlots.every((s) => selectedSlots.includes(s));
  }, [timeSlots, selectedSlots]);

  // 2. PERSISTÊNCIA DE DADOS NA BASE DE DADOS (Auto-save e Botão Manual)
  const persistSlots = async (newSlots: string[], showFeedbackToast = false) => {
    if (!chef?.id) return;
    setIsSaving(true);

    const updatedDispo = { ...allDispo, [selectedDate]: newSlots };
    setAllDispo(updatedDispo);

    try {
      const success = await supabaseService.saveChefAvailability(
        chef.id,
        selectedDate,
        newSlots,
        updatedDispo
      );

      if (success) {
        setHasPendingChanges(false);
        if (showFeedbackToast) {
          onNotify?.(t("agenda.toast_saved", { date: selectedDate }), "success");
        }
        onRefresh?.();
      } else {
        onNotify?.("Aviso: Falha ao sincronizar totalmente na base de dados.", "error");
      }
    } catch (e) {
      console.warn("Aviso ao persistir disponibilidade:", e);
      onNotify?.("Erro ao sincronizar disponibilidade na base de dados.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSlot = (slot: string) => {
    if (!chef) return;
    const next = selectedSlots.includes(slot)
      ? selectedSlots.filter((s) => s !== slot)
      : [...selectedSlots, slot];
    setSelectedSlots(next);
    setHasPendingChanges(true);
    // Gravação automática na base de dados
    persistSlots(next, false);
  };

  const handleToggleAllDay = () => {
    if (!chef) return;
    const next = isAllSelected ? [] : [...timeSlots];
    setSelectedSlots(next);
    setHasPendingChanges(false);
    // Gravação automática e notificação
    persistSlots(next, true);
  };

  const handleManualSave = () => {
    persistSlots(selectedSlots, true);
  };

  if (!chef) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto px-1">
      {/* Banner Explicativo: Separação entre Agenda Programada e Disponibilidade Online */}
      <div className="bg-slate-950 text-white p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${chef.isAvailable ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              {t("agenda.online_vs_agenda_title")}
            </h4>
          </div>
          <p className="text-[11px] text-slate-300 font-medium leading-relaxed max-w-xl">
            {t("agenda.online_vs_agenda_desc")}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="px-3 py-1.5 bg-white/10 rounded-xl text-[9px] font-bold text-slate-200 border border-white/10 backdrop-blur-sm">
            {chef.isAvailable ? "🟢 " + t("dashboard.online_available") : "⚪ " + t("dashboard.offline_agenda_only")}
          </span>
        </div>
      </div>

      {/* Editor Detalhado de Slots */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5 text-left">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-0.5">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
              {t("agenda.title")}
              {isSaving && (
                <span className="text-[9px] font-bold text-orange-500 flex items-center gap-1 animate-pulse">
                  <ICONS.RefreshCw size={10} className="animate-spin" /> {t("agenda.saving_to_db")}
                </span>
              )}
            </h3>
            <p className="text-xs font-black text-slate-800">
              {t("agenda.manage_slots_for")} <span className="text-orange-500">{selectedDate}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Botão de Guardar Disponibilidade */}
            <button
              type="button"
              onClick={handleManualSave}
              disabled={isSaving || isLoadingSlots}
              className={`h-11 px-4 rounded-xl font-bold text-[9px] uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-97 disabled:opacity-50 ${
                hasPendingChanges
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300 animate-pulse"
                  : "bg-slate-900 hover:bg-black text-white border-slate-900"
              }`}
            >
              {isSaving ? (
                <ICONS.RefreshCw size={12} className="animate-spin text-orange-400" />
              ) : (
                <Save size={12} className={hasPendingChanges ? "text-white" : "text-orange-400"} />
              )}
              {isSaving ? t("agenda.saving") : t("agenda.save_availability")}
            </button>

            {/* Botão Preencher / Limpar Dia */}
            <button
              type="button"
              onClick={handleToggleAllDay}
              disabled={isSaving || isLoadingSlots}
              className={`h-11 px-4 rounded-xl font-bold text-[9px] uppercase tracking-wider transition-all border cursor-pointer ${
                isAllSelected
                  ? "bg-orange-500 text-white border-orange-500 shadow-sm hover:bg-orange-600"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-950 hover:bg-slate-100"
              }`}
            >
              {isAllSelected ? t("agenda.clear_day") : t("agenda.fill_all_day")}
            </button>
          </div>
        </div>

        {/* Seletor de Data e Info de Horários */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative group flex-1">
            <input
              type="date"
              className="w-full h-11 px-4 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-slate-200 focus:border-orange-500 transition-all appearance-none cursor-pointer text-slate-800"
              value={selectedDate ?? ""}
              min={today}
              onChange={(e) => handleDateChange(e.target.value)}
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-orange-500 transition-colors">
              <ICONS.Calendar size={14} />
            </div>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-500 text-[10px] font-bold flex items-center justify-between sm:justify-start gap-2 shrink-0">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${selectedSlots.length > 0 ? "bg-emerald-500" : "bg-slate-300"}`} />
              {t("common.status")}:
            </span>
            <span className="text-slate-900 font-extrabold">
              {selectedSlots.length === 1
                ? t("agenda.active_slots_count", { count: 1 })
                : t("agenda.active_slots_count_plural", { count: selectedSlots.length })}
            </span>
          </div>
        </div>

        {/* Grelha de Slots: Skeleton enquanto carrega, ou Botões de Horários */}
        {isLoadingSlots ? (
          <div className="space-y-2 pt-2">
            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 animate-pulse">
              <ICONS.RefreshCw size={11} className="animate-spin text-orange-500" />
              {t("agenda.loading_slots", { date: selectedDate })}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 rounded-xl bg-slate-100/80 animate-pulse border border-slate-100 flex items-center justify-center"
                >
                  <span className="w-8 h-2.5 rounded bg-slate-200/60" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-2">
            {timeSlots.map((slot) => {
              const isSelected = selectedSlots.includes(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => handleToggleSlot(slot)}
                  className={`py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all border cursor-pointer ${
                    isSelected
                      ? "bg-orange-500 text-white border-orange-500 font-semibold shadow-sm scale-[1.01]"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100 hover:text-slate-900"
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

interface CookDashboardProps {
  chefUser: User;
  bookings: Booking[];
  allUsers: User[];
  onRefreshData: () => void;
  onOpenChat: (partnerId: string) => void;
  onNotify?: (msg: string, type: "success" | "error" | "info") => void;
  initialView?: "ops" | "agenda" | "kitchen";
}

const CookDashboard: React.FC<CookDashboardProps> = ({
  chefUser,
  bookings,
  allUsers,
  onRefreshData,
  onOpenChat,
  onNotify,
  initialView = "ops",
}) => {
  const { t } = useLanguage();
  const [view, setView] = useState<"ops" | "agenda" | "kitchen">(initialView);
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [localIsAvailable, setLocalIsAvailable] = useState<boolean>(chefUser.isAvailable);

  useEffect(() => {
    setLocalIsAvailable(chefUser.isAvailable);
  }, [chefUser.isAvailable]);

  const handleImportDemoData = useCallback(async () => {
    setIsImporting(true);
    try {
      const success = await supabaseService.importDemoDataForNewChef(chefUser.id, chefUser.nome);
      if (success) {
        onRefreshData();
        onNotify?.("Dados de demonstração (menus, avaliações e reservas) sincronizados com sucesso!", "success");
      } else {
        onNotify?.("Não foram encontrados novos dados de demonstração para sincronizar (ou já foram importados).", "info");
      }
    } catch (err) {
      console.error(err);
      onNotify?.("Ocorreu um erro ao sincronizar os dados de demonstração.", "error");
    } finally {
      setIsImporting(false);
    }
  }, [chefUser.id, chefUser.nome, onRefreshData, onNotify]);

  useEffect(() => {
    if (initialView) setView(initialView);
  }, [initialView]);
  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-4xl mx-auto px-2 md:px-1 pt-6 md:pt-10">
      <header className="px-1 md:px-2 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="text-left space-y-2 w-full md:w-auto flex flex-col sm:flex-row sm:items-end sm:justify-between md:flex-col md:items-start md:justify-start gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-5xl font-black text-slate-950 tracking-tighter italic uppercase leading-none">
              {t("dashboard.chef_portal")}
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              {t("dashboard.subtitle")}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div 
              className="flex items-center gap-3 bg-slate-100/80 border border-slate-200/50 p-2 px-3 rounded-2xl shadow-inner shrink-0"
              title={localIsAvailable ? t("dashboard.online_explainer") : t("dashboard.offline_explainer")}
            >
              <div className="flex flex-col text-left pr-2 border-r border-slate-200/80">
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400">
                  {t("dashboard.immediate_status")}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${localIsAvailable ? "text-emerald-600" : "text-slate-500"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${localIsAvailable ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                  {localIsAvailable ? t("dashboard.online_available") : t("dashboard.offline_agenda_only")}
                </span>
              </div>
              
              <button
                type="button"
                onClick={async () => {
                  if (isUpdatingAvailability) return;
                  const nextState = !localIsAvailable;
                  
                  // Optimistic UI state update (instantly changes toggle state)
                  setLocalIsAvailable(nextState);
                  setIsUpdatingAvailability(true);
                  
                  try {
                    await supabaseService.updateAvailability(
                      chefUser.id,
                      nextState,
                    );
                    onRefreshData();
                    onNotify?.(
                      nextState 
                        ? (t("dashboard.accepting_bookings") || "Ficou Disponível!") 
                        : (t("dashboard.paused_bookings") || "Ficou Indisponível."),
                      "success"
                    );
                  } catch (e) {
                    // Revert state if failed
                    setLocalIsAvailable(chefUser.isAvailable);
                    onNotify?.("Erro ao atualizar estado de disponibilidade.", "error");
                  } finally {
                    setIsUpdatingAvailability(false);
                  }
                }}
                disabled={isUpdatingAvailability}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                  localIsAvailable ? "bg-emerald-500" : "bg-slate-300"
                } ${isUpdatingAvailability ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <span className="sr-only">Toggle de disponibilidade</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    localIsAvailable ? "translate-x-5" : "translate-x-0"
                  } flex items-center justify-center`}
                >
                  {isUpdatingAvailability ? (
                    <ICONS.RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />
                  ) : (
                    <div className={`w-1.5 h-1.5 rounded-full ${localIsAvailable ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-slate-400"}`} />
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setView("ops")}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all shrink-0 ${view === "ops" ? "bg-slate-950 text-white shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-900"}`}
          >
            {t("dashboard.tab_ops")}
          </button>
          <button
            onClick={() => setView("kitchen")}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all shrink-0 ${view === "kitchen" ? "bg-slate-950 text-white shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-900"}`}
          >
            {t("dashboard.tab_kitchen")}
          </button>
          <button
            onClick={() => setView("agenda")}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all shrink-0 ${view === "agenda" ? "bg-slate-950 text-white shadow-sm font-extrabold" : "text-slate-400"}`}
          >
            {t("dashboard.tab_agenda")}
          </button>
        </div>
      </header>
      {view === "ops" && (
        <OperationsManager
          bookings={bookings}
          allUsers={allUsers}
          onRefresh={onRefreshData}
          onOpenChat={onOpenChat}
          onNotify={onNotify}
          isImporting={isImporting}
          onImportDemo={handleImportDemoData}
        />
      )}
       {view === "kitchen" && (
        <KitchenManager
          chef={chefUser}
          onRefresh={onRefreshData}
          onNavigate={setView}
          bookings={bookings}
        />
      )}
      {view === "agenda" && (
        <AvailabilityManager chef={chefUser} bookings={bookings} onRefresh={onRefreshData} onNotify={onNotify} />
      )}
    </div>
  );
};

export default React.memo(CookDashboard);
