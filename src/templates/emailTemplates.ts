export interface BookingEmailData {
  clientName: string;
  cookName: string;
  experienceName: string;
  date: string;
  time?: string;
  guests?: number;
  address?: string;
  totalAmount?: number;
  pin?: string;
  cancellationReason?: string;
  reminderType?: '24h' | '1h' | 'general';
  actionUrl?: string;
}

const APP_BASE_URL =
  (typeof process !== 'undefined' && process.env && process.env.APP_URL) || 'https://cookr.pt';

const COOKR_BRAND_HEADER = `
  <div style="text-align: center; padding: 28px 20px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px 16px 0 0;">
    <img src="${APP_BASE_URL}/icon-192.png" width="56" height="56" alt="Cookr" style="display: block; margin: 0 auto 12px auto; border-radius: 50%; border: 0;" />
    <h1 style="color: #ea580c; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.05em; font-family: 'Montserrat', sans-serif;">
      COOK<span style="color: #ffffff;">R</span>
    </h1>
    <p style="color: #94a3b8; font-size: 11px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700;">
      Elite Gastronómica em Portugal
    </p>
  </div>
`;

const COOKR_BRAND_FOOTER = `
  <div style="text-align: center; padding: 24px 20px; background-color: #f8fafc; border-radius: 0 0 16px 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
    <p style="margin: 0 0 8px 0; font-weight: 600; color: #334155;">Cookr Portugal — Chefs Privados ao Seu Dispor</p>
    <p style="margin: 0 0 12px 0;">Dúvidas ou suporte? Contacte-nos através de <a href="mailto:geral@cookr.pt" style="color: #ea580c; text-decoration: none; font-weight: 600;">geral@cookr.pt</a></p>
    <div style="font-size: 11px; color: #94a3b8;">
      © ${new Date().getFullYear()} Cookr. Todos os direitos reservados.
    </div>
  </div>
`;

/**
 * 1. Booking Confirmation Email Template
 */
