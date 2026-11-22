import { Booking, User } from '../types';
import { EmailEventType, EmailPayload, EmailEventRecord, SendEmailResult } from '../types/email';

class EmailService {
  private apiUrl: string = '/api/email';

  /**
   * Dispatch a transactional email payload to the server / edge function.
   * Completely failsafe and non-blocking: will never throw and crash the caller.
   */
  async dispatch(payload: EmailPayload): Promise<SendEmailResult> {
    try {
      const response = await fetch(`${this.apiUrl}/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('[EmailService] Resposta com erro do servidor:', errorData);
        return {
          success: false,
          status: 'failed',
          provider: 'emulated',
          error: errorData.error || `HTTP ${response.status}`,
        };
      }

      const result: SendEmailResult = await response.json();
      return result;
    } catch (err: any) {
      console.warn('[EmailService] Falha de rede ou envio de email (opção não-bloqueante):', err?.message || err);
      return {
        success: false,
        status: 'failed',
        provider: 'emulated',
        error: err?.message || 'Erro de rede',
      };
    }
  }

  /**
   * 1. CLIENT — Welcome / Account Created
   */
  async sendWelcomeClient(user: User): Promise<void> {
    if (!user || !user.email) return;

    const payload: EmailPayload = {
      emailType: 'welcome_client',
      userId: user.id,
      recipientEmail: user.email.toLowerCase().trim(),
      recipientName: user.nome,
      language: user.language || 'pt',
      data: {
        clientName: user.nome,
      },
    };

    // Non-blocking fire-and-forget
    this.dispatch(payload).catch((err) =>
      console.warn('[EmailService] sendWelcomeClient log:', err)
    );
  }

  /**
   * 2. CHEF — Registration Received (Under Review)
   */
  async sendChefRegistration(chef: User): Promise<void> {
    if (!chef || !chef.email) return;

    const payload: EmailPayload = {
      emailType: 'chef_registration',
      userId: chef.id,
      recipientEmail: chef.email.toLowerCase().trim(),
      recipientName: chef.nome,
      language: chef.language || 'pt',
      data: {
        cookName: chef.nome,
      },
    };

    this.dispatch(payload).catch((err) =>
      console.warn('[EmailService] sendChefRegistration log:', err)
    );
  }

  /**
   * 3 & 4. NEW BOOKING CREATED
   * Sends:
   * - booking_created_client to Client
   * - booking_created_chef to Chef
   */
  async sendBookingCreated(
    booking: Booking,
    client?: { email?: string; nome?: string; language?: string } | null,
    cook?: { email?: string; nome?: string; language?: string } | null
  ): Promise<void> {
    if (!booking) return;

    const clientEmail = client?.email;
    const cookEmail = cook?.email;

    const bookingData = {
      clientName: booking.clientName || client?.nome || 'Cliente',
      cookName: booking.cookName || cook?.nome || 'Chef Privado',
      experienceName: booking.menu_selected || 'Ritual Gastronómico',
      date: booking.data,
      time: booking.hora,
      guests: booking.numPessoas,
      address: booking.morada,
      totalAmount: booking.valorTotal,
      pin: booking.service_pin,
    };

    // 1. Email to Client
    if (clientEmail) {
      const clientPayload: EmailPayload = {
        emailType: 'booking_created_client',
        userId: booking.clientId,
        bookingId: booking.id,
        recipientEmail: clientEmail.toLowerCase().trim(),
        recipientName: bookingData.clientName,
        language: (client?.language as any) || 'pt',
        data: bookingData,
      };
      this.dispatch(clientPayload).catch((e) =>
        console.warn('[EmailService] sendBookingCreated (client) note:', e)
      );
    }

    // 2. Email to Chef
    if (cookEmail) {
      const chefPayload: EmailPayload = {
        emailType: 'booking_created_chef',
        userId: booking.cookId,
        bookingId: booking.id,
        recipientEmail: cookEmail.toLowerCase().trim(),
        recipientName: bookingData.cookName,
        language: (cook?.language as any) || 'pt',
        data: bookingData,
      };
      this.dispatch(chefPayload).catch((e) =>
        console.warn('[EmailService] sendBookingCreated (chef) note:', e)
      );
    }
  }

  /**
   * 5 & 6. BOOKING CONFIRMED (Chef accepted)
   * Sends:
   * - booking_confirmed_client to Client
   * - booking_confirmed_chef to Chef
   */
  async sendBookingConfirmed(
    booking: Booking,
    client?: { email?: string; nome?: string; language?: string } | null,
    cook?: { email?: string; nome?: string; language?: string } | null
  ): Promise<void> {
    if (!booking) return;

    const clientEmail = client?.email;
    const cookEmail = cook?.email;

    const bookingData = {
      clientName: booking.clientName || client?.nome || 'Cliente',
      cookName: booking.cookName || cook?.nome || 'Chef Privado',
      experienceName: booking.menu_selected || 'Ritual Gastronómico',
      date: booking.data,
      time: booking.hora,
      guests: booking.numPessoas,
      address: booking.morada,
      totalAmount: booking.valorTotal,
      pin: booking.service_pin,
    };

    // 1. Email to Client
    if (clientEmail) {
      const clientPayload: EmailPayload = {
        emailType: 'booking_confirmed_client',
        userId: booking.clientId,
        bookingId: booking.id,
        recipientEmail: clientEmail.toLowerCase().trim(),
        recipientName: bookingData.clientName,
        language: (client?.language as any) || 'pt',
        data: bookingData,
      };
      this.dispatch(clientPayload).catch((e) =>
        console.warn('[EmailService] sendBookingConfirmed (client) note:', e)
      );
    }

    // 2. Email to Chef
    if (cookEmail) {
      const chefPayload: EmailPayload = {
        emailType: 'booking_confirmed_chef',
        userId: booking.cookId,
        bookingId: booking.id,
        recipientEmail: cookEmail.toLowerCase().trim(),
        recipientName: bookingData.cookName,
        language: (cook?.language as any) || 'pt',
        data: bookingData,
      };
      this.dispatch(chefPayload).catch((e) =>
        console.warn('[EmailService] sendBookingConfirmed (chef) note:', e)
      );
    }
  }

  /**
   * 7. PAYMENT CONFIRMED
   */
  async sendPaymentConfirmed(
    booking: Booking,
    client?: { email?: string; nome?: string; language?: string } | null,
    cook?: { email?: string; nome?: string; language?: string } | null
  ): Promise<void> {
    if (!booking) return;
    const clientEmail = client?.email;
    if (!clientEmail) return;

    const payload: EmailPayload = {
      emailType: 'payment_confirmed_client',
      userId: booking.clientId,
      bookingId: booking.id,
      recipientEmail: clientEmail.toLowerCase().trim(),
      recipientName: booking.clientName || client?.nome,
      language: (client?.language as any) || 'pt',
      data: {
        clientName: booking.clientName || client?.nome || 'Cliente',
        cookName: booking.cookName || cook?.nome || 'Chef Privado',
        experienceName: booking.menu_selected || 'Ritual Gastronómico',
        date: booking.data,
        time: booking.hora,
        guests: booking.numPessoas,
        address: booking.morada,
        totalAmount: booking.valorTotal,
      },
    };

    this.dispatch(payload).catch((e) =>
      console.warn('[EmailService] sendPaymentConfirmed note:', e)
    );
  }

  /**
   * 8 & 9. BOOKING CANCELLED
   * Sends:
   * - booking_cancelled_client to Client
   * - booking_cancelled_chef to Chef
   */
  async sendBookingCancelled(
    booking: Booking,
    client?: { email?: string; nome?: string; language?: string } | null,
    cook?: { email?: string; nome?: string; language?: string } | null,
    reason?: string,
    cancelledBy?: 'client' | 'cook' | 'admin'
  ): Promise<void> {
    if (!booking) return;

    const clientEmail = client?.email;
    const cookEmail = cook?.email;

    const bookingData = {
      clientName: booking.clientName || client?.nome || 'Cliente',
      cookName: booking.cookName || cook?.nome || 'Chef Privado',
      experienceName: booking.menu_selected || 'Ritual Gastronómico',
      date: booking.data,
      time: booking.hora,
      guests: booking.numPessoas,
      address: booking.morada,
      totalAmount: booking.valorTotal,
      cancellationReason: reason || booking.cancellation_reason || 'Cancelamento solicitado.',
      cancelledBy: cancelledBy || 'client',
    };

    // Client cancellation notice
    if (clientEmail) {
      const clientPayload: EmailPayload = {
        emailType: 'booking_cancelled_client',
        userId: booking.clientId,
        bookingId: booking.id,
        recipientEmail: clientEmail.toLowerCase().trim(),
        recipientName: bookingData.clientName,
        language: (client?.language as any) || 'pt',
        data: bookingData,
      };
      this.dispatch(clientPayload).catch((e) =>
        console.warn('[EmailService] sendBookingCancelled (client) note:', e)
      );
    }

    // Chef cancellation notice
    if (cookEmail) {
      const chefPayload: EmailPayload = {
        emailType: 'booking_cancelled_chef',
        userId: booking.cookId,
        bookingId: booking.id,
        recipientEmail: cookEmail.toLowerCase().trim(),
        recipientName: bookingData.cookName,
        language: (cook?.language as any) || 'pt',
        data: bookingData,
      };
      this.dispatch(chefPayload).catch((e) =>
        console.warn('[EmailService] sendBookingCancelled (chef) note:', e)
      );
    }
  }

  /**
   * 10 & 11. BOOKING REMINDER (24h before event)
   */
  async sendBookingReminder(
    booking: Booking,
    client?: { email?: string; nome?: string; language?: string } | null,
    cook?: { email?: string; nome?: string; language?: string } | null,
    reminderType: '24h' | '1h' = '24h'
  ): Promise<void> {
    if (!booking) return;

    const clientEmail = client?.email;
    const cookEmail = cook?.email;

    const bookingData = {
      clientName: booking.clientName || client?.nome || 'Cliente',
      cookName: booking.cookName || cook?.nome || 'Chef Privado',
      experienceName: booking.menu_selected || 'Ritual Gastronómico',
      date: booking.data,
      time: booking.hora,
      guests: booking.numPessoas,
      address: booking.morada,
      totalAmount: booking.valorTotal,
      pin: booking.service_pin,
      reminderType,
    };

    if (clientEmail) {
      const clientPayload: EmailPayload = {
        emailType: 'booking_reminder_client',
        userId: booking.clientId,
        bookingId: booking.id,
        recipientEmail: clientEmail.toLowerCase().trim(),
        recipientName: bookingData.clientName,
        language: (client?.language as any) || 'pt',
        data: bookingData,
      };
      this.dispatch(clientPayload).catch((e) =>
        console.warn('[EmailService] sendBookingReminder (client) note:', e)
      );
    }

    if (cookEmail) {
      const chefPayload: EmailPayload = {
        emailType: 'booking_reminder_chef',
        userId: booking.cookId,
        bookingId: booking.id,
        recipientEmail: cookEmail.toLowerCase().trim(),
        recipientName: bookingData.cookName,
        language: (cook?.language as any) || 'pt',
        data: bookingData,
      };
      this.dispatch(chefPayload).catch((e) =>
        console.warn('[EmailService] sendBookingReminder (chef) note:', e)
      );
    }
  }

  /**
   * Fetch recent email events for Admin audit and diagnostics
   */
  async getEmailEvents(limit = 50): Promise<EmailEventRecord[]> {
    try {
      const res = await fetch(`${this.apiUrl}/events?limit=${limit}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.events || [];
    } catch {
      return [];
    }
  }

  /**
   * Retry a failed email event safely
   */
  async retryEmailEvent(eventId: string): Promise<SendEmailResult> {
    try {
      const res = await fetch(`${this.apiUrl}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        status: 'failed',
        provider: 'emulated',
        error: err.message || 'Erro ao reenviar',
      };
    }
  }

  /**
   * Diagnostic test email function (safe for development / admin)
   */
  async sendTestEmail(
    recipientEmail: string,
    emailType: EmailEventType = 'welcome_client',
    language: 'pt' | 'en' | 'fr' | 'es' = 'pt'
  ): Promise<SendEmailResult> {
    try {
      const res = await fetch(`${this.apiUrl}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail, emailType, language }),
      });
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        status: 'failed',
        provider: 'emulated',
        error: err.message || 'Erro no envio de teste',
      };
    }
  }

  /**
   * Check configuration status of email providers (Resend & SMTP)
   */
  async getConfigStatus(): Promise<{
    resendConfigured: boolean;
    fromEmail: string;
    smtpConfigured: boolean;
    provider: string;
  }> {
    try {
      const res = await fetch(`${this.apiUrl}/config-status`);
      if (!res.ok) {
        return {
          resendConfigured: false,
          fromEmail: 'Cookr <onboarding@resend.dev>',
          smtpConfigured: false,
          provider: 'emulated',
        };
      }
      return await res.json();
    } catch {
      return {
        resendConfigured: false,
        fromEmail: 'Cookr <onboarding@resend.dev>',
        smtpConfigured: false,
        provider: 'emulated',
      };
    }
  }
}

export const emailService = new EmailService();
