import { createContext, useContext } from "react";

const TenantContext = createContext<string | null>(null);

export function TenantProvider({ tenant, children }: { tenant: string; children: any }) {
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}

export function getTenant() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tenant");
}
