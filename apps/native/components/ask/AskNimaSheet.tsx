import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ChatInput } from "@/components/ask/ChatInput";
import {
  MessageBubble,
  TypingIndicator,
  type DisplayMessage,
} from "@/components/ask/MessageBubble";
import { FittingRoomCard } from "@/components/ask/FittingRoomCard";
import { SearchingCard } from "@/components/ask/SearchingCard";
import { ExploreCard } from "@/components/ask/ExploreCard";
import { Text } from "@/components/ui/Text";
import { Sparkles, X, Plus, Clock } from "lucide-react-native";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { CreditsModal } from "@/components/credits/CreditsModal";
import { ChatHistoryDrawer } from "@/components/ask/ChatHistoryDrawer";

type ChatState = "idle" | "typing" | "curating" | "generating" | "no_matches";

export interface AskNimaSheetRef {
  open: () => void;
  close: () => void;
}

interface AskNimaSheetProps {
  onOpenChange?: (isOpen: boolean) => void;
}

export const AskNimaSheet = forwardRef<AskNimaSheetRef, AskNimaSheetProps>(
  ({ onOpenChange }, ref) => {
    const sheetRef = useRef<BottomSheet>(null);
    const flatListRef = useRef<any>(null);
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.expand(),
      close: () => sheetRef.current?.close(),
    }));

    const handleSheetChange = useCallback(
      (index: number) => {
        onOpenChange?.(index >= 0);
      },
      [onOpenChange],
    );

    const snapPoints = useMemo(() => ["100%"], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.6}
        />
      ),
      [],
    );

    // ── Chat state ────────────────────────────────────────────────────────
    const [chatState, setChatState] = useState<ChatState>("idle");
    const [threadId, setThreadId] = useState<Id<"threads"> | null>(null);
    const [pendingMessages, setPendingMessages] = useState<DisplayMessage[]>(
      [],
    );
    const [conversationHistory, setConversationHistory] = useState<
      Array<{ role: "user" | "assistant"; content: string }>
    >([]);
    const [lookScenario, setLookScenario] = useState<"fresh" | "remix">(
      "fresh",
    );
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    const [showChatHistory, setShowChatHistory] = useState(false);

    const currentUser = useQuery(api.users.queries.getCurrentUser);

    const wardrobeItemsRaw = useQuery(
      api.wardrobe.queries.getWardrobeItems,
      {},
    );
    const wardrobeItems = (wardrobeItemsRaw ?? []).map((item) => ({
      description: item.description,
      category: item.category,
      color: item.color,
      formality: item.formality,
    }));

    const dbMessages = useQuery(
      api.messages.queries.getAllMessages,
      threadId ? { threadId } : "skip",
    );

    const startConversation = useMutation(
      api.messages.mutations.startConversation,
    );
    const saveAssistantMessage = useMutation(
      api.messages.mutations.saveAssistantMessage,
    );
    const createLooksFromChat = useMutation(
      api.chat.mutations.createLooksFromChat,
    );
    const saveFittingReadyMessage = useMutation(
      api.messages.mutations.saveFittingReadyMessage,
    );
    const saveNoMatchesMessage = useMutation(
      api.messages.mutations.saveNoMatchesMessage,
    );
    const scheduleChatLookImages = useMutation(
      api.chat.mutations.scheduleChatLookImageGeneration,
    );
    const sendChatMessage = useAction(api.chat.actions.sendChatMessage);
    const sendUserMessage = useMutation(api.messages.mutations.sendMessage);

    const userData = useMemo(() => {
      if (!currentUser) return undefined;
      return {
        gender: currentUser.gender,
        stylePreferences: currentUser.stylePreferences,
        budgetRange: currentUser.budgetRange,
        shirtSize: currentUser.shirtSize,
        waistSize: currentUser.waistSize,
        shoeSize: currentUser.shoeSize,
        shoeSizeUnit: currentUser.shoeSizeUnit,
        country: currentUser.country,
        currency: currentUser.currency,
        firstName: currentUser.firstName,
        age: currentUser.age,
      };
    }, [currentUser]);

    // Combine DB + pending (error-only) messages
    const displayMessages = useMemo((): DisplayMessage[] => {
      const dbDisplayMessages: DisplayMessage[] = (dbMessages || []).map(
        (msg) => ({
          id: msg._id,
          role: msg.role === "assistant" ? "nima" : "user",
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          type: msg.messageType === "fitting-ready" ? "fitting-ready" : "text",
          sessionId:
            msg.messageType === "fitting-ready" && msg.lookIds
              ? msg.lookIds.join(",")
              : undefined,
          variant: "fresh" as const,
          lookCount: msg.lookIds?.length,
        }),
      );

      const dbMessageIds = new Set(
        (dbMessages || []).map((m) => m._id as string),
      );
      const filteredPending = pendingMessages.filter(
        (pm) => !pm.id.startsWith("db-") && !dbMessageIds.has(pm.id),
      );

      return [...dbDisplayMessages, ...filteredPending];
    }, [dbMessages, pendingMessages]);

    const hasMessages = displayMessages.length > 0;

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleMatchItems = useCallback(
      async (
        occasion: string,
        source: "new" | "wardrobe" | "both" = "new",
        currentThreadId: Id<"threads">,
      ) => {
        setChatState("curating");
        try {
          const result = await createLooksFromChat({
            occasion,
            context: occasion,
            source,
          });

          if (result.success && "lookIds" in result) {
            const lookIds = result.lookIds;
            setLookScenario(result.scenario);

            setChatState("generating");
            await scheduleChatLookImages({ lookIds });

            await saveFittingReadyMessage({
              threadId: currentThreadId,
              lookIds,
              content: `I found ${lookIds.length} look${lookIds.length !== 1 ? "s" : ""} for you!`,
            });

            setChatState("idle");
          } else if (
            !result.success &&
            result.message === "insufficient_credits"
          ) {
            setChatState("idle");
            setShowCreditsModal(true);
          } else {
            await saveNoMatchesMessage({
              threadId: currentThreadId,
              occasion,
              content:
                "I couldn't find items that perfectly match right now, but don't worry! Check out our public looks for inspiration.",
            });
            setChatState("no_matches");
          }
        } catch (error) {
          console.error("Error matching items:", error);
          setChatState("no_matches");
        }
      },
      [
        createLooksFromChat,
        scheduleChatLookImages,
        saveFittingReadyMessage,
        saveNoMatchesMessage,
      ],
    );

    const handleSendMessage = useCallback(
      async (content: string) => {
        if (!content.trim()) return;

        setChatState("typing");

        const newHistory = [
          ...conversationHistory,
          { role: "user" as const, content },
        ];
        setConversationHistory(newHistory);

        setTimeout(
          () => flatListRef.current?.scrollToEnd({ animated: true }),
          100,
        );

        try {
          let currentThreadId = threadId;
          if (!currentThreadId) {
            const result = await startConversation({
              content,
              contextType: "outfit_help",
            });
            currentThreadId = result.threadId;
            setThreadId(currentThreadId);
          } else {
            await sendUserMessage({
              threadId: currentThreadId,
              content,
            });
          }

          const aiResult = await sendChatMessage({
            messages: newHistory,
            userData,
            wardrobeItems:
              wardrobeItems.length > 0 ? wardrobeItems : undefined,
          });

          if (!aiResult.success || !aiResult.content) {
            setPendingMessages((prev) => [
              ...prev,
              {
                id: `error-${Date.now()}`,
                role: "nima",
                content:
                  "Sorry, I had trouble processing that. Can you try again?",
                timestamp: new Date(),
                type: "text",
              },
            ]);
            setChatState("idle");
            return;
          }

          const aiContent = aiResult.content;
          setConversationHistory((prev) => [
            ...prev,
            { role: "assistant" as const, content: aiContent },
          ]);

          const matchItemsMatch = aiContent.match(
            /\[MATCH_ITEMS:([^\]]+)\]/,
          );
          const remixLookMatch = aiContent.match(/\[REMIX_LOOK:([^\]]+)\]/);

          // --- DEBUG LOGS: trace wardrobe source ---
          console.log('[ASK_NIMA] Raw AI content:', aiContent);
          if (matchItemsMatch) {
            const debugParts = matchItemsMatch[1].split("|");
            console.log(`[ASK_NIMA] MATCH_ITEMS tag: "${matchItemsMatch[0]}"`);
            console.log(`[ASK_NIMA] Parsed occasion: "${debugParts[0]?.trim()}", raw source: "${debugParts[1]?.trim() ?? 'MISSING'}"`);
            const debugSource = ["new", "wardrobe", "both"].includes(debugParts[1]?.trim() ?? "") ? debugParts[1]?.trim() : "new";
            console.log(`[ASK_NIMA] Resolved source: "${debugSource}" (falls back to "new" if invalid)`);
          } else {
            console.log('[ASK_NIMA] No MATCH_ITEMS tag found in AI response');
          }
          console.log(`[ASK_NIMA] Wardrobe items available: ${wardrobeItems?.length ?? 0}`);
          // --- END DEBUG LOGS ---

          const cleanContent = aiContent
            .replace(/\[MATCH_ITEMS:[^\]]*\]/g, "")
            .replace(/\[REMIX_LOOK:[^\]]*\]/g, "")
            .trim();

          if (cleanContent) {
            await saveAssistantMessage({
              threadId: currentThreadId,
              content: cleanContent,
            });
          }

          setPendingMessages([]);

          if (matchItemsMatch) {
            const parts = matchItemsMatch[1].split("|");
            const occasion = parts[0].trim();
            const sourcePart = parts[1]?.trim() ?? "";
            const source = (
              ["new", "wardrobe", "both"].includes(sourcePart)
                ? sourcePart
                : "new"
            ) as "new" | "wardrobe" | "both";
            await handleMatchItems(occasion, source, currentThreadId);
          } else if (remixLookMatch) {
            const parts = remixLookMatch[1].split("|");
            const sourceOccasion = parts[0] || "casual";
            await handleMatchItems(sourceOccasion, "new", currentThreadId);
          } else {
            setChatState("idle");
          }
        } catch (error) {
          console.error("Error sending message:", error);
          setPendingMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: "nima",
              content: "Something went wrong. Please try again!",
              timestamp: new Date(),
              type: "text",
            },
          ]);
          setChatState("idle");
        }

        setTimeout(
          () => flatListRef.current?.scrollToEnd({ animated: true }),
          200,
        );
      },
      [
        threadId,
        conversationHistory,
        userData,
        wardrobeItems,
        startConversation,
        sendUserMessage,
        sendChatMessage,
        saveAssistantMessage,
        handleMatchItems,
      ],
    );

    const handleFittingRoomClick = useCallback((sessionId: string) => {
      sheetRef.current?.close();
      router.push(`/fitting/${sessionId}` as any);
    }, []);

    const handleExplore = useCallback(() => {
      sheetRef.current?.close();
      router.push("/(tabs)/discover" as any);
    }, []);

    const handleNewChat = useCallback(() => {
      setChatState("idle");
      setThreadId(null);
      setPendingMessages([]);
      setConversationHistory([]);
    }, []);

    const handleSelectThread = useCallback(
      (selectedThreadId: Id<"threads">) => {
        setThreadId(selectedThreadId);
        setChatState("idle");
        setPendingMessages([]);
        setConversationHistory([]);
      },
      [],
    );

    // Auto-scroll on new messages
    useEffect(() => {
      if (displayMessages.length > 0) {
        setTimeout(
          () => flatListRef.current?.scrollToEnd({ animated: true }),
          150,
        );
      }
    }, [displayMessages.length]);

    const getInputPlaceholder = () => {
      switch (chatState) {
        case "curating":
          return "Curating looks for you...";
        case "generating":
          return "Generating your looks...";
        case "typing":
          return "Nima is thinking...";
        default:
          return "Ask Nima anything...";
      }
    };

    const isInputDisabled =
      chatState === "typing" ||
      chatState === "curating" ||
      chatState === "generating";

    // ── Render helpers ──────────────────────────────────────────────────
    const renderChatItem = ({ item }: { item: DisplayMessage }) => {
      if (item.type === "fitting-ready" && item.sessionId) {
        return (
          <FittingRoomCard
            sessionId={item.sessionId}
            lookCount={item.lookCount || 3}
            animate
            onPress={() => handleFittingRoomClick(item.sessionId!)}
            variant={item.variant || lookScenario}
          />
        );
      }
      return (
        <MessageBubble
          message={item}
          animate
          onFittingRoomClick={handleFittingRoomClick}
        />
      );
    };

    const renderFooter = () => (
      <View>
        {chatState === "typing" && <TypingIndicator />}
        {(chatState === "curating" || chatState === "generating") && (
          <SearchingCard animate />
        )}
        {chatState === "no_matches" && (
          <ExploreCard animate onExplore={handleExplore} />
        )}
        <View style={{ height: 8 }} />
      </View>
    );

    const renderEmpty = () => (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
        }}
      >
        <Animated.View
          entering={FadeIn.duration(400)}
          style={{ alignItems: "center" }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: isDark
                ? "rgba(201,160,122,0.12)"
                : "rgba(166,124,82,0.10)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Sparkles size={24} color={isDark ? "#C9A07A" : "#A67C52"} />
          </View>
          <Text
            style={{
              fontSize: 18,
              fontFamily: "CormorantGaramond_600SemiBold",
              color: isDark ? "#F5F0E8" : "#2D2926",
              textAlign: "center",
              marginBottom: 6,
            }}
          >
            What are we styling today?
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: isDark ? "#8C8078" : "#9C948A",
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            Describe an occasion, vibe, or just say hi
          </Text>
        </Animated.View>
      </View>
    );

    // ── Sheet ─────────────────────────────────────────────────────────────
    const bgColor = isDark ? "#1A1614" : "#FAF8F5";

    return (
      <>
        <BottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: bgColor }}
          handleIndicatorStyle={{
            backgroundColor: isDark ? "#4A4440" : "#C4B8A8",
            width: 36,
          }}
          topInset={insets.top}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          onChange={handleSheetChange}
        >
          <View
            style={[styles.sheetContent, { backgroundColor: bgColor }]}
          >
            {/* Header */}
            <View
              style={[
                styles.header,
                {
                  borderBottomColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.06)",
                },
              ]}
            >
              {/* Left: new-chat or spacer */}
              {threadId ? (
                <TouchableOpacity
                  onPress={handleNewChat}
                  activeOpacity={0.7}
                  style={[
                    styles.headerIconBtn,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                    },
                  ]}
                >
                  <Plus size={18} color={isDark ? "#C4B8A8" : "#6B635B"} />
                </TouchableOpacity>
              ) : (
                <View style={styles.headerIconBtn} />
              )}

              {/* Centre title */}
              <Text
                style={[
                  styles.headerTitle,
                  { color: isDark ? "#F5F0E8" : "#2D2926" },
                ]}
              >
                Nima
              </Text>

              {/* Right: history + close */}
              <View style={styles.headerRightGroup}>
                <TouchableOpacity
                  onPress={() => setShowChatHistory(true)}
                  activeOpacity={0.7}
                  style={[
                    styles.headerIconBtn,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                    },
                  ]}
                >
                  <Clock size={16} color={isDark ? "#C4B8A8" : "#6B635B"} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => sheetRef.current?.close()}
                  activeOpacity={0.7}
                  style={[
                    styles.headerIconBtn,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                    },
                  ]}
                >
                  <X size={18} color={isDark ? "#C4B8A8" : "#6B635B"} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages */}
            <BottomSheetFlatList
              ref={flatListRef}
              data={displayMessages}
              keyExtractor={(item) => item.id}
              renderItem={renderChatItem}
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingVertical: 16,
                flexGrow: 1,
              }}
              ListEmptyComponent={renderEmpty}
              ListFooterComponent={hasMessages ? renderFooter : null}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
            />

            {/* Input */}
            <ChatInput
              onSend={handleSendMessage}
              disabled={isInputDisabled}
              placeholder={getInputPlaceholder()}
              disabledPlaceholder={getInputPlaceholder()}
            />
          </View>
        </BottomSheet>

        <CreditsModal
          visible={showCreditsModal}
          onClose={() => setShowCreditsModal(false)}
        />

        <ChatHistoryDrawer
          visible={showChatHistory}
          onClose={() => setShowChatHistory(false)}
          onSelectThread={handleSelectThread}
          onNewChat={handleNewChat}
          currentThreadId={threadId}
        />
      </>
    );
  },
);

AskNimaSheet.displayName = "AskNimaSheet";

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "CormorantGaramond_600SemiBold",
    letterSpacing: 0.3,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
  },
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
