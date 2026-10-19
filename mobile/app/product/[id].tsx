import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiClient } from "@/src/api/client";
import { useCatalogStore, type Product } from "@/src/stores/catalogStore";
import {
  colorTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
} from "@/src/theme/tokens";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";

const DEFAULT_SIZES = ["S", "M", "L", "XL"];
const SHOE_SIZES = ["40", "41", "42", "43", "44"];

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [liveStock, setLiveStock] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [quantity, setQuantity] = useState<number>(1);
  const [isOrdering, setIsOrdering] = useState<boolean>(false);

  const productId = Number(id);

  const fetchDetails = useCallback(async () => {
    if (!productId || isNaN(productId)) {
      setError("Identifiant de produit invalide.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch full product details
      const response = await apiClient.get<{ product: Product }>(
        `/api/products/${productId}`
      );
      const prod = response.data.product;
      setProduct(prod);

      // 2. Fetch live stock and price check (never hallucinated)
      try {
        const stockRes = await apiClient.get<{ stock: number; inStock: boolean }>(
          `/api/products/${productId}/stock`
        );
        setLiveStock(stockRes.data.stock);
      } catch {
        setLiveStock(prod.stock);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          "Impossible de charger les détails de ce produit."
      );
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleOrderCOD = async () => {
    if (!product) return;

    const currentStock = liveStock ?? product.stock;
    if (currentStock < quantity) {
      Alert.alert(
        "Stock insuffisant",
        `Désolé, il ne reste que ${currentStock} exemplaire(s) en stock.`
      );
      return;
    }

    Alert.alert(
      "Confirmation de commande COD",
      `Confirmez-vous votre commande de ${quantity}x "${product.name}" pour un total de ${(
        Number(product.price) * quantity
      ).toFixed(2)} MAD payable à la livraison ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer la commande",
          onPress: async () => {
            setIsOrdering(true);
            try {
              await apiClient.post("/api/orders", {
                items: [{ productId: product.id, quantity }],
              });

              Alert.alert(
                "Commande confirmée ! 🎉",
                "Votre commande en paiement à la livraison a été enregistrée avec succès. Vous pouvez la suivre dans l'onglet Commandes.",
                [
                  {
                    text: "Voir mes commandes",
                    onPress: () => router.push("/(tabs)/orders" as any),
                  },
                ]
              );
            } catch (err: any) {
              Alert.alert(
                "Erreur",
                err.response?.data?.error ||
                  "Une erreur est survenue lors de la création de votre commande."
              );
            } finally {
              setIsOrdering(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>‹ Retour</Text>
          </Pressable>
        </View>
        <Loader message="Chargement des détails du produit..." />
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>‹ Retour</Text>
          </Pressable>
        </View>
        <ErrorState
          message={error || "Produit introuvable."}
          onRetry={fetchDetails}
        />
      </SafeAreaView>
    );
  }

  const stockAvailable = liveStock !== null ? liveStock : product.stock;
  const isOutOfStock = stockAvailable <= 0;
  const isShoe = product.category?.name?.toLowerCase().includes("chaussure");
  const availableSizes = isShoe ? SHOE_SIZES : DEFAULT_SIZES;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* Navigation Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>‹ Boutique</Text>
        </Pressable>
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>PAIEMENT À LA LIVRAISON</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Product Artwork / Image Banner */}
        <View style={styles.artworkContainer}>
          {product.imageUrl && !imageFailed ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View style={styles.artworkPattern}>
              <Text style={styles.artworkInitial}>{product.name.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>
              {product.category?.name || "Boutique ShopMate"}
            </Text>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.detailsContent}>
          {/* Title & Price */}
          <Text style={styles.productTitle}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{Number(product.price).toFixed(2)} MAD</Text>
            {product.sku ? (
              <Text style={styles.skuText}>RÉF: {product.sku}</Text>
            ) : null}
          </View>

          {/* Stock Status Indicator */}
          <View style={styles.stockStatusRow}>
            <View
              style={[
                styles.stockDot,
                isOutOfStock ? styles.stockDotEmpty : styles.stockDotSuccess,
              ]}
            />
            <Text
              style={[
                styles.stockStatusText,
                isOutOfStock ? styles.stockTextEmpty : styles.stockTextSuccess,
              ]}
            >
              {isOutOfStock
                ? "Rupture de stock"
                : `En stock (${stockAvailable} disponible${stockAvailable > 1 ? "s" : ""})`}
            </Text>
          </View>

          {/* Sizes Selection */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>CHOIX DE LA TAILLE</Text>
            <View style={styles.sizesRow}>
              {availableSizes.map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <Pressable
                    key={size}
                    style={({ pressed }) => [
                      styles.sizeOption,
                      isSelected && styles.sizeOptionSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setSelectedSize(size)}
                  >
                    <Text
                      style={[
                        styles.sizeText,
                        isSelected && styles.sizeTextSelected,
                      ]}
                    >
                      {size}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Quantity Selector */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>QUANTITÉ</Text>
            <View style={styles.quantityRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.qtyButton,
                  quantity <= 1 && styles.qtyButtonDisabled,
                  pressed && styles.pressed,
                ]}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Text style={styles.qtyButtonText}>−</Text>
              </Pressable>
              <Text style={styles.qtyNumber}>{quantity}</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.qtyButton,
                  quantity >= stockAvailable && styles.qtyButtonDisabled,
                  pressed && styles.pressed,
                ]}
                onPress={() => setQuantity((q) => Math.min(stockAvailable, q + 1))}
                disabled={quantity >= stockAvailable}
              >
                <Text style={styles.qtyButtonText}>+</Text>
              </Pressable>
              <Text style={styles.totalCalc}>
                Total: {(Number(product.price) * quantity).toFixed(2)} MAD
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>DESCRIPTION DU PRODUIT</Text>
            <Text style={styles.description}>
              {product.description ||
                "Produit de haute qualité sélectionné avec soin pour votre satisfaction. Livré partout au Maroc avec paiement sécurisé à la réception."}
            </Text>
          </View>

          {/* COD Reassurance Card */}
          <Card variant="highlight" style={styles.codCard}>
            <View style={styles.codRow}>
              <Text style={{ fontSize: 24 }}>🚚</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.codTitle}>Paiement à la livraison (COD)</Text>
                <Text style={styles.codSubtitle}>
                  Payez en dirhams uniquement à la réception de votre colis. Livraison express sous 24 à 48h.
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceBlock}>
          <Text style={styles.bottomTotalLabel}>Total commande</Text>
          <Text style={styles.bottomTotalPrice}>
            {(Number(product.price) * quantity).toFixed(2)} MAD
          </Text>
        </View>
        <Button
          title={isOutOfStock ? "Rupture de stock" : "Commander en COD"}
          onPress={handleOrderCOD}
          disabled={isOutOfStock || isOrdering}
          loading={isOrdering}
          size="lg"
          style={styles.orderButton}
          icon={<Text style={{ fontSize: 18 }}>🛍️</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colorTokens.surface,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacingTokens.md,
    paddingVertical: spacingTokens.sm,
    borderBottomWidth: 1,
    borderBottomColor: colorTokens.border,
    backgroundColor: colorTokens.surface,
  },
  backBtn: {
    paddingVertical: spacingTokens.xs,
    paddingHorizontal: spacingTokens.sm,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colorTokens.primary,
  },
  topBadge: {
    backgroundColor: colorTokens.codGold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radiusTokens.sm,
  },
  topBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colorTokens.ink,
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  artworkContainer: {
    height: 240,
    backgroundColor: colorTokens.brand,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  artworkPattern: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  artworkInitial: {
    fontSize: 64,
    fontWeight: "900",
    color: colorTokens.surface,
  },
  categoryPill: {
    position: "absolute",
    bottom: 12,
    left: 16,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radiusTokens.full,
  },
  categoryPillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailsContent: {
    padding: spacingTokens.lg,
  },
  productTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colorTokens.ink,
    lineHeight: 28,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacingTokens.sm,
  },
  price: {
    fontSize: 24,
    fontWeight: "900",
    color: colorTokens.primary,
  },
  skuText: {
    fontSize: 11,
    fontWeight: "600",
    color: colorTokens.muted,
  },
  stockStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacingTokens.sm,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockDotSuccess: {
    backgroundColor: "#10b981",
  },
  stockDotEmpty: {
    backgroundColor: colorTokens.danger,
  },
  stockStatusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  stockTextSuccess: {
    color: "#059669",
  },
  stockTextEmpty: {
    color: colorTokens.danger,
  },
  sectionBlock: {
    marginTop: spacingTokens.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colorTokens.muted,
    letterSpacing: 0.8,
    marginBottom: spacingTokens.sm,
  },
  sizesRow: {
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  sizeOption: {
    minWidth: 46,
    height: 42,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    borderColor: colorTokens.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorTokens.surfaceContainerLowest,
  },
  sizeOptionSelected: {
    borderColor: colorTokens.primary,
    backgroundColor: colorTokens.primary,
  },
  sizeText: {
    fontSize: 14,
    fontWeight: "700",
    color: colorTokens.ink,
  },
  sizeTextSelected: {
    color: colorTokens.onPrimary,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingTokens.md,
  },
  qtyButton: {
    width: 38,
    height: 38,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    borderColor: colorTokens.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorTokens.surfaceContainerLowest,
  },
  qtyButtonDisabled: {
    opacity: 0.4,
  },
  qtyButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: colorTokens.ink,
    lineHeight: 22,
  },
  qtyNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: colorTokens.ink,
    minWidth: 24,
    textAlign: "center",
  },
  totalCalc: {
    fontSize: 13,
    color: colorTokens.muted,
    marginLeft: "auto",
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: colorTokens.onSurfaceVariant,
  },
  codCard: {
    marginTop: spacingTokens.xl,
    padding: spacingTokens.md,
  },
  codRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingTokens.md,
  },
  codTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colorTokens.ink,
  },
  codSubtitle: {
    fontSize: 12,
    color: colorTokens.muted,
    marginTop: 2,
    lineHeight: 17,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    paddingHorizontal: spacingTokens.md,
    paddingVertical: spacingTokens.md,
    borderTopWidth: 1,
    borderTopColor: colorTokens.border,
    gap: spacingTokens.md,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  bottomPriceBlock: {
    minWidth: 90,
  },
  bottomTotalLabel: {
    fontSize: 10,
    color: colorTokens.muted,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  bottomTotalPrice: {
    fontSize: 18,
    fontWeight: "900",
    color: colorTokens.primary,
  },
  orderButton: {
    flex: 1,
  },
});
