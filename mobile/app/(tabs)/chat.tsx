import React, { useState, useRef, useEffect } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  streamAgentChat,
  fetchConversationHistory,
  ActiveStream,
  ChatSource,
} from "@/src/api/agentChat";
import { useAuthStore } from "@/src/stores/authStore";
import {
  colorTokens,
  radiusTokens,
  spacingTokens,
} from "@/src/theme/tokens";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  isStreaming?: boolean;
  sources?: ChatSource[];
  error?: boolean;
  canRetry?: boolean;
  retryText?: string;
}

const INITIAL_SUGGESTIONS = [
  "Quels sont vos délais pour Casablanca ?",
  "Avez-vous des tapis zellige ?",
  "Comment fonctionne le paiement COD ?",
  "Suivre ma commande en cours",
];

export default function ChatScreen() {
  const user = useAuthStore((state) => state.user);
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text: `Bonjour ${user?.name ? user.name : ""} ! Je suis ShopMate AI, votre assistant shopping avec paiement à la livraison (COD). Comment puis-je vous aider ?`,
      timestamp: "À l'instant",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const activeStreamRef = useRef<ActiveStream | null>(null);

  // ── Load past conversation on mount ──────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function loadPastChat() {
      try {
        const conversations = await fetchConversationHistory();
        if (!isMounted || !conversations || conversations.length === 0) return;

        // Pick latest conversation
        const latest = conversations[0];
        setConversationId(latest.id);

        if (latest.messages && latest.messages.length > 0) {
          const loaded: ChatMessage[] = latest.messages.map((m) => ({
            id: `msg-${m.id}`,
            sender: m.role,
            text: m.content,
            timestamp: new Date(m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));
          setMessages(loaded);
        }
      } catch {
        // Keep initial welcome message if offline or history fetch fails
      }
    }

    loadPastChat();

    // Cancel any active stream when unmounting screen
    return () => {
      isMounted = false;
      activeStreamRef.current?.abort();
    };
  }, []);

  // ── Send message with real-time SSE streaming ───────────────────────────────
  const sendMessage = async (textToSend?: string) => {
    const content = (textToSend || input).trim();
    if (!content || isSending) return;

    setRateLimitNotice(null);

    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      sender: "user",
      text: content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const assistantPlaceholderId = `ai-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantPlaceholderId,
      sender: "assistant",
      text: "",
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsSending(true);
    setAgentStatus("ShopMate AI réfléchit...");

    // Request animation frame for smooth scroll to the newly added bubbles
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      activeStreamRef.current = await streamAgentChat(
        {
          message: content,
          conversationId,
        },
        {
          onStart: (convId) => {
            setConversationId(convId);
          },

          onSources: (sources) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantPlaceholderId ? { ...m, sources } : m
              )
            );
          },

          onToolCall: (tool) => {
            if (tool.includes("Product") || tool.includes("Catalog") || tool.includes("search")) {
              setAgentStatus("🔍 Consultation du catalogue...");
            } else if (tool.includes("Order")) {
              setAgentStatus("📦 Accès aux commandes...");
            } else {
              setAgentStatus("⚙️ Traitement de votre demande...");
            }
          },

          onToken: (token) => {
            setAgentStatus(null);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantPlaceholderId
                  ? { ...m, text: m.text + token }
                  : m
              )
            );
            flatListRef.current?.scrollToEnd({ animated: true });
          },

          onDone: () => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantPlaceholderId
                  ? { ...m, isStreaming: false }
                  : m
              )
            );
            setIsSending(false);
            setAgentStatus(null);
          },

          onError: (err) => {
            if (err.isRateLimit) {
              setRateLimitNotice(err.message);
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantPlaceholderId
                  ? {
                      ...m,
                      text:
                        m.text ||
                        `⚠️ ${err.message || "Une erreur est survenue lors de l'échange."}`,
                      isStreaming: false,
                      error: true,
                      canRetry: true,
                      retryText: content,
                    }
                  : m
              )
            );
            setIsSending(false);
            setAgentStatus(null);
          },
        }
      );
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantPlaceholderId
            ? {
                ...m,
                text: "⚠️ Impossible de contacter le serveur. Vérifiez votre connexion.",
                isStreaming: false,
                error: true,
                canRetry: true,
                retryText: content,
              }
            : m
        )
      );
      setIsSending(false);
      setAgentStatus(null);
    }
  };

  const handleStopStreaming = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.abort();
      activeStreamRef.current = null;
      setIsSending(false);
      setAgentStatus(null);
      setMessages((prev) =>
        prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.botAvatar}>
            <Text style={{ fontSize: 18 }}>🤖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>ShopMate AI</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>
                {agentStatus || "En ligne • Paiement à la livraison"}
              </Text>
            </View>
          </View>
          {isSending ? (
            <Pressable
              style={styles.stopButton}
              onPress={handleStopStreaming}
              accessibilityLabel="Arrêter la réponse"
            >
              <Text style={styles.stopButtonText}>Arrêter</Text>
            </Pressable>
          ) : null}
        </View>

        {rateLimitNotice ? (
          <View style={styles.rateLimitBanner}>
            <Text style={styles.rateLimitText}>⏱️ {rateLimitNotice}</Text>
          </View>
        ) : null}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={styles.keyboardContainer}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageRow,
                item.sender === "user" ? styles.userRow : styles.assistantRow,
              ]}
            >
              {item.sender === "assistant" ? (
                <View style={styles.bubbleAvatar}>
                  <Text style={{ fontSize: 14 }}>🤖</Text>
                </View>
              ) : null}

              <View
                style={[
                  styles.bubble,
                  item.sender === "user"
                    ? styles.userBubble
                    : styles.assistantBubble,
                  item.error && styles.errorBubble,
                ]}
              >
                {/* Message Text or Typing dots */}
                {item.isStreaming && !item.text ? (
                  <View style={styles.typingRow}>
                    <ActivityIndicator size="small" color={colorTokens.primary} />
                    <Text style={styles.typingText}>
                      {agentStatus || "Génération en cours..."}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.bubbleText,
                      item.sender === "user"
                        ? styles.userText
                        : styles.assistantText,
                      item.error && styles.errorText,
                    ]}
                  >
                    {item.text}
                  </Text>
                )}

                {/* Source citations from RAG */}
                {item.sources && item.sources.length > 0 ? (
                  <View style={styles.sourcesContainer}>
                    <Text style={styles.sourcesLabel}>Sources :</Text>
                    <View style={styles.sourcesList}>
                      {item.sources.map((src: ChatSource, i: number) => (
                        <View key={i} style={styles.sourceBadge}>
                          <Text style={styles.sourceBadgeText}>
                            📄 {src.name} ({src.score}%)
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* Retry action on error */}
                {item.canRetry && item.retryText ? (
                  <Pressable
                    style={styles.retryButton}
                    onPress={() => sendMessage(item.retryText)}
                  >
                    <Text style={styles.retryButtonText}>🔄 Réessayer</Text>
                  </Pressable>
                ) : null}

                <Text
                  style={[
                    styles.timestamp,
                    item.sender === "user"
                      ? styles.userTimestamp
                      : styles.assistantTimestamp,
                  ]}
                >
                  {item.timestamp}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            messages.length <= 2 && !isSending ? (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Suggestions rapides :</Text>
                <View style={styles.suggestionsList}>
                  {INITIAL_SUGGESTIONS.map((suggestion, index) => (
                    <Pressable
                      key={index}
                      style={({ pressed }) => [
                        styles.suggestionChip,
                        pressed && styles.suggestionChipPressed,
                      ]}
                      onPress={() => sendMessage(suggestion)}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null
          }
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Posez une question sur les produits ou commandes..."
            placeholderTextColor={colorTokens.muted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
            editable={!isSending}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || isSending) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colorTokens.surface} />
            ) : (
              <Text style={styles.sendButtonText}>➔</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colorTokens.surface,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacingTokens.md,
    paddingVertical: spacingTokens.sm,
    borderBottomWidth: 1,
    borderBottomColor: colorTokens.border,
    backgroundColor: colorTokens.surface,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingTokens.sm,
  },
  botAvatar: {
    width: 38,
    height: 38,
    borderRadius: radiusTokens.full,
    backgroundColor: colorTokens.secondaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colorTokens.ink,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10b981",
  },
  statusText: {
    fontSize: 11,
    color: colorTokens.muted,
  },
  stopButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radiusTokens.md,
    backgroundColor: colorTokens.errorContainer,
  },
  stopButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: colorTokens.error,
  },
  rateLimitBanner: {
    marginTop: 8,
    padding: 8,
    borderRadius: radiusTokens.md,
    backgroundColor: colorTokens.surfaceContainerHighest,
  },
  rateLimitText: {
    fontSize: 12,
    color: colorTokens.brand,
    fontWeight: "500",
  },
  messageList: {
    padding: spacingTokens.md,
    paddingBottom: spacingTokens.lg,
    gap: spacingTokens.sm,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacingTokens.xs,
  },
  userRow: {
    justifyContent: "flex-end",
  },
  assistantRow: {
    justifyContent: "flex-start",
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: radiusTokens.full,
    backgroundColor: colorTokens.secondaryContainer,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radiusTokens.xl,
  },
  userBubble: {
    backgroundColor: colorTokens.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colorTokens.surfaceContainer,
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    backgroundColor: colorTokens.errorContainer,
    borderColor: colorTokens.error,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: colorTokens.onPrimary,
  },
  assistantText: {
    color: colorTokens.ink,
  },
  errorText: {
    color: colorTokens.onErrorContainer,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  typingText: {
    fontSize: 13,
    color: colorTokens.muted,
    fontStyle: "italic",
  },
  sourcesContainer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colorTokens.border,
  },
  sourcesLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colorTokens.muted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sourcesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  sourceBadge: {
    backgroundColor: colorTokens.surfaceContainerLowest,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radiusTokens.sm,
    borderWidth: 1,
    borderColor: colorTokens.border,
  },
  sourceBadgeText: {
    fontSize: 10,
    color: colorTokens.ink,
  },
  retryButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: colorTokens.surfaceContainerLowest,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    borderColor: colorTokens.border,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colorTokens.primary,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  userTimestamp: {
    color: "rgba(255,255,255,0.7)",
  },
  assistantTimestamp: {
    color: colorTokens.muted,
  },
  suggestionsContainer: {
    marginTop: spacingTokens.lg,
    paddingHorizontal: spacingTokens.xs,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colorTokens.muted,
    marginBottom: spacingTokens.sm,
  },
  suggestionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
  },
  suggestionChip: {
    backgroundColor: colorTokens.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colorTokens.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radiusTokens.full,
  },
  suggestionChipPressed: {
    opacity: 0.7,
  },
  suggestionText: {
    fontSize: 12,
    color: colorTokens.ink,
    fontWeight: "500",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacingTokens.md,
    paddingVertical: spacingTokens.sm,
    backgroundColor: colorTokens.surface,
    borderTopWidth: 1,
    borderTopColor: colorTokens.border,
    gap: spacingTokens.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    backgroundColor: colorTokens.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.xl,
    paddingHorizontal: spacingTokens.md,
    paddingVertical: 8,
    fontSize: 14,
    color: colorTokens.ink,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: radiusTokens.full,
    backgroundColor: colorTokens.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonPressed: {
    opacity: 0.85,
  },
  sendButtonDisabled: {
    backgroundColor: colorTokens.border,
    opacity: 0.6,
  },
  sendButtonText: {
    color: colorTokens.surface,
    fontSize: 18,
    fontWeight: "bold",
  },
});
