// ============================================
// SAT DIRECTO — Microservicio de Timbrado
// Deploy en Railway.app
// ============================================

const express = require('express');
const axios = require('axios');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

const app = express();
app.use(express.json({ limit: '10mb' }));

// CORS para Horizons
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'SAT Directo — Timbrado Finkok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// GENERAR XML CFDI 4.0
// ============================================
function generarXMLCFDI(datos) {
  const {
    rfcEmisor = 'EKU9003173C9',
    nombreEmisor = 'ESCUELA KEMPER URGATE',
    regimenEmisor = '601',
    cpExpedicion = '11570',
    rfcReceptor,
    nombreReceptor = 'PUBLICO EN GENERAL',
    regimenReceptor = '616',
    cpReceptor = '62964',
    concepto,
    claveProdServ = '84111506',
    claveUnidad = 'ACT',
    subtotal,
    formaPago = '03',
    metodoPago = 'PUE',
    usoCFDI = 'G03',
    folio = '1',
    serie = 'A'
  } = datos;

  const subtotalNum = parseFloat(subtotal);
  const ivaNum = parseFloat((subtotalNum * 0.16).toFixed(2));
  const totalNum = parseFloat((subtotalNum + ivaNum).toFixed(2));
  
  // Fecha actual formato SAT
  const now = new Date();
  const fecha = now.toISOString().slice(0, 19);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante 
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"
  Version="4.0"
  Serie="${serie}"
  Folio="${folio}"
  Fecha="${fecha}"
  FormaPago="${formaPago}"
  NoCertificado="30001000000400002434"
  Certificado="MIIFxTCCA62gAwIBAgIUMzAwMDEwMDAwMDA0MDAwMDI0MzQwDQYJKoZIhvcNAQELBQAwggFmMSAwHgYDVQQDDBdBLkMuIDIgZGUgcHJ1ZWJhcyg0MDk2KTEvMC0GA1UECgwmU2VydmljaW8gZGUgQWRtaW5pc3RyYWNpw7NuIFRyaWJ1dGFyaWExODA2BgNVBAsML0FkbWluaXN0cmFjacOzbiBkZSBTZWd1cmlkYWQgZGUgbGEgSW5mb3JtYWNpw7NuMSkwJwYJKoZIhvcNAQkBFhphc2lzbmV0QHBydWViYXMuc2F0LmdvYi5teDEmMCQGA1UECQwdQXYuIEhpZGFsZ28gNzcsIENvbC4gR3VlcnJlcm8wDgYDVR0PAQH/BAQDAgbAMB0GA1UdDgQWBBQVVOKKNxJIblSJK2V0A0y0e7PFpjAfBgNVHSMEGDAWgBRrHKiCKGHvHOE2WKe1Ql5y0TxlezAMBgNVHRMBAf8EAjAAMBMGA1UdJQQMMAoGCCsGAQUFBwMCMA0GCSqGSIb3DQEBCwUAA4ICAQBonlhUUSDo0bfCOvSXuOC7GD7T+pq2fzKd0ySBHmgFSCPzrJuiEyiQVCiLPFhqaJFGhOCjF+0i+kfbLvCuHi1zAj/SLLfpHLHXoHm3bKI5nAFGVDEAJCR0FgdSSaRqQQ3nHJYFEuqYkfEm/wVCnS3MtgvVFnFDp0o0g72V5bFRHBDn2TW7Bk3lCTJqzHqNbdlmSxFaGpU7v87JgJHr0vy0Y3+X8n0TW2FNHQAV5/0FZ5X7kKQ15Hs2v5V5s5v01gJmqCDjFiUqx8XjJZ9X3XKQVF3zHFJJHhR8YqKYf4Y0RRF0K/FKT+V7eSsFJkfJmvQLlFkHBNDsBHNi8gNlmXHnMXJKzTWt5kJHiIpLkWvS0gN7PrKjX4FHJnCvmwJZvuLGNxFbHiLZ9WYiHlDhN5E6VyxOFGr7K0y7jq+pQ1qAMXB6r5Y/q5mQzKFHM2jGO/T="
  SubTotal="${subtotalNum.toFixed(2)}"
  Moneda="MXN"
  Total="${totalNum.toFixed(2)}"
  TipoDeComprobante="I"
  Exportacion="01"
  MetodoPago="${metodoPago}"
  LugarExpedicion="${cpExpedicion}">
  
  <cfdi:Emisor 
    Rfc="${rfcEmisor}"
    Nombre="${nombreEmisor}"
    RegimenFiscal="${regimenEmisor}"/>
    
  <cfdi:Receptor
    Rfc="${rfcReceptor}"
    Nombre="${nombreReceptor}"
    DomicilioFiscalReceptor="${cpReceptor}"
    RegimenFiscalReceptor="${regimenReceptor}"
    UsoCFDI="${usoCFDI}"/>
    
  <cfdi:Conceptos>
    <cfdi:Concepto
      ClaveProdServ="${claveProdServ}"
      Cantidad="1"
      ClaveUnidad="${claveUnidad}"
      Descripcion="${concepto}"
      ValorUnitario="${subtotalNum.toFixed(6)}"
      Importe="${subtotalNum.toFixed(6)}"
      ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado
            Base="${subtotalNum.toFixed(6)}"
            Impuesto="002"
            TipoFactor="Tasa"
            TasaOCuota="0.160000"
            Importe="${ivaNum.toFixed(6)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
  
  <cfdi:Impuestos TotalImpuestosTrasladados="${ivaNum.toFixed(6)}">
    <cfdi:Traslados>
      <cfdi:Traslado
        Base="${subtotalNum.toFixed(6)}"
        Impuesto="002"
        TipoFactor="Tasa"
        TasaOCuota="0.160000"
        Importe="${ivaNum.toFixed(6)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  
</cfdi:Comprobante>`;

  return xml;
}

// ============================================
// ENDPOINT PRINCIPAL — TIMBRAR CFDI
// ============================================
app.post('/timbrar', async (req, res) => {
  console.log('=== SOLICITUD DE TIMBRADO ===');
  console.log('Body:', JSON.stringify(req.body, null, 2));

  try {
    const {
      rfcReceptor,
      nombreReceptor,
      regimenReceptor,
      cpReceptor,
      concepto,
      subtotal,
      formaPago,
      metodoPago,
      usoCFDI,
      folio,
      // Credenciales Finkok (opcionales, usa default si no vienen)
      finkokUser,
      finkokPass
    } = req.body;

    // Validaciones básicas
    if (!rfcReceptor || !concepto || !subtotal) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: rfcReceptor, concepto, subtotal'
      });
    }

    // 1. Generar XML CFDI 4.0
    console.log('Generando XML CFDI...');
    const xmlCFDI = generarXMLCFDI({
      rfcReceptor,
      nombreReceptor: nombreReceptor || 'PUBLICO EN GENERAL',
      regimenReceptor: regimenReceptor || '616',
      cpReceptor: cpReceptor || '62964',
      concepto,
      subtotal,
      formaPago: formaPago || '03',
      metodoPago: metodoPago || 'PUE',
      usoCFDI: usoCFDI || 'G03',
      folio: folio || Date.now().toString()
    });

    console.log('XML generado correctamente');

    // 2. Convertir a Base64
    const xmlBase64 = Buffer.from(xmlCFDI, 'utf8').toString('base64');

    // 3. Credenciales Finkok
    const username = finkokUser || process.env.FINKOK_USER || 'varelah36@gmail.com';
    const password = finkokPass || process.env.FINKOK_PASS || 'Eduvare1@';
    const finkokUrl = process.env.FINKOK_URL || 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl';

    // 4. Construir SOAP Envelope
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope 
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
  xmlns:stamp="http://facturacion.finkok.com/stamp">
  <soapenv:Header/>
  <soapenv:Body>
    <stamp:stamp_cfdi>
      <stamp:xml>${xmlBase64}</stamp:xml>
      <stamp:username>${username}</stamp:username>
      <stamp:password>${password}</stamp:password>
    </stamp:stamp_cfdi>
  </soapenv:Body>
</soapenv:Envelope>`;

    console.log('Enviando a Finkok...');
    console.log('URL:', finkokUrl);
    console.log('Usuario:', username);

    // 5. Llamar a Finkok
    const response = await axios({
      method: 'POST',
      url: finkokUrl,
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': '"http://facturacion.finkok.com/stamp/stamp_cfdi"',
        'Accept': 'text/xml'
      },
      data: soapEnvelope,
      timeout: 30000,
      validateStatus: () => true // No lanzar error en status 4xx/5xx
    });

    console.log('Status Finkok:', response.status);
    const xmlRespuesta = response.data?.toString() || '';
    console.log('Respuesta Finkok (primeros 800 chars):', xmlRespuesta.substring(0, 800));

    // 6. Extraer UUID directo con regex - más confiable que XML parser
    // Finkok puede devolver UUID en atributo o en elemento
    const uuidPatterns = [
      /UUID="([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"/i,
      /<[^>]*UUID[^>]*>([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})</i,
      /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/i
    ];

    let uuid = null;
    for (const pattern of uuidPatterns) {
      const match = xmlRespuesta.match(pattern);
      if (match && match[1]) {
        uuid = match[1].toUpperCase();
        break;
      }
    }

    console.log('UUID extraído:', uuid);

    // 7. Extraer otros datos con regex
    const codEstatusMatch = xmlRespuesta.match(/CodEstatus[^>]*>([^<]+)</i) 
      || xmlRespuesta.match(/CodEstatus="([^"]+)"/i);
    const codEstatus = codEstatusMatch ? codEstatusMatch[1] : null;

    const errorMatch = xmlRespuesta.match(/MensajeIncidencia[^>]*>([^<]+)</i)
      || xmlRespuesta.match(/faultstring[^>]*>([^<]+)</i)
      || xmlRespuesta.match(/message[^>]*>([^<]+)</i);
    const errorMsg = errorMatch ? errorMatch[1] : null;

    const xmlTimbradoMatch = xmlRespuesta.match(/<xml[^>]*>([^<]+)<\/[^>]*xml>/i);
    const xmlTimbrado = xmlTimbradoMatch ? xmlTimbradoMatch[1] : null;

    console.log('CodEstatus:', codEstatus);
    console.log('Error:', errorMsg);

    if (uuid) {
      // ✅ TIMBRADO EXITOSO
      console.log('✅ TIMBRADO EXITOSO - UUID:', uuid);
      return res.json({
        success: true,
        uuid: uuid,
        codEstatus: codEstatus || '200',
        xmlTimbrado: xmlTimbrado,
        mensaje: 'CFDI timbrado exitosamente',
        timestamp: new Date().toISOString()
      });
    } else {
      // ❌ ERROR - Finkok no devolvió UUID
      const mensajeError = errorMsg || codEstatus || 'Sin UUID en respuesta de Finkok';
      console.error('❌ Error Finkok:', mensajeError);
      console.error('Respuesta completa:', xmlRespuesta.substring(0, 2000));
      
      return res.status(422).json({
        success: false,
        error: mensajeError,
        codEstatus: codEstatus,
        rawResponse: xmlRespuesta.substring(0, 1500)
      });
    }

  } catch (error) {
    console.error('Error en timbrado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      tipo: error.code || 'ERROR_INTERNO'
    });
  }
});

