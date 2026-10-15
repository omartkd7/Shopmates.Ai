import React from "react";
import { StyleSheet, View, ViewProps, ViewStyle } from "react-native";
import { colorTokens, radiusTokens, spacingTokens } from "../theme/tokens";

export interface CardProps extends ViewProps {
  variant?: "surface" | "container" | "outline" | "highlight";
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function Card({
  variant = "container",
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <View style={[styles.base, styles[variant], style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radiusTokens.xl,
    padding: spacingTokens.md,
  },
  surface: {
    backgroundColor: colorTokens.surfaceContainerLowest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  container: {
    backgroundColor: colorTokens.surfaceContainer,
  },
  outline: {
    backgroundColor: colorTokens.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colorTokens.border,
  },
  highlight: {
    backgroundColor: colorTokens.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colorTokens.primaryContainer,
  },
});
