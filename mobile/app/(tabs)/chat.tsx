import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  streamAgentChat,
  fetchConversationHistory,
  ActiveStream,
  ChatSource,
  ConversationSummary,
} from "@/src/api/agentChat";
import { useAuthStore } from "@/src/stores/authStore";
import {
  colorTokens,
  radiusTokens,
  spacingTokens,
} from "@/src/theme/tokens";
import { BrandHeader } from "@/src/components/BrandHeader";

export interface ProductCardData {
  id: number;
  name: string;
  price: number;
  stock?: number;
  inStock?: boolean;
  category?: string | null;
}

export interface OrderRecapData {
  action: "createOrder" | "cancelOrder";
  token?: string;
  recapText: string;
  total?: number;
  status: "pending" | "confirmed" | "cancelled";
}

export interface CreatedOrderData {
  orderId: number;
  total?: number;
  status?: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  isStreaming?: boolean;
  sources?: ChatSource[];
  products?: ProductCardData[];
  orderRecap?: OrderRecapData;
  createdOrder?: CreatedOrderData;
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

function formatConversationDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24 && now.getDate() === date.getDate()) {
      return `Aujourd'hui à ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (diffHours < 48) {
      return `Hier à ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    return date.toLocaleDateString([], { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

export default function ChatScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text: `Bonjour ${user?.name ? user.name : ""} ! Je suis ShopMate AI, votre assistant d'achat en paiement à la livraison (COD). Posez-moi vos questions ou choisissez une conversation précédente.`,
      timestamp: "À l'instant",
    },
  ]);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const activeStreamRef = useRef<ActiveStream | null>(null);

  // ── Helper to convert DB messages to ChatMessage items ─────────────────────
  const mapDbMessagesToChat = useCallback(
    (dbMessages: ConversationSummary["messages"]): ChatMessage[] => {
      return dbMessages.map((m) => {
        let createdOrder: CreatedOrderData | undefined;
        const orderMatch = m.content.match(/Commande\s*#(\d+)/i);
        if (m.role === "assistant" && orderMatch) {
          createdOrder = { orderId: parseInt(orderMatch[1], 10) };
        }

        return {
          id: `msg-${m.id}`,
          sender: m.role,
          text: m.content,
          timestamp: new Date(m.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          createdOrder,
        };
      });
    },
    []
  );

  // ── Fetch conversations list from backend ──────────────────────────────────
  const refreshConversationsList = useCallback(
    async (selectLatestIfEmpty = false) => {
      try {
        setIsLoadingHistory(true);
        const list = await fetchConversationHistory();
        setConversations(list || []);

        if (selectLatestIfEmpty && list && list.length > 0) {
          const latest = list[0];
          setConversationId(latest.id);
          if (latest.messages && latest.messages.length > 0) {
            setMessages(mapDbMessagesToChat(latest.messages));
          }
        }
      } catch {
        // Fallback to initial state if offline
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [mapDbMessagesToChat]
  );

  // ── Initial load on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      refreshConversationsList(true);
    }
    return () => {
      isMounted = false;
      activeStreamRef.current?.abort();
    };
  }, [refreshConversationsList]);

  // ── Switch to an existing conversation ─────────────────────────────────────
  const handleSelectConversation = (conv: ConversationSummary) => {
    activeStreamRef.current?.abort();
    setConversationId(conv.id);
    setIsSending(false);
    setAgentStatus(null);
    setRateLimitNotice(null);

    if (conv.messages && conv.messages.length > 0) {
      setMessages(mapDbMessagesToChat(conv.messages));
    } else {
      setMessages([
        {
          id: `conv-start-${conv.id}`,
          sender: "assistant",
          text: `Reprise de la conversation « ${conv.title} ». Comment puis-je vous aider ?`,
          timestamp: "À l'instant",
        },
      ]);
    }

    setIsHistoryModalVisible(false);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
  };

  // ── Start a fresh new conversation ─────────────────────────────────────────
  const handleStartNewConversation = () => {
    activeStreamRef.current?.abort();
    setConversationId(undefined);
    setIsSending(false);
    setAgentStatus(null);
    setRateLimitNotice(null);

    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "assistant",
        text: `✨ Nouvelle conversation démarrée ! Que recherchez-vous aujourd'hui (produits, suivi de commande, délais COD) ?`,
        timestamp: "À l'instant",
      },
    ]);

    setIsHistoryModalVisible(false);
  };

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
              setAgentStatus("🔍 Recherche de produits...");
            } else if (tool.includes("Stock")) {
              setAgentStatus("📊 Vérification du stock en direct...");
            } else if (tool.includes("createOrder")) {
              setAgentStatus("📋 Préparation du récapitulatif...");
            } else if (tool.includes("cancelOrder")) {
              setAgentStatus("⚠️ Préparation de l'annulation...");
            } else if (tool.includes("Order")) {
              setAgentStatus("📦 Consultation des commandes...");
            } else {
              setAgentStatus("⚙️ Traitement de votre demande...");
            }
          },

          onToolResult: (tool, result) => {
            // 1. Found products from searchProducts or getProductDetails
            if (tool === "searchProducts" && result?.products?.length > 0) {
              const productsList: ProductCardData[] = result.products.map((p: any) => ({
                id: p.id,
                name: p.name,
                price: Number(p.price),
                stock: p.stock,
                inStock: p.inStock ?? (p.stock > 0),
                category: p.category,
              }));

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantPlaceholderId
                    ? { ...m, products: productsList }
                    : m
                )
              );
            } else if (tool === "getProductDetails" && result?.product) {
              const p = result.product;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantPlaceholderId
                    ? {
                        ...m,
                        products: [
                          {
                            id: p.id,
                            name: p.name,
                            price: Number(p.price),
                            stock: p.stock,
                            inStock: p.stock > 0,
                            category: p.category?.name,
                          },
                        ],
                      }
                    : m
                )
              );
            }

            // 2. Order Recap requiring explicit confirmation
            if (tool === "createOrder" && result?.requiresConfirmation) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantPlaceholderId
                    ? {
                        ...m,
                        orderRecap: {
                          action: "createOrder",
                          token: result.confirmationToken,
                          recapText: result.recap,
                          total: result.total,
                          status: "pending",
                        },
                      }
                    : m
                )
              );
            } else if (tool === "cancelOrder" && result?.requiresConfirmation) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantPlaceholderId
                    ? {
                        ...m,
                        orderRecap: {
                          action: "cancelOrder",
                          token: result.confirmationToken,
                          recapText: result.recap,
                          status: "pending",
                        },
                      }
                    : m
                )
              );
            }

            // 3. Executed order result
            if (result?.success && result?.orderId) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantPlaceholderId
                    ? {
                        ...m,
                        createdOrder: {
                          orderId: result.orderId,
                          total: result.total,
                          status: result.status,
                        },
                      }
                    : m
                )
              );
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

          onConfirmation: (confirmed, orderId) => {
            if (confirmed && orderId) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantPlaceholderId
                    ? { ...m, createdOrder: { orderId } }
                    : m
                )
              );
            }
          },

          onDone: (payload) => {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantPlaceholderId) return m;
                const updated: ChatMessage = { ...m, isStreaming: false };
                if (payload.orderId) {
                  updated.createdOrder = { orderId: payload.orderId };
                }
                return updated;
              })
            );
            setIsSending(false);
            setAgentStatus(null);

            // Silently update conversation list in background so title/dates are refreshed
            refreshConversationsList(false);
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
    } catch {
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

  // ── Confirm order button handler ────────────────────────────────────────────
  const handleConfirmOrder = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.orderRecap
          ? {
              ...m,
              orderRecap: { ...m.orderRecap, status: "confirmed" },
            }
          : m
      )
    );
    sendMessage("Oui");
  };

  // ── Cancel order recap handler ──────────────────────────────────────────────
  const handleCancelOrder = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.orderRecap
          ? {
              ...m,
              orderRecap: { ...m.orderRecap, status: "cancelled" },
            }
          : m
      )
    );
    sendMessage("Non, annuler");
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
      <BrandHeader />
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
              <Text style={styles.statusText} numberOfLines={1}>
                {agentStatus || "En ligne • Paiement à la livraison (COD)"}
              </Text>
            </View>
          </View>

          {/* Action buttons in header */}
          <View style={styles.headerActions}>
            {isSending ? (
              <Pressable
                style={styles.stopButton}
                onPress={handleStopStreaming}
                accessibilityLabel="Arrêter la réponse"
              >
                <Text style={styles.stopButtonText}>Arrêter</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.newChatButton}
              onPress={handleStartNewConversation}
              accessibilityLabel="Nouvelle conversation"
            >
              <Text style={styles.newChatButtonText}>+ Nouveau</Text>
            </Pressable>

            <Pressable
              style={styles.historyButton}
              onPress={() => {
                refreshConversationsList(false);
                setIsHistoryModalVisible(true);
              }}
              accessibilityLabel="Historique des conversations"
            >
              <Text style={styles.historyButtonText}>📜</Text>
            </Pressable>
          </View>
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
                {/* 1. Message Text or Typing Indicator */}
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

                {/* 2. Tappable Product Cards */}
                {item.products && item.products.length > 0 ? (
                  <View style={styles.productsContainer}>
                    <Text style={styles.productsSectionTitle}>
                      🛍️ Produits disponibles :
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.productsScrollContent}
                    >
                      {item.products.map((p: ProductCardData) => (
                        <Pressable
                          key={p.id}
                          style={({ pressed }) => [
                            styles.productCard,
                            pressed && styles.buttonPressed,
                          ]}
                          onPress={() => router.push(`/product/${p.id}` as any)}
                        >
                          <View style={styles.productCardTop}>
                            <View style={styles.productIconBox}>
                              <Text style={{ fontSize: 22 }}>📦</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.productName} numberOfLines={1}>
                                {p.name}
                              </Text>
                              {p.category ? (
                                <Text style={styles.productCategory}>{p.category}</Text>
                              ) : null}
                            </View>
                          </View>

                          <View style={styles.productCardBottom}>
                            <Text style={styles.productPrice}>{p.price} DH</Text>
                            <View
                              style={[
                                styles.stockPill,
                                p.inStock ? styles.stockPillIn : styles.stockPillOut,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.stockPillText,
                                  p.inStock
                                    ? styles.stockPillTextIn
                                    : styles.stockPillTextOut,
                                ]}
                              >
                                {p.inStock ? "En stock" : "Rupture"}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.tapToViewText}>Voir la fiche ➔</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                {/* 3. Order Recap Card with Explicit Confirm / Cancel Buttons */}
                {item.orderRecap ? (
                  <View style={styles.recapCardContainer}>
                    <View style={styles.recapHeaderRow}>
                      <Text style={styles.recapHeaderTitle}>
                        {item.orderRecap.action === "cancelOrder"
                          ? "⚠️ Confirmation d'annulation"
                          : "📋 Récapitulatif de commande"}
                      </Text>
                      <View style={styles.codTag}>
                        <Text style={styles.codTagText}>Paiement COD</Text>
                      </View>
                    </View>

                    <Text style={styles.recapBodyText}>{item.orderRecap.recapText}</Text>

                    {item.orderRecap.total ? (
                      <View style={styles.recapTotalRow}>
                        <Text style={styles.recapTotalLabel}>
                          Total à payer à la livraison :
                        </Text>
                        <Text style={styles.recapTotalAmount}>
                          {item.orderRecap.total} DH
                        </Text>
                      </View>
                    ) : null}

                    {item.orderRecap.status === "pending" ? (
                      <View style={styles.recapActionsRow}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.confirmButton,
                            pressed && styles.buttonPressed,
                            isSending && styles.buttonDisabled,
                          ]}
                          onPress={() => handleConfirmOrder(item.id)}
                          disabled={isSending}
                        >
                          <Text style={styles.confirmButtonText}>
                            {item.orderRecap.action === "cancelOrder"
                              ? "Confirmer l'annulation"
                              : "✅ Confirmer la commande"}
                          </Text>
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [
                            styles.cancelButton,
                            pressed && styles.buttonPressed,
                            isSending && styles.buttonDisabled,
                          ]}
                          onPress={() => handleCancelOrder(item.id)}
                          disabled={isSending}
                        >
                          <Text style={styles.cancelButtonText}>Non, annuler</Text>
                        </Pressable>
                      </View>
                    ) : item.orderRecap.status === "confirmed" ? (
                      <View style={styles.confirmedNoticeRow}>
                        <Text style={styles.confirmedNoticeText}>
                          ✅ Validé par vos soins — Commande en création...
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.cancelledNoticeRow}>
                        <Text style={styles.cancelledNoticeText}>
                          ❌ Action annulée
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null}

                {/* 4. Created Order Success Card */}
                {item.createdOrder ? (
                  <View style={styles.createdOrderCard}>
                    <View style={styles.createdOrderHeader}>
                      <View style={styles.createdOrderIconBadge}>
                        <Text style={{ fontSize: 18 }}>🎉</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.createdOrderTitle}>
                          Commande #{item.createdOrder.orderId} créée !
                        </Text>
                        <Text style={styles.createdOrderSubtitle}>
                          Paiement en espèces à la livraison (COD)
                        </Text>
                      </View>
                    </View>

                    {item.createdOrder.total ? (
                      <Text style={styles.createdOrderAmount}>
                        Montant total : {item.createdOrder.total} DH
                      </Text>
                    ) : null}

                    <Pressable
                      style={({ pressed }) => [
                        styles.viewOrderButton,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => router.push("/orders" as any)}
                    >
                      <Text style={styles.viewOrderButtonText}>
                        📦 Voir ma commande ➔
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {/* 5. Cited Sources under RAG answers */}
                {item.sources && item.sources.length > 0 ? (
                  <View style={styles.sourcesContainer}>
                    <Text style={styles.sourcesLabel}>Sources vérifiées :</Text>
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
            placeholder="Posez une question, demandez un produit..."
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

      {/* ── Modal: Conversation History ────────────────────────────────────── */}
      <Modal
        visible={isHistoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 18 }}>📜</Text>
                <Text style={styles.modalTitle}>Mes conversations</Text>
              </View>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setIsHistoryModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </Pressable>
            </View>

            {/* New Conversation Action */}
            <Pressable
              style={({ pressed }) => [
                styles.modalNewChatButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleStartNewConversation}
            >
              <Text style={styles.modalNewChatButtonText}>
                ✨ Démarrer une nouvelle conversation
              </Text>
            </Pressable>

            {/* Conversation List */}
            {isLoadingHistory ? (
              <View style={styles.modalLoadingBox}>
                <ActivityIndicator size="small" color={colorTokens.primary} />
                <Text style={styles.modalLoadingText}>Chargement de l'historique...</Text>
              </View>
            ) : conversations.length === 0 ? (
              <View style={styles.modalEmptyBox}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text>
                <Text style={styles.modalEmptyTitle}>Aucune conversation passée</Text>
                <Text style={styles.modalEmptySubtitle}>
                  Posez votre première question pour commencer à échanger avec ShopMate AI.
                </Text>
              </View>
            ) : (
              <FlatList
                data={conversations}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.modalListContent}
                renderItem={({ item }) => {
                  const isActive = item.id === conversationId;
                  const lastMsg =
                    item.messages && item.messages.length > 0
                      ? item.messages[item.messages.length - 1].content
                      : "Pas encore de messages";

                  return (
                    <Pressable
                      style={({ pressed }) => [
                        styles.conversationItem,
                        isActive && styles.conversationItemActive,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => handleSelectConversation(item)}
                    >
                      <View style={styles.conversationItemHeader}>
                        <Text
                          style={[
                            styles.conversationItemTitle,
                            isActive && styles.conversationItemTitleActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.title || `Conversation #${item.id}`}
                        </Text>
                        <Text style={styles.conversationItemDate}>
                          {formatConversationDate(item.updatedAt)}
                        </Text>
                      </View>

                      <Text
                        style={styles.conversationItemPreview}
                        numberOfLines={2}
                      >
                        {lastMsg}
                      </Text>

                      {isActive ? (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>En cours</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stopButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radiusTokens.md,
    backgroundColor: colorTokens.errorContainer,
  },
  stopButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: colorTokens.error,
  },
  newChatButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radiusTokens.md,
    backgroundColor: colorTokens.surfaceContainer,
    borderWidth: 1,
    borderColor: colorTokens.border,
  },
  newChatButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: colorTokens.primary,
  },
  historyButton: {
    width: 32,
    height: 32,
    borderRadius: radiusTokens.md,
    backgroundColor: colorTokens.surfaceContainer,
    borderWidth: 1,
    borderColor: colorTokens.border,
    alignItems: "center",
    justifyContent: "center",
  },
  historyButtonText: {
    fontSize: 14,
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
    maxWidth: "86%",
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

  // ── Products Tappable Cards ────────────────────────────────────────────────
  productsContainer: {
    marginTop: spacingTokens.sm,
    paddingTop: spacingTokens.xs,
  },
  productsSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colorTokens.ink,
    marginBottom: 6,
  },
  productsScrollContent: {
    gap: 10,
    paddingRight: 10,
  },
  productCard: {
    width: 175,
    backgroundColor: colorTokens.surfaceContainerLowest,
    borderRadius: radiusTokens.lg,
    padding: spacingTokens.sm,
    borderWidth: 1,
    borderColor: colorTokens.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  productCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  productIconBox: {
    width: 34,
    height: 34,
    borderRadius: radiusTokens.md,
    backgroundColor: colorTokens.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  productName: {
    fontSize: 12,
    fontWeight: "700",
    color: colorTokens.ink,
  },
  productCategory: {
    fontSize: 10,
    color: colorTokens.muted,
    textTransform: "uppercase",
  },
  productCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: colorTokens.primary,
  },
  stockPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radiusTokens.sm,
  },
  stockPillIn: {
    backgroundColor: colorTokens.secondaryContainer,
  },
  stockPillOut: {
    backgroundColor: colorTokens.errorContainer,
  },
  stockPillText: {
    fontSize: 9,
    fontWeight: "700",
  },
  stockPillTextIn: {
    color: colorTokens.onSecondaryContainer,
  },
  stockPillTextOut: {
    color: colorTokens.error,
  },
  tapToViewText: {
    fontSize: 10,
    fontWeight: "600",
    color: colorTokens.primary,
    marginTop: 6,
    alignSelf: "flex-end",
  },

  // ── Order Recap Card with Confirm/Cancel Buttons ───────────────────────────
  recapCardContainer: {
    marginTop: spacingTokens.sm,
    padding: spacingTokens.md,
    borderRadius: radiusTokens.lg,
    backgroundColor: colorTokens.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: colorTokens.primaryContainer,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recapHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  recapHeaderTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colorTokens.primary,
    flex: 1,
  },
  codTag: {
    backgroundColor: colorTokens.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radiusTokens.full,
    borderWidth: 1,
    borderColor: colorTokens.border,
  },
  codTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: colorTokens.ink,
  },
  recapBodyText: {
    fontSize: 12,
    lineHeight: 18,
    color: colorTokens.ink,
  },
  recapTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colorTokens.border,
  },
  recapTotalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colorTokens.ink,
  },
  recapTotalAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: colorTokens.primary,
  },
  recapActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colorTokens.primary,
    paddingVertical: 10,
    borderRadius: radiusTokens.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    color: colorTokens.surface,
    fontSize: 12,
    fontWeight: "700",
  },
  cancelButton: {
    backgroundColor: colorTokens.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radiusTokens.lg,
    borderWidth: 1,
    borderColor: colorTokens.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: colorTokens.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  confirmedNoticeRow: {
    marginTop: 8,
    paddingVertical: 6,
    backgroundColor: colorTokens.secondaryContainer,
    borderRadius: radiusTokens.md,
    alignItems: "center",
  },
  confirmedNoticeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colorTokens.onSecondaryContainer,
  },
  cancelledNoticeRow: {
    marginTop: 8,
    paddingVertical: 6,
    backgroundColor: colorTokens.errorContainer,
    borderRadius: radiusTokens.md,
    alignItems: "center",
  },
  cancelledNoticeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colorTokens.error,
  },

  // ── Created Order Card ─────────────────────────────────────────────────────
  createdOrderCard: {
    marginTop: spacingTokens.sm,
    padding: spacingTokens.md,
    borderRadius: radiusTokens.lg,
    backgroundColor: colorTokens.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: "#10b981",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  createdOrderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  createdOrderIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radiusTokens.full,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
  createdOrderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065f46",
  },
  createdOrderSubtitle: {
    fontSize: 11,
    color: colorTokens.muted,
  },
  createdOrderAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: colorTokens.ink,
    marginTop: 4,
    marginBottom: 8,
  },
  viewOrderButton: {
    backgroundColor: "#10b981",
    paddingVertical: 8,
    borderRadius: radiusTokens.md,
    alignItems: "center",
    justifyContent: "center",
  },
  viewOrderButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },

  // ── Sources Badges ─────────────────────────────────────────────────────────
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

  // ── Retry & Utilities ──────────────────────────────────────────────────────
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
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: "flex-end",
  },
  userTimestamp: {
    color: "rgba(255,255,255,0.7)",
  },
  assistantTimestamp: {
    color: colorTokens.muted,
  },

  // ── Suggestions ────────────────────────────────────────────────────────────
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

  // ── Input Bar ──────────────────────────────────────────────────────────────
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

  // ── Modal: Conversation History ────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "75%",
    backgroundColor: colorTokens.surface,
    borderTopLeftRadius: radiusTokens.xxl,
    borderTopRightRadius: radiusTokens.xxl,
    padding: spacingTokens.md,
    paddingBottom: spacingTokens.xl,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacingTokens.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colorTokens.ink,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: radiusTokens.full,
    backgroundColor: colorTokens.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colorTokens.ink,
  },
  modalNewChatButton: {
    backgroundColor: colorTokens.primary,
    paddingVertical: 12,
    borderRadius: radiusTokens.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacingTokens.md,
  },
  modalNewChatButtonText: {
    color: colorTokens.surface,
    fontSize: 13,
    fontWeight: "700",
  },
  modalLoadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalLoadingText: {
    fontSize: 13,
    color: colorTokens.muted,
  },
  modalEmptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacingTokens.lg,
  },
  modalEmptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colorTokens.ink,
    marginBottom: 4,
  },
  modalEmptySubtitle: {
    fontSize: 12,
    color: colorTokens.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  modalListContent: {
    gap: spacingTokens.sm,
    paddingBottom: spacingTokens.lg,
  },
  conversationItem: {
    backgroundColor: colorTokens.surfaceContainerLowest,
    borderRadius: radiusTokens.lg,
    padding: spacingTokens.md,
    borderWidth: 1,
    borderColor: colorTokens.border,
  },
  conversationItemActive: {
    borderColor: colorTokens.primary,
    backgroundColor: colorTokens.surfaceContainerLow,
    borderWidth: 1.5,
  },
  conversationItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  conversationItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colorTokens.ink,
    flex: 1,
    marginRight: 8,
  },
  conversationItemTitleActive: {
    color: colorTokens.primary,
  },
  conversationItemDate: {
    fontSize: 11,
    color: colorTokens.muted,
  },
  conversationItemPreview: {
    fontSize: 12,
    color: colorTokens.muted,
    lineHeight: 16,
  },
  activeBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: colorTokens.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radiusTokens.sm,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colorTokens.onSecondaryContainer,
  },
});
