/** Detalle y edición de un tenant (pestañas). */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { sa, errorDe, MODULOS, SECRETOS, type Tenant, type EventoAuditoria } from './api';
import { Button, Card, EstadoBadge, Field, Input, Select, Textarea, Aviso, Confirmar, fecha, lista, toast } from './ui';
import { ir } from './nav';
import ListaAuditoria from './ListaAuditoria';
import { API_BASE } from '../tenant/store';

const TABS = [
  ['resumen', 'Resumen'], ['general', 'General'], ['branding', 'Branding'], ['modulos', 'Módulos'],
  ['config', 'Configuración'], ['secretos', 'Secretos'], ['base', 'Base y migraciones'], ['uso', 'Uso'], ['auditoria', 'Auditoría'],
] as const;

export default function TenantDetalle({ id, tab = 'resumen' }: { id: number; tab?: string }) {
  const [t, setT] = useState<Tenant | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    sa.get(`/tenants/${id}`).then((r) => setT(r.data.tenant)).catch((e) => setError(errorDe(e)));
  }, [id]);
  useEffect(cargar, [cargar]);

  /** PATCH y refresco. Devuelve true si salió bien. */
  const guardar = async (cambios: Record<string, unknown>, ok = 'Cambios guardados') => {
    try {
      const r = await sa.patch(`/tenants/${id}`, cambios);
      setT(r.data.tenant);
      toast(r.data.cambios?.length ? ok : 'No había cambios');
      return true;
    } catch (e) {
      toast(errorDe(e), 'error');
      return false;
    }
  };

  if (error) return <Aviso tipo="error">{error}</Aviso>;
  if (!t) return <p className="text-sm text-slate-500">Cargando…</p>;
  const activo = TABS.some(([k]) => k === tab) ? tab : 'resumen';

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <button onClick={() => ir('')} className="text-slate-500 hover:text-slate-900 mt-1">←</button>
        <span className="h-10 w-10 rounded-xl shrink-0" style={{ background: t.branding?.color_primario || '#2563eb' }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{t.branding?.nombre || t.nombre}</h1>
            <EstadoBadge estado={t.estado} />
          </div>
          <p className="text-sm text-slate-500 truncate">{t.slug} · plan {t.plan} · alta {fecha(t.created_at)}</p>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-slate-200">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => ir(`/t/${id}${k === 'resumen' ? '' : `/${k}`}`)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${activo === k ? 'border-slate-900 text-slate-900 font-medium' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {l}
          </button>
        ))}
      </nav>

      {activo === 'resumen' && <Resumen t={t} recargar={cargar} />}
      {activo === 'general' && <General t={t} guardar={guardar} />}
      {activo === 'branding' && <Branding t={t} guardar={guardar} />}
      {activo === 'modulos' && <Modulos t={t} guardar={guardar} />}
      {activo === 'config' && <Config t={t} guardar={guardar} />}
      {activo === 'secretos' && <Secretos t={t} guardar={guardar} />}
      {activo === 'base' && <Base t={t} guardar={guardar} />}
      {activo === 'uso' && <UsoTenant t={t} />}
      {activo === 'auditoria' && <AuditoriaTenant t={t} />}
    </div>
  );
}

type Props = { t: Tenant; guardar: (c: Record<string, unknown>, ok?: string) => Promise<boolean> };

