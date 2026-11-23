import { EmailEventType, EmailPayload } from '../types/email';

export type SupportedLanguage = 'pt' | 'en' | 'fr' | 'es';

interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const BRAND_ORANGE = '#ea580c';
const BRAND_DARK = '#0f172a';
const BRAND_BG = '#f8fafc';
const BRAND_CARD = '#ffffff';
const BRAND_BORDER = '#e2e8f0';

/** Escapa HTML: todo o texto vindo de utilizadores (nomes, moradas, motivos) é tratado como texto simples. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseAppUrl(): string {
  if (typeof process !== 'undefined' && process.env?.APP_URL) return process.env.APP_URL;
  return 'https://cookr.pt';
}

/** Só aceita ligações https (ou http em localhost) para o mesmo domínio da app; caso contrário usa o domínio da app. */
function getAppUrl(explicitUrl?: string): string {
  const fallback = baseAppUrl();
  if (!explicitUrl) return fallback;
  try {
    const u = new URL(explicitUrl);
    const base = new URL(fallback);
    if ((u.protocol === 'https:' || u.protocol === 'http:') && u.host === base.host) return u.toString();
  } catch {
    /* ignora */
  }
  return fallback;
}

function renderBaseHtml({
  badgeText,
  badgeBg = '#fff7ed',
  badgeBorder = '#ffedd5',
  badgeColor = '#c2410c',
  title,
  subtitle,
  children,
  ctaText,
  ctaUrl,
  lang = 'pt',
}: {
  badgeText?: string;
  badgeBg?: string;
  badgeBorder?: string;
  badgeColor?: string;
  title: string;
  subtitle?: string;
  children: string;
  ctaText?: string;
  ctaUrl?: string;
  lang?: SupportedLanguage;
}): string {
  const currentYear = new Date().getFullYear();

  const footerTexts = {
    pt: {
      sub: 'Cookr Portugal — Alta Gastronomia e Chefs Privados',
      support: 'Dúvidas ou apoio ao cliente? Contacte-nos em',
      rights: 'Todos os direitos reservados.',
      transNotice: 'Este é um email transacional gerado automaticamente relacionado com a sua conta ou reserva.',
    },
    en: {
      sub: 'Cookr Portugal — Haute Cuisine & Private Chefs',
      support: 'Questions or support? Reach us at',
      rights: 'All rights reserved.',
      transNotice: 'This is an automated transactional email regarding your account or booking.',
    },
    es: {
      sub: 'Cookr Portugal — Alta Gastronomía y Chefs Privados',
      support: '¿Dudas o soporte? Contáctenos en',
      rights: 'Todos los derechos reservados.',
      transNotice: 'Este es un correo transaccional generado automáticamente relativo a su cuenta o reserva.',
    },
    fr: {
      sub: 'Cookr Portugal — Haute Gastronomie & Chefs Privés',
      support: 'Des questions ou besoin d’aide ? Contactez-nous à',
      rights: 'Tous droits réservés.',
      transNotice: 'Ceci est un e-mail transactionnel généré automatiquement concernant votre compte ou réservation.',
    },
  }[lang];

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100%; }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; max-width: 100% !important; padding: 12px !important; }
      .content-padding { padding: 24px 18px !important; }
      .cta-button { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto;" class="container">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND_CARD}; border-radius: 16px; overflow: hidden; border: 1px solid ${BRAND_BORDER}; box-shadow: 0 10px 30px -5px rgba(15,23,42,0.06);">
      <!-- Header -->
      <tr>
        <td style="padding: 32px 24px; background: linear-gradient(135deg, ${BRAND_DARK} 0%, #1e293b 100%); text-align: center;">
          <a href="${getAppUrl(ctaUrl)}" style="text-decoration: none; display: inline-block;">
            <h1 style="color: ${BRAND_ORANGE}; margin: 0; font-size: 30px; font-weight: 900; letter-spacing: -0.04em;">
              COOK<span style="color: #ffffff;">R</span>
            </h1>
          </a>
          <p style="color: #94a3b8; font-size: 11px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 800;">
            ${footerTexts.sub}
          </p>
        </td>
      </tr>

      <!-- Body Content -->
      <tr>
        <td class="content-padding" style="padding: 36px 32px;">
          ${
            badgeText
              ? `<div style="display: inline-block; padding: 6px 14px; background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 20px; color: ${badgeColor}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 20px;">
                  ${badgeText}
                </div>`
              : ''
          }
          <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 900; color: ${BRAND_DARK}; letter-spacing: -0.02em;">
            ${title}
          </h2>
          ${
            subtitle
              ? `<p style="margin: 0 0 24px 0; font-size: 15px; color: #64748b; font-weight: 500;">
                  ${subtitle}
                </p>`
              : '<div style="height: 16px;"></div>'
          }

          ${children}

          ${
            ctaText && ctaUrl
              ? `<div style="text-align: center; margin-top: 32px; margin-bottom: 12px;">
                  <a href="${ctaUrl}" class="cta-button" style="display: inline-block; padding: 15px 36px; background-color: ${BRAND_ORANGE}; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 12px; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35);">
                    ${ctaText}
                  </a>
                </div>`
              : ''
          }
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 24px 20px; background-color: ${BRAND_BG}; border-top: 1px solid ${BRAND_BORDER}; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0 0 6px 0; font-weight: 700; color: #334155;">
            Cookr — Plataforma de Elite Gastronómica
          </p>
          <p style="margin: 0 0 10px 0;">
            ${footerTexts.support} <a href="mailto:geral@cookr.pt" style="color: ${BRAND_ORANGE}; text-decoration: none; font-weight: 700;">geral@cookr.pt</a>
          </p>
          <p style="margin: 0 0 8px 0; font-size: 10px; color: #94a3b8; line-height: 1.4;">
            ${footerTexts.transNotice}
          </p>
          <div style="font-size: 11px; color: #94a3b8; font-weight: 600;">
            © ${currentYear} Cookr. ${footerTexts.rights}
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

function renderBookingTable(
  data: EmailPayload['data'],
  labels: {
    experience: string;
    chef: string;
    client?: string;
    dateTime: string;
    guests: string;
    location: string;
    total: string;
    pinLabel?: string;
    pinDesc?: string;
  }
): string {
  const dateFormatted = data.date || '—';
  const timeFormatted = data.time ? ` às ${data.time}` : '';
  const totalNum = typeof data.totalAmount === 'number' ? data.totalAmount : parseFloat(String(data.totalAmount || 0));

  return `
  <div style="background-color: #f8fafc; border: 1px solid ${BRAND_BORDER}; border-radius: 12px; padding: 20px; margin: 20px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #334155;">
      ${
        data.experienceName
          ? `<tr>
              <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 38%; font-weight: 600;">${labels.experience}</td>
              <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; font-weight: 800; color: ${BRAND_DARK};">${data.experienceName}</td>
            </tr>`
          : ''
      }
      ${
        data.cookName
          ? `<tr>
              <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">${labels.chef}</td>
              <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; font-weight: 800; color: ${BRAND_ORANGE};">${data.cookName}</td>
            </tr>`
          : ''
      }
      ${
        data.clientName && labels.client
          ? `<tr>
              <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">${labels.client}</td>
              <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; font-weight: 800; color: ${BRAND_DARK};">${data.clientName}</td>
            </tr>`
          : ''
      }
      <tr>
        <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">${labels.dateTime}</td>
        <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; font-weight: 800; color: ${BRAND_DARK};">${dateFormatted}${timeFormatted}</td>
      </tr>
      ${
        data.guests
          ? `<tr>
              <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">${labels.guests}</td>
              <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #334155;">${data.guests}</td>
            </tr>`
          : ''
      }
      ${
        data.address
          ? `<tr>
              <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">${labels.location}</td>
              <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #334155;">${data.address}</td>
            </tr>`
          : ''
      }
      ${
        totalNum > 0
          ? `<tr>
              <td style="padding: 10px 0; color: #64748b; font-weight: 700;">${labels.total}</td>
              <td style="padding: 10px 0; font-weight: 900; font-size: 17px; color: ${BRAND_DARK};">${totalNum.toFixed(2)} €</td>
            </tr>`
          : ''
      }
    </table>
  </div>
  ${
    data.pin
      ? `<div style="background-color: #fff7ed; border: 1.5px dashed #fdba74; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
          <span style="display: block; font-size: 11px; text-transform: uppercase; color: #c2410c; font-weight: 800; letter-spacing: 0.1em; margin-bottom: 4px;">
            ${labels.pinLabel || 'PIN de Serviço'}
          </span>
          <div style="font-family: monospace; font-size: 26px; font-weight: 900; color: ${BRAND_ORANGE}; letter-spacing: 0.25em;">
            ${data.pin}
          </div>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #9a3412;">
            ${labels.pinDesc || 'Entregue este código ao Chef para validar e iniciar a experiência.'}
          </p>
        </div>`
      : ''
  }`;
}

export function renderEmail(payload: EmailPayload): RenderedEmail {
  const lang = (payload.language || 'pt') as SupportedLanguage;
  const rawData = payload.data || {};
  const appUrl = getAppUrl(rawData.actionUrl);
  // Escapa todos os campos de texto antes de entrarem nos modelos HTML.
  const data = Object.fromEntries(
    Object.entries(rawData).map(([k, v]) => [k, typeof v === 'string' ? escapeHtml(v) : v])
  ) as typeof rawData;
  const recipientName = escapeHtml(payload.recipientName || rawData.clientName || rawData.cookName || 'Estimado Utilizador');

  switch (payload.emailType) {
    // ==========================================
    // 1. CLIENT — WELCOME / ACCOUNT CREATED
    // ==========================================
    case 'welcome_client': {
      const texts = {
        pt: {
          subject: 'Bem-vindo à Cookr — A sua conta foi criada!',
          badge: '✓ Conta Ativa',
          title: `Olá, ${recipientName}!`,
          subtitle: 'Seja bem-vindo à maior rede de chefs privados e rituais gastronómicos em Portugal.',
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  A sua conta de Cliente Cookr foi criada com sucesso. A partir de agora, tem acesso direto aos melhores chefs da alta gastronomia para rituais em sua casa, eventos exclusivos e refeições de autor.
                </p>
                <div style="background-color: #f8fafc; border: 1px solid ${BRAND_BORDER}; border-radius: 12px; padding: 18px; margin: 20px 0;">
                  <h4 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; color: ${BRAND_DARK}; font-weight: 800;">
                    O que pode fazer agora:
                  </h4>
                  <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.8;">
                    <li>Explorar chefs premiados na sua cidade</li>
                    <li>Reservar rituais gastronómicos com menus personalizados</li>
                    <li>Guardar os seus endereços e preferências alimentares</li>
                    <li>Acumular pontos de fidelidade em cada experiência</li>
                  </ul>
                </div>`,
          cta: 'Explorar Chefs e Menus',
        },
        en: {
          subject: 'Welcome to Cookr — Your account has been created!',
          badge: '✓ Active Account',
          title: `Hello, ${recipientName}!`,
          subtitle: 'Welcome to Portugal’s premier network of private chefs and culinary rituals.',
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  Your Cookr Client account has been successfully created. You now have direct access to top private chefs for bespoke home dining, fine dining rituals, and culinary excellence.
                </p>`,
          cta: 'Explore Chefs & Menus',
        },
        es: {
          subject: '¡Bienvenido a Cookr — Tu cuenta ha sido creada!',
          badge: '✓ Cuenta Activa',
          title: `¡Hola, ${recipientName}!`,
          subtitle: 'Bienvenido a la red exclusiva de chefs privados de Portugal.',
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  Tu cuenta de Cliente Cookr ha sido creada con éxito. Ya puedes descubrir chefs de alta cocina y reservar rituales gastronómicos en tu domicilio.
                </p>`,
          cta: 'Explorar Chefs',
        },
        fr: {
          subject: 'Bienvenue chez Cookr — Votre compte a été créé !',
          badge: '✓ Compte Actif',
          title: `Bonjour ${recipientName} !`,
          subtitle: 'Bienvenue sur le premier réseau de chefs privés au Portugal.',
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  Votre compte Client Cookr est prêt. Découvrez des chefs d’exception et réservez des rituels gastronomiques à domicile.
                </p>`,
          cta: 'Découvrir les Chefs',
        },
      }[lang];

      return {
        subject: texts.subject,
        text: `Olá ${recipientName},\n\nA sua conta Cookr foi criada com sucesso! Aceda à plataforma para explorar chefs e agendar experiências: ${appUrl}`,
        html: renderBaseHtml({
          badgeText: texts.badge,
          badgeBg: '#f0fdf4',
          badgeBorder: '#bbf7d0',
          badgeColor: '#15803d',
          title: texts.title,
          subtitle: texts.subtitle,
          children: texts.body,
          ctaText: texts.cta,
          ctaUrl: `${appUrl}/#search`,
          lang,
        }),
      };
    }

    // ==========================================
    // 2. CHEF — REGISTRATION RECEIVED
    // ==========================================
    case 'chef_registration': {
      const texts = {
        pt: {
          subject: 'Candidatura de Chef Recebida — Cookr',
          badge: 'Registo em Análise',
          title: `Olá, Chef ${recipientName}!`,
          subtitle: 'A sua candidatura à rede de Chefs Privados Cookr foi recebida com sucesso.',
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  Obrigado pelo seu interesse em integrar a elite gastronómica da Cookr. A nossa equipa de curadoria e controlo de qualidade HACCP está a rever os seus dados profissionais e portfólio.
                </p>
                <div style="background-color: #f8fafc; border: 1px solid ${BRAND_BORDER}; border-radius: 12px; padding: 18px; margin: 20px 0;">
                  <h4 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; color: ${BRAND_DARK}; font-weight: 800;">
                    Próximos Passos:
                  </h4>
                  <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">
                    Assim que a verificação estiver concluída, receberá a confirmação e poderá aceder ao seu Cockpit de Chef para gerir o seu calendário, criar rituais de autor e aceitar pedidos de reserva.
                  </p>
                </div>`,
          cta: 'Consultar Estado do Perfil',
        },
        en: {
          subject: 'Chef Application Received — Cookr',
          badge: 'Application Under Review',
          title: `Hello, Chef ${recipientName}!`,
          subtitle: 'Your application to join the Cookr Chef network has been received.',
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  Thank you for applying to Cookr. Our curation and HACCP compliance team is currently reviewing your professional profile.
                </p>`,
          cta: 'Check Profile Status',
        },
        es: {
          subject: 'Solicitud de Chef Recibida — Cookr',
          badge: 'En Revisión',
          title: `¡Hola, Chef ${recipientName}!`,
          subtitle: 'Hemos recibido tu candidatura para unirte a Cookr.',
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  Gracias por unirte a Cookr. Nuestro equipo está revisando tu perfil profesional y certificaciones.
                </p>`,
          cta: 'Ver Estado del Perfil',
        },
        fr: {
          subject: 'Candidature Chef Reçue — Cookr',
          badge: 'En Cours d’Examen',
          title: `Bonjour Chef ${recipientName} !`,
          subtitle: 'Votre candidature au réseau de Chefs Cookr a bien été reçue.',
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  Notre équipe examine vos informations professionnelles et votre portfolio gastronomique.
                </p>`,
          cta: 'Voir le Profil',
        },
      }[lang];

      return {
        subject: texts.subject,
        text: `Olá Chef ${recipientName},\n\nA sua candidatura foi recebida e está em análise. Aceda à Cookr: ${appUrl}`,
        html: renderBaseHtml({
          badgeText: texts.badge,
          badgeBg: '#fff7ed',
          badgeBorder: '#ffedd5',
          badgeColor: '#c2410c',
          title: texts.title,
          subtitle: texts.subtitle,
          children: texts.body,
          ctaText: texts.cta,
          ctaUrl: `${appUrl}/#profile`,
          lang,
        }),
      };
    }

    // ==========================================
    // 3. CLIENT — BOOKING REQUEST RECEIVED
    // ==========================================
    case 'booking_created_client': {
      const texts = {
        pt: {
          subject: `Pedido de Reserva Recebido — ${data.experienceName || 'Cookr'}`,
          badge: 'Pedido Registado',
          title: `Olá, ${data.clientName || recipientName}!`,
          subtitle: 'O seu pedido de reserva foi registado e enviado para o Chef.',
          intro: `Registámos o seu pedido para a experiência <strong>"${data.experienceName || 'Ritual Gastronómico'}"</strong> com o Chef <strong>${data.cookName || 'Chef Privado'}</strong>. O Chef tem agora a oportunidade de rever a data e confirmar a disponibilidade.`,
          tableLabels: {
            experience: 'Experiência',
            chef: 'Chef Responsável',
            dateTime: 'Data & Hora',
            guests: 'Convidados',
            location: 'Localização',
            total: 'Valor Total',
          },
          cta: 'Acompanhar Reserva',
        },
        en: {
          subject: `Booking Request Received — ${data.experienceName || 'Cookr'}`,
          badge: 'Request Registered',
          title: `Hello, ${data.clientName || recipientName}!`,
          subtitle: 'Your booking request has been sent to the Chef.',
          intro: `We have received your request for <strong>"${data.experienceName || 'Culinary Experience'}"</strong> with Chef <strong>${data.cookName || 'Private Chef'}</strong>. The Chef will review and confirm availability shortly.`,
          tableLabels: {
            experience: 'Experience',
            chef: 'Private Chef',
            dateTime: 'Date & Time',
            guests: 'Guests',
            location: 'Location',
            total: 'Total Amount',
          },
          cta: 'View Booking Details',
        },
        es: {
          subject: `Solicitud de Reserva Recibida — ${data.experienceName || 'Cookr'}`,
          badge: 'Solicitud Registrada',
          title: `¡Hola, ${data.clientName || recipientName}!`,
          subtitle: 'Tu solicitud de reserva ha sido enviada al Chef.',
          intro: `Hemos registrado tu solicitud para <strong>"${data.experienceName || 'Experiencia'}"</strong> con el Chef <strong>${data.cookName || 'Chef Privado'}</strong>.`,
          tableLabels: {
            experience: 'Experiencia',
            chef: 'Chef',
            dateTime: 'Fecha y Hora',
            guests: 'Invitados',
            location: 'Ubicación',
            total: 'Total',
          },
          cta: 'Ver Reserva',
        },
        fr: {
          subject: `Demande de Réservation Reçue — ${data.experienceName || 'Cookr'}`,
          badge: 'Demande Enregistrée',
          title: `Bonjour ${data.clientName || recipientName} !`,
          subtitle: 'Votre demande a été transmise au Chef.',
          intro: `Votre demande pour <strong>"${data.experienceName || 'Expérience'}"</strong> avec le Chef <strong>${data.cookName || 'Chef Privé'}</strong> est en attente de confirmation.`,
          tableLabels: {
            experience: 'Expérience',
            chef: 'Chef',
            dateTime: 'Date & Heure',
            guests: 'Invités',
            location: 'Lieu',
            total: 'Montant Total',
          },
          cta: 'Consulter la Réservation',
        },
      }[lang];

      const children = `
        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
          ${texts.intro}
        </p>
        ${renderBookingTable(data, texts.tableLabels)}
      `;

      return {
        subject: texts.subject,
        text: `Olá ${data.clientName || recipientName},\n\nO seu pedido de reserva (${data.experienceName}) com o Chef ${data.cookName} foi registado. Aceda aos detalhes: ${appUrl}`,
        html: renderBaseHtml({
          badgeText: texts.badge,
          badgeBg: '#f8fafc',
          badgeBorder: '#e2e8f0',
          badgeColor: '#475569',
          title: texts.title,
          subtitle: texts.subtitle,
          children,
          ctaText: texts.cta,
          ctaUrl: `${appUrl}/#agenda`,
          lang,
        }),
      };
    }

    // ==========================================
    // 4. CHEF — NEW BOOKING REQUEST
    // ==========================================
    case 'booking_created_chef': {
      const texts = {
        pt: {
          subject: `Novo Pedido de Reserva — ${data.clientName || 'Cliente'} (${data.date || 'Data'})`,
          badge: 'Nova Reserva Pendente',
          title: `Chef ${data.cookName || recipientName}, tem um novo pedido!`,
          subtitle: `O cliente ${data.clientName || 'Cliente'} solicitou uma experiência no seu calendário.`,
          intro: `Recebeu uma nova solicitação para a experiência <strong>"${data.experienceName || 'Ritual'}"</strong>. Por favor, consulte os detalhes e confirme a reserva através do seu painel.`,
          tableLabels: {
            experience: 'Experiência',
            chef: 'Chef',
            client: 'Cliente',
            dateTime: 'Data & Hora',
            guests: 'N.º Pessoas',
            location: 'Local / Cidade',
            total: 'Remuneração Estimada',
          },
          cta: 'Aceitar ou Rever Reserva',
        },
        en: {
          subject: `New Booking Request — ${data.clientName || 'Client'} (${data.date || 'Date'})`,
          badge: 'New Booking Pending',
          title: `Chef ${data.cookName || recipientName}, new booking request!`,
          subtitle: `Client ${data.clientName || 'Client'} has requested a culinary ritual.`,
          intro: `You have received a new booking for <strong>"${data.experienceName || 'Experience'}"</strong>. Please review and confirm via your Cockpit.`,
          tableLabels: {
            experience: 'Experience',
            chef: 'Chef',
            client: 'Client',
            dateTime: 'Date & Time',
            guests: 'Guests',
            location: 'Location',
            total: 'Estimated Total',
          },
          cta: 'Review Booking',
        },
        es: {
          subject: `Nueva Solicitud de Reserva — ${data.clientName || 'Cliente'}`,
          badge: 'Nueva Reserva',
          title: `Chef ${data.cookName || recipientName}, ¡tienes una nueva reserva!`,
          subtitle: `El cliente ${data.clientName || 'Cliente'} ha solicitado tu menú.`,
          intro: `Has recibido una solicitud para <strong>"${data.experienceName || 'Experiencia'}"</strong>.`,
          tableLabels: {
            experience: 'Experiencia',
            chef: 'Chef',
            client: 'Cliente',
            dateTime: 'Fecha y Hora',
            guests: 'Comensales',
            location: 'Ubicación',
            total: 'Importe Total',
          },
          cta: 'Ver en el Panel',
        },
        fr: {
          subject: `Nouvelle Demande de Réservation — ${data.clientName || 'Client'}`,
          badge: 'Nouvelle Réservation',
          title: `Chef ${data.cookName || recipientName}, nouvelle demande !`,
          subtitle: `Le client ${data.clientName || 'Client'} souhaite réserver votre expérience.`,
          intro: `Une nouvelle réservation pour <strong>"${data.experienceName || 'Expérience'}"</strong> est en attente de votre réponse.`,
          tableLabels: {
            experience: 'Expérience',
            chef: 'Chef',
            client: 'Client',
            dateTime: 'Date & Heure',
            guests: 'Invités',
            location: 'Lieu',
            total: 'Montant Total',
          },
          cta: 'Accepter la Réservation',
        },
      }[lang];

      const children = `
        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
          ${texts.intro}
        </p>
        ${renderBookingTable(data, texts.tableLabels)}
      `;

      return {
        subject: texts.subject,
        text: `Chef ${data.cookName || recipientName},\n\nRecebeu um novo pedido de reserva de ${data.clientName} para o dia ${data.date}. Aceda ao seu Cockpit: ${appUrl}/#kitchen`,
        html: renderBaseHtml({
          badgeText: texts.badge,
          badgeBg: '#fff7ed',
          badgeBorder: '#ffedd5',
          badgeColor: '#c2410c',
          title: texts.title,
          subtitle: texts.subtitle,
          children,
          ctaText: texts.cta,
          ctaUrl: `${appUrl}/#kitchen`,
          lang,
        }),
      };
    }

    // ==========================================
    // 5. CLIENT — BOOKING CONFIRMED
    // ==========================================
    case 'booking_confirmed_client': {
      const texts = {
        pt: {
          subject: `Reserva Confirmada! Preparação Gourmet com o Chef ${data.cookName || 'Privado'}`,
          badge: '✓ Reserva Confirmada',
          title: `Tudo pronto, ${data.clientName || recipientName}!`,
          subtitle: `O Chef ${data.cookName || 'Privado'} confirmou a sua reserva. O seu ritual gourmet está agendado!`,
          intro: `A sua experiência <strong>"${data.experienceName || 'Ritual Gastronómico'}"</strong> está oficialmente confirmada. O Chef entrará em contacto antes do evento e levará todos os ingredientes frescos necessários.`,
          tableLabels: {
            experience: 'Experiência',
            chef: 'Chef Responsável',
            dateTime: 'Data & Hora',
            guests: 'Convidados',
            location: 'Localização',
            total: 'Valor Total',
            pinLabel: 'PIN Secreto do Serviço',
            pinDesc: 'Entregue este código ao Chef na sua morada para iniciar o serviço.',
          },
          cta: 'Ver Detalhes da Reserva',
        },
        en: {
          subject: `Booking Confirmed! Gourmet Experience with Chef ${data.cookName || 'Private Chef'}`,
          badge: '✓ Booking Confirmed',
          title: `You're all set, ${data.clientName || recipientName}!`,
          subtitle: `Chef ${data.cookName || 'Private Chef'} has accepted your reservation.`,
          intro: `Your culinary experience <strong>"${data.experienceName || 'Experience'}"</strong> is officially confirmed. The Chef will arrive prepared with fresh ingredients.`,
          tableLabels: {
            experience: 'Experience',
            chef: 'Chef',
            dateTime: 'Date & Time',
            guests: 'Guests',
            location: 'Location',
            total: 'Total Amount',
            pinLabel: 'Service Secret PIN',
            pinDesc: 'Provide this code to your Chef upon arrival to start the service.',
          },
          cta: 'View Booking',
        },
        es: {
          subject: `¡Reserva Confirmada con el Chef ${data.cookName || 'Privado'}!`,
          badge: '✓ Confirmada',
          title: `¡Todo listo, ${data.clientName || recipientName}!`,
          subtitle: `El Chef ${data.cookName || 'Privado'} ha confirmado tu reserva.`,
          intro: `Tu experiencia <strong>"${data.experienceName || 'Experiencia'}"</strong> está oficialmente confirmada.`,
          tableLabels: {
            experience: 'Experiencia',
            chef: 'Chef',
            dateTime: 'Fecha y Hora',
            guests: 'Comensales',
            location: 'Ubicación',
            total: 'Total',
            pinLabel: 'PIN de Servicio',
            pinDesc: 'Entrega este código al Chef al llegar a tu domicilio.',
          },
          cta: 'Ver Reserva',
        },
        fr: {
          subject: `Réservation Confirmée avec le Chef ${data.cookName || 'Privé'} !`,
          badge: '✓ Confirmée',
          title: `Tout est prêt, ${data.clientName || recipientName} !`,
          subtitle: `Le Chef ${data.cookName || 'Privé'} a confirmé votre réservation.`,
          intro: `Votre expérience <strong>"${data.experienceName || 'Expérience'}"</strong> est officiellement confirmée.`,
          tableLabels: {
            experience: 'Expérience',
            chef: 'Chef',
            dateTime: 'Date & Heure',
            guests: 'Invités',
            location: 'Lieu',
            total: 'Montant Total',
            pinLabel: 'Code PIN du Service',
            pinDesc: 'Transmettez ce code au Chef à son arrivée pour débuter la préparation.',
          },
          cta: 'Consulter la Réservation',
        },
      }[lang];

      const children = `
        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
          ${texts.intro}
        </p>
        ${renderBookingTable(data, texts.tableLabels)}
      `;

      return {
        subject: texts.subject,
        text: `Olá ${data.clientName || recipientName},\n\nA sua reserva com o Chef ${data.cookName} foi confirmada para ${data.date}!\nPIN do serviço: ${data.pin || '----'}\nAceda: ${appUrl}/#agenda`,
        html: renderBaseHtml({
          badgeText: texts.badge,
          badgeBg: '#f0fdf4',
          badgeBorder: '#bbf7d0',
          badgeColor: '#15803d',
          title: texts.title,
          subtitle: texts.subtitle,
          children,
          ctaText: texts.cta,
          ctaUrl: `${appUrl}/#agenda`,
          lang,
        }),
      };
    }

    // ==========================================
    // 6. CHEF — BOOKING CONFIRMED
    // ==========================================
    case 'booking_confirmed_chef': {
      const texts = {
        pt: {
          subject: `Reserva Agendada na sua Agenda — ${data.clientName || 'Cliente'} (${data.date || 'Data'})`,
          badge: '✓ Reserva no Calendário',
          title: `Reserva Confirmada, Chef ${data.cookName || recipientName}!`,
          subtitle: `O evento com ${data.clientName || 'Cliente'} foi adicionado ao seu calendário de operações.`,
          intro: `Confirmou com sucesso a reserva da experiência <strong>"${data.experienceName || 'Ritual'}"</strong>. Por favor, verifique atempadamente as eventuais restrições alimentares e notas de cozinha do cliente.`,
          tableLabels: {
            experience: 'Experiência',
            chef: 'Chef',
            client: 'Cliente',
            dateTime: 'Data & Hora',
            guests: 'N.º Pessoas',
            location: 'Morada do Cliente',
            total: 'Valor Total',
            pinLabel: 'Validação do PIN',
            pinDesc: 'Solicite o PIN de 4 dígitos ao cliente no início do serviço para validação e desbloqueio de payout.',
          },
          cta: 'Abrir no Cockpit do Chef',
        },
        en: {
          subject: `Booking Confirmed in your Schedule — ${data.clientName || 'Client'}`,
          badge: '✓ Scheduled in Calendar',
          title: `Confirmed, Chef ${data.cookName || recipientName}!`,
          subtitle: `The event with ${data.clientName || 'Client'} is scheduled in your operations calendar.`,
          intro: `You have successfully confirmed <strong>"${data.experienceName || 'Experience'}"</strong>. Review the guest notes and address before the event.`,
          tableLabels: {
            experience: 'Experience',
            chef: 'Chef',
            client: 'Client',
            dateTime: 'Date & Time',
            guests: 'Guests',
            location: 'Address',
            total: 'Total',
            pinLabel: 'PIN Validation',
            pinDesc: 'Request the 4-digit PIN from the client to begin and secure your payout.',
          },
          cta: 'Open Cockpit',
        },
        es: {
          subject: `Reserva Agendada en tu Calendario — ${data.clientName || 'Cliente'}`,
          badge: '✓ Agendada',
          title: `¡Confirmado, Chef ${data.cookName || recipientName}!`,
          subtitle: `El evento con ${data.clientName || 'Cliente'} está en tu calendario.`,
          intro: `Has confirmado la reserva para <strong>"${data.experienceName || 'Experiencia'}"</strong>.`,
          tableLabels: {
            experience: 'Experiencia',
            chef: 'Chef',
            client: 'Cliente',
            dateTime: 'Fecha y Hora',
            guests: 'Comensales',
            location: 'Dirección',
            total: 'Total',
          },
          cta: 'Ver en Panel Chef',
        },
        fr: {
          subject: `Réservation Enregistrée à votre Planning — ${data.clientName || 'Client'}`,
          badge: '✓ Confirmée',
          title: `Confirmé, Chef ${data.cookName || recipientName} !`,
          subtitle: `L'événement avec ${data.clientName || 'Client'} est noté à votre calendrier.`,
          intro: `Vous avez confirmé la réservation pour <strong>"${data.experienceName || 'Expérience'}"</strong>.`,
          tableLabels: {
            experience: 'Expérience',
            chef: 'Chef',
            client: 'Client',
            dateTime: 'Date & Heure',
            guests: 'Invités',
            location: 'Adresse',
            total: 'Total',
          },
          cta: 'Ouvrir le Cockpit',
        },
      }[lang];

      const children = `
        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
          ${texts.intro}
        </p>
        ${renderBookingTable(data, texts.tableLabels)}
      `;

      return {
        subject: texts.subject,
        text: `Chef ${data.cookName || recipientName},\n\nA reserva de ${data.clientName} está confirmada para ${data.date}. Aceda ao seu Cockpit: ${appUrl}/#kitchen`,
        html: renderBaseHtml({
          badgeText: texts.badge,
          badgeBg: '#f0fdf4',
          badgeBorder: '#bbf7d0',
          badgeColor: '#15803d',
          title: texts.title,
          subtitle: texts.subtitle,
          children,
          ctaText: texts.cta,
          ctaUrl: `${appUrl}/#kitchen`,
          lang,
        }),
      };
    }

    // ==========================================
    // 7. CLIENT — PAYMENT CONFIRMED
    // ==========================================
    case 'payment_confirmed_client': {
      const totalNum = typeof data.totalAmount === 'number' ? data.totalAmount : parseFloat(String(data.totalAmount || 0));
      const texts = {
        pt: {
          subject: `Pagamento Confirmado — Cookr (${totalNum.toFixed(2)} €)`,
          badge: 'Pagamento Concluído',
          title: `Pagamento Confirmado, ${data.clientName || recipientName}!`,
          subtitle: 'O seu pagamento foi processado com sucesso em ambiente seguro.',
          intro: `Confirmamos a receção do pagamento no valor de <strong>${totalNum.toFixed(2)} €</strong> referente à sua experiência gastronómica com o Chef <strong>${data.cookName || 'Privado'}</strong>. O comprovativo fiscal estará disponível na sua área de cliente.`,
          tableLabels: {
            experience: 'Experiência',
            chef: 'Chef Responsável',
            dateTime: 'Data Agendada',
            guests: 'Convidados',
            location: 'Localização',
            total: 'Total Pago',
          },
          cta: 'Ver Recibo e Reserva',
        },
        en: {
          subject: `Payment Confirmed — Cookr (${totalNum.toFixed(2)} €)`,
          badge: 'Payment Completed',
          title: `Payment Confirmed, ${data.clientName || recipientName}!`,
          subtitle: 'Your payment was successfully processed.',
          intro: `We confirm receipt of <strong>${totalNum.toFixed(2)} €</strong> for your booking with Chef <strong>${data.cookName || 'Private Chef'}</strong>.`,
          tableLabels: {
            experience: 'Experience',
            chef: 'Chef',
            dateTime: 'Scheduled Date',
            guests: 'Guests',
            location: 'Location',
            total: 'Paid Amount',
          },
          cta: 'View Booking & Receipt',
        },
        es: {
          subject: `Pago Confirmado — Cookr (${totalNum.toFixed(2)} €)`,
          badge: 'Pago Realizado',
          title: `¡Pago Confirmado, ${data.clientName || recipientName}!`,
          subtitle: 'Tu pago ha sido procesado correctamente.',
          intro: `Confirmamos el pago de <strong>${totalNum.toFixed(2)} €</strong> con el Chef <strong>${data.cookName || 'Privado'}</strong>.`,
          tableLabels: {
            experience: 'Experiencia',
            chef: 'Chef',
            dateTime: 'Fecha',
            guests: 'Comensales',
            location: 'Ubicación',
            total: 'Total Pagado',
          },
          cta: 'Ver Reserva',
        },
        fr: {
          subject: `Paiement Confirmé — Cookr (${totalNum.toFixed(2)} €)`,
          badge: 'Paiement Réussi',
          title: `Paiement Confirmé, ${data.clientName || recipientName} !`,
          subtitle: 'Votre paiement a été traité avec succès.',
          intro: `Nous confirmons la réception de <strong>${totalNum.toFixed(2)} €</strong> pour votre expérience avec le Chef <strong>${data.cookName || 'Privé'}</strong>.`,
          tableLabels: {
            experience: 'Expérience',
            chef: 'Chef',
            dateTime: 'Date',
            guests: 'Invités',
            location: 'Lieu',
            total: 'Montant Payé',
          },
          cta: 'Voir la Réservation',
        },
      }[lang];

      const children = `
        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
          ${texts.intro}
        </p>
        ${renderBookingTable(data, texts.tableLabels)}
      `;

      return {
        subject: texts.subject,
        text: `Olá ${data.clientName || recipientName},\n\nO pagamento de ${totalNum.toFixed(2)} € para a reserva com o Chef ${data.cookName} foi confirmado. Aceda aos detalhes: ${appUrl}/#agenda`,
        html: renderBaseHtml({
          badgeText: texts.badge,
          badgeBg: '#f0fdf4',
          badgeBorder: '#bbf7d0',
          badgeColor: '#15803d',
          title: texts.title,
          subtitle: texts.subtitle,
          children,
          ctaText: texts.cta,
          ctaUrl: `${appUrl}/#agenda`,
          lang,
        }),
      };
    }

    // ==========================================
    // 8. CLIENT — BOOKING CANCELLED
    // ==========================================
    case 'booking_cancelled_client': {
      const reason = data.cancellationReason || 'Motivo de agenda ou cancelamento pelo utilizador.';
      const texts = {
        pt: {
          subject: `Atualização de Reserva: Cancelada (${data.experienceName || 'Cookr'})`,
          badge: '✕ Reserva Cancelada',
          title: `Olá, ${data.clientName || recipientName}`,
          subtitle: 'Informamos que a sua reserva foi cancelada.',
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  A reserva para a experiência <strong>"${data.experienceName || 'Ritual Gastronómico'}"</strong> no dia <strong>${data.date || 'agendado'}</strong> com o Chef <strong>${data.cookName || 'Privado'}</strong> foi cancelada.
                </p>
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; padding: 16px; margin: 20px 0;">
                  <span style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #991b1b; margin-bottom: 4px;">
                    Motivo indicado:
                  </span>
                  <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">
                    ${reason}
                  </p>
                </div>
                <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; color: #166534; line-height: 1.5;">◆<strong>Garantia Cookr:</strong> Caso o pagamento já tenha sido efetuado, o montante retido foi libertado ou reembolsado de acordo com a nossa política de cancelamentos transparentes.
                </div>`,
          cta: 'Explorar Outros Chefs',
        },
        en: {
          subject: `Booking Cancelled — (${data.experienceName || 'Cookr'})`,
          badge: '✕ Cancelled',
          title: `Hello, ${data.clientName || recipientName}`,
          subtitle: 'We regret to inform you that your booking has been cancelled.',
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  Your reservation for <strong>"${data.experienceName || 'Experience'}"</strong> on <strong>${data.date || 'date'}</strong> with Chef <strong>${data.cookName || 'Chef'}</strong> has been cancelled.
                </p>
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; padding: 16px; margin: 20px 0;">
                  <span style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #991b1b; margin-bottom: 4px;">
                    Reason:
                  </span>
                  <p style="margin: 0; font-size: 14px; color: #334155;">${reason}</p>
                </div>`,
          cta: 'Find Another Chef',
        },
        es: {
          subject: `Reserva Cancelada — (${data.experienceName || 'Cookr'})`,
          badge: '✕ Cancelada',
          title: `Hola, ${data.clientName || recipientName}`,
          subtitle: 'Te informamos que tu reserva ha sido cancelada.',
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  La reserva para <strong>"${data.experienceName || 'Experiencia'}"</strong> con el Chef <strong>${data.cookName || 'Chef'}</strong> ha sido cancelada.
                </p>`,
          cta: 'Explorar Chefs',
        },
        fr: {
          subject: `Réservation Annulée — (${data.experienceName || 'Cookr'})`,
          badge: '✕ Annulée',
          title: `Bonjour ${data.clientName || recipientName}`,
          subtitle: 'Nous vous informons que votre réservation a été annulée.',
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  La réservation pour <strong>"${data.experienceName || 'Expérience'}"</strong> avec le Chef <strong>${data.cookName || 'Chef'}</strong> a été annulée.
                </p>`,
          cta: 'Découvrir d’autres Chefs',
        },
      }[lang];

      return {
        subject: texts.subject,
        text: `Olá ${data.clientName || recipientName},\n\nA reserva para ${data.experienceName} no dia ${data.date} foi cancelada.\nMotivo: ${reason}\nAceda à Cookr: ${appUrl}`,
        html: renderBaseHtml({
          badgeText: texts.badge,
          badgeBg: '#fef2f2',
          badgeBorder: '#fecaca',
          badgeColor: '#dc2626',
          title: texts.title,
          subtitle: texts.subtitle,
          children: texts.body,
          ctaText: texts.cta,
          ctaUrl: `${appUrl}/#search`,
          lang,
        }),
      };
    }

    // ==========================================
    // 9. CHEF — BOOKING CANCELLED
    // ==========================================
    case 'booking_cancelled_chef': {
      const reason = data.cancellationReason || 'Cancelamento solicitado.';
      const texts = {
        pt: {
          subject: `Reserva Cancelada no seu Calendário — ${data.clientName || 'Cliente'} (${data.date || 'Data'})`,
          badge: '✕ Reserva Cancelada',
          title: `Chef ${data.cookName || recipientName}, aviso de cancelamento`,
          subtitle: `A reserva com ${data.clientName || 'Cliente'} foi cancelada.`,
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  Informamos que a reserva da experiência <strong>"${data.experienceName || 'Ritual'}"</strong> agendada para <strong>${data.date || 'Data'}</strong> com ${data.clientName || 'Cliente'} foi cancelada.
                </p>
                <div style="background-color: #f8fafc; border: 1px solid ${BRAND_BORDER}; border-radius: 10px; padding: 16px; margin: 20px 0;">
                  <span style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">
                    Motivo / Observações:
                  </span>
                  <p style="margin: 0; font-size: 14px; color: #334155;">${reason}</p>
                </div>
                <p style="font-size: 13px; color: #64748b;">
                  O horário no seu calendário foi automaticamente libertado para receber novos pedidos.
                </p>`,
          cta: 'Ver Calendário no Cockpit',
        },
        en: {
          subject: `Booking Cancelled in Schedule — ${data.clientName || 'Client'}`,
          badge: '✕ Cancelled',
          title: `Chef ${data.cookName || recipientName}, cancellation notice`,
          subtitle: `The booking with ${data.clientName || 'Client'} has been cancelled.`,
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  The booking for <strong>"${data.experienceName || 'Ritual'}"</strong> on <strong>${data.date || 'Date'}</strong> has been cancelled. Your calendar slot is now available.
                </p>`,
          cta: 'Open Calendar',
        },
        es: {
          subject: `Reserva Cancelada — ${data.clientName || 'Cliente'}`,
          badge: '✕ Cancelada',
          title: `Chef ${data.cookName || recipientName}, aviso de cancelación`,
          subtitle: `La reserva con ${data.clientName || 'Cliente'} fue cancelada.`,
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  La reserva de <strong>"${data.experienceName || 'Ritual'}"</strong> para el <strong>${data.date || 'Fecha'}</strong> ha sido cancelada.
                </p>`,
          cta: 'Ver Panel',
        },
        fr: {
          subject: `Réservation Annulée — ${data.clientName || 'Client'}`,
          badge: '✕ Annulée',
          title: `Chef ${data.cookName || recipientName}, avis d'annulation`,
          subtitle: `La réservation avec ${data.clientName || 'Client'} a été annulée.`,
          body: `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                  La réservation du <strong>${data.date || 'Date'}</strong> a été annulée. Votre créneau est à nouveau disponible.
                </p>`,
          cta: 'Voir le Planning',
        },
      }[lang];

      return {
        subject: texts.subject,
        text: `Chef ${data.cookName || recipientName},\n\nA reserva de ${data.clientName} para ${data.date} foi cancelada. O seu horário está livre. Aceda: ${appUrl}/#kitchen`,
        html: renderBaseHtml({
          badgeText: texts.badge,
          badgeBg: '#fef2f2',
          badgeBorder: '#fecaca',
          badgeColor: '#dc2626',
          title: texts.title,
          subtitle: texts.subtitle,
          children: texts.body,
          ctaText: texts.cta,
          ctaUrl: `${appUrl}/#kitchen`,
          lang,
        }),
      };
    }

    // ==========================================
    // 10. CLIENT — BOOKING REMINDER (24h)
    // ==========================================
    case 'booking_reminder_client': {
      const texts = {
        pt: {
          subject: `Lembrete: A sua experiência gastronómica é amanhã!`,
          badge: 'Lembrete 24 Horas',
          title: `Está quase na hora, ${data.clientName || recipientName}!`,
          subtitle: `A sua experiência com o Chef ${data.cookName || 'Privado'} é já amanhã.`,
          intro: `O Chef <strong>${data.cookName || 'Privado'}</strong> já está a selecionar os ingredientes mais frescos para a sua experiência <strong>"${data.experienceName || 'Ritual'}"</strong>. Lembre-se de ter o espaço da cozinha pronto e o seu PIN acessível.`,
          tableLabels: {
            experience: 'Experiência',
            chef: 'Chef Responsável',
            dateTime: 'Data & Hora',
            guests: 'Convidados',
            location: 'Localização',
            total: 'Valor Total',
            pinLabel: 'PIN de Início do Serviço',
            pinDesc: 'Entregue este PIN ao Chef quando este chegar à sua morada.',
          },
          cta: 'Ver Detalhes do Agendamento',
        },
        en: {
          subject: `Reminder: Your private culinary experience is tomorrow!`,
          badge: '24h Reminder',
          title: `Almost time, ${data.clientName || recipientName}!`,
          subtitle: `Your private dining ritual with Chef ${data.cookName || 'Private Chef'} is tomorrow.`,
          intro: `Chef <strong>${data.cookName || 'Private Chef'}</strong> is sourcing fresh local ingredients for your <strong>"${data.experienceName || 'Experience'}"</strong>.`,
          tableLabels: {
            experience: 'Experience',
            chef: 'Chef',
            dateTime: 'Date & Time',
            guests: 'Guests',
            location: 'Location',
            total: 'Total',
            pinLabel: 'Service PIN',
            pinDesc: 'Provide this PIN to your Chef upon arrival.',
          },
          cta: 'View Booking',
        },
        es: {
          subject: `Recordatorio: ¡Tu experiencia gourmet es mañana!`,
          badge: 'Recordatorio 24h',
          title: `¡Falta muy poco, ${data.clientName || recipientName}!`,
          subtitle: `Tu experiencia con el Chef ${data.cookName || 'Privado'} es mañana.`,
          intro: `El Chef <strong>${data.cookName || 'Privado'}</strong> ya está preparando tu experiencia <strong>"${data.experienceName || 'Ritual'}"</strong>.`,
          tableLabels: {
            experience: 'Experiencia',
            chef: 'Chef',
            dateTime: 'Fecha y Hora',
            guests: 'Comensales',
            location: 'Ubicación',
            total: 'Total',
            pinLabel: 'PIN de Servicio',
            pinDesc: 'Entrega este PIN al Chef.',
          },
          cta: 'Ver Reserva',
        },
        fr: {
          subject: `Rappel : Votre expérience gastronomique est demain !`,
          badge: 'Rappel 24h',
          title: `C’est presque l’heure, ${data.clientName || recipientName} !`,
          subtitle: `Votre expérience avec le Chef ${data.cookName || 'Privé'} aura lieu demain.`,
          intro: `Le Chef <strong>${data.cookName || 'Privé'}</strong> prépare votre <strong>"${data.experienceName || 'Expérience'}"</strong>.`,
          tableLabels: {
            experience: 'Expérience',
            chef: 'Chef',
            dateTime: 'Date & Heure',
            guests: 'Invités',
            location: 'Lieu',
            total: 'Total',
            pinLabel: 'Code PIN',
            pinDesc: 'Transmettez ce code PIN au Chef.',
          },
          cta: 'Voir la Réservation',
        },
      }[lang];

      const children = `
        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
          ${texts.intro}
        </p>
        ${renderBookingTable(data, texts.tableLabels)}
      `;

      return {
        subject: texts.subject,
        text: `Olá ${data.clientName || recipientName},\n\nLembrete da sua experiência com o Chef ${data.cookName} amanhã (${data.date})!\nPIN: ${data.pin || '----'}\nAceda: ${appUrl}/#agenda`,
        html: renderBaseHtml({
          badgeText: texts.badge,
          badgeBg: '#fff7ed',
          badgeBorder: '#ffedd5',
          badgeColor: '#c2410c',
          title: texts.title,
          subtitle: texts.subtitle,
          children,
          ctaText: texts.cta,
          ctaUrl: `${appUrl}/#agenda`,
          lang,
        }),
      };
    }

    // ==========================================
    // 11. CHEF — BOOKING REMINDER (24h)
    // ==========================================
    case 'booking_reminder_chef': {
      const texts = {
        pt: {
          subject: `Lembrete: Serviço Agendado para Amanhã — ${data.clientName || 'Cliente'}`,
          badge: 'Lembrete de Operação (24h)',
          title: `Chef ${data.cookName || recipientName}, serviço amanhã!`,
          subtitle: `Amanhã tem um serviço agendado com ${data.clientName || 'Cliente'}.`,
          intro: `Lembramos que amanhã tem o ritual <strong>"${data.experienceName || 'Ritual Gastronómico'}"</strong> marcado para as <strong>${data.time || 'hora indicada'}</strong>. Certifique-se de que dispõe de todos os ingredientes e utensílios necessários.`,
          tableLabels: {
            experience: 'Experiência',
            chef: 'Chef',
            client: 'Cliente',
            dateTime: 'Data & Hora',
            guests: 'N.º Pessoas',
            location: 'Morada do Cliente',
            total: 'Remuneração Total',
            pinLabel: 'Validação do PIN',
            pinDesc: 'Valide o PIN no início do serviço para garantir a conclusão e o payout.',
          },
          cta: 'Ver Detalhes do Serviço',
        },
        en: {
          subject: `Reminder: Service Scheduled for Tomorrow — ${data.clientName || 'Client'}`,
          badge: '24h Service Reminder',
          title: `Chef ${data.cookName || recipientName}, service tomorrow!`,
          subtitle: `You have an event tomorrow with ${data.clientName || 'Client'}.`,
          intro: `Reminder for <strong>"${data.experienceName || 'Experience'}"</strong> tomorrow at <strong>${data.time || 'scheduled time'}</strong>.`,
          tableLabels: {
            experience: 'Experience',
            chef: 'Chef',
            client: 'Client',
            dateTime: 'Date & Time',
            guests: 'Guests',
            location: 'Address',
            total: 'Total Payout',
          },
          cta: 'Open Cockpit',
        },
        es: {
          subject: `Recordatorio: Servicio Mañana — ${data.clientName || 'Cliente'}`,
          badge: 'Recordatorio 24h',
          title: `Chef ${data.cookName || recipientName}, ¡servicio mañana!`,
          subtitle: `Tienes un evento programado para mañana con ${data.clientName || 'Cliente'}.`,
          intro: `Recordatorio del servicio <strong>"${data.experienceName || 'Experiencia'}"</strong>.`,
          tableLabels: {
            experience: 'Experiencia',
            chef: 'Chef',
            client: 'Cliente',
            dateTime: 'Fecha y Hora',
            guests: 'Comensales',
            location: 'Dirección',
            total: 'Total',
          },
          cta: 'Ver en Panel',
        },
        fr: {
          subject: `Rappel : Prestation Demain — ${data.clientName || 'Client'}`,
          badge: 'Rappel 24h',
          title: `Chef ${data.cookName || recipientName}, prestation demain !`,
          subtitle: `Vous avez un service prévu demain avec ${data.clientName || 'Client'}.`,
          intro: `Rappel pour votre prestation <strong>"${data.experienceName || 'Expérience'}"</strong> demain.`,
          tableLabels: {
            experience: 'Expérience',
            chef: 'Chef',
            client: 'Client',
            dateTime: 'Date & Heure',
            guests: 'Invités',
            location: 'Lieu',
            total: 'Total',
          },
          cta: 'Ouvrir le Cockpit',
        },
      }[lang];

      const children = `
        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
          ${texts.intro}
        </p>
        ${renderBookingTable(data, texts.tableLabels)}
      `;

      return {
        subject: texts.subject,
        text: `Chef ${data.cookName || recipientName},\n\nLembrete de serviço amanhã com ${data.clientName} às ${data.time || ''} para ${data.experienceName}. Aceda: ${appUrl}/#kitchen`,
        html: renderBaseHtml({
          badgeText: texts.badge,
          badgeBg: '#fff7ed',
          badgeBorder: '#ffedd5',
          badgeColor: '#c2410c',
          title: texts.title,
          subtitle: texts.subtitle,
          children,
          ctaText: texts.cta,
          ctaUrl: `${appUrl}/#kitchen`,
          lang,
        }),
      };
    }
  }
}
