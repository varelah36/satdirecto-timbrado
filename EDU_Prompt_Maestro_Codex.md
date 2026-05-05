EDU — Prompt Maestro para Codex
Versión definitiva post-decisiones de arquitectura
Mayo 2026 · Ecosistema SAT Directo + VAVA


Cómo usar este documento: Cada sección es un prompt independiente. Cópialos en orden y pégalos en Codex. Espera que Codex ejecute y confirme antes de pasar al siguiente. Tú solo revisas, pruebas y apruebas.


CONTEXTO GLOBAL (incluir en TODOS los prompts)
Estás construyendo EDU, un SaaS fiscal para trabajadores de plataformas digitales
en México (Uber, DiDi, Rappi, Uber Eats, Airbnb) y usuarios RESICO.

EDU es un subproducto del ecosistema SAT Directo + VAVA Fiscal.
El dueño del producto es Jesús Eduardo — no programa, solo revisa y aprueba.

DECISIONES DE ARQUITECTURA YA TOMADAS (no cuestionar, solo implementar):

1. NO hay carga de CSV. Fue descartado.
2. La fuente de datos es el SAT directamente, via e.firma del usuario.
3. La e.firma NUNCA sube al servidor. Todo el proceso criptográfico
   ocurre en el dispositivo del usuario (browser o app).
4. Solo sube al servidor: la firma digital resultante + el certificado
   público .cer. Nunca el archivo .key. Nunca la contraseña.
5. Los usuarios del mercado objetivo YA tienen e.firma vigente
   (es requisito obligatorio para trabajar en plataformas digitales
   y para estar en RESICO en México 2026).
6. El PAC para operaciones SAT es Finkok (ya integrado en SAT Directo).

STACK TÉCNICO:
- Frontend: React 18 + Vite + Tailwind CSS
- Backend / DB / Auth: Supabase (PostgreSQL + RLS + Edge Functions)
- Pagos: Stripe
- IA Chat: OpenAI GPT-4o
- Firma local: librería node-forge (corre en browser)
- Deploy: Vercel (frontend) + Supabase (backend)
- PAC / SAT: Finkok

IDENTIDAD VISUAL EDU:
- Primary: #3B5998 (azul Trust Blue)
- Secondary: #E6F7FF (Sky Blue)
- Success: #52C41A (Clear Green)
- Alert: #FF4D4F (Soft Red)
- Dark: #141414
- Font: Sora (Google Fonts)
- Personalidad: "Tu amigo en los temas del SAT" — lenguaje simple,
  nunca jerga fiscal, tono amigable y directo.

FLUJO PRINCIPAL DEL USUARIO (ya validado):
1. Registro (email/Google) → 30 segundos
2. Onboarding: RFC + subir e.firma (.key + .cer) desde su dispositivo
3. Firma ocurre LOCAL en su browser con node-forge
4. Solo la firma digital + .cer público viajan al servidor
5. EDU consulta el SAT via Finkok con esa firma
6. Dashboard se llena automático: ingresos, retenciones, monto a pagar
7. Usuario declara en 1 clic (requiere plan de pago activo)
8. Recordatorios automáticos cada mes — el usuario no tiene que hacer nada


PROMPT 1 — Revisar estado actual del proyecto
[CONTEXTO GLOBAL AQUÍ]

Antes de escribir cualquier código, revisa el estado actual del proyecto.

1. Lista todos los archivos existentes en el repositorio con su propósito
2. Revisa package.json y lista todas las dependencias instaladas
3. Verifica si hay conexión a Supabase configurada (.env o similar)
4. Verifica si hay integración con Stripe configurada
5. Verifica si existe alguna integración con Finkok o SAT
6. Lista qué funciona actualmente y qué falta construir
7. Identifica cualquier código de CSV parser que deba eliminarse
   (esa arquitectura fue descartada)

Devuelve un reporte de estado en formato:
- ✅ Existe y funciona: [lista]
- ⚠️ Existe pero necesita cambios: [lista]
- ❌ Falta construir: [lista]
- 🗑️ Debe eliminarse (CSV logic): [lista]

No hagas ningún cambio todavía. Solo reporta.


PROMPT 2 — Crear estructura base del proyecto EDU
[CONTEXTO GLOBAL AQUÍ]

Crea la estructura base del proyecto EDU desde cero con este stack:
React 18 + Vite + Tailwind CSS + React Router v6 + Supabase JS client

ESTRUCTURA DE CARPETAS:
src/
  pages/
    Landing.jsx
    Login.jsx
    Register.jsx
    Onboarding.jsx       ← RFC + e.firma (NO CSV)
    Dashboard.jsx
    Calculation.jsx
    Declaration.jsx
    Chat.jsx
    Subscription.jsx
    History.jsx
    Profile.jsx
    Admin.jsx
    Upsell.jsx
  components/
    Navbar.jsx
    BottomNav.jsx
    TaxCard.jsx
    StatusBadge.jsx
    EfirmaUploader.jsx   ← componente crítico, firma local
    ChatBubble.jsx
    PlatformDetector.jsx ← detecta plataformas desde datos SAT
    UpsellBanner.jsx
  hooks/
    useAuth.js
    useTax.js
    useSubscription.js
    useEfirma.js         ← maneja estado local de e.firma
  lib/
    supabase.js
    stripe.js
    efirmaLocal.js       ← CRÍTICO: toda la lógica criptográfica
    satClient.js         ← consultas al SAT via Finkok
    taxCalculator.js
  constants/
    taxTables.js         ← tablas RESICO actualizadas 2026

