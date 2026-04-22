import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { formatRelativeTime } from "@/lib/mock-chat-data";

export interface DisplayMessage {
  id: string;
  role: "user" | "nima";
  content: string;
  timestamp: Date;
  type: "text" | "searching" | "fitting-ready";
  sessionId?: string;
  variant?: "fresh" | "remix";
  lookCount?: number;
}

interface MessageBubbleProps {
  message: DisplayMessage;
  animate?: boolean;
  onFittingRoomClick?: (sessionId: string) => void;
}

export function MessageBubble({
  message,
  animate = true,
  onFittingRoomClick,
}: MessageBubbleProps) {
  const isNima = message.role === "nima";

  // Delegate fitting-ready to FittingRoomCard (imported in main screen)
  if (message.type === "fitting-ready" && message.sessionId) {
    return null; // Handled by parent screen with FittingRoomCard
  }

  // Delegate searching to SearchingCard (imported in main screen)
  if (message.type === "searching") {
    return null; // Handled by parent screen with SearchingCard
  }

  // Clean any special tags from content before display
  const cleanContent = message.content
    .replace(/\[MATCH_ITEMS:[^\]]*\]/g, "")
    .replace(/\[REMIX_LOOK:[^\]]*\]/g, "")
    .trim();

  if (!cleanContent) return null;

  return (
    <Animated.View
      entering={animate ? FadeInUp.duration(300) : undefined}
      className={cn("mb-3 px-4", isNima ? "items-start" : "items-end")}
      style={{ width: "100%" }}
    >
      <View
        className={cn(
          "max-w-[82%] rounded-2xl px-4 py-3",
          isNima
            ? "bg-surface dark:bg-surface-dark border border-border/20 dark:border-border-dark/20 rounded-bl-md"
            : "bg-primary dark:bg-primary-dark rounded-br-md",
        )}
      >
        {/* Nima avatar header */}
        {isNima && (
          <View className="flex-row items-center gap-1.5 mb-1.5">
            <View className="w-5 h-5 rounded-full bg-primary dark:bg-primary-dark items-center justify-center">
              <Sparkles size={10} color="#FAF8F5" />
            </View>
            <Text className="text-xs font-semibold text-primary dark:text-primary-dark">
              Nima
            </Text>
          </View>
        )}

        {/* Message text */}
        <Text
          className={cn(
            "text-[15px] leading-relaxed font-sans",
            isNima ? "text-foreground dark:text-foreground-dark" : "text-white",
          )}
        >
          {cleanContent}
        </Text>

        {/* Timestamp */}
        <Text
          className={cn(
            "text-[10px] mt-1.5",
            isNima
              ? "text-muted-foreground/60 dark:text-muted-dark-foreground/60"
              : "text-white/50",
          )}
        >
          {formatRelativeTime(message.timestamp)}
        </Text>
      </View>
    </Animated.View>
  );
}

export function TypingIndicator() {
  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      className="mb-3 px-4 items-start"
      style={{ width: "100%" }}
    >
      <View className="bg-surface dark:bg-surface-dark border border-border/20 dark:border-border-dark/20 rounded-2xl rounded-bl-md px-4 py-3">
        <View className="flex-row items-center gap-1.5 mb-1.5">
          <View className="w-5 h-5 rounded-full bg-primary dark:bg-primary-dark items-center justify-center">
            <Sparkles size={10} color="#FAF8F5" />
          </View>
          <Text className="text-xs font-semibold text-primary dark:text-primary-dark">
            Nima
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <TypingDot delay={0} />
          <TypingDot delay={200} />
          <TypingDot delay={400} />
        </View>
      </View>
    </Animated.View>
  );
}

function TypingDot({ delay }: { delay: number }) {
  return (
    <Animated.View
      entering={FadeInUp.duration(300).delay(delay)}
      className="w-2 h-2 rounded-full bg-primary/50 dark:bg-primary-dark/50"
    />
  );
}
