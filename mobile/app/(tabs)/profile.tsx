import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/src/stores/authStore";
import {
  colorTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
} from "@/src/theme/tokens";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { router, type Href } from "expo-router";

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter de ShopMate AI ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Déconnexion", style: "destructive", onPress: () => void logout() },
      ]
    );
  };

  const displayName = user?.name || "Client ShopMate";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role || "CUSTOMER"}</Text>
            </View>
          </View>

          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={styles.locationBadge}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>Casablanca • Boutique Démo</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Card variant="surface" style={styles.statCard}>
            <Text style={styles.statValue}>100%</Text>
            <Text style={styles.statLabel}>PAIEMENT COD</Text>
          </Card>
          <Card variant="surface" style={styles.statCard}>
            <Text style={[styles.statValue, { color: colorTokens.secondary }]}>✨</Text>
            <Text style={styles.statLabel}>CLIENT PRIVILÈGE</Text>
          </Card>
        </View>

        {/* Settings Group: Compte */}
        <View style={styles.menuSection}>
          {user?.role === "ADMIN" ? (
            <>
              <MenuItem
                icon="🧰"
                title="Gestion du catalogue"
                subtitle="Produits, catégories, prix et stock"
                onPress={() => router.push("/(tabs)/admin-catalogue" as Href)}
              />
              <MenuItem
                icon="📚"
                title="Documents de connaissance IA"
                subtitle="Ajouter et gérer les sources de réponses de l’agent"
                onPress={() => router.push("/(tabs)/admin-documents" as Href)}
              />
              <MenuItem
                icon="🧾"
                title="Journal de l’assistant IA"
                subtitle="Auditer les questions, outils et sources utilisés"
                onPress={() => router.push("/(tabs)/admin-agent-logs" as Href)}
              />
            </>
          ) : null}

          <Text style={styles.sectionHeader}>PARAMÈTRES DU COMPTE</Text>

          <MenuItem
            icon="🚚"
            title="Adresse de livraison"
            subtitle="Gérer vos adresses de livraison au Maroc"
            onPress={() => {}}
          />

          <MenuItem
            icon="🌐"
            title="Langue"
            subtitle="Français • Darija (ar-MA)"
            badge="عربي"
            onPress={() => {}}
          />
        </View>

        {/* Settings Group: Aide & Informations */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionHeader}>AIDE & INFORMATIONS</Text>

          <MenuItem
            icon="💬"
            title="Assistance ShopMate"
            subtitle="Discuter avec l'assistant IA ou le support"
            onPress={() => {}}
          />

          <MenuItem
            icon="💵"
            title="Conditions Cash on Delivery"
            subtitle="Paiement à la réception en dirhams (MAD)"
            onPress={() => {}}
          />

          <MenuItem
            icon="🛡️"
            title="Sécurité & Confidentialité"
            subtitle="Protection des données multi-boutiques"
            onPress={() => {}}
          />
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            title="Se déconnecter"
            onPress={handleLogout}
            variant="danger"
            size="lg"
            icon={<Text style={{ fontSize: 16 }}>🚪</Text>}
          />
          <Text style={styles.versionText}>ShopMate AI v1.0.0 • Fil Rouge 2026</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  badge,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
      onPress={onPress}
    >
      <View style={styles.menuIconContainer}>
        <Text style={styles.menuIcon}>{icon}</Text>
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      {badge ? (
        <View style={styles.itemBadge}>
          <Text style={styles.itemBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colorTokens.surface,
  },
  scrollContent: {
    paddingBottom: spacingTokens.xxl,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: spacingTokens.xl,
    backgroundColor: colorTokens.surfaceContainerLow,
    borderBottomLeftRadius: radiusTokens.xxl,
    borderBottomRightRadius: radiusTokens.xxl,
    marginBottom: spacingTokens.md,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: spacingTokens.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colorTokens.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "800",
    color: colorTokens.onPrimaryContainer,
  },
  roleBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: colorTokens.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radiusTokens.full,
    borderWidth: 2,
    borderColor: colorTokens.surface,
  },
  roleText: {
    fontSize: 9,
    fontWeight: "800",
    color: colorTokens.onPrimary,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: colorTokens.ink,
  },
  userEmail: {
    fontSize: 13,
    color: colorTokens.muted,
    marginTop: 2,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colorTokens.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radiusTokens.full,
    marginTop: spacingTokens.sm,
  },
  locationIcon: {
    fontSize: 12,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
    color: colorTokens.ink,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacingTokens.md,
    paddingHorizontal: spacingTokens.md,
    marginBottom: spacingTokens.lg,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacingTokens.md,
    borderWidth: 1,
    borderColor: colorTokens.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colorTokens.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colorTokens.muted,
    letterSpacing: 0.5,
  },
  menuSection: {
    paddingHorizontal: spacingTokens.md,
    marginBottom: spacingTokens.lg,
    gap: spacingTokens.xs,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: colorTokens.muted,
    letterSpacing: 0.8,
    marginBottom: spacingTokens.xs,
    marginLeft: spacingTokens.xs,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colorTokens.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.lg,
    padding: spacingTokens.md,
    gap: spacingTokens.md,
  },
  menuItemPressed: {
    backgroundColor: colorTokens.surfaceContainerLow,
    transform: [{ scale: 0.99 }],
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: radiusTokens.md,
    backgroundColor: colorTokens.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    fontSize: 18,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colorTokens.ink,
  },
  menuSubtitle: {
    fontSize: 12,
    color: colorTokens.muted,
    marginTop: 1,
  },
  itemBadge: {
    backgroundColor: colorTokens.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radiusTokens.sm,
  },
  itemBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colorTokens.primary,
  },
  chevron: {
    fontSize: 18,
    color: colorTokens.muted,
    fontWeight: "700",
  },
  logoutContainer: {
    paddingHorizontal: spacingTokens.md,
    marginTop: spacingTokens.sm,
    gap: spacingTokens.md,
  },
  versionText: {
    fontSize: 11,
    color: colorTokens.muted,
    textAlign: "center",
  },
});
