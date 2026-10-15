import React, { useState, useRef } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiClient } from "@/src/api/client";
import { useAuthStore } from "@/src/stores/authStore";
import {
  colorTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
} from "@/src/theme/tokens";
import { Card } from "@/src/components/Card";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  productCard?: {
    name: string;
    price: number;
    category: string;
  };
}

const INITIAL_SUGGESTIONS = [
  "Quels sont vos délais pour Casablanca ?",
  "Avez-vous des tapis zellige ?",
  "Comment fonctionne le paiement COD ?",
  "Suivre ma commande en cours",
];

export default function ChatScreen() {
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text: `Bonjour ${user?.name ? user.name : ""} ! Je suis ShopMate AI, votre assistant shopping en paiement à la livraison. Comment puis-je vous aider aujourd'hui ?`,
      timestamp: "À l'instant",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async (textToSend?: string) => {
    const content = (textToSend || input).trim();
    if (!content || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await apiClient.post<{
        response?: string;
        message?: { content: string };
      }>("/api/agent/chat", {
        message: content,
      });

      const replyText =
        response.data.response ||
        response.data.message?.content ||
        "Je suis à votre service pour toute question sur nos produits ou vos commandes.";

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      // Graceful offline/local fallback
      const fallbackMessage: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: "assistant",
        text: "Nos articles sont expédiés en 24h à 48h partout au Maroc avec paiement sécurisé à la réception (Cash on Delivery). Avez-vous besoin d'un renseignement sur un produit précis ?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsSending(false);
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
          <View>
            <Text style={styles.headerTitle}>ShopMate AI</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>En ligne • Paiement à la livraison</Text>
            </View>
          </View>
        </View>
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
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
                  item.sender === "user" ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    item.sender === "user" ? styles.userText : styles.assistantText,
                  ]}
                >
                  {item.text}
                </Text>

                {item.productCard ? (
                  <Card variant="surface" style={styles.productSuggestion}>
                    <Text style={styles.productSuggestionName}>{item.productCard.name}</Text>
                    <Text style={styles.productSuggestionCategory}>{item.productCard.category}</Text>
                    <Text style={styles.productSuggestionPrice}>{item.productCard.price} MAD</Text>
                  </Card>
                ) : null}

                <Text
                  style={[
                    styles.timestamp,
                    item.sender === "user" ? styles.userTimestamp : styles.assistantTimestamp,
                  ]}
                >
                  {item.timestamp}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            isSending ? (
              <View style={[styles.messageRow, styles.assistantRow]}>
                <View style={styles.bubbleAvatar}>
                  <Text style={{ fontSize: 14 }}>🤖</Text>
                </View>
                <View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}>
                  <Text style={styles.typingText}>ShopMate réfléchit...</Text>
                </View>
              </View>
            ) : messages.length <= 2 ? (
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
            placeholder="Posez une question sur les produits..."
            placeholderTextColor={colorTokens.muted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
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
            <Text style={styles.sendButtonText}>➔</Text>
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
    maxWidth: "80%",
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
  typingBubble: {
    paddingVertical: 12,
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
  typingText: {
    fontSize: 13,
    fontStyle: "italic",
    color: colorTokens.muted,
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
  productSuggestion: {
    marginTop: spacingTokens.sm,
    padding: spacingTokens.sm,
    backgroundColor: colorTokens.surfaceContainerLowest,
  },
  productSuggestionName: {
    fontSize: 13,
    fontWeight: "700",
    color: colorTokens.ink,
  },
  productSuggestionCategory: {
    fontSize: 11,
    color: colorTokens.muted,
    textTransform: "uppercase",
  },
  productSuggestionPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: colorTokens.primary,
    marginTop: 4,
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
