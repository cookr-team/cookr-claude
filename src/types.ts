export enum UserRole {
  CLIENT = 'client',
  COOK = 'cook',
  ADMIN = 'admin'
}

export enum UserStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  ACTIVE = 'active',
  SUSPENDED = 'suspended'
}

export enum BookingStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  CANCELLED_PARTIAL_REFUND = 'cancelled_partial_refund',
  REJECTED = 'rejected',
  RESCHEDULE_REQUESTED = 'reschedule_requested',
  QUOTE_REQUESTED = 'quote_requested',
  EXPIRED = 'expired'
}

export interface CertificationOrAward {
  id: string;
  title: string;
  issuer: string;
  year?: string;
  type: 'certification' | 'award' | 'training';
  description?: string;
  verified?: boolean;
}

export interface ChefFAQItem {
  id: string;
  question: string;
  answer: string;
  category?: 'geral' | 'alergias' | 'logistica' | 'ingredientes';
}

export interface User {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  role: UserRole;
  status: UserStatus;
  avatar_url?: string;
  cover_url?: string;
  especialidades?: string[];
  localizacao?: string;
  cidade?: string;
  morada?: string;
  experiencia?: number;
  approvedByAdmin?: boolean;
  bypass_haccp_restrictions?: boolean;
  disponibilidade?: Record<string, string[]>;
  addresses?: { 
    id?: string; 
    label?: string; 
    address?: string; 
    door_number?: string;
    floor?: string;
    zip_code?: string;
    city: string; 
    isDefault: boolean 
  }[];
  admin_notes?: string;
  rating?: number;
  total_avaliacoes?: number;
  total_reservas?: number;
  biografia?: string;
  idiomas?: string[];
  equipamento?: string[];
  diferenciais?: string[];
  certifications_and_awards?: CertificationOrAward[];
  faqs?: ChefFAQItem[];
  sustainability_badges?: string[];
  sustainability_notes?: string;
  allergen_certifications?: string[];
  allergen_notes?: string;
  portfolio_images?: string[];
  nif?: string;
  iban?: string;
  fiscal_name?: string;
  billing_address?: string;
  billing_street?: string;
  billing_number?: string;
  billing_floor?: string;
  billing_zip?: string;
  billing_city?: string;
  billing_country?: string;
  zip_code?: string;
  dietary_restrictions?: string[];
  cuisine_preferences?: string[];
  precoMedio?: number;
  isAvailable?: boolean;
  is_available?: boolean;
  is_chef?: boolean;
  offers_wine_pairing?: boolean;
  kitchenNotes?: string;
  favoriteChefIds?: string[];
  loyalty_points?: number;
  badges?: string[];
  created_at?: string;
  language?: 'pt' | 'en' | 'fr' | 'es';
  notification_settings?: {
    email_enabled?: boolean;
    push_enabled?: boolean;
    sms_enabled?: boolean;
    booking_updates?: boolean;
    booking_reminders?: boolean;
    chef_messages?: boolean;
    marketing_offers?: boolean;
    system_alerts?: boolean;
  };
}

export interface Booking {
  id: string;
  cookId: string;
  clientId: string;
  clientName: string;
  cookName: string;
  data: string;
  status: BookingStatus;
  menu_selected: string;
  morada: string;
  valorTotal: string | number;
  is_meal_prep?: boolean;
  menu_type?: 'experience' | 'dish' | 'daily';
  is_finalizing?: boolean;
  service_pin?: string;
  hora?: string;
  numPessoas?: number;
  createdAt?: string;
  restrictions?: string[];
  kitchenNotes?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  proposed_date?: string;
  proposed_time?: string;
  gorjeta?: number;
  wine_pairing?: {
    nome: string;
    preco_por_pessoa: number;
    produtor?: string;
  } | null;
  guests?: { name: string; allergies: string[]; customAllergy?: string }[];
  guestsSummary?: string;
  splitBill?: {
    emails: string[];
    paidEmails: string[];
    status: 'pending' | 'completed';
    shareAmount: number;
  };
  reminder_24h_sent?: boolean;
  reminder_2h_sent?: boolean;
}

export interface ChefRecipe {
  id: string;
  cookId: string;
  nome: string;
  imageUrl: string;
  descricao?: string;
  isPopular?: boolean;
  preco?: number;
}

export interface MenuItem {
  id: string;
  cookId?: string;
  cook_id?: string;
  nome: string;
  descricao: string;
  preco: number;
  type: 'experience' | 'dish';
  imageUrl: string;
  image_url?: string;
  gallery?: string[];
  gallery_urls?: string[];
  courses?: { tipo: string; conteudo: string; imageUrl?: string; image_url?: string; preco_adicional?: number }[];
  tags?: string[];
  is_meal_prep?: boolean;
  pack_size?: number;
  delivery_type?: 'delivery' | 'pickup' | 'both';
  dietary_tags?: string[];
  calories?: number;
  cuisine_type?: string;
  dynamic_pricing?: {
    enabled: boolean;
    weekend_surcharge?: number; // e.g. percent (like 15) or fixed value
    group_discount?: number;     // percent (like 10)
    min_group_size?: number;     // e.g. 5
  };
  views_count?: number;
  viewsCount?: number;
  isAvailable?: boolean;
  adminNotes?: string;
  admin_notes?: string;
}

export interface Review {
  id: string;
  cookId: string;
  cook_id?: string;
  clientId?: string;
  client_id?: string;
  clientName: string;
  rating: number;
  comment: string;
  bookingId?: string;
  created_at?: string;
  isFlagged?: boolean;
  isHidden?: boolean;
  flaggedReason?: string;
}

export interface WaitlistEntry {
  id: string;
  cook_id: string;
  client_id: string;
  preferred_date: string;
  created_at: string;
}

export interface LoyaltyHistory {
  id: string;
  user_id: string;
  points: number;
  type: 'earn' | 'spend';
  description: string;
  created_at: string;
}

export interface HaccpChecklist {
  id: string;
  cookId: string;
  cookName: string;
  bookingId: string;
  clientName: string;
  date: string;
  transportTemp: number;
  transportIsothermal: boolean;
  hygieneHands: boolean;
  hygieneHair: boolean;
  hygieneUniform: boolean;
  sanitizedUtensils: boolean;
  sanitizedSurfaces: boolean;
  separationRawCoo: boolean;
  washedIngredients: boolean;
  observations?: string;
  signatureChecked: boolean;
  createdAt: string;
}

export interface HaccpLog {
  id: string;
  cookId: string;
  cookName?: string;
  bookingId?: string;
  clientName?: string;
  logType: 'before_service' | 'after_service';
  date: string;
  temperaturesOk: boolean;
  surfacesSanitized: boolean;
  personalHygieneOk: boolean;
  wasteDisposed: boolean;
  pestControlOk: boolean;
  rawReadySeparation: boolean;
  observations?: string;
  createdAt: string;
}
