import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import {
  Camera,
  Plus,
  Trash2,
  Star,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Toast from "react-native-toast-message";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useResponsiveLayout } from "@/lib/hooks/useResponsiveLayout";

const MAX_PHOTOS = 4;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

// Shape returned by getUserImages (the table row + a resolved storage URL).
interface UserImage {
  _id: Id<"user_images">;
  url: string | null;
  isPrimary: boolean;
  imageType?: string;
}

// Optimistic tile shown while an upload is in flight (mirrors the web app).
interface UploadingFile {
  id: string;
  uri: string;
  status: "uploading" | "error";
  error?: string;
}

// Spacing constants used to size the two-column grid. The profile screen wraps
// this tab in a `px-4` container (16px each side); the grid itself adds a 14px
// gap between the two columns and no horizontal padding.
const SCREEN_PADDING = 32; // px-4 on both sides of the parent (16 + 16)
const GRID_GAP = 14;

export function PhotosTab() {
  const { isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  // On iPad show all photos in a single wider row (up to 4 columns); on phones
  // keep the 2-column grid.
  const { columns } = useResponsiveLayout(2, 4);
  // Numeric tile dimensions. We deliberately compute an explicit width AND
  // height (3:4 portrait) instead of using `aspectRatio` + a percentage width —
  // that combo collapses the tiles to a thin strip once they wrap onto a second
  // row in a flex-wrap container. A concrete pixel height lays out reliably.
  const tileWidth =
    (windowWidth - SCREEN_PADDING - GRID_GAP * (columns - 1)) / columns;
  const tileHeight = (tileWidth * 4) / 3;
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [settingPrimaryId, setSettingPrimaryId] =
    useState<Id<"user_images"> | null>(null);

  const userImages = useQuery(api.userImages.queries.getUserImages) as
    | UserImage[]
    | undefined;
  const imageCount = userImages?.length ?? 0;

  const generateUploadUrl = useMutation(
    api.userImages.mutations.generateUploadUrl,
  );
  const saveUserImage = useMutation(api.userImages.mutations.saveUserImage);
  const deleteUserImage = useMutation(api.userImages.mutations.deleteUserImage);
  const setPrimaryImage = useMutation(api.userImages.mutations.setPrimaryImage);

  const canUpload = imageCount + uploadingFiles.length < MAX_PHOTOS;

  const validateAsset = (asset: ImagePicker.ImagePickerAsset): string | null => {
    const type = asset.mimeType || "image/jpeg";
    if (!ALLOWED_TYPES.includes(type)) return "Only JPG and PNG images are allowed";
    if ((asset.fileSize || 0) > MAX_FILE_SIZE) return "Image exceeds the 10MB limit";
    return null;
  };

  // Upload a single asset in the background; the optimistic tile is removed when
  // the real image arrives via the reactive query (success) or marked on error.
  const uploadAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset, tempId: string, isFirst: boolean) => {
      try {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": asset.mimeType || "image/jpeg" },
          body: blob,
        });
        if (!result.ok) throw new Error("Upload failed");
        const { storageId } = await result.json();

        await saveUserImage({
          storageId,
          filename: asset.fileName || "photo.jpg",
          contentType: asset.mimeType || "image/jpeg",
          sizeBytes: asset.fileSize || 0,
          imageType: "full_body",
          isPrimary: isFirst,
        });

        setUploadingFiles((prev) => prev.filter((f) => f.id !== tempId));
        Toast.show({ type: "success", text1: "Photo uploaded!" });
      } catch (error) {
        console.error("Upload error:", error);
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? { ...f, status: "error" as const, error: "Upload failed" }
              : f,
          ),
        );
        Toast.show({ type: "error", text1: "Failed to upload photo" });
      }
    },
    [generateUploadUrl, saveUserImage],
  );

  const handlePickImage = useCallback(async () => {
    const remaining = MAX_PHOTOS - imageCount - uploadingFiles.length;
    if (remaining <= 0) {
      Toast.show({
        type: "error",
        text1: "Limit Reached",
        text2: `Maximum ${MAX_PHOTOS} photos allowed`,
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    const valid: { asset: ImagePicker.ImagePickerAsset; tempId: string }[] = [];
    result.assets.slice(0, remaining).forEach((asset, i) => {
      const error = validateAsset(asset);
      if (error) {
        Toast.show({ type: "error", text1: error });
        return;
      }
      valid.push({ asset, tempId: `temp-${Date.now()}-${i}` });
    });
    if (valid.length === 0) return;

    setUploadingFiles((prev) => [
      ...prev,
      ...valid.map(({ asset, tempId }) => ({
        id: tempId,
        uri: asset.uri,
        status: "uploading" as const,
      })),
    ]);

    valid.forEach(({ asset, tempId }, i) =>
      uploadAsset(asset, tempId, imageCount === 0 && i === 0),
    );
  }, [imageCount, uploadingFiles.length, uploadAsset]);

  const handleDelete = (id: Id<"user_images">) => {
    Alert.alert("Delete Photo?", "This photo will be permanently deleted.", [
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
    setSettingPrimaryId(id);
    try {
      await setPrimaryImage({ imageId: id });
      Toast.show({ type: "success", text1: "Primary photo updated" });
    } catch (e) {
      Toast.show({ type: "error", text1: "Failed to update" });
    } finally {
      setSettingPrimaryId(null);
    }
  };

  const dismissError = (tempId: string) =>
    setUploadingFiles((prev) => prev.filter((f) => f.id !== tempId));

  const borderNeutral = isDark ? "#3D3835" : "#E0D8CC";
  const accent = isDark ? "#C9A07A" : "#5C2A33";
  const muted = isDark ? "#8C8078" : "#9C948A";

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
      <View className="flex-row flex-wrap mb-8" style={{ gap: 14 }}>
        {/* Existing photos */}
        {userImages?.map((image: UserImage) => (
          <View
            key={image._id}
            style={{
              width: tileWidth,
              height: tileHeight,
              borderWidth: image.isPrimary ? 2 : 1,
              borderColor: image.isPrimary ? accent : borderNeutral,
            }}
            className="relative rounded-2xl overflow-hidden bg-surface dark:bg-surface-dark"
          >
            {image.url ? (
              <Image
                source={{ uri: image.url }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                recyclingKey={image._id}
              />
            ) : (
              <View style={StyleSheet.absoluteFill} className="items-center justify-center">
                <Camera size={22} color={isDark ? "#5C554F" : "#C4BDB3"} />
              </View>
            )}

            {image.isPrimary && (
              <View
                className="absolute top-2 left-2 bg-primary dark:bg-primary-dark px-2 py-1 rounded-full flex-row items-center shadow-sm"
                style={{ gap: 3 }}
              >
                <Star size={9} color={isDark ? "#1A1614" : "white"} fill={isDark ? "#1A1614" : "white"} />
                <Text className="text-primary-foreground dark:text-primary-dark-foreground text-[10px] font-bold font-sans">
                  Primary
                </Text>
              </View>
            )}

            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.65)"]}
              style={[StyleSheet.absoluteFill, { justifyContent: "flex-end" }]}
              pointerEvents="box-none"
            >
              <View className="flex-row justify-between items-end p-2.5">
                <View className="bg-black/40 px-1.5 py-0.5 rounded">
                  <Text className="text-white text-[10px] capitalize font-medium font-sans">
                    {image.imageType ? image.imageType.replace("_", " ") : "Full Body"}
                  </Text>
                </View>
                <View className="flex-row" style={{ gap: 6 }}>
                  {!image.isPrimary && (
                    <TouchableOpacity
                      onPress={() => handleSetPrimary(image._id)}
                      disabled={settingPrimaryId === image._id}
                      hitSlop={6}
                      className="bg-white/25 p-1.5 rounded-full"
                    >
                      {settingPrimaryId === image._id ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Star size={14} color="white" />
                      )}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDelete(image._id)}
                    hitSlop={6}
                    className="bg-red-500/85 p-1.5 rounded-full"
                  >
                    <Trash2 size={14} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>
        ))}

        {/* Uploading tiles (optimistic — instant local preview) */}
        {uploadingFiles.map((upload) => (
          <View
            key={upload.id}
            style={{
              width: tileWidth,
              height: tileHeight,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: upload.status === "error" ? "#B85C5C" : accent,
            }}
            className="relative rounded-2xl overflow-hidden bg-surface dark:bg-surface-dark"
          >
            <Image
              source={{ uri: upload.uri }}
              style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
              contentFit="cover"
            />
            <View
              style={StyleSheet.absoluteFill}
              className="items-center justify-center"
            >
              {upload.status === "uploading" ? (
                <>
                  <ActivityIndicator color="white" />
                  <Text className="text-white text-xs font-sans mt-2">
                    Uploading…
                  </Text>
                </>
              ) : (
                <>
                  <AlertCircle size={26} color="#F2B8B5" />
                  <Text className="text-white text-xs font-sans mt-1.5">
                    {upload.error || "Upload failed"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => dismissError(upload.id)}
                    className="flex-row items-center mt-2 px-3 py-1.5 bg-white/20 rounded-full"
                    style={{ gap: 4 }}
                  >
                    <X size={13} color="white" />
                    <Text className="text-white text-xs font-medium font-sans">
                      Remove
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ))}

        {/* Upload zone */}
        {canUpload && (
          <TouchableOpacity
            onPress={handlePickImage}
            activeOpacity={0.7}
            style={{ width: tileWidth, height: tileHeight, borderColor: borderNeutral }}
            className="rounded-2xl border-2 border-dashed items-center justify-center bg-surface dark:bg-surface-dark"
          >
            <View className="w-12 h-12 rounded-full bg-surface-alt dark:bg-surface-alt-dark items-center justify-center mb-2">
              <Plus size={22} color={muted} />
            </View>
            <Text className="text-sm font-medium text-foreground dark:text-foreground-dark font-sans">
              Add Photo
            </Text>
            <Text className="text-xs mt-1 font-sans" style={{ color: muted }}>
              {MAX_PHOTOS - imageCount - uploadingFiles.length} slots remaining
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tips */}
      <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4 rounded-2xl flex-row" style={{ gap: 12 }}>
        <Camera size={18} color={accent} style={{ marginTop: 2 }} />
        <View className="flex-1">
          <Text className="text-sm font-medium text-foreground dark:text-foreground-dark font-sans mb-1.5">
            Photo Tips
          </Text>
          {[
            "Use portrait photos for best try-on results",
            "Good lighting helps AI generate better images",
            "Neutral backgrounds work best",
            "Up to 4 photos, 10MB each (JPG/PNG)",
          ].map((tip) => (
            <Text
              key={tip}
              className="text-xs font-sans"
              style={{ color: muted, lineHeight: 18 }}
            >
              •  {tip}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
