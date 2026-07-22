import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Camera, User, Zap } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCredits } from "@/lib/hooks/useCredits";
import { CreditsModal } from "@/components/credits/CreditsModal";
import { useTheme } from "@/lib/contexts/ThemeContext";
import Toast from "react-native-toast-message";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export function ProfileHeader() {
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const { total, freeRemaining, freePerWeek, isLow } = useCredits();
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { isDark } = useTheme();

  const generateUploadUrl = useMutation(
    api.users.mutations.generateProfileImageUploadUrl,
  );
  const updateProfileImage = useMutation(api.users.mutations.updateProfileImage);

  const uploadPhoto = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      const type = asset.mimeType || "image/jpeg";
      if (!ALLOWED_TYPES.includes(type)) {
        Toast.show({ type: "error", text1: "Only JPG and PNG images are allowed" });
        return;
      }
      if ((asset.fileSize || 0) > MAX_FILE_SIZE) {
        Toast.show({ type: "error", text1: "Image exceeds the 10MB limit" });
        return;
      }

      setIsUploading(true);
      try {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": type },
          body: blob,
        });
        if (!result.ok) throw new Error("Upload failed");
        const { storageId } = await result.json();

        await updateProfileImage({ storageId });
        Toast.show({ type: "success", text1: "Profile photo updated" });
      } catch (error) {
        console.error("[ProfileHeader] photo upload error:", error);
        Toast.show({ type: "error", text1: "Failed to update photo. Please try again." });
      } finally {
        setIsUploading(false);
      }
    },
    [generateUploadUrl, updateProfileImage],
  );

  const pickFromLibrary = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access in your device settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadPhoto(result.assets[0]);
  }, [uploadPhoto]);

  const takePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow camera access in your device settings.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadPhoto(result.assets[0]);
  }, [uploadPhoto]);

  const handleChangePhoto = useCallback(() => {
    Alert.alert("Change Profile Photo", undefined, [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [takePhoto, pickFromLibrary]);

  if (!currentUser) return null;

  return (
    <>
      <View className="flex-row items-center gap-4 mb-4">
        <View className="relative">
          <View className="w-20 h-20 rounded-full bg-surface dark:bg-surface-dark overflow-hidden items-center justify-center">
            {currentUser.profileImageUrl ? (
              <Image
                source={{ uri: currentUser.profileImageUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <User size={40} color={isDark ? "#8C8078" : "#9CA3AF"} />
            )}
          </View>
          <TouchableOpacity
            onPress={handleChangePhoto}
            disabled={isUploading}
            className="absolute bottom-0 right-0 w-7 h-7 bg-background dark:bg-surface-dark border border-border dark:border-border-dark rounded-full items-center justify-center shadow-sm"
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={isDark ? "#C4B8A8" : "#6B7280"} />
            ) : (
              <Camera size={14} color={isDark ? "#C4B8A8" : "#6B7280"} />
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-1">
          <Text className="text-2xl font-serif text-foreground dark:text-foreground-dark">
            {currentUser.firstName || currentUser.email?.split("@")[0] || "User"}
            {currentUser.lastName ? ` ${currentUser.lastName}` : ""}
          </Text>
          <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground">
            {currentUser.email}
          </Text>
          <View className="flex-row items-center gap-2 mt-2">
            {/* <View className="bg-secondary dark:bg-secondary-dark self-start px-3 py-1 rounded-full">
              <Text className="text-xs text-white dark:text-secondary-dark-foreground font-medium capitalize">
                {currentUser.subscriptionTier === "style_pass"
                  ? "Style Pass"
                  : currentUser.subscriptionTier === "vip"
                    ? "VIP"
                    : "Free Plan"}
              </Text>
            </View> */}
            {/* Credits Badge */}
            <TouchableOpacity
              onPress={() => setShowCreditsModal(true)}
              className="flex-row items-center gap-1 px-3 py-1 rounded-full"
              style={{
                backgroundColor: isLow
                  ? (isDark ? "#3B1C1C" : "#FEF2F2")
                  : (isDark ? "#1C3B2A" : "#F0FDF4"),
                borderWidth: 1,
                borderColor: isLow
                  ? (isDark ? "#7F1D1D" : "#FECACA")
                  : (isDark ? "#14532D" : "#BBF7D0"),
              }}
            >
              <Zap size={12} color={isLow ? "#EF4444" : "#22C55E"} />
              <Text
                className="text-xs font-semibold"
                style={{ color: isLow ? "#EF4444" : "#22C55E" }}
              >
                {total}
              </Text>
              <Text
                className="text-[10px]"
                style={{ color: isLow ? "#F87171" : "#4ADE80" }}
              >
                credits
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <CreditsModal
        visible={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />
    </>
  );
}
