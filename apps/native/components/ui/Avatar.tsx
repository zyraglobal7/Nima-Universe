import { View } from "react-native";
import { Image, ImageSource } from "expo-image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  source?: string | ImageSource;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar({
  source,
  alt,
  fallback,
  size = "md",
  className,
}: AvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
  };

  return (
    <View
      className={cn(
        "rounded-full overflow-hidden bg-muted border border-border/10 items-center justify-center",
        sizeClasses[size],
        className,
      )}
    >
      {source ? (
        <Image
          source={typeof source === "string" ? { uri: source } : source}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          accessibilityLabel={alt}
        />
      ) : (
        <View className="w-full h-full items-center justify-center bg-muted">
          <Text className="text-muted-foreground font-medium text-xs">
            {fallback || alt?.charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
      )}
    </View>
  );
}

// Helper Text component import if not available globally
import { Text } from "@/components/ui/Text";
