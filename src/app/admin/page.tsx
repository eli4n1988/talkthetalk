import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin-panel";

export const metadata: Metadata = {
  title: "ניהול תרחישים | TalktheTalk",
  description:
    "עריכת תרחישי אימון, החלפת דמויות קול והוספת שיחות חדשות למכשיר זה.",
};

export default function AdminPage() {
  return <AdminPanel />;
}
