import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Camera, Plus, Trash2, Star, Loader2 } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Toast from "react-native-toast-message";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/contexts/ThemeContext";

const MAX_PHOTOS = 4;

export function PhotosTab() {
  const [uploading, setUploading] = useState(false);
  const userImages = useQuery(api.userImages.queries.getUserImages);

  const generateUploadUrl = useMutation(
    api.userImages.mutations.generateUploadUrl,
  );
  const saveUserImage = useMutation(api.userImages.mutations.saveUserImage);
  const deleteUserImage = useMutation(api.userImages.mutations.deleteUserImage);
  const setPrimaryImage = useMutation(api.userImages.mutations.setPrimaryImage);

  const handlePickImage = async () => {
    if ((userImages?.length || 0) >= MAX_PHOTOS) {
      Toast.show({
        type: "error",
        text1: "Limit Reached",
        text2: `Maximum ${MAX_PHOTOS} photos allowed`,
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0]);
    }
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploading(true);
    try {
      // 1. Get upload URL
      const uploadUrl = await generateUploadUrl();

      // 2. Upload file
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": asset.mimeType || "image/jpeg",
        },
        body: blob,
      });

      if (!result.ok) throw new Error("Upload failed");
      const { storageId } = await result.json();

      // 3. Save record
      await saveUserImage({
        storageId,
        filename: asset.fileName || "photo.jpg",
        contentType: asset.mimeType || "image/jpeg",
        sizeBytes: asset.fileSize || 0,
        imageType: "full_body",
        isPrimary: (userImages?.length || 0) === 0,
      });

      Toast.show({ type: "success", text1: "Photo uploaded!" });
    } catch (error) {
      console.error(error);
      Toast.show({ type: "error", text1: "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id: Id<"user_images">) => {
    Alert.alert("Delete Photo", "Are you sure you want to delete this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteUserImage({ imageId: id });
            Toast.show({ type: "success", text1: "Photo deleted" });
          } catch (e) {
            Toast.show({ type: "error", text1: "Failed to delete" });
          }
        },
      },
    ]);
  };

  const handleSetPrimary = async (id: Id<"user_images">) => {
    try {
      await setPrimaryImage({ imageId: id });
      Toast.show({ type: "success", text1: "Primary photo updated" });
    } catch (e) {
      Toast.show({ type: "error", text1: "Failed to update" });
    }
  };

  const { isDark } = useTheme();

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      {/* Header */}
      <View className="mb-6">
        <Text className="text-xl font-serif font-medium text-foreground dark:text-foreground-dark mb-2">
          Your Photos
        </Text>
        <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground leading-5 font-sans">
          These photos are used for virtual try-on. The primary photo (marked
          with a star) is used by default.
        </Text>
      </View>

      {/* Photo Grid */}
      <View className="flex-row flex-wrap gap-4 mb-8">
        {userImages?.map((image) => (
          <View
            key={image._id}
            className={`w-[47%] aspect-[3/4] relative rounded-xl overflow-hidden bg-surface dark:bg-surface-dark border ${
              image.isPrimary ? "border-primary dark:border-primary-dark" : "border-border dark:border-border-dark"
            }`}
          >
            {image.url && (
              <Image
                source={{ uri: image.url }}
                className="w-full h-full"
                contentFit="cover"
              />
            )}

            {/* Primary Badge */}
            {image.isPrimary && (
              <View className="absolute top-2 left-2 bg-primary dark:bg-primary-dark px-2 py-1 rounded-full flex-row items-center space-x-1 shadow-sm">
                <Star size={10} color={isDark ? "#1A1614" : "white"} fill={isDark ? "#1A1614" : "white"} />
                <Text className="text-primary-foreground dark:text-primary-dark-foreground text-[10px] font-bold font-sans">
                  Primary
                </Text>
              </View>
            )}

            {/* Gradient Overlay for Actions & Label */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.6)"]}
              className="absolute bottom-0 left-0 right-0 p-3 pt-8 flex-row justify-between items-end"
            >
              <View>
                <View className="bg-black/40 px-1.5 py-0.5 rounded mb-1">
                  <Text className="text-white text-[10px] capitalize font-medium font-sans">
                    {image.imageType
                      ? image.imageType.replace("_", " ")
                      : "Full Body"}
                  </Text>
                </View>
              </View>

              <View className="flex-row space-x-2">
                {!image.isPrimary && (
                  <TouchableOpacity
                    onPress={() => handleSetPrimary(image._id)}
                    className="bg-white/20 p-2 rounded-full backdrop-blur-md"
                  >
                    <Star size={14} color="white" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleDelete(image._id)}
                  className="bg-red-500/80 p-2 rounded-full backdrop-blur-md"
                >
                  <Trash2 size={14} color="white" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        ))}

        {/* Upload Button */}
        {(userImages?.length || 0) < MAX_PHOTOS && (
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={uploading}
            className="w-[47%] aspect-[3/4] rounded-xl border-2 border-dashed border-border dark:border-border-dark items-center justify-center bg-surface dark:bg-surface-dark"
          >
            {uploading ? (
              <ActivityIndicator color={isDark ? "#C9A07A" : "#C08D5D"} />
            ) : (
              <>
                <View className="w-10 h-10 rounded-full bg-surface-alt dark:bg-surface-alt-dark items-center justify-center mb-2">
                  <Plus size={20} className="text-muted-foreground dark:text-muted-dark-foreground" />
                </View>
                <Text className="text-sm font-medium text-foreground dark:text-foreground-dark font-sans">
                  Add Photo
                </Text>
                <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mt-1 font-sans">
                  {MAX_PHOTOS - (userImages?.length || 0)} slots remaining
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Tips Section - Themed */}
      <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4 rounded-xl flex-row space-x-3">
        <Camera size={20} className="text-primary dark:text-primary-dark" />
        <View className="flex-1">
          <Text className="text-sm font-medium text-foreground dark:text-foreground-dark font-sans">
            Photo Tips
          </Text>
          <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mt-1 font-sans">
            • Use full-body photos for best try-on results
          </Text>
          <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground font-sans">
            • Good lighting helps AI generate better images
          </Text>
          <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground font-sans">
            • Neutral backgrounds work best
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
