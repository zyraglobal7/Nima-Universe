import { useState, useEffect, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import {
  X,
  CreditCard,
  Sparkles,
  Check,
  AlertCircle,
  Phone,
  Zap,
} from "lucide-react-native";
import { useCredits } from "@/lib/hooks/useCredits";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/* ─── Types ─── */

interface CreditsModalProps {
  visible: boolean;
  onClose: () => void;
}

type ModalStep = "packages" | "phone" | "processing" | "success" | "failed";

/* ─── Component ─── */

export function CreditsModal({ visible, onClose }: CreditsModalProps) {
  const { isDark } = useTheme();
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  const {
    freeRemaining,
    purchased,
    total,
    freePerWeek,
    packages,
    buyCredits,
    resetPurchase,
    isPurchasing,
    purchaseError,
    purchaseStatus,
  } = useCredits();

  const [step, setStep] = useState<ModalStep>("packages");
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null,
  );
  const [phoneNumber, setPhoneNumber] = useState("");

  // Pre-fill phone if user has one saved
  useEffect(() => {
    if (currentUser?.phoneNumber && !phoneNumber) {
      setPhoneNumber(currentUser.phoneNumber);
    }
  }, [currentUser?.phoneNumber]);

  // Watch purchase status
  useEffect(() => {
    if (purchaseStatus === "completed") {
      setStep("success");
    } else if (purchaseStatus === "failed") {
      setStep("failed");
    }
  }, [purchaseStatus]);

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);

  /* ─── Handlers ─── */

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackageId(packageId);
    setStep("phone");
  };

  const handlePurchase = async () => {
    if (!selectedPackageId || !phoneNumber.trim()) return;

    setStep("processing");
    const result = await buyCredits(selectedPackageId, phoneNumber.trim());

    if (!result.success) {
      setStep("failed");
    }
    // If success, the webhook callback will move to "success" via purchaseStatus
  };

  const handleClose = () => {
    // Reset everything on close
    setStep("packages");
    setSelectedPackageId(null);
    resetPurchase();
    onClose();
  };

  const handleBack = () => {
    if (step === "phone") {
      setStep("packages");
      setSelectedPackageId(null);
    }
  };

  const handleRetry = () => {
    setStep("packages");
    setSelectedPackageId(null);
    resetPurchase();
  };

  /* ─── Computed ─── */

  const accent = isDark ? "#D4A574" : "#5C2A33";
  const mutedText = isDark ? "#706B63" : "#9C948A";
  const bg = isDark ? "#1A1614" : "#FAF8F5";
  const cardBg = isDark ? "#2D2926" : "#F5F0EB";
  const borderColor = isDark ? "#3D3630" : "#E0D8CC";

  /* ─── Render Step: Packages ─── */

  const renderPackages = () => (
    <View>
      {/* Credit Balance */}
      <View
        className="rounded-2xl p-4 mb-5"
        style={{ backgroundColor: cardBg }}
      >
        <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mb-1">
          Your Balance
        </Text>
        <View className="flex-row items-baseline gap-2">
          <Text
            className="text-3xl font-serif font-bold text-foreground dark:text-foreground-dark"
          >
            {total}
          </Text>
          <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground">
            credits
          </Text>
        </View>
        <View className="flex-row items-center gap-3 mt-2">
          <View className="flex-row items-center gap-1">
            <Sparkles size={12} color={accent} />
            <Text className="text-xs" style={{ color: accent }}>
              {freeRemaining}/{freePerWeek} free this week
            </Text>
          </View>
          {purchased > 0 && (
            <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
              + {purchased} purchased
            </Text>
          )}
        </View>
      </View>

      {/* Packages */}
      <Text className="text-sm font-medium text-foreground dark:text-foreground-dark mb-3">
        Buy Credits
      </Text>
      <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mb-4">
        1 credit = 1 look • Paid via M-Pesa
      </Text>

      {packages.map((pkg) => (
        <TouchableOpacity
          key={pkg.id}
          onPress={() => handleSelectPackage(pkg.id)}
          className="flex-row items-center justify-between rounded-2xl p-4 mb-3"
          style={{
            backgroundColor: cardBg,
            borderWidth: pkg.popular ? 2 : 1,
            borderColor: pkg.popular ? accent : borderColor,
          }}
        >
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
                {pkg.credits} Credits
              </Text>
              {pkg.popular && (
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: accent }}
                >
                  <Text className="text-[10px] font-bold text-white">
                    POPULAR
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mt-0.5">
              KES {pkg.priceKes / pkg.credits} per credit
            </Text>
          </View>
          <View className="items-end">
            <Text
              className="text-lg font-bold"
              style={{ color: accent }}
            >
              KES {pkg.priceKes.toLocaleString()}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  /* ─── Render Step: Phone Input ─── */

  const renderPhoneInput = () => (
    <View>
      <TouchableOpacity onPress={handleBack} className="mb-4">
        <Text className="text-sm" style={{ color: accent }}>
          ← Back to packages
        </Text>
      </TouchableOpacity>

      {/* Selected package summary */}
      {selectedPackage && (
        <View
          className="rounded-2xl p-4 mb-5"
          style={{ backgroundColor: cardBg }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-base font-semibold text-foreground dark:text-foreground-dark">
                {selectedPackage.credits} Credits
              </Text>
              <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                via M-Pesa STK Push
              </Text>
            </View>
            <Text
              className="text-xl font-bold"
              style={{ color: accent }}
            >
              KES {selectedPackage.priceKes.toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {/* Phone input */}
      <Text className="text-sm font-medium text-foreground dark:text-foreground-dark mb-2">
        M-Pesa Phone Number
      </Text>
      <View
        className="flex-row items-center rounded-xl px-4 h-14 mb-2"
        style={{
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor: borderColor,
        }}
      >
        <Phone size={18} color={mutedText} />
        <TextInput
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="+254712345678"
          placeholderTextColor={mutedText}
          keyboardType="phone-pad"
          className="flex-1 ml-3 text-base text-foreground dark:text-foreground-dark"
          style={{ fontFamily: "DMSans" }}
        />
      </View>
      <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mb-6">
        You will receive an M-Pesa STK push on this number. Enter your PIN to
        confirm.
      </Text>

      {/* Purchase Error */}
      {purchaseError && (
        <View className="flex-row items-center gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl mb-4">
          <AlertCircle size={16} color="#EF4444" />
          <Text className="text-sm text-red-600 dark:text-red-400 flex-1">
            {purchaseError}
          </Text>
        </View>
      )}

      {/* Buy button */}
      <TouchableOpacity
        onPress={handlePurchase}
        disabled={!phoneNumber.trim() || isPurchasing}
        className="h-14 rounded-xl items-center justify-center flex-row gap-2"
        style={{
          backgroundColor:
            !phoneNumber.trim() || isPurchasing ? `${accent}80` : accent,
        }}
      >
        {isPurchasing ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <CreditCard size={18} color="#FFF" />
        )}
        <Text className="text-white font-semibold text-base">
          {isPurchasing ? "Initiating..." : "Pay with M-Pesa"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  /* ─── Render Step: Processing ─── */

  const renderProcessing = () => (
    <View className="items-center py-8">
      <ActivityIndicator size="large" color={accent} />
      <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark mt-4">
        Waiting for M-Pesa...
      </Text>
      <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mt-2 text-center px-4">
        Check your phone for the M-Pesa STK push. Enter your PIN to complete the
        payment.
      </Text>
      {selectedPackage && (
        <View
          className="rounded-2xl p-4 mt-6 w-full"
          style={{ backgroundColor: cardBg }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground">
              Amount
            </Text>
            <Text className="text-base font-semibold text-foreground dark:text-foreground-dark">
              KES {selectedPackage.priceKes.toLocaleString()}
            </Text>
          </View>
          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground">
              Credits
            </Text>
            <Text className="text-base font-semibold text-foreground dark:text-foreground-dark">
              {selectedPackage.credits}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  /* ─── Render Step: Success ─── */

  const renderSuccess = () => (
    <View className="items-center py-8">
      <View
        className="w-16 h-16 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: `${accent}20` }}
      >
        <Check size={32} color={accent} />
      </View>
      <Text className="text-xl font-serif font-bold text-foreground dark:text-foreground-dark">
        Credits Added! 🎉
      </Text>
      {selectedPackage && (
        <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mt-2">
          {selectedPackage.credits} credits have been added to your account.
        </Text>
      )}
      <TouchableOpacity
        onPress={handleClose}
        className="h-12 px-8 rounded-xl items-center justify-center mt-6"
        style={{ backgroundColor: accent }}
      >
        <Text className="text-white font-semibold">Start Styling</Text>
      </TouchableOpacity>
    </View>
  );

  /* ─── Render Step: Failed ─── */

  const renderFailed = () => (
    <View className="items-center py-8">
      <View className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 items-center justify-center mb-4">
        <AlertCircle size={32} color="#EF4444" />
      </View>
      <Text className="text-xl font-serif font-bold text-foreground dark:text-foreground-dark">
        Payment Failed
      </Text>
      <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mt-2 text-center px-4">
        {purchaseError ||
          "The payment could not be processed. Please try again."}
      </Text>
      <View className="flex-row gap-3 mt-6">
        <TouchableOpacity
          onPress={handleClose}
          className="h-12 px-6 rounded-xl items-center justify-center"
          style={{
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: borderColor,
          }}
        >
          <Text className="font-medium text-foreground dark:text-foreground-dark">
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleRetry}
          className="h-12 px-6 rounded-xl items-center justify-center"
          style={{ backgroundColor: accent }}
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /* ─── Render Content ─── */

  const renderContent = () => {
    switch (step) {
      case "packages":
        return renderPackages();
      case "phone":
        return renderPhoneInput();
      case "processing":
        return renderProcessing();
      case "success":
        return renderSuccess();
      case "failed":
        return renderFailed();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <Pressable
          onPress={handleClose}
          className="flex-1 bg-black/60 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-background dark:bg-background-dark rounded-t-3xl max-h-[85%]"
          >
            {/* Handle bar */}
            <View className="items-center pt-3 pb-1">
              <View
                className="w-12 h-1.5 rounded-full"
                style={{ backgroundColor: borderColor }}
              />
            </View>

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pt-2 pb-4">
              <View className="flex-row items-center gap-2">
                <Zap size={20} color={accent} />
                <Text className="text-xl font-serif font-semibold text-foreground dark:text-foreground-dark">
                  {step === "packages"
                    ? "Get Credits"
                    : step === "phone"
                      ? "Payment"
                      : step === "processing"
                        ? "Processing"
                        : step === "success"
                          ? "Done!"
                          : "Oops"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: cardBg }}
              >
                <X size={18} color={isDark ? "#E8E2DA" : "#2D2926"} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              className="px-6 pb-8"
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {renderContent()}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

