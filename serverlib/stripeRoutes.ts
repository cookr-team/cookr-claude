// Pagamentos Stripe da Cookr.
//
// Modelo: "separate charges and transfers"
//  1. O cliente paga por Stripe Checkout; o valor fica AUTORIZADO (captura manual).
//  2. Quando o chef aceita a reserva, o servidor CAPTURA o pagamento.
//  3. Depois do serviço (PIN validado), o servidor TRANSFERE ao chef: base do menu + gorjeta.
//     A taxa de serviço (5% VIP / 10%) fica na Cookr.
//  4. Cancelamentos/recusas: autorização libertada ou reembolso (50% se o cliente cancelar a <48h).
//
// O preço é SEMPRE calculado aqui, a partir do menu na base de dados. O valor enviado pelo browser é ignorado.
import express from "express";
import Stripe from "stripe";

type Req = express.Request & { user?: any; accessToken?: string };

export interface StripeDeps {
  admin: () => any; // cliente Supabase com service role (ou null)
  userClient: (token: string) => any; // cliente Supabase com o token do utilizador (RLS)
  isAdmin: (req: Req) => Promise<boolean>;
  rateLimited: (key: string, max: number, windowMs: number) => boolean;
}

const secretKey = process.env.STRIPE_SECRET_KEY || "";
export const stripe: Stripe | null = secretKey ? new Stripe(secretKey) : null;

const FEE_STANDARD = 0.1;
const FEE_VIP = 0.05;
const VIP_POINTS = 500;
const ALLOWED_WINE_PRICES = [0, 15, 18, 22];
const MIN_CHARGE_CENTS = 50;
// Reservas criadas antes desta data (anteriores aos pagamentos) são aceites sem pagamento Stripe.
const PAYMENTS_REQUIRED_FROM = new Date(process.env.PAYMENTS_REQUIRED_FROM || "2026-11-24T00:00:00Z").getTime();

const toCents = (n: number) => Math.round(Number(n) * 100);
const isUuid = (v: any) =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

function appBase(req: Req): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function notConfigured(res: express.Response) {
  return res.status(503).json({ error: "Pagamentos não configurados.", code: "stripe_not_configured" });
}

async function loadBooking(deps: StripeDeps, req: Req, bookingId: string) {
  const { data } = await deps
    .userClient(req.accessToken as string)
    .from("bookings")
    .select("id, client_id, cook_id, status, data, hora, num_pessoas, menu_selected, wine_pairing, gorjeta, cancelled_by, created_at")
    .eq("id", bookingId)
    .maybeSingle();
  return data || null;
}

/** Calcula o preço no servidor, a partir do menu guardado na base de dados. */
async function computeQuote(admin: any, b: any) {
  const { data: menu } = await admin
    .from("menus")
    .select("preco")
    .eq("cook_id", b.cook_id)
    .eq("nome", b.menu_selected)
    .limit(1)
    .maybeSingle();
  if (!menu || !(Number(menu.preco) >= 0)) throw new Error("Menu não encontrado para esta reserva.");

  const guests = Math.min(200, Math.max(1, parseInt(String(b.num_pessoas || 1), 10) || 1));
  const winePerPerson = Number(b.wine_pairing?.preco_por_pessoa || 0);
  if (!ALLOWED_WINE_PRICES.includes(winePerPerson)) throw new Error("Harmonização de vinho inválida.");

  const baseCents = toCents((Number(menu.preco) + winePerPerson) * guests);
  const { data: client } = await admin.from("profiles").select("loyalty_points").eq("id", b.client_id).maybeSingle();
  const feeRate = (client?.loyalty_points || 0) >= VIP_POINTS ? FEE_VIP : FEE_STANDARD;
  const feeCents = Math.round(baseCents * feeRate);
  const tipCents = Math.min(Math.max(0, toCents(b.gorjeta || 0)), Math.round(baseCents * 0.5));
  const totalCents = baseCents + feeCents + tipCents;
  if (totalCents < MIN_CHARGE_CENTS) throw new Error("Valor da reserva abaixo do mínimo.");
  return { guests, baseCents, feeCents, tipCents, totalCents, payoutCents: baseCents + tipCents };
}

