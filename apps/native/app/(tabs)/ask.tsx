import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
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
import { Sparkles, Plus, Clock } from "lucide-react-native";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { CreditsModal } from "@/components/credits/CreditsModal";
import { ChatHistoryDrawer } from "@/components/ask/ChatHistoryDrawer";

type ChatState = "idle" | "typing" | "curating" | "generating" | "no_matches";

export default function AskScreen() {
  const flatListRef = useRef<FlatList>(null);
  const { isDark } = useTheme();

  // Chat state
  const [chatState, setChatState] = useState<ChatState>("idle");

  // Thread management
  const [threadId, setThreadId] = useState<Id<"threads"> | null>(null);

  // Pending local messages (error messages only — user/AI messages go straight to DB)
  const [pendingMessages, setPendingMessages] = useState<DisplayMessage[]>([]);

  // Chat conversation history for AI context
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);

  // Look generation state
  const [lookScenario, setLookScenario] = useState<"fresh" | "remix">("fresh");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);

  // Get current user
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  // Wardrobe context for AI
  const wardrobeItemsRaw = useQuery(api.wardrobe.queries.getWardrobeItems, {});
  const wardrobeItems = (wardrobeItemsRaw ?? []).map((item) => ({
    description: item.description,
    category: item.category,
    color: item.color,
    formality: item.formality,
  }));

  // Database messages (reactive)
  const dbMessages = useQuery(
    api.messages.queries.getAllMessages,
    threadId ? { threadId } : "skip",
  );

  // Mutations & actions
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

  // Build user data for AI context
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

  // Combine DB + pending messages into display messages
  const displayMessages = useMemo((): DisplayMessage[] => {
    const dbDisplayMessages: DisplayMessage[] = (dbMessages || []).map(
      (msg) => ({
        id: msg._id,
        role: msg.role === "assistant" ? "nima" : "user",
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        type:
          msg.messageType === "fitting-ready" ? "fitting-ready" : "text",
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

  // Handle [MATCH_ITEMS:occasion|source] tag
  const handleMatchItems = useCallback(
    async (
      occasion: string,
      source: "new" | "wardrobe" | "both" = "new",
      currentThreadId: Id<"threads">
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
        } else if (!result.success && result.message === "insufficient_credits") {
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

  // Handle sending a message
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      setChatState("typing");

      const newHistory = [
        ...conversationHistory,
        { role: "user" as const, content },
      ];
      setConversationHistory(newHistory);

      // Scroll to bottom after a tick (DB message will render)
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

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

        // Send to AI — pass wardrobe info so the model knows whether the user has items
        const aiResult = await sendChatMessage({
          messages: newHistory,
          userData,
          wardrobeItems: wardrobeItems.length > 0 ? wardrobeItems : undefined,
        });

        if (!aiResult.success || !aiResult.content) {
          const errorMsg: DisplayMessage = {
            id: `error-${Date.now()}`,
            role: "nima",
            content:
              "Sorry, I had trouble processing that. Can you try again?",
            timestamp: new Date(),
            type: "text",
          };
          setPendingMessages((prev) => [...prev, errorMsg]);
          setChatState("idle");
          return;
        }

        const aiContent = aiResult.content;

        setConversationHistory((prev) => [
          ...prev,
          { role: "assistant" as const, content: aiContent },
        ]);

        // Parse tags
        const matchItemsMatch = aiContent.match(/\[MATCH_ITEMS:([^\]]+)\]/);
        const remixLookMatch = aiContent.match(/\[REMIX_LOOK:([^\]]+)\]/);

        // Save clean version (no tags) to DB
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

        // Handle tags
        if (matchItemsMatch) {
          const parts = matchItemsMatch[1].split("|");
          const occasion = parts[0].trim();
          const sourcePart = parts[1]?.trim() ?? "";
          const source = (["new", "wardrobe", "both"].includes(sourcePart)
            ? sourcePart
            : "new") as "new" | "wardrobe" | "both";
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
        const errorMsg: DisplayMessage = {
          id: `error-${Date.now()}`,
          role: "nima",
          content: "Something went wrong. Please try again!",
          timestamp: new Date(),
          type: "text",
        };
        setPendingMessages((prev) => [...prev, errorMsg]);
        setChatState("idle");
      }

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
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

  const handleFittingRoomClick = useCallback(
    (sessionId: string) => {
      router.push(`/fitting/${sessionId}` as any);
    },
    [],
  );

  const handleExplore = useCallback(() => {
    router.push("/(tabs)/discover" as any);
  }, []);

  const handleNewChat = useCallback(() => {
    setChatState("idle");
    setThreadId(null);
    setPendingMessages([]);
    setConversationHistory([]);
  }, []);

  const handleSelectThread = useCallback((selectedThreadId: Id<"threads">) => {
    setThreadId(selectedThreadId);
    setChatState("idle");
    setPendingMessages([]);
    setConversationHistory([]);
  }, []);

  // Register global callback so the Header can open chat history
  useEffect(() => {
    (globalThis as any).__openChatHistory = () => setShowChatHistory(true);
    return () => {
      delete (globalThis as any).__openChatHistory;
    };
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (displayMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
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

  // Render a single chat item
  const renderChatItem = ({ item }: { item: DisplayMessage }) => {
    if (item.type === "fitting-ready" && item.sessionId) {
      return (
        <FittingRoomCard
          sessionId={item.sessionId}
          lookCount={item.lookCount || 3}
          animate={true}
          onPress={() => handleFittingRoomClick(item.sessionId!)}
          variant={item.variant || lookScenario}
        />
      );
    }

    return (
      <MessageBubble
        message={item}
        animate={true}
        onFittingRoomClick={handleFittingRoomClick}
      />
    );
  };

  // Footer: typing indicator, searching card, no-matches
  const renderFooter = () => {
    return (
      <View>
        {chatState === "typing" && <TypingIndicator />}
        {(chatState === "curating" || chatState === "generating") && (
          <SearchingCard animate={true} />
        )}
        {chatState === "no_matches" && (
          <ExploreCard animate={true} onExplore={handleExplore} />
        )}
        <View style={{ height: 8 }} />
      </View>
    );
  };

  // Empty state shown in the FlatList area when there are no messages
  const renderEmpty = () => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
      <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: "center" }}>
        {/* Brand icon */}
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: isDark ? "rgba(201,160,122,0.12)" : "rgba(166,124,82,0.10)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Sparkles size={28} color={isDark ? "#C9A07A" : "#A67C52"} />
        </View>

        <Text className="text-xl font-serif text-foreground dark:text-foreground-dark text-center mb-2">
          What are we styling today?
        </Text>
        <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground text-center leading-relaxed">
          Describe an occasion, vibe, or just say hi
        </Text>
      </Animated.View>
    </View>
  );

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 70 : 0}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            backgroundColor: isDark ? "#1A1614" : "#FAF8F5",
          }}
        >
          {/* New chat button (only when a thread is active) */}
          {threadId ? (
            <TouchableOpacity
              onPress={handleNewChat}
              activeOpacity={0.7}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                marginRight: 10,
              }}
            >
              <Plus size={20} color={isDark ? "#C4B8A8" : "#6B635B"} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36, marginRight: 10 }} />
          )}

          {/* Title — centred */}
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text className="text-base font-serif text-foreground dark:text-foreground-dark">
              Nima
            </Text>
          </View>

          {/* History button */}
          <TouchableOpacity
            onPress={() => setShowChatHistory(true)}
            activeOpacity={0.7}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              marginLeft: 10,
            }}
          >
            <Clock size={18} color={isDark ? "#C4B8A8" : "#6B635B"} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
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
      </KeyboardAvoidingView>

      {/* Credits Modal */}
      <CreditsModal
        visible={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />

      {/* Chat History Drawer */}
      <ChatHistoryDrawer
        visible={showChatHistory}
        onClose={() => setShowChatHistory(false)}
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        currentThreadId={threadId}
      />
    </View>
  );
}
