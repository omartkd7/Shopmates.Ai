import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens, typographyTokens } from "@/src/theme/tokens";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Page introuvable" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Cette page n'existe pas.</Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>Retourner à l'accueil</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacingTokens.lg,
    backgroundColor: colorTokens.surface,
  },
  title: {
    fontSize: typographyTokens.headline.fontSize,
    fontWeight: typographyTokens.headline.fontWeight,
    color: colorTokens.ink,
    marginBottom: spacingTokens.md,
  },
  link: {
    marginTop: spacingTokens.md,
    paddingVertical: spacingTokens.sm,
  },
  linkText: {
    fontSize: typographyTokens.body.fontSize,
    color: colorTokens.brand,
    fontWeight: "600",
  },
});
