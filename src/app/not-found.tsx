import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">התרחיש לא נמצא</h1>
      <p className="max-w-md text-muted-foreground">
        ייתכן שהקישור ישן. חזרו לרשימת התרחישים ובחרו שיחת אימון פעילה.
      </p>
      <Link href="/" className={cn(buttonVariants())}>
        לכל התרחישים
      </Link>
    </div>
  );
}