export function getBookingConfirmationTemplate(data: BookingEmailData): string {
  const {
    clientName = "Estimado Cliente",
    cookName = "Chef Privado",
    experienceName = "Ritual Gastronómico",
    date = "A confirmar",
    time = "",
    guests = 2,
    address = "Morada fornecida",
    totalAmount = 0,
    pin = "----",
    actionUrl = "https://cookr.pt"
  } = data;

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reserva Confirmada — Cookr</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e2e8f0;">
    ${COOKR_BRAND_HEADER}
    
    <div style="padding: 32px 28px;">
      <div style="display: inline-block; padding: 6px 14px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 20px; color: #15803d; font-size: 12px; font-weight: 700; text-transform: uppercase; tracking: 0.05em; margin-bottom: 16px;">
        ✓ Reserva Confirmada
      </div>
      
      <h2 style="margin: 0 0 12px 0; font-size: 22px; color: #0f172a; font-weight: 800; letter-spacing: -0.02em;">
        Olá, ${clientName}!
      </h2>
      <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
        O seu pedido para a experiência <strong>"${experienceName}"</strong> foi aceite pelo Chef <strong>${cookName}</strong>. O seu ritual gourmet está oficialmente agendado!
      </p>

      <!-- Detalhes da Reserva -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; font-size: 13px; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em; font-weight: 800;">
          Resumo do Agendamento
        </h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 40%;">Experiência</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a;">${experienceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Chef Responsável</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #ea580c;">${cookName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Data & Hora</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a;">${date} ${time ? `às ${time}` : ''}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Convidados</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${guests} pessoas</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Local do Serviço</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${address}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Valor Total</td>
            <td style="padding: 8px 0; font-weight: 800; font-size: 16px; color: #0f172a;">${totalAmount.toFixed(2)} €</td>
          </tr>
        </table>
      </div>

      <!-- PIN de Validação -->
      <div style="background-color: #fff7ed; border: 1.5px dashed #fdba74; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 28px;">
        <span style="display: block; font-size: 11px; text-transform: uppercase; color: #c2410c; font-weight: 800; letter-spacing: 0.1em; margin-bottom: 6px;">
          PIN Secreto do Serviço
        </span>
        <div style="font-family: monospace; font-size: 28px; font-weight: 900; color: #ea580c; letter-spacing: 0.25em;">
          ${pin}
        </div>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #9a3412;">
          Forneça este código ao Chef na sua morada para confirmar o início da preparação.
        </p>
      </div>

      <!-- Botão CTA -->
      <div style="text-align: center; margin-bottom: 20px;">
        <a href="${actionUrl}" style="display: inline-block; padding: 14px 32px; background-color: #ea580c; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 10px;">
          Ver Detalhes da Reserva
        </a>
      </div>
    </div>

    ${COOKR_BRAND_FOOTER}
  </div>
</body>
</html>
  `;
}

/**
 * 2. Booking Cancellation Email Template
 */
export function getBookingCancellationTemplate(data: BookingEmailData): string {
  const {
    clientName = "Estimado Cliente",
    cookName = "Chef Privado",
    experienceName = "Ritual Gastronómico",
    date = "A confirmar",
    cancellationReason = "Motivo não especificado",
    actionUrl = "https://cookr.pt"
  } = data;

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reserva Cancelada — Cookr</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e2e8f0;">
    ${COOKR_BRAND_HEADER}
    
    <div style="padding: 32px 28px;">
      <div style="display: inline-block; padding: 6px 14px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 20px; color: #dc2626; font-size: 12px; font-weight: 700; text-transform: uppercase; tracking: 0.05em; margin-bottom: 16px;">
        ✕ Cancelamento de Reserva
      </div>
      
      <h2 style="margin: 0 0 12px 0; font-size: 22px; color: #0f172a; font-weight: 800;">
        Olá, ${clientName}
      </h2>
      <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #475569;">
        Informamos que a reserva para a experiência <strong>"${experienceName}"</strong> agendada para <strong>${date}</strong> com o Chef <strong>${cookName}</strong> foi cancelada.
      </p>

      <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <span style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #991b1b; margin-bottom: 4px;">
          Informação sobre o Cancelamento
        </span>
        <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">
          ${cancellationReason}
        </p>
      </div>

      <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; border-radius: 10px; padding: 16px; margin-bottom: 28px; font-size: 13px; color: #166534; line-height: 1.5;">◆<strong>Garantia de Reembolso Cookr:</strong> Caso já tenha efetuado o pagamento, qualquer montante retido foi libertado ou será devidamente estornado no seu método original de pagamento.
      </div>

      <!-- Botão CTA -->
      <div style="text-align: center; margin-bottom: 20px;">
        <a href="${actionUrl}" style="display: inline-block; padding: 14px 32px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 10px;">
          Explorar Outros Chefs Privados
        </a>
      </div>
    </div>

    ${COOKR_BRAND_FOOTER}
  </div>
</body>
</html>
  `;
}

/**
 * 3. Booking Reminder Email Template (24h or 1h before event)
 */
export function getBookingReminderTemplate(data: BookingEmailData): string {
  const {
    clientName = "Estimado Cliente",
    cookName = "Chef Privado",
    experienceName = "Ritual Gastronómico",
    date = "Hoje",
    time = "",
    guests = 2,
    address = "Sua morada",
    pin = "----",
    reminderType = '24h',
    actionUrl = "https://cookr.pt"
  } = data;

  const reminderTitle = reminderType === '1h' 
    ? 'O Chef chega dentro de 1 hora!' 
    : 'O seu evento gourmet é amanhã!';

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lembrete de Reserva — Cookr</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e2e8f0;">
    ${COOKR_BRAND_HEADER}
    
    <div style="padding: 32px 28px;">
      <div style="display: inline-block; padding: 6px 14px; background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 20px; color: #c2410c; font-size: 12px; font-weight: 700; text-transform: uppercase; tracking: 0.05em; margin-bottom: 16px;">
        ${reminderTitle}
      </div>
      
      <h2 style="margin: 0 0 12px 0; font-size: 22px; color: #0f172a; font-weight: 800;">
        Olá, ${clientName}!
      </h2>
      <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #475569;">
        Está quase na hora! O Chef <strong>${cookName}</strong> já se encontra a preparar os ingredientes frescos para a sua experiência <strong>"${experienceName}"</strong>.
      </p>

      <!-- Cartão de Lembrete -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 35%;">Data & Hora</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 800; color: #ea580c;">${date} ${time ? `às ${time}` : ''}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Chef</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a;">${cookName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">N.º Convidados</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${guests} pessoas</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Local</td>
            <td style="padding: 8px 0; font-weight: 600;">${address}</td>
          </tr>
        </table>
      </div>

      <!-- PIN de Confirmação -->
      <div style="background-color: #0f172a; color: #ffffff; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 28px;">
        <span style="display: block; font-size: 11px; text-transform: uppercase; color: #fb923c; font-weight: 800; letter-spacing: 0.1em; margin-bottom: 4px;">
          Lembre-se do seu PIN de Serviço
        </span>
        <div style="font-family: monospace; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: 0.2em;">
          ${pin}
        </div>
      </div>

      <!-- Botão CTA -->
      <div style="text-align: center; margin-bottom: 20px;">
        <a href="${actionUrl}" style="display: inline-block; padding: 14px 32px; background-color: #ea580c; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 10px;">
          Gerir Reserva no App
        </a>
      </div>
    </div>

    ${COOKR_BRAND_FOOTER}
  </div>
</body>
</html>
  `;
}
