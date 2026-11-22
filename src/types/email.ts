export type EmailEventType =
  | 'welcome_client'
  | 'chef_registration'
  | 'booking_created_client'
  | 'booking_created_chef'
  | 'booking_confirmed_client'
  | 'booking_confirmed_chef'
  | 'payment_confirmed_client'
  | 'booking_cancelled_client'
  | 'booking_cancelled_chef'
  | 'booking_reminder_client'
  | 'booking_reminder_chef';

export type EmailEventStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface EmailEventRecord {
  id: string;
  user_id?: string | null;
  booking_id?: string | null;
  recipient_email: string;
  recipient_name?: string | null;
  email_type: EmailEventType;
  status: EmailEventStatus;
  provider: 'resend' | 'smtp' | 'emulated';
  provider_message_id?: string | null;
  subject: string;
  sent_at?: string | null;
  failed_at?: string | null;
  error_message?: string | null;
  created_at: string;
  idempotency_key: string;
  metadata?: Record<string, any>;
}

export interface EmailPayload {
  emailType: EmailEventType;
  userId?: string;
  bookingId?: string;
  recipientEmail: string;
  recipientName?: string;
  language?: 'pt' | 'en' | 'fr' | 'es';
  data: {
    clientName?: string;
    cookName?: string;
    experienceName?: string;
    date?: string;
    time?: string;
    guests?: number;
    address?: string;
    totalAmount?: number | string;
    pin?: string;
    cancellationReason?: string;
    cancelledBy?: 'client' | 'cook' | 'admin';
    reminderType?: '24h' | '1h' | 'general';
    paymentMethod?: string;
    paymentRef?: string;
    actionUrl?: string;
    customMessage?: string;
  };
}

export interface SendEmailResult {
  success: boolean;
  eventId?: string;
  status: EmailEventStatus;
  provider: 'resend' | 'smtp' | 'emulated';
  providerMessageId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}
