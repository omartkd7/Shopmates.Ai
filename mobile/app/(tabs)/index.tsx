import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCatalogStore, type Product } from "@/src/stores/catalogStore";
import {
  colorTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
} from "@/src/theme/tokens";

export default function CatalogScreen() {
  const products = useCatalogStore((state) => state.products);
  const status = useCatalogStore((state) => state.status);
  const error = useCatalogStore((state) => state.error);
  const loadProducts = useCatalogStore((state) => state.loadProducts);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const categories = [
    "All",
    ...new Set(products.map((product) => product.category?.name).filter(Boolean) as string[]),
  ];
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "All" || product.category?.name === selectedCategory;
    const matchesSearch = `${product.name} ${product.description ?? ""}`
      .toLocaleLowerCase()
      .includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={status === "loading" && products.length > 0}
            onRefresh={() => void loadProducts()}
            tintColor={colorTokens.brand}
          />
        }
        ListHeaderComponent={
          <CatalogHeader
            count={products.length}
            search={search}
            onSearch={setSearch}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        }
        renderItem={({ item }) => <ProductCard product={item} />}
        ListEmptyComponent={
          status === "loading" ? (
            <View style={styles.messageState}>
              <ActivityIndicator color={colorTokens.brand} />
              <Text style={styles.messageText}>Loading the catalog...</Text>
            </View>
          ) : status === "error" ? (
            <View style={styles.messageState}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={() => void loadProducts()}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.messageState}>
              <Text style={styles.messageText}>No products match this search.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

function CatalogHeader({
  count,
  search,
  onSearch,
  categories,
  selectedCategory,
  onSelectCategory,
}: {
  count: number;
  search: string;
  onSearch: (value: string) => void;
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>S</Text>
        </View>
        <Text style={styles.brandName}>SHOPMATE</Text>
        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeText}>DEMO STORE</Text>
        </View>
      </View>
      <Text style={styles.title}>Find your{`\n`}next favorite.</Text>
      <Text style={styles.subtitle}>{count} items ready to explore</Text>
      <TextInput
        accessibilityLabel="Search products"
        placeholder="Search the catalog"
        placeholderTextColor={colorTokens.muted}
        value={search}
        onChangeText={onSearch}
        style={styles.searchInput}
        returnKeyType="search"
      />
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => {
          const selected = item === selectedCategory;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelectCategory(item)}
              style={[styles.categoryButton, selected && styles.categoryButtonSelected]}
            >
              <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>
                {item}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <View style={styles.productCard}>
      <View style={styles.productArtwork}>
        <Text style={styles.productArtworkLabel}>{product.category?.name ?? "SHOPMATE"}</Text>
        <Text style={styles.productArtworkMark}>S</Text>
      </View>
      <Text style={styles.productCategory}>{product.category?.name ?? "Featured"}</Text>
      <Text numberOfLines={2} style={styles.productName}>
        {product.name}
      </Text>
      <View style={styles.productFooter}>
        <Text style={styles.productPrice}>MAD {Number(product.price).toFixed(2)}</Text>
        <Text style={styles.productStock}>{product.stock} left</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colorTokens.canvas,
  },
  listContent: {
    paddingHorizontal: spacingTokens.md,
    paddingBottom: spacingTokens.xl,
  },
  header: {
    paddingTop: spacingTokens.sm,
    paddingBottom: spacingTokens.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingTokens.sm,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: radiusTokens.small,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorTokens.brand,
  },
  brandMarkText: {
    color: colorTokens.surface,
    fontWeight: "800",
    fontSize: 17,
  },
  brandName: {
    color: colorTokens.ink,
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 1,
  },
  demoBadge: {
    marginLeft: "auto",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radiusTokens.small,
    backgroundColor: colorTokens.highlight,
  },
  demoBadgeText: {
    color: colorTokens.ink,
    fontSize: 10,
    fontWeight: "800",
  },
  title: {
    marginTop: spacingTokens.lg,
    color: colorTokens.ink,
    fontSize: typographyTokens.title,
    lineHeight: 33,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: spacingTokens.xs,
    color: colorTokens.muted,
    fontSize: typographyTokens.body,
  },
  searchInput: {
    height: 48,
    marginTop: spacingTokens.lg,
    paddingHorizontal: spacingTokens.md,
    borderWidth: 1,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.medium,
    color: colorTokens.ink,
    backgroundColor: colorTokens.surface,
    fontSize: typographyTokens.body,
  },
  categoryList: {
    gap: spacingTokens.sm,
    paddingTop: spacingTokens.md,
  },
  categoryButton: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacingTokens.md,
    borderWidth: 1,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.small,
    backgroundColor: colorTokens.surface,
  },
  categoryButtonSelected: {
    borderColor: colorTokens.ink,
    backgroundColor: colorTokens.ink,
  },
  categoryText: {
    color: colorTokens.ink,
    fontWeight: "600",
    fontSize: typographyTokens.label,
  },
  categoryTextSelected: {
    color: colorTokens.surface,
  },
  productRow: {
    gap: spacingTokens.sm,
    marginBottom: spacingTokens.sm,
  },
  productCard: {
    flex: 1,
    minWidth: 0,
    padding: spacingTokens.sm,
    borderWidth: 1,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.medium,
    backgroundColor: colorTokens.surface,
  },
  productArtwork: {
    height: 116,
    padding: spacingTokens.sm,
    justifyContent: "space-between",
    borderRadius: radiusTokens.small,
    backgroundColor: colorTokens.brand,
  },
  productArtworkLabel: {
    color: colorTokens.surface,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  productArtworkMark: {
    alignSelf: "flex-end",
    color: colorTokens.highlight,
    fontSize: 48,
    lineHeight: 50,
    fontWeight: "900",
  },
  productCategory: {
    marginTop: spacingTokens.sm,
    color: colorTokens.muted,
    fontSize: 10,
    textTransform: "uppercase",
  },
  productName: {
    minHeight: 40,
    marginTop: 3,
    color: colorTokens.ink,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 4,
    marginTop: spacingTokens.sm,
  },
  productPrice: {
    color: colorTokens.brand,
    fontSize: 12,
    fontWeight: "800",
  },
  productStock: {
    color: colorTokens.muted,
    fontSize: 10,
  },
  messageState: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacingTokens.lg,
  },
  messageText: {
    marginTop: spacingTokens.sm,
    color: colorTokens.muted,
    textAlign: "center",
  },
  errorText: {
    color: colorTokens.danger,
    textAlign: "center",
  },
  retryButton: {
    marginTop: spacingTokens.md,
    paddingHorizontal: spacingTokens.md,
    paddingVertical: spacingTokens.sm,
    borderRadius: radiusTokens.small,
    backgroundColor: colorTokens.ink,
  },
  retryText: {
    color: colorTokens.surface,
    fontWeight: "700",
  },
});
