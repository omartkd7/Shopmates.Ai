import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { apiClient } from "@/src/api/client";
import { useAuthStore } from "@/src/stores/authStore";
import { Button } from "@/src/components/Button";
import { colorTokens, radiusTokens, spacingTokens } from "@/src/theme/tokens";

type RagDocument = {
  id: number;
  name: string;
  mimeType: string;
  status: "pending" | "processing" | "completed" | "failed";
  chunksCreated: number;
  createdAt: string;
};

export default function AdminDocumentsScreen() {
  const role = useAuthStore((state) => state.user?.role);
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<{ documents: RagDocument[] }>("/api/documents");
      setDocuments(response.data.documents || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Impossible de charger les documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role !== "ADMIN") {
      router.replace("/(tabs)");
      return;
    }
    void loadDocuments();
  }, [role, loadDocuments]);

  const uploadDocument = async () => {
    setError("");
    setSuccess("");
    const result = await DocumentPicker.getDocumentAsync({
      type: ["text/plain", "text/markdown"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;

    const file = result.assets[0];
    if (!/\.(md|txt)$/i.test(file.name)) {
      setError("Choisissez un fichier .md ou .txt.");
      return;
    }
    if (file.size !== undefined && file.size > 2 * 1024 * 1024) {
      setError("Le fichier dépasse la limite de 2 Mo.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || (file.name.toLowerCase().endsWith(".md") ? "text/markdown" : "text/plain"),
      } as unknown as Blob);
      form.append("name", file.name.replace(/\.(md|txt)$/i, ""));

      const response = await apiClient.post<{
        message: string;
        document: { id: number; name: string; status: string; chunksCreated: number };
      }>("/api/documents", form, { headers: { "Content-Type": "multipart/form-data" } });
      setSuccess(`Document indexé : ${response.data.document.chunksCreated} chunk(s) créé(s). L’agent peut l’utiliser maintenant.`);
      await loadDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || "L’envoi ou l’indexation du document a échoué.");
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = (document: RagDocument) => Alert.alert(
    "Supprimer le document ?",
    `« ${document.name} » et ses ${document.chunksCreated} chunk(s) seront supprimés.`,
    [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          setError("");
          setSuccess("");
          try {
            await apiClient.delete(`/api/documents/${document.id}`);
            setSuccess("Document et chunks supprimés.");
            await loadDocuments();
          } catch (err: any) {
            setError(err.response?.data?.error || "Impossible de supprimer ce document.");
          }
        },
      },
    ]
  );

  if (role !== "ADMIN") return null;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Profil</Text></Pressable>
        <Text style={styles.title}>Documents de connaissance IA</Text>
        <Text style={styles.subtitle}>Ajoutez les informations fiables que l’assistant peut utiliser pour répondre aux clients.</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Formats acceptés : .md et .txt</Text>
          <Text style={styles.infoText}>Maximum 2 Mo. Le texte est découpé et indexé automatiquement. Une fois l’indexation terminée, l’agent peut retrouver ces informations.</Text>
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {success ? <Text accessibilityLiveRegion="polite" style={styles.success}>{success}</Text> : null}
        <Button title={uploading ? "Envoi et indexation…" : "Choisir un document"} onPress={() => void uploadDocument()} disabled={uploading} />
        {uploading ? <View style={styles.progress}><ActivityIndicator color={colorTokens.primary} /><Text style={styles.progressText}>Création des chunks et des embeddings…</Text></View> : null}

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Documents ({documents.length})</Text>
          <Pressable onPress={() => void loadDocuments()}><Text style={styles.refresh}>Actualiser</Text></Pressable>
        </View>
        {loading ? <ActivityIndicator color={colorTokens.primary} style={styles.loader} /> : documents.length === 0 ? (
          <Text style={styles.empty}>Aucun document pour le moment.</Text>
        ) : documents.map((document) => (
          <View key={document.id} style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <Text style={styles.documentName} numberOfLines={2}>{document.name}</Text>
              <View style={[styles.statusBadge, document.status === "completed" ? styles.completed : document.status === "failed" ? styles.failed : styles.inProgress]}>
                <Text style={styles.statusText}>{statusLabel(document.status)}</Text>
              </View>
            </View>
            <Text style={styles.documentMeta}>{document.chunksCreated} chunk(s) · {document.mimeType}</Text>
            {document.status === "failed" ? <Text style={styles.failedHint}>Indexation échouée. Supprimez-le et réessayez l’envoi.</Text> : null}
            <Pressable accessibilityRole="button" onPress={() => deleteDocument(document)} style={styles.deleteButton}>
              <Text style={styles.deleteLabel}>Supprimer le document</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function statusLabel(status: RagDocument["status"]): string {
  if (status === "completed") return "Indexé";
  if (status === "failed") return "Échec";
  if (status === "processing") return "En cours";
  return "En attente";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorTokens.surface },
  content: { padding: spacingTokens.md, paddingBottom: spacingTokens.xxl },
  back: { color: colorTokens.primary, fontSize: 14, fontWeight: "700", marginBottom: spacingTokens.md },
  title: { color: colorTokens.ink, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colorTokens.muted, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: spacingTokens.md },
  infoBox: { borderRadius: radiusTokens.md, backgroundColor: colorTokens.surfaceContainer, padding: spacingTokens.md, marginBottom: spacingTokens.md },
  infoTitle: { color: colorTokens.ink, fontSize: 13, fontWeight: "800" }, infoText: { color: colorTokens.onSurfaceVariant, fontSize: 12, lineHeight: 18, marginTop: 4 },
  error: { padding: 10, borderRadius: radiusTokens.md, backgroundColor: colorTokens.errorContainer, color: colorTokens.onErrorContainer, fontSize: 13, marginBottom: spacingTokens.sm },
  success: { padding: 10, borderRadius: radiusTokens.md, backgroundColor: colorTokens.secondaryContainer, color: colorTokens.onSecondaryContainer, fontSize: 13, marginBottom: spacingTokens.sm },
  progress: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: spacingTokens.md }, progressText: { color: colorTokens.muted, fontSize: 12 },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacingTokens.lg, marginBottom: spacingTokens.sm },
  sectionTitle: { color: colorTokens.ink, fontSize: 17, fontWeight: "800" }, refresh: { color: colorTokens.primary, fontWeight: "700", fontSize: 12 },
  loader: { marginTop: spacingTokens.lg }, empty: { color: colorTokens.muted, textAlign: "center", paddingVertical: spacingTokens.xl },
  documentCard: { padding: spacingTokens.md, borderRadius: radiusTokens.md, borderWidth: 1, borderColor: colorTokens.border, backgroundColor: colorTokens.surfaceContainerLowest, marginBottom: spacingTokens.sm },
  documentHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacingTokens.sm }, documentName: { color: colorTokens.ink, fontSize: 14, fontWeight: "700", flex: 1 },
  statusBadge: { borderRadius: radiusTokens.full, paddingHorizontal: 9, paddingVertical: 4 }, completed: { backgroundColor: colorTokens.secondaryContainer }, failed: { backgroundColor: colorTokens.errorContainer }, inProgress: { backgroundColor: colorTokens.codGold },
  statusText: { color: colorTokens.ink, fontSize: 10, fontWeight: "800" }, documentMeta: { color: colorTokens.muted, fontSize: 11, marginTop: 7 },
  failedHint: { color: colorTokens.danger, fontSize: 12, marginTop: 7 }, deleteButton: { alignSelf: "flex-end", paddingTop: 10 }, deleteLabel: { color: colorTokens.danger, fontSize: 12, fontWeight: "700" },
});
