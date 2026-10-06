import type { VoiceGender } from "@/lib/types";

export const PROFILE_STORAGE_KEY = "talkthetalk.manager.v1";

export const MACCABI_DISTRICTS = [
  { id: "north", label: "צפון" },
  { id: "south", label: "דרום" },
  { id: "yam-shfela", label: "ים שפלה" },
  { id: "center", label: "מרכז" },
  { id: "sharon", label: "שרון" },
] as const;

export type MaccabiDistrictId = (typeof MACCABI_DISTRICTS)[number]["id"];

export type ManagerProfile = {
  name: string;
  gender: VoiceGender;
  district: MaccabiDistrictId;
};

const DISTRICT_IDS = new Set<string>(
  MACCABI_DISTRICTS.map((district) => district.id),
);

export function districtLabel(id: MaccabiDistrictId): string {
  return MACCABI_DISTRICTS.find((district) => district.id === id)?.label ?? id;
}

export function serializeManagerProfile(profile: ManagerProfile): string {
  return JSON.stringify({
    name: profile.name.trim().slice(0, 80),
    gender: profile.gender,
    district: profile.district,
  });
}

export function parseManagerProfile(raw: unknown): ManagerProfile | null {
  if (raw == null || raw === "") return null;
  try {
    const parsed =
      typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const gender =
      record.gender === "male" || record.gender === "female"
        ? record.gender
        : null;
    const district =
      typeof record.district === "string" && DISTRICT_IDS.has(record.district)
        ? (record.district as MaccabiDistrictId)
        : null;
    if (!name || name.length < 2 || !gender || !district) return null;
    return { name: name.slice(0, 80), gender, district };
  } catch {
    return null;
  }
}

export function managerRoleLabel(gender: VoiceGender): string {
  return gender === "female" ? "מנהלת רפואית" : "מנהל רפואי";
}

export function managerYou(gender: VoiceGender): "אתה" | "את" {
  return gender === "female" ? "את" : "אתה";
}

export function managerStanding(gender: VoiceGender): "עומד" | "עומדת" {
  return gender === "female" ? "עומדת" : "עומד";
}

export function managerSpeak(gender: VoiceGender): "דבר" | "דברי" {
  return gender === "female" ? "דברי" : "דבר";
}

export function managerTell(gender: VoiceGender): "תגיד" | "תגידי" {
  return gender === "female" ? "תגידי" : "תגיד";
}

export function managerCome(gender: VoiceGender): "בוא" | "בואי" {
  return gender === "female" ? "בואי" : "בוא";
}

export function partnerNoun(gender: VoiceGender): string {
  return gender === "female" ? "רופאה" : "רופא";
}

export function partnerNounPlural(gender: VoiceGender): string {
  return gender === "female" ? "רופאות" : "רופאים";
}
