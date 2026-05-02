// ============================================
// SAT DIRECTO — Microservicio de Timbrado
// ============================================

const express = require('express');
const axios = require('axios');
const Stripe = require('stripe');
const path = require('path');

const app = express();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const POCKETBASE_URL = (process.env.POCKETBASE_URL || '').replace(/\/$/, '');
const USERS_COLLECTION = process.env.POCKETBASE_USERS_COLLECTION || '_pb_users_auth_';
const SUBSCRIPTIONS_COLLECTION = process.env.POCKETBASE_SUBSCRIPTIONS_COLLECTION || 'subscriptions';
const ALLOWED_PLANS = ['gratuito', 'esencial', 'profesional', 'premium', 'despacho'];
const ALLOWED_BILLING = ['monthly', 'annual'];

// Stripe webhook requiere raw body (antes de express.json)
app.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).send('Stripe no configurado');
    }

    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || !signature) {
      return res.status(400).send('Webhook secret o firma faltante');
    }

    const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.userId || session.client_reference_id;
      const plan = session.metadata?.plan;
      const billing = session.metadata?.billing;

      if (userId) {
        const authHeaders = await getPocketBaseAdminHeaders();
        await upsertSubscription(authHeaders, {
          userId,
          plan: plan || 'desconocido',
          billing,
          status: 'active',
          stripeCustomerId: session.customer || null,
          stripeSubscriptionId: session.subscription || null
        });
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const authHeaders = await getPocketBaseAdminHeaders();
      await setSubscriptionStatusByStripeId(authHeaders, invoice.subscription, 'past_due');
      await setSubscriptionStatusByStripeCustomerId(authHeaders, invoice.customer, 'past_due');
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      const authHeaders = await getPocketBaseAdminHeaders();
      await setSubscriptionStatusByStripeId(authHeaders, invoice.subscription, 'active');
      await setSubscriptionStatusByStripeCustomerId(authHeaders, invoice.customer, 'active');
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const authHeaders = await getPocketBaseAdminHeaders();
      await setSubscriptionStatusByStripeId(authHeaders, subscription.id, 'canceled');
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('ERROR WEBHOOK STRIPE:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));
app.use('/app', express.static(path.join(__dirname, 'frontend', 'dist')));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// HEALTH
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/planes', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'satdirecto-timbrado',
    timestamp: new Date().toISOString()
  });
});

async function getPocketBaseAdminHeaders() {
  if (!POCKETBASE_URL) {
    throw new Error('POCKETBASE_URL no configurado');
  }

  if (process.env.POCKETBASE_ADMIN_TOKEN) {
    return {
      Authorization: `Bearer ${process.env.POCKETBASE_ADMIN_TOKEN}`
    };
  }

  const identity = process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_ADMIN_PASSWORD;

  if (!identity || !password) {
    throw new Error('Credenciales admin de PocketBase no configuradas');
  }

  const authRes = await axios.post(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
    identity,
    password
  });

  return {
    Authorization: `Bearer ${authRes.data.token}`
  };
}

async function upsertSubscription(headers, data) {
  const query = encodeURIComponent(`userId="${data.userId}"`);
  const existing = await axios.get(
    `${POCKETBASE_URL}/api/collections/${SUBSCRIPTIONS_COLLECTION}/records?filter=${query}&perPage=1`,
    { headers }
  );

  const payload = {
    userId: data.userId,
    plan: data.plan,
    billing: data.billing || 'monthly',
    status: data.status,
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId
  };

  if (existing.data.items?.length) {
    const recordId = existing.data.items[0].id;
    await axios.patch(
      `${POCKETBASE_URL}/api/collections/${SUBSCRIPTIONS_COLLECTION}/records/${recordId}`,
      payload,
      { headers }
    );
  } else {
    await axios.post(
      `${POCKETBASE_URL}/api/collections/${SUBSCRIPTIONS_COLLECTION}/records`,
      payload,
      { headers }
    );
  }
}

async function setSubscriptionStatusByStripeId(headers, stripeSubscriptionId, status) {
  if (!stripeSubscriptionId) return;
  const query = encodeURIComponent(`stripeSubscriptionId="${stripeSubscriptionId}"`);
  const existing = await axios.get(
    `${POCKETBASE_URL}/api/collections/${SUBSCRIPTIONS_COLLECTION}/records?filter=${query}&perPage=1`,
    { headers }
  );

  if (existing.data.items?.length) {
    const recordId = existing.data.items[0].id;
    await axios.patch(
      `${POCKETBASE_URL}/api/collections/${SUBSCRIPTIONS_COLLECTION}/records/${recordId}`,
      { status },
      { headers }
    );
  }
}


