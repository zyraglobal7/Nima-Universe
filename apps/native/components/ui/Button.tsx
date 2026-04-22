import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  View,
  Text as RNText,
} from "react-native";
import { cn } from "@/lib/utils";
import { Text } from "./Text";
import React from "react";

export interface ButtonProps extends TouchableOpacityProps {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  label?: string;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  className,
  variant = "default",
  size = "md",
  label,
  children,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "flex-row items-center justify-center rounded-full";

  let variantStyles = "";
  let textStyles = "";

  switch (variant) {
    case "default":
      variantStyles = "bg-primary active:opacity-90";
      textStyles =
        "text-primary-foreground dark:text-primary-dark-foreground font-medium";
      break;
    case "secondary":
      variantStyles = "bg-secondary active:opacity-90";
      textStyles =
        "text-secondary-foreground dark:text-secondary-dark-foreground font-medium";
      break;
    case "outline":
      variantStyles =
        "border border-border dark:border-border-dark bg-transparent active:bg-muted/10";
      textStyles = "text-foreground dark:text-foreground-dark font-medium";
      break;
    case "ghost":
      variantStyles = "bg-transparent active:bg-muted/10";
      textStyles = "text-foreground dark:text-foreground-dark font-medium";
      break;
    case "destructive":
      variantStyles = "bg-destructive active:opacity-90";
      textStyles =
        "text-destructive-foreground dark:text-destructive-dark-foreground font-medium";
      break;
  }

  let sizeStyles = "";

  switch (size) {
    case "sm":
      sizeStyles = "h-9 px-4";
      textStyles += " text-sm";
      break;
    case "md":
      sizeStyles = "h-12 px-6";
      textStyles += " text-base";
      break;
    case "lg":
      sizeStyles = "h-14 px-6";
      textStyles += " text-base tracking-wider";
      break;
    case "icon":
      sizeStyles = "h-10 w-10";
      break;
  }

  if (disabled || loading) {
    variantStyles += " opacity-50";
  }

  return (
    <TouchableOpacity
      className={cn(baseStyles, variantStyles, sizeStyles, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "outline" || variant === "ghost" ? "#5C2A33" : "#FAF8F5"
          }
        />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          {label ? (
            <Text className={textStyles}>{label}</Text>
          ) : typeof children === "string" ? (
            <Text className={textStyles}>{children}</Text>
          ) : (
            children
          )}
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}
