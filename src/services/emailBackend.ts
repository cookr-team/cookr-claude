import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { EmailEventType, EmailPayload, EmailEventRecord, SendEmailResult } from '../types/email';
import { renderEmail, SupportedLanguage } from '../templates/transactionalEmails';

// -------------------------------------------------------------
// CONFIGURATION & CLIENT INITIALIZATION
// -------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), 'data');
const EMAIL_LOGS_FILE = path.join(DATA_DIR, 'email_events.json');

// Ensure local persistence directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[EmailBackend] Notice on data directory creation:', e);
}

// Resend Configuration
const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const cookrFromEmail = process.env.COOKR_FROM_EMAIL || 'Cookr <onboarding@resend.dev>';

// Supabase Server Client
const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://sirwzxcdnakhmxczfvth.supabase.co';
const sanitizedSupabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServerClient = createClient(sanitizedSupabaseUrl, supabaseAnonKey || 'placeholder-key', {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Helper to configure SMTP Transporter fallback
function getSmtpTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass || user.includes('your-email') || pass.includes('your-app-specific')) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

// -------------------------------------------------------------
// LOCAL EVENTS STORE (IN-MEMORY & DISK PERSISTENCE)
// -------------------------------------------------------------
let inMemoryEvents: EmailEventRecord[] = [];

// Load initial events from disk if available
try {
  if (fs.existsSync(EMAIL_LOGS_FILE)) {
    const raw = fs.readFileSync(EMAIL_LOGS_FILE, 'utf-8');
    inMemoryEvents = JSON.parse(raw);
  }
} catch {
  inMemoryEvents = [];
}

function saveEventsToDisk() {
  try {
    fs.writeFileSync(EMAIL_LOGS_FILE, JSON.stringify(inMemoryEvents.slice(0, 1000), null, 2), 'utf-8');
  } catch (err) {
    console.warn('[EmailBackend] Could not persist email logs to disk:', err);
  }
}

// -------------------------------------------------------------
// DATABASE SYNC HELPER (SUPABASE + LOCAL CACHE)
// -------------------------------------------------------------
async function logEmailEvent(event: EmailEventRecord): Promise<void> {
  // 1. Update in-memory / disk cache
  const existingIdx = inMemoryEvents.findIndex((e) => e.id === event.id || e.idempotency_key === event.idempotency_key);
  if (existingIdx >= 0) {
    inMemoryEvents[existingIdx] = { ...inMemoryEvents[existingIdx], ...event };
  } else {
    inMemoryEvents.unshift(event);
  }
  saveEventsToDisk();

  // 2. Try to persist to Supabase public.email_events table if available
  try {
    const { error } = await supabaseServerClient
      .from('email_events')
      .upsert(
        {
          id: event.id,
          user_id: event.user_id || null,
          booking_id: event.booking_id || null,
          recipient_email: event.recipient_email,
          recipient_name: event.recipient_name || null,
          email_type: event.email_type,
          status: event.status,
          provider: event.provider,
          provider_message_id: event.provider_message_id || null,
          subject: event.subject,
          sent_at: event.sent_at || null,
          failed_at: event.failed_at || null,
          error_message: event.error_message || null,
          idempotency_key: event.idempotency_key,
          metadata: event.metadata || {},
          created_at: event.created_at,
        },
        { onConflict: 'idempotency_key' }
      );

    if (error && !error.message?.includes('schema cache')) {
      console.warn('[EmailBackend] Supabase log insert notice:', error.message);
    }
  } catch (dbErr) {
    // Graceful fallback to local cache
  }
}

// -------------------------------------------------------------
// MAIN TRANSACTIONAL EMAIL DISPATCHER
// -------------------------------------------------------------
export async function dispatchTransactionalEmail(payload: EmailPayload): Promise<SendEmailResult> {
  const {
    emailType,
    userId,
    bookingId,
    recipientEmail,
    recipientName,
    language = 'pt',
  } = payload;

  if (!recipientEmail || !emailType) {
    return {
      success: false,
      status: 'failed',
      provider: 'emulated',
      error: 'recipientEmail and emailType are required.',
    };
  }

  const sanitizedEmail = recipientEmail.toLowerCase().trim();

  // SECTION 16: IDEMPOTENCY CHECK
  // Unique idempotency key based on booking/user, email type, and recipient
  const idempotencyKey = `${bookingId || userId || 'global'}_${emailType}_${sanitizedEmail}`;

  // 1. Check local cache for existing sent record
  const existingLocal = inMemoryEvents.find(
    (e) => e.idempotency_key === idempotencyKey && e.status === 'sent'
  );
  if (existingLocal) {
    return {
      success: true,
      skipped: true,
      reason: 'Idempotent duplicate: this email event was already successfully sent.',
      eventId: existingLocal.id,
      status: 'sent',
      provider: existingLocal.provider,
      providerMessageId: existingLocal.provider_message_id || undefined,
    };
  }

  // 2. Check Supabase for existing sent record
  try {
    const { data: dbExisting } = await supabaseServerClient
      .from('email_events')
      .select('id, status, provider_message_id, provider')
      .eq('idempotency_key', idempotencyKey)
      .eq('status', 'sent')
      .maybeSingle();

    if (dbExisting) {
      return {
        success: true,
        skipped: true,
        reason: 'Idempotent duplicate: this email event was already successfully sent in Supabase.',
        eventId: dbExisting.id,
        status: 'sent',
        provider: dbExisting.provider as any,
        providerMessageId: dbExisting.provider_message_id,
      };
    }
  } catch {
    // If Supabase table does not exist yet, continue with local cache
  }

  // SECTION 20 & 30: RENDER TEMPLATE (MULTILINGUAL)
  const rendered = renderEmail({
    ...payload,
    recipientEmail: sanitizedEmail,
    language: (language as SupportedLanguage) || 'pt',
  });

  const eventId = crypto.randomUUID();
  const now = new Date().toISOString();

  let provider: 'resend' | 'smtp' | 'emulated' = 'emulated';
  let providerMessageId: string | null = null;
  let status: 'sent' | 'failed' = 'sent';
  let errorMessage: string | null = null;

  // SECTION 1 & 2: DISPATCH VIA RESEND API
  if (resend) {
    try {
      provider = 'resend';
      const resendRes = await resend.emails.send({
        from: cookrFromEmail,
        to: [sanitizedEmail],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      if (resendRes.error) {
        status = 'failed';
        errorMessage = resendRes.error.message || JSON.stringify(resendRes.error);
        console.warn('[Resend API Error]', resendRes.error);
      } else {
        status = 'sent';
        providerMessageId = resendRes.data?.id || null;
        console.log(`[Resend Email Delivered] ID: ${providerMessageId} | Para: ${sanitizedEmail} | Tipo: ${emailType}`);
      }
    } catch (resendErr: any) {
      status = 'failed';
      errorMessage = resendErr?.message || 'Erro ao comunicar com a API do Resend';
      console.warn('[Resend Exception]', resendErr);
    }
  }

  // FALLBACK TO SMTP IF RESEND IS NOT CONFIGURED OR FAILED
  if (!resend || status === 'failed') {
    const smtpTransporter = getSmtpTransporter();
    if (smtpTransporter && status === 'failed') {
      try {
        console.log(`[Email Fallback] A tentar envio via SMTP para ${sanitizedEmail}...`);
        const smtpFrom = process.env.SMTP_FROM || cookrFromEmail;
        const info = await smtpTransporter.sendMail({
          from: smtpFrom,
          to: sanitizedEmail,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });
        provider = 'smtp';
        status = 'sent';
        providerMessageId = info.messageId;
        errorMessage = null;
        console.log(`[SMTP Email Fallback Delivered] ID: ${info.messageId}`);
      } catch (smtpErr: any) {
        console.warn('[SMTP Fallback Error]', smtpErr?.message);
      }
    } else if (!resend) {
      // EMULATION MODE (SAFE DEVELOPMENT FALLBACK)
      provider = 'emulated';
      status = 'sent'; // Mark as sent in dev/demo emulation so idempotent checks work
      errorMessage = 'RESEND_API_KEY não configurada no ficheiro .env. Email transacional registado e emulado nos logs do servidor.';
      console.log(`
========================================================================
📧 [COOKR EMAIL TRANSACIONAL EMULADO (RESEND_API_KEY NÃO DEFINIDA)]
========================================================================
Tipo: ${emailType}
Para: ${sanitizedEmail} (${recipientName || 'Sem nome'})
Assunto: ${rendered.subject}
Idioma: ${language}
Idempotency Key: ${idempotencyKey}
========================================================================
      `);
    }
  }

  // RECORD EVENT IN AUDIT LOGS (SECTION 15 & 24)
  const eventRecord: EmailEventRecord = {
    id: eventId,
    user_id: userId || null,
    booking_id: bookingId || null,
    recipient_email: sanitizedEmail,
    recipient_name: recipientName || null,
    email_type: emailType,
    status: status,
    provider: provider,
    provider_message_id: providerMessageId,
    subject: rendered.subject,
    sent_at: status === 'sent' ? now : null,
    failed_at: status === 'failed' ? now : null,
    error_message: errorMessage,
    idempotency_key: idempotencyKey,
    metadata: {
      language,
      ...payload.data,
    },
    created_at: now,
  };

  await logEmailEvent(eventRecord);

  return {
    success: status === 'sent',
    eventId,
    status,
    provider,
    providerMessageId: providerMessageId || undefined,
    error: errorMessage || undefined,
  };
}

// -------------------------------------------------------------
// AUDIT & DIAGNOSTIC GETTERS / RETRY (SECTION 19, 32, 33)
// -------------------------------------------------------------
export async function getEmailEvents(limit = 100): Promise<EmailEventRecord[]> {
  // 1. Try reading from Supabase
  try {
    const { data, error } = await supabaseServerClient
      .from('email_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data as EmailEventRecord[];
    }
  } catch {
    // Table not found in Supabase yet
  }

  // 2. Return from in-memory / disk cache
  return inMemoryEvents.slice(0, limit);
}

export async function retryEmailEvent(eventId: string): Promise<SendEmailResult> {
  const allEvents = await getEmailEvents(500);
  const target = allEvents.find((e) => e.id === eventId);

  if (!target) {
    return {
      success: false,
      status: 'failed',
      provider: 'emulated',
      error: `Email event with ID ${eventId} was not found.`,
    };
  }

  // Re-dispatch using stored metadata
  const payload: EmailPayload = {
    emailType: target.email_type,
    userId: target.user_id || undefined,
    bookingId: target.booking_id || undefined,
    recipientEmail: target.recipient_email,
    recipientName: target.recipient_name || undefined,
    language: (target.metadata?.language as SupportedLanguage) || 'pt',
    data: target.metadata || {},
  };

  // Force re-attempt by allowing retry
  return await dispatchTransactionalEmail(payload);
}

export async function sendTestEmail(
  recipientEmail: string,
  emailType: EmailEventType = 'welcome_client',
  language: SupportedLanguage = 'pt'
): Promise<SendEmailResult> {
  const dummyPayload: EmailPayload = {
    emailType,
    recipientEmail,
    recipientName: 'Utilizador de Teste',
    language,
    data: {
      clientName: 'Manuel Silva',
      cookName: 'Chef Maria Garcia',
      experienceName: 'Degustação Atlântica de 5 Momentos',
      date: '15 de Outubro de 2026',
      time: '20:00',
      guests: 4,
      address: 'Avenida da Liberdade 120, Lisboa',
      totalAmount: 320,
      pin: '7412',
      cancellationReason: 'Ajuste de agenda acordado entre o cliente e o Chef.',
      reminderType: '24h',
    },
  };

  return await dispatchTransactionalEmail(dummyPayload);
}

export function getEmailConfigStatus() {
  const smtpConfigured = Boolean(
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    !process.env.SMTP_USER.includes('your-email') &&
    !process.env.SMTP_PASS.includes('your-app-specific')
  );

  const resendConfigured = Boolean(resendApiKey && resendApiKey.startsWith('re_'));
  const resendMasked = resendApiKey
    ? `${resendApiKey.slice(0, 5)}...${resendApiKey.slice(-4)}`
    : 'Não configurado';

  let defaultProvider = 'emulated';
  if (resendConfigured) defaultProvider = 'resend';
  else if (smtpConfigured) defaultProvider = 'smtp';

  return {
    resendConfigured,
    resendMasked,
    fromEmail: cookrFromEmail,
    smtpConfigured,
    defaultProvider,
    appUrl: process.env.APP_URL || 'https://cookr.pt',
  };
}