async function setSubscriptionStatusByStripeCustomerId(headers, stripeCustomerId, status) {
  if (!stripeCustomerId) return;
  const query = encodeURIComponent(`stripeCustomerId="${stripeCustomerId}"`);
  const existing = await axios.get(
    `${POCKETBASE_URL}/api/collections/${SUBSCRIPTIONS_COLLECTION}/records?filter=${query}&perPage=1`,
    { headers }
  );

  if (existing.data.items?.length) {
    const recordId = existing.data.items[0].id;
    await axios.patch(
      `${POCKETBASE_URL}/api/collections/${SUBSCRIPTIONS_COLLECTION}/records/${recordId}`,
      { status },
      { headers }
    );
  }
}

async function getActiveSubscription(userId) {
  const headers = await getPocketBaseAdminHeaders();
  const query = encodeURIComponent(`userId="${userId}" && status="active"`);
  const res = await axios.get(
    `${POCKETBASE_URL}/api/collections/${SUBSCRIPTIONS_COLLECTION}/records?filter=${query}&perPage=1`,
    { headers }
  );

  return res.data.items?.[0] || null;
}

function requireUser(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token requerido' });
  }
  req.userToken = auth.replace('Bearer ', '').trim();
  next();
}

async function requireActivePlan(req, res, next) {
  try {
    const userId = req.user?.record?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const subscription = await getActiveSubscription(userId);
    if (!subscription) {
      return res.status(403).json({ success: false, error: 'Plan no activo' });
    }

    req.subscription = subscription;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function attachUserFromToken(req, res, next) {
  try {
    if (!POCKETBASE_URL) {
      return res.status(500).json({ success: false, error: 'POCKETBASE_URL no configurado' });
    }

    const response = await axios.post(`${POCKETBASE_URL}/api/collections/${USERS_COLLECTION}/auth-refresh`, {}, {
      headers: { Authorization: `Bearer ${req.userToken}` }
    });
    req.user = response.data;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
  }
}


function normalizeBilling(value) {
  const raw = (value || '').toString().toLowerCase();
  if (raw === 'mensual') return 'monthly';
  if (raw === 'anual') return 'annual';
  return raw;
}

// GENERAR XML SIMPLE
function generarXML(datos) {
  const fecha = new Date().toISOString().slice(0, 19);

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante 
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  Version="4.0"
  Fecha="${fecha}"
  SubTotal="100.00"
  Moneda="MXN"
  Total="116.00"
  TipoDeComprobante="I"
  LugarExpedicion="11570">
</cfdi:Comprobante>`;
}

// TIMBRAR
app.post('/timbrar', requireUser, attachUserFromToken, requireActivePlan, async (req, res) => {
  try {
    const username = process.env.FINKOK_USER;
    const password = process.env.FINKOK_PASS;
    const url = process.env.FINKOK_URL || 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl';

    const xml = generarXML(req.body);
    const xmlBase64 = Buffer.from(xml).toString('base64');

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope 
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
  xmlns:ns1="http://facturacion.finkok.com/stamp">
  <soapenv:Header/>
  <soapenv:Body>
    <ns1:stamp>
      <ns1:xml>${xmlBase64}</ns1:xml>
      <ns1:username>${username}</ns1:username>
      <ns1:password>${password}</ns1:password>
    </ns1:stamp>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await axios.post(url, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '""'
      },
      timeout: 30000
    });

    const responseXML = response.data.toString();
    const uuidMatch = responseXML.match(/UUID="([^"]+)"/);
    const uuid = uuidMatch ? uuidMatch[1] : null;

    return res.json({
      success: true,
      uuid,
      raw: responseXML.substring(0, 1000)
    });
  } catch (err) {
    console.error('ERROR TIMBRAR:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// AUTH — REGISTRO (sin llamadas a Stripe)
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, rfc, razonSocial } = req.body;
    const plan = (req.body.plan || '').toLowerCase();
    const billing = normalizeBilling(req.body.billing || "monthly");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y password requeridos'
      });
    }

    if (!plan || !ALLOWED_PLANS.includes(plan)) {
      return res.status(400).json({
        success: false,
        error: `Plan inválido. Planes permitidos: ${ALLOWED_PLANS.join(', ')}`
      });
    }

    if (!billing || !ALLOWED_BILLING.includes(billing)) {
      return res.status(400).json({
        success: false,
        error: `Billing inválido. Valores permitidos: ${ALLOWED_BILLING.join(', ')}`
      });
    }

    if (!POCKETBASE_URL) {
      return res.status(500).json({ success: false, error: 'POCKETBASE_URL no configurado' });
    }

    const userPayload = {
      email,
      password,
      passwordConfirm: password,
      name,
      rfc,
      razonSocial
    };

    const userCreate = await axios.post(
      `${POCKETBASE_URL}/api/collections/${USERS_COLLECTION}/records`,
      userPayload
    );

    const loginRes = await axios.post(`${POCKETBASE_URL}/api/collections/${USERS_COLLECTION}/auth-with-password`, {
      identity: email,
      password
    });

    const headers = await getPocketBaseAdminHeaders();
    const subscriptionData = {
      userId: userCreate.data.id,
      plan,
      billing,
      status: plan === 'gratuito' ? 'active' : 'pending_payment',
      stripeCustomerId: null,
      stripeSubscriptionId: null
    };

    // Mantener dentro del handler async de registro
    await upsertSubscription(headers, subscriptionData);

    const { password: _pwd, passwordConfirm: _pwdConfirm, ...safeUser } = userCreate.data || {};

    return res.json({
      success: true,
      user: safeUser,
      token: loginRes.data.token,
      subscription: subscriptionData
    });
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    return res.status(500).json({
      success: false,
      error: message
    });
  }
});

// AUTH — LOGIN
app.post('/auth/login', async (req, res) => {
  try {
    if (!POCKETBASE_URL) {
      return res.status(500).json({ success: false, error: 'POCKETBASE_URL no configurado' });
    }
    const { email, password } = req.body;

    const response = await axios.post(`${POCKETBASE_URL}/api/collections/${USERS_COLLECTION}/auth-with-password`, {
      identity: email,
      password
    });

    return res.json({
      success: true,
      token: response.data.token,
      user: response.data.record
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Credenciales inválidas'
    });
  }
});

// STRIPE CHECKOUT
app.post('/stripe/create-checkout-session', requireUser, attachUserFromToken, async (req, res) => {
  let debugPlan = '';
  let debugBilling = '';
  let debugPriceEnvKey = '';
  let debugPriceId = '';

  try {
    if (!stripe) {
      return res.status(500).json({
        success: false,
        error: 'Stripe no configurado'
      });
    }

    const plan = (req.body.plan || '').toLowerCase();
    const billing = normalizeBilling(req.body.billing || "monthly");
    debugPlan = plan;
    debugBilling = billing;
    const email = req.user?.record?.email || req.body.email || '';

    const priceMap = {
      esencial: {
        monthly: process.env.STRIPE_PRICE_ESENCIAL_MENSUAL,
        annual: process.env.STRIPE_PRICE_ESENCIAL_ANUAL
      },
      profesional: {
        monthly: process.env.STRIPE_PRICE_PROFESIONAL_MENSUAL,
        annual: process.env.STRIPE_PRICE_PROFESIONAL_ANUAL
      },
      premium: {
        monthly: process.env.STRIPE_PRICE_PREMIUM_MENSUAL,
        annual: process.env.STRIPE_PRICE_PREMIUM_ANUAL
      },
      despacho: {
        monthly: process.env.STRIPE_PRICE_DESPACHO_MENSUAL,
        annual: process.env.STRIPE_PRICE_DESPACHO_ANUAL
      }
    };

    const priceEnvKeyMap = {
      esencial: {
        monthly: 'STRIPE_PRICE_ESENCIAL_MENSUAL',
        annual: 'STRIPE_PRICE_ESENCIAL_ANUAL'
      },
      profesional: {
        monthly: 'STRIPE_PRICE_PROFESIONAL_MENSUAL',
        annual: 'STRIPE_PRICE_PROFESIONAL_ANUAL'
      },
      premium: {
        monthly: 'STRIPE_PRICE_PREMIUM_MENSUAL',
        annual: 'STRIPE_PRICE_PREMIUM_ANUAL'
      },
      despacho: {
        monthly: 'STRIPE_PRICE_DESPACHO_MENSUAL',
        annual: 'STRIPE_PRICE_DESPACHO_ANUAL'
      }
    };

    const priceEnvKey = priceEnvKeyMap[plan]?.[billing];
    const priceId = priceMap[plan]?.[billing];
    debugPriceEnvKey = priceEnvKey || '';
    debugPriceId = priceId || '';

    console.log('[STRIPE CHECKOUT DEBUG] plan:', plan, 'billing:', billing, 'priceEnvKey:', priceEnvKey, 'priceId:', priceId);

    if (!priceId) {
      return res.status(400).json({
        success: false,
        error: `Stripe price not found: ${priceEnvKey || 'UNKNOWN_PRICE_ENV_KEY'}`
      });
    }

    // Declaración única de URLs de retorno para Stripe Checkout
    const successUrl = process.env.STRIPE_SUCCESS_URL;
    const cancelUrl = process.env.STRIPE_CANCEL_URL;

    if (!successUrl || !cancelUrl) {
      return res.status(500).json({
        success: false,
        error: 'Faltan STRIPE_SUCCESS_URL o STRIPE_CANCEL_URL'
      });
    }

    console.log("STRIPE KEY PREFIX:", process.env.STRIPE_SECRET_KEY?.slice(0, 18));
    console.log("PRICE ESENCIAL:", process.env.STRIPE_PRICE_ESENCIAL_MENSUAL);

    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: req.user.record.id,
      metadata: {
        userId: req.user.record.id,
        plan,
        billing
      }
    };

    if (email) {
      sessionConfig.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    const headers = await getPocketBaseAdminHeaders();
    await upsertSubscription(headers, {
      userId: req.user.record.id,
      plan,
      billing,
      status: 'pending_payment',
      stripeCustomerId: null,
      stripeSubscriptionId: null
    });

    return res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      debugSuccessUrl: successUrl,
      debugCancelUrl: cancelUrl
    });
  } catch (err) {
    const stripeStatus = err?.statusCode || err?.raw?.statusCode || err?.response?.status;
    const stripeMessage = err?.raw?.message || err?.message || 'Unknown Stripe error';
    const stripeResponseData = err?.response?.data;
    const stripeErrorMessage = err?.response?.data?.error?.message;
    const stripeErrorCode = err?.response?.data?.error?.code;
    const stripeErrorParam = err?.response?.data?.error?.param;
    const stripeRequestLogUrl = err?.response?.data?.error?.request_log_url;

    console.error('[STRIPE CHECKOUT ERROR]', {
      plan: debugPlan,
      billing: debugBilling,
      priceEnvKey: debugPriceEnvKey,
      priceId: debugPriceId,
      stripeStatus,
      stripeMessage,
      stripeResponseData,
      stripeErrorMessage,
      stripeErrorCode,
      stripeErrorParam,
      stripeRequestLogUrl
    });

    return res.status(500).json({
      success: false,
      error: stripeMessage,
      stripeStatus,
      stripeResponseData,
      stripeErrorMessage,
      stripeErrorCode,
      stripeErrorParam,
      stripeRequestLogUrl
    });
  }
});

// VERIFY STRIPE SESSION
app.get('/stripe/verify-session/:sessionId', requireUser, attachUserFromToken, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        success: false,
        error: 'Stripe no configurado'
      });
    }

    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);

    return res.json({
      success: true,
      session
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.get('/billing/status', requireUser, attachUserFromToken, async (req, res) => {
  try {
    const subscription = await getActiveSubscription(req.user.record.id);
    return res.json({ success: true, active: !!subscription, subscription });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


app.get('/success', (req, res) => {
  const sessionId = req.query.session_id || 'N/A';
  return res.status(200).send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pago recibido</title>
  </head>
  <body style="font-family: Arial, sans-serif; padding: 24px;">
    <h1>Pago recibido</h1>
    <p>Estamos activando tu suscripción</p>
    <p><strong>session_id:</strong> ${sessionId}</p>
    <p><a href="https://satdirecto.com">Ir a satdirecto.com</a></p>
  </body>
</html>`);
});


app.get(['/app/*', '/app'], (req, res, next) => {
  const indexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
  if (require('fs').existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return next();
});

// 404 JSON — SIEMPRE AL FINAL
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// START — SIEMPRE LO ÚLTIMO
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🚀 Microservicio listo en puerto', PORT);
  console.log("STRIPE KEY PREFIX:", process.env.STRIPE_SECRET_KEY?.slice(0, 18));
  console.log("PRICE ESENCIAL:", process.env.STRIPE_PRICE_ESENCIAL_MENSUAL);
});
