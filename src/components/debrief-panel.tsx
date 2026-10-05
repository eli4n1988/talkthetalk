import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DebriefNotes } from "@/lib/types";

export function DebriefPanel({ notes }: { notes: DebriefNotes }) {
  return (
    <Card className="bg-card">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">סיכום אחרי השיחה</CardTitle>
          {notes.reachedSoftening ? (
            <Badge>הרופא ריכך עמדה</Badge>
          ) : (
            <Badge variant="outline">עדיין בעמדת התנגדות</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        <NotesColumn
          title="מה עבד"
          empty="עוד אין מספיק תורים כדי לציין הצלחה ברורה."
          items={notes.wentWell}
        />
        <NotesColumn
          title="מה לנסות בפעם הבאה"
          empty="נסו שוב את אותו תרחיש עם שיקוף קצר לפני הבקשה."
          items={notes.tryNext}
        />
      </CardContent>
    </Card>
  );
}

function NotesColumn({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-lg bg-muted/60 px-3 py-2 text-sm leading-6"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
