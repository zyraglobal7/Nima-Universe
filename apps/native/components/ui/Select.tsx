import React, { useState } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  Pressable,
} from "react-native";
import { Text } from "./Text";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react-native";

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function Select({
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  label,
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setIsOpen(false);
  };

  return (
    <View className={cn("gap-2", className)}>
      {label && (
        <Text className="text-sm font-medium text-foreground dark:text-foreground-dark">
          {label}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        className="flex-row items-center justify-between h-10 w-full rounded-md border border-input dark:border-input-dark bg-background dark:bg-background-dark px-3 py-2"
      >
        <Text
          className={cn(
            "text-sm",
            !selectedOption &&
              "text-muted-foreground dark:text-muted-dark-foreground",
          )}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <ChevronDown size={16} color="#9C948A" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setIsOpen(false)}
        >
          <View className="bg-background dark:bg-background-dark rounded-t-3xl max-h-[70%]">
            <View className="p-4 border-b border-border dark:border-border-dark">
              <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
                {label || "Select an option"}
              </Text>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item.value)}
                  className="flex-row items-center justify-between px-4 py-3 border-b border-border/30 dark:border-border-dark/30"
                >
                  <Text className="text-base text-foreground dark:text-foreground-dark">
                    {item.label}
                  </Text>
                  {item.value === value && <Check size={20} color="#A67C52" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