async function setPayment(admin: any, bookingId: string, patch: Record<string, any>) {
  await admin
    .from("booking_payments")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("booking_id", bookingId);
}

/** Transfere ao chef a parte dele (base + gorjeta) depois de o serviço estar concluído. */
async function payoutBooking(admin: any, bookingId: string): Promise<{ ok: boolean; code?: string }> {
  if (!stripe) return { ok: false, code: "stripe_not_configured" };
  const { data: pay } = await admin.from("booking_payments").select("*").eq("booking_id", bookingId).maybeSingle();
  if (!pay) return { ok: false, code: "no_payment" };
  if (pay.status === "paid_out") return { ok: true };
  if (pay.status !== "captured") return { ok: false, code: "not_captured" };

  const { data: acct } = await admin.from("stripe_accounts").select("account_id, payouts_enabled").eq("user_id", pay.cook_id).maybeSingle();
  if (!acct || !acct.payouts_enabled) return { ok: false, code: "chef_not_onboarded" };

  const pi = await stripe.paymentIntents.retrieve(pay.payment_intent_id);
  const charge = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
  const transfer = await stripe.transfers.create(
    {
      amount: pay.chef_payout_cents,
      currency: pay.currency || "eur",
      destination: acct.account_id,
      transfer_group: `booking_${bookingId}`,
      ...(charge ? { source_transaction: charge } : {}),
      metadata: { booking_id: bookingId },
    },
    { idempotencyKey: `payout_${bookingId}` }
  );
  await setPayment(admin, bookingId, { status: "paid_out", transfer_id: transfer.id });
  return { ok: true };
}

/** O webhook tem de ser registado ANTES do express.json() e da autenticação (usa o corpo em bruto e a assinatura do Stripe). */
export function registerStripeWebhook(app: express.Express, deps: StripeDeps) {
  app.post("/api/stripe/webhook", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    const admin = deps.admin();
    if (!stripe || !whSecret || !admin) return notConfigured(res);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"] as string, whSecret);
    } catch {
      return res.status(400).send("Assinatura inválida.");
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const s = event.data.object as Stripe.Checkout.Session;
          const bookingId = s.metadata?.booking_id;
          if (bookingId && isUuid(bookingId)) {
            const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
            await setPayment(admin, bookingId, {
              status: s.payment_status === "paid" ? "captured" : "authorized",
              payment_intent_id: pi,
            });
          }
          break;
        }
        case "checkout.session.expired": {
          const s = event.data.object as Stripe.Checkout.Session;
          const bookingId = s.metadata?.booking_id;
          if (bookingId && isUuid(bookingId)) {
            const { data: expired } = await admin
              .from("booking_payments")
              .update({ status: "expired", updated_at: new Date().toISOString() })
              .eq("booking_id", bookingId)
              .eq("status", "checkout_created")
              .select("booking_id");
            // Pagamento nunca concluído: a reserva pendente deixa de ocupar o horário do chef
            // (o gatilho da base de dados liberta o horário quando a reserva é cancelada).
            if (expired && expired.length > 0) {
              await admin
                .from("bookings")
                .update({
                  status: "cancelled",
                  cancelled_at: new Date().toISOString(),
                  cancellation_reason: "Pagamento não concluído a tempo.",
                })
                .eq("id", bookingId)
                .eq("status", "pending");
            }
          }
          break;
        }
        case "payment_intent.canceled": {
          const pi = event.data.object as Stripe.PaymentIntent;
          await admin
            .from("booking_payments")
            .update({ status: "released", updated_at: new Date().toISOString() })
            .eq("payment_intent_id", pi.id)
            .in("status", ["authorized", "checkout_created"]);
          break;
        }
        case "charge.refunded": {
          const c = event.data.object as Stripe.Charge;
          const pi = typeof c.payment_intent === "string" ? c.payment_intent : c.payment_intent?.id;
          if (pi) {
            const full = c.amount_refunded >= c.amount;
            await admin
              .from("booking_payments")
              .update({
                refunded_cents: c.amount_refunded,
                status: full ? "refunded" : "partially_refunded",
                updated_at: new Date().toISOString(),
              })
              .eq("payment_intent_id", pi);
          }
          break;
        }
        case "account.updated": {
          const a = event.data.object as Stripe.Account;
          await admin
            .from("stripe_accounts")
            .update({
              details_submitted: !!a.details_submitted,
              charges_enabled: !!a.charges_enabled,
              payouts_enabled: !!a.payouts_enabled,
              updated_at: new Date().toISOString(),
            })
            .eq("account_id", a.id);
          break;
        }
      }
      return res.json({ received: true });
    } catch (e) {
      console.error("[Stripe webhook]", (e as any)?.message || e);
      return res.status(500).send("Erro ao processar o evento.");
    }
  });
}

