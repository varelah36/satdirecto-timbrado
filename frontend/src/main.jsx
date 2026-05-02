import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_BASE_URL || '';
const token = () => localStorage.getItem('token') || '';

async function api(path, options={}){
  const res = await fetch(`${API}${path}`, options);
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || 'Error de servidor');
  return data;
}

function Layout({children}){return <div style={{maxWidth:780,margin:'20px auto',fontFamily:'Arial'}}><nav style={{display:'flex',gap:10}}><Link to='/'>Home</Link><Link to='/login'>Login</Link><Link to='/registro'>Registro</Link><Link to='/planes'>Planes</Link><Link to='/checkout'>Checkout</Link><Link to='/success'>Success</Link><Link to='/dashboard'>Dashboard</Link></nav><hr/>{children}</div>}
const Home=()=> <Layout><h1>Home</h1></Layout>;

function Login(){const nav=useNavigate(); const [email,setEmail]=React.useState(''); const [password,setPassword]=React.useState(''); const [err,setErr]=React.useState('');
return <Layout><h1>Login</h1><input placeholder='email' value={email} onChange={e=>setEmail(e.target.value)}/><input placeholder='password' type='password' value={password} onChange={e=>setPassword(e.target.value)}/><button onClick={async()=>{setErr('');try{const d=await api('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});localStorage.setItem('token',d.token);nav('/dashboard');}catch(e){setErr(e.message)}}}>Entrar</button><p>{err}</p></Layout>}

function Registro(){const nav=useNavigate(); const [form,setForm]=React.useState({email:'',password:'',plan:'esencial',billing:'monthly'});const [err,setErr]=React.useState('');
return <Layout><h1>Registro</h1><input placeholder='email' onChange={e=>setForm({...form,email:e.target.value})}/><input type='password' placeholder='password' onChange={e=>setForm({...form,password:e.target.value})}/><button onClick={async()=>{setErr('');try{const d=await api('/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});localStorage.setItem('token',d.token);nav('/planes');}catch(e){setErr(e.message)}}}>Crear cuenta</button><p>{err}</p></Layout>}

const Planes=()=> <Layout><h1>Planes</h1><p>Selecciona plan esencial y continúa a checkout.</p><Link to='/checkout'>Ir a checkout</Link></Layout>;

function Checkout(){const nav=useNavigate(); const [billing,setBilling]=React.useState('monthly'); const [err,setErr]=React.useState(''); if(!token()) return <Navigate to='/login' replace/>;
return <Layout><h1>Checkout</h1><select value={billing} onChange={e=>setBilling(e.target.value)}><option value='monthly'>Mensual</option><option value='annual'>Anual</option></select><button onClick={async()=>{setErr('');try{const d=await api('/stripe/create-checkout-session',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token()}`},body:JSON.stringify({plan:'esencial',billing})});window.location.href=d.url;}catch(e){setErr(e.message)}}}>Pagar</button><p>{err}</p></Layout>}

function Success(){const [status,setStatus]=React.useState('Consultando...'); React.useEffect(()=>{(async()=>{if(!token()){setStatus('Inicia sesión para validar.');return;} try{const d=await api('/billing/status',{headers:{'Authorization':`Bearer ${token()}`}});setStatus(d.active?'Suscripción activa':'Pago recibido. Activación en proceso.');}catch(e){setStatus(e.message)}})()},[]); return <Layout><h1>Pago recibido</h1><p>{status}</p></Layout>}

function Dashboard(){const [msg,setMsg]=React.useState(''); React.useEffect(()=>{(async()=>{if(!token()){setMsg('No autenticado');return;} try{const d=await api('/billing/status',{headers:{Authorization:`Bearer ${token()}`}});setMsg(d.active?'Plan activo':'Plan no activo');}catch(e){setMsg(e.message)}})()},[]); return <Layout><h1>Dashboard</h1><p>{msg}</p></Layout>}

createRoot(document.getElementById('root')).render(<BrowserRouter><Routes><Route path='/' element={<Home/>}/><Route path='/login' element={<Login/>}/><Route path='/registro' element={<Registro/>}/><Route path='/planes' element={<Planes/>}/><Route path='/checkout' element={<Checkout/>}/><Route path='/success' element={<Success/>}/><Route path='/dashboard' element={<Dashboard/>}/></Routes></BrowserRouter>);
