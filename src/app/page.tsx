import { AiStatusBadge } from "@/components/ai-status-badge";
import { ScenarioPicker } from "@/components/scenario-picker";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="hero-banner relative overflow-hidden rounded-3xl border border-border px-6 py-10 sm:px-10 sm:py-12">
        <p className="stagger-in text-sm font-medium text-primary">
          אימון קולי למנהלי מרפאות
        </p>
        <h1
          className="stagger-in mt-3 max-w-3xl text-3xl font-semibold leading-snug text-balance sm:text-[2.15rem]"
          style={{ animationDelay: "80ms" }}
        >
          נכנסים לחדר, שומעים את הרופא, ומדברים. הניתוח רץ עליכם בזמן אמת.
        </h1>
        <p
          className="stagger-in mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-base"
          style={{ animationDelay: "140ms" }}
        >
          הרופא עונה למה שאמרתם ממש עכשיו — לא ממשפטים שמורים. המיקרופון נפתח
          רק כשלוחצים «לחצו כדי לדבר», כדי שלא ייכנסו רעשי רקע. בדרך כלל השיחה
          נפתחת בנימוסין קצרים. אם התרחיש מסומן כפגישה ראשונה, קודם מציגים את
          עצמכם, ורק אז עוברים לנושא.
        </p>
        <p
          className="stagger-in mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
          style={{ animationDelay: "200ms" }}
        >
          הקול המומלץ הוא Gemini TTS בעברית ישראלית. בלי מפתח המערכת נופלת
          למנוע מקומי ולקול הדפדפן. בניהול אפשר לסמן פגישה ראשונה לכל תרחיש.
        </p>
        <div className="stagger-in mt-4" style={{ animationDelay: "260ms" }}>
          <AiStatusBadge />
        </div>
      </section>
      <ScenarioPicker />
    </div>
  );
}
