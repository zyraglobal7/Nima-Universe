import { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { LookbookItemGrid } from "@/components/lookbooks/LookbookItemGrid";
import {
  ChevronLeft,
  Share2,
  Trash2,
  Edit3,
  Check,
  Lock,
  Globe,
  Sparkles,
  AlertCircle,
} from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import * as Clipboard from "expo-clipboard";
import { ShareOptionsModal } from "@/components/ui/ShareOptionsModal";

export default function LookbookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);

  const lookbookId = id as Id<"lookbooks">;

  // Queries
  const lookbook = useQuery(api.lookbooks.queries.getLookbook, {
    lookbookId,
  });
  const lookbookItems = useQuery(
    api.lookbooks.queries.getLookbookItemsWithDetails,
    { lookbookId },
  );

  // Mutations
  const deleteLookbook = useMutation(api.lookbooks.mutations.deleteLookbook);
  const updateLookbook = useMutation(api.lookbooks.mutations.updateLookbook);

  const shareUrl = lookbook?.shareToken
    ? `https://www.shopnima.ai/lookbook/shared/${lookbook.shareToken}`
    : `https://www.shopnima.ai/lookbook/${id}`;
  const shareTitle = lookbook?.name || "This Lookbook";

  const handleDelete = () => {
    Alert.alert(
      "Delete Lookbook",
      "Are you sure you want to delete this lookbook? Items will not be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteLookbook({ lookbookId });
              router.back();
            } catch {
              Alert.alert("Error", "Failed to delete lookbook");
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleStartEdit = () => {
    if (lookbook) {
      setEditName(lookbook.name);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    try {
      await updateLookbook({ lookbookId, name: editName.trim() });
      setIsEditing(false);
    } catch {
      Alert.alert("Error", "Failed to update lookbook");
    }
  };

  /* ─── Loading / Error ─── */

  if (lookbook === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark items-center justify-center">
        <ActivityIndicator
          size="large"
          color={isDark ? "#C9A07A" : "#A67C52"}
        />
      </SafeAreaView>
    );
  }

  if (lookbook === null) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark items-center justify-center px-6">
        <AlertCircle size={40} color={isDark ? "#C9A07A" : "#A67C52"} />
        <Text className="text-lg font-medium text-foreground dark:text-foreground-dark mt-4">
          Lookbook not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 px-6 py-3 bg-primary dark:bg-primary-dark rounded-full"
        >
          <Text className="text-primary-foreground dark:text-primary-dark-foreground font-medium">
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="px-4 pb-4 bg-background dark:bg-background-dark border-b border-border/30 dark:border-border-dark/30"
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-surface dark:bg-surface-dark items-center justify-center"
          >
            <ChevronLeft size={22} color={isDark ? "#E8E2DA" : "#2D2926"} />
          </TouchableOpacity>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleStartEdit}
              className="w-10 h-10 rounded-full bg-surface dark:bg-surface-dark items-center justify-center"
            >
              <Edit3 size={18} color={isDark ? "#E8E2DA" : "#2D2926"} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowShareModal(true)}
              className="w-10 h-10 rounded-full bg-surface dark:bg-surface-dark items-center justify-center"
            >
              <Share2 size={18} color={isDark ? "#E8E2DA" : "#2D2926"} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              disabled={isDeleting}
              className="w-10 h-10 rounded-full bg-surface dark:bg-surface-dark items-center justify-center"
            >
              {isDeleting ? (
                <ActivityIndicator
                  size="small"
                  color={isDark ? "#F87171" : "#DC2626"}
                />
              ) : (
                <Trash2 size={18} color={isDark ? "#F87171" : "#DC2626"} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Title */}
        <View className="mt-4">
          {isEditing ? (
            <View className="flex-row items-center gap-2">
              <TextInput
                value={editName}
                onChangeText={setEditName}
                className="flex-1 h-10 px-3 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg text-foreground dark:text-foreground-dark"
                style={{
                  fontFamily: "DMSans",
                  fontSize: 18,
                  fontWeight: "600",
                }}
                autoFocus
              />
              <TouchableOpacity
                onPress={handleSaveEdit}
                className="w-10 h-10 bg-primary dark:bg-primary-dark rounded-lg items-center justify-center"
              >
                <Check size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl font-serif font-semibold text-foreground dark:text-foreground-dark flex-1">
                {lookbook.name}
              </Text>
              {!lookbook.isPublic ? (
                <Lock size={16} color={isDark ? "#9C948A" : "#706B63"} />
              ) : (
                <Globe size={16} color={isDark ? "#9C948A" : "#706B63"} />
              )}
            </View>
          )}
          {lookbook.description && !isEditing && (
            <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mt-1">
              {lookbook.description}
            </Text>
          )}
          <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mt-1.5">
            {lookbook.itemCount} {lookbook.itemCount === 1 ? "item" : "items"}
          </Text>
        </View>
      </View>

      {/* Items Grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: 20 + insets.bottom,
        }}
      >
        {lookbookItems === undefined ? (
          <View className="flex-1 items-center py-20">
            <ActivityIndicator
              size="large"
              color={isDark ? "#C9A07A" : "#A67C52"}
            />
          </View>
        ) : (
          <LookbookItemGrid items={lookbookItems} />
        )}
      </ScrollView>

      {/* Share Options Modal */}
      <ShareOptionsModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={shareUrl}
        title={shareTitle}
      />
    </View>
  );
}
