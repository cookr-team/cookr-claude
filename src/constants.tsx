import React from 'react';
import { 
  Users, 
  User,
  Utensils, 
  Calendar, 
  CalendarOff,
  Settings, 
  CheckCircle, 
  Check,
  Percent,
  Clock, 
  XCircle, 
  X,
  TrendingUp, 
  ShieldCheck, 
  Shield,
  Lock,
  Edit3,
  CreditCard, 
  MessageSquare, 
  ArrowRight, 
  ArrowLeft,
  Link,
  FileText,
  Star, 
  MapPin, 
  ChefHat, 
  Heart, 
  Smile, 
  Gift,
  ChevronLeft, 
  ChevronRight, 
  List, 
  Plus, 
  Eye, 
  EyeOff, 
  Globe, 
  LocateFixed, 
  Home, 
  Briefcase, 
  Share2, 
  Search, 
  Filter, 
  Leaf, 
  Anchor, 
  Moon, 
  Book, 
  Info, 
  AlertTriangle, 
  HelpCircle, 
  Phone, 
  LifeBuoy, 
  Quote, 
  Camera, 
  Award, 
  Zap, 
  Coffee, 
  Sparkles, 
  Inbox,
  ChevronDown,
  Paperclip,
  Send,
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  RefreshCw,
  Megaphone,
  Target,
  Bell,
  Mail,
  Database,
  AlertCircle,
  Copy,
  Wine
} from 'lucide-react';

export const COMMISSION_RATE = 0.20;
export const PLATFORM_NAME = "Cookr";
export const CURRENCY = "€";

export const PORTUGAL_CITIES = [
  "Lisboa", "Porto", "Cascais", "Sintra", "Gaia", "Coimbra", "Braga", "Faro", "Aveiro", "Setúbal", "Bragança", "Évora", "Funchal", "Ponta Delgada"
];

export const ALL_CUISINES_IMG = 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=400&q=80';

