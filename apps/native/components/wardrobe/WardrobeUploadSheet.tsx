import {
  Modal,
  View,
  TouchableOpacity,
  Pressable,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { Camera, Layers, ScanLine, CheckCircle, AlertCircle, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";

export interface WardrobeUploadSheetProps {
  visible: boolean;
  onClose: () => void;
  defaultSource?: "single_upload" | "closet_scan";
}

type UploadState = "idle" | "uploading" | "processing" | "done" | "error";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function WardrobeUploadSheet({
  visible,
  onClose,
  defaultSource,
}: WardrobeUploadSheetProps) {
  const { isDark } = useTheme();
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [itemsAdded, setItemsAdded] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [activeSource, setActiveSource] = useState<"single_upload" | "closet_scan" | null>(null);

  const generateUploadUrl = useMutation(api.wardrobe.mutations.generateUploadUrl);
  const processWardrobeUpload = useAction(api.wardrobe.actions.processWardrobeUpload);

  // Auto-trigger when defaultSource is provided
  useEffect(() => {
    if (visible && defaultSource) {
      handleSourcePress(defaultSource);
    }
    // Reset state on open
    if (visible) {
      setUploadState("idle");
      setItemsAdded(0);
      setErrorMessage(undefined);
      setActiveSource(null);
    }
  }, [visible]);

  const handleSourcePress = async (
    source: "single_upload" | "closet_scan",
    useCamera?: boolean
  ) => {
    setActiveSource(source);

    let result: ImagePicker.ImagePickerResult;
    try {
      if (useCamera || source === "closet_scan") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Camera Permission", "Camera access is required.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          allowsEditing: source === "single_upload",
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Gallery Permission", "Photo library access is required.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          allowsEditing: true,
        });
      }

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      await runUpload(asset.uri, source);
    } catch (err) {
      setErrorMessage("Failed to pick image. Please try again.");
      setUploadState("error");
    }
  };

  const runUpload = async (
    uri: string,
    source: "single_upload" | "closet_scan"
  ) => {
    setUploadState("uploading");

    try {
      // Step 1: get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: upload file
      const response = await fetch(uri);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = (await uploadResponse.json()) as { storageId: string };

      // Step 3: process with AI
      setUploadState("processing");
      const result = await processWardrobeUpload({
        storageId: storageId as any,
        source,
      });

      if (result.success) {
        setItemsAdded(result.itemCount);
        setUploadState("done");
      } else {
        setErrorMessage("Processing failed — please try again");
        setUploadState("error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setErrorMessage(msg);
      setUploadState("error");
    }
  };

  const reset = () => {
    setUploadState("idle");
    setItemsAdded(0);
    setErrorMessage(undefined);
    setActiveSource(null);
  };

  const bg = isDark ? "#252220" : "#FFFFFF";
  const textPrimary = isDark ? "#F5F0E8" : "#2D2926";
  const textSecondary = isDark ? "#C4B8A8" : "#6B635B";
  const border = isDark ? "#3D3835" : "#E0D8CC";
  const accent = isDark ? "#C9A07A" : "#5C2A33";
  const surface = isDark ? "#1A1614" : "#FAF8F5";

  const processingCopy: Record<"single_upload" | "closet_scan", { title: string; subtitle: string }> = {
    single_upload: {
      title: "Nima is identifying your item…",
      subtitle: "Removing background and tagging style details",
    },
    closet_scan: {
      title: "Nima is scanning your closet…",
      subtitle: "Isolating each item and removing backgrounds",
    },
  };

  const renderContent = () => {
    if (uploadState === "uploading" || uploadState === "processing") {
      const copy = processingCopy[activeSource ?? "single_upload"];
      return (
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color={accent} style={{ marginBottom: 20 }} />
          <Text style={[styles.statusTitle, { color: textPrimary }]}>{copy.title}</Text>
          <Text style={[styles.statusSubtitle, { color: textSecondary }]}>
            {copy.subtitle}
          </Text>
        </View>
      );
    }

    if (uploadState === "done") {
      return (
        <View style={styles.centeredContent}>
          <CheckCircle size={48} color={accent} style={{ marginBottom: 16 }} />
          <Text style={[styles.statusTitle, { color: textPrimary }]}>
            {itemsAdded} {itemsAdded === 1 ? "item" : "items"} added to your wardrobe
          </Text>
          <View style={styles.doneButtons}>
            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: border }]}
              onPress={reset}
            >
              <Text style={[styles.outlineBtnText, { color: textPrimary }]}>Add More</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accent }]}
              onPress={onClose}
            >
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (uploadState === "error") {
      return (
        <View style={styles.centeredContent}>
          <AlertCircle size={48} color="#E05A5A" style={{ marginBottom: 16 }} />
          <Text style={[styles.statusTitle, { color: textPrimary }]}>
            {errorMessage ?? "Something went wrong"}
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: accent, marginTop: 20 }]}
            onPress={reset}
          >
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Idle state: three source options
    return (
      <>
        <Text style={[styles.sheetTitle, { color: textPrimary }]}>
          Add to Wardrobe
        </Text>
        <Text style={[styles.sheetSubtitle, { color: textSecondary }]}>
          Upload items from your closet so Nima can style them for you
        </Text>

        {[
          {
            source: "single_upload" as const,
            useCamera: false,
            Icon: Camera,
            title: "Upload an Item",
            subtitle: "Select a photo from your gallery",
            tintBg: isDark ? "rgba(201,160,122,0.15)" : "rgba(92,42,51,0.1)",
            iconColor: accent,
          },
          {
            source: "closet_scan" as const,
            useCamera: true,
            Icon: Layers,
            title: "Scan My Closet",
            subtitle: "Take a photo of your open wardrobe",
            tintBg: isDark ? "rgba(201,160,122,0.1)" : "rgba(92,42,51,0.07)",
            iconColor: textSecondary,
          },
          {
            source: "single_upload" as const,
            useCamera: true,
            Icon: ScanLine,
            title: "Take a Picture",
            subtitle: "Photograph a single item",
            tintBg: isDark ? "rgba(201,160,122,0.15)" : "rgba(92,42,51,0.1)",
            iconColor: accent,
          },
        ].map(({ source, useCamera, Icon, title, subtitle, tintBg, iconColor }, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.optionRow, { borderColor: border }]}
            onPress={() => handleSourcePress(source, useCamera)}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: tintBg }]}>
              <Icon size={22} color={iconColor} />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: textPrimary }]}>{title}</Text>
              <Text style={[styles.optionSubtitle, { color: textSecondary }]}>{subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <View
        style={[
          styles.sheet,
          { backgroundColor: bg, maxHeight: SCREEN_HEIGHT * 0.7 },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: border }]} />

        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <X size={20} color={textSecondary} />
        </TouchableOpacity>

        <View style={styles.sheetContent}>{renderContent()}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "DMSans_400Regular",
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "DMSans_400Regular",
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "DMSans_400Regular",
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
  },
  centeredContent: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  doneButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "DMSans_400Regular",
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#FAF8F5",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "DMSans_400Regular",
  },
});
