"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          fontFamily: "Arial Hebrew, Arial, sans-serif",
          background: "#f1f9fe",
          color: "#24283f",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#083f92", fontWeight: 700, fontSize: "1.5rem" }}>
          TalktheTalk
        </p>
        <h1 style={{ fontSize: "1.25rem" }}>לא הצלחנו לטעון את המסך</h1>
        <p style={{ maxWidth: "28rem", lineHeight: 1.6 }}>
          רעננו את הדף. אם זה חוזר, פתחו את הקישור בלשונית חדשה.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "1rem",
            minHeight: "44px",
            padding: "0.75rem 1.25rem",
            border: 0,
            borderRadius: "0.5rem",
            background: "#083f92",
            color: "#fff",
            fontSize: "1rem",
          }}
        >
          ניסיון נוסף
        </button>
      </body>
    </html>
  );
}