// ---------- resumen + acciones ----------
function Resumen({ t, recargar }: { t: Tenant; recargar: () => void }) {
  const [dialogo, setDialogo] = useState<null | 'suspender' | 'reactivar' | 'baja' | 'impersonar'>(null);
  const [trabajando, setTrabajando] = useState(false);

  const estado = async (accion: 'suspender' | 'reactivar' | 'baja', motivo: string) => {
    setTrabajando(true);
    try {
      const r = await sa.post(`/tenants/${t.id}/${accion}`, { motivo: motivo || undefined });
      const cortados = r.data.sockets_cortados ? ` · ${r.data.sockets_cortados} sesiones en vivo cortadas` : '';
      toast(`${accion === 'reactivar' ? 'Reactivado' : accion === 'baja' ? 'Dado de baja' : 'Suspendido'}${cortados}`);
      recargar();
    } catch (e) {
      toast(errorDe(e), 'error');
    } finally {
      setTrabajando(false);
      setDialogo(null);
    }
  };

  const impersonar = async (motivo: string) => {
    setDialogo(null);
    try {
      const r = await sa.post(`/tenants/${t.id}/impersonar`, { motivo: motivo || undefined });
      const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      if (!local && !r.data.dominios?.length) {
        toast('El tenant no tiene dominios cargados', 'error');
        return;
      }
      const destino = local ? `${window.location.origin}/?tenant=${r.data.slug}` : `https://${r.data.dominios[0]}/`;
      const u = btoa(unescape(encodeURIComponent(JSON.stringify(r.data.user))));
      window.open(`${destino}#imp=${encodeURIComponent(r.data.token)}&u=${encodeURIComponent(u)}`, '_blank', 'noopener');
      toast(`Sesión de soporte como ${r.data.user.email} (1 hora)`);
    } catch (e) {
      toast(errorDe(e), 'error');
    }
  };

  const webhooks = ['whatsapp-bot', 'zapier-formularios', 'sheets'].map((w) => `${API_BASE}/t/${t.slug}/webhooks/${w}`);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-5">
        <Card titulo="Datos">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Dato l="Dominios">{t.dominios.length ? t.dominios.join(', ') : <span className="text-amber-700">sin dominios</span>}</Dato>
            <Dato l="Zona horaria">{t.config.timezone || '—'}</Dato>
            <Dato l="Marcas">{(t.config.marcas || []).join(', ') || '—'}{t.config.marca_default ? ` (default ${t.config.marca_default})` : ''}</Dato>
            <Dato l="Bot de WhatsApp">{t.config.wa_bot_url || '—'}</Dato>
            <Dato l="Base">{t.base}</Dato>
            <Dato l="Módulos prendidos">{MODULOS.filter((m) => t.modulos[m.key]).map((m) => m.nombre).join(', ')}</Dato>
          </dl>
        </Card>
        <Card titulo="URLs de webhooks">
          <ul className="space-y-1 text-xs font-mono break-all text-slate-700">{webhooks.map((w) => <li key={w}>{w}</li>)}</ul>
          <p className="text-xs text-slate-500 mt-2">Con el header <code>x-api-key</code> de la pestaña Secretos.</p>
        </Card>
      </div>
      <Card titulo="Acciones">
        <div className="flex flex-col gap-2">
          <Button onClick={() => setDialogo('impersonar')} disabled={t.estado !== 'activo'}>Entrar como owner</Button>
          {t.estado === 'activo'
            ? <Button variante="secundario" onClick={() => setDialogo('suspender')} disabled={trabajando}>Suspender</Button>
            : <Button variante="secundario" onClick={() => setDialogo('reactivar')} disabled={trabajando}>Reactivar</Button>}
          {t.estado !== 'baja' && <Button variante="peligro" onClick={() => setDialogo('baja')} disabled={trabajando}>Dar de baja</Button>}
          <p className="text-xs text-slate-500 mt-2">Suspender corta las sesiones en vivo y el CRM muestra "Cuenta suspendida". La baja hace que el dominio responda "cuenta no encontrada"; se puede reactivar. Nada borra datos.</p>
        </div>
      </Card>

      <Confirmar abierto={dialogo === 'impersonar'} titulo="Entrar como owner" pedirMotivo confirmarTexto="Entrar"
        texto="Se abre el CRM del cliente en otra pestaña con una sesión de owner de 1 hora. Queda registrado en la auditoría."
        onConfirmar={impersonar} onCancelar={() => setDialogo(null)} />
      <Confirmar abierto={dialogo === 'suspender'} titulo={`Suspender ${t.slug}`} peligro pedirMotivo confirmarTexto="Suspender"
        texto="Los usuarios del cliente pierden el acceso en el momento (las sesiones abiertas se cortan)."
        onConfirmar={(m) => estado('suspender', m)} onCancelar={() => setDialogo(null)} />
      <Confirmar abierto={dialogo === 'reactivar'} titulo={`Reactivar ${t.slug}`} pedirMotivo confirmarTexto="Reactivar"
        texto="El cliente vuelve a tener acceso." onConfirmar={(m) => estado('reactivar', m)} onCancelar={() => setDialogo(null)} />
      <Confirmar abierto={dialogo === 'baja'} titulo={`Dar de baja ${t.slug}`} peligro pedirMotivo escribir={t.slug} confirmarTexto="Dar de baja"
        texto="El CRM deja de responder para este cliente. Los datos no se borran." onConfirmar={(m) => estado('baja', m)} onCancelar={() => setDialogo(null)} />
    </div>
  );
}

