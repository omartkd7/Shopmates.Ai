import React, { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiClient } from "@/src/api/client";
import {
  colorTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
} from "@/src/theme/tokens";
import { Card } from "@/src/components/Card";
import { Loader } from "@/src/components/Loader";
import { EmptyState } from "@/src/components/EmptyState";
import { ErrorState } from "@/src/components/ErrorState";
import { Button } from "@/src/components/Button";
import { BrandHeader } from "@/src/components/BrandHeader";

interface OrderItemData {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  product?: {
    name: string;
    price: number;
    sku?: string;
  };
}

interface OrderData {
  id: number;
  status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  total: number;
  createdAt: string;
  items?: OrderItemData[];
}

const STATUS_STEPS = ["Reçue", "Confirmée", "Expédiée", "En cours", "Livrée"];

function getStatusStepIndex(status: string): number {
  switch (status) {
    case "PENDING":
      return 0;
    case "CONFIRMED":
      return 1;
    case "SHIPPED":
      return 2;
    case "DELIVERED":
      return 4;
    default:
      return 0;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return { text: "En attente", color: "#F5A623", bg: "rgba(245, 166, 35, 0.12)" };
    case "CONFIRMED":
      return { text: "Confirmée", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.12)" };
    case "SHIPPED":
      return { text: "Expédiée", color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.12)" };
    case "DELIVERED":
      return { text: "Livrée", color: "#10B981", bg: "rgba(16, 185, 129, 0.12)" };
    case "CANCELLED":
      return { text: "Annulée", color: colorTokens.danger, bg: colorTokens.errorContainer };
    default:
      return { text: status, color: colorTokens.muted, bg: colorTokens.surfaceContainerLow };
  }
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get<{ orders: OrderData[] }>("/api/orders");
      setOrders(res.data.orders || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Impossible de charger les commandes.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchOrders();
  };

  const handleCancelOrder = async (orderId: number) => {
    try {
      await apiClient.post(`/api/orders/${orderId}/cancel`);
      fetchOrders();
    } catch {
      // Ignored or handled
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <BrandHeader />
        <View style={styles.header}>
          <Text style={styles.title}>Mes Commandes</Text>
          <Text style={styles.subtitle}>Suivez l'état de vos livraisons.</Text>
        </View>
        <Loader message="Chargement de vos commandes..." />
      </SafeAreaView>
    );
  }

  if (error && orders.length === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <BrandHeader />
        <View style={styles.header}>
          <Text style={styles.title}>Mes Commandes</Text>
        </View>
        <ErrorState message={error} onRetry={fetchOrders} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <BrandHeader />
      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colorTokens.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Mes Commandes</Text>
              <Text style={styles.subtitle}>Suivez l'état de vos livraisons.</Text>
            </View>
            <View style={styles.orderCountBadge}>
              <Text style={styles.orderCountText}>{orders.length} commande(s)</Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <OrderCard
            order={item}
            isFirst={index === 0}
            onCancel={() => handleCancelOrder(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="📦"
            title="Aucune commande pour le moment"
            description="Commandez vos articles préférés avec paiement sécurisé à la réception (COD)."
            actionTitle="Explorer la boutique"
            onAction={() => {}}
          />
        }
      />
    </SafeAreaView>
  );
}

function OrderCard({
  order,
  isFirst,
  onCancel,
}: {
  order: OrderData;
  isFirst: boolean;
  onCancel: () => void;
}) {
  const badge = getStatusBadge(order.status);
  const activeStep = getStatusStepIndex(order.status);
  const isCancelled = order.status === "CANCELLED";

  return (
    <Card variant="surface" style={styles.orderCard}>
      {/* Top row */}
      <View style={styles.orderCardHeader}>
        <View>
          <View style={styles.orderNumberRow}>
            <Text style={styles.orderNumber}>Commande #{order.id}</Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <View style={[styles.badgeDot, { backgroundColor: badge.color }]} />
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
            </View>
          </View>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>

        <View style={styles.totalBlock}>
          <Text style={styles.totalPrice}>{Number(order.total).toFixed(2)} MAD</Text>
          <View style={styles.codBadge}>
            <Text style={styles.codIcon}>🚚</Text>
            <Text style={styles.codText}>COD</Text>
          </View>
        </View>
      </View>

      {/* Progress Timeline (for active / non-cancelled orders) */}
      {!isCancelled ? (
        <View style={styles.timelineContainer}>
          <Text style={styles.timelineLabel}>ÉTAT D'AVANCEMENT</Text>
          <View style={styles.timelineBar}>
            {STATUS_STEPS.map((step, idx) => {
              const isPast = idx <= activeStep;
              const isCurrent = idx === activeStep;

              return (
                <View key={step} style={styles.timelineStep}>
                  <View
                    style={[
                      styles.stepDot,
                      isPast && styles.stepDotActive,
                      isCurrent && styles.stepDotCurrent,
                    ]}
                  >
                    {isPast ? <Text style={styles.stepCheckmark}>✓</Text> : null}
                  </View>
                  <Text
                    style={[
                      styles.stepText,
                      isCurrent && styles.stepTextCurrent,
                      !isPast && styles.stepTextInactive,
                    ]}
                  >
                    {step}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Items preview */}
      {order.items && order.items.length > 0 ? (
        <View style={styles.itemsList}>
          {order.items.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemQty}>{it.quantity}x</Text>
              <Text style={styles.itemName} numberOfLines={1}>
                {it.product?.name || `Produit #${it.productId}`}
              </Text>
              <Text style={styles.itemPrice}>
                {(Number(it.unitPrice) * it.quantity).toFixed(2)} MAD
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Actions */}
      {order.status === "PENDING" ? (
        <Button
          title="Annuler la commande"
          onPress={onCancel}
          variant="outline"
          size="sm"
          style={styles.cancelBtn}
          textStyle={{ color: colorTokens.danger }}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colorTokens.surface,
  },
  listContent: {
    paddingHorizontal: spacingTokens.md,
    paddingBottom: spacingTokens.xxl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: spacingTokens.xl,
    paddingBottom: spacingTokens.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colorTokens.ink,
  },
  subtitle: {
    fontSize: 14,
    color: colorTokens.muted,
    marginTop: 2,
  },
  orderCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colorTokens.surfaceContainer,
    borderRadius: radiusTokens.full,
  },
  orderCountText: {
    fontSize: 12,
    color: colorTokens.ink,
    fontWeight: "600",
  },
  orderCard: {
    marginBottom: spacingTokens.md,
    backgroundColor: colorTokens.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colorTokens.border,
    padding: spacingTokens.md,
  },
  orderCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingTokens.sm,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: colorTokens.ink,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radiusTokens.full,
    gap: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  orderDate: {
    fontSize: 12,
    color: colorTokens.muted,
    marginTop: 2,
  },
  totalBlock: {
    alignItems: "flex-end",
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: colorTokens.primary,
  },
  codBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colorTokens.codGold,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 3,
  },
  codIcon: {
    fontSize: 10,
  },
  codText: {
    fontSize: 9,
    fontWeight: "800",
    color: colorTokens.ink,
  },
  timelineContainer: {
    backgroundColor: colorTokens.surfaceContainerLow,
    borderRadius: radiusTokens.md,
    padding: spacingTokens.sm,
    marginTop: spacingTokens.md,
  },
  timelineLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colorTokens.muted,
    letterSpacing: 0.5,
    marginBottom: spacingTokens.sm,
  },
  timelineBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineStep: {
    alignItems: "center",
    flex: 1,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colorTokens.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: colorTokens.primary,
  },
  stepDotCurrent: {
    backgroundColor: colorTokens.codGold,
  },
  stepCheckmark: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  stepText: {
    fontSize: 9,
    fontWeight: "600",
    color: colorTokens.ink,
  },
  stepTextCurrent: {
    color: colorTokens.codGoldDark,
    fontWeight: "800",
  },
  stepTextInactive: {
    color: colorTokens.muted,
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: colorTokens.surfaceContainer,
    marginTop: spacingTokens.md,
    paddingTop: spacingTokens.sm,
    gap: 4,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemQty: {
    fontSize: 12,
    fontWeight: "700",
    color: colorTokens.primary,
    width: 24,
  },
  itemName: {
    fontSize: 13,
    color: colorTokens.ink,
    flex: 1,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: "600",
    color: colorTokens.muted,
  },
  cancelBtn: {
    marginTop: spacingTokens.sm,
    borderColor: colorTokens.errorContainer,
  },
});
