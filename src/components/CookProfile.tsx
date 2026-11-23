import React, { useState, useRef, useEffect } from "react";
import { User, CertificationOrAward, ChefFAQItem } from "../types";
import { ICONS, CUISINES, PORTUGAL_CITIES, formatPrice, SUSTAINABILITY_BADGES_LIST, ALLERGEN_CERTIFICATIONS_LIST } from "../constants";
import { supabaseService } from "../services/supabaseService";
import { useLanguage } from "../contexts/LanguageContext";
import { formatPostalCode } from "../utils/formatters";
import { Trash2, Plus, Edit3, Award, GraduationCap, ShieldCheck, CheckCircle2, Medal, X, Sparkles, HelpCircle, ChevronDown, ChevronUp, Lightbulb, Leaf } from "lucide-react";

import { tr, trLocale } from "../lib/tr";
const PRESET_FAQS = [
  {
    category: 'alergias' as const,
    question: 'Como garante a segurança em caso de alergias ou intolerâncias alimentares?',
    answer: 'Confirmo previamente todos os ingredientes e alergénios com o cliente. Utilizo utensílios higienizados e preparações isoladas para evitar contaminação cruzada.'
  },
  {
    category: 'logistica' as const,
    question: 'O chef traz os seus próprios utensílios de cozinha?',
    answer: 'Trago todo o meu equipamento profissional (facas, pequenos utensílios e material específico). Apenas utilizo o fogão, forno e loiça de serviço do cliente.'
  },
  {
    category: 'logistica' as const,
    question: 'A cozinha fica limpa no final do serviço?',
    answer: 'Sim, no final do evento limpo e higienizo as bancadas e lavo os utensílios e tachos utilizados na confeção, deixando a cozinha impecável.'
  },
  {
    category: 'ingredientes' as const,
    question: 'Quem compra os ingredientes e onde são adquiridos?',
    answer: 'Compro 100% dos ingredientes frescos no próprio dia do evento em mercados locais de produtores e peixarias, selecionando pessoalmente a melhor qualidade.'
  },
  {
    category: 'geral' as const,
    question: 'Com quanta antecedência o chef chega à minha residência?',
    answer: 'Chego normalmente entre 1h30 a 2 horas antes do horário marcado para a refeição, garantindo todo o mise en place com tranquilidade.'
  }
];

interface CookProfileProps {
  user: User;
  onRefresh: (userOverride?: User) => void;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  onNotify?: (message: string, type: "success" | "error" | "info") => void;
}

