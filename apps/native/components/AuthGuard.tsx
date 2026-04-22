import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useConvexAuth } from "convex/react";

interface AuthGuardProps {
  children: React.ReactNode;
  /** Where to redirect if not authenticated. Defaults to /(auth)/sign-in */
  redirectTo?: string;
}

/**
 * Replaces the web app's middleware.ts auth route protection.
 *
 * Wraps screens that require authentication. While auth is loading,
 * shows a spinner. If unauthenticated, redirects to sign-in.
 */
export function AuthGuard({
  children,
  redirectTo = "/",
}: AuthGuardProps) {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#5C2A33" />
        <Text className="mt-4 text-muted-foreground text-sm">Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href={redirectTo as any} />;
  }

  return <>{children}</>;
}
