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
import {
  parseManagerProfile,
  PROFILE_STORAGE_KEY,
  serializeManagerProfile,
  type ManagerProfile,
} from "@/lib/profile";

type ProfileContextValue = {
  ready: boolean;
  profile: ManagerProfile | null;
  saveProfile: (profile: ManagerProfile) => void;
  clearProfile: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ManagerProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = parseManagerProfile(
      window.localStorage.getItem(PROFILE_STORAGE_KEY),
    );
    queueMicrotask(() => {
      setProfile(next);
      setReady(true);
    });
  }, []);

  const saveProfile = useCallback((next: ManagerProfile) => {
    setProfile(next);
    window.localStorage.setItem(
      PROFILE_STORAGE_KEY,
      serializeManagerProfile(next),
    );
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ ready, profile, saveProfile, clearProfile }),
    [ready, profile, saveProfile, clearProfile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return context;
}
