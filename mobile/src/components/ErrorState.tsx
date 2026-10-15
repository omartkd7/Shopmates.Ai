import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { colorTokens, spacingTokens } from "../theme/tokens";
import { Button } from "./Button";

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  retryTitle?: string;
  style?: ViewStyle;
}

export function ErrorState({
  message = "Une erreur est survenue lors du chargement des données.",
  onRetry,
  retryTitle = "Réessayer",
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>Oups !</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button
          title={retryTitle}
          onPress={onRetry}
          variant="primary"
          size="sm"
          style={styles.retryButton}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacingTokens.xl,
    paddingVertical: spacingTokens.xxl,
  },
  icon: {
    fontSize: 40,
    marginBottom: spacingTokens.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colorTokens.danger,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: colorTokens.muted,
    textAlign: "center",
    marginTop: spacingTokens.xs,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: spacingTokens.lg,
  },
});