CONFIGURAR EN tailwind.config.js:
colors:
  edu-blue: '#3B5998'
  edu-sky: '#E6F7FF'
  edu-green: '#52C41A'
  edu-red: '#FF4D4F'
  edu-dark: '#141414'

fonts:
  sans: ['Sora', 'sans-serif']

INSTALAR:
- @supabase/supabase-js
- react-router-dom
- node-forge          ← para firma local de e.firma
- @stripe/stripe-js
- react-dropzone      ← para subir archivos .key y .cer
- date-fns

Ejecuta: npm run dev
Confirma que la app corre en localhost:3000 sin errores.


PROMPT 3 — Módulo e.firma local (EL MÁS CRÍTICO)
[CONTEXTO GLOBAL AQUÍ]

Implementa el módulo de firma local de e.firma. Este es el componente
más importante de seguridad de EDU.

REGLA ABSOLUTA: El archivo .key y la contraseña NUNCA salen del
dispositivo del usuario. Todo el proceso criptográfico ocurre en el
browser con node-forge.

ARCHIVO: src/lib/efirmaLocal.js

Implementa las siguientes funciones:

1. readFileAsArrayBuffer(file)
   - Lee un archivo usando FileReader API
   - Devuelve ArrayBuffer
   - Es local, no hace ninguna llamada de red

2. decryptPrivateKey(keyFileBytes, password)
   - Usa node-forge para descifrar el .key con la contraseña
   - El .key de SAT México es formato DER encriptado con 3DES
   - Devuelve el objeto privateKey de forge
   - Después de devolver, la contraseña debe setearse a null
   - Si la contraseña es incorrecta, lanza error claro: 
     "Contraseña incorrecta. Verifica tu contraseña de e.firma."

3. parseCertificate(cerFileBytes)
   - Lee el archivo .cer (DER format)
   - Extrae: RFC, nombre completo, vigencia, número de serie
   - El .cer es público — solo contiene datos del certificado
   - Devuelve objeto: { rfc, nombre, vigencia, serie, cerBase64 }

4. signChallenge(privateKey, challenge)
   - Firma el string challenge con SHA256withRSA
   - Devuelve la firma en base64
   - Inmediatamente después setea privateKey = null

5. processEfirma(keyFile, cerFile, password, serverChallenge)
   - Función principal que orquesta el flujo completo
   - Llama a las anteriores en orden
   - Devuelve SOLO: { firma: string, cerBase64: string, rfc: string }
   - NUNCA devuelve ni expone la llave privada ni la contraseña
   - En un finally: destruye todas las variables sensibles de memoria

ARCHIVO: src/components/EfirmaUploader.jsx

UI para que el usuario suba sus archivos:
- Zona drag & drop separada para .key y .cer
- Campo de contraseña (type="password")
- Texto visible: "Tus archivos no salen de tu dispositivo"
- Ícono de candado junto al campo de contraseña
- Botón "Conectar con el SAT"
- Estado de carga mientras procesa
- Mensaje de éxito o error claro

ARCHIVO: src/hooks/useEfirma.js

Hook que:
- Mantiene estado: { status, rfc, nombre, error }
- status puede ser: 'idle' | 'processing' | 'connected' | 'error'
- Llama a processEfirma cuando el usuario confirma
- Guarda en sessionStorage SOLO: rfc y nombre (no datos sensibles)
- Al cerrar sesión, limpia sessionStorage

PRUEBA:
Descarga una e.firma de prueba del SAT (SAT tiene e.firmas de prueba
en su ambiente de certificación) y verifica que:
1. El .key se lee correctamente
2. Con contraseña correcta → firma generada exitosamente
3. Con contraseña incorrecta → mensaje de error claro
4. Después de procesar, no hay rastro del .key en memoria/network tab
5. En el Network tab del browser NO aparece ningún request
   con el contenido del .key


PROMPT 4 — Base de datos Supabase
[CONTEXTO GLOBAL AQUÍ]

Crea el esquema completo de base de datos EDU en Supabase.

ARCHIVO: supabase/migrations/001_edu_schema.sql

TABLAS:

