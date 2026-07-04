"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Role = "owner" | "admin" | "coach" | "staff" | "player" | "viewer" | "registered" | string;

type Props = {
  children: React.ReactNode;
  allowedRoles?: Role[];
  fallbackTitle?: string;
  fallbackMessage?: string;
};

const DEFAULT_ALLOWED_ROLES: Role[] = ["owner", "admin", "coach", "staff"];

export default function WriteAccessBlock({
  children,
  allowedRoles = DEFAULT_ALLOWED_ROLES,
  fallbackTitle = "Accesso riservato",
  fallbackMessage = "Puoi visualizzare i dati pubblici, ma per modificare o caricare risultati serve un ruolo Staff, Coach o Owner.",
}: Props) {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const allowed = useMemo(() => {
    if (!role) return false;
    return allowedRoles.includes(role);
  }, [role, allowedRoles]);

  useEffect(() => {
    let mounted = true;

    async function loadRole() {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!mounted) return;

      if (!user) {
        setEmail(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);

      const { data: memberData } = await supabase
        .from("clan_members")
        .select("role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!mounted) return;
      setRole((memberData?.role as Role | undefined) ?? "registered");
      setLoading(false);
    }

    loadRole();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadRole();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <section className="codm-access-card">
        <h2>Controllo permessi...</h2>
        <p>Verifico il tuo ruolo nel clan.</p>
      </section>
    );
  }

  if (!allowed) {
    return (
      <section className="codm-access-card">
        <h2>{fallbackTitle}</h2>
        <p>{fallbackMessage}</p>
        <div className="codm-access-meta">
          <span>Utente: {email ?? "non loggato"}</span>
          <span>Ruolo: {role ?? "visitator"}</span>
        </div>
        <a className="codm-access-button" href="/login">Vai al login</a>
      </section>
    );
  }

  return <>{children}</>;
}

export { WriteAccessBlock };
