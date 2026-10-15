import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { colorTokens, spacingTokens } from "../theme/tokens";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon = "🛍️",
  title,
  description,
  actionTitle,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionTitle && onAction ? (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="outline"
          size="sm"
          style={styles.actionButton}
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
    fontSize: 48,
    marginBottom: spacingTokens.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colorTokens.ink,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: colorTokens.muted,
    textAlign: "center",
    marginTop: spacingTokens.xs,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: spacingTokens.lg,
  },
});
