import type { EventoAuditoria } from './api';
import { fecha } from './ui';

export default function ListaAuditoria({ eventos }: { eventos: EventoAuditoria[] }) {
  if (!eventos.length) return <p className="text-sm text-slate-500">Sin eventos.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {eventos.map((e) => (
        <li key={e.id} className="py-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-slate-900">{e.accion.replace(/_/g, ' ')}</span>
            {e.slug && <span className="text-xs bg-slate-100 rounded px-1.5 py-0.5">{e.slug}</span>}
            <span className="text-xs text-slate-500 ml-auto">{fecha(e.created_at)}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{e.actor_email || 'sistema'}{e.ip ? ` · ${e.ip}` : ''}</div>
          {e.detalle && <div className="text-xs text-slate-600 mt-1 break-all">{resumenDetalle(e.detalle)}</div>}
        </li>
      ))}
    </ul>
  );
}

function resumenDetalle(d: any): string {
  return Object.entries(d)
    .filter(([k, v]) => k !== 'slug' && v !== null && v !== undefined && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' · ');
}