/** Rotas autenticadas (montadas depois do requireSupabaseAuth). */
export function registerStripeRoutes(app: express.Express, deps: StripeDeps) {
  app.get("/api/stripe/status", (req, res) => {
    res.json({ enabled: !!stripe && !!deps.admin() });
  });

  // ---- 1. Checkout (cliente) -------------------------------------------------
  app.post("/api/stripe/checkout", async (req: Req, res) => {
    const admin = deps.admin();
    if (!stripe || !admin) return notConfigured(res);
    const bookingId = String(req.body?.bookingId || "");
    if (!isUuid(bookingId)) return res.status(400).json({ error: "Reserva inválida." });
    if (deps.rateLimited(`stripe:checkout:${req.user.id}`, 20, 60 * 60 * 1000)) {
      return res.status(429).json({ error: "Demasiadas tentativas. Tente mais tarde." });
    }
    try {
      const b = await loadBooking(deps, req, bookingId);
      if (!b || b.client_id !== req.user.id) return res.status(403).json({ error: "Sem permissão para esta reserva." });
      if (b.status !== "pending") return res.status(409).json({ error: "Esta reserva já não aguarda pagamento." });

      const { data: existing } = await admin.from("booking_payments").select("status").eq("booking_id", bookingId).maybeSingle();
      if (existing && ["authorized", "captured", "paid_out"].includes(existing.status)) {
        return res.status(409).json({ error: "Esta reserva já está paga.", code: "already_paid" });
      }

      const q = await computeQuote(admin, b);
      // O valor da reserva passa a ser o calculado no servidor.
      await admin
        .from("bookings")
        .update({ valor_total: q.totalCents / 100, gorjeta: q.tipCents / 100 })
        .eq("id", bookingId);

      const base = appBase(req);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        allowed_payment_method_types: ["card"],
        customer_email: req.user.email || undefined,
        client_reference_id: bookingId,
        metadata: { booking_id: bookingId },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: q.totalCents,
              product_data: {
                name: `Cookr — ${String(b.menu_selected).slice(0, 80)}`,
                description: `${q.guests} pessoa(s) · ${b.data} ${b.hora || ""}`.trim(),
              },
            },
          },
        ],
        payment_intent_data: {
          capture_method: "manual",
          transfer_group: `booking_${bookingId}`,
          metadata: { booking_id: bookingId },
          description: `Reserva Cookr ${bookingId}`,
        },
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        success_url: `${base}/?payment=success&booking=${bookingId}`,
        cancel_url: `${base}/?payment=cancelled&booking=${bookingId}`,
      });

      await admin.from("booking_payments").upsert({
        booking_id: bookingId,
        client_id: b.client_id,
        cook_id: b.cook_id,
        amount_cents: q.totalCents,
        platform_fee_cents: q.feeCents,
        chef_payout_cents: q.payoutCents,
        currency: "eur",
        status: "checkout_created",
        checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      });
      return res.json({ url: session.url });
    } catch (e: any) {
      console.error("[Stripe checkout]", e?.message || e);
      return res.status(400).json({ error: e?.message || "Não foi possível iniciar o pagamento." });
    }
  });

  // ---- 2. Captura (chef aceita) ----------------------------------------------
  app.post("/api/stripe/capture", async (req: Req, res) => {
    const admin = deps.admin();
    if (!stripe || !admin) return notConfigured(res);
    const bookingId = String(req.body?.bookingId || "");
    if (!isUuid(bookingId)) return res.status(400).json({ error: "Reserva inválida." });
    try {
      const b = await loadBooking(deps, req, bookingId);
      const isAdmin = await deps.isAdmin(req);
      if (!b || (b.cook_id !== req.user.id && b.client_id !== req.user.id && !isAdmin)) {
        return res.status(403).json({ error: "Sem permissão." });
      }
      const { data: pay } = await admin.from("booking_payments").select("*").eq("booking_id", bookingId).maybeSingle();
      // O cliente nunca captura: só confirma (sem efeito) quando o pagamento já foi capturado (ex.: aceitar um reagendamento).
      if (b.cook_id !== req.user.id && !isAdmin) {
        if (pay && ["captured", "paid_out"].includes(pay.status)) return res.json({ ok: true });
        if (!pay && new Date(b.created_at || 0).getTime() < PAYMENTS_REQUIRED_FROM) return res.json({ ok: true, legacy: true });
        return res.status(402).json({ error: "Pagamento por concluir.", code: "payment_required" });
      }
      if (!pay && new Date(b.created_at || 0).getTime() < PAYMENTS_REQUIRED_FROM) {
        return res.json({ ok: true, legacy: true });
      }
      if ((!pay || !["authorized", "captured", "paid_out"].includes(pay.status)) && isAdmin) {
        // Override do administrador: pode aprovar sem pagamento (fica registado no painel de admin).
        return res.json({ ok: true, adminOverride: true });
      }
      if (!pay || !["authorized", "captured", "paid_out"].includes(pay.status)) {
        return res.status(402).json({ error: "O cliente ainda não concluiu o pagamento desta reserva.", code: "payment_required" });
      }
      if (pay.status === "authorized") {
        await stripe.paymentIntents.capture(pay.payment_intent_id, undefined, { idempotencyKey: `capture_${bookingId}` });
        await setPayment(admin, bookingId, { status: "captured" });
      }
      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[Stripe capture]", e?.message || e);
      return res.status(400).json({ error: "Não foi possível confirmar o pagamento." });
    }
  });

  // ---- 3. Libertar / reembolsar (cancelamento ou recusa) ----------------------
  app.post("/api/stripe/release", async (req: Req, res) => {
    const admin = deps.admin();
    if (!stripe || !admin) return notConfigured(res);
    const bookingId = String(req.body?.bookingId || "");
    if (!isUuid(bookingId)) return res.status(400).json({ error: "Reserva inválida." });
    try {
      const b = await loadBooking(deps, req, bookingId);
      const isAdmin = await deps.isAdmin(req);
      if (!b || (b.client_id !== req.user.id && b.cook_id !== req.user.id && !isAdmin)) {
        return res.status(403).json({ error: "Sem permissão." });
      }
      if (!["cancelled", "cancelled_partial_refund", "rejected", "expired"].includes(b.status)) {
        return res.status(409).json({ error: "A reserva ainda está ativa." });
      }
      const { data: pay } = await admin.from("booking_payments").select("*").eq("booking_id", bookingId).maybeSingle();
      if (!pay) return res.json({ ok: true, nothing: true });

      if (pay.status === "checkout_created" && pay.checkout_session_id) {
        await stripe.checkout.sessions.expire(pay.checkout_session_id).catch(() => {});
        await setPayment(admin, bookingId, { status: "expired" });
      } else if (pay.status === "authorized") {
        await stripe.paymentIntents.cancel(pay.payment_intent_id, undefined, { idempotencyKey: `cancel_${bookingId}` });
        await setPayment(admin, bookingId, { status: "released" });
      } else if (pay.status === "captured") {
        const partial = b.status === "cancelled_partial_refund";
        const amount = partial ? Math.floor(pay.amount_cents * 0.5) : pay.amount_cents;
        await stripe.refunds.create(
          { payment_intent: pay.payment_intent_id, amount, metadata: { booking_id: bookingId } },
          { idempotencyKey: `refund_${bookingId}` }
        );
        await setPayment(admin, bookingId, {
          status: partial ? "partially_refunded" : "refunded",
          refunded_cents: amount,
        });
      } else if (pay.status === "paid_out") {
        return res.status(409).json({ error: "O serviço já foi pago ao chef. Contacte o suporte.", code: "already_paid_out" });
      }
      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[Stripe release]", e?.message || e);
      return res.status(400).json({ error: "Não foi possível libertar/reembolsar o pagamento." });
    }
  });

  // ---- 4. Repasse ao chef (serviço concluído) ---------------------------------
  app.post("/api/stripe/payout", async (req: Req, res) => {
    const admin = deps.admin();
    if (!stripe || !admin) return notConfigured(res);
    const bookingId = String(req.body?.bookingId || "");
    if (!isUuid(bookingId)) return res.status(400).json({ error: "Reserva inválida." });
    try {
      const b = await loadBooking(deps, req, bookingId);
      const isAdmin = await deps.isAdmin(req);
      if (!b || (b.cook_id !== req.user.id && b.client_id !== req.user.id && !isAdmin)) {
        return res.status(403).json({ error: "Sem permissão." });
      }
      if (b.status !== "completed") return res.status(409).json({ error: "O serviço ainda não foi concluído." });
      const r = await payoutBooking(admin, bookingId);
      return res.json(r);
    } catch (e: any) {
      console.error("[Stripe payout]", e?.message || e);
      return res.status(400).json({ error: "Não foi possível transferir o pagamento ao chef." });
    }
  });

  // ---- 5. Connect: onboarding e estado da conta do chef ------------------------
  app.post("/api/stripe/connect/onboard", async (req: Req, res) => {
    const admin = deps.admin();
    if (!stripe || !admin) return notConfigured(res);
    try {
      const { data: me } = await deps
        .userClient(req.accessToken as string)
        .from("profiles")
        .select("role, email")
        .eq("id", req.user.id)
        .maybeSingle();
      if (!me || me.role !== "cook") return res.status(403).json({ error: "Só chefs podem configurar recebimentos." });

      let { data: row } = await admin.from("stripe_accounts").select("account_id").eq("user_id", req.user.id).maybeSingle();
      if (!row) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "PT",
          email: me.email || req.user.email || undefined,
          capabilities: { transfers: { requested: true } },
          metadata: { user_id: req.user.id },
        });
        await admin.from("stripe_accounts").insert({ user_id: req.user.id, account_id: account.id });
        row = { account_id: account.id };
      }
      const base = appBase(req);
      const link = await stripe.accountLinks.create({
        account: row.account_id,
        refresh_url: `${base}/?connect=refresh`,
        return_url: `${base}/?connect=return`,
        type: "account_onboarding",
      });
      return res.json({ url: link.url });
    } catch (e: any) {
      console.error("[Stripe connect]", e?.message || e);
      return res.status(400).json({ error: "Não foi possível iniciar a configuração de recebimentos." });
    }
  });

  app.get("/api/stripe/connect/status", async (req: Req, res) => {
    const admin = deps.admin();
    if (!stripe || !admin) return res.json({ enabled: false });
    try {
      const { data: row } = await admin.from("stripe_accounts").select("account_id").eq("user_id", req.user.id).maybeSingle();
      if (!row) return res.json({ enabled: true, connected: false });
      const a = await stripe.accounts.retrieve(row.account_id);
      await admin
        .from("stripe_accounts")
        .update({
          details_submitted: !!a.details_submitted,
          charges_enabled: !!a.charges_enabled,
          payouts_enabled: !!a.payouts_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", req.user.id);

      // Conta pronta: transfere os serviços já concluídos que estavam à espera.
      if (a.payouts_enabled) {
        const { data: pending } = await admin
          .from("booking_payments")
          .select("booking_id")
          .eq("cook_id", req.user.id)
          .eq("status", "captured");
        for (const p of pending || []) {
          const { data: bk } = await admin.from("bookings").select("status").eq("id", p.booking_id).maybeSingle();
          if (bk?.status === "completed") await payoutBooking(admin, p.booking_id).catch(() => {});
        }
      }
      return res.json({
        enabled: true,
        connected: true,
        detailsSubmitted: !!a.details_submitted,
        chargesEnabled: !!a.charges_enabled,
        payoutsEnabled: !!a.payouts_enabled,
      });
    } catch (e: any) {
      console.error("[Stripe connect status]", e?.message || e);
      return res.status(400).json({ error: "Não foi possível obter o estado da conta." });
    }
  });
}
