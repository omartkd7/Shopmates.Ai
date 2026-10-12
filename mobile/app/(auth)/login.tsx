import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/src/stores/authStore";
import {
  colorTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
} from "@/src/theme/tokens";

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const validate = (): boolean => {
    setClientError(null);
    clearError();

    if (!email.trim()) {
      setClientError("L'adresse email est requise.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setClientError("Format d'email invalide.");
      return false;
    }

    if (!password) {
      setClientError("Le mot de passe est requis.");
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    const success = await login(email.trim().toLowerCase(), password);
    if (success) {
      router.replace("/(tabs)");
    }
  };

  const errorMessage = clientError || authError;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header & Logo */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>🛍️</Text>
            </View>
            <Text style={styles.title}>ShopMate AI</Text>
            <Text style={styles.subtitle}>
              Connexion à votre espace boutique COD
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse Email</Text>
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                placeholderTextColor={colorTokens.muted}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (clientError) setClientError(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colorTokens.muted}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (clientError) setClientError(null);
                }}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* Submit Button */}
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitButtonPressed,
                isLoading && styles.submitButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colorTokens.surface} />
              ) : (
                <Text style={styles.submitButtonText}>Se connecter</Text>
              )}
            </Pressable>
          </View>

          {/* Switch to Register */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Vous n'avez pas de compte ?</Text>
            <Pressable
              onPress={() => {
                clearError();
                router.push("/(auth)/register");
              }}
            >
              <Text style={styles.footerLink}>Créer un compte</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorTokens.surface,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacingTokens.lg,
    paddingVertical: spacingTokens.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: spacingTokens.xl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: radiusTokens.lg,
    backgroundColor: colorTokens.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacingTokens.md,
  },
  logoText: {
    fontSize: 32,
  },
  title: {
    fontSize: typographyTokens.title.fontSize,
    fontWeight: typographyTokens.title.fontWeight,
    color: colorTokens.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typographyTokens.body.fontSize,
    color: colorTokens.muted,
    marginTop: spacingTokens.xs,
    textAlign: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffdad6",
    padding: spacingTokens.md,
    borderRadius: radiusTokens.md,
    marginBottom: spacingTokens.lg,
    gap: spacingTokens.sm,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    color: colorTokens.danger,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  form: {
    gap: spacingTokens.md,
  },
  inputGroup: {
    gap: spacingTokens.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colorTokens.ink,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.md,
    paddingHorizontal: spacingTokens.md,
    backgroundColor: colorTokens.surfaceContainerLowest,
    color: colorTokens.ink,
    fontSize: 15,
  },
  submitButton: {
    height: 50,
    backgroundColor: colorTokens.primary,
    borderRadius: radiusTokens.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacingTokens.sm,
    shadowColor: colorTokens.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colorTokens.surface,
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacingTokens.xs,
    marginTop: spacingTokens.xl,
  },
  footerText: {
    color: colorTokens.muted,
    fontSize: 14,
  },
  footerLink: {
    color: colorTokens.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});
