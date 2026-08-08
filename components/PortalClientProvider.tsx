"use client";

import { PortalProvider } from "@portalsdk/react";
import { portalClient } from "@/lib/portal";

export function PortalClientProvider({ children }: { children: React.ReactNode }) {
  return <PortalProvider client={portalClient}>{children}</PortalProvider>;
}
