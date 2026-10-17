import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { colorTokens, radiusTokens, spacingTokens } from "@/src/theme/tokens";

type Disposition = "all" | "refused" | "blocked";
type Customer = { id: number; name: string; email: string } | null;
type AgentLog = {
  id: number;
  action: string;
  status: "success" | "error";
  conversationId: number | null;
  messageId: number | null;
  input: unknown;
  output: unknown;
  toolsCalled: Array<Record<string, unknown>>;
  ragSources: Array<Record<string, unknown>>;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  latencyMs: number | null;
  refusalCategory: string | null;
  errorMessage: string | null;
  createdAt: string;
  customer?: Customer;
};

const PAGE_SIZE = 25;

export default function AdminAgentLogsScreen() {
  const role = useAuthStore((state) => state.user?.role);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [selected, setSelected] = useState<AgentLog | null>(null);
  const [customerIdDraft, setCustomerIdDraft] = useState("");
  const [fromDateDraft, setFromDateDraft] = useState("");
  const [toDateDraft, setToDateDraft] = useState("");
  const [dispositionDraft, setDispositionDraft] = useState<Disposition>("all");
  const [filters, setFilters] = useState({ customerId: "", fromDate: "", toDate: "", disposition: "all" as Disposition });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async (requestedPage = 1, append = false) => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page: requestedPage, limit: PAGE_SIZE };
      if (filters.customerId) params.customerId = Number(filters.customerId);
      if (filters.fromDate) params.fromDate = filters.fromDate;
      if (filters.toDate) params.toDate = filters.toDate;
      if (filters.disposition !== "all") params.disposition = filters.disposition;
      const response = await apiClient.get<{
        logs: AgentLog[];
        pagination: { totalPages: number; page: number };
      }>("/api/agent/logs", { params });
      setLogs((current) => append ? [...current, ...response.data.logs] : response.data.logs);
      setPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.error || "Impossible de charger le journal de l’agent.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (role !== "ADMIN") {
      router.replace("/(tabs)");
      return;
    }
    void loadLogs();
  }, [role, loadLogs]);

  const applyFilters = () => {
    const customerId = customerIdDraft.trim();
    if (customerId && (!/^\d+$/.test(customerId) || Number(customerId) < 1)) {
      setError("L’identifiant client doit être un nombre positif.");
      return;
    }
    const validDate = (value: string) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
    if (!validDate(fromDateDraft) || !validDate(toDateDraft)) {
      setError("Utilisez le format de date AAAA-MM-JJ.");
      return;
    }
    if (fromDateDraft && toDateDraft && fromDateDraft > toDateDraft) {
      setError("La date de début doit précéder la date de fin.");
      return;
    }
    setError("");
    setSelected(null);
    setFilters({ customerId, fromDate: fromDateDraft, toDate: toDateDraft, disposition: dispositionDraft });
  };

  const showDetail = async (log: AgentLog) => {
    setLoadingDetail(true);
    setError("");
    try {
      const response = await apiClient.get<{ log: AgentLog; customer: Customer }>(`/api/agent/logs/${log.id}`);
      setSelected({ ...response.data.log, customer: response.data.customer });
    } catch (err: any) {
      setError(err.response?.data?.error || "Impossible de charger le détail de ce tour.");
    } finally {
      setLoadingDetail(false);
    }
  };

  if (role !== "ADMIN") return null;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => selected ? setSelected(null) : router.back()}>
          <Text style={styles.back}>‹ {selected ? "Journal" : "Profil"}</Text>
        </Pressable>
        {selected ? (
          <TurnDetail log={selected} />
        ) : (
          <>
            <Text style={styles.title}>Journal de l’assistant IA</Text>
            <Text style={styles.subtitle}>Trace des interactions de votre boutique uniquement.</Text>
            <View style={styles.filterCard}>
              <Text style={styles.filterTitle}>Filtres</Text>
              <Text style={styles.label}>ID client</Text>
              <TextInput value={customerIdDraft} onChangeText={setCustomerIdDraft} keyboardType="number-pad" placeholder="Tous les clients" placeholderTextColor={colorTokens.muted} style={styles.input} />
              <View style={styles.row}>
                <View style={styles.dateField}><Text style={styles.label}>Du</Text><TextInput value={fromDateDraft} onChangeText={setFromDateDraft} placeholder="AAAA-MM-JJ" placeholderTextColor={colorTokens.muted} style={styles.input} /></View>
                <View style={styles.dateField}><Text style={styles.label}>Au</Text><TextInput value={toDateDraft} onChangeText={setToDateDraft} placeholder="AAAA-MM-JJ" placeholderTextColor={colorTokens.muted} style={styles.input} /></View>
              </View>
              <Text style={styles.label}>Résultat</Text>
              <View style={styles.chips}>
                <FilterChip label="Tout" active={dispositionDraft === "all"} onPress={() => setDispositionDraft("all")} />
                <FilterChip label="Refusé" active={dispositionDraft === "refused"} onPress={() => setDispositionDraft("refused")} />
                <FilterChip label="Bloqué" active={dispositionDraft === "blocked"} onPress={() => setDispositionDraft("blocked")} />
              </View>
              <Pressable onPress={applyFilters} style={styles.applyButton}><Text style={styles.applyText}>Appliquer les filtres</Text></Pressable>
            </View>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            {loadingDetail ? <ActivityIndicator color={colorTokens.primary} /> : null}
            <Text style={styles.resultCount}>{logs.length} tour(s) sur la page</Text>
            {loading && logs.length === 0 ? <ActivityIndicator color={colorTokens.primary} style={styles.loader} /> : logs.length === 0 ? (
              <Text style={styles.empty}>Aucune interaction trouvée avec ces filtres.</Text>
            ) : logs.map((log) => <LogCard key={log.id} log={log} onPress={() => void showDetail(log)} />)}
            {page < totalPages ? <Pressable disabled={loading} onPress={() => void loadLogs(page + 1, true)} style={styles.moreButton}>
              {loading ? <ActivityIndicator color={colorTokens.primary} /> : <Text style={styles.moreText}>Charger la page suivante</Text>}
            </Pressable> : null}
          </>
        )}
        {selected && error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function LogCard({ log, onPress }: { log: AgentLog; onPress: () => void }) {
  const question = displayValue(log.input) || "Question indisponible";
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.logCard, pressed && styles.pressed]}>
      <View style={styles.logHeader}><Text style={styles.logCustomer}>{log.customer?.name || "Client"}{log.customer?.id ? ` · #${log.customer.id}` : ""}</Text><Badge log={log} /></View>
      <Text style={styles.question} numberOfLines={2}>{question}</Text>
      <Text style={styles.logMeta}>{formatDate(log.createdAt)} · {log.latencyMs ?? "—"} ms · {log.tokenUsage?.totalTokens ?? "—"} tokens</Text>
      <Text style={styles.openDetail}>Voir la trace complète ›</Text>
    </Pressable>
  );
}

