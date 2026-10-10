"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin() {
      if (isLoginPage) {
        setAuthorized(true);
        return;
      }

      setAuthorized(false);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (sessionError || !session) {
        window.location.replace("/admin/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError || profile?.role !== "admin") {
        window.location.replace("/admin/login");
        return;
      }

      setAuthorized(true);
    }

    void checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [pathname, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f3ff] px-4 text-zinc-700">
        Проверяем доступ к панели управления...
      </main>
    );
  }

  return <>{children}</>;
}