const Dato = ({ l, children }: { l: string; children: ReactNode }) => (
  <div><dt className="text-xs text-slate-500">{l}</dt><dd className="text-slate-900 break-all">{children}</dd></div>
);

// ---------- general ----------
function General({ t, guardar }: Props) {
  const [nombre, setNombre] = useState(t.nombre);
  const [plan, setPlan] = useState<string>(t.plan);
  const [dominios, setDominios] = useState(t.dominios.join(', '));
  return (
    <Card titulo="General">
      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
        <Field label="Nombre (interno)"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
        <Field label="Plan"><Select value={plan} onChange={(e) => setPlan(e.target.value)}><option value="esencial">Esencial</option><option value="pro">Pro</option><option value="arm">ARM</option></Select></Field>
        <div className="sm:col-span-2"><Field label="Dominios" ayuda="Separados por coma. Cada dominio tiene que apuntar al deploy único de Vercel."><Input value={dominios} onChange={(e) => setDominios(e.target.value)} /></Field></div>
      </div>
      <Guardar onClick={() => guardar({ nombre, plan, dominios: lista(dominios) })} />
    </Card>
  );
}

function Guardar({ onClick, texto = 'Guardar' }: { onClick: () => Promise<unknown>; texto?: string }) {
  const [g, setG] = useState(false);
  return (
    <div className="mt-5 flex justify-end">
      <Button disabled={g} onClick={async () => { setG(true); await onClick(); setG(false); }}>{g ? 'Guardando…' : texto}</Button>
    </div>
  );
}

// ---------- branding ----------
function Branding({ t, guardar }: Props) {
  const [b, setB] = useState({ nombre: '', logo_url: '', favicon_url: '', color_primario: '#2563eb', ...t.branding });
  const set = (k: string, v: string) => setB({ ...b, [k]: v });
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card titulo="Branding">
        <div className="space-y-4">
          <Field label="Nombre visible" ayuda="Login, menú, título de la pestaña y mensajes de WhatsApp"><Input value={b.nombre} onChange={(e) => set('nombre', e.target.value)} /></Field>
          <Field label="Color primario">
            <div className="flex gap-2"><input type="color" value={b.color_primario} onChange={(e) => set('color_primario', e.target.value)} className="h-10 w-14 rounded border border-slate-300" /><Input value={b.color_primario} onChange={(e) => set('color_primario', e.target.value)} /></div>
          </Field>
          <Field label="Logo (URL)" ayuda="PNG o SVG, idealmente con fondo transparente"><Input value={b.logo_url} onChange={(e) => set('logo_url', e.target.value)} /></Field>
          <Field label="Favicon (URL)" ayuda="Si falta usa el logo"><Input value={b.favicon_url} onChange={(e) => set('favicon_url', e.target.value)} /></Field>
        </div>
        <Guardar onClick={() => guardar({ branding: b })} />
      </Card>
      <Card titulo="Vista previa (login)">
        <div className="rounded-xl p-6 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${b.color_primario}, #0f172a)` }}>
          <div className="bg-white rounded-xl p-5 w-full max-w-xs text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              {b.logo_url
                ? <img src={b.logo_url} alt="" className="h-10 object-contain" />
                : <div className="h-10 w-10 rounded-lg text-white font-bold flex items-center justify-center" style={{ background: b.color_primario }}>{(b.nombre || 'A').slice(0, 2).toUpperCase()}</div>}
              <div className="text-left"><div className="font-bold text-slate-800">{b.nombre || 'AutoAtento'}</div><div className="text-xs text-slate-500">CRM</div></div>
            </div>
            <div className="h-8 rounded bg-slate-100 mb-2" /><div className="h-8 rounded bg-slate-100 mb-3" />
            <div className="h-9 rounded text-white text-sm flex items-center justify-center" style={{ background: b.color_primario }}>Iniciar sesión</div>
            <p className="text-[10px] text-slate-400 mt-4">Powered by <b>AutoAtento</b></p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------- módulos ----------
