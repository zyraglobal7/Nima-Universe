import { View, ViewProps } from "react-native";
import { cn } from "@/lib/utils";
import React from "react";

export interface CardProps extends ViewProps {
  variant?: "surface" | "surface-alt" | "glass";
}

export function Card({ className, variant = "surface", ...props }: CardProps) {
  let variantStyles = "";

  switch (variant) {
    case "surface":
      variantStyles =
        "bg-surface dark:bg-surface-dark border border-border dark:border-border-dark";
      break;
    case "surface-alt":
      variantStyles =
        "bg-surface-alt dark:bg-surface-alt-dark border border-border dark:border-border-dark";
      break;
    case "glass":
      variantStyles =
        "bg-surface/90 dark:bg-surface-dark/90 border border-border/50 dark:border-border-dark/50"; // Backdrop blur logic needs Reanimated/Expo Blur if strict
      break;
  }

  return (
    <View
      className={cn("rounded-xl shadow-sm", variantStyles, className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn("flex flex-row items-center p-6 pt-0", className)}
      {...props}
    />
  );
}
