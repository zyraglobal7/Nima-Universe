import { useState, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Vibration,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import {
  ArrowLeft,
  ShoppingBag,
  MapPin,
  CreditCard,
  Check,
  AlertCircle,
  Sparkles,
  Phone,
  Smartphone,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Mascot image for success screen
const mascotImage = require("@/assets/mascott.png");

interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

const EMPTY_ADDRESS: ShippingAddress = {
  fullName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  phone: "",
};

type CheckoutStep = "form" | "processing" | "success" | "failed";

function formatPrice(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString()}`;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("form");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderId, setOrderId] = useState<Id<"orders"> | null>(null);
  const [addressPrefilled, setAddressPrefilled] = useState(false);

  // Queries
  const cartItems = useQuery(api.cart.queries.getCart);
  const cartTotal = useQuery(api.cart.queries.getCartTotal);
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  // Poll order payment status (only while processing)
  const orderPaymentStatus = useQuery(
    api.orders.queries.getOrderPaymentStatus,
    orderId && checkoutStep === "processing" ? { orderId } : "skip",
  );

  // Mutations
  const createOrder = useMutation(api.orders.mutations.createOrder);

  // Pre-fill address from saved user data
  useEffect(() => {
    if (currentUser && !addressPrefilled) {
      // Pre-fill M-Pesa phone from user profile
      if (currentUser.phoneNumber && !mpesaPhone) {
        setMpesaPhone(currentUser.phoneNumber);
      }

      // Pre-fill shipping address from saved data
      if (currentUser.savedShippingAddress) {
        const saved = currentUser.savedShippingAddress;
        setAddress({
          fullName: saved.fullName,
          addressLine1: saved.addressLine1,
          addressLine2: saved.addressLine2 ?? "",
          city: saved.city,
          state: saved.state ?? "",
          postalCode: saved.postalCode,
          country: saved.country,
          phone: saved.phone,
        });
      }
      setAddressPrefilled(true);
    }
  }, [currentUser, addressPrefilled, mpesaPhone]);

  // Watch for payment status changes
  useEffect(() => {
    if (!orderPaymentStatus) return;

    if (orderPaymentStatus.paymentStatus === "paid") {
      setCheckoutStep("success");
      // Vibration pattern: short-pause-short-pause-long
      Vibration.vibrate([0, 100, 50, 100, 50, 200]);
    } else if (orderPaymentStatus.paymentStatus === "failed") {
      setCheckoutStep("failed");
      Vibration.vibrate([0, 300]);
    }
  }, [orderPaymentStatus?.paymentStatus]);

  const isLoading = cartItems === undefined || cartTotal === undefined;
  const isEmpty = !isLoading && cartItems.length === 0;

  // Pricing
  const serviceFee = cartTotal ? Math.round(cartTotal.subtotal * 0.1) : 0;
  const estimatedShipping = 500;
  const total = cartTotal
    ? cartTotal.subtotal + serviceFee + estimatedShipping
    : 0;
  const currency = cartTotal?.currency ?? "KES";

  // Colors
  const iconColor = isDark ? "#C9A07A" : "#5C2A33";
  const mutedColor = isDark ? "#8C8078" : "#9C948A";

  const handleAddressChange = useCallback(
    (field: keyof ShippingAddress, value: string) => {
      setAddress((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const isAddressValid = () =>
    address.fullName.trim() !== "" &&
    address.addressLine1.trim() !== "" &&
    address.city.trim() !== "" &&
    address.postalCode.trim() !== "" &&
    address.country.trim() !== "" &&
    address.phone.trim() !== "";

  const isPhoneValid = () => {
    const phoneRegex = /^(?:\+254|254|0)(?:7|1)\d{8}$/;
    return phoneRegex.test(mpesaPhone.replace(/\s/g, ""));
  };

  const canPlaceOrder = isAddressValid() && isPhoneValid();

  const handlePlaceOrder = async () => {
    if (!isAddressValid()) {
      Alert.alert("Missing Information", "Please fill in all required shipping fields.");
      return;
    }
    if (!isPhoneValid()) {
      Alert.alert("Invalid Phone", "Please enter a valid M-Pesa phone number (e.g., +254712345678).");
      return;
    }

    setIsPlacingOrder(true);
    try {
      const result = await createOrder({
        shippingAddress: {
          fullName: address.fullName,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 || undefined,
          city: address.city,
          state: address.state || undefined,
          postalCode: address.postalCode,
          country: address.country,
          phone: address.phone,
        },
        mpesaPhoneNumber: mpesaPhone.replace(/\s/g, ""),
      });
      setOrderNumber(result.orderNumber);
      setOrderId(result.orderId);
      setCheckoutStep("processing");
    } catch (error) {
      Alert.alert(
        "Order Failed",
        error instanceof Error ? error.message : "Failed to place order. Please try again.",
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // ──── Processing Screen (Waiting for M-Pesa) ────
  if (checkoutStep === "processing") {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: isDark ? "rgba(201,160,122,0.15)" : "rgba(92,42,51,0.1)" }}
          >
            <Smartphone size={36} color={iconColor} />
          </View>

          <Text variant="h3" className="text-center mb-2">
            Waiting for M-Pesa
          </Text>

          {orderNumber ? (
            <Text className="text-primary dark:text-primary-dark font-medium text-center mb-2">
              {orderNumber}
            </Text>
          ) : null}

          <Text variant="muted" className="text-center mb-6 leading-relaxed max-w-xs">
            An M-Pesa STK Push has been sent to{" "}
            <Text className="font-medium text-foreground dark:text-foreground-dark">
              {mpesaPhone}
            </Text>
            . Please enter your M-Pesa PIN to complete payment.
          </Text>

          <ActivityIndicator size="large" color={iconColor} />

          <Text variant="caption" className="text-center mt-6 max-w-xs">
            This will update automatically once payment is confirmed. Please do not close this screen.
          </Text>

          <TouchableOpacity
            onPress={() => {
              setCheckoutStep("form");
              setOrderId(null);
              setOrderNumber("");
            }}
            className="mt-8 px-6 py-3 border border-border dark:border-border-dark rounded-2xl"
          >
            <Text className="text-sm text-foreground dark:text-foreground-dark">
              Cancel & Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ──── Order Success Screen ────
  if (checkoutStep === "success") {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Image
            source={mascotImage}
            style={{ width: 140, height: 140, marginBottom: 24 }}
            contentFit="contain"
          />
          <Text variant="h3" className="text-center mb-2">
            Order Confirmed! 🎉
          </Text>
          {orderNumber ? (
            <Text className="text-primary dark:text-primary-dark font-medium text-center mb-2">
              {orderNumber}
            </Text>
          ) : null}
          <Text variant="muted" className="text-center mb-8 leading-relaxed max-w-xs">
            Payment received! Our Nima Delivers team will start shopping
            for your items and deliver them to you soon.
          </Text>

          <View className="w-full gap-3">
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/discover" as any)}
              className="bg-primary dark:bg-primary-dark py-4 rounded-2xl flex-row items-center justify-center gap-2"
            >
              <Sparkles size={18} color={isDark ? "#1A1614" : "#FAF8F5"} />
              <Text className="text-base font-semibold text-primary-foreground dark:text-primary-dark-foreground">
                Continue Shopping
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/orders" as any)}
              className="border border-border dark:border-border-dark bg-surface dark:bg-surface-dark py-4 rounded-2xl items-center justify-center"
            >
              <Text className="text-base font-medium text-foreground dark:text-foreground-dark">
                View Orders
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ──── Payment Failed Screen ────
  if (checkoutStep === "failed") {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mb-6">
            <AlertCircle size={40} color="#dc2626" />
          </View>
          <Text variant="h3" className="text-center mb-2">
            Payment Failed
          </Text>
          {orderNumber ? (
            <Text className="text-primary dark:text-primary-dark font-medium text-center mb-2">
              {orderNumber}
            </Text>
          ) : null}
          <Text variant="muted" className="text-center mb-8 leading-relaxed max-w-xs">
            The M-Pesa payment was not completed. Please try again or use a different phone number.
          </Text>

          <View className="w-full gap-3">
            <TouchableOpacity
              onPress={() => {
                setCheckoutStep("form");
                setOrderId(null);
                setOrderNumber("");
              }}
              className="bg-primary dark:bg-primary-dark py-4 rounded-2xl flex-row items-center justify-center gap-2"
            >
              <Text className="text-base font-semibold text-primary-foreground dark:text-primary-dark-foreground">
                Try Again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              className="border border-border dark:border-border-dark bg-surface dark:bg-surface-dark py-4 rounded-2xl items-center justify-center"
            >
              <Text className="text-base font-medium text-foreground dark:text-foreground-dark">
                Back to Cart
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ──── Loading State ────
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 border-b border-border/30 dark:border-border-dark/30">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full"
          >
            <ArrowLeft size={22} color={iconColor} />
          </TouchableOpacity>
          <Text className="flex-1 text-lg font-serif font-medium text-foreground dark:text-foreground-dark text-center mr-10">
            Checkout
          </Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={iconColor} />
          <Text variant="muted" className="mt-4">
            Loading checkout...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ──── Empty Cart ────
  if (isEmpty) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 border-b border-border/30 dark:border-border-dark/30">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full"
          >
            <ArrowLeft size={22} color={iconColor} />
          </TouchableOpacity>
          <Text className="flex-1 text-lg font-serif font-medium text-foreground dark:text-foreground-dark text-center mr-10">
            Checkout
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-surface-alt dark:bg-surface-alt-dark items-center justify-center mb-6">
            <ShoppingBag size={36} color={mutedColor} />
          </View>
          <Text variant="h4" className="text-center mb-2">
            Your cart is empty
          </Text>
          <Text variant="muted" className="text-center mb-8">
            Add some items to your cart to checkout.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/discover" as any)}
            className="bg-primary dark:bg-primary-dark px-8 py-3.5 rounded-2xl flex-row items-center gap-2"
          >
            <Sparkles size={18} color={isDark ? "#1A1614" : "#FAF8F5"} />
            <Text className="text-base font-medium text-primary-foreground dark:text-primary-dark-foreground">
              Start Discovering
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ──── Checkout Form ────
  return (
    <SafeAreaView
      className="flex-1 bg-background dark:bg-background-dark"
      edges={["top"]}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}
        >
          {/* Order Items Summary */}
          <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border/30 dark:border-border-dark/30 p-4">
            <View className="flex-row items-center gap-2 mb-4">
              <ShoppingBag size={18} color={iconColor} />
              <Text className="font-medium text-foreground dark:text-foreground-dark">
                Order Items ({cartTotal?.itemCount})
              </Text>
            </View>

            <View className="gap-3">
              {cartItems!.map((item) => (
                <View key={item._id} className="flex-row gap-3">
                  <View className="w-16 h-20 rounded-xl overflow-hidden bg-surface-alt dark:bg-surface-alt-dark flex-shrink-0">
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <ShoppingBag size={20} color={mutedColor} />
                      </View>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm font-medium text-foreground dark:text-foreground-dark"
                      numberOfLines={2}
                    >
                      {item.item.name}
                    </Text>
                    {item.item.brand ? (
                      <Text variant="caption">{item.item.brand}</Text>
                    ) : null}
                    <View className="flex-row items-center gap-1 mt-1">
                      <Text className="text-sm text-foreground dark:text-foreground-dark">
                        {formatPrice(item.item.price, item.item.currency)}
                      </Text>
                      <Text variant="caption">× {item.quantity}</Text>
                    </View>
                    {(item.selectedSize || item.selectedColor) ? (
                      <View className="flex-row gap-1 mt-1">
                        {item.selectedSize ? (
                          <View className="bg-surface-alt dark:bg-surface-alt-dark px-2 py-0.5 rounded-full">
                            <Text variant="caption">Size: {item.selectedSize}</Text>
                          </View>
                        ) : null}
                        {item.selectedColor ? (
                          <View className="bg-surface-alt dark:bg-surface-alt-dark px-2 py-0.5 rounded-full">
                            <Text variant="caption">{item.selectedColor}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Shipping Address */}
          <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border/30 dark:border-border-dark/30 p-4">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2">
                <MapPin size={18} color={iconColor} />
                <Text className="font-medium text-foreground dark:text-foreground-dark">
                  Shipping Address
                </Text>
              </View>
              {addressPrefilled && currentUser?.savedShippingAddress && (
                <View className="bg-primary/10 dark:bg-primary-dark/10 px-2.5 py-1 rounded-full">
                  <Text className="text-xs text-primary dark:text-primary-dark">
                    Saved address
                  </Text>
                </View>
              )}
            </View>

            <View className="gap-4">
              <FormField
                label="Full Name *"
                value={address.fullName}
                onChangeText={(v) => handleAddressChange("fullName", v)}
                placeholder="John Doe"
                isDark={isDark}
              />
              <FormField
                label="Address Line 1 *"
                value={address.addressLine1}
                onChangeText={(v) => handleAddressChange("addressLine1", v)}
                placeholder="123 Main Street"
                isDark={isDark}
              />
              <FormField
                label="Address Line 2"
                value={address.addressLine2}
                onChangeText={(v) => handleAddressChange("addressLine2", v)}
                placeholder="Apt 4B"
                isDark={isDark}
              />

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <FormField
                    label="City *"
                    value={address.city}
                    onChangeText={(v) => handleAddressChange("city", v)}
                    placeholder="Nairobi"
                    isDark={isDark}
                  />
                </View>
                <View className="flex-1">
                  <FormField
                    label="State"
                    value={address.state}
                    onChangeText={(v) => handleAddressChange("state", v)}
                    placeholder="Nairobi"
                    isDark={isDark}
                  />
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <FormField
                    label="Postal Code *"
                    value={address.postalCode}
                    onChangeText={(v) => handleAddressChange("postalCode", v)}
                    placeholder="00100"
                    keyboardType="numeric"
                    isDark={isDark}
                  />
                </View>
                <View className="flex-1">
                  <FormField
                    label="Country *"
                    value={address.country}
                    onChangeText={(v) => handleAddressChange("country", v)}
                    placeholder="Kenya"
                    isDark={isDark}
                  />
                </View>
              </View>

              <FormField
                label="Phone Number *"
                value={address.phone}
                onChangeText={(v) => handleAddressChange("phone", v)}
                placeholder="+254 712 345 678"
                keyboardType="phone-pad"
                isDark={isDark}
              />
            </View>
          </View>

          {/* Nima Delivers Info */}
          <View className="rounded-2xl border border-primary/20 dark:border-primary-dark/20 p-4"
            style={{ backgroundColor: isDark ? "rgba(201,160,122,0.08)" : "rgba(92,42,51,0.06)" }}
          >
            <View className="flex-row items-start gap-3">
              <View className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
                style={{ backgroundColor: isDark ? "rgba(201,160,122,0.15)" : "rgba(92,42,51,0.1)" }}
              >
                <Sparkles size={18} color={iconColor} />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-foreground dark:text-foreground-dark mb-1">
                  Nima Delivers
                </Text>
                <Text variant="muted" className="leading-relaxed">
                  Our team will purchase your items from multiple stores and
                  consolidate them into one delivery. Estimated delivery: 5–10
                  business days.
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Method - M-Pesa */}
          <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border/30 dark:border-border-dark/30 p-4">
            <View className="flex-row items-center gap-2 mb-4">
              <CreditCard size={18} color={iconColor} />
              <Text className="font-medium text-foreground dark:text-foreground-dark">
                Payment — M-Pesa
              </Text>
            </View>

            <View className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl p-3 mb-4">
              <View className="flex-row items-center gap-2">
                <Phone size={16} color="#16a34a" />
                <Text className="text-sm text-green-800 dark:text-green-300 flex-1">
                  You'll receive an M-Pesa STK Push prompt on your phone to confirm payment.
                </Text>
              </View>
            </View>

            <View>
              <Text variant="caption" className="mb-1">
                M-Pesa Phone Number *
              </Text>
              <TextInput
                value={mpesaPhone}
                onChangeText={setMpesaPhone}
                placeholder="+254712345678"
                placeholderTextColor={isDark ? "#8C8078" : "#9C948A"}
                keyboardType="phone-pad"
                autoCorrect={false}
                style={{
                  backgroundColor: isDark ? "#1A1614" : "#FAF8F5",
                  borderWidth: 1,
                  borderColor: mpesaPhone && !isPhoneValid()
                    ? "#dc2626"
                    : isDark ? "rgba(139,121,107,0.3)" : "rgba(139,121,107,0.25)",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: isDark ? "#F5EFE8" : "#2D2926",
                }}
              />
              {mpesaPhone && !isPhoneValid() && (
                <Text className="text-xs text-red-500 mt-1">
                  Enter a valid Kenyan phone number (e.g., +254712345678)
                </Text>
              )}
            </View>
          </View>

          {/* Order Summary */}
          <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border/30 dark:border-border-dark/30 p-4 gap-3">
            <Text className="font-medium text-foreground dark:text-foreground-dark">
              Order Summary
            </Text>

            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text variant="muted">
                  Subtotal ({cartTotal?.itemCount} {cartTotal?.itemCount === 1 ? "item" : "items"})
                </Text>
                <Text className="text-foreground dark:text-foreground-dark">
                  {formatPrice(cartTotal?.subtotal ?? 0, currency)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text variant="muted">Nima Service Fee (10%)</Text>
                <Text className="text-foreground dark:text-foreground-dark">
                  {formatPrice(serviceFee, currency)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text variant="muted">Estimated Shipping</Text>
                <Text className="text-foreground dark:text-foreground-dark">
                  {formatPrice(estimatedShipping, currency)}
                </Text>
              </View>
            </View>

            <View className="pt-3 border-t border-border/30 dark:border-border-dark/30 flex-row justify-between items-center">
              <Text className="font-medium text-foreground dark:text-foreground-dark">
                Total
              </Text>
              <Text className="text-xl font-serif font-semibold text-foreground dark:text-foreground-dark">
                {formatPrice(total, currency)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Place Order Button */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-background dark:bg-background-dark border-t border-border/30 dark:border-border-dark/30 px-4 pb-8 pt-4"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder || !canPlaceOrder}
          className={`py-4 rounded-2xl flex-row items-center justify-center gap-2 ${
            canPlaceOrder && !isPlacingOrder
              ? "bg-primary dark:bg-primary-dark"
              : "bg-primary/50 dark:bg-primary-dark/50"
          }`}
        >
          {isPlacingOrder ? (
            <>
              <ActivityIndicator size="small" color={isDark ? "#1A1614" : "#FAF8F5"} />
              <Text className="text-base font-semibold text-primary-foreground dark:text-primary-dark-foreground">
                Placing Order...
              </Text>
            </>
          ) : (
            <>
              <Check size={20} color={isDark ? "#1A1614" : "#FAF8F5"} />
              <Text className="text-base font-semibold text-primary-foreground dark:text-primary-dark-foreground">
                Pay with M-Pesa ({formatPrice(total, currency)})
              </Text>
            </>
          )}
        </TouchableOpacity>

        {!canPlaceOrder && !isPlacingOrder && (
          <Text variant="caption" className="text-center mt-2">
            {!isAddressValid()
              ? "Please fill in all required shipping fields"
              : "Please enter a valid M-Pesa phone number"}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

// ──── Helper: Form Field ────
interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "phone-pad" | "email-address";
  isDark: boolean;
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  isDark,
}: FormFieldProps) {
  return (
    <View>
      <Text variant="caption" className="mb-1">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? "#8C8078" : "#9C948A"}
        keyboardType={keyboardType}
        autoCorrect={false}
        style={{
          backgroundColor: isDark ? "#1A1614" : "#FAF8F5",
          borderWidth: 1,
          borderColor: isDark ? "rgba(139,121,107,0.3)" : "rgba(139,121,107,0.25)",
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          color: isDark ? "#F5EFE8" : "#2D2926",
        }}
      />
    </View>
  );
}
