"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface AppUi {
  addMeetingsOpen: boolean;
  setAddMeetingsOpen: (open: boolean) => void;
}

const AppUiContext = createContext<AppUi | null>(null);

/** UI-state die zijbalk en pagina delen (de modal "Andere overlegmomenten"). */
export function AppUiProvider({ children }: { children: ReactNode }) {
  const [addMeetingsOpen, setAddMeetingsOpen] = useState(false);
  return <AppUiContext.Provider value={{ addMeetingsOpen, setAddMeetingsOpen }}>{children}</AppUiContext.Provider>;
}

export function useAppUi(): AppUi {
  const ctx = useContext(AppUiContext);
  if (!ctx) throw new Error("useAppUi buiten AppUiProvider");
  return ctx;
}
