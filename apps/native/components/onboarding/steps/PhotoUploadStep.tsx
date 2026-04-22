import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StepProps, ValidatedImage } from "../types";

const MAX_PHOTOS = 4;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadingPhoto {
  id: string;
  uri: string;
  status: "uploading" | "validating" | "error";
  error?: string;
}

export function PhotoUploadStep({
  formData,
  updateFormData,
  onNext,
}: StepProps) {
  const [uploadingPhotos, setUploadingPhotos] = useState<UploadingPhoto[]>([]);

  const generateUploadUrl = useMutation(
    api.userImages.mutations.generateOnboardingUploadUrl
  );
  const saveUserImage = useMutation(
    api.userImages.mutations.saveOnboardingImage
  );
  const validateImage = useAction(
    api.userImages.actions.validateOnboardingImage
  );

  // Auto-load images uploaded in a prior session
  const existingImages = useQuery(api.userImages.queries.getOnboardingImages, {
    onboardingToken: formData.onboardingToken,
  });

  const hasLoaded = existingImages !== undefined;
  const alreadyAutoLoaded =
    formData.uploadedImages.length > 0 || uploadingPhotos.length > 0;

  // Auto-populate from a previous session (once only)
  if (hasLoaded && !alreadyAutoLoaded && existingImages.length > 0) {
    const loaded: ValidatedImage[] = existingImages.map((img) => ({
      imageId: img._id,
      storageId: img.storageId,
      filename: img.filename || "photo.jpg",
      previewUrl: img.url || "",
      validationStatus: "valid" as const,
    }));
    updateFormData({ uploadedImages: loaded });
  }

  const totalPhotos = formData.uploadedImages.length + uploadingPhotos.length;

  const pickAndUploadImages = useCallback(async () => {
    const remaining = MAX_PHOTOS - totalPhotos;
    if (remaining <= 0) {
      Alert.alert("Maximum photos", `You can upload up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photo library."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    for (const asset of result.assets) {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      setUploadingPhotos((prev) => [
        ...prev,
        { id: tempId, uri: asset.uri, status: "uploading" },
      ]);

      try {
        // 1. Get upload URL
        const uploadUrl = await generateUploadUrl({
          onboardingToken: formData.onboardingToken,
        });

        // 2. Upload file
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        if (blob.size > MAX_FILE_SIZE) {
          setUploadingPhotos((prev) =>
            prev.map((p) =>
              p.id === tempId
                ? { ...p, status: "error", error: "File too large (max 10MB)" }
                : p
            )
          );
          continue;
        }

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type || "image/jpeg" },
          body: blob,
        });
        const { storageId } = (await uploadResponse.json()) as {
          storageId: string;
        };

        // 3. Save record
        const imageId = await saveUserImage({
          storageId: storageId as never,
          filename: asset.fileName || "photo.jpg",
          onboardingToken: formData.onboardingToken,
          imageType: "full_body",
        });

        // 4. Validate (switch indicator to "validating")
        setUploadingPhotos((prev) =>
          prev.map((p) =>
            p.id === tempId ? { ...p, status: "validating" } : p
          )
        );

        const validation = await validateImage({
          storageId: storageId as never,
        });

        // 5. Add to uploaded list with validation result
        const newImage: ValidatedImage = {
          imageId: imageId as string,
          storageId,
          filename: asset.fileName || "photo.jpg",
          previewUrl: asset.uri,
          validationStatus: validation.valid ? "valid" : "invalid",
          validationMessage: validation.message,
        };
        updateFormData({
          uploadedImages: [...formData.uploadedImages, newImage],
        });

        setUploadingPhotos((prev) => prev.filter((p) => p.id !== tempId));
      } catch (err) {
        console.error("Upload error:", err);
        setUploadingPhotos((prev) =>
          prev.map((p) =>
            p.id === tempId
              ? { ...p, status: "error", error: "Upload failed. Tap to retry." }
              : p
          )
        );
      }
    }
  }, [
    totalPhotos,
    generateUploadUrl,
    saveUserImage,
    validateImage,
    formData,
    updateFormData,
  ]);

  const removePhoto = (imageId: string) => {
    updateFormData({
      uploadedImages: formData.uploadedImages.filter(
        (img) => img.imageId !== imageId
      ),
    });
  };

  const removeFailedUpload = (tempId: string) => {
    setUploadingPhotos((prev) => prev.filter((p) => p.id !== tempId));
  };

  const clearAll = () => {
    updateFormData({ uploadedImages: [] });
    setUploadingPhotos([]);
  };

  const validCount = formData.uploadedImages.filter(
    (img) => img.validationStatus === "valid"
  ).length;

  const canContinue = validCount >= 1;

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="px-6 pt-4 pb-6">
        <Text className="text-3xl font-serif font-semibold text-foreground mb-1">
          Be the model{"\n"}in every look
        </Text>
        <Text className="text-sm text-muted-foreground">
          Upload 1–4 photos so Nima can style outfits on you
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Tips card */}
        <View className="bg-surface/80 border border-border/50 rounded-2xl p-4 flex-row gap-3">
          <Text className="text-base">📸</Text>
          <View className="flex-1 gap-1">
            <Text className="text-sm font-medium text-foreground">
              Tips for great results
            </Text>
            <Text className="text-xs text-muted-foreground">
              Full body photo · Clear face · Simple background
            </Text>
          </View>
        </View>

        {/* Photo grid */}
        <View className="flex-row flex-wrap gap-3">
          {formData.uploadedImages.map((img) => (
            <View
              key={img.imageId}
              className="overflow-hidden bg-surface border border-border"
              style={{ width: "47%", aspectRatio: 3 / 4, borderRadius: 16 }}
            >
              <Image
                source={{ uri: img.previewUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />

              {/* Validation badge */}
              {img.validationStatus === "valid" && (
                <View
                  className="absolute top-2 left-2 w-7 h-7 rounded-full bg-green-500 items-center justify-center"
                  style={{ elevation: 2 }}
                >
                  <Text className="text-white text-xs font-bold">✓</Text>
                </View>
              )}
              {img.validationStatus === "invalid" && (
                <View className="absolute inset-0 bg-black/50 items-center justify-center px-3">
                  <Text className="text-white text-xs text-center">
                    {img.validationMessage ?? "Photo not usable"}
                  </Text>
                </View>
              )}

              {/* Remove button */}
              <Pressable
                onPress={() => removePhoto(img.imageId)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 items-center justify-center"
              >
                <Text className="text-white text-xs font-bold">✕</Text>
              </Pressable>
            </View>
          ))}

          {/* Uploading / validating placeholders */}
          {uploadingPhotos.map((photo) => (
            <View
              key={photo.id}
              className="overflow-hidden bg-surface border border-border"
              style={{ width: "47%", aspectRatio: 3 / 4, borderRadius: 16 }}
            >
              <Image
                source={{ uri: photo.uri }}
                style={{ width: "100%", height: "100%", opacity: 0.4 }}
                resizeMode="cover"
              />
              <View className="absolute inset-0 items-center justify-center gap-2">
                {photo.status === "error" ? (
                  <>
                    <Text className="text-red-400 text-xs text-center px-2">
                      {photo.error}
                    </Text>
                    <Pressable
                      onPress={() => removeFailedUpload(photo.id)}
                      className="bg-red-500/20 px-3 py-1 rounded-full"
                    >
                      <Text className="text-red-400 text-xs font-medium">
                        Remove
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <ActivityIndicator size="large" color="#5C2A33" />
                    <Text className="text-white text-xs">
                      {photo.status === "validating"
                        ? "Checking photo..."
                        : "Uploading..."}
                    </Text>
                  </>
                )}
              </View>
            </View>
          ))}

          {/* Add photo button */}
          {totalPhotos < MAX_PHOTOS && (
            <Pressable
              onPress={pickAndUploadImages}
              className="border-2 border-dashed border-border items-center justify-center bg-surface/50"
              style={({ pressed }) => ({
                width: "47%",
                aspectRatio: 3 / 4,
                borderRadius: 16,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text className="text-3xl text-muted-foreground mb-1">+</Text>
              <Text className="text-xs text-muted-foreground">Add Photo</Text>
              <Text className="text-[10px] text-muted-foreground mt-0.5">
                {totalPhotos}/{MAX_PHOTOS}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Start fresh link */}
        {formData.uploadedImages.length > 0 && (
          <Pressable onPress={clearAll} className="items-center py-1">
            <Text className="text-xs text-muted-foreground underline">
              Start fresh
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Footer CTA */}
      <View className="bg-background border-t border-border/50 p-4">
        <Pressable
          onPress={onNext}
          disabled={!canContinue}
          className={`w-full py-4 rounded-full items-center ${canContinue ? "bg-primary" : "bg-primary/40"}`}
          style={({ pressed }) => ({
            opacity: canContinue && pressed ? 0.85 : 1,
          })}
        >
          <Text className="text-primary-foreground text-base font-semibold tracking-wide">
            {canContinue ? "Continue" : "Upload a photo to continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
