import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/src/stores/authStore";
import {
  colorTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
} from "@/src/theme/tokens";

function SplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <View style={styles.logoBadge}>
        <Text style={styles.logoIcon}>🛍️</Text>
      </View>
      <Text style={styles.splashTitle}>ShopMate AI</Text>
      <Text style={styles.splashSubtitle}>Assistant Shopping Intelligent</Text>
      <ActivityIndicator
        size="large"
        color={colorTokens.brand}
        style={styles.spinner}
      />
    </View>
  );
}

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  // Initialize auth tokens from SecureStore on app startup
  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  // Route Guard: enforce authentication state vs public auth screens
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      // Unauthenticated user trying to access protected screens -> redirect to login
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      // Authenticated user trying to access login/register -> redirect to tabs
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colorTokens.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacingTokens.lg,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: radiusTokens.lg,
    backgroundColor: colorTokens.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacingTokens.md,
  },
  logoIcon: {
    fontSize: 40,
  },
  splashTitle: {
    fontSize: typographyTokens.title.fontSize,
    fontWeight: typographyTokens.title.fontWeight,
    color: colorTokens.ink,
    marginBottom: spacingTokens.xs,
  },
  splashSubtitle: {
    fontSize: typographyTokens.body.fontSize,
    color: colorTokens.muted,
  },
  spinner: {
    marginTop: spacingTokens.xl,
  },
});
