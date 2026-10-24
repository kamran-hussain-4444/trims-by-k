import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { Wordmark } from "@/components/logo";
import { logout } from "../actions";

export const metadata: Metadata = { title: "Admin | Trims by K", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-16">
      <header className="sticky top-0 z-20 -mx-4 flex h-14 items-center gap-4 border-b border-line bg-ink/90 px-4 backdrop-blur">
        <Link href="/admin">
          <Wordmark className="text-xl" />
        </Link>
        <nav className="flex flex-1 gap-4 text-sm">
          <Link href="/admin" className="text-muted hover:text-fg">
            Bookings
          </Link>
          <Link href="/admin/availability" className="text-muted hover:text-fg">
            Availability
          </Link>
        </nav>
        <form action={logout}>
          <button aria-label="Log out" className="rounded-full p-2 text-muted hover:bg-surface hover:text-fg">
            <LogOut className="size-4" />
          </button>
        </form>
      </header>
      <div className="pt-6">{children}</div>
    </div>
  );
}
