import { supabaseService } from "../services/supabaseService";
import React, { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  Star,
  Award,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  CheckCircle2,
  Image as ImageIcon,
  Clock,
  Flame,
  Info,
  ChevronDown,
  ChevronUp,
  Utensils,
  Check,
} from "lucide-react";
import { User } from "../types";
import { supabase } from "../lib/supabaseClient";

import { tr } from "../lib/tr";
import { useLanguage } from "../contexts/LanguageContext";
export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  chefId: string;
  chefName: string;
  chefAvatar?: string;
  dishTitle: string;
  description: string;
  photoUrl: string;
  courseType: string;
  prepTime?: string;
  allergens?: string[];
  pairingNotes?: string;
  submittedAt: string;
  status: "in_review" | "approved" | "winner";
}

export interface CookrChallenge {
  id: string;
  badge: string;
  themeTitle: string;
  shortDescription: string;
  prize: string;
  prizeDetails: string;
  deadlineText: string;
  categoryTag: string;
  coverImage: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  participantsCount: number;
  rules: string[];
  criteria: { label: string; weight: number; desc: string }[];
  suggestedIngredients: string[];
}

const CHALLENGES_DATA: CookrChallenge[] = [
  {
    id: "outono-castanhas-2026",
    badge: "DESAFIO DO MÊS",
    themeTitle: "Desafio de Outono: Cria um prato inovador com castanhas",
    shortDescription:
      "Inova com ingredientes da época e ganha destaque especial na página inicial dos clientes este mês.",
    prize: "Prémio: Badge de Destaque + 1ª Página na Categoria",
    prizeDetails:
      "Selo exclusivo 'Chef Inovador de Outono' no teu perfil, posicionamento no topo da categoria por 30 dias e inclusão na newsletter VIP enviada a clientes frequentes.",
    deadlineText: "Termina a 30 de Novembro (Restam 12 dias)",
    categoryTag: "Sazonalidade & Outono",
    coverImage:
      "https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&q=80&w=800",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/30",
    accentText: "text-amber-700",
    participantsCount: 19,
    suggestedIngredients: [
      "Castanhas Transmontanas",
      "Cogumelos Selvagens / Boletus",
      "Caça ou Carnes Curadas",
      "Tomilho Limão & Especiarias Quentes",
    ],
    rules: [
      "A castanha deve ser protagonista ou co-protagonista do prato (assada, em puré, textura crocante ou emulsão).",
      "A receita deve ser autoral e aplicável para serviço em residência de cliente.",
      "Fotografia com boa luz natural ou cuidada evidenciando o empratamento final.",
      "Ficha de confeção indicando tempo de preparação e declaração rigorosa de alergénios.",
    ],
    criteria: [
      {
        label: "Criatividade & Harmonia de Sabores",
        weight: 40,
        desc: "Equilíbrio entre a doçura terrosa da castanha e os contrastes aromáticos.",
      },
      {
        label: "Estética Visual & Empratamento",
        weight: 35,
        desc: "Sofisticação, textura e elegância cromática outonal no prato.",
      },
      {
        label: "Viabilidade em Cozinha Residencial",
        weight: 25,
        desc: "Facilidade de execução e manutenção da qualidade térmica no cliente.",
      },
    ],
  },
  {
    id: "harmonizacao-intimista-2026",
    badge: "DESAFIO DO MÊS",
    themeTitle: "Harmonização de Assinatura: Menu de Degustação a 2",
    shortDescription:
      "Desenha uma experiência intimista de alta gastronomia com emparelhamento de vinhos ou mocktails de autor.",
    prize: "Prémio: Selo 'Menu de Assinatura' + Menção Editorial VIP",
    prizeDetails:
      "Destaque no filtro de 'Rituais Românticos & Comemorações' e convite para artigo de destaque na revista digital Cookr.",
    deadlineText: "Termina a 15 de Dezembro (Restam 27 dias)",
    categoryTag: "Alta Gastronomia",
    coverImage:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800",
    accentBg: "bg-rose-500/10",
    accentBorder: "border-rose-500/30",
    accentText: "text-rose-700",
    participantsCount: 14,
    suggestedIngredients: [
      "Peixes da Costa Portuguesa",
      "Reduções Vinícolas",
      "Infusões Botânicas",
      "Trufas ou Ervas Aromáticas Frescas",
    ],
    rules: [
      "Apresentar sequência de 3 ou 4 momentos gastronómicos interligados.",
      "Cada momento deve incluir uma nota de harmonização justificada.",
      "Foto do prato principal acompanhado do serviço sugerido.",
    ],
    criteria: [
      {
        label: "Coerência Narrativa do Menu",
        weight: 40,
        desc: "Evolução lógica e equilíbrio entre os momentos gastronómicos.",
      },
      {
        label: "Apresentação & Rituais de Serviço",
        weight: 35,
        desc: "Atenção ao detalhe no empratamento e teatralidade moderada à mesa.",
      },
      {
        label: "Precisão na Harmonização",
        weight: 25,
        desc: "Complementaridade ou contraste enriquecedor entre prato e bebida.",
      },
    ],
  },
  {
    id: "plant-based-tradicao-2026",
    badge: "DESAFIO DO MÊS",
    themeTitle: "Tradição Reimaginada: Clássico Luso em Versão 100% Vegetal",
    shortDescription:
      "Reinterpreta uma das receitas icónicas da cozinha portuguesa sem qualquer proteína animal, mantendo a alma reconfortante.",
    prize: "Prémio: Destaque 'Chef Sustentável' + Notificação Push aos Clientes",
    prizeDetails:
      "Prioridade máxima na pesquisa de alimentação plant-based e recomendação ativa a clientes com restrições vegan/vegetarianas.",
    deadlineText: "Termina a 05 de Janeiro (Restam 48 dias)",
    categoryTag: "Cozinha Sustentável",
    coverImage:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/30",
    accentText: "text-emerald-700",
    participantsCount: 22,
    suggestedIngredients: [
      "Leguminosas Ancestrais Portuguesas",
      "Algas da Costa Atlântica",
      "Azeites Virgem Extra Monovarietais",
      "Hortícolas da Época",
    ],
    rules: [
      "Base 100% vegetal integral, sem ultraprocessados artificiais.",
      "Homenagem clara a um prato tradicional da gastronomia portuguesa.",
      "Fotografia e descrição do método de extração de sabor (ex: caldos concentrados, fermentações).",
    ],
    criteria: [
      {
        label: "Respeito pela Alma da Receita",
        weight: 40,
        desc: "Reconhecimento imediato do perfil afetivo da receita clássica reinterpretada.",
      },
      {
        label: "Técnica Culinária & Texturas",
        weight: 35,
        desc: "Complexidade nas texturas vegetais sem monotonia sensorial.",
      },
      {
        label: "Sustentabilidade dos Ingredientes",
        weight: 25,
        desc: "Uso de produtos sazonais e de produtores locais de proximidade.",
      },
    ],
  },
];

