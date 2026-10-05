import { ScenarioPicker } from "@/components/scenario-picker";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium text-primary">אימון למנהלי מרפאות</p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          שיחה קשה עם רופא ותיק? כאן מתרגלים אותה בעברית, בקול.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          במכבי, מנהלות ומנהלים מדריכים רופאי משפחה ורופאי ילדים — לעיתים מול
          התנגדות, עומס או ותק של עשרות שנים. בחרו תרחיש, דברו בעברית, והרופא
          המתוכנת יישאר בדמות: יתנגד, יטה, ורק אז אולי יתרכך.
        </p>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          הקול עובד ב-Chrome או Edge עם מיקרופון. בלי מיקרופון אפשר להקליד תור
          בעברית או לבחור משפט אימון מוכן.
        </p>
      </section>
      <ScenarioPicker />
    </div>
  );
}
