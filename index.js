// ============================================
// SAT DIRECTO — Microservicio de Timbrado
// ============================================

const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json({ limit: '10mb' }));

const users = [];

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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'satdirecto-timbrado',
    timestamp: new Date().toISOString()
  });
});

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
app.post('/timbrar', async (req, res) => {
  try {
    console.log('=== TIMBRADO ===');

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
        'SOAPAction': '""'
      },
      timeout: 30000
    });

    const responseXML = response.data.toString();
    const uuidMatch = responseXML.match(/UUID="([^"]+)"/);
    const uuid = uuidMatch ? uuidMatch[1] : null;

    res.json({
      success: true,
      uuid,
      raw: responseXML.substring(0, 1000)
    });

  } catch (err) {
    console.error('ERROR:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// AUTH — REGISTRO
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, rfc, razonSocial } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y password requeridos'
      });
    }

    const exists = users.find(u => u.email === email);
    if (exists) {
      return res.status(400).json({
        success: false,
        error: 'Usuario ya existe'
      });
    }

    const user = {
      id: Date.now(),
      email,
      password,
      name,
      rfc,
      razonSocial,
      plan: 'gratuito'
    };

    users.push(user);

    return res.json({
      success: true,
      user
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error creando usuario'
    });
  }
});

// AUTH — LOGIN
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    return res.json({
      success: true,
      token: 'test-token',
      user
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error login'
    });
  }
});

// 404 JSON
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// START
const PORT = process.env.PORT || 3000;// ===============================
// STRIPE CHECKOUT
// ===============================
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

app.post('/stripe/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        success: false,
        error: 'Stripe no configurado'
      });
    }

    const plan = (req.body.plan || '').toLowerCase();
    const billing = (req.body.billing || 'monthly').toLowerCase();

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

    const priceId = priceMap[plan]?.[billing];

    if (!priceId) {
      return res.status(400).json({
        success: false,
        error: 'Plan inválido o no configurado'
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: 'https://satdirecto.com/success',
      cancel_url: 'https://satdirecto.com/planes'
    });

    res.json({
      success: true,
      url: session.url
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});
app.post('/stripe/create-checkout-session', async (req, res) => {
  try {
    const { plan, billing } = req.body;

    console.log('Stripe request:', { plan, billing });

    return res.json({
      success: true,
      url: 'https://checkout.stripe.com/test',
      sessionId: 'test_session'
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});
app.listen(PORT, () => {
  console.log('🚀 Microservicio listo en puerto', PORT);
});
