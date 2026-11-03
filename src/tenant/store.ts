/**
 * Tenant actual, accesible fuera de React (axios, fetch, socket).
 * Lo completa TenantProvider al cargar la app con GET /api/public/tenant.
 */

export type Modulo =
  | 'agente_ia' | 'whatsapp_bot' | 'chat_whatsapp' | 'presupuestos' | 'metas'
  | 'ranking' | 'analytics' | 'asignar_tareas' | 'multi_marca' | 'motos' | 'scoring';

export interface TenantInfo {
  slug: string;
  nombre: string;
  estado: 'activo' | 'suspendido' | 'baja';
  branding: {
    nombre: string;
    logo_url?: string;
    favicon_url?: string;
    color_primario?: string;
  };
  modulos: Record<Modulo, boolean>;
  config: {
    timezone?: string;
    pais?: string;
    prefijo_telefonico?: string;
    moneda?: string;
    wa_bot_url?: string;
    marcas?: string[];
    marca_default?: string;
  };
}

/** URL del backend con /api al final (VITE_API_URL). */
export const API_BASE: string = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

/** Raíz del backend (para Socket.io, que no va bajo /api). */
export const BACKEND_ROOT: string = API_BASE.replace(/\/api$/, '');

export const DEFAULT_COLOR = '#2563eb';

let actual: TenantInfo | null = null;

export function setTenant(t: TenantInfo | null) {
  actual = t;
}

export function getTenant(): TenantInfo | null {
  return actual;
}

export function getTenantSlug(): string | null {
  return actual?.slug ?? null;
}

/** Headers para fetch directos: token + tenant. */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra };
  const token = localStorage.getItem('token');
  if (token) h.Authorization = `Bearer ${token}`;
  const slug = getTenantSlug();
  if (slug) h['X-Tenant'] = slug;
  return h;
}

/** URL completa de una ruta del backend: apiUrl('/calls') -> https://.../api/calls */
export function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Avisos globales: la app escucha estos eventos (ver TenantContext). */
export const EVENTO_SUSPENDIDO = 'autoatento:tenant-suspendido';
export function avisarSuspendido(mensaje?: string) {
  window.dispatchEvent(new CustomEvent(EVENTO_SUSPENDIDO, { detail: { mensaje } }));
}
