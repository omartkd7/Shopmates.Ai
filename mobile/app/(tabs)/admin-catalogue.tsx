import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { apiClient } from "@/src/api/client";
import { useAuthStore } from "@/src/stores/authStore";
import { Category, Product } from "@/src/stores/catalogStore";
import { Button } from "@/src/components/Button";
import { BrandHeader } from "@/src/components/BrandHeader";
import { colorTokens, radiusTokens, spacingTokens } from "@/src/theme/tokens";

type CatalogTab = "products" | "categories";
type ProductDraft = { name: string; description: string; price: string; stock: string; sku: string; categoryId: number | null };
type CategoryDraft = { name: string; description: string };

const emptyProduct: ProductDraft = { name: "", description: "", price: "", stock: "0", sku: "", categoryId: null };

export default function AdminCatalogScreen() {
  const role = useAuthStore((state) => state.user?.role);
  const [tab, setTab] = useState<CatalogTab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProduct);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>({ name: "", description: "" });
  const [editingCategory, setEditingCategory] = useState<number | null>(null);

  const loadCatalogue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productResponse, categoryResponse] = await Promise.all([
        apiClient.get<{ products: Product[] }>("/api/products", { params: { limit: 100 } }),
        apiClient.get<{ categories: Category[] }>("/api/categories"),
      ]);
      setProducts(productResponse.data.products || []);
      setCategories(categoryResponse.data.categories || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Impossible de charger le catalogue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role !== "ADMIN") {
      router.replace("/(tabs)");
      return;
    }
    void loadCatalogue();
  }, [role, loadCatalogue]);

  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  const saveProduct = async () => {
    const price = Number(productDraft.price);
    const stock = Number(productDraft.stock);
    if (!productDraft.name.trim()) return setError("Le nom du produit est obligatoire.");
    if (!Number.isFinite(price) || price <= 0) return setError("Le prix doit être un nombre supérieur à zéro.");
    if (!Number.isInteger(stock) || stock < 0) return setError("Le stock doit être un entier positif ou zéro.");
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: productDraft.name.trim(), description: productDraft.description.trim() || null,
        price, stock, sku: productDraft.sku.trim() || null, categoryId: productDraft.categoryId,
      };
      if (editingProduct) await apiClient.put(`/api/products/${editingProduct}`, payload);
      else await apiClient.post("/api/products", payload);
      setProductDraft(emptyProduct);
      setEditingProduct(null);
      await loadCatalogue();
    } catch (err: any) {
      setError(err.response?.data?.error || "Impossible d'enregistrer le produit.");
    } finally { setSaving(false); }
  };

  const editProduct = (product: Product) => {
    setEditingProduct(product.id);
    setProductDraft({
      name: product.name, description: product.description || "", price: String(product.price),
      stock: String(product.stock), sku: product.sku || "", categoryId: product.categoryId || null,
    });
    setError("");
  };

  const deleteProduct = (product: Product) => Alert.alert(
    "Supprimer le produit ?", `« ${product.name} » sera retiré du catalogue.`,
    [{ text: "Annuler", style: "cancel" }, { text: "Supprimer", style: "destructive", onPress: async () => {
      try { await apiClient.delete(`/api/products/${product.id}`); await loadCatalogue(); }
      catch (err: any) { setError(err.response?.data?.error || "Impossible de supprimer le produit."); }
    } }]
  );

  const saveCategory = async () => {
    if (!categoryDraft.name.trim()) return setError("Le nom de la catégorie est obligatoire.");
    setSaving(true);
    setError("");
    try {
      const payload = { name: categoryDraft.name.trim(), description: categoryDraft.description.trim() || null };
      if (editingCategory) await apiClient.put(`/api/categories/${editingCategory}`, payload);
      else await apiClient.post("/api/categories", payload);
      setCategoryDraft({ name: "", description: "" });
      setEditingCategory(null);
      await loadCatalogue();
    } catch (err: any) {
      setError(err.response?.data?.error || "Impossible d'enregistrer la catégorie.");
    } finally { setSaving(false); }
  };

  const deleteCategory = (category: Category) => Alert.alert(
    "Supprimer la catégorie ?", `« ${category.name} » sera supprimée.`,
    [{ text: "Annuler", style: "cancel" }, { text: "Supprimer", style: "destructive", onPress: async () => {
      try { await apiClient.delete(`/api/categories/${category.id}`); await loadCatalogue(); }
      catch (err: any) { setError(err.response?.data?.error || "Impossible de supprimer la catégorie."); }
    } }]
  );

  if (role !== "ADMIN") return null;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <BrandHeader />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Profil</Text></Pressable>
          <Text style={styles.title}>Gestion du catalogue</Text>
          <Text style={styles.subtitle}>Les changements sont partagés avec les clients de votre boutique.</Text>
        </View>
        <View style={styles.tabs}>
          <TabButton label="Produits" active={tab === "products"} onPress={() => { setTab("products"); setError(""); }} />
          <TabButton label="Catégories" active={tab === "categories"} onPress={() => { setTab("categories"); setError(""); }} />
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {tab === "products" ? (
          <>
            <Text style={styles.sectionTitle}>{editingProduct ? "Modifier le produit" : "Ajouter un produit"}</Text>
            <Field label="Nom *" value={productDraft.name} onChangeText={(name) => setProductDraft({ ...productDraft, name })} />
            <Field label="Description" value={productDraft.description} onChangeText={(description) => setProductDraft({ ...productDraft, description })} multiline />
            <View style={styles.row}>
              <Field label="Prix (DH) *" value={productDraft.price} onChangeText={(price) => setProductDraft({ ...productDraft, price })} keyboardType="decimal-pad" style={styles.half} />
              <Field label="Stock *" value={productDraft.stock} onChangeText={(stock) => setProductDraft({ ...productDraft, stock })} keyboardType="number-pad" style={styles.half} />
            </View>
            <Field label="SKU (optionnel)" value={productDraft.sku} onChangeText={(sku) => setProductDraft({ ...productDraft, sku })} />
            <Text style={styles.fieldLabel}>Catégorie</Text>
            <View style={styles.chips}>
              <Chip label="Aucune" active={productDraft.categoryId === null} onPress={() => setProductDraft({ ...productDraft, categoryId: null })} />
              {categories.map((category) => <Chip key={category.id} label={category.name} active={productDraft.categoryId === category.id} onPress={() => setProductDraft({ ...productDraft, categoryId: category.id })} />)}
            </View>
            <Button title={saving ? "Enregistrement…" : editingProduct ? "Enregistrer" : "Créer le produit"} onPress={() => void saveProduct()} disabled={saving} />
            {editingProduct ? <TextButton label="Annuler la modification" onPress={() => { setEditingProduct(null); setProductDraft(emptyProduct); }} /> : null}
            <Text style={styles.sectionTitle}>Produits ({products.length})</Text>
            {loading ? <ActivityIndicator color={colorTokens.primary} /> : products.map((product) => (
              <View key={product.id} style={styles.item}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{product.name}</Text>
                  <Text style={styles.itemMeta}>{Number(product.price).toFixed(2)} DH · Stock {product.stock}{product.categoryId ? ` · ${categoryNames.get(product.categoryId) || "Catégorie"}` : ""}</Text>
                </View>
                <TextButton label="Modifier" onPress={() => editProduct(product)} />
                <TextButton label="Supprimer" danger onPress={() => deleteProduct(product)} />
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>{editingCategory ? "Modifier la catégorie" : "Ajouter une catégorie"}</Text>
            <Field label="Nom *" value={categoryDraft.name} onChangeText={(name) => setCategoryDraft({ ...categoryDraft, name })} />
            <Field label="Description" value={categoryDraft.description} onChangeText={(description) => setCategoryDraft({ ...categoryDraft, description })} multiline />
            <Button title={saving ? "Enregistrement…" : editingCategory ? "Enregistrer" : "Créer la catégorie"} onPress={() => void saveCategory()} disabled={saving} />
            {editingCategory ? <TextButton label="Annuler la modification" onPress={() => { setEditingCategory(null); setCategoryDraft({ name: "", description: "" }); }} /> : null}
            <Text style={styles.sectionTitle}>Catégories ({categories.length})</Text>
            {loading ? <ActivityIndicator color={colorTokens.primary} /> : categories.map((category) => (
              <View key={category.id} style={styles.item}>
                <View style={styles.itemInfo}><Text style={styles.itemTitle}>{category.name}</Text><Text style={styles.itemMeta}>{category.description || ""}</Text></View>
                <TextButton label="Modifier" onPress={() => { setEditingCategory(category.id); setCategoryDraft({ name: category.name, description: category.description || "" }); setError(""); }} />
                <TextButton label="Supprimer" danger onPress={() => deleteCategory(category)} />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, multiline, keyboardType, style }: {
  label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean;
  keyboardType?: "decimal-pad" | "number-pad"; style?: object;
}) {
  return <View style={[styles.fieldWrap, style]}><Text style={styles.fieldLabel}>{label}</Text><TextInput
    value={value} onChangeText={onChangeText} multiline={multiline} keyboardType={keyboardType}
    style={[styles.input, multiline && styles.multiline]} placeholderTextColor={colorTokens.muted}
  /></View>;
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.tab, active && styles.activeTab]}><Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text></Pressable>;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.chip, active && styles.activeChip]}><Text style={[styles.chipText, active && styles.activeChipText]}>{label}</Text></Pressable>;
}

function TextButton({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return <Pressable onPress={onPress} style={styles.textButton}><Text style={[styles.textButtonLabel, danger && styles.dangerText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorTokens.surface },
  content: { padding: spacingTokens.md, paddingBottom: spacingTokens.xxl, gap: spacingTokens.sm },
  header: { marginBottom: spacingTokens.sm }, back: { color: colorTokens.primary, fontSize: 14, fontWeight: "700", marginBottom: spacingTokens.md },
  title: { color: colorTokens.ink, fontSize: 25, fontWeight: "800" }, subtitle: { color: colorTokens.muted, fontSize: 13, marginTop: 5 },
  tabs: { flexDirection: "row", backgroundColor: colorTokens.surfaceContainer, borderRadius: radiusTokens.lg, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radiusTokens.md }, activeTab: { backgroundColor: colorTokens.surfaceContainerLowest },
  tabText: { color: colorTokens.muted, fontWeight: "700" }, activeTabText: { color: colorTokens.primary },
  sectionTitle: { color: colorTokens.ink, fontSize: 17, fontWeight: "800", marginTop: spacingTokens.md, marginBottom: spacingTokens.xs },
  fieldWrap: { marginBottom: spacingTokens.xs }, fieldLabel: { color: colorTokens.onSurfaceVariant, fontSize: 12, fontWeight: "700", marginBottom: 5 },
  input: { borderWidth: 1, borderColor: colorTokens.border, borderRadius: radiusTokens.md, paddingHorizontal: 12, paddingVertical: 10, color: colorTokens.ink, backgroundColor: colorTokens.surfaceContainerLowest, minHeight: 44 },
  multiline: { minHeight: 76, textAlignVertical: "top" }, row: { flexDirection: "row", gap: spacingTokens.sm }, half: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacingTokens.md }, chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radiusTokens.full, backgroundColor: colorTokens.surfaceContainer },
  activeChip: { backgroundColor: colorTokens.primary }, chipText: { color: colorTokens.onSurfaceVariant, fontSize: 12, fontWeight: "600" }, activeChipText: { color: colorTokens.onPrimary },
  item: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, backgroundColor: colorTokens.surfaceContainerLowest, borderRadius: radiusTokens.md, borderWidth: 1, borderColor: colorTokens.border, marginBottom: 8 },
  itemInfo: { flex: 1 }, itemTitle: { color: colorTokens.ink, fontSize: 14, fontWeight: "700" }, itemMeta: { color: colorTokens.muted, fontSize: 11, marginTop: 3 },
  textButton: { padding: 6 }, textButtonLabel: { color: colorTokens.primary, fontSize: 11, fontWeight: "700" }, dangerText: { color: colorTokens.danger },
  error: { padding: 10, borderRadius: radiusTokens.md, backgroundColor: colorTokens.errorContainer, color: colorTokens.onErrorContainer, fontSize: 13 },
});
