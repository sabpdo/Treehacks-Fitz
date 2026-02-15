import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { Landing } from "./Landing";
import { Root } from "./Root";

/**
 * At path "/": show Landing when not authenticated, otherwise show the app (Root with feed, etc.).
 */
export function LandingOrApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-900" />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  if (!user.email_confirmed_at) {
    return <Navigate to="/confirm-email" replace />;
  }

  return <Root />;
}
