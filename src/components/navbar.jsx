
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, ClipboardList, Mail,
  Settings, School, LogOut, GraduationCap
} from "lucide-react";
import { useAuth } from "@/hooks/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const pages = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Students", href: "/page-two", icon: Users },
  { title: "Deliverables", href: "/page-three", icon: ClipboardList },
  { title: "Weekly Reports", href: "/page-four", icon: Mail },
  { title: "Settings", href: "/page-five", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady, logout } = useAuth();

  function signOut() {
    logout();
    router.replace("/sign-in");
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b bg-white p-5 md:sticky md:top-0 md:h-screen md:w-64 md:border-r md:border-b-0">
      <Link href="/" className="mb-8 flex items-center gap-2 text-xl font-bold text-orange-600">
        <GraduationCap className="size-7" />
        DragonTrack
      </Link>

      <nav className="flex flex-col gap-2">
        {pages.map(({ title, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
              pathname === href
                ? "bg-orange-100 text-orange-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Icon className="size-5" />
            {title}
          </Link>
        ))}
      </nav>

      <div className="mt-8 space-y-3 md:mt-auto">
        <Link
          href="/page-six"
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
            pathname === "/page-six"
              ? "bg-orange-100 text-orange-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <School className="size-5" />
          Classrooms
        </Link>

        <ThemeToggle />

        {isReady && !user && (
          <div className="flex gap-3 text-sm">
            <Link href="/sign-in" className="text-orange-600">Sign in</Link>
            <Link href="/sign-up" className="text-orange-600">Sign up</Link>
          </div>
        )}

        {isReady && user && (
          <Button variant="outline" className="w-full" onClick={signOut}>
            <LogOut className="mr-2 size-4" />
            Sign Out
          </Button>
        )}
      </div>
    </aside>
  );
}
