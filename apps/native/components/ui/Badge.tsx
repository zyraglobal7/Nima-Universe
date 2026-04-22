import { View } from "react-native";
import { Text } from "./Text";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Badge({
  className,
  variant = "default",
  label,
  children,
}: BadgeProps) {
  let variantStyles = "";
  let textStyles = "";

  switch (variant) {
    case "default":
      variantStyles =
        "border-transparent bg-primary dark:bg-primary-dark shadow";
      textStyles = "text-primary-foreground dark:text-primary-dark-foreground";
      break;
    case "secondary":
      variantStyles = "border-transparent bg-secondary dark:bg-secondary-dark";
      textStyles =
        "text-secondary-foreground dark:text-secondary-dark-foreground";
      break;
    case "destructive":
      variantStyles =
        "border-transparent bg-destructive dark:bg-destructive-dark shadow";
      textStyles =
        "text-destructive-foreground dark:text-destructive-dark-foreground";
      break;
    case "outline":
      variantStyles = "border-border dark:border-border-dark";
      textStyles = "text-foreground dark:text-foreground-dark";
      break;
  }

  return (
    <View
      className={cn(
        "items-center rounded-full border px-2.5 py-0.5",
        variantStyles,
        className,
      )}
    >
      <Text className={cn("text-xs font-semibold", textStyles)}>
        {label || children}
      </Text>
    </View>
  );
}