-- Usuarios (extiende Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  rfc VARCHAR(13),
  full_name VARCHAR(200),
  tax_regime VARCHAR(50) DEFAULT 'RESICO',
  phone VARCHAR(20),
  cer_base64 TEXT,        -- certificado público .cer (NO la llave privada)
  cer_serial VARCHAR(100),
  cer_expiry TIMESTAMP,
  sat_connected BOOLEAN DEFAULT false,
  sat_connected_at TIMESTAMP,
  notifications_email BOOLEAN DEFAULT true,
  notifications_push BOOLEAN DEFAULT true,
  plan VARCHAR(20) DEFAULT 'free',  -- free | basic | annual
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Plataformas detectadas del SAT (no configuradas por el usuario)
CREATE TABLE detected_platforms (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  platform_name VARCHAR(100),   -- "Uber", "DiDi", "Rappi", etc.
  rfc_emisor VARCHAR(13),        -- RFC de la plataforma en el SAT
  first_detected DATE,
  last_activity DATE,
  active BOOLEAN DEFAULT true
);

-- Resúmenes fiscales mensuales (llenados desde SAT)
CREATE TABLE monthly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  month INTEGER,  -- 1-12
  year INTEGER,
  total_income DECIMAL(14,2) DEFAULT 0,
  total_isr_retained DECIMAL(14,2) DEFAULT 0,
  total_iva_retained DECIMAL(14,2) DEFAULT 0,
  sat_status VARCHAR(20),  -- verde | amarillo | rojo
  data_source VARCHAR(50) DEFAULT 'sat_direct',
  raw_sat_data JSONB,  -- respuesta cruda del SAT para auditoría
  fetched_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- Cálculos fiscales
CREATE TABLE tax_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id UUID REFERENCES monthly_summaries(id),
  taxable_base DECIMAL(14,2),
  isr_calculated DECIMAL(14,2),
  isr_already_paid DECIMAL(14,2),
  net_payable DECIMAL(14,2),
  calculation_method VARCHAR(50),  -- RESICO_tabla | ISR_plataformas
  needs_human_review BOOLEAN DEFAULT false,
  review_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Declaraciones
CREATE TABLE declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  tax_calc_id UUID REFERENCES tax_calculations(id),
  month INTEGER,
  year INTEGER,
  status VARCHAR(30) DEFAULT 'draft',  -- draft|submitted|confirmed|error
  declaration_date DATE,
  sat_confirmation_number VARCHAR(100),
  pdf_url TEXT,
  submitted_at TIMESTAMP
);

-- Suscripciones Stripe
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  stripe_customer_id VARCHAR(100),
  stripe_subscription_id VARCHAR(100),
  plan VARCHAR(20),  -- free | basic | annual
  status VARCHAR(30),  -- active | past_due | canceled
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Mensajes del chat EDU
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  role VARCHAR(20),  -- user | assistant
  content TEXT,
  upsell_triggered BOOLEAN DEFAULT false,
  upsell_target VARCHAR(30),  -- sat_directo | vava | null
  created_at TIMESTAMP DEFAULT NOW()
);

-- Recordatorios
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  type VARCHAR(50),  -- declaration_due | report_ready | renewal
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  channel VARCHAR(20),  -- email | push | whatsapp
  status VARCHAR(20) DEFAULT 'pending'
);

-- Casos de upsell detectados
CREATE TABLE upsell_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  trigger_reason TEXT,
  upsell_target VARCHAR(30),  -- sat_directo | vava
  status VARCHAR(30) DEFAULT 'pending',  -- pending|contacted|converted|closed
  admin_notes TEXT,
  detected_at TIMESTAMP DEFAULT NOW()
);

-- RLS POLICIES (usuario solo ve sus propios datos)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE detected_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE upsell_cases ENABLE ROW LEVEL SECURITY;

-- Policy template (replicar para cada tabla)
CREATE POLICY "users_own_data" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Admin puede ver todo
CREATE POLICY "admin_all" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

Ejecuta la migración en Supabase Studio y confirma que todas las
tablas se crearon correctamente con sus relaciones.


PROMPT 5 — Auth + Onboarding con e.firma
[CONTEXTO GLOBAL AQUÍ]

Implementa el sistema de autenticación y el onboarding completo.

PARTE A: Auth (src/lib/supabase.js + src/hooks/useAuth.js)

- Cliente Supabase con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
- Hook useAuth con: user, loading, signUp, signIn, signInWithGoogle, signOut
- Protección de rutas: si no hay sesión → redirect a /login
- Crear registro en tabla profiles al hacer signUp

PARTE B: Pantallas de Login y Registro

src/pages/Login.jsx:
- Fondo blanco, logo EDU arriba con tagline "Tu amigo en los temas del SAT"
- Campo email + contraseña
- Botón Google OAuth
- Link "¿No tienes cuenta? Regístrate"
- Texto amigable: NO decir "iniciar sesión" — decir "Entrar"

src/pages/Register.jsx:
- Mismo estilo que Login
- Solo email + contraseña (sin datos fiscales aquí)
- Texto: "Crea tu cuenta gratis — en 30 segundos"
- Post-registro → redirige a /onboarding

PARTE C: Onboarding (src/pages/Onboarding.jsx)

PASO 1 — Bienvenida:
- Mascota EDU (nube con sombrero) animada
- Texto: "Hola, soy EDU 👋 Voy a conectarme con el SAT para ver
  exactamente cuánto debes este mes."
- Subtexto: "Solo necesito tu RFC y tu e.firma. Tarda 2 minutos."
- Botón: "Empezar"

