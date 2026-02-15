import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Mail } from "lucide-react";

export const ConfirmEmail: React.FC = () => {
  const { user, signOut } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.email_confirmed_at) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Mail className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle className="text-xl">Confirm your email</CardTitle>
          <CardDescription>
            We sent a confirmation link to <strong>{user.email}</strong>. Click the link in that email to verify your account and start using fitz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            You can close this page and use the link from your email. If you don’t see it, check your spam folder.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signOut()}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
