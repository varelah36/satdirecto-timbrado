import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const API = import.meta.env.VITE_API_BASE_URL || '';
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://frdtcgspuacubkzwbwxk.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_8FcC2CEn2vsdeqZlaJI0RA_TurN5Xrt'
);

const token = () => localStorage.getItem('token') || '';

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de servidor');
  return data;
}

function Layout({ children }) {
  return <div style={{ maxWidth: 900, margin: '20px auto', fontFamily: 'Arial' }}><nav style={{ display: 'flex', gap: 10 }}><Link to='/'>Home</Link><Link to='/login'>Login</Link><Link to='/registro'>Registro</Link><Link to='/planes'>Planes</Link><Link to='/checkout'>Checkout</Link><Link to='/success'>Success</Link><Link to='/dashboard'>Dashboard</Link></nav><hr />{children}</div>;
}

const Home = () => <Layout><h1>Home</h1><p>App conectada a Supabase + backend Stripe.</p></Layout>;

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [err, setErr] = React.useState('');

  return <Layout><h1>Login (Supabase Auth)</h1>
    <input placeholder='email' value={email} onChange={e => setEmail(e.target.value)} />
    <input placeholder='password' type='password' value={password} onChange={e => setPassword(e.target.value)} />
    <button onClick={async () => {
      setErr('');
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem('supabase_access_token', data.session?.access_token || '');
        nav('/dashboard');
      } catch (e) { setErr(e.message); }
    }}>Entrar</button><p>{err}</p></Layout>;
}

const Registro = () => <Layout><h1>Registro</h1><p>El registro de app Stripe sigue en backend.</p></Layout>;
const Planes = () => <Layout><h1>Planes</h1><Link to='/checkout'>Ir a checkout</Link></Layout>;

function Checkout() {
  const [billing, setBilling] = React.useState('monthly');
  const [err, setErr] = React.useState('');
  if (!token()) return <Navigate to='/login' replace />;
  return <Layout><h1>Checkout</h1><select value={billing} onChange={e => setBilling(e.target.value)}><option value='monthly'>Mensual</option><option value='annual'>Anual</option></select><button onClick={async () => {
    setErr('');
    try {
      const d = await api('/stripe/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ plan: 'esencial', billing }) });
      window.location.href = d.url;
    } catch (e) { setErr(e.message); }
  }}>Pagar</button><p>{err}</p></Layout>;
}

function Success() {
  const [status, setStatus] = React.useState('Consultando...');
  React.useEffect(() => { (async () => {
    if (!token()) { setStatus('Inicia sesión para validar.'); return; }
    try {
      const d = await api('/billing/status', { headers: { Authorization: `Bearer ${token()}` } });
      setStatus(d.active ? 'Suscripción activa' : 'Pago recibido. Activación en proceso.');
    } catch (e) { setStatus(e.message); }
  })(); }, []);
  return <Layout><h1>Pago recibido</h1><p>{status}</p></Layout>;
}

function Dashboard() {
  const [user, setUser] = React.useState(null);
  const [requests, setRequests] = React.useState([]);
  const [rfc, setRfc] = React.useState('');
  const [msg, setMsg] = React.useState('');

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user || null);
      if (!data.user) return;
      const { data: rows, error } = await supabase
        .from('sat_requests')
        .select('*')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false });
      if (error) setMsg(error.message);
      else setRequests(rows || []);
    })();
  }, []);

  async function insertRequest() {
    setMsg('');
    try {
      if (!user) throw new Error('No autenticado en Supabase.');
      const { error } = await supabase.from('sat_requests').insert({
        user_id: user.id,
        rfc,
        service_type: 'consulta'
      });
      if (error) throw error;
      setMsg('Solicitud guardada.');
      setRfc('');
      const { data: rows } = await supabase.from('sat_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setRequests(rows || []);
    } catch (e) {
      setMsg(e.message);
    }
  }

  return <Layout>
    <h1>Dashboard</h1>
    <p>{user ? `Usuario: ${user.email}` : 'No autenticado en Supabase'}</p>
    <h3>Nueva consulta SAT</h3>
    <input placeholder='RFC' value={rfc} onChange={e => setRfc(e.target.value.toUpperCase())} />
    <button onClick={insertRequest}>Consultar</button>
    <p>{msg}</p>
    <h3>Mis solicitudes</h3>
    <ul>{requests.map(r => <li key={r.id}>{r.rfc} - {r.service_type} - {r.created_at}</li>)}</ul>
  </Layout>;
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path='/' element={<Home />} />
      <Route path='/login' element={<Login />} />
      <Route path='/registro' element={<Registro />} />
      <Route path='/planes' element={<Planes />} />
      <Route path='/checkout' element={<Checkout />} />
      <Route path='/success' element={<Success />} />
      <Route path='/dashboard' element={<Dashboard />} />
    </Routes>
  </BrowserRouter>
);
