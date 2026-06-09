import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole =
  | "admin"
  | "main_admin"
  | "moderator"
  | "service_delivery"
  | "technical"
  | "billing"
  | "customer"
  | "technician"
  | "distributor";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  profile: { full_name: string; email: string | null; phone: string | null; district: string | null; account_type: string } | null;
  hasRole: (role: AppRole) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  roles: [],
  profile: null,
  hasRole: () => false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);

  const fetchUserData = async (userId: string) => {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("full_name, email, phone, district, account_type").eq("user_id", userId).single(),
    ]);

    setRoles((rolesRes.data || []).map((r) => r.role as AppRole));
    setProfile(profileRes.data ?? null);
  };

  useEffect(() => {
    const syncSession = async (session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserData(session.user.id);
      } else {
        setRoles([]);
        setProfile(null);
      }

      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      void syncSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoading(true);
      void syncSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: AppRole) => roles.includes(role);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, profile, hasRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
