import React from "react";
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colorTokens, spacingTokens } from "../theme/tokens";

export interface LoaderProps {
  message?: string;
  size?: "small" | "large";
  color?: string;
  style?: ViewStyle;
}

export function Loader({
  message,
  size = "large",
  color = colorTokens.primary,
  style,
}: LoaderProps) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacingTokens.xl,
    minHeight: 180,
  },
  message: {
    marginTop: spacingTokens.md,
    fontSize: 14,
    color: colorTokens.muted,
    textAlign: "center",
  },
});
