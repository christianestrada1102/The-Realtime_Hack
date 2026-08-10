"use client";

import { createContext, useContext, useState } from "react";
import { translations, Lang, T } from "./i18n";

type LangContextValue = {
  lang: Lang;
  t: T;
  toggle: () => void;
};

const LangContext = createContext<LangContextValue>({
  lang: "es",
  t: translations["es"],
  toggle: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");
  const toggle = () => setLang((l) => (l === "es" ? "en" : "es"));
  return (
    <LangContext.Provider value={{ lang, t: translations[lang], toggle }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
