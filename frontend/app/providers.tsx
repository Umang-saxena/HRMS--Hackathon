// app/providers.tsx
"use client";

import React from "react";
import { AuthProvider } from "@/contexts/AuthContext"; // adjust path if needed
import { Toaster } from "@/components/ui/toaster"; // optional, if you use toasts

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster /> {/* optional: global toast container */}
    </AuthProvider>
  );
}