// Sample culinary photographs for immediate test selection
const PRESET_CULINARY_PHOTOS = [
  {
    label: "Risotto de Castanhas & Boletus",
    url: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&q=80&w=800",
  },
  {
    label: "Lombo em Crosta de Castanha & Vinho do Porto",
    url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800",
  },
  {
    label: "Velouté Aveludado de Castanhas & Trufa",
    url: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=800",
  },
  {
    label: "Mousse Cremosa de Castanha & Cacau Cru",
    url: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=800",
  },
];

interface CookrChallengesProps {
  currentUser?: User | null;
  onNotify?: (message: string, type?: "success" | "info" | "error") => void;
}

export const CookrChallenges: React.FC<CookrChallengesProps> = ({
  currentUser,
  onNotify,
}) => {
  useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userSubmissions, setUserSubmissions] = useState<ChallengeSubmission[]>(
    []
  );

  const activeChallenge = CHALLENGES_DATA[currentIndex];

  // Load submissions from localStorage and Supabase
  useEffect(() => {
    setUserSubmissions([]);
    if (currentUser?.id) {
      const loadSubmissions = async () => {
        try {
          const { data } = await supabase
            .from("challenge_submissions")
            .select("*")
            .eq("chef_id", currentUser.id);

          if (data && data.length > 0) {
            const list: ChallengeSubmission[] = data.map((d: any) => ({
              id: d.id,
              challengeId: d.challenge_id || d.challengeId,
              chefId: d.chef_id || d.chefId,
              chefName: d.chef_name || d.chefName,
              chefAvatar: d.chef_avatar || d.chefAvatar,
              dishTitle: d.dish_title || d.dishTitle,
              description: d.description,
              photoUrl: d.photo_url || d.photoUrl,
              courseType: d.course_type || d.courseType,
              prepTime: d.prep_time || d.prepTime,
              allergens: d.allergens || [],
              pairingNotes: d.pairing_notes || d.pairingNotes,
              submittedAt: d.submitted_at || d.submittedAt,
              status: d.status || "in_review",
            }));
            setUserSubmissions((prev) => {
              const combined = [...prev];
              list.forEach((item) => {
                if (!combined.some((c) => c.id === item.id)) {
                  combined.push(item);
                }
              });
              return combined;
            });
          }
        } catch {
          // Fallback to local state gracefully
        }
      };
      loadSubmissions();
    }
  }, [currentUser?.id]);

  const activeSubmission = userSubmissions.find(
    (s) =>
      s.challengeId === activeChallenge.id &&
      (!currentUser?.id || s.chefId === currentUser.id)
  );

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) =>
      prev === 0 ? CHALLENGES_DATA.length - 1 : prev - 1
    );
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) =>
      prev === CHALLENGES_DATA.length - 1 ? 0 : prev + 1
    );
  };

  const handleSubmissionComplete = (submission: ChallengeSubmission) => {
    const updated = [
      submission,
      ...userSubmissions.filter(
        (s) =>
          !(
            s.challengeId === submission.challengeId &&
            s.chefId === submission.chefId
          )
      ),
    ];
    setUserSubmissions(updated);
    if (onNotify) {
      onNotify(
        tr("Prato submetido com sucesso ao Desafio Cookr! Boa sorte!"),
        "success"
      );
    }
    setIsModalOpen(false);
  };

  return (
    <section
      id="cookr-challenges-section"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-300 hover:border-slate-300"
    >
      {/* Top Banner / Navigation Bar */}
      <div className="px-4 py-3 md:px-5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Badge 'DESAFIO DO MÊS' with Trophy icon */}
          <div
            id="challenge-badge-header"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] md:text-[10px] tracking-widest uppercase shadow-sm"
          >
            <Trophy size={13} className="text-slate-950 shrink-0" />
            <span>{tr(activeChallenge.badge as any) as any}</span>
          </div>

          <span className="text-[10px] font-bold text-amber-300/90 uppercase tracking-wider hidden sm:inline-flex items-center gap-1">
            <Sparkles size={11} /> {activeChallenge.categoryTag}
          </span>
        </div>

        {/* Carousel controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-400 mr-1.5">
            {currentIndex + 1} / {CHALLENGES_DATA.length}
          </span>
          <button
            id="challenge-prev-btn"
            type="button"
            onClick={handlePrev}
            aria-label={tr("Desafio anterior")}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            id="challenge-next-btn"
            type="button"
            onClick={handleNext}
            aria-label={tr("Próximo desafio")}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Dynamic Card Content */}
      <div className="p-4 md:p-6 space-y-4">
        {/* Title & Theme with strong visual prominence */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md uppercase tracking-wider border border-orange-100">
              {activeChallenge.deadlineText}
            </span>
            <span className="text-[9px] font-semibold text-slate-500 flex items-center gap-1">
              <Flame size={12} className="text-orange-500" />
              {activeChallenge.participantsCount} {tr("Chefs a concorrer")}
            </span>
          </div>

          <h3
            id="challenge-theme-title"
            className="text-base md:text-xl font-black text-slate-950 uppercase tracking-tight leading-snug"
          >
            {activeChallenge.themeTitle}
          </h3>
        </div>

        {/* Short Description */}
        <p
          id="challenge-short-desc"
          className="text-xs md:text-sm text-slate-600 leading-relaxed font-normal"
        >
          {activeChallenge.shortDescription}
        </p>

        {/* Incentive / Prize Line with highlighted aesthetic */}
        <div
          id="challenge-prize-banner"
          className="p-3 md:p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-slate-50 border border-amber-200/80 flex items-start sm:items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
            <Award size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm font-extrabold text-slate-950 tracking-tight leading-tight">
              {activeChallenge.prize}
            </p>
            <p className="text-[10px] md:text-[11px] text-slate-600 font-medium leading-normal mt-0.5">
              {activeChallenge.prizeDetails}
            </p>
          </div>
        </div>

        {/* Active Submission Preview if Chef has already submitted */}
        {activeSubmission && (
          <div
            id="chef-active-submission"
            className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-emerald-200 bg-white">
                <img
                  src={activeSubmission.photoUrl}
                  alt={activeSubmission.dishTitle}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                    {tr("Candidatura Submetida")}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {activeSubmission.dishTitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider underline hover:text-emerald-950 shrink-0 cursor-pointer"
            >
              {tr("Editar Prato")}
            </button>
          </div>
        )}

        {/* Expandable Criteria & Rules Section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden space-y-4 pt-2 border-t border-slate-100"
            >
              {/* Suggested Ingredients */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1">
                  <Utensils size={12} className="text-orange-500" />
                  Ingredientes & Inspirações em Destaque
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeChallenge.suggestedIngredients.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Evaluation Criteria with Progress Bars */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1">
                  <Star size={12} className="text-amber-500" />
                  {tr("Critérios de Avaliação do Júri Cookr")}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {activeChallenge.criteria.map((c, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-800 uppercase">
                          {tr(c.label as any) as any}
                        </span>
                        <span className="text-[10px] font-black text-orange-600">
                          {c.weight}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-orange-500 h-full rounded-full"
                          style={{ width: `${c.weight}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-slate-500 leading-tight">
                        {tr(c.desc as any) as any}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1">
                  <Info size={12} className="text-slate-500" />
                  {tr("Regras Gerais de Participação")}
                </span>
                <ul className="space-y-1 text-left text-[11px] text-slate-600">
                  {activeChallenge.rules.map((rule, rIdx) => (
                    <li key={rIdx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Row: Expand Toggle & Call to Action (CTA) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button
            id="challenge-expand-btn"
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="text-xs font-bold text-slate-600 hover:text-slate-950 inline-flex items-center gap-1.5 cursor-pointer py-1.5"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={15} />
                <span>Ocultar Regras & Critérios</span>
              </>
            ) : (
              <>
                <ChevronDown size={15} />
                <span>Ver Regras & Critérios de Avaliação</span>
              </>
            )}
          </button>

          {/* Interactive CTA: 'Submeter Prato' */}
          <button
            id="challenge-submit-dish-btn"
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:shadow hover:-translate-y-0.5"
          >
            <Upload size={14} />
            <span>
              {activeSubmission ? tr("Atualizar Submissão") : tr("Submeter Prato")}
            </span>
          </button>
        </div>
      </div>

      {/* Dish Submission Modal */}
      {isModalOpen && (
        <DishSubmissionModal
          challenge={activeChallenge}
          existingSubmission={activeSubmission}
          currentUser={currentUser}
          onClose={() => setIsModalOpen(false)}
          onSubmitSuccess={handleSubmissionComplete}
        />
      )}
    </section>
  );
};

// ==========================================
// SUBMISSION MODAL COMPONENT
// ==========================================
interface DishSubmissionModalProps {
  challenge: CookrChallenge;
  existingSubmission?: ChallengeSubmission;
  currentUser?: User | null;
  onClose: () => void;
  onSubmitSuccess: (submission: ChallengeSubmission) => void;
}

const ALLERGEN_OPTIONS = [
  "Glúten",
  "Lactose",
  "Frutos de Casca Rija",
  "Castanha",
  "Crustáceos / Peixe",
  "Ovos",
  "Soja",
  "Vegetariano",
  "100% Vegan",
];

const DishSubmissionModal: React.FC<DishSubmissionModalProps> = ({
  challenge,
  existingSubmission,
  currentUser,
  onClose,
  onSubmitSuccess,
}) => {
  useLanguage();
  const [dishTitle, setDishTitle] = useState(
    existingSubmission?.dishTitle || ""
  );
  const [description, setDescription] = useState(
    existingSubmission?.description || ""
  );
  const [photoUrl, setPhotoUrl] = useState(
    existingSubmission?.photoUrl || PRESET_CULINARY_PHOTOS[0].url
  );
  const [courseType, setCourseType] = useState(
    existingSubmission?.courseType || "Prato Principal"
  );
  const [prepTime, setPrepTime] = useState(
    existingSubmission?.prepTime || "45 min"
  );
  const [pairingNotes, setPairingNotes] = useState(
    existingSubmission?.pairingNotes || ""
  );
  const [allergens, setAllergens] = useState<string[]>(
    existingSubmission?.allergens || ["Castanha"]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputId = useId();

  // Handle local image file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Valida, reduz e comprime a foto antes de a guardar.
      const url = await supabaseService.uploadFile("covers", "", file, 1280);
      setPhotoUrl(url);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar a imagem.");
    }
  };

  const toggleAllergen = (item: string) => {
    setAllergens((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishTitle.trim()) {
      setError(tr("Por favor, insere o nome da tua criação gastronómica."));
      return;
    }
    if (!description.trim()) {
      setError(tr("Por favor, adiciona uma breve descrição e inspiração do prato."));
      return;
    }
    if (!photoUrl.trim()) {
      setError(tr("Por favor, anexa uma fotografia do empratamento."));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const submissionData: ChallengeSubmission = {
      id: existingSubmission?.id && /^[0-9a-f-]{36}$/i.test(existingSubmission.id) ? existingSubmission.id : crypto.randomUUID(),
      challengeId: challenge.id,
      chefId: currentUser?.id || "",
      chefName: currentUser?.nome || "Chef Cookr",
      chefAvatar:
        currentUser?.avatar_url || "",
      dishTitle: dishTitle.trim(),
      description: description.trim(),
      photoUrl: photoUrl.trim(),
      courseType,
      prepTime,
      allergens,
      pairingNotes: pairingNotes.trim(),
      submittedAt: new Date().toISOString(),
      status: "in_review",
    };

    if (!currentUser?.id) {
      setError(tr("Inicia sessão como chef para submeter um prato."));
      setIsSubmitting(false);
      return;
    }

    const { error: saveError } = await supabase.from("challenge_submissions").upsert(
      {
        id: submissionData.id,
        challenge_id: submissionData.challengeId,
        chef_id: submissionData.chefId,
        chef_name: submissionData.chefName,
        chef_avatar: submissionData.chefAvatar,
        dish_title: submissionData.dishTitle,
        description: submissionData.description,
        photo_url: submissionData.photoUrl,
        course_type: submissionData.courseType,
        prep_time: submissionData.prepTime,
        allergens: submissionData.allergens,
        pairing_notes: submissionData.pairingNotes,
        submitted_at: submissionData.submittedAt,
        status: submissionData.status,
      },
      { onConflict: "challenge_id,chef_id" },
    );

    if (saveError) {
      console.warn("[Challenges] submit error:", saveError);
      setError(
        navigator.onLine
          ? "Não foi possível guardar a submissão. Tenta novamente dentro de instantes."
          : "Sem ligação à internet. Volta a tentar quando estiveres online.",
      );
      setIsSubmitting(false);
      return;
    }

    onSubmitSuccess(submissionData);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-4 z-[110] animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl relative text-left overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0">
              <Trophy size={16} />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-slate-950 uppercase tracking-tight">
                {tr("Submeter Prato ao Desafio")}
              </h2>
              <p className="text-[10px] text-slate-500 font-medium line-clamp-1">
                {challenge.themeTitle}
              </p>
            </div>
          </div>
          <button
            id="close-submission-modal-btn"
            type="button"
            onClick={onClose}
            aria-label={tr("Fechar")}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form
          onSubmit={handleSubmit}
          className="p-5 md:p-6 overflow-y-auto space-y-4 flex-1 text-slate-800 text-xs"
        >
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <Info size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dish Title */}
          <div className="space-y-1">
            <label
              htmlFor="submission-dish-title"
              className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block"
            >
              {tr("Nome do Prato / Criação Gastronómica *")}
            </label>
            <input
              id="submission-dish-title"
              type="text"
              value={dishTitle}
              onChange={(e) => setDishTitle(e.target.value)}
              placeholder={tr("ex: Risotto Cremoso de Castanhas Assadas, Cogumelos Selvagens e Tomilho Limão")}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 text-slate-900 text-xs transition-colors"
              required
            />
          </div>

          {/* Photo Upload & Gallery Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
              {tr("Fotografia do Empratamento *")}
            </label>

            {/* Photo preview + actions */}
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <div className="w-full sm:w-44 h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative group">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={tr("Pré-visualização do prato")}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon size={28} />
                    <span className="text-[10px] mt-1 font-medium">
                      {tr("Sem imagem")}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={fileInputId}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Upload size={12} />
                    <span>{tr("Carregar do Dispositivo")}</span>
                  </label>
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Quick Presets for instant testing */}
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                    {tr("Ou seleciona uma fotografia sugerida:")}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRESET_CULINARY_PHOTOS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPhotoUrl(preset.url)}
                        className={`text-left p-1.5 rounded-lg border text-[9.5px] truncate font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                          photoUrl === preset.url
                            ? "border-orange-500 bg-orange-50/80 text-orange-900 font-bold"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        {photoUrl === preset.url && (
                          <Check size={11} className="text-orange-600 shrink-0" />
                        )}
                        <span className="truncate">{tr(preset.label as any) as any}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* URL input option */}
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder={tr("Ou cola o URL direto da imagem...")}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] text-slate-700 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Description & Storytelling */}
          <div className="space-y-1">
            <label
              htmlFor="submission-desc"
              className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block"
            >
              Conceito & Inspiração Gastronómica *
            </label>
            <textarea
              id="submission-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr("Descreve as técnicas utilizadas, como o ingrediente sazonal foi trabalhado e a experiência sensorial pensada para o cliente...")}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 text-slate-900 text-xs transition-colors"
              required
            />
          </div>

          {/* Metadata Row: Course Type, Prep Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="submission-course-type"
                className="text-[10px] font-bold text-slate-900 uppercase tracking-wider block"
              >
                {tr("Tipo de Prato")}
              </label>
              <select
                id="submission-course-type"
                value={courseType}
                onChange={(e) => setCourseType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500"
              >
                <option value="Entrada">{tr("Entrada")}</option>
                <option value="Prato Principal">{tr("Prato Principal")}</option>
                <option value="Sobremesa">{tr("Sobremesa")}</option>
                <option value="Menu Completo">{tr("Menu Completo")}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="submission-prep-time"
                className="text-[10px] font-bold text-slate-900 uppercase tracking-wider block flex items-center gap-1"
              >
                <Clock size={11} className="text-slate-400" />
                {tr("Tempo de Confeção em Casa")}
              </label>
              <input
                id="submission-prep-time"
                type="text"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder={tr("ex: 45 min")}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Allergens & Dietary Tags */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider block">
              Alergénios & Etiquetas Alimentares
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGEN_OPTIONS.map((item) => {
                const isSelected = allergens.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleAllergen(item)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-orange-500 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pairing Notes */}
          <div className="space-y-1">
            <label
              htmlFor="submission-pairing"
              className="text-[10px] font-bold text-slate-900 uppercase tracking-wider block"
            >
              {tr("Sugestão de Harmonização / Notas ao Júri (Opcional)")}
            </label>
            <input
              id="submission-pairing"
              type="text"
              value={pairingNotes}
              onChange={(e) => setPairingNotes(e.target.value)}
              placeholder={tr("ex: Sugestão de pairing com Vinho Tinto Reserva do Dão ou infusão de zimbro")}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              {tr("Cancelar")}
            </button>
            <button
              id="confirm-submit-dish-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? tr("A submeter...") : tr("Confirmar Submissão")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CookrChallenges;
