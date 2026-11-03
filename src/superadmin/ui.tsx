/** Componentes chicos del panel superadmin (Tailwind, pensados para celular primero). */
import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

export function Button({ variante = 'primario', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'secundario' | 'peligro' | 'fantasma' }) {
  const estilos = {
    primario: 'bg-slate-900 text-white hover:bg-slate-700',
    secundario: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50',
    peligro: 'bg-red-600 text-white hover:bg-red-700',
    fantasma: 'text-slate-600 hover:bg-slate-100',
  }[variante];
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${estilos} ${className}`}
    />
  );
}

export function Field({ label, ayuda, children }: { label: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
      {ayuda && <span className="block text-xs text-slate-500 mt-1">{ayuda}</span>}
    </label>
  );
}

const base = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400';
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${base} ${p.className || ''}`} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`${base} ${p.className || ''}`} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={`${base} font-mono ${p.className || ''}`} />;

export function Card({ titulo, accion, children, className = '' }: { titulo?: ReactNode; accion?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {(titulo || accion) && (
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{titulo}</h3>
          {accion}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function EstadoBadge({ estado }: { estado: string }) {
  const c: Record<string, string> = {
    activo: 'bg-emerald-100 text-emerald-800',
    suspendido: 'bg-amber-100 text-amber-800',
    baja: 'bg-slate-200 text-slate-600',
  };
  return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${c[estado] || 'bg-slate-100'}`}>{estado}</span>;
}

export function Aviso({ tipo = 'info', children }: { tipo?: 'info' | 'error' | 'ok'; children: ReactNode }) {
  const c = { info: 'bg-sky-50 text-sky-800 border-sky-200', error: 'bg-red-50 text-red-800 border-red-200', ok: 'bg-emerald-50 text-emerald-800 border-emerald-200' }[tipo];
  return <div className={`rounded-lg border px-3 py-2 text-sm ${c}`}>{children}</div>;
}

/** Toast simple: toast('Guardado') desde cualquier lado. */
const EVENTO_TOAST = 'autoatento:toast';
export function toast(mensaje: string, tipo: 'ok' | 'error' = 'ok') {
  window.dispatchEvent(new CustomEvent(EVENTO_TOAST, { detail: { mensaje, tipo } }));
}
export function Toasts() {
  const [lista, setLista] = useState<{ id: number; mensaje: string; tipo: string }[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const { mensaje, tipo } = (e as CustomEvent).detail;
      const id = Date.now() + Math.random();
      setLista((l) => [...l, { id, mensaje, tipo }]);
      setTimeout(() => setLista((l) => l.filter((x) => x.id !== id)), 4000);
    };
    window.addEventListener(EVENTO_TOAST, on);
    return () => window.removeEventListener(EVENTO_TOAST, on);
  }, []);
  return (
    <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:w-96 z-50 space-y-2">
      {lista.map((t) => (
        <div key={t.id} className={`rounded-lg px-4 py-3 text-sm shadow-lg text-white ${t.tipo === 'error' ? 'bg-red-600' : 'bg-slate-900'}`}>{t.mensaje}</div>
      ))}
    </div>
  );
}

/** Confirmación modal con texto opcional (motivo) y, si se pide, escribir el slug para confirmar. */
export function Confirmar({ abierto, titulo, texto, confirmarTexto = 'Confirmar', peligro, pedirMotivo, escribir, onConfirmar, onCancelar }: {
  abierto: boolean; titulo: string; texto: ReactNode; confirmarTexto?: string; peligro?: boolean;
  pedirMotivo?: boolean; escribir?: string; onConfirmar: (motivo: string) => void; onCancelar: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [tipeado, setTipeado] = useState('');
  useEffect(() => { if (abierto) { setMotivo(''); setTipeado(''); } }, [abierto]);
  if (!abierto) return null;
  const bloqueado = !!escribir && tipeado.trim() !== escribir;
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onCancelar}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900">{titulo}</h3>
        <div className="text-sm text-slate-600">{texto}</div>
        {pedirMotivo && <Field label="Motivo (queda en la auditoría)"><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Field>}
        {escribir && <Field label={`Escribí "${escribir}" para confirmar`}><Input value={tipeado} onChange={(e) => setTipeado(e.target.value)} /></Field>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variante="secundario" onClick={onCancelar}>Cancelar</Button>
          <Button variante={peligro ? 'peligro' : 'primario'} disabled={bloqueado} onClick={() => onConfirmar(motivo)}>{confirmarTexto}</Button>
        </div>
      </div>
    </div>
  );
}

export const fecha = (s?: string | null) => (s ? new Date(s).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

/** "a, b\nc" -> ['a','b','c'] */
export const lista = (s: string) => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
