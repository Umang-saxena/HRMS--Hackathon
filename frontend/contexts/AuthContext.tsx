"use client"; // Context providers with hooks must be client components

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isHR: boolean;
  isInterviewer: boolean;
  isCandidate: boolean;
  isEmployee: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Defensive serializer (keeps prior behavior) */
function serializeSupabaseError(err: unknown) {
  if (!err) return { message: "No error object" };
  try {
    const e: any = err;
    const names = Object.getOwnPropertyNames(e || {});
    const out: Record<string, any> = {};
    for (const n of names) {
      try {
        out[n] = (e as any)[n];
      } catch (ex) {
        out[n] = `unreadable property (${String(ex)})`;
      }
    }
    out.__toString = typeof e?.toString === "function" ? e.toString() : String(e);
    try {
      out.__json = JSON.parse(JSON.stringify(e, Object.getOwnPropertyNames(e)));
    } catch {
      out.__json = "json-serialize-failed";
    }
    return out;
  } catch (ex) {
    return { message: "failed to serialize error", raw: String(err), meta: String(ex) };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUserRole = async (userId: string | undefined) => {
    if (!userId) {
      console.warn("fetchUserRole called without userId");
      setUserRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log("Fetching role for user ID:", userId);

      // call and capture the entire response object
      const res = await supabase
        .from("user_roles") // change if your table is named differently
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      // Log the whole response object so we can inspect data/error/status etc.
      console.log("Supabase result for user_roles.select:", res);

      const { data, error, status } = res as any;

      if (error) {
        // Show the raw error (expandable in devtools)
        console.error("Supabase raw error fetching user role (expandable):", error);

        // Show property names and descriptors (non-enumerable properties)
        try {
          const names = Object.getOwnPropertyNames(error || {});
          console.log("Supabase error own property names:", names);
          console.log(
            "Supabase error descriptors:",
            Object.getOwnPropertyDescriptors(error || {})
          );
        } catch (descErr) {
          console.warn("Failed to read property descriptors from error:", descErr);
        }

        // Console.dir for deep inspection
        try {
          console.dir(error, { depth: null });
        } catch (dirErr) {
          console.warn("console.dir failed:", dirErr);
        }

        // Serialized fallback
        console.error(
          "Supabase serialized error fetching user role:",
          serializeSupabaseError(error),
          { status }
        );

        // If error contains a `response` or `statusText` or `details`, print them
        try {
          const maybeResponse = (error as any)?.response || (error as any)?.res || (error as any)?.statusText;
          if (maybeResponse) {
            console.error("Supabase error response-like field:", maybeResponse);
          }
        } catch (rErr) {
          console.warn("Failed to inspect error.response:", rErr);
        }

        setUserRole(null);
        setLoading(false);
        return;
      }

      if (!data) {
        console.warn("No role data found for user:", userId, { status });
        setUserRole(null);
        setLoading(false);
        return;
      }

      console.log("User role fetched successfully:", data.role);
      setUserRole((data.role as UserRole) ?? null);
    } catch (err) {
      console.error("Unexpected error fetching user role (exception):", {
        raw: err,
        string: String(err),
        names: Object.getOwnPropertyNames((err as object) || {}),
      });
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        fetchUserRole(currentUser.id);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    supabase
      .auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session ?? null);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          fetchUserRole(currentUser.id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error getting initial session:", serializeSupabaseError(err));
        setLoading(false);
      });

    return () => {
      try {
        if ((sub as any)?.subscription?.unsubscribe) {
          (sub as any).subscription.unsubscribe();
        } else if ((sub as any)?.unsubscribe) {
          (sub as any).unsubscribe();
        }
      } catch (e) {
        console.warn("Failed to unsubscribe auth listener:", e);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Sign in error:", serializeSupabaseError(error));
      return { error: error as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (error) {
        console.error("Supabase signUp error:", serializeSupabaseError(error));
        throw error;
      }

      if (data?.user) {
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: role,
        });

        if (roleError) {
          console.error("Error creating user role record:", serializeSupabaseError(roleError));
        } else {
          setUserRole(role);
        }
      }

      return { error: null };
    } catch (error) {
      console.error("Sign up error:", serializeSupabaseError(error));
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserRole(null);
      router.push("/auth");
    } catch (error) {
      console.error("Sign out error:", serializeSupabaseError(error));
    }
  };

  const value: AuthContextType = {
    user,
    session,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: userRole === "admin",
    isHR: userRole === "hr",
    isInterviewer: userRole === "interviewer",
    isCandidate: userRole === "candidate",
    isEmployee: userRole === "employee",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
