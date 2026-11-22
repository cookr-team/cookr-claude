import { supabaseService } from './supabaseService';
import { Booking, BookingStatus } from '../types';
import { apiFetch } from '../lib/apiClient';
import { emailService } from './emailService';

export interface PushNotificationPayload {
  userId?: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  vibrate?: number[];
  actions?: { action: string; title: string }[];
}

export const pushNotificationService = {
  /**
   * Check if Push Notifications are supported in the user's browser
   */
  isSupported: (): boolean => {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator
    );
  },

  /**
   * Get current browser notification permission status
   */
  getPermissionStatus: (): 'granted' | 'denied' | 'default' | 'unsupported' => {
    if (!pushNotificationService.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  /**
   * Request Notification permission from the user
   */
  requestPermission: async (userId?: string): Promise<boolean> => {
    if (!pushNotificationService.isSupported()) {
      console.warn('[Push Service] Notifications not supported in this browser environment.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Register Push Subscription in Service Worker if available
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && userId) {
            // Store token/flag in user profile or local preference
            localStorage.setItem(`cookr_push_enabled_${userId}`, 'true');
            await supabaseService.createNotification(
              userId,
              'Notificações Push ativadas com sucesso! Receberá alertas em tempo real no seu dispositivo.',
              'info'
            );
          }
        }
        return true;
      } else {
        console.warn('[Push Service] Notification permission denied or dismissed.');
        return false;
      }
    } catch (err) {
      console.error('[Push Service] Error requesting notification permission:', err);
      return false;
    }
  },

  /**
   * Trigger a native Push Notification (via ServiceWorker or Web Notification API)
   */
  sendNotification: async (payload: PushNotificationPayload): Promise<boolean> => {
    const { title, body, icon = '/icon.svg', badge = '/icon.svg', url = '/', tag = 'cookr-push', vibrate = [200, 100, 200], actions } = payload;

    // 1. Always attempt Service Worker showNotification first (native OS/Mobile push experience)
    if ('serviceWorker' in navigator && navigator.serviceWorker) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, {
            body,
            icon,
            badge,
            tag,
            vibrate,
            data: { url },
            actions: actions || [
              { action: 'open', title: 'Ver na Cookr' }
            ]
          } as any);

          // Post to server push endpoint
          apiFetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(() => {});

          return true;
        }
      } catch (err) {
        console.warn('[Push Service] SW showNotification fallback to window.Notification', err);
      }
    }

    // 2. Direct Window Notification fallback
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon,
          tag,
          data: { url }
        });
        notif.onclick = () => {
          window.focus();
          window.location.href = url;
          notif.close();
        };
        return true;
      } catch (err) {
        console.error('[Push Service] Window Notification failed:', err);
      }
    }

    return false;
  },

  /**
   * INSTANT CHEF PUSH ALERT:
   * Triggered when a new booking request or quote request comes in.
   * Sends instant alert to the chef's mobile device.
   */
  sendChefInstantAlert: async (
    cookId: string,
    clientName: string,
    date: string,
    bookingId: string,
    isQuoteRequest: boolean = false
  ): Promise<boolean> => {
    const title = isQuoteRequest
      ? '🚨 Novo Pedido de Orçamento!'
      : '👨‍🍳 Novo Pedido de Reserva Cookr!';
    
    const body = isQuoteRequest
      ? `${clientName || 'Um cliente'} solicitou um orçamento personalizado para dia ${date}. Responda para fechar o evento!`
      : `${clientName || 'Um cliente'} acabou de reservar um ritual gastronómico para dia ${date}. Toque para confirmar!`;

    const url = `/cook-dashboard?bookingId=${bookingId}`;

    // 1. Save in-app notification in Supabase
    await supabaseService.createNotification(
      cookId,
      body,
      isQuoteRequest ? 'warning' : 'info'
    );

    // 2. Dispatch native device push notification
    return pushNotificationService.sendNotification({
      userId: cookId,
      title,
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: `chef-booking-${bookingId}`,
      vibrate: [300, 100, 300, 100, 400],
      url,
      actions: [
        { action: 'open', title: 'Ver Pedido Agora' }
      ]
    });
  },

  /**
   * CLIENT AUTOMATIC EVENT REMINDERS:
   * Sends 24h and 2h reminders before the event with Chef arrival confirmation.
   */
  sendClientEventReminder: async (
    clientId: string,
    cookName: string,
    date: string,
    time: string,
    reminderType: '24h' | '2h',
    bookingId: string
  ): Promise<boolean> => {
    const is24h = reminderType === '24h';

    const title = is24h
      ? '🍷 O seu Evento Cookr é Amanhã!'
      : '👨‍🍳 Chef a Caminho! (Daqui a 2 horas)';

    const body = is24h
      ? `Lembrete: O Chef ${cookName || 'Cookr'} estará na sua cozinha amanhã às ${time || 'hora combinada'}. A sua experiência está totalmente confirmada.`
      : `O Chef ${cookName || 'Cookr'} confirmou a chegada em breve para a sua experiência das ${time || 'horas'}. Prepare o espaço e bom apetite!`;

    const url = `/client-agenda?bookingId=${bookingId}`;

    // 1. Create in-app notification
    await supabaseService.createNotification(
      clientId,
      body,
      'info'
    );

    // 2. Dispatch device push
    return pushNotificationService.sendNotification({
      userId: clientId,
      title,
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: `client-reminder-${reminderType}-${bookingId}`,
      vibrate: is24h ? [200, 100, 200] : [300, 150, 300, 150, 500],
      url,
      actions: [
        { action: 'open', title: 'Ver Detalhes do Evento' }
      ]
    });
  },

  /**
   * AUTOMATIC REMINDERS SCANNER
   * Scans confirmed bookings and dispatches 24h and 2h reminders automatically.
   */
  scanAndDispatchBookingReminders: async (allBookings: Booking[]): Promise<{ dispatched24h: number; dispatched2h: number }> => {
    let dispatched24h = 0;
    let dispatched2h = 0;

    if (!allBookings || allBookings.length === 0) return { dispatched24h, dispatched2h };

    const now = new Date().getTime();

    for (const booking of allBookings) {
      // Only process confirmed/accepted active bookings
      if (
        booking.status !== BookingStatus.ACCEPTED &&
        booking.status !== BookingStatus.IN_PROGRESS &&
        (booking.status as string) !== 'confirmed'
      ) {
        continue;
      }

      if (!booking.data || !booking.clientId) continue;

      // Parse booking date and time
      // Expecting booking.data in YYYY-MM-DD format
      let eventDateTimeMs: number | null = null;
      try {
        const timePart = booking.hora || '19:00';
        const dateStr = `${booking.data}T${timePart.length === 5 ? timePart + ':00' : timePart}`;
        eventDateTimeMs = new Date(dateStr).getTime();
        
        // Fallback parsing if date format varies
        if (isNaN(eventDateTimeMs)) {
          const parts = booking.data.split('-');
          if (parts.length === 3) {
            const [y, m, d] = parts.map(Number);
            const [h, min] = (booking.hora || '19:00').split(':').map(Number);
            eventDateTimeMs = new Date(y, m - 1, d, h || 19, min || 0).getTime();
          }
        }
      } catch (e) {
        continue;
      }

      if (!eventDateTimeMs || isNaN(eventDateTimeMs)) continue;

      const diffHours = (eventDateTimeMs - now) / (1000 * 60 * 60);

      // Check 24h reminder window: between 2h and 26h before event, and not sent yet
      if (diffHours <= 26 && diffHours > 2.5 && !booking.reminder_24h_sent) {
        const success = await pushNotificationService.sendClientEventReminder(
          booking.clientId,
          booking.cookName,
          booking.data,
          booking.hora || '19:00',
          '24h',
          booking.id
        );

        // Disparo seguro e idempotente de email transacional de lembrete 24h para Cliente e Chef
        (async () => {
          try {
            const clientUser = booking.clientId ? await supabaseService.getProfileById(booking.clientId) : null;
            const cookUser = booking.cookId ? await supabaseService.getProfileById(booking.cookId) : null;
            await emailService.sendBookingReminder(booking, clientUser, cookUser, '24h');
          } catch (reminderErr) {
            console.warn('[Email Reminder 24h Note]', reminderErr);
          }
        })();

        if (success || true) {
          booking.reminder_24h_sent = true;
          dispatched24h++;
          // Persist flag to Supabase
          supabaseService.updateBookingStatus(booking.id, booking.status, { reminder_24h_sent: true }).catch(() => {});
        }
      }

      // Check 2h reminder window: between 0h and 2.5h before event, and not sent yet
      if (diffHours <= 2.5 && diffHours > -0.5 && !booking.reminder_2h_sent) {
        const success = await pushNotificationService.sendClientEventReminder(
          booking.clientId,
          booking.cookName,
          booking.data,
          booking.hora || '19:00',
          '2h',
          booking.id
        );

        if (success || true) {
          booking.reminder_2h_sent = true;
          dispatched22hCountInc();
          dispatched2h++;
          // Persist flag to Supabase
          supabaseService.updateBookingStatus(booking.id, booking.status, { reminder_2h_sent: true }).catch(() => {});
        }
      }
    }

    return { dispatched24h, dispatched2h };
  }
};

function dispatched22hCountInc() {}
