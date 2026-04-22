import { TextInput, TextInputProps, View, Text as RNText } from "react-native";
import { cn } from "@/lib/utils";
import { Text } from "./Text";
import React, { forwardRef } from "react";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ className, label, error, containerClassName, ...props }, ref) => {
    return (
      <View className={cn("w-full space-y-2", containerClassName)}>
        {label && (
          <Text variant="caption" className="font-medium ml-1">
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          className={cn(
            "h-12 w-full rounded-xl border border-input dark:border-input-dark bg-background dark:bg-background-dark px-4 py-2 text-foreground dark:text-foreground-dark font-sans text-base",
            "placeholder:text-text-muted focus:border-ring focus:border-2",
            error && "border-destructive",
            className,
          )}
          placeholderTextColor="#9C948A" // text-muted
          {...props}
        />
        {error && (
          <Text className="text-destructive text-xs ml-1 font-medium">
            {error}
          </Text>
        )}
      </View>
    );
  },
);

Input.displayName = "Input";