PASO 2 — RFC:
- Campo para ingresar RFC (13 caracteres, validación básica de formato)
- Texto debajo: "Lo encuentras en tu tarjeta del SAT o en el portal sat.gob.mx"
- Validación: formato RFC correcto antes de continuar

PASO 3 — e.firma (usar EfirmaUploader component):
- Título: "Ahora conecta tu e.firma"
- Subtítulo: "Es el archivo que descargaste del SAT cuando te registraste
  como trabajador de plataforma."
- Componente EfirmaUploader ya construido en Prompt 3
- Texto de seguridad prominente:
  "🔒 Tu e.firma no sale de tu dispositivo. 
   EDU la usa aquí mismo para hablar con el SAT."
- Link expandible "¿Cómo funciona esto?" con explicación técnica simple
- Al conectar exitosamente → llamar a satClient.fetchUserData(rfc, firma, cer)

PASO 4 — Cargando datos SAT:
- Pantalla de espera animada con mascota EDU
- Texto progresivo:
  "Conectando con el SAT..." (1s)
  "Revisando tus ingresos de este mes..." (2s)  
  "Calculando cuánto debes..." (3s)
  "¡Listo!" → redirect a /dashboard

Guardar en tabla profiles: rfc, cer_base64, cer_serial, cer_expiry,
sat_connected = true, sat_connected_at = NOW()

PRUEBA:
1. Registrar cuenta con email nuevo
2. Completar onboarding con RFC de prueba + e.firma de prueba
3. Verificar que profiles se actualiza en Supabase
4. Verificar en Network tab que el .key NO aparece en ningún request
5. Verificar redirect correcto a /dashboard


PROMPT 6 — Cliente SAT via Finkok
[CONTEXTO GLOBAL AQUÍ]

Implementa el módulo de consulta al SAT usando Finkok como PAC.
Finkok ya está integrado en SAT Directo (misma cuenta).

ARCHIVO: src/lib/satClient.js (llamadas al backend)
ARCHIVO: supabase/functions/sat-query/index.ts (Edge Function)

FLUJO:
1. Frontend llama a Edge Function con: { firma, cerBase64, rfc, queryType }
2. Edge Function valida la firma con el .cer
3. Edge Function llama a Finkok con las credenciales del sistema (no del usuario)
4. Finkok consulta al SAT y devuelve los datos
5. Edge Function procesa y guarda en monthly_summaries
6. Frontend recibe el resumen procesado

QUERIES A IMPLEMENTAR:

A. fetchMonthlyIncome(rfc, month, year)
   - Consulta CFDIs recibidos del mes via Finkok
   - Filtra por RFC emisor de plataformas conocidas:
     * Uber: RFC = UBE140626KH4
     * DiDi: RFC = DDM180111CS4  
     * Rappi: RFC = RAP180122I89
     * Uber Eats: RFC = UBE140626KH4 (mismo que Uber)
     * Airbnb: RFC = ABI150311G42
   - Suma ingresos totales
   - Suma ISR retenido
   - Suma IVA retenido
   - Devuelve: { total_income, isr_retained, iva_retained, platforms_detected }

B. fetchDeclarationHistory(rfc)
   - Consulta declaraciones previas presentadas
   - Devuelve últimos 12 meses con status

C. fetchPendingDebts(rfc)
   - Consulta adeudos y multas activas
   - Si hay adeudo > $50,000 → flag needs_human_review = true

D. fetchUserData(rfc, firma, cer)
   - Llama A + B + C en paralelo
   - Procesa y guarda todo en Supabase
   - Detecta plataformas y guarda en detected_platforms
   - Devuelve resumen completo para el dashboard

IMPORTANTE sobre los RFCs de plataformas:
- Verifica los RFCs reales consultando el SAT antes de hardcodearlos
- Guárdalos en una tabla platform_rfcs en DB, no en código
- Así se pueden actualizar sin nuevo deploy

MANEJO DE ERRORES:
- SAT no responde → mensaje: "El SAT está tardando. Intenta en unos minutos."
- Firma inválida → mensaje: "Hubo un problema con tu e.firma. ¿Quieres intentarlo de nuevo?"
- Sin CFDIs del mes → mensaje: "No encontré ingresos este mes. ¿Trabajaste en alguna plataforma?"

PRUEBA:
Con RFC y e.firma de prueba del ambiente de certificación Finkok:
1. fetchMonthlyIncome devuelve estructura correcta (aunque sea vacía)
2. Los datos se guardan correctamente en monthly_summaries
3. Los errores del SAT se manejan sin romper la app


PROMPT 7 — Motor de cálculo fiscal y semáforo
[CONTEXTO GLOBAL AQUÍ]

Implementa el motor de cálculo fiscal RESICO para plataformas digitales.

ARCHIVO: src/lib/taxCalculator.js

TABLA RESICO 2026 (guardar también en src/constants/taxTables.js):

