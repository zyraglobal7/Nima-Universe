import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OrderItem } from "@/components/orders/OrderItem";
import { ArrowLeft, MapPin, CreditCard, Receipt } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/contexts/ThemeContext";


export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  // Clean order number if captured incorrectly. Expo router [id] might be object if not careful, but usually string
  const orderNumber = Array.isArray(id) ? id[0] : id;

  const order = useQuery(api.orders.queries.getOrderByNumber, {
    orderNumber: orderNumber as string,
  });

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "KES",
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return { bg: "bg-primary", text: "text-primary-foreground" };
      case "processing":
        return {
          bg: "bg-blue-100 dark:bg-blue-900",
          text: "text-blue-800 dark:text-blue-100",
        };
      case "shipped":
        return {
          bg: "bg-green-100 dark:bg-green-900",
          text: "text-green-800 dark:text-green-100",
        };
      case "cancelled":
        return {
          bg: "bg-red-100 dark:bg-red-900",
          text: "text-red-800 dark:text-red-100",
        };
      default:
        return { bg: "bg-secondary", text: "text-secondary-foreground" };
    }
  };

  const renderHeader = () => (
    <View
      style={{ paddingTop: insets.top }}
      className="bg-background/95 border-b border-border z-10"
    >
      <View className="px-4 py-3 flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full active:bg-surface-alt"
        >
          <ArrowLeft
            size={24}
            className="text-foreground"
            color={isDark ? "white" : "black"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (order === undefined) {
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        {renderHeader()}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#C08D5D" />
        </View>
      </View>
    );
  }

  if (order === null) {
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        {renderHeader()}
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-xl font-medium text-foreground">
            Order not found
          </Text>
          <TouchableOpacity onPress={() => router.back()} className="mt-4">
            <Text className="text-primary font-bold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { bg: statusBg, text: statusText } = getStatusColor(order.status);

  return (
    <View className="flex-1 bg-background">
      {/* <Stack.Screen options={{ headerShown: false }} />
      {renderHeader()} */}

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Status Banner */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-lg font-medium text-foreground">Status</Text>
          <View className={`px-3 py-1 rounded-full ${statusBg}`}>
            <Text className={`font-medium capitalize ${statusText}`}>
              {order.status.replace("_", " ")}
            </Text>
          </View>
        </View>

        {/* Items Section */}
        <View className="bg-surface border border-border rounded-xl p-4 mb-6">
          <Text className="font-serif font-bold text-lg mb-2 text-foreground">
            Items
          </Text>
          {order.items.map((item) => (
            <OrderItem key={item._id} item={item} currency={order.currency} />
          ))}
        </View>

        {/* Order Summary */}
        <View className="bg-surface border border-border rounded-xl p-4 mb-6">
          <View className="flex-row items-center gap-2 mb-4">
            <Receipt
              size={20}
              className="text-muted-foreground"
              color="#9CA3AF"
            />
            <Text className="font-serif font-bold text-lg text-foreground">
              Order Summary
            </Text>
          </View>
          <View>
          <Text className="text-lg font-serif font-medium text-foreground">
            Order #{orderNumber}
          </Text>
          {order && (
            <Text className="text-xs text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString()}
            </Text>
          )}
        </View>
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Subtotal</Text>
              <Text className="text-foreground">
                {formatPrice(order.subtotal, order.currency)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Shipping</Text>
              <Text className="text-foreground">
                {formatPrice(order.shippingCost, order.currency)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Service Fee</Text>
              <Text className="text-foreground">
                {formatPrice(order.serviceFee, order.currency)}
              </Text>
            </View>
            <View className="h-[1px] bg-border my-1" />
            <View className="flex-row justify-between">
              <Text className="font-bold text-lg text-foreground">Total</Text>
              <Text className="font-bold text-lg text-foreground">
                {formatPrice(order.total, order.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Shipping Info */}
        <View className="bg-surface border border-border rounded-xl p-4 mb-6">
          <View className="flex-row items-center gap-2 mb-4">
            <MapPin
              size={20}
              className="text-muted-foreground"
              color="#9CA3AF"
            />
            <Text className="font-serif font-bold text-lg text-foreground">
              Shipping Details
            </Text>
          </View>
          <Text className="font-medium text-foreground">
            {order.shippingAddress.fullName}
          </Text>
          <Text className="text-muted-foreground">
            {order.shippingAddress.addressLine1}
          </Text>
          {!!order.shippingAddress.addressLine2 && (
            <Text className="text-muted-foreground">
              {order.shippingAddress.addressLine2}
            </Text>
          )}
          <Text className="text-muted-foreground">
            {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
            {order.shippingAddress.postalCode}
          </Text>
          <Text className="text-muted-foreground">
            {order.shippingAddress.country}
          </Text>
          <Text className="text-muted-foreground mt-2">
            {order.shippingAddress.phone}
          </Text>
        </View>

        {/* Payment Info */}
        <View className="bg-surface border border-border rounded-xl p-4 mb-6">
          <View className="flex-row items-center gap-2 mb-4">
            <CreditCard
              size={20}
              className="text-muted-foreground"
              color="#9CA3AF"
            />
            <Text className="font-serif font-bold text-lg text-foreground">
              Payment Information
            </Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-muted-foreground">Status</Text>
            <Text
              className={`font-medium capitalize ${order.paymentStatus === "paid" ? "text-green-600" : "text-foreground"}`}
            >
              {order.paymentStatus}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">Method</Text>
            <Text className="text-foreground">Credit Card</Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
