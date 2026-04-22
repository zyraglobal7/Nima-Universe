import { useState } from "react";
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { X, Sparkles } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface RecommendationCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recommendation: any;
  onDismiss?: () => void;
  compact?: boolean;
}

export function RecommendationCard({ recommendation, onDismiss, compact = false }: RecommendationCardProps) {
  const { isDark } = useTheme();
  const deleteRecommendation = useMutation(api.recommendations.mutations.deleteRecommendation);
  const createLookFromSelected = useMutation(api.looks.mutations.createLookFromSelectedItems);
  const createLookFromWardrobe = useMutation(api.looks.mutations.createLookFromWardrobeItems);
  const [isGenerating, setIsGenerating] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = recommendation.items ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wardrobeItems: any[] = recommendation.wardrobeItems ?? [];

  const allImages = [
    ...items.slice(0, 4).map((item: any) => ({
      url: item.imageUrl as string | null,
      label: (item.name ?? item.description ?? item.category) as string,
    })),
    ...wardrobeItems.slice(0, 2).map((wi: any) => ({
      url: wi.imageUrl as string | null,
      label: (wi.description ?? wi.category) as string,
    })),
  ];

  const handleDelete = () => {
    Alert.alert(
      "Delete recommendation?",
      "This will remove it from your feed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            onDismiss?.(); // Optimistic local removal
            try {
              await deleteRecommendation({
                recommendationId: recommendation._id,
              });
            } catch {
              // Already removed locally — backend error is non-fatal
            }
          },
        },
      ]
    );
  };

  const handleTryLook = async () => {
    if (isGenerating) return;

    const wardrobeIds = wardrobeItems.map((wi: any) => wi._id);
    const itemIds = items.map((i: any) => i._id);

    setIsGenerating(true);
    try {
      const useWardrobe = recommendation.isWardrobeMix && wardrobeIds.length >= 2;
      const result = useWardrobe
        ? await createLookFromWardrobe({
            wardrobeItemIds: wardrobeIds,
            occasion: recommendation.occasion,
            recommendationId: recommendation._id,
          })
        : await createLookFromSelected({
            itemIds,
            occasion: recommendation.occasion,
          });

      if (result.success && result.lookId) {
        router.push(`/fitting/${result.lookId}` as any);
      } else if (result.error === "insufficient_credits") {
        Alert.alert(
          "Out of credits",
          "You need credits to generate a try-on image."
        );
      } else {
        Alert.alert("Try-on failed", result.error ?? "Could not start try-on.");
      }
    } catch (err) {
      Alert.alert(
        "Try-on failed",
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const surface = isDark ? "#252220" : "#F5F0E8";
  const border = isDark ? "#3D3835" : "#E0D8CC";
  const textPrimary = isDark ? "#F5F0E8" : "#2D2926";
  const textSecondary = isDark ? "#C4B8A8" : "#6B635B";
  const accent = isDark ? "#C9A07A" : "#5C2A33";
  const chipBg = isDark ? "rgba(201,160,122,0.15)" : "rgba(92,42,51,0.08)";

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: surface, borderColor: border },
        compact && styles.cardCompact,
      ]}
    >
      {/* Delete button */}
      <TouchableOpacity
        onPress={handleDelete}
        style={[styles.dismissBtn, { backgroundColor: isDark ? "#3D3835" : "#E0D8CC" }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Delete recommendation"
      >
        <X size={14} color={textSecondary} />
      </TouchableOpacity>

      {/* Wardrobe mix chip */}
      {recommendation.isWardrobeMix && (
        <View style={[styles.wardrobeChip, { backgroundColor: chipBg }]}>
          <Sparkles size={11} color={accent} />
          <Text style={[styles.wardrobeChipText, { color: accent }]}>
            From your wardrobe ✓
          </Text>
        </View>
      )}

      {/* Item images */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.imagesRow}
      >
        {allImages.map((img, idx) => (
          <View key={idx} style={styles.imageWrapper}>
            {img.url ? (
              <Image
                source={{ uri: img.url }}
                style={styles.itemImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.itemImagePlaceholder, { backgroundColor: isDark ? "#3D3835" : "#E0D8CC" }]}>
                <Text style={{ fontSize: 28 }}>👗</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Occasion + comment */}
      <View style={styles.meta}>
        <View style={[styles.occasionPill, { backgroundColor: chipBg }]}>
          <Text style={[styles.occasionText, { color: textSecondary }]}>
            {recommendation.occasion.toUpperCase()}
          </Text>
        </View>

        <Text
          style={[styles.comment, { color: textPrimary }]}
          numberOfLines={3}
        >
          {recommendation.nimaComment}
        </Text>
      </View>

      {/* Action button */}
      <TouchableOpacity
        style={[
          styles.tryBtn,
          { backgroundColor: accent, opacity: isGenerating ? 0.7 : 1 },
        ]}
        onPress={handleTryLook}
        activeOpacity={0.8}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <ActivityIndicator color="#FAF8F5" size="small" />
        ) : (
          <Text style={styles.tryBtnText}>Try This Look</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    overflow: "hidden",
  },
  cardCompact: {
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 12,
  },
  dismissBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  wardrobeChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
    gap: 4,
  },
  wardrobeChipText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "DMSans_400Regular",
  },
  imagesRow: {
    gap: 8,
    paddingRight: 8,
    paddingBottom: 2,
  },
  imageWrapper: {
    borderRadius: 12,
    overflow: "hidden",
  },
  itemImage: {
    width: 120,
    height: 160,
    borderRadius: 12,
  },
  itemImagePlaceholder: {
    width: 120,
    height: 160,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    marginTop: 12,
    gap: 6,
  },
  occasionPill: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  occasionText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    fontFamily: "DMSans_400Regular",
  },
  comment: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "CormorantGaramond_600SemiBold",
    fontStyle: "italic",
  },
  tryBtn: {
    marginTop: 14,
    borderRadius: 60,
    paddingVertical: 12,
    alignItems: "center",
  },
  tryBtnText: {
    color: "#FAF8F5",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "DMSans_400Regular",
  },
});
