/** Cliente del panel superadmin: /api/superadmin/*, con su propio token (no el de un CRM). */
import axios, { AxiosError } from 'axios';
import { API_BASE } from '../tenant/store';

const TOKEN_KEY = 'aa_superadmin_token';
export const EVENTO_SALIR = 'autoatento:superadmin-salir';

export const sa = axios.create({ baseURL: `${API_BASE}/superadmin`, timeout: 120000 });

sa.interceptors.request.use((config) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

sa.interceptors.response.use(
  (r) => r,
  (e: AxiosError) => {
    if (e.response?.status === 401 && !String(e.config?.url).includes('/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(EVENTO_SALIR));
    }
    return Promise.reject(e);
  },
);

export const sesion = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Mensaje de error legible de una respuesta del backend. */
export function errorDe(e: unknown): string {
  const ax = e as AxiosError<{ error?: string }>;
  return ax?.response?.data?.error || ax?.message || 'Error inesperado';
}

// ---------- tipos ----------
export const MODULOS: { key: string; nombre: string; ayuda: string }[] = [
  { key: 'agente_ia', nombre: 'Agente IA', ayuda: 'Bandeja del agente y seguimiento automático' },
  { key: 'whatsapp_bot', nombre: 'Bot de WhatsApp', ayuda: 'Admin del bot y webhook de leads del bot' },
  { key: 'chat_whatsapp', nombre: 'Chat de WhatsApp', ayuda: 'Mini chat por lead dentro del CRM' },
  { key: 'presupuestos', nombre: 'Presupuestos', ayuda: 'Plantillas y presupuesto en PDF' },
  { key: 'metas', nombre: 'Metas', ayuda: 'Gestión de metas por vendedor' },
  { key: 'ranking', nombre: 'Ranking', ayuda: 'Ranking de vendedores' },
  { key: 'analytics', nombre: 'Análisis diario', ayuda: 'Reportes para dirección' },
  { key: 'asignar_tareas', nombre: 'Asignar tareas', ayuda: 'Tareas de supervisores a vendedores' },
  { key: 'multi_marca', nombre: 'Multi marca', ayuda: 'Varias marcas en el mismo CRM' },
  { key: 'motos', nombre: 'Motos', ayuda: 'Concesionarias de motos' },
  { key: 'scoring', nombre: 'Scoring', ayuda: 'Puntaje de leads' },
];

export const SECRETOS: { key: string; nombre: string; ayuda: string }[] = [
  { key: 'wa_bot_key', nombre: 'Key del bot de WhatsApp', ayuda: 'AGENT_BOT_KEY del .env del bot' },
  { key: 'openai_api_key', nombre: 'API key de OpenAI', ayuda: 'Opcional: si falta usa la global' },
  { key: 'anthropic_api_key', nombre: 'API key de Anthropic', ayuda: 'Opcional' },
  { key: 'agent_mcp_key', nombre: 'Key del MCP', ayuda: 'Para conectar agentes externos a /api/t/<slug>/mcp' },
];

export interface Tenant {
  id: number;
  slug: string;
  nombre: string;
  estado: 'activo' | 'suspendido' | 'baja';
  plan: 'esencial' | 'pro' | 'arm';
  dominios: string[];
  modulos: Record<string, boolean>;
  branding: { nombre?: string; logo_url?: string; favicon_url?: string; color_primario?: string };
  config: Record<string, any>;
  secretos: Record<string, boolean | string[]>;
  base: string;
  created_at: string;
  updated_at: string;
  uso_mes?: { usuarios_activos: number; leads_ingresados: number } | null;
}

export interface EventoAuditoria {
  id: number;
  accion: string;
  actor_email: string | null;
  tenant_id: number | null;
  slug: string | null;
  detalle: any;
  ip: string | null;
  created_at: string;
}
