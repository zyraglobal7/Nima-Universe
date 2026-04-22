import { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { X, Plus } from "lucide-react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface CreateLookbookModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (lookbookId: string) => void;
}

export function CreateLookbookModal({
  visible,
  onClose,
  onCreated,
}: CreateLookbookModalProps) {
  const { isDark } = useTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createLookbook = useMutation(api.lookbooks.mutations.createLookbook);

  const handleCreate = async () => {
    if (!name.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const lookbookId = await createLookbook({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      onCreated?.(lookbookId);
      onClose();
    } catch {
      Alert.alert("Error", "Failed to create lookbook");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/60 items-center justify-center p-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-background dark:bg-background-dark rounded-3xl p-6"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-serif font-semibold text-foreground dark:text-foreground-dark">
              New Lookbook
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-surface dark:bg-surface-dark items-center justify-center"
            >
              <X size={18} color={isDark ? "#E8E2DA" : "#2D2926"} />
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-foreground dark:text-foreground-dark mb-2">
              Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g., Summer Vacation"
              placeholderTextColor={isDark ? "#706B63" : "#9C948A"}
              className="h-12 px-4 bg-surface dark:bg-surface-dark border border-border/50 dark:border-border-dark/50 rounded-xl text-foreground dark:text-foreground-dark"
              style={{ fontFamily: "DMSans" }}
            />
          </View>

          {/* Description Input */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-foreground dark:text-foreground-dark mb-2">
              Description (optional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What is this collection about?"
              placeholderTextColor={isDark ? "#706B63" : "#9C948A"}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="h-20 px-4 py-3 bg-surface dark:bg-surface-dark border border-border/50 dark:border-border-dark/50 rounded-xl text-foreground dark:text-foreground-dark"
              style={{ fontFamily: "DMSans" }}
            />
          </View>

          {/* Create Button */}
          <TouchableOpacity
            onPress={handleCreate}
            disabled={!name.trim() || isCreating}
            className={`h-12 rounded-xl items-center justify-center flex-row gap-2 ${
              !name.trim() || isCreating
                ? "bg-primary/50 dark:bg-primary-dark/50"
                : "bg-primary dark:bg-primary-dark"
            }`}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Plus size={18} color="#FFF" />
            )}
            <Text className="text-primary-foreground dark:text-primary-dark-foreground font-medium">
              {isCreating ? "Creating..." : "Create Lookbook"}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