const RESICO_TABLE_2026 = [
  { limite_inferior: 0,        limite_superior: 25000,   tasa: 0.010 },
  { limite_inferior: 25000.01, limite_superior: 50000,   tasa: 0.011 },
  { limite_inferior: 50000.01, limite_superior: 83333.33,tasa: 0.0135},
  { limite_inferior: 83333.34, limite_superior: 208333.33,tasa:0.016 },
  { limite_inferior: 208333.34,limite_superior: Infinity, tasa: 0.02  }
];

FUNCIONES A IMPLEMENTAR:

1. calculateISR_RESICO(ingresos_mensuales)
   - Aplica la tabla progresiva de RESICO
   - Devuelve ISR calculado para ese mes

2. calculateNetPayable(isr_calculado, isr_ya_retenido)
   - neto = MAX(0, isr_calculado - isr_ya_retenido)
   - Si neto < 0 → el usuario tiene saldo a favor

3. determineSemaforoStatus(net_payable, meses_sin_declarar, deuda_conocida)
   - VERDE:   net_payable <= 0 O (net_payable <= 500 Y meses_sin_declarar == 0)
   - AMARILLO: net_payable entre 501 y 5000 O meses_sin_declarar == 1
   - ROJO:    net_payable > 5000 O meses_sin_declarar >= 2 O deuda_conocida > 0

4. determineUpsellTrigger(user_data)
   - Analiza si debe escalar
   - SAT_DIRECTO si: meses_sin_declarar >= 2 ó net_payable > 5000
     ó detected_platforms.length > 2
   - VAVA si: deuda_conocida > 50000 ó tiene_multa ó
     meses_sin_declarar > 6
   - null si: todo normal

5. generateUserMessage(semaforo, net_payable, dias_para_vencer)
   - Genera el mensaje en lenguaje simple para mostrar al usuario
   
   VERDE: "¡Vas muy bien! Este mes debes pagar $X al SAT. 
           Uber ya te retuvo $Y, así que solo falta $Z.
           Tienes hasta el [fecha] para declarar."
   
   AMARILLO: "Ojo, este mes debes $X al SAT y te quedan 
              [N] días. No es para asustarse, pero hay 
              que declarar pronto. ¿Lo hacemos ahora?"
   
   ROJO: "Necesitas atención aquí. [razón específica].
          Esto ya está fuera de lo que EDU puede resolver 
          solo — te conectamos con alguien que puede ayudarte."

REGLAS DE LENGUAJE (enforced en el código):
- NUNCA usar: "base gravable", "determinación", "ejercicio fiscal",
  "acuse", "CIEC", "obligación tributaria"
- SIEMPRE usar: "cuánto debes", "lo que Uber te quitó",
  "lo que falta pagar", "fecha límite"

ARCHIVO: supabase/functions/process-tax/index.ts
- Edge Function que recibe summary_id
- Corre calculateISR_RESICO y calculateNetPayable
- Guarda resultado en tax_calculations
- Actualiza monthly_summaries.sat_status con el semáforo
- Si determineUpsellTrigger != null → crea registro en upsell_cases

PRUEBA:
Casos de prueba a verificar manualmente:
- Ingresos $15,000, retención $600 → neto ~$150, semáforo verde
- Ingresos $50,000, retención $1,000 → neto ~$450, semáforo amarillo
- Ingresos $100,000, sin retención → neto ~$1,600, semáforo rojo
- Ingresos $0, 2 meses sin declarar → semáforo rojo, trigger VAVA


PROMPT 8 — Dashboard principal
[CONTEXTO GLOBAL AQUÍ]

Implementa el Dashboard principal de EDU. Esta es la pantalla más
importante — el usuario debe entender su situación fiscal en 3 segundos.

ARCHIVO: src/pages/Dashboard.jsx

ESTRUCTURA DE LA PANTALLA (mobile-first, 375px):

HEADER (fondo edu-blue):
- Saludo: "Buen día, [nombre]"  
- Ícono de campana (notificaciones)
- Badge rojo si hay alertas pendientes

