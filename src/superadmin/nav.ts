/** Navegación del panel (pushState bajo /superadmin). */
export function ir(path: string) {
  window.history.pushState(null, '', `/superadmin${path}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}
