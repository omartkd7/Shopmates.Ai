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

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const validate = (): boolean => {
    setClientError(null);
    clearError();

    if (!name.trim() || name.trim().length < 2) {
      setClientError("Le nom complet doit comporter au moins 2 caractères.");
      return false;
    }

    if (!email.trim()) {
      setClientError("L'adresse email est requise.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setClientError("Format d'adresse email invalide.");
      return false;
    }

    if (!password || password.length < 6) {
      setClientError("Le mot de passe doit comporter au moins 6 caractères.");
      return false;
    }

    if (password !== confirmPassword) {
      setClientError("Les mots de passe ne correspondent pas.");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    const success = await register(
      name.trim(),
      email.trim().toLowerCase(),
      password
    );

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
              <Text style={styles.logoText}>✨</Text>
            </View>
            <Text style={styles.title}>Rejoindre ShopMate AI</Text>
            <Text style={styles.subtitle}>
              Créez votre compte pour commander facilement en paiement à la livraison
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
              <Text style={styles.label}>Nom complet</Text>
              <TextInput
                style={styles.input}
                placeholder="ex. Omar Fahid"
                placeholderTextColor={colorTokens.muted}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (clientError) setClientError(null);
                }}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

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
                placeholder="Au moins 6 caractères"
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <TextInput
                style={styles.input}
                placeholder="Répétez votre mot de passe"
                placeholderTextColor={colorTokens.muted}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
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
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colorTokens.surface} />
              ) : (
                <Text style={styles.submitButtonText}>Créer mon compte</Text>
              )}
            </Pressable>
          </View>

          {/* Switch to Login */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Vous avez déjà un compte ?</Text>
            <Pressable
              onPress={() => {
                clearError();
                router.push("/(auth)/login");
              }}
            >
              <Text style={styles.footerLink}>Se connecter</Text>
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
    marginBottom: spacingTokens.lg,
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
    textAlign: "center",
    marginBottom: spacingTokens.xs,
  },
  subtitle: {
    fontSize: typographyTokens.body.fontSize,
    color: colorTokens.muted,
    textAlign: "center",
    paddingHorizontal: spacingTokens.md,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colorTokens.surfaceContainerLow,
    borderColor: colorTokens.danger,
    borderWidth: 1,
    borderRadius: radiusTokens.md,
    padding: spacingTokens.md,
    marginBottom: spacingTokens.lg,
    gap: spacingTokens.sm,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    flex: 1,
    color: colorTokens.danger,
    fontSize: typographyTokens.body.fontSize,
    fontWeight: "500",
  },
  form: {
    gap: spacingTokens.md,
  },
  inputGroup: {
    gap: spacingTokens.xs,
  },
  label: {
    fontSize: typographyTokens.caption.fontSize,
    fontWeight: "600",
    color: colorTokens.ink,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.md,
    paddingHorizontal: spacingTokens.md,
    fontSize: typographyTokens.body.fontSize,
    color: colorTokens.ink,
    backgroundColor: colorTokens.surfaceContainerLowest,
  },
  submitButton: {
    height: 50,
    backgroundColor: colorTokens.brand,
    borderRadius: radiusTokens.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacingTokens.sm,
    shadowColor: colorTokens.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonPressed: {
    opacity: 0.85,
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
    fontSize: typographyTokens.body.fontSize,
  },
  footerLink: {
    color: colorTokens.brand,
    fontSize: typographyTokens.body.fontSize,
    fontWeight: "700",
  },
});
