import { useState, useEffect, useCallback, useRef } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  Linking,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useCredits } from "@/lib/hooks/useCredits";
import {
  X,
  Zap,
  BookMarked,
  RotateCcw,
  ImageIcon,
  RefreshCcw,
  Camera,
} from "lucide-react-native";
import { router } from "expo-router";

type FlowStep =
  | "checking"
  | "no_photo"
  | "no_credits"
  | "capture"
  | "uploading"
  | "generating"
  | "result"
  | "failed";

interface QuickTryOnModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function QuickTryOnModal({ isVisible, onClose }: QuickTryOnModalProps) {
  const { isDark } = useTheme();
  const { total: totalCredits, isLoading: creditsLoading } = useCredits();

  const primaryImage = useQuery(api.userImages.queries.getPrimaryImage);
  const [permission, requestPermission] = useCameraPermissions();

  const generateUploadUrl = useMutation(
    api.quickTryOns.mutations.generateQuickCaptureUploadUrl
  );
  const createQuickTryOn = useMutation(
    api.quickTryOns.mutations.createQuickTryOn
  );
  const saveToLookbook = useMutation(
    api.quickTryOns.mutations.saveQuickTryOnToLookbook
  );

  const [step, setStep] = useState<FlowStep>("checking");
  const [cameraFacing, setCameraFacing] = useState<"back" | "front">("back");
  const [isTaking, setIsTaking] = useState(false);
  const [quickTryOnId, setQuickTryOnId] = useState<Id<"quick_try_ons"> | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedToLookbook, setSavedToLookbook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const hasRequestedPermission = useRef(false);

  // Poll for try-on result
  const tryOnResult = useQuery(
    api.quickTryOns.queries.getQuickTryOn,
    quickTryOnId ? { quickTryOnId } : "skip"
  );

  // Gate check — only advances from 'checking'
  useEffect(() => {
    if (!isVisible) return;
    if (step !== "checking") return;
    if (primaryImage === undefined || creditsLoading) return;

    if (!primaryImage) {
      setStep("no_photo");
    } else if (totalCredits <= 0) {
      setStep("no_credits");
    } else {
      setStep("capture");
    }
  }, [isVisible, step, primaryImage, totalCredits, creditsLoading]);

  // Auto-request camera permission once when we enter the capture step
  useEffect(() => {
    if (step !== "capture") return;
    if (hasRequestedPermission.current) return;
    if (permission === null) return; // still resolving
    if (!permission.granted && permission.canAskAgain) {
      hasRequestedPermission.current = true;
      requestPermission();
    }
  }, [step, permission, requestPermission]);

  // Watch generation result
  useEffect(() => {
    if (!tryOnResult) return;
    if (tryOnResult.status === "completed" && tryOnResult.resultUrl) {
      setStep("result");
    } else if (tryOnResult.status === "failed") {
      setErrorMessage(
        tryOnResult.errorMessage ?? "Generation failed. Please try again."
      );
      setStep("failed");
    }
  }, [tryOnResult]);