// ============================================
// ENDPOINT — CANCELAR CFDI
// ============================================
app.post('/cancelar', async (req, res) => {
  const { uuid, rfcEmisor, finkokUser, finkokPass } = req.body;

  if (!uuid || !rfcEmisor) {
    return res.status(400).json({ 
      success: false, 
      error: 'uuid y rfcEmisor son requeridos' 
    });
  }

  try {
    const username = finkokUser || process.env.FINKOK_USER;
    const password = finkokPass || process.env.FINKOK_PASS;
    const cancelUrl = process.env.FINKOK_CANCEL_URL 
      || 'https://demo-facturacion.finkok.com/servicios/soap/cancel.wsdl';

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope 
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:can="http://facturacion.finkok.com/cancel">
  <soapenv:Header/>
  <soapenv:Body>
    <can:cancel_signature>
      <can:UUIDS>
        <can:uuids>
          <can:rfcEmisor>${rfcEmisor}</can:rfcEmisor>
          <can:uuid>${uuid}</can:uuid>
          <can:motivo>02</can:motivo>
        </can:uuids>
      </can:UUIDS>
      <can:username>${username}</can:username>
      <can:password>${password}</can:password>
      <can:rfc>${rfcEmisor}</can:rfc>
    </can:cancel_signature>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await axios.post(cancelUrl, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': '"http://facturacion.finkok.com/cancel/cancel_signature"'
      },
      timeout: 30000
    });

    res.json({ 
      success: true, 
      respuesta: response.data?.toString()?.substring(0, 500)
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// HELPER — Extraer valor de XML con regex
// ============================================
function extractFromXML(xml, tag) {
  const patterns = [
    new RegExp(`<${tag}>([^<]+)<\/${tag}>`),
    new RegExp(`<[^>]*:${tag}>([^<]+)<\/[^>]*:${tag}>`),
    new RegExp(`${tag}="([^"]+)"`),
  ];
  
  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  return null;
}

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 SAT Directo — Microservicio Timbrado`);
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🔗 Finkok URL: ${process.env.FINKOK_URL || 'demo-facturacion.finkok.com'}`);
  console.log(`✅ Listo para timbrar CFDIs\n`);
});

module.exports = app;
