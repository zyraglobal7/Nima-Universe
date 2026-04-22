import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getUserInfo } from "@/lib/auth-storage";

/**
 * Syncs user profile data from WorkOS (persisted in SecureStore)
 * to Convex. On mobile, we don't have WorkOS's useAuth() hook,
 * so we read from the stored user info instead.
 *
 * Port of the Next.js UserDataSync component.
 *
 * Module-level state prevents duplicate syncs across remounts.
 */

let hasSyncedForUser: string | null = null;
let isSyncing = false;

export function UserDataSync() {
  const convexUser = useQuery(api.users.queries.getCurrentUser);
  const getOrCreateUser = useMutation(api.users.mutations.getOrCreateUser);

  useEffect(() => {
    let mounted = true;

    async function syncUserData() {
      // Wait for Convex user query to resolve (undefined = loading)
      if (convexUser === undefined) return;

      // Get WorkOS user info from secure storage
      const workosUser = await getUserInfo();
      if (!workosUser) {
        // Not authenticated — reset sync state
        hasSyncedForUser = null;
        return;
      }

      // Skip if already synced for this user or currently syncing
      if (hasSyncedForUser === workosUser.id || isSyncing) return;

      // If Convex user exists and has all profile data, mark as synced
      if (convexUser !== null && convexUser.email && convexUser.firstName) {
        hasSyncedForUser = workosUser.id;
        return;
      }

      // Lock to prevent concurrent syncs
      isSyncing = true;

      try {
        console.log("[USER_DATA_SYNC] Syncing user data to Convex:", {
          id: workosUser.id,
          email: workosUser.email,
          firstName: workosUser.firstName,
        });

        await getOrCreateUser({
          email: workosUser.email || undefined,
          emailVerified: workosUser.emailVerified || false,
          firstName: workosUser.firstName || undefined,
          lastName: workosUser.lastName || undefined,
          profileImageUrl: workosUser.profilePictureUrl || undefined,
        });

        if (mounted) {
          hasSyncedForUser = workosUser.id;
          console.log("[USER_DATA_SYNC] Successfully synced user data");
        }
      } catch (err) {
        console.error("[USER_DATA_SYNC] Failed to sync user data:", err);
      } finally {
        isSyncing = false;
      }
    }

    syncUserData();
    return () => {
      mounted = false;
    };
  }, [convexUser, getOrCreateUser]);

  return null;
}
