"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { CatalogProvider } from "@/components/catalog-provider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <CatalogProvider>
        {children}
        <Toaster position="bottom-center" dir="rtl" richColors closeButton />
      </CatalogProvider>
    </ThemeProvider>
  );
}