CARD PRINCIPAL (blanco, sombra suave):
- Label pequeño: "Este mes debes pagar:"
- Número grande (#1 elemento visual): "$X,XXX"
  - Verde si semáforo verde
  - Amarillo si amarillo
  - Rojo si rojo
- StatusBadge: punto de color + texto semáforo
- Botón "Declarar en 1 clic" (azul, ancho completo)
  - Si plan free → botón habilitado pero al hacer clic → /subscription
  - Si plan activo → ejecuta declaración

CARDS SECUNDARIAS (grid 2 columnas):
- "Tus ingresos": $XX,XXX (del mes actual)
- "Ya retuvieron": $X,XXX (suma de todas las plataformas)

CARD DE FECHA LÍMITE:
- Ícono calendario
- "Tu declaración vence en [N] días"
- Si quedan < 3 días → texto en amarillo
- Si venció → texto en rojo

SECCIÓN PLATAFORMAS DETECTADAS:
- Título: "Trabajaste en:"
- Chips con logo/nombre de cada plataforma detectada del SAT
  (estas vienen de detected_platforms, no las pone el usuario)
- Texto debajo: "Datos del SAT actualizados al [fecha]"

BANNER UPSELL (solo si upsell_cases tiene registro pendiente):
- NO mostrar si semáforo es verde y no hay trigger
- Texto según upsell_target:
  SAT_DIRECTO: "Tu caso tiene algunos detalles extra.
                En SAT Directo lo resolvemos completo."
  VAVA: "Esto necesita atención de un experto.
         Habla hoy con VAVA antes de que crezca."

NAVBAR INFERIOR:
- Inicio (activo) / Historial / Chat / Perfil

LÓGICA:
- Al cargar, consulta monthly_summaries del mes actual
- Si no hay datos → mostrar CTA "Actualizar datos del SAT"
  con botón que re-ejecuta la consulta Finkok
- Si los datos tienen más de 24 horas → mostrar
  "Datos de hace [N] horas" con botón actualizar

PRUEBA:
1. Usuario con semáforo verde → número en verde, botón azul activo
2. Usuario con semáforo rojo → número en rojo, banner upsell visible
3. Usuario sin plan activo → botón lleva a /subscription
4. Datos desactualizados → botón de actualizar visible


PROMPT 9 — Chat EDU con OpenAI
[CONTEXTO GLOBAL AQUÍ]

Implementa el Chat EDU con OpenAI GPT-4o. El chat conoce el contexto
fiscal completo del usuario y responde SIEMPRE en lenguaje simple.

ARCHIVO: supabase/functions/chat-edu/index.ts (Edge Function)

SYSTEM PROMPT DE EDU (exactamente este texto):

"""
Eres EDU, el asistente fiscal de SAT Directo. Tu personalidad es la de
un amigo que entiende el SAT y explica las cosas con palabras simples.

REGLAS DE COMUNICACIÓN ABSOLUTAS:
- NUNCA uses estos términos: "base gravable", "determinación provisional",
  "ejercicio fiscal", "acuse de recibo", "CIEC", "obligación tributaria",
  "persona física", "régimen fiscal", "declaración anual complementaria"
- SIEMPRE usa: "cuánto debes", "lo que [plataforma] te retuvo",
  "lo que falta pagar al SAT", "fecha límite", "declarar"
- Responde como si le hablaras a alguien que nunca ha ido al SAT
- Sé directo: primero la respuesta, luego la explicación si es necesaria
- Usa emojis con moderación (máximo 2 por mensaje)
- Si no sabes algo con certeza, di "no estoy seguro, mejor consulta
  con un experto de VAVA" — nunca inventes respuestas fiscales

CONTEXTO DEL USUARIO (se inyecta dinámicamente):
- Nombre: {nombre}
- RFC: {rfc}
- Plan: {plan}
- Ingresos este mes: ${ingresos_mes}
- ISR retenido: ${isr_retenido}
- Neto a pagar: ${neto_pagar}
- Estado SAT: {semaforo}
- Plataformas activas: {plataformas}
- Meses sin declarar: {meses_sin_declarar}

DETECCIÓN DE ESCALAMIENTO:
Si el usuario menciona alguna de estas palabras o conceptos, incluye
al final de tu respuesta el tag especial [UPSELL:sat_directo] o
[UPSELL:vava] según corresponda:

→ [UPSELL:sat_directo]: "varios meses", "años sin declarar",
  "no sé si declaré", "tengo ingresos de otro lado", "factura",
  "CFDI", "dos trabajos", "empleado y Uber"
  
→ [UPSELL:vava]: "multa", "me llegó carta del SAT", "embargo",
  "me bloquearon", "debo mucho", "requerimiento", "crédito fiscal",
  "no puedo pagar"

DISCLAIMER (incluir SIEMPRE al final de respuestas sobre montos):
"Recuerda: estos son estimados. Siempre valida antes de declarar."
"""

IMPLEMENTACIÓN:

1. Edge Function recibe: { userId, message, conversationHistory }
2. Carga contexto fiscal del usuario desde monthly_summaries y tax_calculations
3. Inyecta contexto en el system prompt
4. Llama a OpenAI GPT-4o con el historial completo
5. Parsea la respuesta buscando [UPSELL:xxx]
6. Si encuentra tag de upsell → crea registro en upsell_cases
7. Guarda mensaje en ai_messages
8. Devuelve respuesta limpia (sin el tag) al frontend

ARCHIVO: src/pages/Chat.jsx

UI:
- Header azul con mascota EDU y estado "En línea"
- Historial de mensajes (cargar últimos 20 de ai_messages)
- Sugerencias rápidas (chips clickeables):
  "¿Cuánto debo?" | "¿Estoy bien?" | "¿Qué pasa si no declaro?" | "Tengo una multa"
- Input de texto + botón enviar
- Typing indicator mientras EDU procesa
- Si upsell_triggered → mostrar card de upsell integrada en el chat

PRUEBA:
1. Preguntar "¿cuánto debo?" → responde con el monto real del usuario
2. Preguntar "tengo una multa" → responde + crea upsell_case en DB
3. Verificar que la respuesta NO usa ninguna palabra de la lista prohibida
4. Verificar que el historial persiste entre sesiones


PROMPT 10 — Stripe y suscripciones
[CONTEXTO GLOBAL AQUÍ]

Implementa el sistema completo de suscripciones con Stripe.

PLANES:
- Free: $0 (ver cálculo, NO declarar)
- Básico: $139 MXN/mes
- Anual: $990 MXN/año ($82.50/mes)

ARCHIVOS A CREAR:

supabase/functions/create-checkout/index.ts
- Recibe: { userId, priceId, planType }
- Crea o recupera Stripe Customer para el userId
- Crea Stripe Checkout Session
- success_url: /dashboard?upgrade=success
- cancel_url: /subscription
- Devuelve: { checkoutUrl }

supabase/functions/stripe-webhook/index.ts
- Eventos a manejar:
  checkout.session.completed → activar plan
  customer.subscription.updated → actualizar status
  customer.subscription.deleted → cancelar plan
  invoice.payment_failed → marcar past_due
- Para cada evento → actualizar tabla subscriptions Y profiles.plan

src/pages/Subscription.jsx
- Header: "Elige tu plan"
- 3 cards: Free / Básico / Anual
- Card Básico: borde azul destacado, badge "Más popular"
- En cada card mostrar:
  - Precio claro
  - Lista de 4-5 beneficios en lenguaje simple
  - NO usar jerga: decir "Declarar en 1 clic" no "Presentar declaración"
- Botón de cada plan lleva a Stripe Checkout
- Footer: "🔒 Pago seguro · Cancela cuando quieras · Garantía 7 días"

Pantalla post-pago exitoso (/dashboard?upgrade=success):
- Confeti animado (librería: canvas-confetti)
- Mensaje: "¡Ya eres EDU Básico! 🎉 Ahora puedes declarar en 1 clic."
- Botón: "Ir a declarar" → /declaration

LÓGICA DE BLOQUEO:
En Dashboard y Declaration:
- Si profiles.plan === 'free' → botón "Declarar" lleva a /subscription
- Si profiles.plan === 'basic' o 'annual' → botón ejecuta declaración
- NO ocultar el botón — siempre visible, solo cambia la acción

PRUEBA con tarjetas Stripe sandbox:
- 4242 4242 4242 4242 → pago exitoso → plan = basic en DB
- 4000 0000 0000 0002 → tarjeta rechazada → mensaje error claro
- Verificar webhook actualiza subscriptions y profiles.plan


PROMPT 11 — Recordatorios automáticos
[CONTEXTO GLOBAL AQUÍ]

Implementa el sistema de recordatorios automáticos mensuales.
Este es clave para la retención — el usuario no debe tener que
recordar hacer nada.

ARCHIVO: supabase/functions/send-reminders/index.ts
(Scheduled Edge Function — ejecutar diariamente a las 9am CDMX)

LÓGICA DE RECORDATORIOS:

Día 10 de cada mes:
- Para todos los usuarios con plan activo
- Si no han actualizado datos del SAT este mes
- Email: "Ya puedes ver cuánto debes al SAT en [mes]"
- Texto: "Hola [nombre], EDU ya tiene los datos de tus plataformas
  listos. Entra y ve cuánto debes este mes en 1 clic."

Día 14 de cada mes:
- Para usuarios con net_payable > 0 que no han declarado
- Email: "Tu declaración de [mes] vence en 3 días"
- Texto: "Quedan 3 días para declarar y evitar recargos.
  EDU lo tiene todo listo — solo falta tu firma."
- Push notification si está habilitado

Día 16 de cada mes:
- URGENTE — para quienes no han declarado
- Email + Push: "Último día — tu declaración vence mañana"
- Texto urgente pero NO alarmista

Día 18 de cada mes:
- Para quienes NO declararon a tiempo
- Email: "Se te pasó la fecha — no te preocupes, lo resolvemos"
- Texto: "Todavía puedes declarar con recargo.
  EDU te dice exactamente cuánto es y cómo evitar que crezca."

IMPLEMENTACIÓN:
1. Cron job diario que evalúa qué recordatorios enviar hoy
2. Usa Supabase + Resend (o SendGrid) para emails
3. Para push: usar Supabase Realtime o Web Push API
4. Guarda cada envío en tabla reminders con status
5. No enviar si el usuario ya completó la acción ese mes
6. Respetar preferencias: notifications_email y notifications_push

PRUEBA:
1. Simular día 10 → verificar que el email correcto se envía
2. Simular que usuario declaró → verificar que NO recibe recordatorio D-14
3. Verificar que los registros en tabla reminders son correctos


PROMPT 12 — Panel Admin interno
[CONTEXTO GLOBAL AQUÍ]

Implementa el Panel Administrativo interno. Solo accesible para
usuarios con profiles.is_admin = true.

ARCHIVO: src/pages/Admin.jsx

SECCIÓN 1 — MÉTRICAS RESUMEN (cards en grid):
- Total usuarios registrados
- Usuarios con plan activo (basic + annual)
- MRR actual (suma de subscriptions activas × precio plan)
- Nuevos registros en últimas 24h / 7 días
- Tasa de conversión free→pago (%)
- Churn este mes (cancelaciones)

SECCIÓN 2 — TABLA DE USUARIOS:
Columnas: Email · RFC · Plan · Plataformas · Último login ·
          Neto a pagar este mes · Acciones
- Filtros: por plan, por semáforo, por plataforma
- Búsqueda por email o RFC
- Paginación: 50 por página
- Click en fila → ver detalle completo del usuario

SECCIÓN 3 — COLA DE UPSELL:
Lista de upsell_cases con status = 'pending'
Para cada caso:
- Nombre/email del usuario
- trigger_reason (razón detectada)
- upsell_target (sat_directo o vava)
- Monto involucrado (de tax_calculations)
- Fecha de detección
- Botones: "Marcar contactado" | "Escalar a VAVA" | "Cerrar"

SEGURIDAD:
- Middleware que verifica is_admin = true antes de cargar la página
- Si no es admin → redirect a /dashboard con mensaje de error
- RLS en Supabase ya configurada en Prompt 4

PRUEBA:
1. Login con cuenta admin → ve el panel completo
2. Login con cuenta normal → redirect a dashboard
3. Marcar caso de upsell como contactado → status se actualiza en DB
4. MRR calculado correctamente según suscripciones activas


PROMPT 13 — Pruebas end-to-end y corrección de bugs
[CONTEXTO GLOBAL AQUÍ]

Realiza una revisión completa del sistema EDU y corrige todos los
bugs encontrados. Este prompt se ejecuta después de que todos los
módulos anteriores estén implementados.

PRUEBAS A EJECUTAR:

FLUJO COMPLETO FELIZ:
1. Registrar usuario nuevo con email de prueba
2. Completar onboarding con RFC y e.firma de prueba
3. Verificar que el Network tab NO muestra el .key en ningún request
4. Verificar que monthly_summaries se creó correctamente
5. Ver Dashboard con datos del SAT cargados
6. Hacer clic en "Declarar" → debe llevar a /subscription (plan free)
7. Completar pago con tarjeta 4242 4242 4242 4242
8. Verificar plan = 'basic' en tabla profiles
9. Volver a Dashboard → botón "Declarar" ahora funciona
10. Completar declaración → verificar registro en declarations
11. Abrir Chat EDU → preguntar "¿cuánto debo?"
12. Verificar respuesta con monto real + sin jerga fiscal

PRUEBAS DE SEGURIDAD:
- Intentar acceder a /admin con usuario normal → debe redirectar
- Intentar leer datos de otro usuario via Supabase → RLS debe bloquear
- Verificar que ningún request contiene el .key de e.firma
- Verificar que la contraseña de e.firma no aparece en logs

PRUEBAS DE ERROR:
- Subir .key con contraseña incorrecta → mensaje de error claro
- SAT no disponible (simular) → mensaje amigable, no crash
- Stripe webhook con firma inválida → rechazado correctamente
- CSV subido (aunque fue descartado) → si existe algún endpoint
  de CSV, eliminarlo o devolver error explicando que no aplica

DISPOSITIVOS A PROBAR:
- Chrome desktop (principal)
- Safari móvil (iOS) — importante para EfirmaUploader
- Chrome Android

PARA CADA BUG ENCONTRADO:
1. Describe el bug exacto
2. Muestra el archivo y línea
3. Aplica la corrección
4. Confirma que la prueba pasa

ENTREGA FINAL:
- Lista de bugs encontrados y corregidos
- Lista de bugs pendientes con severidad
- Screenshot o descripción del flujo completo funcionando
- Variables de entorno necesarias documentadas en .env.example


NOTAS PARA JESÚS EDUARDO
Cómo ejecutar estos prompts
Abre Codex (o el chat de ChatGPT con acceso a Codex)
Pega el CONTEXTO GLOBAL al inicio de cada prompt — está marcado como [CONTEXTO GLOBAL AQUÍ]
Espera a que Codex termine y te muestre el resultado antes de pasar al siguiente
Prueba cada módulo usando las instrucciones al final de cada prompt
Si algo falla, describe el error exacto a Codex y pide que lo corrija
Orden correcto de ejecución
Prompt 1 → revisar estado
Prompt 2 → estructura base
Prompt 3 → e.firma local  ← el más crítico, revisar con cuidado
Prompt 4 → base de datos
Prompt 5 → auth + onboarding
Prompt 6 → consulta SAT
Prompt 7 → cálculo fiscal
Prompt 8 → dashboard
Prompt 9 → chat EDU
Prompt 10 → stripe
Prompt 11 → recordatorios
Prompt 12 → admin panel
Prompt 13 → pruebas finales
La prueba más importante (Prompt 3)
Después del Prompt 3, abre el Network tab del navegador (F12 → Network), sube tu .key y .cer, y verifica que NO aparece ningún request con el contenido del archivo .key. Si ves el .key en un request, hay un bug de seguridad que debe corregirse antes de continuar.



EDU — Plan Maestro Codex v2.0 · Mayo 2026 Arquitectura: e.firma local · SAT directo · Sin CSV