  const resetState = useCallback(() => {
    setStep("checking");
    setCameraFacing("back");
    setIsTaking(false);
    setQuickTryOnId(null);
    setCapturedImageUri(null);
    setErrorMessage(null);
    setSavedToLookbook(false);
    setIsSaving(false);
    hasRequestedPermission.current = false;
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleRetry = useCallback(() => {
    setStep("capture");
    setQuickTryOnId(null);
    setCapturedImageUri(null);
    setErrorMessage(null);
  }, []);

  // Shared upload + create logic used by both camera and gallery
  const uploadAndCreate = useCallback(
    async (uri: string) => {
      setCapturedImageUri(uri);
      setStep("uploading");

      try {
        const uploadUrl = await generateUploadUrl();

        const response = await fetch(uri);
        const blob = await response.blob();

        if (blob.size > MAX_FILE_SIZE) {
          setErrorMessage("Image is too large (max 10MB). Please choose a smaller photo.");
          setStep("failed");
          return;
        }

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type || "image/jpeg" },
          body: blob,
        });
        const { storageId } = (await uploadResponse.json()) as {
          storageId: string;
        };

        setStep("generating");
        const result = await createQuickTryOn({
          capturedItemStorageId: storageId as Id<"_storage">,
        });

        if (!result.success) {
          if (result.error === "insufficient_credits") {
            setStep("no_credits");
          } else {
            setErrorMessage(result.error);
            setStep("failed");
          }
          return;
        }

        setQuickTryOnId(result.quickTryOnId);
        // Stays on 'generating' — useEffect above watches tryOnResult
      } catch (err) {
        console.error("[QuickTryOn] upload error:", err);
        setErrorMessage("Something went wrong. Please try again.");
        setStep("failed");
      }
    },
    [generateUploadUrl, createQuickTryOn]
  );

  const handleTakePicture = useCallback(async () => {
    if (!cameraRef.current || isTaking) return;
    setIsTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri) throw new Error("No photo captured");
      await uploadAndCreate(photo.uri);
    } catch (err) {
      console.error("[QuickTryOn] take picture error:", err);
      setErrorMessage("Failed to take photo. Please try again.");
      setStep("failed");
    } finally {
      setIsTaking(false);
    }
  }, [isTaking, uploadAndCreate]);

  const pickFromGallery = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access in your device settings."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadAndCreate(result.assets[0].uri);
  }, [uploadAndCreate]);

  const handleSaveToLookbook = useCallback(async () => {
    if (!quickTryOnId || isSaving) return;
    setIsSaving(true);
    try {
      await saveToLookbook({ quickTryOnId });
      setSavedToLookbook(true);
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [quickTryOnId, saveToLookbook, isSaving]);

  // ── Colour tokens ──────────────────────────────────────────────────────────
  const bg = isDark ? "#1A1614" : "#FAF8F5";
  const surface = isDark ? "#252220" : "#F5F0E8";
  const border = isDark ? "#3D3835" : "#E0D8CC";
  const textColor = isDark ? "#F0EAE0" : "#2C2420";
  const muted = isDark ? "#8C8078" : "#6B635B";
  const primary = isDark ? "#C9A07A" : "#5C2A33";
  const primaryFg = "#FAF8F5";

  // Whether we're in the camera step and permission is loading
  const cameraGranted = permission?.granted === true;
  const canAskCamera = permission?.canAskAgain !== false;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "overFullScreen"}
      onRequestClose={handleClose}
    >
      {/* ── Camera capture — full-screen, no standard header ─────────────── */}
      {step === "capture" ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]}>
          {cameraGranted ? (
            <>
              {/* Live camera */}
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing={cameraFacing}
              />

              {/* Shutter flash overlay */}
              {isTaking && (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: "rgba(255,255,255,0.35)" },
                  ]}
                  pointerEvents="none"
                />
              )}

              {/* Top bar — close */}
              <SafeAreaView
                edges={["top"]}
                style={styles.cameraTopBar}
              >
                <Pressable
                  onPress={handleClose}
                  hitSlop={12}
                  style={styles.cameraCloseBtn}
                >
                  <X size={20} color="#fff" />
                </Pressable>

                {/* Credit pill */}
                <View style={styles.creditPill}>
                  <Zap size={12} color="#fff" />
                  <Text style={styles.creditText}>
                    {totalCredits} credit{totalCredits !== 1 ? "s" : ""}
                  </Text>
                </View>
              </SafeAreaView>

              {/* Bottom controls */}
              <SafeAreaView edges={["bottom"]} style={styles.cameraBottomBar}>
                <View style={styles.cameraControls}>
                  {/* Gallery — bottom left */}
                  <Pressable
                    onPress={pickFromGallery}
                    style={styles.galleryBtn}
                    hitSlop={8}
                  >
                    <ImageIcon size={26} color="#fff" />
                    <Text style={styles.galleryLabel}>Gallery</Text>
                  </Pressable>

                  {/* Shutter — center */}
                  <Pressable
                    onPress={handleTakePicture}
                    disabled={isTaking}
                    style={({ pressed }) => [
                      styles.shutterOuter,
                      { opacity: pressed || isTaking ? 0.75 : 1 },
                    ]}
                  >
                    <View style={styles.shutterInner} />
                  </Pressable>

                  {/* Flip camera — bottom right */}
                  <Pressable
                    onPress={() =>
                      setCameraFacing((f) => (f === "back" ? "front" : "back"))
                    }
                    style={styles.flipBtn}
                    hitSlop={8}
                  >
                    <RefreshCcw size={26} color="#fff" />
                    <Text style={styles.galleryLabel}>Flip</Text>
                  </Pressable>
                </View>
              </SafeAreaView>
            </>
          ) : (
            // ── Permission not granted ──────────────────────────────────────
            <SafeAreaView
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                padding: 36,
                gap: 20,
              }}
            >
              {/* Close */}
              <Pressable
                onPress={handleClose}
                hitSlop={12}
                style={styles.permissionClose}
              >
                <X size={20} color="#fff" />
              </Pressable>

              <Camera size={72} color="rgba(255,255,255,0.7)" />

              <Text style={styles.permissionTitle}>
                {canAskCamera
                  ? "Camera Access Needed"
                  : "Camera Access Denied"}
              </Text>
              <Text style={styles.permissionBody}>
                {canAskCamera
                  ? "Allow camera access so you can point at clothing items and try them on instantly."
                  : "Camera permission was denied. Enable it in your device settings to use Quick Try-On."}
              </Text>

              {canAskCamera ? (
                <Pressable
                  onPress={() => {
                    hasRequestedPermission.current = false;
                    requestPermission();
                  }}
                  style={styles.permissionBtn}
                >
                  <Text style={styles.permissionBtnText}>Allow Camera</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => Linking.openSettings()}
                  style={styles.permissionBtn}
                >
                  <Text style={styles.permissionBtnText}>Open Settings</Text>
                </Pressable>
              )}

              {/* Gallery fallback */}
              <Pressable onPress={pickFromGallery} style={{ marginTop: 4 }}>
                <Text style={styles.galleryFallback}>
                  Or pick from gallery instead
                </Text>
              </Pressable>
            </SafeAreaView>
          )}
        </View>
      ) : (
        // ── All other steps — standard modal with header ──────────────────
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingTop: Platform.OS === "android" ? 16 : 8,
              paddingBottom: 14,
              borderBottomWidth: 0.5,
              borderBottomColor: border,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "600",
                  color: textColor,
                  fontFamily: "CormorantGaramond_600SemiBold",
                }}
              >
                Quick Try-On
              </Text>
              <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                1 credit per try-on
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              style={{
                padding: 8,
                borderRadius: 20,
                backgroundColor: surface,
              }}
            >
              <X size={18} color={muted} />
            </Pressable>
          </View>

          {/* ── Checking ─────────────────────────────────────────────────── */}
          {step === "checking" && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color={primary} />
            </View>
          )}

          {/* ── No primary photo ─────────────────────────────────────────── */}
          {step === "no_photo" && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
              <Text style={{ fontSize: 56 }}>👤</Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "600",
                  color: textColor,
                  textAlign: "center",
                  fontFamily: "CormorantGaramond_600SemiBold",
                }}
              >
                Profile Photo Required
              </Text>
              <Text style={{ fontSize: 14, color: muted, textAlign: "center", lineHeight: 22 }}>
                Upload a full-body photo in your profile so Nima can show
                outfits on you.
              </Text>
              <Pressable
                onPress={() => { handleClose(); router.push("/(tabs)/profile"); }}
                style={({ pressed }) => ({
                  backgroundColor: primary,
                  paddingVertical: 14,
                  paddingHorizontal: 32,
                  borderRadius: 30,
                  marginTop: 8,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ color: primaryFg, fontWeight: "600", fontSize: 15 }}>
                  Go to Profile
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── No credits ───────────────────────────────────────────────── */}
          {step === "no_credits" && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
              <Text style={{ fontSize: 56 }}>✨</Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "600",
                  color: textColor,
                  textAlign: "center",
                  fontFamily: "CormorantGaramond_600SemiBold",
                }}
              >
                No Credits Left
              </Text>
              <Text style={{ fontSize: 14, color: muted, textAlign: "center", lineHeight: 22 }}>
                Quick Try-On uses 1 credit per generation. Get more credits to
                continue.
              </Text>
              <Pressable
                onPress={() => { handleClose(); router.push("/(tabs)/profile"); }}
                style={({ pressed }) => ({
                  backgroundColor: primary,
                  paddingVertical: 14,
                  paddingHorizontal: 32,
                  borderRadius: 30,
                  marginTop: 8,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ color: primaryFg, fontWeight: "600", fontSize: 15 }}>
                  Get Credits
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── Uploading / generating ───────────────────────────────────── */}
          {(step === "uploading" || step === "generating") && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 24 }}>
              {capturedImageUri && (
                <Image
                  source={{ uri: capturedImageUri }}
                  style={{ width: 130, height: 170, borderRadius: 14, opacity: 0.65 }}
                  resizeMode="cover"
                />
              )}
              <ActivityIndicator size="large" color={primary} />
              <View style={{ alignItems: "center", gap: 6 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "600",
                    color: textColor,
                    textAlign: "center",
                    fontFamily: "CormorantGaramond_600SemiBold",
                  }}
                >
                  {step === "uploading" ? "Uploading..." : "Creating your try-on..."}
                </Text>
                <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>
                  {step === "generating"
                    ? "AI is generating a photorealistic result.\nThis usually takes ~20 seconds."
                    : "Preparing your image..."}
                </Text>
              </View>
            </View>
          )}

          {/* ── Result ───────────────────────────────────────────────────── */}
          {step === "result" && tryOnResult?.resultUrl && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 36 }}
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={{ uri: tryOnResult.resultUrl }}
                style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 18 }}
                resizeMode="cover"
              />

              {savedToLookbook ? (
                <View
                  style={{
                    backgroundColor: surface,
                    borderRadius: 14,
                    padding: 16,
                    alignItems: "center",
                    gap: 4,
                    borderWidth: 0.5,
                    borderColor: border,
                  }}
                >
                  <Text style={{ color: primary, fontWeight: "600", fontSize: 15 }}>
                    Saved to Quick Try Ons ✓
                  </Text>
                  <Text style={{ color: muted, fontSize: 13 }}>
                    Find it in your Lookbooks under "Quick Try Ons"
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={handleSaveToLookbook}
                  disabled={isSaving}
                  style={({ pressed }) => ({
                    backgroundColor: primary,
                    borderRadius: 30,
                    paddingVertical: 15,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                    opacity: pressed || isSaving ? 0.8 : 1,
                  })}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={primaryFg} />
                  ) : (
                    <BookMarked size={18} color={primaryFg} />
                  )}
                  <Text style={{ color: primaryFg, fontWeight: "600", fontSize: 15 }}>
                    {isSaving ? "Saving..." : "Save to Quick Try Ons"}
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={handleClose}
                style={({ pressed }) => ({
                  backgroundColor: surface,
                  borderRadius: 30,
                  paddingVertical: 15,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ color: muted, fontWeight: "500", fontSize: 15 }}>
                  {savedToLookbook ? "Done" : "Discard"}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleRetry}
                style={{ alignItems: "center", paddingVertical: 6 }}
              >
                <Text style={{ color: muted, fontSize: 13, textDecorationLine: "underline" }}>
                  Try another item
                </Text>
              </Pressable>
            </ScrollView>
          )}

          {/* ── Failed ───────────────────────────────────────────────────── */}
          {step === "failed" && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
              <Text style={{ fontSize: 56 }}>⚠️</Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "600",
                  color: textColor,
                  textAlign: "center",
                  fontFamily: "CormorantGaramond_600SemiBold",
                }}
              >
                Generation Failed
              </Text>
              <Text style={{ fontSize: 14, color: muted, textAlign: "center", lineHeight: 22 }}>
                {errorMessage ?? "Something went wrong. Please try again."}
              </Text>
              <Pressable
                onPress={handleRetry}
                style={({ pressed }) => ({
                  backgroundColor: primary,
                  paddingVertical: 14,
                  paddingHorizontal: 32,
                  borderRadius: 30,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  opacity: pressed ? 0.8 : 1,
                  marginTop: 8,
                })}
              >
                <RotateCcw size={16} color={primaryFg} />
                <Text style={{ color: primaryFg, fontWeight: "600", fontSize: 15 }}>
                  Try Again
                </Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      )}
    </Modal>
  );
}

// ── Camera UI styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cameraTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  cameraCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  creditPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  creditText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  cameraBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  cameraControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 36,
    paddingVertical: 28,
  },
  galleryBtn: {
    alignItems: "center",
    gap: 6,
    width: 64,
  },
  galleryLabel: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  flipBtn: {
    alignItems: "center",
    gap: 6,
    width: 64,
  },
  // Permission screen styles
  permissionClose: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 24,
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  permissionBody: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 30,
    marginTop: 8,
  },
  permissionBtnText: {
    color: "#1A1614",
    fontWeight: "700",
    fontSize: 15,
  },
  galleryFallback: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    textDecorationLine: "underline",
  },
});
