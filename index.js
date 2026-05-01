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

// ============================================
// HEALTH
// ============================================
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

// ============================================
// GENERAR XML SIMPLE
// ============================================
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

// ============================================
// TIMBRAR
// ============================================
app.post('/timbrar', async (req, res) => {
  try {
    console.log('=== TIMBRADO ===');

    // ⚠️ SOLO ENV VARIABLES
    const username = process.env.FINKOK_USER;
    const password = process.env.FINKOK_PASS;
    const url = process.env.FINKOK_URL || 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl';

    console.log('Usuario:', username);
    console.log('Password existe:', !!password);
    console.log('Password longitud:', password ? password.length : 0);

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

    console.log('SOAP trae password:', soapEnvelope.includes('<ns1:password>'));

    const response = await axios.post(url, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '""'
      },
      timeout: 30000
    });

    const responseXML = response.data.toString();

console.log('Status:', response.status);
console.log('Respuesta:', responseXML.substring(0, 500));

// 🔥 EXTRAER UUID REAL
const uuidMatch = responseXML.match(/UUID="([^"]+)"/);
const uuid = uuidMatch ? uuidMatch[1] : null;

console.log('UUID EXTRAÍDO:', uuid);

// 🔥 RESPUESTA CORRECTA AL FRONT
res.json({
  success: true,
  uuid: uuid,
  raw: responseXML.substring(0, 1000)
});

  } catch (err) {
    console.error('ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ============================================
// AUTH — REGISTRO
// ============================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, rfc, razonSocial } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y password requeridos'
      });
    }

    console.log('Nuevo usuario:', req.body);

    return res.json({
      success: true,
      user: {
        email,
        name,
        rfc,
        razonSocial,
        plan: 'gratuito'
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error creando usuario'
    });
  }
});

// ============================================
// AUTH — LOGIN
// ============================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email } = req.body;

    return res.json({
      success: true,
      token: 'test-token',
      user: {
        email,
        plan: 'gratuito'
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error login'
    });
  }
});
// START
// ============================================
// ============================================
// AUTH - REGISTRO
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Microservicio listo en puerto', PORT);
});
