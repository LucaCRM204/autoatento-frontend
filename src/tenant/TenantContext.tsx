/**
 * TenantProvider: resuelve el tenant al cargar la app.
 *
 *   - Subdominio (demo-norte.autoatento.com.ar) o
 *     dominio propio del cliente (crm.cliente.com.ar) -> GET /api/public/tenant?host=<hostname>
 *     (el backend resuelve <slug>.<BASE_DOMAIN> solo, sin cargarlo en "dominios")
 *   - localhost / 127.0.0.1 (desarrollo)          -> ?tenant=<slug> en la URL o VITE_DEV_TENANT
 *     (<slug>.localhost también funciona: se resuelve por host)
 *
 * Aplica el branding (título, favicon, color primario como variable CSS),
 * expone los módulos y muestra pantallas propias si el dominio no está
 * configurado o la cuenta está suspendida.
 *
 * "Entrar como owner" (panel superadmin): llega como #imp=<token>&u=<usuario>
 * en la URL; se guarda en sessionStorage y CRM.tsx inicia sesión con eso.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import axios from 'axios';
import {
  API_BASE, DEFAULT_COLOR, EVENTO_SUSPENDIDO, setTenant,
  type Modulo, type TenantInfo,
} from './store';
import { BrandMark, PoweredBy } from './branding';

interface TenantContextValue {
  tenant: TenantInfo;
  /** ¿Está prendido el módulo? */
  modulo: (m: Modulo) => boolean;
  /** Nombre visible (branding), con fallback a AutoAtento. */
  nombreMarca: string;
}

const Ctx = createContext<TenantContextValue | null>(null);

export function useTenant(): TenantContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTenant fuera de TenantProvider');
  return v;
}

const ES_LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

/** Slug de desarrollo: ?tenant=<slug> (queda guardado en la pestaña) o VITE_DEV_TENANT. */
function slugDev(): string | null {
  const q = new URLSearchParams(window.location.search).get('tenant');
  if (q) {
    sessionStorage.setItem('aa_dev_tenant', q);
    return q;
  }
  return sessionStorage.getItem('aa_dev_tenant') || import.meta.env.VITE_DEV_TENANT || null;
}

/** #imp=<token>&u=<base64 json> -> sessionStorage, y se limpia de la URL. */
function capturarImpersonacion() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = hash.get('imp');
  if (!token) return;
  try {
    const user = JSON.parse(decodeURIComponent(escape(atob(hash.get('u') || ''))));
    sessionStorage.setItem('aa_imp', JSON.stringify({ token, user }));
  } catch {
    sessionStorage.setItem('aa_imp', JSON.stringify({ token, user: null }));
  }
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

function aplicarBranding(t: TenantInfo) {
  const nombre = t.branding?.nombre || 'AutoAtento';
  document.title = `${nombre} · CRM`;
  const color = t.branding?.color_primario || DEFAULT_COLOR;
  document.documentElement.style.setProperty('--color-primario', color);
  const icono = t.branding?.favicon_url || t.branding?.logo_url || '/autoatento.svg';
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = icono;
  link.removeAttribute('type');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'ok'; tenant: TenantInfo }
  | { tipo: 'sin-tenant'; detalle: string }
  | { tipo: 'error'; detalle: string }
  | { tipo: 'suspendido'; tenant?: TenantInfo; mensaje?: string };

