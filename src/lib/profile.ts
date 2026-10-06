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

export const DISTRICT_CITIES: Record<MaccabiDistrictId, string[]> = {
  north: ["חיפה", "נהריה", "עפולה", "כרמיאל"],
  south: ["באר שבע", "אשדוד", "אשקלון", "דימונה"],
  "yam-shfela": ["ראשון לציון", "רחובות", "חולון", "יבנה"],
  center: ["רמת גן", "פתח תקווה", "גבעתיים", "מודיעין"],
  sharon: ["כפר סבא", "רעננה", "הרצליה", "נתניה"],
};

const PERSONA_CITY_SLOT: Record<string, number> = {
  mizrahi: 0,
  shapira: 1,
  cohen: 2,
  "ben-david": 3,
};

export function clinicCityForPersona(
  personaId: string,
  district: MaccabiDistrictId,
): string {
  const cities = DISTRICT_CITIES[district];
  const slot = PERSONA_CITY_SLOT[personaId];
  const index =
    slot != null ? slot % cities.length : hashString(personaId) % cities.length;
  return cities[index] ?? cities[0];
}

export function clinicForDistrict(
  persona: { id: string; doctorType: "family" | "pediatrician" },
  district: MaccabiDistrictId,
): string {
  const city = clinicCityForPersona(persona.id, district);
  return persona.doctorType === "pediatrician"
    ? `מרפאת ילדים ${city}`
    : `מרפאת ${city}`;
}

export function personaInDistrict<T extends { id: string; doctorType: "family" | "pediatrician"; clinic: string }>(
  persona: T,
  district: MaccabiDistrictId,
): T {
  return { ...persona, clinic: clinicForDistrict(persona, district) };
}

function hashString(value: string): number {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    total += value.charCodeAt(index) * (index + 1);
  }
  return total;
}
