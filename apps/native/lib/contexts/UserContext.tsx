import React, { createContext, useContext, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";

// Define the shape of the user context
interface UserContextType {
  user: Doc<"users"> | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Create the context with a default value
const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider component
export function UserProvider({ children }: { children: ReactNode }) {
  // Fetch current user from Convex
  // Returns:
  // - undefined while loading
  // - null if not authenticated or user not found
  // - User document if authenticated and found
  const user = useQuery(api.users.queries.getCurrentUser);

  const isLoading = user === undefined;
  const isAuthenticated = user !== null && user !== undefined;

  return (
    <UserContext.Provider value={{ user, isLoading, isAuthenticated }}>
      {children}
    </UserContext.Provider>
  );
}

// Hook to access the user context
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