function TurnDetail({ log }: { log: AgentLog }) {
  return (
    <>
      <Text style={styles.title}>Détail du tour #{log.id}</Text>
      <View style={styles.detailCard}>
        <Badge log={log} />
        <Text style={styles.detailMeta}>{formatDate(log.createdAt)} · conversation #{log.conversationId ?? "—"}</Text>
        <Text style={styles.customer}>{log.customer?.name || "Client inconnu"}{log.customer?.email ? ` · ${log.customer.email}` : ""} {log.customer?.id ? `(ID ${log.customer.id})` : ""}</Text>
        <DetailSection title="Question" value={log.input} />
        <DetailSection title="Réponse" value={log.output} />
        {log.refusalCategory ? <DetailSection title="Refus / blocage" value={log.refusalCategory} /> : null}
        <DetailSection title={`Outils appelés (${log.toolsCalled?.length ?? 0})`} value={log.toolsCalled} />
        <DetailSection title={`Sources RAG (${log.ragSources?.length ?? 0})`} value={log.ragSources} />
        <DetailSection title="Tokens (entrée / sortie / total)" value={log.tokenUsage ? `${log.tokenUsage.promptTokens} / ${log.tokenUsage.completionTokens} / ${log.tokenUsage.totalTokens}` : "Non disponible"} />
        <DetailSection title="Latence" value={log.latencyMs === null ? "Non disponible" : `${log.latencyMs} ms`} />
        {log.errorMessage ? <DetailSection title="Erreur" value={log.errorMessage} /> : null}
        <DetailSection title="Action" value={log.action} />
        <DetailSection title="Message ID" value={log.messageId ?? "Non disponible"} />
      </View>
    </>
  );
}

function DetailSection({ title, value }: { title: string; value: unknown }) {
  return <View style={styles.detailSection}><Text style={styles.detailLabel}>{title}</Text><Text selectable style={styles.detailValue}>{displayValue(value) || "Non disponible"}</Text></View>;
}

