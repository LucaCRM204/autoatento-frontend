/**
 * Panel superadmin de AutoAtento (/superadmin).
 * Login propio, lista de tenants con estado y uso del mes, alta (schema nuevo o
 * base existente), edición, suspender/reactivar/baja, migrar, entrar como owner,
 * uso para facturar y auditoría. Usa /api/superadmin/* (sin tenant).
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { sa, sesion, errorDe, EVENTO_SALIR, type Tenant, type EventoAuditoria } from './api';
import { Button, Card, EstadoBadge, Field, Input, Select, Aviso, Toasts, fecha } from './ui';
import { ir } from './nav';
import ListaAuditoria from './ListaAuditoria';
import AltaTenant from './AltaTenant';
import TenantDetalle from './TenantDetalle';

// ---------- mini router (pushState) ----------
type Ruta = { vista: 'tenants' } | { vista: 'nuevo' } | { vista: 'tenant'; id: number; tab?: string } | { vista: 'uso' } | { vista: 'auditoria' };

function leerRuta(): Ruta {
  const p = window.location.pathname.replace(/^\/superadmin\/?/, '').split('/').filter(Boolean);
  if (p[0] === 'nuevo') return { vista: 'nuevo' };
  if (p[0] === 't' && Number(p[1])) return { vista: 'tenant', id: Number(p[1]), tab: p[2] };
  if (p[0] === 'uso') return { vista: 'uso' };
  if (p[0] === 'auditoria') return { vista: 'auditoria' };
  return { vista: 'tenants' };
}

function useRuta(): Ruta {
  const [r, setR] = useState<Ruta>(leerRuta);
  useEffect(() => {
    const on = () => setR(leerRuta());
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  return r;
}

// ---------- app ----------
export default function SuperAdminApp() {
  const [logueado, setLogueado] = useState(!!sesion.get());
  const [yo, setYo] = useState<{ email: string; nombre?: string } | null>(null);
  const ruta = useRuta();

  useEffect(() => {
    document.title = 'AutoAtento · Panel';
    document.documentElement.style.setProperty('--color-primario', '#0f172a');
    const salir = () => { setLogueado(false); setYo(null); };
    window.addEventListener(EVENTO_SALIR, salir);
    return () => window.removeEventListener(EVENTO_SALIR, salir);
  }, []);

  useEffect(() => {
    if (!logueado) return;
    sa.get('/me').then((r) => setYo(r.data.superadmin)).catch(() => {});
  }, [logueado]);

  if (!logueado) return <Login onOk={() => setLogueado(true)} />;

  const salir = () => { sesion.clear(); setLogueado(false); };
  const nav = [
    { path: '', label: 'Tenants', activo: ruta.vista === 'tenants' || ruta.vista === 'tenant' || ruta.vista === 'nuevo' },
    { path: '/uso', label: 'Uso y facturación', activo: ruta.vista === 'uso' },
    { path: '/auditoria', label: 'Auditoría', activo: ruta.vista === 'auditoria' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button onClick={() => ir('')} className="flex items-center gap-2 font-semibold">
            <img src="/autoatento.svg" alt="" className="h-7 w-7" />
            <span>AutoAtento</span>
            <span className="hidden sm:inline text-slate-400 font-normal">· Panel</span>
          </button>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden md:inline text-slate-400">{yo?.email}</span>
            <button onClick={salir} className="text-slate-300 hover:text-white">Salir</button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-2 sm:px-4 flex gap-1 overflow-x-auto">
          {nav.map((n) => (
            <button key={n.label} onClick={() => ir(n.path)}
              className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 ${n.activo ? 'border-sky-400 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
              {n.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 sm:py-8">
        {ruta.vista === 'tenants' && <ListaTenants />}
        {ruta.vista === 'nuevo' && <AltaTenant onCreado={(id) => ir(`/t/${id}`)} />}
        {ruta.vista === 'tenant' && <TenantDetalle id={ruta.id} tab={ruta.tab} />}
        {ruta.vista === 'uso' && <Uso />}
        {ruta.vista === 'auditoria' && <Auditoria />}
      </main>
      <Toasts />
    </div>
  );
}

// ---------- login ----------
function Login({ onOk }: { onOk: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      const r = await sa.post('/login', { email, password });
      sesion.set(r.data.token);
      onOk();
    } catch (err) {
      setError(errorDe(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={enviar} className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <img src="/autoatento.svg" alt="" className="h-12 w-12 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900">AutoAtento</h1>
          <p className="text-sm text-slate-500">Panel de administración</p>
        </div>
        <Field label="Email"><Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Contraseña"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Button type="submit" className="w-full" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</Button>
      </form>
    </div>
  );
}

// ---------- lista de tenants ----------
function ListaTenants() {
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [mes, setMes] = useState('');
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('todos');

  useEffect(() => {
    sa.get('/tenants')
      .then((r) => { setTenants(r.data.tenants); setMes(r.data.mes); })
      .catch((e) => setError(errorDe(e)));
  }, []);

  const filtrados = useMemo(() => (tenants || []).filter((t) => {
    if (estado !== 'todos' && t.estado !== estado) return false;
    const s = q.trim().toLowerCase();
    return !s || t.nombre.toLowerCase().includes(s) || t.slug.includes(s) || t.dominios.some((d) => d.includes(s));
  }), [tenants, q, estado]);

  const totales = useMemo(() => (tenants || []).filter((t) => t.estado === 'activo').reduce(
    (a, t) => ({ tenants: a.tenants + 1, usuarios: a.usuarios + (t.uso_mes?.usuarios_activos || 0), leads: a.leads + (t.uso_mes?.leads_ingresados || 0) }),
    { tenants: 0, usuarios: 0, leads: 0 }), [tenants]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
          <p className="text-sm text-slate-500">Clientes de AutoAtento · uso de {mes || 'este mes'}</p>
        </div>
        <Button onClick={() => ir('/nuevo')}>+ Nuevo tenant</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[['Activos', totales.tenants], ['Usuarios activos', totales.usuarios], ['Leads del mes', totales.leads]].map(([l, v]) => (
          <div key={l} className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
            <div className="text-xs text-slate-500">{l}</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input placeholder="Buscar por nombre, slug o dominio" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={estado} onChange={(e) => setEstado(e.target.value)} className="sm:w-48">
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="suspendido">Suspendidos</option>
          <option value="baja">De baja</option>
        </Select>
      </div>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {!tenants && !error && <p className="text-slate-500 text-sm">Cargando…</p>}
      {tenants && !filtrados.length && <p className="text-slate-500 text-sm">No hay tenants que coincidan.</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {filtrados.map((t) => (
          <button key={t.id} onClick={() => ir(`/t/${t.id}`)}
            className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-400 hover:shadow-sm transition">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-9 w-9 rounded-lg shrink-0" style={{ background: t.branding?.color_primario || '#2563eb' }} />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{t.branding?.nombre || t.nombre}</div>
                  <div className="text-xs text-slate-500 truncate">{t.slug} · plan {t.plan}</div>
                </div>
              </div>
              <EstadoBadge estado={t.estado} />
            </div>
            <div className="mt-3 text-xs text-slate-500 truncate">{t.dominios.join(' · ') || 'sin dominios'}</div>
            <div className="mt-3 flex gap-4 text-sm">
              <span><b className="text-slate-900">{t.uso_mes?.usuarios_activos ?? '—'}</b> <span className="text-slate-500">{t.uso_mes?.usuarios_activos === 1 ? 'usuario' : 'usuarios'}</span></span>
              <span><b className="text-slate-900">{t.uso_mes?.leads_ingresados ?? '—'}</b> <span className="text-slate-500">{t.uso_mes?.leads_ingresados === 1 ? 'lead' : 'leads'}</span></span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- uso / facturación ----------
function mesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function Uso() {
  const [mes, setMes] = useState(mesActual());
  const [filas, setFilas] = useState<any[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async (recalcular = false) => {
    setCargando(true);
    setError('');
    try {
      const r = await sa.get('/uso', { params: { mes, recalcular: recalcular ? '1' : undefined } });
      setFilas(r.data.tenants);
      if (r.data.errores?.length) setError(`No se pudo recalcular: ${r.data.errores.map((e: any) => `${e.slug} (${e.error})`).join(', ')}`);
    } catch (e) {
      setError(errorDe(e));
    } finally {
      setCargando(false);
    }
  }, [mes]);

  useEffect(() => { cargar(); }, [cargar]);
  const total = (filas || []).reduce((a, f) => a + (f.usuarios_activos || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Uso y facturación</h1>
        <p className="text-sm text-slate-500">Usuarios activos = iniciaron sesión o usaron el CRM en el mes (hora local de cada cliente).</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <Field label="Mes"><Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></Field>
        <Button variante="secundario" onClick={() => cargar(true)} disabled={cargando}>{cargando ? 'Calculando…' : 'Recalcular ahora'}</Button>
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Card titulo={`Total: ${total} usuarios activos`}>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 px-4 sm:px-2">Tenant</th><th className="px-2">Plan</th><th className="px-2">Estado</th>
                <th className="px-2 text-right">Usuarios</th><th className="px-2 text-right">Leads</th><th className="px-2">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {(filas || []).map((f) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => ir(`/t/${f.id}/uso`)}>
                  <td className="py-2 px-4 sm:px-2 font-medium text-slate-900">{f.nombre}<div className="text-xs text-slate-500">{f.slug}</div></td>
                  <td className="px-2">{f.plan}</td>
                  <td className="px-2"><EstadoBadge estado={f.estado} /></td>
                  <td className="px-2 text-right font-semibold">{f.usuarios_activos ?? '—'}</td>
                  <td className="px-2 text-right">{f.leads_ingresados ?? '—'}</td>
                  <td className="px-2 text-xs text-slate-500">{fecha(f.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ---------- auditoría ----------
function Auditoria() {
  const [eventos, setEventos] = useState<EventoAuditoria[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    sa.get('/auditoria', { params: { limit: 300 } }).then((r) => setEventos(r.data.eventos)).catch((e) => setError(errorDe(e)));
  }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Auditoría</h1>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Card>{eventos ? <ListaAuditoria eventos={eventos} /> : <p className="text-sm text-slate-500">Cargando…</p>}</Card>
    </div>
  );
}
