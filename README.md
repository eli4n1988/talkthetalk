# TalktheTalk

סימולטור שיחות בעברית למנהלות ומנהלי מרפאות ב**מכבי שירותי בריאות**. נכנסים לחדר אימון, **שומעים את הרופא**, מדברים בעברית, והרופא עונה למה שנאמר לו בפועל.

## מה יש כאן

- שיחה קולית כברירת מחדל, עם ניתוח דיבור חי
- תשובות אינטראקטיביות דרך Gemini / ChatGPT / Claude (לפי מפתח API)
- קול עברי טבעי: **Gemini TTS** (ברירת המחדל — העברית הכי פחות רובוטית מבין השלושה). בלי Gemini: `gpt-4o-mini-tts`. בלי מפתח: קול הדפדפן
- נימוסין קצרים בתחילת שיחה רגילה; **פגישה ראשונה** (סימון בניהול) מתחילה בהיכרות לפני הנושא
- ארבע דמויות קול: גבר/אישה × ותיק/צעיר
- לוח ניהול (`/admin`) לעריכת תרחישים, כולל דגל פגישה ראשונה
- נתיב מקומי אם אין מפתח מודל

## הרצה מקומית

```bash
npm install
cp .env.example .env.local
npm run dev
```

השרת עולה על [http://127.0.0.1:43127](http://127.0.0.1:43127).

לחוויית מיקרופון מלאה מומלץ Chrome או Edge.

## איך מוסיפים Gemini ו-OpenAI — שלב אחרי שלב

בלי מפתח האפליקציה עובדת. עם מפתח הרופא **עונה למה שנאמר**, וההשמעה הופכת לקול עצבי במקום קול הדפדפן.

**מומלץ:** Gemini בלבד (שיחה + קול עברי). OpenAI הוא גיבוי. אפשר לשים את שניהם.

אל תדביקו מפתחות בצ'אט ואל תעלו את `.env.local` ל-Git. הקובץ כבר ב-`.gitignore`.

### 1. יוצרים קובץ סביבה

בתיקיית הפרויקט:

```bash
cp .env.example .env.local
```

פותחים את `.env.local` בעורך.

### 2. מפתח Gemini (מומלץ)

1. נכנסים ל-[Google AI Studio — API keys](https://aistudio.google.com/apikey) עם חשבון Google.
2. לוחצים **Create API key** (או **Get API key**).
3. בוחרים פרויקט Google Cloud קיים, או יוצרים פרויקט חדש כשהמסך מבקש.
4. מעתיקים את המפתח (מתחיל בדרך כלל ב-`AIza`).
5. מדביקים ב-`.env.local`:

```bash
GEMINI_API_KEY=AIza...your-key...
```

אם כבר יש מפתח מ-Vertex / Google Cloud, אפשר במקום זה `GOOGLE_API_KEY` או `GOOGLE_GENERATIVE_AI_API_KEY` — האפליקציה קוראת את שלושתם.

Gemini מספיק לבד: השיחה רצה על **Gemini 2.5 Flash**, וההשמעה על **Gemini TTS** בעברית (`he-IL`, קולות Charon / Kore / Puck / Aoede לפי מין וותק הרופא).

אם המפתח חדש ולא עובד, ב-[Google AI Studio](https://aistudio.google.com/) בודקים שהמודלים `gemini-2.5-flash` ו-TTS זמינים לפרויקט, ושיש מכסה פעילה.

### 3. מפתח OpenAI (גיבוי)

1. נכנסים ל-[OpenAI API keys](https://platform.openai.com/api-keys) (זה **platform.openai.com**, לא ChatGPT הרגיל).
2. מתחברים, ובמידת הצורך ממלאים [Billing](https://platform.openai.com/settings/organization/billing) — בלי קרדיט הקריאות יידחו.
3. לוחצים **Create new secret key**, נותנים שם (למשל `talkthetalk-local`), ויוצרים.
4. מעתיקים מיד — המפתח מוצג פעם אחת בלבד (מתחיל ב-`sk-`).
5. מדביקים ב-`.env.local`:

```bash
OPENAI_API_KEY=sk-...your-key...
```

עם OpenAI בלבד: השיחה על **GPT-4o**, ההשמעה על **gpt-4o-mini-tts**. עברית עובדת, אבל הקול פחות ישראלי מ-Gemini.

### 4. שומרים ומפעילים מחדש

Next.js קורא משתני סביבה **רק בעלייה**. אחרי שמירת `.env.local`:

```bash
# עצירה (Ctrl+C) ואז:
npm run dev
```

אם רצים בפרודקשן מקומי (`npm run build` ואז `npm run start`) — בונים מחדש אחרי שינוי מפתח.

`.env.local` צריך להיראות כך (בלי מרכאות, בלי רווחים סביב `=`):

```bash
GEMINI_API_KEY=AIza...
OPENAI_API_KEY=sk-...
```

שורה שמתחילה ב-`#` היא הערה. אפשר להשאיר מפתח אחד ריק.

### 5. בודקים שהמפתח נטען

במסך הבית, מתחת לכותרת, אמורה להופיע שורה:

| מה שמופיע | משמעות |
| --- | --- |
| השיחה: Gemini 2.5 Flash. השמע: קול Gemini העברי. | Gemini פעיל — זה המצב המומלץ |
| השיחה: ChatGPT (GPT-4o). השמע: קול GPT-4o mini TTS. | רק OpenAI פעיל |
| השיחה: מנוע מקומי. השמע: קול דפדפן | אין מפתח, או שהשרת לא הופעל מחדש |

אפשר גם:

```bash
curl http://127.0.0.1:43127/api/ai-status
```

צפוי: `"chat":"gemini","tts":"gemini"` או `"chat":"openai","tts":"openai"`. אם עדיין `"local"` / `"browser"` — המפתח לא נקרא (קובץ לא נשמר, שם משתנה שגוי, או שרת ישן).

אחר כך נכנסים לתרחיש: הרופא אמור לענות למילים שלכם, לא רק לשורה קבועה.

### 6. פריסה (Vercel / שרת)

`.env.local` נשאר במחשב. בפרודקשן מגדירים את **אותם שמות** בפאנל הסביבה:

- `GEMINI_API_KEY`
- `OPENAI_API_KEY` (אופציונלי)

ב-Vercel: Project → Settings → Environment Variables → Add. אחרי שמירה עושים Redeploy.

### כפיית ספק (לא חובה)

אם שני המפתחות קיימים, ברירת המחדל היא Gemini. לכפות OpenAI:

```bash
TALKTHETALK_CHAT_PROVIDER=openai
TALKTHETALK_TTS_PROVIDER=openai
```

### Claude (אופציונלי, שיחה בלבד)

מפתח מ-[Anthropic Console](https://console.anthropic.com/settings/keys) בשם `ANTHROPIC_API_KEY`. אין ל-Claude TTS באפליקציה הזו — הקול יישאר Gemini, OpenAI, או הדפדפן.

## סקריפטים

```bash
npm run lint
npm run build
```