function Modulos({ t, guardar }: Props) {
  const [m, setM] = useState<Record<string, boolean>>({ ...t.modulos });
  return (
    <Card titulo="Módulos" accion={<span className="text-xs text-slate-500">Un módulo apagado desaparece del menú y sus rutas dan 403</span>}>
      <div className="grid gap-2 sm:grid-cols-2">
        {MODULOS.map((x) => (
          <label key={x.key} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200">
            <span className="text-sm"><span className="font-medium">{x.nombre}</span><span className="block text-xs text-slate-500">{x.ayuda}</span></span>
            <button type="button" role="switch" aria-checked={!!m[x.key]} onClick={() => setM({ ...m, [x.key]: !m[x.key] })}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${m[x.key] ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${m[x.key] ? 'left-5' : 'left-0.5'}`} />
            </button>
          </label>
        ))}
      </div>
      <Guardar onClick={() => guardar({ modulos: m })} />
    </Card>
  );
}

// ---------- configuración ----------
function Config({ t, guardar }: Props) {
  const c = t.config;
  const [f, setF] = useState({
    timezone: c.timezone || '', pais: c.pais || '', prefijo_telefonico: c.prefijo_telefonico || '', moneda: c.moneda || '',
    marcas: (c.marcas || []).join(', '), marca_default: c.marca_default || '', wa_bot_url: c.wa_bot_url || '',
    agent_provider: c.agent_provider || '', agent_model: c.agent_model || '',
    dist_excluidos: Array.isArray(c.dist_excluidos) ? c.dist_excluidos.join(', ') : (c.dist_excluidos || ''),
    sheet_fuentes: c.sheet_fuentes ? JSON.stringify(c.sheet_fuentes, null, 2) : '',
  });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  const marcas = lista(f.marcas).map((m) => m.toLowerCase());

  const enviar = async () => {
    setError('');
    let sheet: unknown = null;
    if (f.sheet_fuentes.trim()) {
      try { sheet = JSON.parse(f.sheet_fuentes); } catch { setError('sheet_fuentes no es un JSON válido'); return; }
    }
    // '' / [] -> null: el backend borra la clave
    const vacio = (v: string) => (v.trim() ? v.trim() : null);
    await guardar({
      config: {
        timezone: vacio(f.timezone), pais: vacio(f.pais), prefijo_telefonico: vacio(f.prefijo_telefonico), moneda: vacio(f.moneda),
        marcas: marcas.length ? marcas : null,
        marca_default: marcas.length ? (marcas.includes(f.marca_default) ? f.marca_default : marcas[0]) : null,
        wa_bot_url: vacio(f.wa_bot_url), agent_provider: vacio(f.agent_provider), agent_model: vacio(f.agent_model),
        dist_excluidos: lista(f.dist_excluidos).length ? lista(f.dist_excluidos).map(Number) : null,
        sheet_fuentes: sheet,
      },
    });
  };

  return (
    <Card titulo="Configuración">
      <div className="grid gap-4 sm:grid-cols-2 max-w-4xl">
        <Field label="Zona horaria (IANA)" ayuda="Horarios, recordatorios, agente y corte de mes del uso"><Input value={f.timezone} onChange={(e) => set('timezone', e.target.value)} /></Field>
        <Field label="País"><Input value={f.pais} onChange={(e) => set('pais', e.target.value)} /></Field>
        <Field label="Prefijo telefónico"><Input value={f.prefijo_telefonico} onChange={(e) => set('prefijo_telefonico', e.target.value)} /></Field>
        <Field label="Moneda"><Input value={f.moneda} onChange={(e) => set('moneda', e.target.value)} /></Field>
        <Field label="Marcas habilitadas" ayuda="Separadas por coma, en minúscula"><Input value={f.marcas} onChange={(e) => set('marcas', e.target.value)} /></Field>
        <Field label="Marca default" ayuda="Para leads sin marca o con una no habilitada">
          <Select value={f.marca_default} onChange={(e) => set('marca_default', e.target.value)}>
            {!marcas.length && <option value="">—</option>}
            {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        <div className="sm:col-span-2"><Field label="URL del bot de WhatsApp"><Input value={f.wa_bot_url} onChange={(e) => set('wa_bot_url', e.target.value)} placeholder="https://…" /></Field></div>
        <Field label="Proveedor del agente IA" ayuda="Vacío = según la key cargada o el global">
          <Select value={f.agent_provider} onChange={(e) => set('agent_provider', e.target.value)}><option value="">Automático</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option></Select>
        </Field>
        <Field label="Modelo del agente" ayuda="Vacío = default"><Input value={f.agent_model} onChange={(e) => set('agent_model', e.target.value)} /></Field>
        <Field label="Usuarios excluidos del reparto" ayuda="Ids separados por coma"><Input value={f.dist_excluidos} onChange={(e) => set('dist_excluidos', e.target.value)} /></Field>
        <Field label="Fuentes de Google Sheets (JSON)" ayuda={'{ "sheet-proveedor": "Fuente" }'}><Textarea rows={3} value={f.sheet_fuentes} onChange={(e) => set('sheet_fuentes', e.target.value)} /></Field>
      </div>
      {error && <div className="mt-4"><Aviso tipo="error">{error}</Aviso></div>}
      <Guardar onClick={enviar} />
    </Card>
  );
}

// ---------- secretos ----------
const claveAleatoria = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');

function Secretos({ t, guardar }: Props) {
  const [visible, setVisible] = useState<Record<string, string>>({});
  const [nuevo, setNuevo] = useState<Record<string, string>>({});
  const [borrar, setBorrar] = useState<string | null>(null);

  const ver = async (clave: string) => {
    try {
      const r = await sa.get(`/tenants/${t.id}/secretos/${clave}`);
      setVisible({ ...visible, [clave]: typeof r.data.valor === 'string' ? r.data.valor : JSON.stringify(r.data.valor) });
    } catch (e) {
      toast(errorDe(e), 'error');
    }
  };

  return (
    <div className="space-y-5">
      <Aviso>Los secretos se guardan cifrados. "Ver" queda registrado en la auditoría.</Aviso>
      <ApiKeysWebhooks t={t} guardar={guardar} />
      {SECRETOS.map((s) => (
        <Card key={s.key} titulo={s.nombre} accion={t.secretos[s.key] ? <span className="text-xs text-emerald-700 font-medium">cargada</span> : <span className="text-xs text-slate-400">sin cargar</span>}>
          <p className="text-xs text-slate-500 mb-3">{s.ayuda}</p>
          {visible[s.key] && <Input readOnly value={visible[s.key]} className="mb-3" onFocus={(e) => e.target.select()} />}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input type="password" placeholder="Nuevo valor" value={nuevo[s.key] || ''} onChange={(e) => setNuevo({ ...nuevo, [s.key]: e.target.value })} autoComplete="off" />
            <Button disabled={!nuevo[s.key]} onClick={async () => { if (await guardar({ config: { [s.key]: nuevo[s.key] } }, 'Secreto guardado')) setNuevo({ ...nuevo, [s.key]: '' }); }}>Guardar</Button>
            {t.secretos[s.key] && <Button variante="secundario" onClick={() => ver(s.key)}>Ver</Button>}
            {t.secretos[s.key] && <Button variante="fantasma" onClick={() => setBorrar(s.key)}>Borrar</Button>}
          </div>
        </Card>
      ))}
      <Confirmar abierto={!!borrar} titulo="Borrar secreto" peligro confirmarTexto="Borrar"
        texto={`Se borra ${borrar}. Si es la key del bot, el CRM deja de poder mandar WhatsApp.`}
        onConfirmar={async () => { if (borrar) await guardar({ config: { [borrar]: null } }, 'Secreto borrado'); setBorrar(null); }}
        onCancelar={() => setBorrar(null)} />
    </div>
  );
}

function ApiKeysWebhooks({ t, guardar }: Props) {
  const proveedores = (t.secretos.lead_api_keys as string[]) || [];
  const [filas, setFilas] = useState<{ p: string; k: string }[] | null>(null);
  const editar = async () => {
    if (!proveedores.length) { setFilas([{ p: 'whatsapp-bot', k: claveAleatoria() }]); return; }
    try {
      const r = await sa.get(`/tenants/${t.id}/secretos/lead_api_keys`);
      setFilas(Object.entries(r.data.valor || {}).map(([p, k]) => ({ p, k: String(k) })));
    } catch (e) {
      toast(errorDe(e), 'error');
    }
  };
  const guardarFilas = async () => {
    const obj = Object.fromEntries((filas || []).filter((f) => f.p.trim() && f.k.trim()).map((f) => [f.p.trim(), f.k.trim()]));
    if (await guardar({ config: { lead_api_keys: Object.keys(obj).length ? obj : null } }, 'API keys guardadas')) setFilas(null);
  };
  return (
    <Card titulo="API keys de webhooks" accion={!filas && <Button variante="secundario" onClick={editar}>{proveedores.length ? 'Ver / editar' : 'Agregar'}</Button>}>
      <p className="text-xs text-slate-500 mb-3">Proveedor → clave. Proveedores conocidos: whatsapp-bot, zapier-formularios, sheet-emanuel, sheet-fastlead.</p>
      {!filas && <p className="text-sm">{proveedores.length ? proveedores.join(', ') : 'Sin keys: los webhooks de este tenant responden 401.'}</p>}
      {filas && (
        <div className="space-y-2">
          {filas.map((f, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-2">
              <Input className="sm:w-48" placeholder="proveedor" value={f.p} onChange={(e) => setFilas(filas.map((x, j) => (j === i ? { ...x, p: e.target.value } : x)))} />
              <Input className="font-mono" value={f.k} onChange={(e) => setFilas(filas.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))} />
              <Button variante="fantasma" onClick={() => setFilas(filas.filter((_, j) => j !== i))}>Quitar</Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variante="secundario" onClick={() => setFilas([...filas, { p: '', k: claveAleatoria() }])}>+ Agregar (clave generada)</Button>
            <Button variante="fantasma" onClick={() => setFilas(null)}>Cancelar</Button>
            <Button onClick={guardarFilas}>Guardar keys</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------- base y migraciones ----------
function Base({ t, guardar }: Props) {
  const [url, setUrl] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [mig, setMig] = useState<any>(null);
  const [corriendo, setCorriendo] = useState(false);

  const migrar = async (dry: boolean) => {
    setCorriendo(true);
    try {
      const r = await sa.post(`/tenants/${t.id}/migrar`, { dry_run: dry });
      setMig({ ...r.data, dry });
      if (!dry) toast(r.data.aplicadas.length ? `Aplicadas: ${r.data.aplicadas.join(', ')}` : 'La base ya estaba al día');
    } catch (e) {
      setMig({ ok: false, error: errorDe(e), dry });
    } finally {
      setCorriendo(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card titulo="Migraciones">
        <p className="text-sm text-slate-600 mb-4">Se aplican en orden y solo las pendientes. La 003 reconstruye la tabla de leads: en bases grandes, correrla fuera de horario.</p>
        <div className="flex flex-wrap gap-2">
          <Button variante="secundario" disabled={corriendo} onClick={() => migrar(true)}>Ver pendientes</Button>
          <Button disabled={corriendo} onClick={() => migrar(false)}>{corriendo ? 'Migrando…' : 'Aplicar pendientes'}</Button>
        </div>
        {mig && (
          <div className="mt-4">
            {mig.ok === false
              ? <Aviso tipo="error">{mig.error}</Aviso>
              : <Aviso tipo="ok">{mig.dry
                ? (mig.pendientes.length ? `Pendientes: ${mig.pendientes.join(', ')}` : 'Al día: no hay pendientes')
                : (mig.aplicadas.length ? `Aplicadas: ${mig.aplicadas.join(', ')}` : 'Al día')}
                {mig.modificadas?.length ? ` · ⚠️ modificadas después de aplicadas: ${mig.modificadas.join(', ')}` : ''}</Aviso>}
          </div>
        )}
      </Card>
      <Card titulo="Base de datos">
        <Field label="Actual"><Input readOnly value={t.base} /></Field>
        <div className="mt-4 space-y-2">
          <Field label="Apuntar a otra base" ayuda="Se prueba la conexión antes de guardar. Se guarda cifrada.">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="mysql://usuario:clave@host:puerto/base" autoComplete="off" />
          </Field>
          <div className="flex justify-end"><Button variante="secundario" disabled={!url} onClick={() => setConfirmar(true)}>Cambiar base</Button></div>
        </div>
      </Card>
      <Confirmar abierto={confirmar} titulo="Cambiar la base del tenant" peligro escribir={t.slug} confirmarTexto="Cambiar"
        texto="El CRM del cliente pasa a leer y escribir en la base nueva en hasta 30 segundos."
        onConfirmar={async () => { if (await guardar({ db_url: url }, 'Base actualizada')) setUrl(''); setConfirmar(false); }}
        onCancelar={() => setConfirmar(false)} />
    </div>
  );
}

// ---------- uso ----------
function UsoTenant({ t }: { t: Tenant }) {
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    sa.get(`/tenants/${t.id}/uso`, { params: { meses: 12 } }).then((r) => setD(r.data)).catch((e) => setError(errorDe(e)));
  }, [t.id]);
  if (error) return <Aviso tipo="error">{error}</Aviso>;
  if (!d) return <p className="text-sm text-slate-500">Calculando…</p>;
  const bot = d.bot;
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card titulo={`Este mes (${d.actual?.mes || '—'})`}>
        {d.error && <Aviso tipo="error">{d.error}</Aviso>}
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-xs text-slate-500">Usuarios activos</div><div className="text-3xl font-bold">{d.actual?.usuarios_activos ?? '—'}</div></div>
          <div><div className="text-xs text-slate-500">Leads</div><div className="text-3xl font-bold">{d.actual?.leads_ingresados ?? '—'}</div></div>
        </div>
      </Card>
      <Card titulo="Bot de WhatsApp" className="lg:col-span-2">
        {!bot ? <p className="text-sm text-slate-500">—</p> : (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bot.configurado ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{bot.configurado ? 'Configurado' : 'Sin configurar'}</span>
              {bot.url && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bot.alcanzable ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{bot.alcanzable ? `Responde (HTTP ${bot.http})` : `No responde${bot.error ? ` (${bot.error})` : ''}`}</span>}
            </div>
            {bot.sesiones?.length ? (
              <ul className="divide-y divide-slate-100">
                {bot.sesiones.map((s: any) => (
                  <li key={s.user_id} className="py-2 flex flex-wrap justify-between gap-2">
                    <span>{s.supervisor_name || `#${s.user_id}`} · {s.phone || 'sin número'}</span>
                    <span className="text-xs text-slate-500">{s.status}{s.bot_enabled ? ' · bot prendido' : ''} · {fecha(s.updated_at)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-slate-500">El bot no registró sesiones en la base.</p>}
          </div>
        )}
      </Card>
      <Card titulo="Historial" className="lg:col-span-3">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b"><th className="py-2">Mes</th><th className="text-right">Usuarios</th><th className="text-right">Leads</th></tr></thead>
          <tbody>{d.historial.map((h: any) => (
            <tr key={h.mes} className="border-b last:border-0"><td className="py-2">{h.mes}</td><td className="text-right font-semibold">{h.usuarios_activos}</td><td className="text-right">{h.leads_ingresados}</td></tr>
          ))}</tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------- auditoría ----------
function AuditoriaTenant({ t }: { t: Tenant }) {
  const [ev, setEv] = useState<EventoAuditoria[] | null>(null);
  useEffect(() => {
    sa.get('/auditoria', { params: { tenant_id: t.id, limit: 200 } }).then((r) => setEv(r.data.eventos)).catch((e) => toast(errorDe(e), 'error'));
  }, [t.id]);
  return <Card titulo="Auditoría">{ev ? <ListaAuditoria eventos={ev} /> : <p className="text-sm text-slate-500">Cargando…</p>}</Card>;
}