export const CUISINES = [
  { id: 'portuguesa', label: 'Portuguesa', img: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=400&q=80' },
  { id: 'italiana', label: 'Italiana', img: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=80' },
  { id: 'sushi', label: 'Sushi', img: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=400&q=80' },
  { id: 'mediterrânica', label: 'Mediterrânica', img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80' },
  { id: 'francesa', label: 'Francesa', img: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=400&q=80' },
  { id: 'fusão', label: 'Fusão', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80' },
  { id: 'vegetariana', label: 'Vegetariana', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80' },
  { id: 'na brasa', label: 'Na Brasa', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80' },
  { id: 'mexicana', label: 'Mexicana', img: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&q=80' },
  { id: 'ásia', label: 'Ásia', img: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=400&q=80' }
];

export interface CookrCollection {
  id: string;
  title: string;
  title_en?: string;
  title_fr?: string;
  title_es?: string;
  subtitle: string;
  subtitle_en?: string;
  subtitle_fr?: string;
  subtitle_es?: string;
  image: string;
  tag_key: string;
  criteria?: {
    minCourses?: number;
    minPax?: number;
    maxPax?: number;
    tags: string[];
  };
}

export const COOKR_COLLECTIONS: CookrCollection[] = [
  {
    id: 'romantico',
    title: 'Jantar Romântico',
    title_en: 'Romantic Dinner',
    title_fr: 'Dîner Romantique',
    title_es: 'Cena Romántica',
    subtitle: 'MENU INTIMISTA A DOIS',
    subtitle_en: 'INTIMATE MENU FOR TWO',
    subtitle_fr: 'MENU INTIME POUR DEUX',
    subtitle_es: 'MENÚ ÍNTIMO PARA DOS',
    image: 'https://images.unsplash.com/photo-1522413452208-996ff3f3e740?q=80&w=800&auto=format&fit=crop',
    tag_key: 'romântico',
    criteria: {
      tags: ['romântico', 'intimista', 'degustação', 'luxo'],
      minCourses: 3,
      maxPax: 4
    }
  },
  {
    id: 'amigos',
    title: 'Convívio Amigos',
    title_en: 'Friends Gathering',
    title_fr: 'Réunion d\'Amis',
    title_es: 'Reunión con Amigos',
    subtitle: 'TAPAS & PARTILHA',
    subtitle_en: 'TAPAS & SHARING',
    subtitle_fr: 'TAPAS & PARTAGE',
    subtitle_es: 'TAPAS Y COMPARTIR',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&auto=format&fit=crop',
    tag_key: 'amigos',
    criteria: {
      tags: ['partilha', 'tapas', 'fingerfood', 'amigos', 'casual'],
      minPax: 4
    }
  },
  {
    id: 'business',
    title: 'Business Lunch',
    title_en: 'Business Lunch',
    title_fr: 'Déjeuner d\'Affaires',
    title_es: 'Almuerzo Ejecutivo',
    subtitle: 'EXECUTIVE SERVICE',
    subtitle_en: 'EXECUTIVE SERVICE',
    subtitle_fr: 'SERVICE EXÉCUTIF',
    subtitle_es: 'SERVICIO EJECUTIVO',
    image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?q=80&w=800&auto=format&fit=crop',
    tag_key: 'executivo',
    criteria: {
      tags: ['executivo', 'rápido', 'formal', 'almoço'],
      minCourses: 2
    }
  },
  {
    id: 'familia',
    title: 'Domingo em Família',
    title_en: 'Family Sunday',
    title_fr: 'Dimanche en Famille',
    title_es: 'Domingo en Familia',
    subtitle: 'CONFORTO TRADICIONAL',
    subtitle_en: 'TRADITIONAL COMFORT',
    subtitle_fr: 'CONFORT TRADITIONNEL',
    subtitle_es: 'CONFORT TRADICIONAL',
    image: 'https://images.unsplash.com/photo-1547573854-74d2a71d0826?q=80&w=800&auto=format&fit=crop',
    tag_key: 'família',
    criteria: {
      tags: ['tradicional', 'família', 'conforto', 'portuguesa', 'abundante'],
      minPax: 6
    }
  }
];

function makePremiumIcon<P extends { size?: number | string; strokeWidth?: number | string; className?: string }>(
  IconComponent: React.ComponentType<P>
): React.FC<P> {
  const WrappedIcon: React.FC<P> = (props: P) => {
    let finalProps = { ...props };
    
    // Consistent premium thin/light stroke width (1.5 is standard, elegant)
    if (props.strokeWidth === undefined) {
      finalProps = {
        ...finalProps,
        strokeWidth: 1.5,
      };
    }
    
    // Scale down size slightly for balanced, modern, minimalist proportions
    if (props.size !== undefined) {
      const parsedSize = typeof props.size === 'string' ? parseFloat(props.size) : props.size;
      if (!isNaN(parsedSize)) {
        let newSize = parsedSize;
        if (parsedSize >= 24) {
          newSize = 20;
        } else if (parsedSize >= 20) {
          newSize = 17;
        } else if (parsedSize >= 18) {
          newSize = 15;
        } else if (parsedSize >= 16) {
          newSize = 13;
        } else if (parsedSize >= 14) {
          newSize = 11;
        } else if (parsedSize >= 12) {
          newSize = 10;
        } else {
          newSize = Math.max(6, parsedSize - 1);
        }
        
        finalProps = {
          ...finalProps,
          size: typeof props.size === 'string' ? `${newSize}` : newSize,
        };
      }
    } else {
      // Default to slightly smaller size (20 instead of Lucide's 24)
      finalProps = {
        ...finalProps,
        size: 20,
      };
    }
    
    return <IconComponent {...finalProps} />;
  };
  
  WrappedIcon.displayName = `PremiumIcon(${IconComponent.displayName || IconComponent.name || 'Icon'})`;
  return WrappedIcon;
}

export const ICONS = {
  Users: makePremiumIcon(Users),
  User: makePremiumIcon(User),
  Utensils: makePremiumIcon(Utensils),
  Calendar: makePremiumIcon(Calendar),
  CalendarOff: makePremiumIcon(CalendarOff),
  Settings: makePremiumIcon(Settings),
  CheckCircle: makePremiumIcon(CheckCircle),
  Check: makePremiumIcon(Check),
  Percent: makePremiumIcon(Percent),
  Clock: makePremiumIcon(Clock),
  XCircle: makePremiumIcon(XCircle),
  X: makePremiumIcon(X),
  TrendingUp: makePremiumIcon(TrendingUp),
  ShieldCheck: makePremiumIcon(ShieldCheck),
  Shield: makePremiumIcon(Shield),
  Lock: makePremiumIcon(Lock),
  Edit3: makePremiumIcon(Edit3),
  CreditCard: makePremiumIcon(CreditCard),
  MessageSquare: makePremiumIcon(MessageSquare),
  ArrowRight: makePremiumIcon(ArrowRight),
  ArrowLeft: makePremiumIcon(ArrowLeft),
  Link: makePremiumIcon(Link),
  FileText: makePremiumIcon(FileText),
  Star: makePremiumIcon(Star),
  MapPin: makePremiumIcon(MapPin),
  ChefHat: makePremiumIcon(ChefHat),
  Heart: makePremiumIcon(Heart),
  Smile: makePremiumIcon(Smile),
  Gift: makePremiumIcon(Gift),
  ChevronLeft: makePremiumIcon(ChevronLeft),
  ChevronRight: makePremiumIcon(ChevronRight),
  List: makePremiumIcon(List),
  Plus: makePremiumIcon(Plus),
  Eye: makePremiumIcon(Eye),
  EyeOff: makePremiumIcon(EyeOff),
  Globe: makePremiumIcon(Globe),
  LocateFixed: makePremiumIcon(LocateFixed),
  Home: makePremiumIcon(Home),
  Briefcase: makePremiumIcon(Briefcase),
  Share2: makePremiumIcon(Share2),
  Search: makePremiumIcon(Search),
  Filter: makePremiumIcon(Filter),
  Leaf: makePremiumIcon(Leaf),
  Anchor: makePremiumIcon(Anchor),
  Moon: makePremiumIcon(Moon),
  Book: makePremiumIcon(Book),
  Info: makePremiumIcon(Info),
  AlertTriangle: makePremiumIcon(AlertTriangle),
  HelpCircle: makePremiumIcon(HelpCircle),
  Phone: makePremiumIcon(Phone),
  LifeBuoy: makePremiumIcon(LifeBuoy),
  Quote: makePremiumIcon(Quote),
  Camera: makePremiumIcon(Camera),
  Award: makePremiumIcon(Award),
  Zap: makePremiumIcon(Zap),
  Coffee: makePremiumIcon(Coffee),
  Sparkles: makePremiumIcon(Sparkles),
  Inbox: makePremiumIcon(Inbox),
  ChevronDown: makePremiumIcon(ChevronDown),
  Paperclip: makePremiumIcon(Paperclip),
  Send: makePremiumIcon(Send),
  LayoutDashboard: makePremiumIcon(LayoutDashboard),
  ArrowUpRight: makePremiumIcon(ArrowUpRight),
  ArrowDownRight: makePremiumIcon(ArrowDownRight),
  Trash2: makePremiumIcon(Trash2),
  RefreshCw: makePremiumIcon(RefreshCw),
  Megaphone: makePremiumIcon(Megaphone),
  Target: makePremiumIcon(Target),
  Bell: makePremiumIcon(Bell),
  Mail: makePremiumIcon(Mail),
  Database: makePremiumIcon(Database),
  AlertCircle: makePremiumIcon(AlertCircle),
  Copy: makePremiumIcon(Copy),
  Wine: makePremiumIcon(Wine)
};

export const formatPrice = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return `0,00 ${CURRENCY}`;
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(num);
};

export interface SustainabilityBadgeInfo {
  id: string;
  icon: string;
  label: { pt: string; es: string; en: string; fr: string };
  shortLabel: { pt: string; es: string; en: string; fr: string };
  description: { pt: string; es: string; en: string; fr: string };
  badgeClass: string;
}

export const SUSTAINABILITY_BADGES_LIST: SustainabilityBadgeInfo[] = [
  {
    id: "farm_to_table",
    icon: "🌾",
    label: { pt: "Selo Farm-to-Table", es: "Sello Farm-to-Table", en: "Farm-to-Table Seal", fr: "Label Farm-to-Table" },
    shortLabel: { pt: "Farm to Table", es: "Farm to Table", en: "Farm to Table", fr: "Farm to Table" },
    description: {
      pt: "Ingredientes colhidos diretamente em produtores e quintas locais parceiras.",
      es: "Ingredientes cosechados directamente en productores y granjas locales socias.",
      en: "Ingredients sourced directly from local partner farms and producers.",
      fr: "Ingrédients récoltés directement auprès de producteurs et fermes partenaires."
    },
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200"
  },
  {
    id: "sustainable_seafood",
    icon: "🐟",
    label: { pt: "Peixe Sustentável & Rastreável", es: "Pescado Sostenible y Trazable", en: "Sustainable & Traceable Seafood", fr: "Poisson Durable & Traçable" },
    shortLabel: { pt: "Peixe Sustentável", es: "Pescado Sostenible", en: "Sustainable Fish", fr: "Poisson Durable" },
    description: {
      pt: "Pesca responsável com respeito pelo defeso, artes tradicionais e rastreabilidade total.",
      es: "Pesca responsable con respeto por veda, artes tradicionales y trazabilidad total.",
      en: "Responsible fishing respecting closed seasons, traditional gear, and full traceability.",
      fr: "Pêche responsable respectant la saisonnalité, les engins traditionnels et la traçabilité."
    },
    badgeClass: "bg-cyan-50 text-cyan-800 border-cyan-200"
  },
  {
    id: "organic_certified",
    icon: "🥬",
    label: { pt: "Ingredientes 100% Biológicos", es: "Ingredientes 100% Biológicos", en: "100% Organic Ingredients", fr: "Ingrédients 100% Biologiques" },
    shortLabel: { pt: "100% Bio", es: "100% Orgánico", en: "100% Organic", fr: "100% Bio" },
    description: {
      pt: "Produtos certificados livres de pesticidas sintéticos ou químicos nocivos.",
      es: "Productos certificados libres de pesticidas sintéticos o químicos nocivos.",
      en: "Certified products free of synthetic pesticides or harmful chemicals.",
      fr: "Produits certifiés sans pesticides synthétiques ni produits chimiques."
    },
    badgeClass: "bg-lime-50 text-lime-800 border-lime-200"
  },
  {
    id: "zero_waste",
    icon: "♻️",
    label: { pt: "Cozinha Zero Waste (Desperdício Zero)", es: "Cocina Zero Waste (Desperdicio Cero)", en: "Zero Waste Kitchen", fr: "Cuisine Zéro Déchet" },
    shortLabel: { pt: "Zero Waste", es: "Zero Waste", en: "Zero Waste", fr: "Zéro Déchet" },
    description: {
      pt: "Aproveitamento integral de matérias-primas, compostagem e técnicas de conservação circular.",
      es: "Aprovechamiento integral de materias primas, compostaje y técnicas circulares.",
      en: "Full utilization of ingredients, composting, and circular preservation methods.",
      fr: "Utilisation intégrale des ingrédients, compostage et préservation circulaire."
    },
    badgeClass: "bg-teal-50 text-teal-800 border-teal-200"
  },
  {
    id: "local_markets",
    icon: "🏡",
    label: { pt: "Produtores Locais & Mercados de Bairro", es: "Productores Locales y Mercados", en: "Local Farmers & Neighborhood Markets", fr: "Producteurs Locaux & Marchés" },
    shortLabel: { pt: "Apoio Local", es: "Apoyo Local", en: "Local Sourced", fr: "Soutien Local" },
    description: {
      pt: "Compras efetuadas diariamente em mercados tradicionais apoiando a comunidade local.",
      es: "Compras realizadas diariamente en mercados tradicionales apoyando a la comunidad.",
      en: "Daily purchases at traditional markets supporting local community producers.",
      fr: "Achats quotidiens dans les marchés traditionnels soutenant les producteurs locaux."
    },
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200"
  },
  {
    id: "eco_packaging",
    icon: "📦",
    label: { pt: "Embalagens Biodegradáveis & Sem Plástico", es: "Envases Biodegradables y Sin Plástico", en: "Biodegradable & Plastic-Free Packaging", fr: "Emballages Biodégradables Sans Plastique" },
    shortLabel: { pt: "Eco Packaging", es: "Eco Packaging", en: "Eco Packaging", fr: "Eco Emballage" },
    description: {
      pt: "Transporte e acondicionamento ecológico em recipientes compostáveis e reutilizáveis.",
      es: "Transporte y embalaje ecológico en contenedores compostables y reutilizables.",
      en: "Eco-friendly transport and storage using compostable and reusable containers.",
      fr: "Transport et conditionnement écologiques dans des récipients compostables."
    },
    badgeClass: "bg-stone-100 text-stone-800 border-stone-200"
  }
];

export interface AllergenCertificationInfo {
  id: string;
  icon: string;
  label: { pt: string; es: string; en: string; fr: string };
  shortLabel: { pt: string; es: string; en: string; fr: string };
  description: { pt: string; es: string; en: string; fr: string };
  badgeClass: string;
}

export const ALLERGEN_CERTIFICATIONS_LIST: AllergenCertificationInfo[] = [
  {
    id: "gluten_free_safe",
    icon: "🌾",
    label: { pt: "Sem Glúten Certificado (Celíacos Safe)", es: "Sin Gluten Certificado (Apto Celíacos)", en: "Certified Gluten-Free (Celiac Safe)", fr: "Certifié Sans Gluten (Cœliaques)" },
    shortLabel: { pt: "Sem Glúten", es: "Sin Gluten", en: "Gluten-Free", fr: "Sans Gluten" },
    description: {
      pt: "Desinfeção de superfícies e utensílios dedicados para evitar qualquer contaminação por glúten.",
      es: "Desinfección de superficies y utensilios dedicados para evitar contaminación por gluten.",
      en: "Sterilized surfaces and dedicated utensils to prevent any cross-contamination.",
      fr: "Surfaces et ustensiles dédiés désinfectés pour éviter la contamination croisée."
    },
    badgeClass: "bg-amber-50 text-amber-900 border-amber-300"
  },
  {
    id: "vegan_dedicated",
    icon: "🌱",
    label: { pt: "Cozinha 100% Vegan Dedicada", es: "Cocina 100% Vegana Dedicada", en: "100% Dedicated Vegan Kitchen", fr: "Cuisine 100% Végane Dédiée" },
    shortLabel: { pt: "Vegan Seguro", es: "Vegano Seguro", en: "Vegan Safe", fr: "Végan Sécurisé" },
    description: {
      pt: "Preparação com utensílios e tábuas exclusivas sem qualquer vestígio de origem animal.",
      es: "Preparación con utensilios y tablas exclusivas sin restos de origen animal.",
      en: "Prepared with exclusive plant-based utensils and boards with zero animal traces.",
      fr: "Préparation avec ustensiles exclusifs sans aucun produit d'origine animale."
    },
    badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-300"
  },
  {
    id: "lactose_free_safe",
    icon: "🥛",
    label: { pt: "Sem Lactose (Dairy-Free Safe)", es: "Sin Lactosa (Dairy-Free Safe)", en: "Dairy-Free / Lactose-Free Safe", fr: "Sans Lactose Sécurisé" },
    shortLabel: { pt: "Sem Lactose", es: "Sin Lactosa", en: "Dairy-Free", fr: "Sans Lactose" },
    description: {
      pt: "Isolamento estrito de ingredientes lácteos durante o pré-preparo e confeção.",
      es: "Aislamiento estricto de ingredientes lácteos durante la preparación y cocción.",
      en: "Strict isolation of dairy products during preparation and cooking.",
      fr: "Isolation stricte des produits laitiers durant la préparation."
    },
    badgeClass: "bg-sky-50 text-sky-900 border-sky-300"
  },
  {
    id: "kosher_prepared",
    icon: "✡️",
    label: { pt: "Preparação Kosher Friendly", es: "Preparación Kosher Friendly", en: "Kosher Friendly Preparation", fr: "Préparation Kosher Friendly" },
    shortLabel: { pt: "Kosher", es: "Kosher", en: "Kosher", fr: "Casher" },
    description: {
      pt: "Cumprimento rigoroso das regras de separação entre carnes e laticínios.",
      es: "Cumplimiento estricto de las reglas de separación entre carnes y lácteos.",
      en: "Strict compliance with kosher separation rules between meat and dairy.",
      fr: "Respect strict des règles de séparation entre viandes et produits laitiers."
    },
    badgeClass: "bg-blue-50 text-blue-900 border-blue-300"
  },
  {
    id: "halal_certified",
    icon: "☪️",
    label: { pt: "Preparação Halal Certified", es: "Preparación Halal Certificada", en: "Halal Certified Preparation", fr: "Préparation Halal Certifiée" },
    shortLabel: { pt: "Halal", es: "Halal", en: "Halal", fr: "Halal" },
    description: {
      pt: "Ingredientes com proveniência Halal certificada e ausência de álcool ou suíno.",
      es: "Ingredientes de procedencia Halal certificada y ausencia de alcohol o cerdo.",
      en: "Certified Halal ingredient sourcing with zero alcohol or pork cross-contact.",
      fr: "Ingrédients certifiés Halal sans alcool ni porc."
    },
    badgeClass: "bg-teal-50 text-teal-900 border-teal-300"
  },
  {
    id: "nut_free_protocol",
    icon: "🥜",
    label: { pt: "Protocolo Anti-Alergias Frutos Secos", es: "Protocolo Anti-Alergias Frutos Secos", en: "Nut-Free Safety Protocol", fr: "Protocole Anti-Allergies Fruits à Coque" },
    shortLabel: { pt: "Nut-Free Safe", es: "Nut-Free Safe", en: "Nut-Free Safe", fr: "Sans Fruits à Coque" },
    description: {
      pt: "Cozinha estéril sem frutos de casca rija ou amendoim para prevenção de anafilaxia.",
      es: "Cocina estéril sin frutos secos o cacahuetes para prevención de anafilaxia.",
      en: "Sterile kitchen environment free of tree nuts or peanuts to prevent severe allergies.",
      fr: "Environnement sans fruits à coque ni arachides pour prévenir les allergies graves."
    },
    badgeClass: "bg-orange-50 text-orange-900 border-orange-300"
  }
];
