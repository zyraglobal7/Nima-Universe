import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { Package } from "lucide-react-native";

interface OrderItemProps {
  item: {
    _id: string;
    itemName: string;
    itemBrand?: string;
    itemImageUrl?: string | null;
    selectedSize?: string;
    selectedColor?: string;
    quantity: number;
    lineTotal: number;
    trackingNumber?: string;
  };
  currency: string;
}

export function OrderItem({ item, currency }: OrderItemProps) {
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "KES",
  }).format(item.lineTotal / 100);

  return (
    <View className="flex-row gap-4 py-4 border-b border-border/50 last:border-0 relative">
      <View className="w-20 h-20 bg-muted rounded-lg overflow-hidden border border-border/50">
        {item.itemImageUrl ? (
          <Image
            source={{ uri: item.itemImageUrl }}
            className="w-full h-full"
            contentFit="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Package
              size={24}
              className="text-muted-foreground"
              color="#9CA3AF"
            />
          </View>
        )}
      </View>

      <View className="flex-1 space-y-1">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-2">
            <Text
              className="font-medium text-foreground text-sm"
              numberOfLines={2}
            >
              {item.itemName}
            </Text>
            <Text
              className="text-xs text-muted-foreground mt-0.5"
              numberOfLines={1}
            >
              {item.itemBrand}
            </Text>
          </View>
          <Text className="font-medium text-foreground text-sm">
            {formattedPrice}
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2 mt-1">
          {item.selectedSize && (
            <Text className="text-xs text-muted-foreground">
              Size: <Text className="text-foreground">{item.selectedSize}</Text>
            </Text>
          )}
          {item.selectedColor && (
            <Text className="text-xs text-muted-foreground">
              Color:{" "}
              <Text className="text-foreground">{item.selectedColor}</Text>
            </Text>
          )}
          <Text className="text-xs text-muted-foreground">
            Qty: <Text className="text-foreground">{item.quantity}</Text>
          </Text>
        </View>

        {item.trackingNumber && (
          <View className="mt-2 self-start bg-secondary/50 px-2 py-0.5 rounded border border-border/50">
            <Text className="text-[10px] text-muted-foreground">
              Tracking: {item.trackingNumber}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}