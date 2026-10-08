"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PERSONAS } from "@/lib/content";
import {
  CATALOG_STORAGE_KEY,
  emptyCatalogPayload,
  mergeCatalog,
  parseCatalogPayload,
  removeScenarioFromPayload,
  upsertScenarioInPayload,
  type CatalogPayload,
} from "@/lib/catalog";
import type { Persona, Scenario } from "@/lib/types";
import {
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
} from "@/lib/storage";

type CatalogContextValue = {
  ready: boolean;
  scenarios: Scenario[];
  personas: Persona[];
  upsertScenario: (scenario: Scenario) => void;
  removeScenario: (id: string) => void;
  resetCatalog: () => void;
  getScenario: (id: string) => Scenario | undefined;
  getPersona: (id: string) => Persona | undefined;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<CatalogPayload>(emptyCatalogPayload);
  const [ready, setReady] = useState(true);

  useEffect(() => {
    // Load device-local overrides after hydration so SSR markup stays stable.
    const next =
      parseCatalogPayload(readLocalStorage(CATALOG_STORAGE_KEY)) ??
      emptyCatalogPayload();
    queueMicrotask(() => {
      setPayload(next);
      setReady(true);
    });
  }, []);

  const persist = useCallback((next: CatalogPayload) => {
    setPayload(next);
    writeLocalStorage(CATALOG_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const scenarios = useMemo(() => mergeCatalog(payload), [payload]);

  const upsertScenario = useCallback(
    (scenario: Scenario) => {
      persist(upsertScenarioInPayload(payload, scenario));
    },
    [payload, persist],
  );

  const removeScenario = useCallback(
    (id: string) => {
      persist(removeScenarioFromPayload(payload, id));
    },
    [payload, persist],
  );

  const resetCatalog = useCallback(() => {
    removeLocalStorage(CATALOG_STORAGE_KEY);
    setPayload(emptyCatalogPayload());
  }, []);

  const getScenario = useCallback(
    (id: string) => scenarios.find((scenario) => scenario.id === id),
    [scenarios],
  );

  const getPersona = useCallback(
    (id: string) => PERSONAS.find((persona) => persona.id === id),
    [],
  );

  const value = useMemo(
    () => ({
      ready,
      scenarios,
      personas: PERSONAS,
      upsertScenario,
      removeScenario,
      resetCatalog,
      getScenario,
      getPersona,
    }),
    [
      ready,
      scenarios,
      upsertScenario,
      removeScenario,
      resetCatalog,
      getScenario,
      getPersona,
    ],
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error("useCatalog must be used within CatalogProvider");
  }
  return context;
}
