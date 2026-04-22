import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { router } from "expo-router";

// Detect Expo Go where push notifications native module is unavailable (SDK 53+)
const isExpoGo = Constants.executionEnvironment === "storeClient";

let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}

let Notifications: typeof import("expo-notifications") | null = null;
if (!isExpoGo) {
  try {
    Notifications = require("expo-notifications");
  } catch (error) {
    console.warn("[PUSH] expo-notifications not available in this environment");
  }

  // Configure notification handler — show notifications even when the app is foregrounded
  if (Notifications) {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (error) {
      console.warn("[PUSH] Failed to set notification handler:", error);
    }
  }
} else {
  console.log(
    "[PUSH] Running in Expo Go — push notifications are not available. Use a development build for full functionality.",
  );
}

/**
 * Set up Android notification channels
 */
async function setupNotificationChannels() {
  if (!Notifications || Platform.OS !== "android") return;

  try {
    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#5C2A33",
    });
    await Notifications.setNotificationChannelAsync("credits", {
      name: "Credits",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#5C2A33",
    });
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#5C2A33",
    });
    await Notifications.setNotificationChannelAsync("looks", {
      name: "Looks & Try-Ons",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#5C2A33",
    });
  } catch (error) {
    console.warn("[PUSH] Failed to set up notification channels:", error);
  }
}

/**
 * Register for push notifications and return the Expo push token
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Notifications) {
    console.log("[PUSH] Notifications module not available");
    return null;
  }

  // Push notifications don't work on simulators
  if (!Device.isDevice) {
    console.log("[PUSH] Must use physical device for push notifications");
    return null;
  }

  // Set up channels on Android
  await setupNotificationChannels();

  // Check existing permissions
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Ask for permission if not already granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[PUSH] Permission not granted for push notifications");
    return null;
  }

  // Get the push token
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log("[PUSH] No EAS project ID found, skipping token registration");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log("[PUSH] Expo push token:", tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error("[PUSH] Error getting push token:", error);
    return null;
  }
}

/**
 * Hook to manage push notification registration and handle incoming notifications
 *
 * - Registers for push notifications on mount
 * - Saves the token to Convex for server-side sending (only when authenticated)
 * - Listens for received and tapped notifications
 */
export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<import("expo-notifications").Notification | null>(null);
  const notificationListener =
    useRef<import("expo-notifications").EventSubscription>();
  const responseListener =
    useRef<import("expo-notifications").EventSubscription>();
  const { isAuthenticated } = useConvexAuth();

  const savePushToken = useMutation(api.notifications.mutations.savePushToken);

  // Register for push notifications and save token when authenticated
  useEffect(() => {
    if (!Notifications) return;
    if (!isAuthenticated) return;

    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        setExpoPushToken(token);

        // Save to Convex — only runs when authenticated
        try {
          const platform =
            Platform.OS === "ios"
              ? ("ios" as const)
              : Platform.OS === "android"
                ? ("android" as const)
                : ("web" as const);
          await savePushToken({ token, platform });
        } catch (error) {
          console.error("[PUSH] Failed to save push token to Convex:", error);
        }
      }
    });
  }, [isAuthenticated, savePushToken]);

  // Set up notification listeners (regardless of auth state)
  useEffect(() => {
    if (!Notifications) return;

    // Listen for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notif) => {
        setNotification(notif);
        const data = notif.request.content.data;
        if (data?.type === "message_received" && Haptics) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      });

    // Listen for user tapping on a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("[PUSH] Notification tapped:", data);

        // Handle navigation based on notification type
        if (data?.type === "low_credits" || data?.type === "credits_purchased") {
          router.push("/(tabs)/profile");
        } else if (data?.type === "message_received") {
          router.push("/messages");
        } else if (data?.type === "look_ready" && data?.lookId) {
          router.push(`/look/${data.lookId}`);
        } else if (data?.type === "tryon_ready") {
          router.push("/(tabs)/discover");
        } else if (data?.type === "onboarding_looks_ready") {
          router.push("/(tabs)/discover");
        }
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
  };
}
