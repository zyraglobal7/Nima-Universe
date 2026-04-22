import {
  View,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useState, useRef } from "react";
import { Send } from "lucide-react-native";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledPlaceholder?: string;
}

export function ChatInput({
  onSend,
  placeholder = "Describe what you're looking for...",
  disabled = false,
  disabledPlaceholder,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage("");
    }
  };

  const canSend = message.trim().length > 0 && !disabled;

  // Bottom padding: safe area + breathing room, capped so it doesn't get too tall
  const bottomPad = Math.max(insets.bottom, Platform.OS === "ios" ? 8 : 4) + 8;

  return (
    <View
      className="bg-background dark:bg-background-dark border-t border-border/40 dark:border-border-dark/40"
      style={{
        paddingBottom: bottomPad,
        paddingTop: 10,
        paddingHorizontal: 16,
      }}
    >
      <View className="flex-row items-end">
        {/* Input + send button container — fully pill-shaped */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "flex-end",
            backgroundColor: isDark ? "#252220" : "#F5F0E8",
            borderRadius: 999,
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
            paddingLeft: 16,
            paddingRight: 6,
            paddingVertical: 6,
            minHeight: 46,
          }}
        >
          <TextInput
            ref={inputRef}
            value={message}
            onChangeText={setMessage}
            placeholder={disabled ? disabledPlaceholder || placeholder : placeholder}
            placeholderTextColor={isDark ? "#7A7269" : "#9C948A"}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
            maxLength={500}
            editable={!disabled}
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 22,
              color: isDark ? "#E0D8CC" : "#2D2926",
              fontFamily: "DMSans_400Regular",
              paddingTop: 4,
              paddingBottom: 4,
              maxHeight: 100,
              textAlignVertical: "center",
            }}
          />

          {/* Send button — inside the pill */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.7}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 6,
              backgroundColor: canSend
                ? isDark ? "#C9A07A" : "#5C2A33"
                : isDark ? "#3D3731" : "#EDE8E0",
            }}
          >
            <Send
              size={16}
              color={canSend ? "#FAF8F5" : isDark ? "#7A7269" : "#9C948A"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