export function TenantProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  useEffect(() => {
    capturarImpersonacion();
    const params: Record<string, string> = {};
    if (ES_LOCAL) {
      const s = slugDev();
      if (!s) {
        setEstado({ tipo: 'sin-tenant', detalle: 'Estás en localhost: definí VITE_DEV_TENANT en el .env o abrí la app con ?tenant=<slug>.' });
        return;
      }
      params.slug = s;
    } else {
      params.host = window.location.hostname;
    }

    axios.get(`${API_BASE}/public/tenant`, { params, timeout: 15000 })
      .then(({ data }) => {
        const t: TenantInfo = data;
        setTenant(t);
        aplicarBranding(t);
        // En localhost se puede cambiar de tenant: no reusar la sesión de otro
        const anterior = localStorage.getItem('aa_tenant');
        if (anterior && anterior !== t.slug) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        localStorage.setItem('aa_tenant', t.slug);
        setEstado(t.estado === 'suspendido' ? { tipo: 'suspendido', tenant: t } : { tipo: 'ok', tenant: t });
      })
      .catch((e) => {
        if (e.response?.status === 404) {
          setEstado({ tipo: 'sin-tenant', detalle: `El dominio ${ES_LOCAL ? `(tenant "${params.slug}")` : window.location.hostname} no está configurado.` });
        } else {
          setEstado({ tipo: 'error', detalle: 'No pudimos conectar con el servidor. Probá de nuevo en unos minutos.' });
        }
      });
  }, []);

  // 402 en cualquier request o aviso del socket -> pantalla de cuenta suspendida
  useEffect(() => {
    const onSuspendido = (e: Event) => {
      const mensaje = (e as CustomEvent).detail?.mensaje;
      setEstado((prev) => ({ tipo: 'suspendido', tenant: prev.tipo === 'ok' ? prev.tenant : undefined, mensaje }));
    };
    window.addEventListener(EVENTO_SUSPENDIDO, onSuspendido);
    return () => window.removeEventListener(EVENTO_SUSPENDIDO, onSuspendido);
  }, []);

  const value = useMemo<TenantContextValue | null>(() => {
    if (estado.tipo !== 'ok') return null;
    const t = estado.tenant;
    return {
      tenant: t,
      modulo: (m) => !!t.modulos?.[m],
      nombreMarca: t.branding?.nombre || t.nombre || 'AutoAtento',
    };
  }, [estado]);

  if (estado.tipo === 'cargando') return <Pantalla><div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-500 animate-spin mx-auto" /></Pantalla>;
  if (estado.tipo === 'sin-tenant') return <Pantalla titulo="Cuenta no encontrada" texto={estado.detalle} />;
  if (estado.tipo === 'error') return <Pantalla titulo="Sin conexión" texto={estado.detalle} reintentar />;
  if (estado.tipo === 'suspendido') {
    return (
      <Pantalla tenant={estado.tenant} titulo="Cuenta suspendida"
        texto={estado.mensaje || 'Esta cuenta está suspendida. Contactá a AutoAtento para reactivarla.'} />
    );
  }
  return (
    <Ctx.Provider value={value}>
      <BannerSoporte />
      {children}
    </Ctx.Provider>
  );
}

/** Aviso fijo cuando se entró como owner desde el panel de AutoAtento. */
function BannerSoporte() {
  const [imp, setImp] = useState<string | null>(null);
  useEffect(() => {
    const leer = () => {
      try {
        const token = localStorage.getItem('token');
        const payload = token ? JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) : null;
        setImp(payload?.imp?.email || null);
      } catch {
        setImp(null);
      }
    };
    leer();
    const t = setInterval(leer, 3000);
    return () => clearInterval(t);
  }, []);
  if (!imp) return null;
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9999] bg-amber-500 text-white text-xs sm:text-sm px-4 py-2 rounded-full shadow-lg">
      Modo soporte: entraste como owner desde AutoAtento ({imp})
    </div>
  );
}

function Pantalla({ titulo, texto, tenant, reintentar, children }: {
  titulo?: string; texto?: string; tenant?: TenantInfo; reintentar?: boolean; children?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        {tenant && <div className="flex justify-center mb-4"><BrandMark tenant={tenant} size={48} /></div>}
        {children}
        {titulo && <h1 className="text-xl font-bold text-slate-800 mb-2">{titulo}</h1>}
        {texto && <p className="text-slate-600 text-sm">{texto}</p>}
        {reintentar && (
          <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm">
            Reintentar
          </button>
        )}
        <PoweredBy className="mt-8" />
      </div>
    </div>
  );
}
