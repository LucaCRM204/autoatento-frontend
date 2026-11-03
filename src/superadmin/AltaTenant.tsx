/** Alta de tenant: schema nuevo (con owner) o base existente (con o sin migrar). */
import { useState, type FormEvent } from 'react';
import { sa, errorDe, MODULOS, problemaSlug, useConfigPanel } from './api';
import { Button, Card, Field, Input, Select, Aviso, lista, toast } from './ui';
import { ir } from './nav';

const aSlug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');

const ZONAS = [
  'America/Argentina/Buenos_Aires', 'America/Argentina/Cordoba', 'America/Argentina/Mendoza',
  'America/Montevideo', 'America/Santiago', 'America/Asuncion', 'America/Sao_Paulo', 'America/Mexico_City',
];

export default function AltaTenant({ onCreado }: { onCreado: (id: number) => void }) {
  const [modo, setModo] = useState<'nuevo' | 'existente'>('nuevo');
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTocado, setSlugTocado] = useState(false);
  const [plan, setPlan] = useState('esencial');
  const [dominios, setDominios] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [logo, setLogo] = useState('');
  const [marcas, setMarcas] = useState('');
  const [timezone, setTimezone] = useState(ZONAS[0]);
  const [waBotUrl, setWaBotUrl] = useState('');
  const [modulos, setModulos] = useState<Record<string, boolean>>(
    Object.fromEntries(MODULOS.map((m) => [m.key, !['multi_marca', 'motos', 'scoring'].includes(m.key)])));
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerNombre, setOwnerNombre] = useState('');
  const [ownerPass, setOwnerPass] = useState('');
  const [dbUrl, setDbUrl] = useState('');
  const [migrar, setMigrar] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const cfg = useConfigPanel();
  const errorSlug = problemaSlug(slug, cfg?.slugs_reservados);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (errorSlug) return setError(`Slug: ${errorSlug}`);
    const listaMarcas = lista(marcas).map((m) => m.toLowerCase());
    const body: any = {
      slug, nombre, plan,
      dominios: lista(dominios),
      branding: { nombre, color_primario: color, ...(logo ? { logo_url: logo } : {}) },
      modulos,
      config: {
        timezone, pais: 'Argentina', prefijo_telefonico: '54', moneda: 'ARS',
        ...(listaMarcas.length ? { marcas: listaMarcas, marca_default: listaMarcas[0] } : {}),
        ...(waBotUrl ? { wa_bot_url: waBotUrl } : {}),
      },
    };
    if (modo === 'nuevo') {
      body.owner = { email: ownerEmail, password: ownerPass, name: ownerNombre || 'Owner' };
    } else {
      body.db_url = dbUrl;
      body.migrar = migrar;
      if (ownerEmail) body.owner = { email: ownerEmail, password: ownerPass, name: ownerNombre || 'Owner' };
    }
    setEnviando(true);
    try {
      const r = await sa.post('/tenants', body);
      const mig = r.data.migraciones?.omitidas ? 'migraciones pendientes' : `${r.data.migraciones?.aplicadas?.length || 0} migraciones aplicadas`;
      toast(`Tenant "${r.data.slug}" creado · ${mig}`);
      onCreado(r.data.id);
    } catch (err) {
      setError(errorDe(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => ir('')} className="text-slate-500 hover:text-slate-900">←</button>
        <h1 className="text-2xl font-bold text-slate-900">Nuevo tenant</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-slate-200 p-1 rounded-xl">
        {([['nuevo', 'Base nueva', 'Crea crm_<slug>, migra y crea el owner'], ['existente', 'Base existente', 'Apunta a una base que ya tiene datos']] as const).map(([k, t, d]) => (
          <button key={k} type="button" onClick={() => setModo(k)}
            className={`rounded-lg px-3 py-2 text-left ${modo === k ? 'bg-white shadow-sm' : 'text-slate-600'}`}>
            <div className="text-sm font-semibold">{t}</div>
            <div className="text-xs text-slate-500 hidden sm:block">{d}</div>
          </button>
        ))}
      </div>

      <Card titulo="Datos">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre visible">
            <Input value={nombre} required onChange={(e) => { setNombre(e.target.value); if (!slugTocado) setSlug(aSlug(e.target.value)); }} placeholder="Auto del Sol Fiat" />
          </Field>
          <Field label="Slug" ayuda="Minúsculas, números y guiones. Es el subdominio del CRM y va en los webhooks: /api/t/<slug>/...">
            <Input value={slug} required aria-invalid={!!errorSlug} onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugTocado(true); }} placeholder="fiat-autodelsol" />
            {errorSlug && <span className="block text-xs text-red-600 mt-1">{errorSlug}</span>}
          </Field>
          <div className="sm:col-span-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
            <span className="text-slate-500">URL del CRM: </span>
            {cfg?.base_domain
              ? <span className="font-mono break-all">https://{slug && !errorSlug ? slug : '<slug>'}.{cfg.base_domain}</span>
              : <span className="text-amber-700">{cfg ? 'el backend no tiene BASE_DOMAIN: el CRM se abre solo por los dominios propios' : '…'}</span>}
          </div>
          <Field label="Plan">
            <Select value={plan} onChange={(e) => setPlan(e.target.value)}>
              <option value="esencial">Esencial</option><option value="pro">Pro</option><option value="arm">ARM</option>
            </Select>
          </Field>
          <Field label="Zona horaria">
            <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>{ZONAS.map((z) => <option key={z}>{z}</option>)}</Select>
          </Field>
          <Field label="Dominios propios (opcional)" ayuda="Del cliente, separados por coma. Ej: crm.cliente.com.ar. El subdominio de arriba funciona sin cargarlo.">
            <Input value={dominios} onChange={(e) => setDominios(e.target.value)} placeholder="crm.cliente.com.ar" />
          </Field>
          <Field label="Marcas" ayuda="Separadas por coma; la primera es la default">
            <Input value={marcas} onChange={(e) => setMarcas(e.target.value)} placeholder="fiat, jeep" />
          </Field>
          <Field label="Color primario">
            <div className="flex gap-2"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 rounded border border-slate-300" /><Input value={color} onChange={(e) => setColor(e.target.value)} /></div>
          </Field>
          <Field label="Logo (URL, opcional)"><Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…/logo.png" /></Field>
          <Field label="URL del bot de WhatsApp (opcional)"><Input value={waBotUrl} onChange={(e) => setWaBotUrl(e.target.value)} placeholder="https://api…/wa-cliente" /></Field>
        </div>
      </Card>

      {modo === 'existente' && (
        <Card titulo="Base existente">
          <div className="space-y-4">
            <Field label="Connection string" ayuda="Se guarda cifrada. Ej: mysql://usuario:clave@host:puerto/base">
              <Input value={dbUrl} required onChange={(e) => setDbUrl(e.target.value)} placeholder="mysql://…" autoComplete="off" />
            </Field>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={migrar} onChange={(e) => setMigrar(e.target.checked)} className="mt-1" />
              <span>Correr las migraciones ahora<span className="block text-xs text-slate-500">Destildalo para registrar la base y migrar después (ej. fuera de horario).</span></span>
            </label>
          </div>
        </Card>
      )}

      <Card titulo={modo === 'nuevo' ? 'Owner (obligatorio)' : 'Owner (opcional: solo si la base no tiene uno)'}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Email"><Input type="email" value={ownerEmail} required={modo === 'nuevo'} onChange={(e) => setOwnerEmail(e.target.value)} /></Field>
          <Field label="Nombre"><Input value={ownerNombre} onChange={(e) => setOwnerNombre(e.target.value)} /></Field>
          <Field label="Contraseña" ayuda="Mínimo 8 caracteres"><Input type="password" value={ownerPass} minLength={8} required={modo === 'nuevo' || !!ownerEmail} onChange={(e) => setOwnerPass(e.target.value)} autoComplete="new-password" /></Field>
        </div>
      </Card>

      <Card titulo="Módulos">
        <div className="grid gap-2 sm:grid-cols-2">
          {MODULOS.map((m) => (
            <label key={m.key} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50">
              <input type="checkbox" checked={!!modulos[m.key]} onChange={(e) => setModulos({ ...modulos, [m.key]: e.target.checked })} className="mt-1" />
              <span className="text-sm"><span className="font-medium">{m.nombre}</span><span className="block text-xs text-slate-500">{m.ayuda}</span></span>
            </label>
          ))}
        </div>
      </Card>

      {error && <Aviso tipo="error">{error}</Aviso>}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button type="button" variante="secundario" onClick={() => ir('')}>Cancelar</Button>
        <Button type="submit" disabled={enviando || !!errorSlug}>{enviando ? 'Creando… (puede tardar)' : 'Crear tenant'}</Button>
      </div>
    </form>
  );
}