const CookProfile: React.FC<CookProfileProps> = ({
  user,
  onRefresh,
  onLogout,
  onNavigate,
  onNotify,
}) => {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [uploading, setUploading] = useState<"avatar" | "cover" | "portfolio" | null>(null);
  const [activeTab, setActiveTab] = useState<
    "perfil" | "moradas" | "profissional" | "sustentabilidade" | "avaliacoes"
  >("perfil");
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  // Certificações & Prémios State
  const [showAddCertModal, setShowAddCertModal] = useState(false);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);

  // Guardar estado dos campos independente por cada secção/tipo de reconhecimento
  const [certSectionForms, setCertSectionForms] = useState<Record<string, {
    title: string;
    issuer: string;
    year: string;
    description: string;
  }>>({
    certification: { title: "", issuer: "", year: new Date().getFullYear().toString(), description: "" },
    award: { title: "", issuer: "", year: new Date().getFullYear().toString(), description: "" },
    training: { title: "", issuer: "", year: new Date().getFullYear().toString(), description: "" },
  });

  const [certForm, setCertForm] = useState<{
    title: string;
    issuer: string;
    year: string;
    type: 'certification' | 'award' | 'training';
    description: string;
  }>({
    title: "",
    issuer: "",
    year: new Date().getFullYear().toString(),
    type: "certification",
    description: ""
  });

  const handleOpenCertModal = (cert?: CertificationOrAward) => {
    if (cert) {
      setEditingCertId(cert.id);
      const certType = cert.type || "certification";
      const populated = {
        title: cert.title,
        issuer: cert.issuer,
        year: cert.year || new Date().getFullYear().toString(),
        description: cert.description || "",
      };
      setCertForm({
        ...populated,
        type: certType,
      });
      setCertSectionForms((prev) => ({
        ...prev,
        [certType]: populated,
      }));
    } else {
      setEditingCertId(null);
      const currentYear = new Date().getFullYear().toString();
      const freshDrafts = {
        certification: { title: "", issuer: "", year: currentYear, description: "" },
        award: { title: "", issuer: "", year: currentYear, description: "" },
        training: { title: "", issuer: "", year: currentYear, description: "" },
      };
      setCertSectionForms(freshDrafts);
      setCertForm({
        title: "",
        issuer: "",
        year: currentYear,
        type: "certification",
        description: "",
      });
    }
    setShowAddCertModal(true);
  };

  const handleSwitchCertType = (newType: 'certification' | 'award' | 'training') => {
    if (certForm.type === newType) return;
    // 1. Guardar o que o utilizador preencheu para a secção atual
    const updatedDrafts = {
      ...certSectionForms,
      [certForm.type]: {
        title: certForm.title,
        issuer: certForm.issuer,
        year: certForm.year,
        description: certForm.description,
      }
    };
    setCertSectionForms(updatedDrafts);

    // 2. Carregar os dados da nova secção (que começam limpos ou com o rascunho anterior)
    const target = updatedDrafts[newType] || {
      title: "",
      issuer: "",
      year: new Date().getFullYear().toString(),
      description: "",
    };

    setCertForm({
      type: newType,
      title: target.title,
      issuer: target.issuer,
      year: target.year,
      description: target.description,
    });
  };

  const handleSaveCertItem = () => {
    if (!certForm.title.trim()) {
      onNotify?.(tr("Insere o título da certificação ou prémio."), "error");
      return;
    }
    if (!certForm.issuer.trim()) {
      onNotify?.(tr("Insere a entidade emissora ou instituição."), "error");
      return;
    }

    const currentList = editedUser.certifications_and_awards || [];
    let updatedList: CertificationOrAward[];

    if (editingCertId) {
      updatedList = currentList.map((c) =>
        c.id === editingCertId
          ? {
              ...c,
              title: certForm.title.trim(),
              issuer: certForm.issuer.trim(),
              year: certForm.year.trim(),
              type: certForm.type,
              description: certForm.description.trim(),
            }
          : c
      );
    } else {
      const newItem: CertificationOrAward = {
        id: "cert-" + Date.now(),
        title: certForm.title.trim(),
        issuer: certForm.issuer.trim(),
        year: certForm.year.trim(),
        type: certForm.type,
        description: certForm.description.trim(),
        verified: true,
      };
      updatedList = [newItem, ...currentList];
    }

    const newUserData = { ...editedUser, certifications_and_awards: updatedList };
    setEditedUser(newUserData);
    setShowAddCertModal(false);
    setEditingCertId(null);

    // Limpar o rascunho da secção guardada
    setCertSectionForms((prev) => ({
      ...prev,
      [certForm.type]: {
        title: "",
        issuer: "",
        year: new Date().getFullYear().toString(),
        description: "",
      }
    }));

    // Persistir imediatamente na sessão e local storage
    const draftKey = `cook_profile_draft_${user.id}`;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(newUserData));
      localStorage.setItem("cookr_user", JSON.stringify(newUserData));
    } catch (_) {}

    onNotify?.(tr("Certificação/Prémio guardado!"), "success");

    // Persistir na base de dados Supabase e propagar ao contexto global
    supabaseService.updateUserProfile(user.id, { certifications_and_awards: updatedList })
      .then(() => {
        onRefresh(newUserData);
      })
      .catch((err) => {
        console.warn("[CookProfile] Aviso ao sincronizar certificação:", err);
      });
  };

  const handleRemoveCertItem = (id: string) => {
    const currentList = editedUser.certifications_and_awards || [];
    const updatedList = currentList.filter((c) => c.id !== id);
    const newUserData = { ...editedUser, certifications_and_awards: updatedList };
    setEditedUser(newUserData);

    const draftKey = `cook_profile_draft_${user.id}`;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(newUserData));
      localStorage.setItem("cookr_user", JSON.stringify(newUserData));
    } catch (_) {}

    onNotify?.(tr("Certificação removida."), "info");

    // Persistir na base de dados Supabase e propagar ao contexto global
    supabaseService.updateUserProfile(user.id, { certifications_and_awards: updatedList })
      .then(() => {
        onRefresh(newUserData);
      })
      .catch((err) => {
        console.warn("[CookProfile] Aviso ao remover certificação:", err);
      });
  };

  // FAQ do Chef State
  const [showAddFaqModal, setShowAddFaqModal] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqForm, setFaqForm] = useState<{
    question: string;
    answer: string;
    category: 'geral' | 'alergias' | 'logistica' | 'ingredientes';
  }>({
    question: "",
    answer: "",
    category: "alergias"
  });

  const handleOpenFaqModal = (faq?: ChefFAQItem) => {
    if (faq) {
      setEditingFaqId(faq.id);
      setFaqForm({
        question: faq.question,
        answer: faq.answer,
        category: faq.category || "alergias"
      });
    } else {
      setEditingFaqId(null);
      setFaqForm({
        question: "",
        answer: "",
        category: "alergias"
      });
    }
    setShowAddFaqModal(true);
  };

  const handleApplyPresetFaq = (preset: typeof PRESET_FAQS[0]) => {
    setFaqForm({
      question: preset.question,
      answer: preset.answer,
      category: preset.category
    });
  };

  const handleSaveFaqItem = () => {
    if (!faqForm.question.trim()) {
      onNotify?.("Insere a pergunta do FAQ.", "error");
      return;
    }
    if (!faqForm.answer.trim()) {
      onNotify?.("Insere a resposta correspondente.", "error");
      return;
    }

    const currentFaqs = editedUser.faqs || [];
    let updatedFaqs: ChefFAQItem[];

    if (editingFaqId) {
      updatedFaqs = currentFaqs.map((f) =>
        f.id === editingFaqId
          ? {
              ...f,
              question: faqForm.question.trim(),
              answer: faqForm.answer.trim(),
              category: faqForm.category
            }
          : f
      );
    } else {
      const newFaq: ChefFAQItem = {
        id: "faq-" + Date.now(),
        question: faqForm.question.trim(),
        answer: faqForm.answer.trim(),
        category: faqForm.category
      };
      updatedFaqs = [...currentFaqs, newFaq];
    }

    const newUserData = { ...editedUser, faqs: updatedFaqs };
    setEditedUser(newUserData);
    setShowAddFaqModal(false);
    setEditingFaqId(null);

    const draftKey = `cook_profile_draft_${user.id}`;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(newUserData));
      localStorage.setItem("cookr_user", JSON.stringify(newUserData));
    } catch (_) {}

    onNotify?.(tr("Pergunta de FAQ guardada no perfil!"), "success");

    supabaseService.updateUserProfile(user.id, { faqs: updatedFaqs })
      .then(() => {
        onRefresh(newUserData);
      })
      .catch((err) => {
        console.warn("[CookProfile] Aviso ao sincronizar FAQ:", err);
      });
  };

  const handleRemoveFaqItem = (id: string) => {
    const currentFaqs = editedUser.faqs || [];
    const updatedFaqs = currentFaqs.filter((f) => f.id !== id);
    const newUserData = { ...editedUser, faqs: updatedFaqs };
    setEditedUser(newUserData);

    const draftKey = `cook_profile_draft_${user.id}`;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(newUserData));
      localStorage.setItem("cookr_user", JSON.stringify(newUserData));
    } catch (_) {}

    onNotify?.(tr("Pergunta de FAQ removida."), "info");

    supabaseService.updateUserProfile(user.id, { faqs: updatedFaqs })
      .then(() => {
        onRefresh(newUserData);
      })
      .catch((err) => {
        console.warn("[CookProfile] Aviso ao remover FAQ:", err);
      });
  };

  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoadingReviews(true);
      try {
        const revs = await supabaseService.getReviewsByCookId(user.id);
        if (revs) {
          setReviewsList(revs);
        }
      } catch (err) {
        console.warn("Note fetching reviews:", err);
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchReviews();
  }, [user.id]);

  // Restore Draft on Mount
  useEffect(() => {
    if (!user.id) return;
    const draftKey = `cook_profile_draft_${user.id}`;
    const savedDraft = sessionStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        setEditedUser(parsedDraft);
        setIsEditing(true);
        onNotify?.(tr("Rascunho recuperado de uma sessão anterior!"), "info");
      } catch (err) {
        console.error("Error restoring draft:", err);
      }
    }
  }, [user.id]);

  // Debounced auto-save to sessionStorage
  useEffect(() => {
    if (!isEditing) return;

    const handler = setTimeout(() => {
      const draftKey = `cook_profile_draft_${user.id}`;
      if (JSON.stringify(editedUser) === JSON.stringify(user)) {
        sessionStorage.removeItem(draftKey);
      } else {
        sessionStorage.setItem(draftKey, JSON.stringify(editedUser));
        console.log("[Auto-save] Draft saved to sessionStorage");
      }
    }, 1000); // 1 second debounce

    return () => {
      clearTimeout(handler);
    };
  }, [editedUser, isEditing, user, user.id]);

  useEffect(() => {
    if (!isEditing) {
      // Only reset if there is no draft in sessionStorage to prevent race conditions during restore
      const draftKey = `cook_profile_draft_${user.id}`;
      const hasDraft = sessionStorage.getItem(draftKey);
      if (!hasDraft) {
        setEditedUser(user);
      }
    }
  }, [user, isEditing]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  const formatZipCode = (value: string) => {
    return formatPostalCode(value);
  };

  const handleCancel = () => {
    const draftKey = `cook_profile_draft_${user.id}`;
    sessionStorage.removeItem(draftKey);
    setIsEditing(false);
  };

  const handleSave = async (silent = false) => {
    setIsSaving(true);
    try {
      // Garantir que campos críticos são sincronizados
      const dataToSave = { ...editedUser };

      await supabaseService.updateUserProfile(user.id, dataToSave);
      
      const draftKey = `cook_profile_draft_${user.id}`;
      sessionStorage.removeItem(draftKey);
      try {
        localStorage.setItem("cookr_user", JSON.stringify(dataToSave));
      } catch (_) {}

      if (!silent) {
        setIsEditing(false);
        onRefresh(dataToSave);
        if (onNotify) {
          onNotify(tr("Perfil atualizado com sucesso!"), "success");
        } else {
          console.log("Perfil updated with success!");
        }
      }
    } catch (e: any) {
      console.warn("Aviso ao guardar perfil:", e);
      const errorMsg = e.message || "Erro desconhecido ao guardar perfil.";
      if (!silent) {
        if (onNotify) {
          onNotify(errorMsg, "error");
        } else {
          console.warn(`Erro ao guardar perfil: ${errorMsg}`);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "cover",
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(type);
      try {
        const url =
          type === "avatar"
            ? await supabaseService.uploadAvatar(user.id, file)
            : await supabaseService.uploadCover(user.id, file);

        if (!url) {
          onNotify?.(tr("Erro ao carregar imagem."), "error");
          return;
        }
        const finalUrl = url.startsWith("data:") ? url : `${url}?t=${Date.now()}`;
        const updateData =
          type === "avatar"
            ? { avatar_url: finalUrl }
            : { cover_url: finalUrl };
        const updatedUser = { ...user, ...updateData };

        setEditedUser(updatedUser);
        await supabaseService.updateUserProfile(user.id, updateData);
        onRefresh(updatedUser);
      } catch (err: any) {
        onNotify?.(err.message || "Erro ao carregar imagem.", "error");
      } finally {
        setUploading(null);
      }
    }
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const current = editedUser.portfolio_images || [];
    if (current.length >= 6) {
      onNotify?.(tr("O limite máximo é de 6 fotografias no portefólio."), "error");
      return;
    }
    setUploading("portfolio");
    try {
      const url = await supabaseService.uploadFile("covers", user.id, file, 1280);
      if (!url) {
        onNotify?.(tr("Erro ao carregar imagem."), "error");
        return;
      }
      setEditedUser((prev: any) => ({ ...prev, portfolio_images: [...(prev.portfolio_images || []), url].slice(0, 6) }));
    } catch (err: any) {
      onNotify?.(err.message || "Erro ao carregar imagem.", "error");
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveFile = async (type: "avatar" | "cover") => {
    if (
      !window.confirm(
        tr("Tens a certeza que queres remover a tua {v0}?", { v0: type === "avatar" ? "foto de perfil" : "foto de capa" }),
      )
    )
      return;

    setUploading(type);
    try {
      const updateData =
        type === "avatar" ? { avatar_url: null } : { cover_url: null };
      const updatedUser = { ...user, ...updateData };

      await supabaseService.updateUserProfile(user.id, updateData);
      setEditedUser(updatedUser);
      onRefresh(updatedUser);
      onNotify?.(
        tr("{v0} removida com sucesso!", { v0: type === "avatar" ? "Foto de perfil" : "Foto de capa" }),
        "success",
      );
    } catch (err: any) {
      onNotify?.(tr("Erro ao remover imagem."), "error");
    } finally {
      setUploading(null);
    }
  };

  const toggleEspecialidade = (esp: string) => {
    const current = editedUser.especialidades || [];
    const updated = current.includes(esp)
      ? current.filter((e) => e !== esp)
      : [...current, esp];
    setEditedUser({ ...editedUser, especialidades: updated });
  };

  const toggleItem = (
    field: "idiomas" | "equipamento" | "diferenciais",
    item: string,
  ) => {
    const current = (editedUser[field] as string[]) || [];
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    setEditedUser({ ...editedUser, [field]: updated });
  };

  const toggleWinePairing = () => {
    const isWinePairingActive = editedUser.offers_wine_pairing || editedUser.diferenciais?.includes("vinho");
    const currentDiferenciais = editedUser.diferenciais || [];
    let nextDiferenciais = [...currentDiferenciais];
    if (isWinePairingActive) {
      nextDiferenciais = nextDiferenciais.filter(d => d !== "vinho");
    } else {
      if (!nextDiferenciais.includes("vinho")) {
        nextDiferenciais.push("vinho");
      }
    }
    setEditedUser({
      ...editedUser,
      offers_wine_pairing: !isWinePairingActive,
      diferenciais: nextDiferenciais
    });
  };

  const handleGoOnline = async (addressId?: string) => {
    console.log(
      "[CookProfile] Iniciando processo para ficar Online. AddressId:",
      addressId,
    );
    try {
      let updateData: any = {
        isAvailable: true,
        addresses: editedUser.addresses, // Garantir que as moradas atuais são guardadas
      };

      if (addressId) {
        const addr = (editedUser.addresses || []).find(
          (a) => a.id === addressId,
        );
        if (addr) {
          console.log("[CookProfile] Usando morada selecionada:", addr.label);
          updateData = {
            ...updateData,
            morada: addr.address,
            cidade: addr.city,
            localizacao: addr.city,
          };
        }
      } else {
        // Usar morada principal se não selecionada
        const primary = (editedUser.addresses || []).find((a) => a.isDefault);
        if (primary) {
          console.log("[CookProfile] Usando morada principal:", primary.label);
          updateData = {
            ...updateData,
            morada: primary.address,
            cidade: primary.city,
            localizacao: primary.city,
          };
        } else {
          console.warn("[CookProfile] Nenhuma morada principal encontrada.");
        }
      }

      console.log(
        "[CookProfile] Enviando atualização para Supabase:",
        updateData,
      );
      await supabaseService.updateUserProfile(user.id, updateData);
      console.log(
        "[CookProfile] Atualização no Supabase concluída com sucesso.",
      );

      const updatedUser = { ...editedUser, ...updateData };
      setEditedUser(updatedUser);
      setShowAvailabilityModal(false);
      onRefresh(updatedUser);
      onNotify?.(tr("Estás agora Online!"), "success");
    } catch (e: any) {
      console.warn("[CookProfile] Erro ao entrar online:", e);
      onNotify?.("Erro ao entrar online: " + (e.message || ""), "error");
    }
  };

  const toggleAvailability = async () => {
    console.log(
      "[CookProfile] Toggling availability. Current status:",
      editedUser.isAvailable,
    );
    if (!editedUser.isAvailable) {
      // Se tiver múltiplas moradas, perguntar qual usar
      const addressCount = (editedUser.addresses || []).length;
      console.log("[CookProfile] Chef tem", addressCount, "moradas.");

      if (addressCount > 1) {
        setShowAvailabilityModal(true);
      } else {
        await handleGoOnline();
      }
    } else {
      console.log("[CookProfile] Ficando Offline...");
      try {
        const offlineData = {
          isAvailable: false,
          addresses: editedUser.addresses, // Garantir que as moradas atuais são guardadas
        };
        await supabaseService.updateUserProfile(user.id, offlineData);
        console.log("[CookProfile] Status Offline guardado no Supabase.");

        const updatedUser = { ...editedUser, isAvailable: false };
        setEditedUser(updatedUser);
        onRefresh(updatedUser);
        onNotify?.("Ficaste Offline.", "info");
      } catch (e: any) {
        console.warn("[CookProfile] Erro ao ficar offline:", e);
        onNotify?.(tr("Erro ao ficar offline."), "error");
      }
    }
  };

  const addAddress = () => {
    const newAddress = {
      id: Math.random().toString(36).substr(2, 9),
      label: "Nova Morada",
      address: "",
      door_number: "",
      floor: "",
      zip_code: "",
      city: "Lisboa",
      isDefault: false,
    };
    const currentAddresses = editedUser.addresses || [];
    setEditedUser({
      ...editedUser,
      addresses: [...currentAddresses, newAddress],
    });
  };

  const removeAddress = async (id: string) => {
    setEditedUser((prev) => {
      const updatedAddresses = (prev.addresses || []).filter(
        (a) => String(a.id) !== String(id),
      );
      return { ...prev, addresses: updatedAddresses };
    });

    // Persistir imediatamente
    try {
      const updatedAddresses = (editedUser.addresses || []).filter(
        (a) => String(a.id) !== String(id),
      );
      await supabaseService.updateUserProfile(user.id, {
        addresses: updatedAddresses,
      });
      onRefresh();
    } catch (e) {
      console.warn("Erro ao eliminar morada:", e);
    }
  };

  const setPrimaryAddress = async (id: string) => {
    const updated = (editedUser.addresses || []).map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    const primary = updated.find((a) => a.id === id);
    if (primary) {
      const newUserState = {
        ...editedUser,
        addresses: updated,
        morada: primary.address,
        cidade: primary.city,
        localizacao: primary.city,
      };
      setEditedUser(newUserState);

      // Persistir imediatamente para ser real-time
      try {
        await supabaseService.updateUserProfile(user.id, newUserState);
        onRefresh();
      } catch (e) {
        console.warn("Erro ao definir morada principal:", e);
      }
    }
  };

  const updateAddressField = (id: string, field: string, value: string) => {
    const updated = (editedUser.addresses || []).map((a) =>
      a.id === id ? { ...a, [field]: value } : a,
    );
    setEditedUser({ ...editedUser, addresses: updated });
  };

  return (
    <div className="min-h-dvh bg-slate-50/30 pb-16 animate-in fade-in duration-500">
      {/* Availability Selection Modal */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 md:p-8 space-y-6 animate-in zoom-in-95 duration-300 shadow-2xl">
            <div className="space-y-3 text-center">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mx-auto border border-orange-100">
                <ICONS.MapPin className="text-orange-500" size={20} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                  {tr("Onde estás hoje?")}
                </h3>
                <p className="text-slate-400 font-medium text-xs leading-relaxed">
                  {tr("Selecione a cozinha onde irá operar para que os clientes na zona o possam encontrar.")}
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1.5 custom-scrollbar">
              {(editedUser.addresses || []).map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => handleGoOnline(addr.id)}
                  className="w-full p-3.5 bg-slate-50 hover:bg-orange-500 hover:text-white rounded-xl border border-slate-100 hover:border-orange-450 transition-all text-left group flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs uppercase tracking-wider">
                      {tr(addr.label as any) as any}
                    </p>
                    <p className="text-[9px] font-semibold opacity-60 uppercase italic">
                      {addr.address}, {addr.city}
                    </p>
                  </div>
                  <ICONS.ArrowRight
                    size={14}
                    className="opacity-0 group-hover:opacity-100 transition-all"
                  />
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowAvailabilityModal(false)}
                className="w-full h-10 bg-slate-100 text-slate-400 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:text-slate-950 transition-all"
              >
                {tr("Cancelar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRO-GRADE PROFILE HEADER */}
      <div className="relative space-y-0">
        {/* 1. COVER PHOTO */}
        <div className="relative h-44 sm:h-56 md:h-64 lg:h-72 w-full overflow-hidden bg-slate-900">
          {editedUser.cover_url ? (
            <img
              src={editedUser.cover_url}
              className="w-full h-full object-cover"
              alt={tr("Cover")}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
              <ICONS.ChefHat size={50} className="text-white/5" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

          {/* Premium Floating Actions for Cover Photo */}
          <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 relative flex items-start justify-end pt-4 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900/70 hover:bg-slate-900 backdrop-blur-md text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-white/10 shadow-lg active:scale-95"
              >
                <ICONS.Camera size={13} />
                <span>{uploading === "cover" ? tr("A carregar...") : tr("Alterar Capa")}</span>
              </button>
              {editedUser.cover_url && (
                <button
                  type="button"
                  onClick={() => handleRemoveFile("cover")}
                  className="flex items-center justify-center w-9 h-9 bg-red-500/85 backdrop-blur-md text-white rounded-xl hover:bg-red-600 transition-all border border-white/10 shadow-lg active:scale-95"
                  title={tr("Remover Foto de Capa")}
                >
                  <Trash2 size={13} />
                </button>
              )}
              <input
                type="file"
                ref={coverInputRef}
                onChange={(e) => handleFileUpload(e, "cover")}
                className="hidden"
                accept="image/*"
              />
            </div>
          </div>
        </div>

        {/* 2. PROFILE HERO OVERLAY */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-30">
          <div className="flex flex-col md:flex-row md:items-end gap-6 pt-0">
            {/* Avatar */}
            <div className="-mt-12 md:-mt-16 z-10 flex-shrink-0 relative group">
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-2xl bg-slate-900 border-4 border-white shadow-xl overflow-hidden relative cursor-pointer group transition-transform duration-300 hover:scale-[1.02]"
              >
                {editedUser.avatar_url ? (
                  <img
                    src={editedUser.avatar_url}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={tr("Avatar")}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-slate-300 text-3xl italic uppercase bg-slate-900">
                    {(editedUser.nome || "U").charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ICONS.Camera className="text-white" size={18} />
                </div>
                {uploading === "avatar" && (
                  <div className="absolute inset-0 bg-white/85 flex items-center justify-center">
                    <ICONS.Clock
                      className="animate-spin text-orange-500"
                      size={18}
                    />
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e, "avatar")}
                className="hidden"
                accept="image/*"
              />

              {/* Intuitive camera badge on bottom-right of avatar */}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white text-slate-700 rounded-full flex items-center justify-center shadow-md transition-all border border-slate-100/80 z-20 pointer-events-none group-hover:scale-110">
                <ICONS.Camera size={11} />
              </div>

              {/* Sleek Profile Delete Button at top-right of avatar */}
              {editedUser.avatar_url && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile("avatar");
                  }}
                  className="absolute -top-2 -right-2 w-7 h-7 bg-white hover:bg-red-50 text-red-500 hover:text-red-600 rounded-full flex items-center justify-center shadow-md transition-all border border-slate-100/80 active:scale-90 z-30"
                  title={tr("Remover Foto de Perfil")}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {/* Profile Info Block */}
            <div className="flex-1 min-w-0 pb-1 text-left">
              {/* Row 1: Nome + Badges */}
              <div className="flex flex-wrap items-center gap-3">
                {isEditing ? (
                  <input
                    type="text"
                    className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-950 uppercase tracking-tight leading-none bg-transparent border-b-2 border-orange-500 focus:border-orange-600 outline-none pb-0.5 w-auto max-w-full sm:max-w-md transition-colors"
                    value={editedUser.nome}
                    onChange={(e) =>
                      setEditedUser({ ...editedUser, nome: e.target.value })
                    }
                    placeholder={tr("Teu Nome Profissional")}
                  />
                ) : (
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-950 uppercase tracking-tight leading-none">
                    {editedUser.nome}
                    <span className="text-orange-500">.</span>
                  </h1>
                )}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {tr("Chef Certificado")}
                  </span>
                </div>
              </div>

              {/* Row 2: Contactos (Email, Cidade, Telefone) */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mt-2">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                  <ICONS.Mail size={13} className="text-orange-500 shrink-0" />
                  <span className="uppercase tracking-wide text-xs">{editedUser.email}</span>
                </span>

                {isEditing ? (
                  <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                    <ICONS.MapPin size={13} className="text-orange-500 shrink-0" />
                    <select
                      className="bg-transparent outline-none text-slate-950 font-semibold cursor-pointer text-xs"
                      value={editedUser.cidade || ""}
                      onChange={(e) =>
                        setEditedUser({
                          ...editedUser,
                          cidade: e.target.value,
                          localizacao: e.target.value,
                        })
                      }
                    >
                      <option value="">{tr("Cidade")}</option>
                      {PORTUGAL_CITIES.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  editedUser.cidade && (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                      <ICONS.MapPin size={13} className="text-orange-500 shrink-0" />
                      <span className="text-xs">{editedUser.cidade}{tr(", PT")}</span>
                    </span>
                  )
                )}

                {isEditing ? (
                  <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                    <ICONS.Phone size={13} className="text-orange-500 shrink-0" />
                    <input
                      type="text"
                      className="bg-transparent outline-none text-slate-950 font-semibold w-24 text-xs"
                      value={editedUser.telefone || ""}
                      onChange={(e) =>
                        setEditedUser({
                          ...editedUser,
                          telefone: e.target.value,
                        })
                      }
                      placeholder={tr("Telemóvel")}
                    />
                  </div>
                ) : (
                  editedUser.telefone && (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                      <ICONS.Phone size={13} className="text-orange-500 shrink-0" />
                      <span className="text-xs">{editedUser.telefone}</span>
                    </span>
                  )
                )}
              </div>

              {/* Row 3: Estrelas e Avaliações */}
              <div className="flex items-center gap-3 mt-2.5">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <ICONS.Star
                      key={i}
                      size={13}
                      fill={i < Math.round(editedUser.rating || 5) ? "currentColor" : "none"}
                      className={i < Math.round(editedUser.rating || 5) ? "text-amber-500" : "text-slate-200"}
                    />
                  ))}
                  <span className="ml-1 text-slate-900 font-extrabold text-sm">
                    {editedUser.rating ? editedUser.rating.toFixed(1) : "5.0"}
                  </span>
                </div>
                <div className="h-3.5 w-px bg-slate-200" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {reviewsList.length} {reviewsList.length === 1 ? tr("Avaliação de Cliente") : tr("Avaliações de Clientes")}
                </span>
              </div>
            </div>

            {/* Primary Action Button (Guardar / Editar) */}
            <div className="md:ml-auto self-end md:self-center shrink-0 w-full sm:w-auto pb-1">
              <button
                type="button"
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-950 hover:bg-black text-white rounded-full font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 border border-slate-800"
              >
                {isEditing ? (
                  <ICONS.CheckCircle size={15} className="text-emerald-400" />
                ) : (
                  <ICONS.Edit3 size={15} />
                )}
                <span>{isEditing ? tr("Guardar") : tr("Editar Identidade")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 md:mt-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar: Control Panel */}
          <div className="lg:w-1/4 space-y-4">
            {/* Status Card - REFINED */}
            <div
              className={`p-4 rounded-xl border space-y-4 transition-all duration-300 ${editedUser.isAvailable ? "bg-slate-950 border-white/5" : "bg-white border-slate-100"}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${editedUser.isAvailable ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]" : "bg-slate-100 text-slate-400 border-slate-200"}`}
                >
                  <ICONS.Zap
                    size={16}
                    className={editedUser.isAvailable ? "animate-pulse" : ""}
                  />
                </div>
                <div className="text-left">
                  <h4
                    className={`font-bold text-[9px] uppercase tracking-wider ${editedUser.isAvailable ? "text-white" : "text-slate-950"}`}
                  >
                    {tr("Modo")} {editedUser.isAvailable ? tr("Online") : tr("Offline")}
                  </h4>
                  <p
                    className={`text-[7.5px] font-bold uppercase tracking-wider ${editedUser.isAvailable ? "text-emerald-500" : "text-slate-400"}`}
                  >
                    {editedUser.isAvailable ? tr("Visível na Busca") : tr("Invisível")}
                  </p>
                </div>
              </div>

              <button
                onClick={toggleAvailability}
                className={`w-full h-9 rounded-lg font-bold text-[8.5px] uppercase tracking-wider transition-all active:scale-95 shadow-sm ${editedUser.isAvailable ? "bg-emerald-500 text-white hover:bg-emerald-400" : "bg-slate-950 text-white hover:bg-slate-850"}`}
              >
                {editedUser.isAvailable ? tr("Ficar Offline") : tr("Ficar Online")}
              </button>
            </div>

            {/* Navigation Tabs - REFINED */}
            <div className="bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm space-y-0.5">
              {[
                {
                  id: "perfil",
                  label: "Meu Perfil",
                  icon: <ICONS.User size={13} />,
                },
                {
                  id: "moradas",
                  label: "Cozinhas",
                  icon: <ICONS.MapPin size={13} />,
                },
                {
                  id: "profissional",
                  label: "Profissional",
                  icon: <ICONS.Briefcase size={13} />,
                },
                {
                  id: "sustentabilidade",
                  label: "Sustentabilidade & Alergias",
                  icon: <Leaf size={13} />,
                },
                {
                  id: "avaliacoes",
                  label: "Avaliações",
                  icon: <ICONS.Star size={13} />,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full h-9.5 px-4 rounded-lg flex items-center gap-3 font-bold text-[8.5px] uppercase tracking-wider transition-all ${activeTab === tab.id ? "bg-orange-500 text-white shadow-md shadow-orange-500/10" : "text-slate-400 hover:bg-slate-50 hover:text-slate-950"}`}
                >
                  {tab.icon}
                  {tr(tab.label as any) as any}
                </button>
              ))}
            </div>

            {/* Stats Card - Small Info */}
            <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">
                  {tr("Saldo Total")}
                </span>
                <ICONS.CreditCard size={12} className="text-orange-500" />
              </div>
              <p className="text-lg font-bold text-slate-950 tracking-tight">
                {formatPrice(1240)}
              </p>
              <button
                onClick={() => onNavigate("earnings")}
                className="text-[7.5px] font-bold text-orange-500 uppercase tracking-wider hover:underline block"
              >
                {tr("Ver Relatórios")}
              </button>
            </div>

            <button
              onClick={onLogout}
              className="w-full h-9 flex items-center justify-center gap-2 text-red-500/80 font-bold text-[8.5px] uppercase tracking-wider hover:text-red-600 transition-all"
            >
              <ICONS.XCircle size={13} />
              {tr("Sair da Plataforma")}
            </button>
          </div>

          {/* Main Content Area */}
          <div className="lg:w-3/4 space-y-6">
            <div className="bg-white p-5 md:p-8 rounded-xl border border-slate-100 shadow-sm space-y-8 text-left min-h-[60vh]">
              {activeTab === "perfil" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-355">
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-bold text-orange-500 uppercase tracking-widest block">
                      {tr("Identidade Gastronómica")}
                    </span>
                    <h2 className="text-xl md:text-2xl font-extrabold text-slate-950 tracking-tight uppercase leading-none">
                      {tr("A Minha")} <span className="text-orange-500">{tr("História.")}</span>
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      {tr("Bio Profissional")}
                    </label>
                    <textarea
                      disabled={!isEditing}
                      className="w-full h-32 p-4 bg-slate-50 rounded-xl font-medium text-xs leading-relaxed text-slate-600 outline-none border border-transparent focus:border-orange-500 transition-all resize-none shadow-inner"
                      value={editedUser.biografia || ""}
                      onChange={(e) =>
                        setEditedUser({
                          ...editedUser,
                          biografia: e.target.value,
                        })
                      }
                      placeholder={tr("Descreve o teu percurso...")}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                      {tr("Especialidades (Máx. 4)")}
                    </label>
                    <div className="flex flex-wrap gap-1.5 text-left items-center">
                      {CUISINES.map((c) => {
                        const isSelected = editedUser.especialidades?.includes(
                          c.label,
                        );
                        return (
                          <button
                            key={c.id}
                            disabled={!isEditing}
                            onClick={() => {
                              const current = editedUser.especialidades || [];
                              const updated = isSelected
                                ? current.filter((e) => e !== c.label)
                                : current.length < 4
                                  ? [...current, c.label]
                                  : current;
                              setEditedUser({
                                ...editedUser,
                                specialties: updated, // Sync both handles
                                especialidades: updated,
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[8.5px] font-bold uppercase tracking-wider transition-all border ${isSelected ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200 hover:bg-slate-100"}`}
                          >
                            {tr(c.label as any) as any}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50/60 p-4 rounded-xl space-y-2 border border-slate-100">
                      <ICONS.Clock className="text-orange-500" size={15} />
                      <div className="space-y-0.5">
                        <label className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block">
                          {tr("Experiência")}
                        </label>
                        <div className="flex items-baseline gap-1.5">
                          <input
                            disabled={!isEditing}
                            type="number"
                            className="w-12 bg-transparent font-bold text-xl text-slate-950 outline-none"
                            value={editedUser.experiencia ?? ""}
                            onChange={(e) =>
                              setEditedUser({
                                ...editedUser,
                                experiencia: Number(e.target.value),
                              })
                            }
                          />
                          <span className="font-bold text-slate-300 uppercase text-[8px]">
                            {tr("Anos")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50/60 p-4 rounded-xl space-y-2 border border-slate-100">
                      <ICONS.Globe className="text-orange-500" size={15} />
                      <div className="space-y-0.5">
                        <label className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block">
                          {tr("Idiomas de Serviço")}
                        </label>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[
                            { id: "português", label: "Português" },
                            { id: "english", label: "English" },
                            { id: "español", label: "Español" },
                            { id: "français", label: "Français" },
                          ].map((lang) => {
                            const isSelected = editedUser.idiomas?.includes(
                              lang.id,
                            );
                            return (
                              <button
                                key={lang.id}
                                disabled={!isEditing}
                                onClick={() => toggleItem("idiomas", lang.id)}
                                className={`px-2 py-1 rounded text-[7.5px] font-bold uppercase tracking-wider transition-all border ${isSelected ? "bg-slate-950 text-white border-slate-950 shadow-sm" : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"}`}
                              >
                                {tr(lang.label as any) as any}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Certificações & Prémios Gastronómicos */}
                  <div className="pt-5 border-t border-slate-100 space-y-4 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-orange-500" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            Certificações & Prémios Gastronómicos
                          </h3>
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium">
                          {tr("Formações culinárias, diplomas de alta gastronomia e prémios recebidos para aumentar a confiança dos clientes.")}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!isEditing) setIsEditing(true);
                          handleOpenCertModal();
                        }}
                        className="px-3 py-2 bg-orange-500 text-white rounded-xl text-[8.5px] font-extrabold uppercase tracking-wider hover:bg-slate-950 transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0 active:scale-95"
                      >
                        <Plus size={12} />
                        <span>{tr("Adicionar Certificação / Prémio")}</span>
                      </button>
                    </div>

                    {(!editedUser.certifications_and_awards || editedUser.certifications_and_awards.length === 0) ? (
                      <div className="p-5 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-center space-y-2.5">
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-400 mx-auto shadow-sm border border-slate-100">
                          <GraduationCap className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-700">{tr("Nenhuma certificação ou prémio adicionado.")}</p>
                          <p className="text-[10px] text-slate-400 max-w-sm mx-auto">
                            {tr("Adiciona diplomas de escolas gastronómicas, cursos de alta cozinha ou distinções para destacar o teu perfil.")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isEditing) setIsEditing(true);
                            handleOpenCertModal();
                          }}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[8.5px] font-extrabold uppercase tracking-wider hover:bg-slate-100 transition-all shadow-sm"
                        >
                          {tr("+ Adicionar Primeira Certificação")}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {editedUser.certifications_and_awards.map((cert) => {
                          const isAward = cert.type === "award";
                          const isTraining = cert.type === "training";
                          
                          return (
                            <div
                              key={cert.id}
                              className={`p-3.5 rounded-2xl border transition-all space-y-2 text-left relative group ${
                                isAward
                                  ? "bg-amber-50/30 border-amber-200/70 hover:border-amber-300"
                                  : isTraining
                                    ? "bg-emerald-50/30 border-emerald-200/70 hover:border-emerald-300"
                                    : "bg-slate-50/60 border-slate-200/70 hover:border-orange-200"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                                      isAward
                                        ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                                        : isTraining
                                          ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                                          : "bg-slate-900 text-white shadow-sm"
                                    }`}
                                  >
                                    {isAward ? (
                                      <Award size={13} />
                                    ) : isTraining ? (
                                      <GraduationCap size={13} />
                                    ) : (
                                      <ShieldCheck size={13} />
                                    )}
                                  </div>
                                  <div>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[6.5px] font-black uppercase tracking-wider ${
                                        isAward
                                          ? "bg-amber-500/15 text-amber-700"
                                          : isTraining
                                            ? "bg-emerald-500/15 text-emerald-700"
                                            : "bg-slate-200 text-slate-700"
                                      }`}
                                    >
                                      {isAward
                                        ? tr("Prémio / Distinção")
                                        : isTraining
                                          ? tr("Formação Culinária")
                                          : tr("Certificação Oficial")}
                                    </span>
                                    {cert.year && (
                                      <span className="ml-1.5 text-[8px] font-bold text-slate-400">
                                        • {cert.year}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!isEditing) setIsEditing(true);
                                      handleOpenCertModal(cert);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-white rounded-lg transition-all"
                                    title={tr("Editar")}
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!isEditing) setIsEditing(true);
                                      handleRemoveCertItem(cert.id);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                                    title={tr("Remover")}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-[11px] font-bold text-slate-900 leading-snug">
                                  {tr(cert.title as any) as any}
                                </h4>
                                <p className="text-[9px] font-semibold text-slate-500">
                                  {cert.issuer}
                                </p>
                              </div>

                              {cert.description && (
                                <p className="text-[8.5px] text-slate-600 leading-relaxed italic border-l-2 border-orange-400/60 pl-2">
                                  "{tr(cert.description as any) as any}"
                                </p>
                              )}

                              <div className="pt-0.5 flex items-center gap-1 text-[7px] font-bold uppercase text-emerald-600 tracking-wider">
                                <CheckCircle2 size={10} className="text-emerald-500" />
                                <span>{tr("Verificado Cookr")}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Portfolio Gallery (Imagens do Chef) */}
                  <div className="pt-5 border-t border-slate-100 space-y-4 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <ICONS.Camera className="w-4 h-4 text-orange-500" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            {tr("Galeria de Portefólio")}
                          </h3>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {tr("Adicione fotografias dos seus melhores pratos e serviços.")}
                        </p>
                      </div>
                      {isEditing && (
                        <button
                          type="button"
                          disabled={uploading === "portfolio"}
                          onClick={() => portfolioInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors disabled:opacity-60"
                        >
                          <Plus size={12} strokeWidth={3} />
                          <span className="text-[9px] font-black uppercase tracking-wider">{uploading === "portfolio" ? tr("A carregar...") : tr("Adicionar Imagem")}</span>
                          <input
                            type="file"
                            ref={portfolioInputRef}
                            accept="image/*"
                            className="hidden"
                            onClick={(e) => e.stopPropagation()}
                            onChange={handlePortfolioUpload}
                          />
                        </button>
                      )}
                    </div>

                    {!editedUser.portfolio_images || editedUser.portfolio_images.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
                        <p className="text-[10px] text-slate-400 font-medium">{tr("Ainda não adicionou fotografias ao seu portefólio.")}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {editedUser.portfolio_images.map((imgUrl, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200">
                            <img src={imgUrl} alt={`Portefólio ${idx + 1}`} className="w-full h-full object-cover" />
                            {isEditing && (
                              <button
                                onClick={() => {
                                  const filtered = editedUser.portfolio_images!.filter((_, i) => i !== idx);
                                  setEditedUser({ ...editedUser, portfolio_images: filtered });
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FAQ do Chef (Perguntas Frequentes) */}
                  <div className="pt-5 border-t border-slate-100 space-y-4 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-orange-500" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            {tr("Perguntas Frequentes do Chef (FAQ)")}
                          </h3>
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium">
                          {tr("Responda às dúvidas mais comuns sobre o seu modo de trabalho, cuidados com alergias, limpeza e logística para inspirar confiança nos clientes.")}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!isEditing) setIsEditing(true);
                          handleOpenFaqModal();
                        }}
                        className="px-3 py-2 bg-slate-900 text-white rounded-xl text-[8.5px] font-extrabold uppercase tracking-wider hover:bg-orange-500 transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0 active:scale-95"
                      >
                        <Plus size={12} />
                        <span>{tr("Adicionar Pergunta (FAQ)")}</span>
                      </button>
                    </div>

                    {(!editedUser.faqs || editedUser.faqs.length === 0) ? (
                      <div className="p-5 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-400 mx-auto shadow-sm border border-slate-100">
                          <HelpCircle className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-700">{tr("Ainda não configurou as suas Perguntas Frequentes.")}</p>
                          <p className="text-[10px] text-slate-400 max-w-md mx-auto">
                            {tr("Adicionar respostas sobre manuseamento de alergias, limpeza da cozinha e compras de ingredientes aumenta significativamente a confiança e reservas dos clientes.")}
                          </p>
                        </div>

                        {/* Sugestões Rápidas */}
                        <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 max-w-xl mx-auto">
                          <span className="text-[8px] font-extrabold uppercase text-slate-400 w-full mb-1">
                            {tr("Sugestões Rápidas de Perguntas Populares:")}
                          </span>
                          {PRESET_FAQS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (!isEditing) setIsEditing(true);
                                handleApplyPresetFaq(preset);
                                setShowAddFaqModal(true);
                              }}
                              className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-[8.5px] font-bold hover:border-orange-400 hover:text-orange-600 transition-all shadow-2xs flex items-center gap-1"
                            >
                              <Lightbulb size={11} className="text-amber-500" />
                              <span>"{preset.question.slice(0, 36)}..."</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {editedUser.faqs.map((faq) => {
                          const catMap = {
                            alergias: { label: "Alergias & Restrições", bg: "bg-rose-50 text-rose-700 border-rose-200" },
                            logistica: { label: "Logística & Cozinha", bg: "bg-blue-50 text-blue-700 border-blue-200" },
                            ingredientes: { label: "Ingredientes & Qualidade", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                            geral: { label: "Serviço Geral", bg: "bg-slate-100 text-slate-700 border-slate-200" }
                          };
                          const catInfo = catMap[faq.category || 'geral'];

                          return (
                            <div
                              key={faq.id}
                              className="p-3.5 bg-white rounded-2xl border border-slate-200/80 hover:border-orange-200 transition-all space-y-2 text-left relative shadow-2xs"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-wider border ${catInfo.bg}`}>
                                    {tr(catInfo.label as any) as any}
                                  </span>
                                  <h4 className="text-[11.5px] font-extrabold text-slate-900 leading-snug">
                                    {tr(faq.question as any) as any}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!isEditing) setIsEditing(true);
                                      handleOpenFaqModal(faq);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                                    title={tr("Editar")}
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!isEditing) setIsEditing(true);
                                      handleRemoveFaqItem(faq.id);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all"
                                    title={tr("Remover")}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              <p className="text-[10px] font-medium text-slate-600 leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                                {tr(faq.answer as any) as any}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="pt-4 border-t border-slate-50 flex flex-col md:flex-row gap-3">
                      <button
                        onClick={handleCancel}
                        className="flex-1 h-10 bg-slate-50 text-slate-400 rounded-lg font-bold uppercase text-[9px] tracking-wider hover:text-slate-950 transition-all"
                      >
                        {tr("Cancelar")}
                      </button>
                      <button
                        onClick={() => handleSave()}
                        className="flex-[2] h-10 bg-orange-500 text-white rounded-lg font-bold uppercase text-[9px] tracking-wider shadow-md shadow-orange-500/10 hover:bg-slate-950 transition-all"
                      >
                        {tr("Guardar Identidade")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "moradas" && (
                <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-355">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <span className="text-[9px] font-extrabold text-orange-500 uppercase tracking-widest block">
                        Logística & Localização
                      </span>
                      <h2 className="text-xl md:text-2xl font-black text-slate-950 tracking-tight uppercase italic leading-none">
                        {tr("Minhas")} <span className="text-orange-500">{tr("Moradas.")}</span>
                      </h2>
                    </div>
                    <button
                      onClick={() => {
                        if (!isEditing) setIsEditing(true);
                        addAddress();
                      }}
                      className="relative group overflow-hidden px-4 py-2.5 bg-slate-950 text-white rounded-xl flex items-center gap-1.5 shadow-md hover:shadow-[0_10px_20px_-6px_rgba(249,115,22,0.3)] hover:bg-orange-500 transition-all duration-300 active:scale-95"
                    >
                      <ICONS.Plus size={13} className="group-hover:rotate-90 transition-transform duration-300" />
                      <span className="text-[9px] font-black uppercase tracking-widest">{tr("Nova Morada")}</span>
                    </button>
                  </div>

                  <div className="space-y-6">
                    {(editedUser.addresses || []).length === 0 && (
                      <div
                        onClick={() => {
                          if (!isEditing) setIsEditing(true);
                          addAddress();
                        }}
                        className="p-10 border border-dashed border-slate-200/80 rounded-[2rem] text-center space-y-3 cursor-pointer hover:border-orange-500/40 hover:bg-orange-50/[0.015] transition-all group"
                      >
                        <div className="w-12 h-12 bg-slate-50 text-slate-300 group-hover:text-orange-500 group-hover:bg-orange-50 group-hover:border-orange-100 rounded-2xl flex items-center justify-center border border-slate-100 transition-all mx-auto">
                          <ICONS.MapPin size={20} className="transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider group-hover:text-slate-950 transition-colors">
                            {tr("Nenhuma morada registada.")}
                          </p>
                          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                            {tr("Clique aqui para adicionar a sua cozinha base.")}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                      {(editedUser.addresses || []).map((addr) => (
                        <div
                          key={addr.id}
                          className={`p-6 md:p-8 rounded-[2rem] border transition-all relative overflow-hidden group ${
                            addr.isDefault 
                              ? "bg-gradient-to-br from-white to-orange-500/[0.012] border-orange-500/25 shadow-[0_15px_40px_-15px_rgba(249,115,22,0.06)] hover:border-orange-500/40" 
                              : "bg-white border-slate-200/60 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.015)] hover:border-slate-300 hover:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.03)]"
                          } duration-500`}
                        >
                          {addr.isDefault && (
                            <div className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 text-orange-600 border border-orange-200/40 text-[9px] font-extrabold uppercase rounded-full tracking-wider shadow-inner">
                              <ICONS.Sparkles size={10} className="text-orange-500 shrink-0 animate-pulse" />
                              <span>{tr("Morada Ativa")}</span>
                            </div>
                          )}

                          <div className="flex flex-col gap-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="flex items-center gap-4 flex-1 w-full">
                                <div
                                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0 ${
                                    addr.isDefault 
                                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                                      : "bg-slate-50 text-slate-400 border border-slate-100"
                                  }`}
                                >
                                  <ICONS.Home size={16} />
                                </div>
                                <div className="space-y-0.5 flex-1 min-w-0">
                                  <input
                                    disabled={!isEditing}
                                    className="bg-transparent font-extrabold text-lg text-slate-950 outline-none w-full focus:text-orange-500 border-b border-transparent focus:border-slate-150 transition-all truncate pb-0.5 disabled:opacity-100"
                                    value={addr.label}
                                    onChange={(e) =>
                                      updateAddressField(
                                        addr.id!,
                                        "label",
                                        e.target.value,
                                      )
                                    }
                                    placeholder={tr("Ex: Cozinha Principal")}
                                  />
                                  <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">
                                    {tr("Etiqueta da Morada")}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                                {!addr.isDefault && isEditing && (
                                  <button
                                    onClick={() => setPrimaryAddress(addr.id!)}
                                    className="flex-1 md:flex-none px-4 py-2 bg-slate-950 hover:bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1 inline-flex"
                                  >
                                    <ICONS.Sparkles size={10} className="text-orange-400" />
                                    <span>{tr("Definir Ativa")}</span>
                                  </button>
                                )}
                                {isEditing && (
                                  <button
                                    onClick={() => removeAddress(addr.id!)}
                                    className="w-10 h-10 bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all duration-300 shadow-xs active:scale-90"
                                    title={tr("Remover Morada")}
                                  >
                                    <ICONS.Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                              <div className="md:col-span-8 space-y-1.5 overflow-visible">
                                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">
                                  {tr("Rua / Avenida")}
                                </label>
                                <div className="relative group/input flex items-center">
                                  <ICONS.MapPin
                                    className="absolute left-3.5 text-slate-300 group-focus-within/input:text-orange-500 transition-all pointer-events-none"
                                    size={13}
                                  />
                                  <input
                                    disabled={!isEditing}
                                    className="w-full h-11 pl-10 pr-4 bg-slate-50/40 hover:bg-slate-50 rounded-xl font-semibold text-xs outline-none border border-slate-200/55 focus:border-orange-500/60 focus:bg-white transition-all shadow-inner disabled:opacity-50"
                                    value={addr.address}
                                    onChange={(e) =>
                                      updateAddressField(
                                        addr.id!,
                                        "address",
                                        e.target.value,
                                      )
                                    }
                                    placeholder={tr("Nome da rua, hangar ou avenida...")}
                                  />
                                </div>
                              </div>

                              <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">
                                  Nº
                                </label>
                                <div className="relative group/input">
                                  <input
                                    disabled={!isEditing}
                                    className="w-full h-11 px-3 bg-slate-50/40 hover:bg-slate-50 rounded-xl font-semibold text-xs outline-none border border-slate-200/55 focus:border-orange-500/60 focus:bg-white transition-all shadow-inner text-center disabled:opacity-50"
                                    value={addr.door_number}
                                    onChange={(e) =>
                                      updateAddressField(
                                        addr.id!,
                                        "door_number",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="123"
                                  />
                                </div>
                              </div>

                              <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">
                                  {tr("Andar")}
                                </label>
                                <div className="relative group/input">
                                  <input
                                    disabled={!isEditing}
                                    className="w-full h-11 px-3 bg-slate-50/40 hover:bg-slate-50 rounded-xl font-semibold text-xs outline-none border border-slate-200/55 focus:border-orange-500/60 focus:bg-white transition-all shadow-inner text-center disabled:opacity-50"
                                    value={addr.floor}
                                    onChange={(e) =>
                                      updateAddressField(
                                        addr.id!,
                                        "floor",
                                        e.target.value,
                                      )
                                    }
                                    placeholder={tr("2º Esq")}
                                  />
                                </div>
                              </div>

                              <div className="md:col-span-4 space-y-1.5">
                                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">
                                  {tr("Código Postal")}
                                </label>
                                <div className="relative group/input">
                                  <input
                                    disabled={!isEditing}
                                    className="w-full h-11 px-3 bg-slate-50/40 hover:bg-slate-50 rounded-xl font-semibold text-xs outline-none border border-slate-200/55 focus:border-orange-500/60 focus:bg-white transition-all shadow-inner disabled:opacity-50"
                                    value={addr.zip_code}
                                    onChange={(e) =>
                                      updateAddressField(
                                        addr.id!,
                                        "zip_code",
                                        formatZipCode(e.target.value),
                                      )
                                    }
                                    placeholder="0000-000"
                                    maxLength={8}
                                  />
                                </div>
                              </div>

                              <div className="md:col-span-8 space-y-1.5">
                                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">
                                  {tr("Cidade / Distrito")}
                                </label>
                                <div className="relative group/select">
                                  <select
                                    disabled={!isEditing}
                                    className="w-full h-11 px-4 bg-slate-50/40 hover:bg-slate-50 rounded-xl font-semibold text-xs outline-none border border-slate-200/55 focus:border-orange-500/60 focus:bg-white transition-all shadow-inner appearance-none cursor-pointer disabled:opacity-50"
                                    value={addr.city}
                                    onChange={(e) =>
                                      updateAddressField(
                                        addr.id!,
                                        "city",
                                        e.target.value,
                                      )
                                    }
                                  >
                                    {PORTUGAL_CITIES.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                  <ICONS.ChevronDown
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within/select:rotate-180 transition-transform"
                                    size={15}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-3">
                      <button
                        onClick={handleCancel}
                        className="flex-1 h-12 bg-slate-50 text-slate-400 rounded-xl font-bold uppercase text-[9px] tracking-wider hover:text-slate-950 hover:bg-slate-100/65 transition-all"
                      >
                        {tr("Cancelar")}
                      </button>
                      <button
                        onClick={() => handleSave()}
                        disabled={isSaving}
                        className="flex-[2] h-12 relative group overflow-hidden bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 transition-all duration-300 shadow-md hover:shadow-[0_10px_20px_-6px_rgba(249,115,22,0.3)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <ICONS.RefreshCw className="animate-spin text-orange-400" size={14} />
                            <span>{tr("A Guardar...")}</span>
                          </>
                        ) : (
                          <>
                            <ICONS.MapPin size={14} className="text-orange-400 group-hover:text-white transition-colors" />
                            <span>{tr("Gravar Moradas")}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "profissional" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-355">
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-bold text-orange-500 uppercase tracking-widest block">
                      Rigor & Equipamento
                    </span>
                    <h2 className="text-xl md:text-2xl font-extrabold text-slate-950 tracking-tight uppercase leading-none">
                      {tr("Dados")} <span className="text-orange-500">{tr("Técnicos.")}</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                        {tr("Equipamento Profissional")}
                      </label>
                      <div className="grid grid-cols-1 gap-1.55">
                        {[
                          {
                            id: "facas",
                            label: "Facas Próprias",
                            icon: <ICONS.Zap size={11} />,
                          },
                          {
                            id: "fardamento",
                            label: "Fardamento Completo",
                            icon: <ICONS.ShieldCheck size={11} />,
                          },
                          {
                            id: "pequenos_electro",
                            label: "Pequenos Eletrodomésticos",
                            icon: <ICONS.RefreshCw size={11} />,
                          },
                          {
                            id: "transporte",
                            label: "Transporte Próprio",
                            icon: <ICONS.MapPin size={11} />,
                          },
                          {
                            id: "termometro",
                            label: "Termómetro Digital",
                            icon: <ICONS.Target size={11} />,
                          },
                          {
                            id: "balanca",
                            label: "Balança de Precisão",
                            icon: <ICONS.Zap size={11} />,
                          },
                        ].map((item) => {
                          const isSelected = editedUser.equipamento?.includes(
                            item.id,
                          );
                          return (
                            <button
                              key={item.id}
                              disabled={!isEditing}
                              onClick={() => toggleItem("equipamento", item.id)}
                              className={`h-9.5 px-3 rounded-xl flex items-center gap-3 font-semibold text-[8.5px] uppercase tracking-wider transition-all border ${isSelected ? "bg-slate-950 text-white border-slate-950 shadow-sm" : "bg-slate-50 text-slate-400 border-transparent hover:border-slate-100"}`}
                            >
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center ${isSelected ? "bg-orange-500 text-white" : "bg-white text-slate-300"}`}
                              >
                                {item.icon}
                              </div>
                              {tr(item.label as any) as any}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                        {tr("Diferenciais de Serviço")}
                      </label>
                      <div className="grid grid-cols-1 gap-1.55">
                        {[
                          {
                            id: "loiça",
                            label: "Loiça Própria",
                            icon: <ICONS.Utensils size={11} />,
                          },
                          {
                            id: "limpeza",
                            label: "Limpeza Incluída",
                            icon: <ICONS.Sparkles size={11} />,
                          },
                          {
                            id: "apoio",
                            label: "Apoio de Mesa",
                            icon: <ICONS.Users size={11} />,
                          },
                          {
                            id: "vinho",
                            label: "Harmonização de Vinhos",
                            icon: <ICONS.Gift size={11} />,
                          },
                        ].map((item) => {
                          const isSelected = editedUser.diferenciais?.includes(
                            item.id,
                          );
                          return (
                            <button
                              key={item.id}
                              disabled={!isEditing}
                              onClick={() =>
                                toggleItem("diferenciais", item.id)
                              }
                              className={`h-9.5 px-3 rounded-xl flex items-center gap-3 font-semibold text-[8.5px] uppercase tracking-wider transition-all border ${isSelected ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-slate-50 text-slate-400 border-transparent hover:border-slate-100"}`}
                            >
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center ${isSelected ? "bg-white text-orange-500" : "bg-white text-slate-300"}`}
                              >
                                {item.icon}
                              </div>
                              {tr(item.label as any) as any}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Sommelier & Wine Pairing Highlight Section */}
                  <div className="bg-orange-50/25 border border-orange-100 rounded-xl p-4 md:p-5 space-y-3.5 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center text-white shadow-sm shadow-orange-500/20">
                            <ICONS.Wine size={14} className="animate-pulse" />
                          </div>
                          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-900">
                            {t("wine_pairing_title")}
                          </h4>
                          <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-600 text-[6.5px] font-extrabold uppercase tracking-wider rounded">
                            {tr("Premium")}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-medium max-w-xl leading-relaxed">
                          {t("wine_pairing_desc")}
                        </p>
                      </div>
                      
                      <button
                        type="button"
                        disabled={!isEditing}
                        onClick={toggleWinePairing}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all border shrink-0 ${
                          (editedUser.offers_wine_pairing || editedUser.diferenciais?.includes("vinho"))
                            ? "bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/10"
                            : "bg-white text-slate-700 border-slate-200 hover:border-orange-300 disabled:opacity-50"
                        }`}
                      >
                        {(editedUser.offers_wine_pairing || editedUser.diferenciais?.includes("vinho")) ? t("wine_service_active") : t("wine_service_activate")}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1.5 border-t border-orange-100/50">
                      {[
                        { title: t("wine_benefit_1_title"), desc: t("wine_benefit_1_desc") },
                        { title: t("wine_benefit_2_title"), desc: t("wine_benefit_2_desc") },
                        { title: t("wine_benefit_3_title"), desc: t("wine_benefit_3_desc") }
                      ].map((benefit, idx) => (
                        <div key={idx} className="bg-white/60 border border-slate-100 rounded-lg p-2.5 space-y-1">
                          <p className="text-[8px] font-black text-orange-600 uppercase tracking-tight">
                            {tr(benefit.title as any) as any}
                          </p>
                          <p className="text-[7.5px] text-slate-500 font-medium leading-snug">
                            {tr(benefit.desc as any) as any}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 md:p-5 bg-slate-950 rounded-xl space-y-4">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white shadow">
                        <ICONS.FileText size={15} />
                      </div>
                      <h4 className="text-[8.5px] font-bold text-white uppercase tracking-wider">
                        Informação Fiscal & Faturação
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-35">
                      <div className="space-y-1 text-left">
                        <label className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                          {tr("NIF")}
                        </label>
                        <input
                          disabled={!isEditing}
                          className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white font-medium text-xs outline-none focus:border-orange-500 transition-all disabled:opacity-50"
                          value={editedUser.nif || ""}
                          onChange={(e) =>
                            setEditedUser({
                              ...editedUser,
                              nif: e.target.value,
                            })
                          }
                          placeholder={tr("Teu Número de Contribuinte")}
                        />
                      </div>
                      <div className="space-y-1 text-left">
                        <label className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                          {tr("Nome Fiscal")}
                        </label>
                        <input
                          disabled={!isEditing}
                          className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white font-medium text-xs outline-none focus:border-orange-500 transition-all disabled:opacity-50"
                          value={editedUser.fiscal_name || ""}
                          onChange={(e) =>
                            setEditedUser({
                              ...editedUser,
                              fiscal_name: e.target.value,
                            })
                          }
                          placeholder={tr("Nome Completo para Faturas")}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-white/5">
                      <label className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider ml-1 block text-left">
                        {tr("Morada de Faturação Detalhada")}
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <input
                            disabled={!isEditing}
                            className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white font-medium text-xs outline-none focus:border-orange-500 transition-all disabled:opacity-50"
                            value={editedUser.billing_street || ""}
                            onChange={(e) =>
                              setEditedUser({
                                ...editedUser,
                                billing_street: e.target.value,
                              })
                            }
                            placeholder={tr("Rua / Avenida")}
                          />
                        </div>
                        <div>
                          <input
                            disabled={!isEditing}
                            className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white font-medium text-xs outline-none focus:border-orange-500 transition-all disabled:opacity-50 text-center"
                            value={editedUser.billing_number || ""}
                            onChange={(e) =>
                              setEditedUser({
                                ...editedUser,
                                billing_number: e.target.value,
                              })
                            }
                            placeholder="Nº"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <input
                            disabled={!isEditing}
                            className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white font-medium text-xs outline-none focus:border-orange-500 transition-all disabled:opacity-50 text-center"
                            value={editedUser.billing_floor || ""}
                            onChange={(e) =>
                              setEditedUser({
                                ...editedUser,
                                billing_floor: e.target.value,
                              })
                            }
                            placeholder={tr("Andar")}
                          />
                        </div>
                        <div>
                          <input
                            disabled={!isEditing}
                            className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white font-medium text-xs outline-none focus:border-orange-500 transition-all disabled:opacity-50 text-center"
                            value={editedUser.billing_zip || ""}
                            onChange={(e) =>
                              setEditedUser({
                                ...editedUser,
                                billing_zip: formatZipCode(e.target.value),
                              })
                            }
                            placeholder={tr("Cód. Postal")}
                            maxLength={8}
                          />
                        </div>
                        <div className="relative">
                          <select
                            disabled={!isEditing}
                            className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white font-medium text-xs outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
                            value={editedUser.billing_city || ""}
                            onChange={(e) =>
                              setEditedUser({
                                ...editedUser,
                                billing_city: e.target.value,
                              })
                            }
                          >
                            <option value="">{tr("Cidade")}</option>
                            {PORTUGAL_CITIES.map((c) => (
                              <option
                                key={c}
                                value={c}
                                className="text-slate-950"
                              >
                                {c}
                              </option>
                            ))}
                          </select>
                          <ICONS.ChevronDown
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none"
                            size={12}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-3 border-t border-white/5 text-left">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-[8.5px] font-bold text-white uppercase tracking-wider">
                            {tr("Certificação HACCP")}
                          </h5>
                          <p className="text-[7.5px] text-slate-500 italic">
                            {tr("Obrigatório para curadoria premium.")}
                          </p>
                        </div>
                        <div className="flex bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 items-center gap-1">
                          <ICONS.ShieldCheck
                            size={10}
                            className="text-emerald-500"
                          />
                          <span className="text-[7px] font-bold uppercase text-emerald-500 tracking-wider italic">
                            {tr("Válido")}
                          </span>
                        </div>
                      </div>
                      <button
                        disabled={!isEditing}
                        className="w-full h-10 border-2 border-dashed border-white/5 rounded-lg flex items-center justify-center gap-2 text-[8px] font-bold uppercase tracking-wider text-slate-500 hover:border-orange-500 hover:text-white transition-all disabled:opacity-30"
                      >
                        <ICONS.Camera size={12} />
                        {tr("Atualizar Certificado")}
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="pt-4 border-t border-white/5 flex flex-col md:flex-row gap-3">
                      <button
                        onClick={handleCancel}
                        className="flex-1 h-12 bg-white/5 text-slate-400 rounded-lg font-bold uppercase text-[9px] tracking-wider hover:text-white transition-all"
                      >
                        {tr("Cancelar")}
                      </button>
                      <button
                        onClick={() => handleSave()}
                        className="flex-[2] h-12 bg-orange-500 text-white rounded-lg font-bold uppercase text-[9px] tracking-wider shadow-lg shadow-orange-500/10 hover:bg-slate-950 transition-all"
                      >
                        {tr("Guardar Dados Técnicos")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "sustentabilidade" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-355 text-left">
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-bold text-emerald-600 uppercase tracking-widest block">
                      Compromisso Ambiental & Segurança Alimentar
                    </span>
                    <h2 className="text-xl md:text-2xl font-extrabold text-slate-950 tracking-tight uppercase leading-none">
                      Sustentabilidade & <span className="text-emerald-600">{tr("Alergénios.")}</span>
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      {tr("Destaque o seu apoio a produtores locais, peixe sustentável, desperdício zero e a garantia de cozinhas preparadas sem contaminação cruzada.")}
                    </p>
                  </div>

                  {/* Section 1: Sustentabilidade & Origem dos Ingredientes */}
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-emerald-100/80 pb-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                        <Leaf size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Distintivos de Sustentabilidade & Origem
                        </h3>
                        <p className="text-[9.5px] text-slate-500 font-medium">
                          {tr("Selo Farm-to-Table, Peixe Sustentável, Ingredientes Biológicos e Zero Waste")}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {SUSTAINABILITY_BADGES_LIST.map((badge) => {
                        const isSelected = editedUser.sustainability_badges?.includes(badge.id);
                        const langLabel = badge.label[(user.language as any) || "pt"] || badge.label.pt;
                        const langDesc = badge.description[(user.language as any) || "pt"] || badge.description.pt;

                        return (
                          <div
                            key={badge.id}
                            onClick={() => {
                              if (!isEditing) return;
                              const current = editedUser.sustainability_badges || [];
                              const updated = current.includes(badge.id)
                                ? current.filter((id) => id !== badge.id)
                                : [...current, badge.id];
                              setEditedUser({ ...editedUser, sustainability_badges: updated });
                            }}
                            className={`p-3.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? "bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                                : "bg-white/70 border-slate-200/80 hover:border-emerald-300 opacity-75 hover:opacity-100"
                            } ${isEditing ? "cursor-pointer hover:scale-[1.01]" : "cursor-default"}`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{badge.icon}</span>
                                <span className="text-[10.5px] font-extrabold text-slate-900 uppercase tracking-wide">
                                  {langLabel}
                                </span>
                              </div>
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-black ${
                                  isSelected
                                    ? "bg-emerald-500 text-white border-emerald-500"
                                    : "bg-slate-100 text-transparent border-slate-300"
                                }`}
                              >
                                ✓
                              </div>
                            </div>
                            <p className="text-[8.5px] text-slate-500 font-medium leading-relaxed">
                              {langDesc}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Sustainability Notes Textarea */}
                    <div className="space-y-1.5 pt-2">
                      <label className="text-[8px] font-extrabold text-slate-600 uppercase tracking-wider block">
                        Detalhe dos Mercados Locais & Práticas de Desperdício Zero (Zero Waste)
                      </label>
                      <textarea
                        disabled={!isEditing}
                        value={editedUser.sustainability_notes || ""}
                        onChange={(e) =>
                          setEditedUser({ ...editedUser, sustainability_notes: e.target.value })
                        }
                        placeholder={tr("Ex: Compro o peixe fresco diretamente na Lota e legumes biológicos em produtores locais. Práticas de aproveitamento integral (Zero Waste) e embalagens 100% compostáveis.")}
                        className="w-full p-3 bg-white border border-emerald-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 min-h-[80px] disabled:opacity-60 transition-all"
                      />
                    </div>
                  </div>

                  {/* Section 2: Gestão de Alergénios e Dietas Especiais */}
                  <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-amber-100/80 pb-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                        <ShieldCheck size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Gestão de Alergénios & Cozinha Segura (Sem Contaminação Cruzada)
                        </h3>
                        <p className="text-[9.5px] text-slate-500 font-medium">
                          {tr("Preparação com isolamento de tábuas, desinfeção e protocolos para Celíacos, Vegan, Kosher, Halal e Alergias.")}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ALLERGEN_CERTIFICATIONS_LIST.map((cert) => {
                        const isSelected = editedUser.allergen_certifications?.includes(cert.id);
                        const langLabel = cert.label[(user.language as any) || "pt"] || cert.label.pt;
                        const langDesc = cert.description[(user.language as any) || "pt"] || cert.description.pt;

                        return (
                          <div
                            key={cert.id}
                            onClick={() => {
                              if (!isEditing) return;
                              const current = editedUser.allergen_certifications || [];
                              const updated = current.includes(cert.id)
                                ? current.filter((id) => id !== cert.id)
                                : [...current, cert.id];
                              setEditedUser({ ...editedUser, allergen_certifications: updated });
                            }}
                            className={`p-3.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? "bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
                                : "bg-white/70 border-slate-200/80 hover:border-amber-300 opacity-75 hover:opacity-100"
                            } ${isEditing ? "cursor-pointer hover:scale-[1.01]" : "cursor-default"}`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{cert.icon}</span>
                                <span className="text-[10.5px] font-extrabold text-slate-900 uppercase tracking-wide">
                                  {langLabel}
                                </span>
                              </div>
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-black ${
                                  isSelected
                                    ? "bg-amber-500 text-white border-amber-500"
                                    : "bg-slate-100 text-transparent border-slate-300"
                                }`}
                              >
                                ✓
                              </div>
                            </div>
                            <p className="text-[8.5px] text-slate-500 font-medium leading-relaxed">
                              {langDesc}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Allergen Protocol Notes Textarea */}
                    <div className="space-y-1.5 pt-2">
                      <label className="text-[8px] font-extrabold text-slate-600 uppercase tracking-wider block">
                        Protocolo de Segurança Alimentar & Prevenção de Contaminação Cruzada
                      </label>
                      <textarea
                        disabled={!isEditing}
                        value={editedUser.allergen_notes || ""}
                        onChange={(e) =>
                          setEditedUser({ ...editedUser, allergen_notes: e.target.value })
                        }
                        placeholder={tr("Ex: Conjuntos de tábuas e utensílios esterilizados e separados por cor. Protocolo rigoroso de higienização prévia para doentes celíacos e alérgicos graves.")}
                        className="w-full p-3 bg-white border border-amber-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 min-h-[80px] disabled:opacity-60 transition-all"
                      />
                    </div>
                  </div>

                  {/* Save/Cancel bar */}
                  {isEditing ? (
                    <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-3">
                      <button
                        onClick={handleCancel}
                        className="flex-1 h-12 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-[9px] tracking-wider hover:bg-slate-200 transition-all"
                      >
                        {tr("Cancelar")}
                      </button>
                      <button
                        onClick={() => handleSave()}
                        className="flex-[2] h-12 bg-emerald-600 text-white rounded-xl font-bold uppercase text-[9px] tracking-wider shadow-lg shadow-emerald-600/10 hover:bg-slate-950 transition-all"
                      >
                        Guardar Selos & Segurança
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full py-3.5 bg-slate-950 text-white rounded-xl font-bold uppercase text-[9px] tracking-wider hover:bg-orange-500 transition-all flex items-center justify-center gap-2"
                    >
                      <Edit3 size={13} />
                      <span>Editar Selos & Protocolos</span>
                    </button>
                  )}
                </div>
              )}

              {activeTab === "avaliacoes" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-355 text-left">
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-bold text-orange-500 uppercase tracking-widest block">
                      {tr("Feedback de Clientes")}
                    </span>
                    <h2 className="text-xl md:text-2xl font-extrabold text-slate-950 tracking-tight uppercase leading-none">
                      Avaliações & <span className="text-orange-500">{tr("Opiniões.")}</span>
                    </h2>
                  </div>

                  {loadingReviews ? (
                    <div className="py-12 text-center text-slate-400 font-medium text-xs">
                      {tr("A carregar avaliações...")}
                    </div>
                  ) : reviewsList.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {reviewsList.map((rev) => (
                        <div
                          key={rev.id}
                          className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-xs text-slate-600">
                                {rev.clientName ? rev.clientName.charAt(0).toUpperCase() : "C"}
                              </div>
                              <div>
                                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">{rev.clientName || tr("Cliente Cookr")}</h4>
                                <p className="text-[7.5px] text-zinc-400 font-bold uppercase tracking-wider">
                                  {rev.created_at ? new Date(rev.created_at).toLocaleDateString(trLocale()) : tr("Recentemente")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 bg-amber-50 text-amber-500 border border-amber-100 px-2.5 py-1 rounded-lg text-[9px] font-bold">
                              <ICONS.Star size={10} fill="currentColor" />
                              <span>{rev.rating ? rev.rating.toFixed(1) : "5.0"}</span>
                            </div>
                          </div>

                          {rev.comment ? (
                            <p className="text-xs text-slate-600 font-medium leading-relaxed italic bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                              "{rev.comment}"
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic font-semibold">{tr("Sem comentário adicional.")}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-100/80 flex flex-col items-center justify-center gap-4 px-6 max-w-sm mx-auto">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-300 border border-slate-100 shadow-sm">
                        <ICONS.Star size={20} className="text-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">{tr("Ainda Sem Opiniões")}</h4>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {tr("Ainda não recebeu nenhuma avaliação dos seus clientes até ao momento.")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isEditing && (
                <div className="pt-6 border-t border-slate-50 flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="flex-1 h-10 bg-slate-50 text-slate-400 rounded-lg font-bold uppercase text-[9px] tracking-wider hover:text-slate-950 transition-all"
                  >
                    {tr("Cancelar")}
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-[2] h-10 bg-orange-500 text-white rounded-lg font-bold uppercase text-[9px] tracking-wider shadow-md shadow-orange-500/10 hover:bg-slate-950 transition-all"
                  >
                    {tr("Guardar Alterações")}
                  </button>
                </div>
              )}

              {/* Legal & Support Links */}
              <div className="pt-6 border-t border-slate-50 flex flex-wrap justify-center gap-x-8 gap-y-4">
                <button
                  onClick={() => onNavigate("privacy")}
                  className="group flex items-center gap-2 text-slate-400 hover:text-slate-950 transition-colors"
                >
                  <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                    <ICONS.Shield size={12} />
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-wider">
                    {tr("Privacidade")}
                  </span>
                </button>
                <button
                  onClick={() => onNavigate("terms")}
                  className="group flex items-center gap-2 text-slate-400 hover:text-slate-950 transition-colors"
                >
                  <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                    <ICONS.FileText size={12} />
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-wider">
                    {tr("Termos")}
                  </span>
                </button>
                <button
                  onClick={() => onNavigate("help")}
                  className="group flex items-center gap-2 text-slate-400 hover:text-slate-950 transition-colors"
                >
                  <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                    <ICONS.HelpCircle size={12} />
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-wider">
                    {tr("Ajuda")}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Adicionar / Editar Certificação ou Prémio */}
      {showAddCertModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 text-left relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAddCertModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-2 rounded-full hover:bg-slate-100 transition-all"
            >
              <X size={16} />
            </button>

            <div className="space-y-1 pr-6">
              <span className="text-[8.5px] font-bold text-orange-500 uppercase tracking-widest block">
                {editingCertId ? tr("Editar Distinção") : tr("Nova Distinção Culinária")}
              </span>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                {editingCertId ? tr("Atualizar Certificação / Prémio") : tr("Adicionar Certificação / Prémio")}
              </h3>
            </div>

            <div className="space-y-4">
              {/* Tipo */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                  {tr("Tipo de Reconhecimento *")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "certification", label: "Certificação", icon: <ShieldCheck size={12} /> },
                    { id: "award", label: "Prémio / Troféu", icon: <Award size={12} /> },
                    { id: "training", label: "Formação", icon: <GraduationCap size={12} /> }
                  ].map((t) => {
                    const isSel = certForm.type === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSwitchCertType(t.id as any)}
                        className={`h-9 px-2.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all ${
                          isSel
                            ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {t.icon}
                        <span>{tr(t.label as any) as any}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Título */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                  {certForm.type === "certification"
                    ? tr("Título da Certificação *")
                    : certForm.type === "award"
                    ? tr("Título do Prémio / Troféu *")
                    : tr("Título da Formação / Curso *")}
                </label>
                <input
                  type="text"
                  value={certForm.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCertForm((prev) => ({ ...prev, title: val }));
                    setCertSectionForms((prev) => ({
                      ...prev,
                      [certForm.type]: { ...(prev[certForm.type] || {}), title: val },
                    }));
                  }}
                  placeholder={
                    certForm.type === "certification"
                      ? tr("ex: HACCP, Higiene e Segurança Alimentar")
                      : certForm.type === "award"
                      ? tr("ex: Prémio Chef Revelação 2024, Garfo de Ouro")
                      : tr("ex: Diplôme de Cuisine, Curso de Pastelaria Francesa")
                  }
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all"
                />
              </div>

              {/* Entidade Emissora & Ano */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                    {certForm.type === "certification"
                      ? tr("Entidade Certificadora *")
                      : certForm.type === "award"
                      ? tr("Entidade Atribuidora / Concurso *")
                      : tr("Escola / Instituição de Ensino *")}
                  </label>
                  <input
                    type="text"
                    value={certForm.issuer}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCertForm((prev) => ({ ...prev, issuer: val }));
                      setCertSectionForms((prev) => ({
                        ...prev,
                        [certForm.type]: { ...(prev[certForm.type] || {}), issuer: val },
                      }));
                    }}
                    placeholder={
                      certForm.type === "certification"
                        ? tr("ex: ASAE, DGS, SGS, Bureau Veritas")
                        : certForm.type === "award"
                        ? tr("ex: Guia Michelin, Prémio Nacional de Gastronomia")
                        : tr("ex: Le Cordon Bleu Lisboa, Escola de Hotelaria")
                    }
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                    {tr("Ano")}
                  </label>
                  <input
                    type="text"
                    value={certForm.year}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCertForm((prev) => ({ ...prev, year: val }));
                      setCertSectionForms((prev) => ({
                        ...prev,
                        [certForm.type]: { ...(prev[certForm.type] || {}), year: val },
                      }));
                    }}
                    placeholder={tr("ex: 2024")}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-800 text-center outline-none focus:border-orange-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                  {tr("Descrição ou Detalhes Relevantes (Opcional)")}
                </label>
                <textarea
                  rows={3}
                  value={certForm.description}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCertForm((prev) => ({ ...prev, description: val }));
                    setCertSectionForms((prev) => ({
                      ...prev,
                      [certForm.type]: { ...(prev[certForm.type] || {}), description: val },
                    }));
                  }}
                  placeholder={
                    certForm.type === "certification"
                      ? tr("ex: Certificação em boas práticas de higiene e segurança no manuseamento alimentar.")
                      : certForm.type === "award"
                      ? tr("ex: 1º Lugar na categoria de Cozinha Criativa e Sustentável.")
                      : tr("ex: Especialização em artes culinárias e técnicas de haute gastronomie.")
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddCertModal(false)}
                className="flex-1 h-11 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-[9.5px] tracking-wider hover:bg-slate-200 transition-all"
              >
                {tr("Cancelar")}
              </button>
              <button
                type="button"
                onClick={handleSaveCertItem}
                className="flex-[2] h-11 bg-orange-500 text-white rounded-xl font-bold uppercase text-[9.5px] tracking-wider shadow-lg shadow-orange-500/20 hover:bg-slate-950 transition-all"
              >
                {editingCertId ? tr("Guardar Alterações") : tr("Adicionar ao Perfil")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar / Editar FAQ do Chef */}
      {showAddFaqModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 text-left relative animate-in zoom-in-95 duration-200 max-h-[90dvh] overflow-y-auto">
            <button
              onClick={() => setShowAddFaqModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-2 rounded-full hover:bg-slate-100 transition-all"
            >
              <X size={16} />
            </button>

            <div className="space-y-1 pr-6">
              <span className="text-[8.5px] font-bold text-orange-500 uppercase tracking-widest block">
                {editingFaqId ? tr("Editar Resposta FAQ") : tr("Nova Pergunta Frequente")}
              </span>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                {editingFaqId ? tr("Atualizar Pergunta do Chef") : tr("Adicionar FAQ ao Perfil")}
              </h3>
            </div>

            <div className="space-y-4">
              {/* Categoria */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                  {tr("Categoria da Pergunta *")}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "alergias", label: "Alergias" },
                    { id: "logistica", label: "Logística" },
                    { id: "ingredientes", label: "Ingredientes" },
                    { id: "geral", label: "Geral" }
                  ].map((c) => {
                    const isSel = faqForm.category === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFaqForm({ ...faqForm, category: c.id as any })}
                        className={`h-8 px-2 rounded-xl text-[8px] font-extrabold uppercase tracking-wider border transition-all ${
                          isSel
                            ? "bg-orange-500 text-white border-orange-500 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {tr(c.label as any) as any}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sugestões de Perguntas Prontas */}
              {!editingFaqId && (
                <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-900">
                    <Lightbulb size={13} className="text-amber-600 shrink-0" />
                    <span className="text-[9px] font-extrabold uppercase tracking-wider">
                      {tr("Modelos de Perguntas Recomendadas:")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {PRESET_FAQS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyPresetFaq(preset)}
                        className="text-left px-2 py-1 bg-white hover:bg-amber-100/60 border border-amber-200 rounded-lg text-[8px] font-bold text-slate-800 transition-all shadow-2xs"
                      >
                        "{tr(preset.question as any) as any}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pergunta */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                  {tr("Pergunta Frequente *")}
                </label>
                <input
                  type="text"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                  placeholder={tr("ex: Como lida com alergias alimentares graves ou intolêrancias?")}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all"
                />
              </div>

              {/* Resposta */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                  {tr("Sua Resposta do Chef *")}
                </label>
                <textarea
                  rows={4}
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                  placeholder={tr("Explique detalhadamente como procede na preparação, quais os cuidados prestados e o que os clientes podem esperar...")}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddFaqModal(false)}
                className="flex-1 h-11 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-[9.5px] tracking-wider hover:bg-slate-200 transition-all"
              >
                {tr("Cancelar")}
              </button>
              <button
                type="button"
                onClick={handleSaveFaqItem}
                className="flex-[2] h-11 bg-orange-500 text-white rounded-xl font-bold uppercase text-[9.5px] tracking-wider shadow-lg shadow-orange-500/20 hover:bg-slate-950 transition-all"
              >
                {editingFaqId ? tr("Guardar Resposta") : tr("Adicionar Pergunta")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CookProfile);
