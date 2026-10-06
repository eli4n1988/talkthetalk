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
          ברירת המחדל היא שיחה קולית: הרופא או הרופאה פותחים בקול — גבר או אישה,
          ותיק או צעיר בקריירה — ואז המיקרופון נפתח אליכם. בזמן שאתם מדברים
          בעברית, המערכת מזהה אמפתיה, נתון, שותפות, הוראה וביקורת.
        </p>
        <p
          className="stagger-in mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
          style={{ animationDelay: "200ms" }}
        >
          הקול עובד ב-Chrome או Edge עם מיקרופון. בלי מיקרופון אפשר להקליד תור
          בעברית. בניהול אפשר לערוך כל תרחיש ולהוסיף שיחות חדשות למכשיר זה.
        </p>
      </section>
      <ScenarioPicker />
    </div>
  );
}
