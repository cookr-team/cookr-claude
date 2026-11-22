// ==============================================================================
// COOKR SUPABASE EDGE FUNCTION: send-email
// ==============================================================================
// Deploy command: supabase functions deploy send-email --no-verify-jwt
// Required Secrets:
// - RESEND_API_KEY
// - COOKR_FROM_EMAIL (e.g., "Cookr <hello@cookr.pt>" or "Cookr <onboarding@resend.dev>")
// - APP_URL (e.g., "https://cookr.pt")
// - SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY (injected by Supabase)
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailPayload {
  emailType: string;
  userId?: string;
  bookingId?: string;
  recipientEmail: string;
  recipientName?: string;
  language?: string;
  data: Record<string, any>;
  idempotencyKey?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const cookrFromEmail = Deno.env.get("COOKR_FROM_EMAIL") || "Cookr <onboarding@resend.dev>";
    const appUrl = Deno.env.get("APP_URL") || "https://cookr.pt";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

    const payload: EmailPayload = await req.json();

    const {
      emailType,
      userId,
      bookingId,
      recipientEmail,
      recipientName,
      language = "pt",
      data = {},
    } = payload;

    if (!recipientEmail || !emailType) {
      return new Response(
        JSON.stringify({ error: "recipientEmail and emailType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Idempotency Key
    const idempotencyKey = payload.idempotencyKey || `${bookingId || userId || 'global'}_${emailType}_${recipientEmail.toLowerCase().trim()}`;

    // 2. Initialize Supabase Admin Client for logging and idempotency check
    let supabase: any = null;
    if (supabaseUrl && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    }

    if (supabase) {
      const { data: existing } = await supabase
        .from("email_events")
        .select("id, status, provider_message_id")
        .eq("idempotency_key", idempotencyKey)
        .eq("status", "sent")
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            reason: "Idempotent duplicate: email already successfully sent.",
            eventId: existing.id,
            providerMessageId: existing.provider_message_id,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Render Subject and Content
    const titles: Record<string, string> = {
      welcome_client: "Bem-vindo à Cookr — A sua conta foi criada!",
      chef_registration: "Candidatura de Chef Recebida — Cookr",
      booking_created_client: `Pedido de Reserva Registado — ${data.experienceName || 'Cookr'}`,
      booking_created_chef: `Novo Pedido de Reserva — ${data.clientName || 'Cliente'}`,
      booking_confirmed_client: `Reserva Confirmada! Preparação Gourmet com o Chef ${data.cookName || 'Privado'} 🍽️`,
      booking_confirmed_chef: `Reserva Agendada no seu Calendário — ${data.clientName || 'Cliente'}`,
      payment_confirmed_client: `Pagamento Confirmado — Cookr`,
      booking_cancelled_client: `Atualização de Reserva: Cancelada (${data.experienceName || 'Cookr'})`,
      booking_cancelled_chef: `Reserva Cancelada no seu Calendário — ${data.clientName || 'Cliente'}`,
      booking_reminder_client: `Lembrete: A sua experiência gastronómica é amanhã! ⏰`,
      booking_reminder_chef: `Lembrete: Serviço Agendado para Amanhã — ${data.clientName || 'Cliente'} ⏰`,
    };

    const badges: Record<string, { text: string; bg: string; color: string }> = {
      welcome_client: { text: "Boas-Vindas", bg: "#f0fdf4", color: "#16a34a" },
      chef_registration: { text: "Candidatura Recebida", bg: "#eff6ff", color: "#2563eb" },
      booking_created_client: { text: "Pedido Registado", bg: "#fff7ed", color: "#ea580c" },
      booking_created_chef: { text: "Novo Pedido", bg: "#fff7ed", color: "#ea580c" },
      booking_confirmed_client: { text: "Reserva Confirmada", bg: "#f0fdf4", color: "#16a34a" },
      booking_confirmed_chef: { text: "Reserva Confirmada", bg: "#f0fdf4", color: "#16a34a" },
      payment_confirmed_client: { text: "Pagamento Concluído", bg: "#f0fdf4", color: "#16a34a" },
      booking_cancelled_client: { text: "Reserva Cancelada", bg: "#fef2f2", color: "#dc2626" },
      booking_cancelled_chef: { text: "Reserva Cancelada", bg: "#fef2f2", color: "#dc2626" },
      booking_reminder_client: { text: "Lembrete 24 Horas", bg: "#fefce8", color: "#ca8a04" },
      booking_reminder_chef: { text: "Lembrete 24 Horas", bg: "#fefce8", color: "#ca8a04" },
    };

    const subjectPrefix = titles[emailType] || `Notificação Cookr — ${emailType}`;
    const badge = badges[emailType] || { text: "Notificação", bg: "#f8fafc", color: "#64748b" };

    const ctaText = emailType.startsWith("booking_") ? "Ver Reserva" : "Aceder à Cookr";
    const ctaUrl = bookingId ? `${appUrl}/#agenda` : `${appUrl}/`;

    // Render details table if booking data is present
    let detailsHtml = "";
    if (data.date || data.cookName || data.clientName || data.experienceName || data.totalAmount) {
      const rows: string[] = [];
      if (data.experienceName) rows.push(`<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Experiência</td><td style="padding: 8px 0; font-weight: bold; color: #0f172a; font-size: 13px; text-align: right;">${data.experienceName}</td></tr>`);
      if (data.cookName) rows.push(`<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Chef Privado</td><td style="padding: 8px 0; font-weight: bold; color: #ea580c; font-size: 13px; text-align: right;">${data.cookName}</td></tr>`);
      if (data.clientName) rows.push(`<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Cliente</td><td style="padding: 8px 0; font-weight: bold; color: #0f172a; font-size: 13px; text-align: right;">${data.clientName}</td></tr>`);
      if (data.date) rows.push(`<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Data do Serviço</td><td style="padding: 8px 0; font-weight: bold; color: #0f172a; font-size: 13px; text-align: right;">${data.date} ${data.time ? `às ${data.time}` : ''}</td></tr>`);
      if (data.guests) rows.push(`<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Número de Convidados</td><td style="padding: 8px 0; font-weight: bold; color: #0f172a; font-size: 13px; text-align: right;">${data.guests} pessoas</td></tr>`);
      if (data.address) rows.push(`<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Localização</td><td style="padding: 8px 0; font-weight: bold; color: #0f172a; font-size: 13px; text-align: right;">${data.address}</td></tr>`);
      if (data.cancellationReason) rows.push(`<tr><td style="padding: 8px 0; color: #dc2626; font-size: 13px;">Motivo do Cancelamento</td><td style="padding: 8px 0; font-weight: bold; color: #dc2626; font-size: 13px; text-align: right;">${data.cancellationReason}</td></tr>`);
      if (data.totalAmount) rows.push(`<tr><td style="padding: 12px 0 0 0; color: #0f172a; font-size: 14px; font-weight: bold; border-top: 1px dashed #cbd5e1;">Valor Total</td><td style="padding: 12px 0 0 0; font-weight: 900; color: #0f172a; font-size: 16px; text-align: right; border-top: 1px dashed #cbd5e1;">${Number(data.totalAmount).toFixed(2)} €</td></tr>`);

      detailsHtml = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h4 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #475569;">
            Resumo dos Detalhes
          </h4>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            ${rows.join("")}
          </table>
        </div>
      `;
    }

    const htmlBody = `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subjectPrefix}</title>
      </head>
      <body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15,23,42,0.06);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center;">
            <a href="${appUrl}" style="text-decoration: none; display: inline-block;">
              <h1 style="color: #ea580c; margin: 0; font-size: 30px; font-weight: 900; letter-spacing: -0.04em;">
                COOK<span style="color: #ffffff;">R</span>
              </h1>
            </a>
            <p style="color: #94a3b8; font-size: 11px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 800;">
              Alta Gastronomia &amp; Chefs Privados
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 36px 32px;">
            <div style="display: inline-block; padding: 6px 14px; background-color: ${badge.bg}; border-radius: 20px; color: ${badge.color}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 20px;">
              ${badge.text}
            </div>

            <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.02em;">
              Olá, ${recipientName || 'Estimado Utilizador'}!
            </h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
              ${subjectPrefix}
            </p>

            ${detailsHtml}

            <!-- CTA -->
            <div style="text-align: center; margin: 32px 0 16px 0;">
              <a href="${ctaUrl}" style="background-color: #ea580c; color: #ffffff; padding: 15px 36px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35);">
                ${ctaText}
              </a>
            </div>

            <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5; text-align: center;">
              A equipa Cookr está ao seu dispor para qualquer questão gastronómica ou de agendamento.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.6;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #64748b;">
              Cookr Portugal — Elite Gastronómica em sua casa.
            </p>
            <p style="margin: 0; font-size: 11px;">
              Este é um email transacional gerado automaticamente relacionado com a sua conta ou reserva.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 4. Send via Resend API
    let providerMessageId: string | null = null;
    let providerStatus: "sent" | "failed" | "emulated" = "sent";
    let errorMessage: string | null = null;

    if (resendApiKey) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: cookrFromEmail,
          to: [recipientEmail],
          subject: subjectPrefix,
          html: htmlBody,
        }),
      });

      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        providerStatus = "failed";
        errorMessage = resendData.message || JSON.stringify(resendData);
      } else {
        providerMessageId = resendData.id;
      }
    } else {
      providerStatus = "emulated";
      errorMessage = "RESEND_API_KEY não configurada no ambiente. Email registado em modo de emulação.";
    }

    // 5. Persist Log Event in Supabase
    let eventId = crypto.randomUUID();
    if (supabase) {
      try {
        const { data: record, error: insertErr } = await supabase
          .from("email_events")
          .upsert({
            id: eventId,
            user_id: userId || null,
            booking_id: bookingId || null,
            recipient_email: recipientEmail,
            recipient_name: recipientName || null,
            email_type: emailType,
            status: providerStatus === "emulated" ? "sent" : providerStatus,
            provider: resendApiKey ? "resend" : "emulated",
            provider_message_id: providerMessageId,
            subject: subjectPrefix,
            sent_at: providerStatus === "sent" || providerStatus === "emulated" ? new Date().toISOString() : null,
            failed_at: providerStatus === "failed" ? new Date().toISOString() : null,
            error_message: errorMessage,
            idempotency_key: idempotencyKey,
            metadata: { language, ...data },
          }, { onConflict: "idempotency_key" })
          .select("id")
          .maybeSingle();

        if (record?.id) eventId = record.id;
      } catch (logErr) {
        console.warn("[Edge Function Log Note]", logErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: providerStatus !== "failed",
        eventId,
        status: providerStatus,
        provider: resendApiKey ? "resend" : "emulated",
        providerMessageId,
        error: errorMessage,
      }),
      {
        status: providerStatus === "failed" ? 500 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error in send-email Edge Function" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