function Badge({ log }: { log: AgentLog }) {
  const kind = log.refusalCategory === "prompt_injection" || log.refusalCategory === "output_moderation" ? "blocked" : log.refusalCategory ? "refused" : "normal";
  const label = kind === "blocked" ? "Bloqué" : kind === "refused" ? "Refusé" : log.status === "error" ? "Erreur" : "Répondu";
  return <View style={[styles.badge, kind === "blocked" ? styles.blockedBadge : kind === "refused" || log.status === "error" ? styles.refusedBadge : styles.normalBadge]}><Text style={styles.badgeText}>{label}</Text></View>;
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.chip, active && styles.activeChip]}><Text style={[styles.chipText, active && styles.activeChipText]}>{label}</Text></Pressable>;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorTokens.surface }, content: { padding: spacingTokens.md, paddingBottom: spacingTokens.xxl },
  back: { color: colorTokens.primary, fontSize: 14, fontWeight: "700", marginBottom: spacingTokens.md }, title: { color: colorTokens.ink, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colorTokens.muted, fontSize: 13, marginTop: 5, marginBottom: spacingTokens.md },
  filterCard: { padding: spacingTokens.md, borderRadius: radiusTokens.lg, backgroundColor: colorTokens.surfaceContainerLow, marginBottom: spacingTokens.md },
  filterTitle: { color: colorTokens.ink, fontSize: 15, fontWeight: "800", marginBottom: spacingTokens.sm }, label: { color: colorTokens.onSurfaceVariant, fontSize: 11, fontWeight: "700", marginBottom: 5 },
  input: { borderWidth: 1, borderColor: colorTokens.border, borderRadius: radiusTokens.md, paddingHorizontal: 10, paddingVertical: 9, color: colorTokens.ink, backgroundColor: colorTokens.surfaceContainerLowest, marginBottom: spacingTokens.sm },
  row: { flexDirection: "row", gap: spacingTokens.sm }, dateField: { flex: 1 }, chips: { flexDirection: "row", gap: 7, marginBottom: spacingTokens.md },
  chip: { borderRadius: radiusTokens.full, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colorTokens.surfaceContainer }, activeChip: { backgroundColor: colorTokens.primary },
  chipText: { color: colorTokens.onSurfaceVariant, fontSize: 12, fontWeight: "700" }, activeChipText: { color: colorTokens.onPrimary },
  applyButton: { borderRadius: radiusTokens.md, backgroundColor: colorTokens.primary, alignItems: "center", paddingVertical: 11 }, applyText: { color: colorTokens.onPrimary, fontSize: 13, fontWeight: "800" },
  error: { padding: 10, borderRadius: radiusTokens.md, backgroundColor: colorTokens.errorContainer, color: colorTokens.onErrorContainer, marginBottom: spacingTokens.sm },
  resultCount: { color: colorTokens.muted, fontSize: 12, marginBottom: spacingTokens.sm }, loader: { marginTop: spacingTokens.lg }, empty: { color: colorTokens.muted, textAlign: "center", paddingVertical: spacingTokens.xl },
  logCard: { padding: spacingTokens.md, borderRadius: radiusTokens.md, borderWidth: 1, borderColor: colorTokens.border, backgroundColor: colorTokens.surfaceContainerLowest, marginBottom: spacingTokens.sm }, pressed: { opacity: 0.75 },
  logHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacingTokens.sm }, logCustomer: { color: colorTokens.ink, fontSize: 13, fontWeight: "800", flex: 1 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radiusTokens.full, alignSelf: "flex-start" }, blockedBadge: { backgroundColor: colorTokens.errorContainer }, refusedBadge: { backgroundColor: colorTokens.codGold }, normalBadge: { backgroundColor: colorTokens.secondaryContainer }, badgeText: { color: colorTokens.ink, fontSize: 10, fontWeight: "800" },
  question: { color: colorTokens.ink, fontSize: 13, marginTop: 9, lineHeight: 19 }, logMeta: { color: colorTokens.muted, fontSize: 11, marginTop: 7 }, openDetail: { color: colorTokens.primary, fontSize: 12, fontWeight: "700", marginTop: spacingTokens.sm },
  moreButton: { paddingVertical: spacingTokens.md, alignItems: "center" }, moreText: { color: colorTokens.primary, fontWeight: "800" },
  detailCard: { padding: spacingTokens.md, borderRadius: radiusTokens.lg, backgroundColor: colorTokens.surfaceContainerLowest, borderWidth: 1, borderColor: colorTokens.border, marginTop: spacingTokens.md },
  detailMeta: { color: colorTokens.muted, fontSize: 11, marginTop: 8 }, customer: { color: colorTokens.ink, fontSize: 12, fontWeight: "700", marginTop: spacingTokens.sm },
  detailSection: { borderTopWidth: 1, borderTopColor: colorTokens.border, paddingTop: spacingTokens.sm, marginTop: spacingTokens.md }, detailLabel: { color: colorTokens.onSurfaceVariant, fontSize: 11, fontWeight: "800", marginBottom: 5 },
  detailValue: { color: colorTokens.ink, fontSize: 12, lineHeight: 18 },
});
