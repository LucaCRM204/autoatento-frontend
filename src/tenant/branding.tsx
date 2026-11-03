/** Piezas de branding: logo del tenant (o iniciales) y "Powered by AutoAtento". */
import type { TenantInfo } from './store';

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || 'A') + (partes[1]?.[0] || '')).toUpperCase();
}

export function BrandMark({ tenant, size = 40 }: { tenant: TenantInfo; size?: number }) {
  const nombre = tenant.branding?.nombre || tenant.nombre || 'AutoAtento';
  if (tenant.branding?.logo_url) {
    return (
      <img src={tenant.branding.logo_url} alt={nombre} style={{ height: size, maxWidth: size * 3 }}
        className="object-contain rounded" />
    );
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: 'var(--color-primario)', fontSize: size * 0.4 }}
      aria-label={nombre}
    >
      {iniciales(nombre)}
    </div>
  );
}

export function PoweredBy({ className = '', oscuro = false }: { className?: string; oscuro?: boolean }) {
  return (
    <p className={`text-[11px] tracking-wide ${oscuro ? 'text-slate-500' : 'text-slate-400'} ${className}`}>
      Powered by <span className="font-semibold">AutoAtento</span>
    </p>
  );
}
