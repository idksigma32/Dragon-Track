
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  AlertTriangle,
  Settings,
  School,
  LogOut,
  GraduationCap,
} from "lucide-react";

import { useAuth } from "@/hooks/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const teacherPages = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Students", href: "/page-two", icon: Users },
  { title: "Deliverables", href: "/page-three", icon: ClipboardList },
  { title: "Req. Attention", href: "/page-four", icon: AlertTriangle },
  { title: "Settings", href: "/page-five", icon: Settings },
];

const studentPages = [
  { title: "My Progress", href: "/", icon: LayoutDashboard },
  { title: "Settings", href: "/page-five", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady, logout } = useAuth();

  const isTeacher = user?.role === "teacher";
  const pages = isTeacher ? teacherPages : studentPages;

  function signOut() {
    logout();
    router.replace("/sign-in");
  }

  function navClass(href) {
    return `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
      pathname === href
        ? "bg-orange-100 text-orange-700"
        : "text-gray-600 hover:bg-gray-100"
    }`;
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b bg-white p-5 md:sticky md:top-0 md:h-screen md:w-64 md:border-r md:border-b-0">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-xl font-bold text-orange-600"
      >
        <GraduationCap className="size-7" />
        DragonTrack
      </Link>

      {isReady && !user && (
        <div className="mb-5 flex gap-3 text-sm">
          <Link href="/sign-in" className="text-orange-600">
            Sign in
          </Link>

          <Link href="/sign-up" className="text-orange-600">
            Sign up
          </Link>
        </div>
      )}

      {isReady && user && (
        <>
          <div className="mb-5 rounded-xl bg-orange-50 p-3">
            <p className="truncate text-sm font-semibold text-slate-800">
              {user.name || user.email}
            </p>

            <p className="mt-1 text-xs text-orange-600">
              {isTeacher ? "Teacher" : "Student"}
            </p>
          </div>

          <nav className="flex flex-col gap-2">
            {pages.map(({ title, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={navClass(href)}
              >
                <Icon className="size-5" />
                {title}
              </Link>
            ))}
          </nav>
        </>
      )}

      <div className="mt-8 space-y-3 md:mt-auto">
        {isReady && user && (
          <>
            <Link
              href="/page-six"
              className={navClass("/page-six")}
            >
              <School className="size-5" />
              {isTeacher ? "Classrooms" : "My Classrooms"}
            </Link>

            <Button
              variant="outline"
              className="w-full"
              onClick={signOut}
            >
              <LogOut className="mr-2 size-4" />
              Sign Out
            </Button>
          </>
        )}

        <ThemeToggle />
      </div>
    </aside>
  );
}
