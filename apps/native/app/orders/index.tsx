
import React from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Text } from "@/components/ui/Text";
import { OrderCard } from "@/components/orders/OrderCard";
import { ShoppingBag, ArrowLeft } from "lucide-react-native";
import { useTheme } from "@/lib/contexts/ThemeContext";

import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const orders = useQuery(api.orders.queries.getUserOrders, {});

  const iconColor = isDark ? "#C9A07A" : "#5C2A33";
  const mutedColor = isDark ? "#8C8078" : "#9C948A";

  const renderHeader = () => (
    <View
      style={{ paddingTop: insets.top }}
      className="bg-background/95 dark:bg-background-dark/95 border-b border-border dark:border-border-dark z-10"
    >
      <View className="px-4 py-3 flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full active:bg-surface-alt dark:active:bg-surface-alt-dark"
        >
          <ArrowLeft
            size={24}
            color={isDark ? "#F5EFE8" : "#2D2926"}
          />
        </TouchableOpacity>
        <View>
          <Text className="text-lg font-serif font-medium text-foreground dark:text-foreground-dark">
            Your Orders
          </Text>
          <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
            Track and manage purchases
          </Text>
        </View>
      </View>
    </View>
  );

  if (orders === undefined) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark">
        {renderHeader()}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={iconColor} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />
      {renderHeader()}

      {orders.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <View className="w-16 h-16 rounded-full bg-surface-alt dark:bg-surface-alt-dark items-center justify-center mb-6">
            <ShoppingBag
              size={32}
              color={mutedColor}
            />
          </View>
          <Text className="text-xl font-medium text-foreground dark:text-foreground-dark mb-2">
            No orders yet
          </Text>
          <Text className="text-center text-muted-foreground dark:text-muted-dark-foreground mb-6">
            You haven't placed any orders yet. Start shopping to find your
            perfect look.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/discover")}
            className="bg-primary dark:bg-primary-dark px-6 py-3 rounded-full active:opacity-90"
          >
            <Text className="text-primary-foreground dark:text-primary-dark-foreground font-bold">
              Start Shopping
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={{ padding: 16 }}
          className="flex-1"
        />
      )}
    </View>
  );
}
