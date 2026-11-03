// src/App.tsx
// Un solo frontend para todos los clientes:
//   /superadmin  -> panel de AutoAtento (sin tenant)
//   resto        -> CRM del tenant que corresponde al dominio (TenantProvider)
import { lazy, Suspense } from "react";
import CRM from "./CRM";
import { TenantProvider } from "./tenant/TenantContext";

const SuperAdminApp = lazy(() => import("./superadmin/SuperAdminApp"));

export default function App() {
  if (window.location.pathname.startsWith("/superadmin")) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
        <SuperAdminApp />
      </Suspense>
    );
  }
  return (
    <TenantProvider>
      <CRM />
    </TenantProvider>
  );
}
