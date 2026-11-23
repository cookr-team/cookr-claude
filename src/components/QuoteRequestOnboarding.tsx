import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ICONS } from "../constants";
import { User, BookingStatus, Booking, MenuItem } from "../types";
import { supabaseService } from "../services/supabaseService";
import { GoogleAddressAutocomplete } from "./GoogleAddressAutocomplete";
import { formatPostalCode } from "../utils/formatters";
import { todayLocal } from "../lib/dateUtils";

interface QuoteRequestOnboardingProps {
  chef: User;
  currentUser: User | null;
  chefMenus?: MenuItem[];
  onClose: () => void;
  onSuccess: () => void;
  onNotify?: (message: string, type?: "error" | "success" | "info") => void;
}

type Step =
  | "intro"
  | "type"
  | "details"
  | "logistics"
  | "requirements"
  | "summary";

export const QuoteRequestOnboarding: React.FC<QuoteRequestOnboardingProps> = ({
  chef,
  currentUser,
  chefMenus = [],
  onClose,
  onSuccess,
  onNotify,
}) => {
  const [step, setStep] = useState<Step>("intro");
  const [requestType, setRequestType] = useState<"dish" | "experience" | null>(
    null,
  );
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [requestName, setRequestName] = useState("");
  const [numPeople, setNumPeople] = useState(2);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [location, setLocation] = useState(
    currentUser?.addresses?.find((a) => a.isDefault)?.address ||
      currentUser?.addresses?.[0]?.address ||
      "",
  );
  const [city, setCity] = useState(
    currentUser?.addresses?.find((a) => a.isDefault)?.city ||
      currentUser?.addresses?.[0]?.city ||
      "",
  );
  const [doorNumber, setDoorNumber] = useState(
    currentUser?.addresses?.find((a) => a.isDefault)?.door_number ||
      currentUser?.addresses?.[0]?.door_number ||
      "",
  );
  const [floor, setFloor] = useState(
    currentUser?.addresses?.find((a) => a.isDefault)?.floor ||
      currentUser?.addresses?.[0]?.floor ||
      "",
  );
  const [zipCode, setZipCode] = useState(
    currentUser?.addresses?.find((a) => a.isDefault)?.zip_code ||
      currentUser?.addresses?.[0]?.zip_code ||
      "",
  );
  const [isManualAddress, setIsManualAddress] = useState(
    !currentUser?.addresses?.length,
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDateTimeValid = () => {
    if (!preferredDate || !preferredTime) return false;

    const now = new Date();
    const selectedDate = new Date(preferredDate);

    // Reset hours for date comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) return false;

    if (selectedDate.getTime() === today.getTime()) {
      const [hours, minutes] = preferredTime.split(":").map(Number);
      const selectedDateTime = new Date();
      selectedDateTime.setHours(hours, minutes, 0, 0);

      const minTime = new Date(now.getTime() + 30 * 60000); // Now + 30 minutes
      return selectedDateTime >= minTime;
    }

    return true;
  };

  const isZipCodeValid = (zip: string) => {
    return /^\d{4}-\d{3}$/.test(zip);
  };

  const handleNext = () => {
    if (step === "intro") setStep("type");
    else if (step === "type") setStep("details");
    else if (step === "details") setStep("logistics");
    else if (step === "logistics") setStep("requirements");
    else if (step === "requirements") setStep("summary");
  };

  const handleBack = () => {
    if (step === "type") setStep("intro");
    else if (step === "details") setStep("type");
    else if (step === "logistics") setStep("details");
    else if (step === "requirements") setStep("logistics");
    else if (step === "summary") setStep("requirements");
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      const bookingData: Partial<Booking> = {
        cookId: chef.id,
        clientId: currentUser.id,
        clientName: currentUser.nome,
        cookName: chef.nome,
        data: preferredDate || todayLocal(),
        hora: preferredTime || "12:00",
        status: BookingStatus.QUOTE_REQUESTED,
        menu_selected:
          requestName ||
          (requestType === "dish"
            ? "Pedido de Prato"
            : "Experiência Gastronómica"),
        menu_type: requestType || "experience",
        morada: `${location}${doorNumber ? `, nº ${doorNumber}` : ""}${floor ? `, ${floor}` : ""}, ${zipCode} ${city}`,
        valorTotal: 0, // To be defined by the chef
        numPessoas: numPeople,
        kitchenNotes: notes,
      };

      await supabaseService.createBooking(bookingData);
      onNotify?.("Pedido de orçamento enviado com sucesso!", "success");
      onSuccess();
    } catch (error) {
      console.error("Error submitting quote request:", error);
      onNotify?.(
        "Erro ao enviar pedido de orçamento. Tente novamente.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "intro":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8 text-center"
          >
            <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ICONS.FileText className="text-orange-500" size={40} />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                Pedir Orçamento
              </h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs mx-auto">
                Personalize a sua experiência gastronómica com o Chef{" "}
                {chef.nome}. Conte-nos o que procura e receba uma proposta
                exclusiva.
              </p>
            </div>
            <button
              onClick={handleNext}
              className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-xl active:scale-95"
            >
              Começar
            </button>
          </motion.div>
        );

      case "type":
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                O que procura?
              </h2>
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                Selecione o tipo de serviço
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => {
                  setRequestType("dish");
                  handleNext();
                }}
                className={`p-6 rounded-3xl border-2 transition-all text-left group ${requestType === "dish" ? "border-orange-500 bg-orange-500/5" : "border-white/5 bg-white/5 hover:border-white/20"}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                    <ICONS.Utensils size={24} />
                  </div>
                  {requestType === "dish" && (
                    <ICONS.CheckCircle className="text-orange-500" size={20} />
                  )}
                </div>
                <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">
                  Um Prato Específico
                </h3>
                <p className="text-white/40 text-[9px] font-medium mt-1">
                  Deseja um prato que não está na ementa ou algo personalizado.
                </p>
              </button>

              <button
                onClick={() => {
                  setRequestType("experience");
                  handleNext();
                }}
                className={`p-6 rounded-3xl border-2 transition-all text-left group ${requestType === "experience" ? "border-orange-500 bg-orange-500/5" : "border-white/5 bg-white/5 hover:border-white/20"}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                    <ICONS.Sparkles size={24} />
                  </div>
                  {requestType === "experience" && (
                    <ICONS.CheckCircle className="text-orange-500" size={20} />
                  )}
                </div>
                <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">
                  Experiência Completa
                </h3>
                <p className="text-white/40 text-[9px] font-medium mt-1">
                  Um evento completo, com vários pratos e serviço personalizado.
                </p>
              </button>
            </div>
          </motion.div>
        );

      case "details":
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                Detalhes do Pedido
              </h2>
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                {requestType === "dish"
                  ? "Escolha o prato e defina o grupo"
                  : "Dê um nome e defina o grupo"}
              </p>
            </div>

            <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
              {requestType === "dish" && (
                <div className="space-y-3">
                  <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4">
                    Escolha um Prato
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {chefMenus
                      .filter((m) => m.type === "dish")
                      .map((menu) => (
                        <button
                          key={menu.id}
                          onClick={() => {
                            setSelectedDishId(menu.id);
                          }}
                          className={`p-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${selectedDishId === menu.id ? "border-orange-500 bg-orange-500/5" : "border-white/5 bg-white/5 hover:border-white/10"}`}
                        >
                          <div className="aspect-video rounded-xl overflow-hidden mb-2">
                            {menu.imageUrl && menu.imageUrl !== "" ? (
                              <img
                                src={menu.imageUrl}
                                className="w-full h-full object-cover"
                                alt={menu.nome}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                <ICONS.Utensils
                                  size={20}
                                  className="text-white/20"
                                />
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] font-black text-white uppercase italic truncate">
                            {menu.nome}
                          </p>
                          {selectedDishId === menu.id && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                              <ICONS.Check size={12} className="text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    {chefMenus.filter((m) => m.type === "dish").length ===
                      0 && (
                      <div className="col-span-2 py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                          Nenhum prato disponível
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4">
                  Nome do Evento / Pedido
                </label>
                <input
                  type="text"
                  placeholder="Ex: Jantar de Aniversário, Almoço de Família..."
                  className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white font-bold text-sm outline-none focus:border-orange-500 transition-all"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4">
                  Número de Pessoas
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setNumPeople(Math.max(1, numPeople - 1))}
                    className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-white/10 transition-all"
                  >
                    <ICONS.ChevronLeft size={20} />
                  </button>
                  <div className="flex-1 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                    <span className="text-xl font-black text-white italic">
                      {numPeople}
                    </span>
                    <span className="text-[10px] font-black text-white/20 uppercase ml-2">
                      Pax
                    </span>
                  </div>
                  <button
                    onClick={() => setNumPeople(numPeople + 1)}
                    className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-white/10 transition-all"
                  >
                    <ICONS.ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleBack}
                className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <ICONS.ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNext}
                disabled={
                  !requestName || (requestType === "dish" && !selectedDishId)
                }
                className="flex-1 h-16 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all disabled:opacity-20"
              >
                Continuar
              </button>
            </div>
          </motion.div>
        );

      case "logistics":
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                Quando e Onde?
              </h2>
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                Defina a data e local pretendidos
              </p>
            </div>

            <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-2 scrollbar-hide">
              {/* Saved Addresses Suggestion */}
              <div className="space-y-3">
                <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4">
                  Moradas Guardadas
                </label>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {/* Manual Entry Option */}
                  <button
                    onClick={() => {
                      setIsManualAddress(true);
                      setLocation("");
                      setCity("");
                      setDoorNumber("");
                      setFloor("");
                      setZipCode("");
                    }}
                    className={`flex-shrink-0 p-4 rounded-2xl border-2 transition-all text-left min-w-[140px] ${isManualAddress ? "border-orange-500 bg-orange-500/5" : "border-white/5 bg-white/5 hover:border-white/10"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ICONS.Plus size={12} className="text-orange-500" />
                      <span className="text-[10px] font-black text-white uppercase truncate">
                        Nova Morada
                      </span>
                    </div>
                    <p className="text-[8px] text-white/40 leading-tight">
                      Inserir manualmente
                    </p>
                  </button>

                  {currentUser?.addresses?.map((addr, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsManualAddress(false);
                        setLocation(addr.address || "");
                        setCity(addr.city || "");
                        setDoorNumber(addr.door_number || "");
                        setFloor(addr.floor || "");
                        setZipCode(addr.zip_code || "");
                      }}
                      className={`flex-shrink-0 p-4 rounded-2xl border-2 transition-all text-left max-w-[200px] ${!isManualAddress && location === addr.address ? "border-orange-500 bg-orange-500/5" : "border-white/5 bg-white/5 hover:border-white/10"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <ICONS.MapPin size={12} className="text-orange-500" />
                        <span className="text-[10px] font-black text-white uppercase truncate">
                          {addr.label || "Morada"}
                        </span>
                      </div>
                      <p className="text-[8px] text-white/40 line-clamp-2 leading-tight">
                        {addr.address}, {addr.city}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4">
                    Data
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      min={todayLocal()}
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white font-bold text-xs outline-none focus:border-orange-500 transition-all"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4">
                    Hora
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white font-bold text-xs outline-none focus:border-orange-500 transition-all"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4">
                  Rua / Morada
                </label>
                <GoogleAddressAutocomplete
                  theme="dark"
                  placeholder="Ex: Rua das Flores"
                  disabled={!isManualAddress}
                  className={`w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white font-bold text-sm outline-none focus:border-orange-500 transition-all ${!isManualAddress ? "opacity-50 cursor-not-allowed" : ""}`}
                  value={location}
                  onChange={(val) => setLocation(val)}
                  onAddressSelect={(addressData) => {
                    if (addressData.address) setLocation(addressData.address);
                    if (addressData.door_number) setDoorNumber(addressData.door_number);
                    if (addressData.zip_code) setZipCode(addressData.zip_code);
                    if (addressData.city) setCity(addressData.city);
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4">
                    Número / Porta
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 123"
                    readOnly={!isManualAddress}
                    className={`w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white font-bold text-sm outline-none focus:border-orange-500 transition-all ${!isManualAddress ? "opacity-50 cursor-not-allowed" : ""}`}
                    value={doorNumber}
                    onChange={(e) => setDoorNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4">
                    Andar / Apart.
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 2º Esq"
                    readOnly={!isManualAddress}
                    className={`w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white font-bold text-sm outline-none focus:border-orange-500 transition-all ${!isManualAddress ? "opacity-50 cursor-not-allowed" : ""}`}
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4">
                    Código Postal
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="Ex: 1000-001"
                    readOnly={!isManualAddress}
                    className={`w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white font-bold text-sm outline-none focus:border-orange-500 transition-all ${!isManualAddress ? "opacity-50 cursor-not-allowed" : ""} ${isManualAddress && zipCode && !isZipCodeValid(zipCode) ? "border-red-500/50" : ""}`}
                    value={zipCode}
                    onChange={(e) => setZipCode(formatPostalCode(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4">
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Lisboa"
                    readOnly={!isManualAddress}
                    className={`w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white font-bold text-sm outline-none focus:border-orange-500 transition-all ${!isManualAddress ? "opacity-50 cursor-not-allowed" : ""}`}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                onClick={handleBack}
                className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <ICONS.ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNext}
                disabled={
                  !isDateTimeValid() ||
                  !city ||
                  !location ||
                  !isZipCodeValid(zipCode)
                }
                className="flex-1 h-14 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all disabled:opacity-20"
              >
                Continuar
              </button>
            </div>
          </motion.div>
        );

      case "requirements":
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                Requisitos
              </h2>
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                Conte-nos mais sobre as suas preferências
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4">
                  Notas, Alergias ou Desejos
                </label>
                <textarea
                  placeholder="Ex: Alergia a marisco, preferência por cozinha mediterrânica, cozinha equipada com forno a lenha..."
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-3xl p-6 text-white font-bold text-sm outline-none focus:border-orange-500 transition-all resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleBack}
                className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <ICONS.ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNext}
                className="flex-1 h-16 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all"
              >
                Resumo
              </button>
            </div>
          </motion.div>
        );

      case "summary":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                Resumo do Pedido
              </h2>
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                Confirme os dados antes de enviar
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                      Tipo de Serviço
                    </p>
                    <p className="text-sm font-black text-orange-500 italic uppercase tracking-tighter">
                      {requestType === "dish"
                        ? "Prato Personalizado"
                        : "Experiência Completa"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                      Pessoas
                    </p>
                    <p className="text-sm font-black text-white italic uppercase tracking-tighter">
                      {numPeople} Pax
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                    Nome do Pedido
                  </p>
                  <p className="text-sm font-black text-white italic uppercase tracking-tighter">
                    {requestName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                      Data
                    </p>
                    <p className="text-sm font-black text-white italic uppercase tracking-tighter">
                      {preferredDate || "A definir"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                      Hora
                    </p>
                    <p className="text-sm font-black text-white italic uppercase tracking-tighter">
                      {preferredTime || "A definir"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                    Localização
                  </p>
                  <p className="text-sm font-black text-white italic uppercase tracking-tighter">
                    {location}
                    {doorNumber ? `, nº ${doorNumber}` : ""}
                    {floor ? `, ${floor}` : ""}
                  </p>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    {zipCode} {city}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleBack}
                className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <ICONS.ChevronLeft size={20} />
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 h-16 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <ICONS.RefreshCw className="animate-spin" size={18} />
                ) : (
                  <>
                    <ICONS.Send size={18} />
                    Enviar Pedido
                  </>
                )}
              </button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl">
      <div className="max-w-lg w-full relative">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all"
        >
          <ICONS.X size={20} />
        </button>

        <div className="bg-slate-950 rounded-[3rem] p-8 md:p-12 border border-white/5 shadow-3xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
            <motion.div
              className="h-full bg-orange-500"
              initial={{ width: "0%" }}
              animate={{
                width:
                  step === "intro"
                    ? "0%"
                    : step === "type"
                      ? "20%"
                      : step === "details"
                        ? "40%"
                        : step === "logistics"
                          ? "60%"
                          : step === "requirements"
                            ? "80%"
                            : "100%",
              }}
            />
          </div>

          <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
        </div>
      </div>
    </div>
  );
};
