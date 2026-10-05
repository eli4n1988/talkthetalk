"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">משהו השתבש באימון</h1>
      <p className="max-w-md text-muted-foreground">
        נסו לרענן את חדר השיחה, או חזרו לבחירת תרחיש.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>ניסיון נוסף</Button>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          לכל התרחישים
        </Link>
      </div>
    </div>
  );
}
