import React from "react";
import { TouchableOpacity, Alert } from "react-native";
import { MoreVertical } from "lucide-react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Toast from "react-native-toast-message";

const REPORT_REASONS = [
  "Spam or scam",
  "Harassment or bullying",
  "Inappropriate content",
  "Impersonation",
];

interface ModerationMenuProps {
  targetUserId: Id<"users">;
  targetName?: string;
  /** "user" (profile), "message", or "look" — what is being reported. */
  targetType?: "user" | "message" | "look";
  targetId?: string;
  /** Called after a successful block (e.g. to navigate away). */
  onBlocked?: () => void;
  color?: string;
  size?: number;
}

/**
 * A "⋮" overflow button that lets a user Report or Block another user.
 * Required for App Store Guideline 1.2 (UGC moderation) on any surface where
 * users interact — DMs, profiles, shared content.
 */
export function ModerationMenu({
  targetUserId,
  targetName,
  targetType = "user",
  targetId,
  onBlocked,
  color = "#9C948A",
  size = 22,
}: ModerationMenuProps) {
  const blockUser = useMutation(api.moderation.mutations.blockUser);
  const reportUser = useMutation(api.moderation.mutations.reportUser);

  const who = targetName || "this user";

  const submitReport = async (reason: string) => {
    try {
      await reportUser({ targetUserId, targetType, targetId, reason });
      Toast.show({
        type: "success",
        text1: "Report submitted",
        text2: "Thanks — our team will review this within 24 hours.",
      });
    } catch {
      Toast.show({ type: "error", text1: "Couldn't submit report" });
    }
  };

  const confirmBlock = () => {
    Alert.alert(
      `Block ${who}?`,
      "They won't be able to message you, and you won't see each other in friends or messages.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser({ targetUserId });
              Toast.show({ type: "success", text1: `Blocked ${who}` });
              onBlocked?.();
            } catch {
              Toast.show({ type: "error", text1: "Couldn't block user" });
            }
          },
        },
      ],
    );
  };

  const openReportReasons = () => {
    Alert.alert(`Report ${who}`, "Why are you reporting this?", [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: () => submitReport(reason),
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  const openMenu = () => {
    Alert.alert(targetName || "Options", undefined, [
      { text: "Report", onPress: openReportReasons },
      { text: "Block", style: "destructive", onPress: confirmBlock },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <TouchableOpacity
      onPress={openMenu}
      hitSlop={10}
      accessibilityLabel="Report or block user"
      accessibilityRole="button"
    >
      <MoreVertical size={size} color={color} />
    </TouchableOpacity>
  );
}
