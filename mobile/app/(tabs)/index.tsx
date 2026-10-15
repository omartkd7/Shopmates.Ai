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
import { useAuthStore } from "@/src/stores/authStore";
import {
  colorTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
} from "@/src/theme/tokens";
import { Loader, EmptyState, ErrorState } from "@/src/components";

export default function CatalogScreen() {
  const products = useCatalogStore((state) => state.products);
  const status = useCatalogStore((state) => state.status);
  const error = useCatalogStore((state) => state.error);
  const loadProducts = useCatalogStore((state) => state.loadProducts);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

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
            user={user}
            onLogout={() => void logout()}
          />
        }
        renderItem={({ item }) => <ProductCard product={item} />}
        ListEmptyComponent={
          status === "loading" ? (
            <Loader message="Chargement du catalogue..." />
          ) : status === "error" ? (
            <ErrorState
              message={error || "Impossible de charger les produits."}
              onRetry={() => void loadProducts()}
            />
          ) : (
            <EmptyState
              icon="🔍"
              title="Aucun produit trouvé"
              description="Aucun article ne correspond à votre recherche ou catégorie sélectionnée."
              actionTitle="Réinitialiser les filtres"
              onAction={() => {
                setSearch("");
                setSelectedCategory("All");
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
  onSearch,
  categories,
  selectedCategory,
  onSelectCategory,
  user,
  onLogout,
}: {
  count: number;
  search: string;
  onSearch: (value: string) => void;
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  user: { name: string; email: string; role: string } | null;
  onLogout: () => void;
}) {
  return (
    <View style={styles.header}>
      {/* Brand & Demo row */}
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>S</Text>
        </View>
        <Text style={styles.brandName}>SHOPMATE AI</Text>
        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeText}>DEMO STORE</Text>
        </View>
      </View>

      {/* User greeting & Logout banner */}
      <View style={styles.userBanner}>
        <View style={styles.userInfo}>
          <Text style={styles.greetingText}>Bonjour, {user?.name || "Client"} 👋</Text>
          <Text style={styles.userEmail}>{user?.email || ""}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          onPress={onLogout}
          accessibilityRole="button"
        >
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>Trouvez votre{`\n`}prochain coup de cœur.</Text>
      <Text style={styles.subtitle}>{count} articles prêts à commander en COD</Text>
      <TextInput
        accessibilityLabel="Rechercher des produits"
        placeholder="Rechercher dans le catalogue..."
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
      <Text style={styles.productCategory}>{product.category?.name ?? "En vedette"}</Text>
      <Text numberOfLines={2} style={styles.productName}>
        {product.name}
      </Text>
      <View style={styles.productFooter}>
        <Text style={styles.productPrice}>{Number(product.price).toFixed(2)} MAD</Text>
        <Text style={styles.productStock}>{product.stock} en stock</Text>
      </View>
    </View>
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
    borderRadius: radiusTokens.sm,
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
    borderRadius: radiusTokens.sm,
    backgroundColor: colorTokens.highlight,
  },
  demoBadgeText: {
    color: colorTokens.surface,
    fontSize: 10,
    fontWeight: "800",
  },
  userBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colorTokens.surfaceContainerLow,
    borderColor: colorTokens.border,
    borderWidth: 1,
    borderRadius: radiusTokens.md,
    padding: spacingTokens.sm,
    marginTop: spacingTokens.md,
  },
  userInfo: {
    flex: 1,
  },
  greetingText: {
    fontSize: typographyTokens.body.fontSize,
    fontWeight: "700",
    color: colorTokens.ink,
  },
  userEmail: {
    fontSize: typographyTokens.caption.fontSize,
    color: colorTokens.muted,
  },
  logoutButton: {
    paddingVertical: spacingTokens.xs,
    paddingHorizontal: spacingTokens.sm,
    borderRadius: radiusTokens.sm,
    backgroundColor: colorTokens.surfaceContainer,
    borderWidth: 1,
    borderColor: colorTokens.border,
  },
  logoutButtonPressed: {
    opacity: 0.7,
  },
  logoutButtonText: {
    fontSize: typographyTokens.caption.fontSize,
    color: colorTokens.danger,
    fontWeight: "600",
  },
  title: {
    marginTop: spacingTokens.lg,
    color: colorTokens.ink,
    fontSize: typographyTokens.title.fontSize,
    lineHeight: 33,
    fontWeight: typographyTokens.title.fontWeight,
  },
  subtitle: {
    marginTop: spacingTokens.xs,
    color: colorTokens.muted,
    fontSize: typographyTokens.body.fontSize,
  },
  searchInput: {
    height: 48,
    marginTop: spacingTokens.lg,
    paddingHorizontal: spacingTokens.md,
    borderWidth: 1,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.md,
    color: colorTokens.ink,
    backgroundColor: colorTokens.surfaceContainerLowest,
    fontSize: typographyTokens.body.fontSize,
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
    borderRadius: radiusTokens.sm,
    backgroundColor: colorTokens.surfaceContainerLowest,
  },
  categoryButtonSelected: {
    borderColor: colorTokens.ink,
    backgroundColor: colorTokens.ink,
  },
  categoryText: {
    color: colorTokens.ink,
    fontWeight: "600",
    fontSize: typographyTokens.caption.fontSize,
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
    borderRadius: radiusTokens.md,
    backgroundColor: colorTokens.surfaceContainerLowest,
  },
  productArtwork: {
    height: 116,
    padding: spacingTokens.sm,
    justifyContent: "space-between",
    borderRadius: radiusTokens.sm,
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
    borderRadius: radiusTokens.sm,
    backgroundColor: colorTokens.ink,
  },
  retryText: {
    color: colorTokens.surface,
    fontWeight: "700",
  },
});
