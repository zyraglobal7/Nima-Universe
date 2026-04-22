import { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ApparelItem } from "./ApparelItemCard";
import * as Haptics from "expo-haptics";
import { formatPrice } from "@/lib/utils/format";
import { Text } from "@/components/ui/Text";
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import {
  X,
  Sparkles,
  Check,
  AlertCircle,
  Share2,
  Globe,
  Users,
  Link as LinkIcon,
  ExternalLink,
  Heart,
  Trash2,
} from "lucide-react-native";
import { useCallback, useMemo, useRef } from "react";
import * as Clipboard from "expo-clipboard";
import { CreditsModal } from "@/components/credits/CreditsModal";
import { useTheme } from "@/lib/contexts/ThemeContext";

/* ─── Types ─── */

interface CreateLookSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: ApparelItem[];
  onClearSelection: () => void;
}

type GenerationStatus =
  | "idle"
  | "creating"
  | "generating"
  | "completed"
  | "failed";

/* ─── Component ─── */

export function CreateLookSheet({
  isOpen,
  onClose,
  selectedItems,
  onClearSelection,
}: CreateLookSheetProps) {
  const router = useRouter();
  const { isDark } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [lookId, setLookId] = useState<Id<"looks"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    null,
  );
  const [sharingOption, setSharingOption] = useState<
    "private" | "friends" | "public"
  >("private");
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  const createLookFromItems = useMutation(
    api.looks.mutations.createLookFromSelectedItems,
  );
  const updateLookVisibility = useMutation(
    api.looks.mutations.updateLookVisibility,
  );
  const saveLookMutation = useMutation(api.looks.mutations.saveLook);
  const discardLookMutation = useMutation(api.looks.mutations.discardLook);

  // Poll for look status when we have a lookId
  const lookStatus = useQuery(
    api.looks.queries.getLookGenerationStatus,
    lookId ? { lookId } : "skip",
  );

  // Calculate total price
  const totalPrice = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const currency = selectedItems[0]?.currency || "KES";

  // Snap points — fixed height so BottomSheetScrollView can scroll properly
  const snapPoints = useMemo(() => ["95%"], []);

  // Watch for look completion
  useEffect(() => {
    if (lookStatus?.status === "completed" && lookId) {
      setStatus("completed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (lookStatus.imageUrl) {
        setGeneratedImageUrl(lookStatus.imageUrl);
      }
    } else if (lookStatus?.status === "failed") {
      setStatus("failed");
      setError(lookStatus.errorMessage || "Look generation failed");
    } else if (
      lookStatus?.status === "processing" ||
      lookStatus?.status === "pending"
    ) {
      setStatus("generating");
    }
  }, [lookStatus, lookId]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setStatus("idle");
      setLookId(null);
      setError(null);
      setGeneratedImageUrl(null);
      setSharingOption("private");
      setIsSaved(false);
      setIsSaving(false);
      setIsDiscarding(false);
    }
  }, [isOpen]);

  // Handle sheet open/close
  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  /* ─── Actions ─── */

  const handleGenerateLook = async () => {
    if (selectedItems.length < 2 || selectedItems.length > 6) {
      setError("Please select 2-6 items to create a look");
      return;
    }

    setStatus("creating");
    setError(null);

    try {
      const result = await createLookFromItems({
        itemIds: selectedItems.map((item) => item._id),
      });

      if (result.success && result.lookId) {
        setLookId(result.lookId);
        setStatus("generating");
      } else if (result.error === "insufficient_credits") {
        setStatus("idle");
        setShowCreditsModal(true);
      } else {
        setStatus("failed");
        setError(result.error || "Failed to create look");
      }
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleSaveLook = async () => {
    if (!lookId) return;

    setIsSaving(true);
    try {
      const result = await saveLookMutation({ lookId });
      if (result.success) {
        setIsSaved(true);
        Alert.alert("Success", "Look saved to your lookbooks!");
      } else {
        Alert.alert("Error", result.error || "Failed to save look");
      }
    } catch {
      Alert.alert("Error", "Failed to save look");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardLook = async () => {
    if (!lookId) return;

    setIsDiscarding(true);
    try {
      const result = await discardLookMutation({ lookId });
      if (result.success) {
        Alert.alert("Done", "Look discarded.");
        onClearSelection();
        onClose();
      } else {
        Alert.alert("Error", result.error || "Failed to discard look");
      }
    } catch {
      Alert.alert("Error", "Failed to discard look");
    } finally {
      setIsDiscarding(false);
    }
  };

  const handleShare = async (option: "private" | "friends" | "public") => {
    if (!lookId) return;

    setSharingOption(option);

    try {
      await updateLookVisibility({
        lookId,
        isPublic: option === "public",
        sharedWithFriends: option === "friends" || option === "public",
      });
      Alert.alert(
        "Done",
        option === "public"
          ? "Look shared publicly!"
          : option === "friends"
            ? "Look shared with friends!"
            : "Look set to private",
      );
    } catch {
      Alert.alert("Error", "Failed to update sharing settings");
    }
  };

  const handleCopyLink = async () => {
    if (!lookId) return;
    const url = `https://www.shopnima.ai/look/${lookId}`;
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert("Copied", "Link copied to clipboard!");
    } catch {
      Alert.alert("Error", "Failed to copy link");
    }
  };

  const handleViewLook = () => {
    onClearSelection();
    onClose();
    if (lookId) {
      router.push(`/look/${lookId}` as any);
    }
  };

  const handleGoToLookbooks = () => {
    onClearSelection();
    onClose();
    router.push("/(tabs)/lookbooks" as any);
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      />
    ),
    [],
  );

  if (!isOpen) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: isDark ? "#1A1614" : "#FAF8F5",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{ backgroundColor: isDark ? "#706B63" : "#9C948A", width: 48 }}
    >
      <BottomSheetView style={{ flex: 1 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-border dark:border-border-dark">
          <View className="flex-1">
            <Text className="text-xl font-semibold text-foreground dark:text-foreground-dark">
              {status === "completed"
                ? "Your Look is Ready! ✨"
                : "Create Your Look"}
            </Text>
            <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mt-0.5">
              {status === "completed"
                ? "Share it with the world or keep it private"
                : `${selectedItems.length} items selected`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (status === "completed") onClearSelection();
              onClose();
            }}
            disabled={status === "creating" || status === "generating"}
            className="p-2 rounded-full ml-2"
          >
            <X size={20} color="#9C948A" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <BottomSheetScrollView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 16 }} contentContainerStyle={{ paddingBottom: 120 }}>
          {status === "completed" ? (
            <View className="gap-6">
              {/* Generated look image */}
              <View
                className="rounded-2xl overflow-hidden border border-border dark:border-border-dark"
                style={{ aspectRatio: 3 / 4 }}
              >
                {generatedImageUrl ? (
                  <Image
                    source={{ uri: generatedImageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark">
                    <ActivityIndicator size="large" color="#A67C52" />
                    <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mt-3">
                      Loading your look...
                    </Text>
                  </View>
                )}
                {/* Success badge */}
                <View
                  className={`absolute top-3 right-3 px-3 py-1.5 ${
                    isSaved
                      ? "bg-primary/90 dark:bg-primary-dark/90"
                      : "bg-green-500/90"
                  } rounded-full flex-row items-center gap-1.5`}
                >
                  {isSaved ? (
                    <>
                      <Heart size={16} color="#FFF" fill="#FFF" />
                      <Text className="text-sm font-medium text-white">
                        Saved!
                      </Text>
                    </>
                  ) : (
                    <>
                      <Check size={16} color="#FFF" />
                      <Text className="text-sm font-medium text-white">
                        Generated!
                      </Text>
                    </>
                  )}
                </View>
              </View>

              {/* Save / Discard */}
              {!isSaved && (
                <View className="gap-3">
                  <Text className="font-medium text-foreground dark:text-foreground-dark text-center">
                    What would you like to do?
                  </Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={handleSaveLook}
                      disabled={isSaving || isDiscarding}
                      className="flex-1 py-4 rounded-xl bg-primary dark:bg-primary-dark items-center justify-center flex-row gap-2"
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Heart size={20} color="#FFF" />
                      )}
                      <Text className="font-medium text-primary-foreground dark:text-primary-dark-foreground">
                        {isSaving ? "Saving..." : "Save"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleDiscardLook}
                      disabled={isSaving || isDiscarding}
                      className="flex-1 py-4 rounded-xl border-2 border-border dark:border-border-dark items-center justify-center flex-row gap-2"
                    >
                      {isDiscarding ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : (
                        <Trash2 size={20} color="#3B3530" />
                      )}
                      <Text className="font-medium text-foreground dark:text-foreground-dark">
                        {isDiscarding ? "Discarding..." : "Discard"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Share options – after save */}
              {isSaved && (
                <View className="gap-3">
                  <View className="flex-row items-center gap-2">
                    <Share2 size={20} color="#A67C52" />
                    <Text className="font-medium text-foreground dark:text-foreground-dark">
                      Share Your Look
                    </Text>
                  </View>
                  <View className="flex-row gap-2">
                    {(
                      [
                        {
                          key: "private" as const,
                          label: "Private",
                          icon: <Text className="text-xl">🔒</Text>,
                        },
                        {
                          key: "friends" as const,
                          label: "Friends",
                          icon: <Users size={20} color="#9C948A" />,
                        },
                        {
                          key: "public" as const,
                          label: "Public",
                          icon: <Globe size={20} color="#9C948A" />,
                        },
                      ] as const
                    ).map((opt) => (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => handleShare(opt.key)}
                        className={`flex-1 p-3 rounded-xl border-2 items-center gap-1.5 ${
                          sharingOption === opt.key
                            ? "border-primary dark:border-primary-dark bg-primary/10 dark:bg-primary-dark/10"
                            : "border-border dark:border-border-dark"
                        }`}
                      >
                        {opt.icon}
                        <Text className="text-xs font-medium text-foreground dark:text-foreground-dark">
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Copy Link */}
                  <TouchableOpacity
                    onPress={handleCopyLink}
                    className="py-3 px-4 rounded-xl border border-border dark:border-border-dark flex-row items-center justify-center gap-2"
                  >
                    <LinkIcon size={16} color="#9C948A" />
                    <Text className="text-sm text-foreground dark:text-foreground-dark">
                      Copy Link
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View>
              {/* Selected items grid */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                {selectedItems.map((item) => (
                  <View
                    key={item._id}
                    style={{ width: "30%", aspectRatio: 3 / 4 }}
                    className="rounded-xl overflow-hidden border border-border dark:border-border-dark"
                  >
                    {item.primaryImageUrl ? (
                      <Image
                        source={{ uri: item.primaryImageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    ) : (
                      <View className="flex-1 bg-surface-alt dark:bg-surface-alt-dark items-center justify-center">
                        <Text className="text-2xl text-muted-foreground/40 dark:text-muted-dark-foreground/40">
                          {item.category.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: 8,
                        backgroundColor: "rgba(0,0,0,0.5)",
                      }}
                    >
                      <Text className="text-xs text-white" numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Price summary */}
              <View className="flex-row items-center justify-between p-4 bg-surface dark:bg-surface-dark rounded-xl mb-4">
                <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground">
                  Total price
                </Text>
                <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
                  {formatPrice(totalPrice, currency)}
                </Text>
              </View>

              {/* Status messages */}
              {status === "creating" && (
                <View className="flex-row items-center justify-center gap-3 p-4 bg-surface dark:bg-surface-dark rounded-xl mb-4">
                  <ActivityIndicator size="small" color="#A67C52" />
                  <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground">
                    Creating your look...
                  </Text>
                </View>
              )}

              {status === "generating" && (
                <View className="flex-row items-center justify-center gap-3 p-4 bg-primary/10 dark:bg-primary-dark/10 rounded-xl mb-4">
                  <Sparkles size={20} color="#A67C52" />
                  <Text className="text-sm text-primary dark:text-primary-dark">
                    Nima is styling your look... This may take a moment
                  </Text>
                </View>
              )}

              {status === "failed" && error && (
                <View className="flex-row items-center gap-3 p-4 bg-destructive/10 dark:bg-destructive-dark/10 rounded-xl mb-4">
                  <AlertCircle size={20} color="#DC2626" />
                  <Text className="text-sm text-destructive dark:text-destructive-dark flex-1">
                    {error}
                  </Text>
                </View>
              )}
            </View>
          )}
        </BottomSheetScrollView>

        {/* Footer */}
        <View className="px-6 py-4 border-t border-border dark:border-border-dark bg-background dark:bg-background-dark">
          {status === "completed" && isSaved ? (
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleGoToLookbooks}
                className="flex-1 py-4 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark items-center justify-center"
              >
                <Text className="font-medium text-foreground dark:text-foreground-dark">
                  Go to Lookbooks
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleViewLook}
                className="flex-1 py-4 rounded-2xl bg-primary dark:bg-primary-dark items-center justify-center flex-row gap-2"
              >
                <ExternalLink size={20} color="#FFF" />
                <Text className="font-medium text-primary-foreground dark:text-primary-dark-foreground">
                  View Look
                </Text>
              </TouchableOpacity>
            </View>
          ) : status === "completed" && !isSaved ? (
            <Text className="text-center text-xs text-muted-foreground dark:text-muted-dark-foreground">
              Save or discard your look to continue
            </Text>
          ) : (
            <View>
              <TouchableOpacity
                onPress={handleGenerateLook}
                disabled={
                  status === "creating" ||
                  status === "generating" ||
                  selectedItems.length < 2
                }
                className={`w-full py-4 rounded-2xl items-center justify-center flex-row gap-2 ${
                  status === "creating" || status === "generating"
                    ? "bg-primary/50 dark:bg-primary-dark/50"
                    : "bg-primary dark:bg-primary-dark"
                }`}
              >
                {status === "creating" || status === "generating" ? (
                  <>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text className="font-medium text-primary-foreground dark:text-primary-dark-foreground">
                      Generating...
                    </Text>
                  </>
                ) : status === "failed" ? (
                  <>
                    <Sparkles size={20} color="#FFF" />
                    <Text className="font-medium text-primary-foreground dark:text-primary-dark-foreground">
                      Try Again
                    </Text>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} color="#FFF" />
                    <Text className="font-medium text-primary-foreground dark:text-primary-dark-foreground">
                      Generate Look
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {selectedItems.length < 2 && (
                <Text className="text-center text-xs text-muted-foreground dark:text-muted-dark-foreground mt-2">
                  Select at least 2 items to create a look
                </Text>
              )}

              {selectedItems.length > 6 && (
                <Text className="text-center text-xs text-destructive dark:text-destructive-dark mt-2">
                  Maximum 6 items per look
                </Text>
              )}
            </View>
          )}
        </View>
      </BottomSheetView>

      {/* Credits Modal */}
      <CreditsModal
        visible={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />
    </BottomSheet>
  );
}
