"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LockKeyhole, Shapes } from "lucide-react";
import { useAuth } from "@/hooks/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const pages = [
  { title: "Page One", href: "/" },
  { title: "Page Two", href: "/page-two" },
  { title: "Page Three", href: "/page-three" },
  { title: "Page Four", href: "/page-four" },
  { title: "Page Five", href: "/page-five" },
];

// The navbar and Page Five read the same PocketBase login through useAuth.
export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady, logout } = useAuth();

  function signOut() {
    logout();
    router.replace("/sign-in");
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-sidebar-border bg-sidebar px-4 py-4 md:sticky md:top-0 md:h-screen md:w-64 md:border-r md:border-b-0 md:px-5 md:py-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <Shapes className="size-5 text-primary" aria-hidden="true" />
          Project Starter
        </Link>
        <div className="md:hidden">
          <ThemeToggle />
        </div>
      </div>

      <nav aria-label="Main navigation" className="mt-4 flex flex-col gap-1">
        {pages.map(function renderPageLink(page) {
          const current = pathname === page.href;
          return (
            <Link
              key={page.href}
              href={page.href}
              aria-current={current ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border-l-2 px-3 py-2 text-sm transition-colors md:w-full ${current ? "border-primary bg-orange-50 font-medium text-orange-800" : "border-transparent text-muted-foreground hover:bg-orange-50/70 hover:text-orange-800"}`}
            >
              {page.title}
              {page.href === "/page-five" && (
                <LockKeyhole className="size-3" aria-label="Requires sign-in" />
              )}
            </Link>
          );
        })}
        {isReady && !user && (
          <div className="mt-3 flex flex-col gap-1 border-t border-sidebar-border pt-3">
            <span className="px-3 pb-1 text-xs font-medium text-muted-foreground">
              Account
            </span>
            {[
              { title: "Sign in", href: "/sign-in" },
              { title: "Sign up", href: "/sign-up" },
            ].map(function renderAccountLink(link) {
              const current = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  className={`inline-flex w-full items-center rounded-md border-l-2 px-3 py-2 text-sm transition-colors ${current ? "border-primary bg-orange-50 font-medium text-orange-800" : "border-transparent text-muted-foreground hover:bg-orange-50/70 hover:text-orange-800"}`}
                >
                  {link.title}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="mt-4 flex items-center gap-2 border-t border-sidebar-border pt-4 md:mt-auto md:flex-col md:items-stretch">
        <div className="hidden justify-end md:flex">
          <ThemeToggle />
        </div>
        {!isReady && (
          <span role="status" className="text-xs text-muted-foreground">
            Loading account…
          </span>
        )}
        {isReady && user && (
          <>
            <span className="hidden max-w-36 truncate text-xs text-muted-foreground xl:block">
              {user.name || user.email}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </>
        )}
      </div>
    </aside>
  );
}
