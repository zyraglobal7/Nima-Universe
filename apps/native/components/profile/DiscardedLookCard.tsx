import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { RotateCcw } from "lucide-react-native";
import { Id } from "@/convex/_generated/dataModel";

interface LookData {
  look: {
    _id: Id<"looks">;
    name?: string;
    totalPrice: number;
    currency: string;
  };
  lookImage:
    | {
        imageUrl?: string | null;
      }
    | null
    | undefined;
  items: Array<{
    item: {
      _id: Id<"items">;
      name: string;
      category: string;
    };
    primaryImageUrl?: string | null;
  }>;
}

interface DiscardedLookCardProps {
  lookData: LookData;
  onRestore: (lookId: Id<"looks">) => void;
  isRestoring: boolean;
}

export function DiscardedLookCard({
  lookData,
  onRestore,
  isRestoring,
}: DiscardedLookCardProps) {
  const imageUrl = lookData.lookImage?.imageUrl;

  return (
    <View className="bg-surface border border-border/30 rounded-2xl overflow-hidden mb-4 break-inside-avoid">
      {/* Image Section */}
      <View className="aspect-[3/4] relative">
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <View className="w-full h-full bg-surface-alt items-center justify-center">
            <Text className="text-muted-foreground text-xs">No Image</Text>
          </View>
        )}

        {/* Overlay Gradient */}
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "50%",
          }}
        />

        {/* Discarded Badge */}
        <View className="absolute top-3 left-3 px-2 py-1 bg-destructive/80 rounded-full">
          <Text className="text-[10px] font-medium text-destructive-foreground">
            Discarded
          </Text>
        </View>

        {/* Price Badge */}
        <View className="absolute top-3 right-3 px-2 py-1 bg-background/80 rounded-full">
          <Text className="text-[10px] font-medium text-foreground">
            {lookData.look.currency} {lookData.look.totalPrice.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View className="p-3 gap-3">
        {/* Items Preview */}
        <View className="flex-row items-center">
          {lookData.items.slice(0, 4).map((item, i) => (
            <View
              key={item.item._id}
              className={`w-6 h-6 rounded-full border border-background overflow-hidden bg-surface-alt -ml-2 first:ml-0`}
              style={{ zIndex: 4 - i }}
            >
              {item.primaryImageUrl ? (
                <Image
                  source={{ uri: item.primaryImageUrl }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <Text className="text-[8px]">
                    {item.item.category.charAt(0)}
                  </Text>
                </View>
              )}
            </View>
          ))}
          {lookData.items.length > 4 && (
            <View className="w-6 h-6 rounded-full border border-background bg-surface-alt items-center justify-center -ml-2 z-0">
              <Text className="text-[8px] text-muted-foreground">
                +{lookData.items.length - 4}
              </Text>
            </View>
          )}
        </View>

        {/* Restore Button */}
        <TouchableOpacity
          onPress={() => onRestore(lookData.look._id)}
          disabled={isRestoring}
          className={`
                   flex-row items-center justify-center gap-2 py-2.5 rounded-xl
                   ${isRestoring ? "bg-primary/50" : "bg-primary active:bg-primary/90"}
               `}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <RotateCcw size={14} color="#FFF" />
              <Text className="text-primary-foreground font-medium text-xs">
                Restore Look
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}