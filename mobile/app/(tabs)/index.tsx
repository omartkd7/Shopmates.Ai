import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCatalogStore, type Product, type Category } from "@/src/stores/catalogStore";
import { useAuthStore } from "@/src/stores/authStore";
import {
  colorTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
} from "@/src/theme/tokens";
import { BrandHeader, Loader, EmptyState, ErrorState } from "@/src/components";

const PRICE_FILTERS = [
  { label: "Tous", min: undefined, max: undefined },
  { label: "< 200 DH", min: undefined, max: 200 },
  { label: "200 - 500 DH", min: 200, max: 500 },
  { label: "> 500 DH", min: 500, max: undefined },
];

export default function CatalogScreen() {
  const router = useRouter();
  const products = useCatalogStore((state) => state.products);
  const categories = useCatalogStore((state) => state.categories);
  const selectedCategoryId = useCatalogStore((state) => state.selectedCategoryId);
  const search = useCatalogStore((state) => state.search);
  const minPrice = useCatalogStore((state) => state.minPrice);
  const maxPrice = useCatalogStore((state) => state.maxPrice);
  const status = useCatalogStore((state) => state.status);
  const error = useCatalogStore((state) => state.error);
  const hasMore = useCatalogStore((state) => state.hasMore);

  const setSearch = useCatalogStore((state) => state.setSearch);
  const setSelectedCategory = useCatalogStore((state) => state.setSelectedCategory);
  const setPriceRange = useCatalogStore((state) => state.setPriceRange);
  const fetchProducts = useCatalogStore((state) => state.fetchProducts);
  const fetchCategories = useCatalogStore((state) => state.fetchCategories);
  const loadMore = useCatalogStore((state) => state.loadMore);
  const resetFilters = useCatalogStore((state) => state.resetFilters);

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    void fetchCategories();
    void fetchProducts(true);
  }, []);

  const handleSearchSubmit = () => {
    void fetchProducts(true);
  };

  const handleSelectCategory = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    setTimeout(() => {
      void fetchProducts(true);
    }, 0);
  };

  const handleSelectPrice = (min?: number, max?: number) => {
    setPriceRange(min, max);
    setTimeout(() => {
      void fetchProducts(true);
    }, 0);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <BrandHeader />
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.listContent}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasMore && status === "success") {
            void loadMore();
          }
        }}
        refreshControl={
          <RefreshControl
            refreshing={status === "loading" && products.length > 0}
            onRefresh={() => void fetchProducts(true)}
            tintColor={colorTokens.primary}
          />
        }
        ListHeaderComponent={
          <CatalogHeader
            count={products.length}
            search={search}
            onSearchChange={setSearch}
            onSearchSubmit={handleSearchSubmit}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={handleSelectCategory}
            selectedMinPrice={minPrice}
            selectedMaxPrice={maxPrice}
            onSelectPrice={handleSelectPrice}
            user={user}
          />
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => router.push(`/product/${item.id}` as any)}
          />
        )}
        ListFooterComponent={
          status === "loadingMore" ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color={colorTokens.primary} />
              <Text style={styles.loadingMoreText}>Chargement des produits...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          status === "loading" ? (
            <Loader message="Chargement du catalogue..." />
          ) : status === "error" ? (
            <ErrorState
              message={error || "Impossible de charger les produits."}
              onRetry={() => void fetchProducts(true)}
            />
          ) : (
            <EmptyState
              icon="🔍"
              title="Aucun produit trouvé"
              description="Aucun article ne correspond à vos filtres actuels."
              actionTitle="Réinitialiser les filtres"
              onAction={() => {
                resetFilters();
                void fetchProducts(true);
              }}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

function CatalogHeader({
  count,
  search,
  onSearchChange,
  onSearchSubmit,
  categories,
  selectedCategoryId,
  onSelectCategory,
  selectedMinPrice,
  selectedMaxPrice,
  onSelectPrice,
  user,
}: {
  count: number;
  search: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: () => void;
  categories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
  selectedMinPrice?: number;
  selectedMaxPrice?: number;
  onSelectPrice: (min?: number, max?: number) => void;
  user: { name: string; email: string; role: string } | null;
}) {
  return (
    <View style={styles.header}>
      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          accessibilityLabel="Rechercher des produits"
          placeholder="Chercher un produit..."
          placeholderTextColor={colorTokens.muted}
          value={search}
          onChangeText={onSearchChange}
          onSubmitEditing={onSearchSubmit}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {search ? (
          <Pressable
            style={styles.searchClearBtn}
            onPress={() => {
              onSearchChange("");
              setTimeout(onSearchSubmit, 0);
            }}
          >
            <Text style={{ fontSize: 14, color: colorTokens.muted }}>✕</Text>
          </Pressable>
        ) : null}
        {!search ? <Text style={styles.micIcon}>♩</Text> : null}
      </View>

      {/* Category Pills */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>CATÉGORIES</Text>
        <FlatList
          horizontal
          data={[{ id: 0, name: "Toutes" }, ...categories]}
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected =
              item.id === 0
                ? selectedCategoryId === null
                : selectedCategoryId === item.id;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectCategory(item.id === 0 ? null : item.id)}
                style={[styles.categoryButton, isSelected && styles.categoryButtonSelected]}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Price Range Pills */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>BUDGET (MAD)</Text>
        <View style={styles.pricePillsRow}>
          {PRICE_FILTERS.map((f, idx) => {
            const isSelected =
              selectedMinPrice === f.min && selectedMaxPrice === f.max;

            return (
              <Pressable
                key={idx}
                onPress={() => onSelectPrice(f.min, f.max)}
                style={[styles.pricePill, isSelected && styles.pricePillSelected]}
              >
                <Text
                  style={[styles.pricePillText, isSelected && styles.pricePillTextSelected]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const isOutOfStock = product.stock <= 0;
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Pressable
      style={({ pressed }) => [styles.productCard, pressed && styles.productCardPressed]}
      onPress={onPress}
    >
      <View style={styles.productArtwork}>
        {product.imageUrl && !imageFailed ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Text style={styles.productArtworkMark}>{product.name.charAt(0)}</Text>
        )}
        <View style={styles.codBadge}><Text style={styles.codBadgeText}>✦ COD</Text></View>
      </View>

      <Text numberOfLines={2} style={styles.productName}>
        {product.name}
      </Text>
      <Text numberOfLines={1} style={styles.productCategory}>{product.category?.name ?? "Sélection ShopMate"}</Text>

      <View style={styles.productFooter}>
        <Text style={styles.productPrice}>{Number(product.price).toFixed(0)} DH</Text>
        <View style={[styles.addButton, isOutOfStock && styles.addButtonDisabled]}><Text style={styles.addButtonText}>{isOutOfStock ? "×" : "+"}</Text></View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colorTokens.surface,
  },
  listContent: {
    paddingHorizontal: spacingTokens.md,
    paddingBottom: spacingTokens.xl,
  },
  header: {
    paddingTop: spacingTokens.md,
    paddingBottom: spacingTokens.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingTokens.sm,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: radiusTokens.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorTokens.primary,
  },
  brandMarkText: {
    color: colorTokens.surface,
    fontWeight: "900",
    fontSize: 18,
  },
  brandName: {
    color: colorTokens.ink,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1,
  },
  greetingText: {
    fontSize: 13,
    color: colorTokens.muted,
  },
  demoBadge: {
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radiusTokens.sm,
    backgroundColor: colorTokens.codGold,
  },
  demoBadgeText: {
    color: colorTokens.ink,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  title: {
    marginTop: spacingTokens.md,
    color: colorTokens.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 2,
    color: colorTokens.muted,
    fontSize: 13,
  },
  searchContainer: {
    position: "relative",
    marginTop: spacingTokens.md,
  },
  searchInput: {
    height: 46,
    paddingLeft: 44,
    paddingRight: 36,
    borderWidth: 0,
    borderRadius: radiusTokens.lg,
    color: colorTokens.ink,
    backgroundColor: colorTokens.surfaceContainerLow,
    fontSize: 14,
  },
  searchIcon: { position: "absolute", left: 14, top: 8, zIndex: 1, fontSize: 30, color: colorTokens.outline },
  micIcon: { position: "absolute", right: 14, top: 13, fontSize: 19, color: colorTokens.ink },
  searchClearBtn: {
    position: "absolute",
    right: 12,
    top: 14,
    padding: 2,
  },
  filterSection: {
    marginTop: spacingTokens.md,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colorTokens.muted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  categoryList: {
    gap: spacingTokens.xs,
  },
  categoryButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 0,
    borderRadius: radiusTokens.full,
    backgroundColor: colorTokens.surfaceContainerHigh,
  },
  categoryButtonSelected: {
    borderColor: colorTokens.primary,
    backgroundColor: colorTokens.primary,
  },
  categoryText: {
    color: colorTokens.ink,
    fontWeight: "600",
    fontSize: 12,
  },
  categoryTextSelected: {
    color: colorTokens.onPrimary,
  },
  pricePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pricePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radiusTokens.sm,
    backgroundColor: colorTokens.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colorTokens.border,
  },
  pricePillSelected: {
    backgroundColor: colorTokens.primary,
    borderColor: colorTokens.primary,
  },
  pricePillText: {
    fontSize: 11,
    fontWeight: "600",
    color: colorTokens.ink,
  },
  pricePillTextSelected: {
    color: colorTokens.onPrimary,
  },
  productRow: {
    gap: spacingTokens.sm,
    marginBottom: spacingTokens.sm,
  },
  productCard: {
    flex: 1,
    minWidth: 0,
    padding: spacingTokens.sm,
    borderWidth: 0,
    borderRadius: radiusTokens.lg,
    backgroundColor: colorTokens.surfaceContainer,
    overflow: "hidden",
  },
  productCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  productArtwork: {
    height: 148,
    padding: spacingTokens.sm,
    justifyContent: "space-between",
    borderRadius: 0,
    backgroundColor: colorTokens.surfaceContainerHighest,
  },
  codBadge: { alignSelf: "flex-end", paddingHorizontal: 8, paddingVertical: 4, borderRadius: radiusTokens.md, backgroundColor: colorTokens.inverseSurface },
  codBadgeText: { color: colorTokens.inverseOnSurface, fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  productArtworkMark: {
    alignSelf: "flex-end",
    color: colorTokens.primaryContainer,
    fontSize: 66,
    lineHeight: 50,
    fontWeight: "900",
  },
  productCategory: {
    marginTop: 2,
    color: colorTokens.muted,
    fontSize: 12,
  },
  productName: {
    minHeight: 44,
    marginTop: spacingTokens.md,
    color: colorTokens.ink,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 4,
    marginTop: spacingTokens.xs,
  },
  productPrice: {
    color: colorTokens.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colorTokens.primaryContainer },
  addButtonDisabled: { backgroundColor: colorTokens.surfaceDim },
  addButtonText: { color: colorTokens.onPrimary, fontSize: 28, lineHeight: 31, fontWeight: "300" },
  loadingMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacingTokens.md,
    gap: spacingTokens.sm,
  },
  loadingMoreText: {
    fontSize: 12,
    color: colorTokens.muted,
  },
});
