import { useState, useCallback, useEffect, useRef } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { Search, X } from "lucide-react-native";
import { Text } from "@/components/ui/Text";

interface ApparelSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ApparelSearchBar({
  value,
  onChange,
  placeholder = "Search items...",
}: ApparelSearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  const handleInputChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onChange(newValue);
      }, 300);
    },
    [onChange],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleClear = useCallback(() => {
    setLocalValue("");
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <View className="mb-4 px-4">
      <View
        className={`flex-row items-center gap-2 bg-surface dark:bg-surface-dark border rounded-xl px-4 py-3 ${
          isFocused
            ? "border-primary/50 dark:border-primary-dark/50"
            : "border-border/50 dark:border-border-dark/50"
        }`}
      >
        {/* Search icon */}
        <Search size={20} color={isFocused ? "#A67C52" : "#9C948A"} />

        {/* Input */}
        <TextInput
          ref={inputRef}
          value={localValue}
          onChangeText={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          placeholderTextColor="#9C948A"
          className="flex-1 text-sm text-foreground dark:text-foreground-dark"
          style={{ padding: 0 }}
        />

        {/* Clear button */}
        {localValue.length > 0 && (
          <TouchableOpacity onPress={handleClear} className="p-1 rounded-full">
            <X size={16} color="#9C948A" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
