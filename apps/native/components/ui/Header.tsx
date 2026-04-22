import React from "react";
import { View, TouchableOpacity, SafeAreaView, Platform } from "react-native";
import { usePathname, router } from "expo-router";
import {
  Sparkles,
  ArrowLeft,
  ShoppingBag,
  MessageSquare,
  Heart,
  Clock,
} from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function Header() {
  const pathname = usePathname();
  const { isDark } = useTheme();

  // Define root routes that show the Logo instead of Back button
  const isRootPage =
    pathname === "/discover" ||
    pathname === "/ask" ||
    pathname === "/lookbooks" ||
    pathname === "/orders" ||
    pathname === "/profile";

  // Don't show header on login/splash screens if they are part of the stack
  // But usually those are modals or have headerShown: false in layout

  const isAskPage = pathname === "/ask";
  const iconColor = isDark ? "#FAF8F5" : "#1A1614";

  const unreadActivity = useQuery(
    api.lookInteractions.queries.getUnreadActivityCount,
  );
  const unreadMessages = useQuery(
    api.directMessages.queries.getUnreadMessageCount,
  );
  const cartCount = useQuery(api.cart.queries.getCartCount);

  const hasUnread = (unreadActivity ?? 0) > 0;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/discover");
    }
  };

  return (
    <SafeAreaView className="bg-background dark:bg-background-dark border-b border-border/50 dark:border-border-dark/50 z-50">
      <View
        className={cn(
          "flex-row items-center justify-between px-4 py-3",
          Platform.OS === "android" && "pt-10", // Safe area adjustment for Android if not handled by SafeAreaView
        )}
      >
        {/* Left Section: Logo or Back Button */}
        <View className="flex-row items-center">
          {isRootPage ? (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/discover")}
              className="flex-row items-center gap-2"
            >
              <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
                <Sparkles size={16} color="#FAF8F5" />
              </View>
              <Text variant="h4" className="font-semibold">
                Nima
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleBack}
              className="p-2 -ml-2 rounded-full active:bg-muted/10"
            >
              <ArrowLeft size={24} color={iconColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* Right Section: Actions */}
        <View className="flex-row items-center gap-3">
          {isAskPage ? (
            /* On Ask tab: only show chat history icon */
            <TouchableOpacity
              className="p-2 -mr-2 rounded-full active:bg-muted/10"
              onPress={() => {
                // Dispatch a custom event the Ask screen listens to
                // to open its ChatHistoryDrawer
                if (typeof globalThis.__openChatHistory === "function") {
                  globalThis.__openChatHistory();
                }
              }}
            >
              <Clock size={24} color={iconColor} />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                className="p-2 -mr-2 rounded-full active:bg-muted/10"
                onPress={() => router.push("/activity")}
              >
                <View>
                  <Heart size={24} color={iconColor} />
                  {hasUnread && (
                    <View
                      style={{
                        position: "absolute",
                        top: -2,
                        right: -2,
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: "#EF4444",
                        borderWidth: 2,
                        borderColor: isDark ? "#1A1614" : "#FAF8F5",
                      }}
                    />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="p-2 -mr-2 rounded-full active:bg-muted/10"
                onPress={() => router.push("/messages")}
              >
                <View>
                  <MessageSquare size={24} color={iconColor} />
                  {(unreadMessages ?? 0) > 0 && (
                    <View
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -4,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: isDark ? "#C9A07A" : "#5C2A33",
                        borderWidth: 2,
                        borderColor: isDark ? "#1A1614" : "#FAF8F5",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 3,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "600",
                          color: isDark ? "#1A1614" : "#FAF8F5",
                          lineHeight: 13,
                        }}
                      >
                        {(unreadMessages ?? 0) > 9 ? "9+" : unreadMessages}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="p-2 -mr-2 rounded-full active:bg-muted/10"
                onPress={() => router.push("/cart")}
              >
                <View>
                  <ShoppingBag size={24} color={iconColor} />
                  {(cartCount ?? 0) > 0 && (
                    <View
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -4,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: isDark ? "#C9A07A" : "#5C2A33",
                        borderWidth: 2,
                        borderColor: isDark ? "#1A1614" : "#FAF8F5",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 3,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "600",
                          color: isDark ? "#1A1614" : "#FAF8F5",
                          lineHeight: 13,
                        }}
                      >
                        {(cartCount ?? 0) > 9 ? "9+" : cartCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
