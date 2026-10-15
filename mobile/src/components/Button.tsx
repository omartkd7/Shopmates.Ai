import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from "react-native";
import { colorTokens, radiusTokens, spacingTokens } from "../theme/tokens";

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "outline" || variant === "ghost" ? colorTokens.primary : colorTokens.surface}
        />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`textSize_${size}`],
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radiusTokens.lg,
    gap: spacingTokens.sm,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
  // Variants
  primary: {
    backgroundColor: colorTokens.primary,
    shadowColor: colorTokens.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  secondary: {
    backgroundColor: colorTokens.secondaryContainer,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colorTokens.border,
  },
  danger: {
    backgroundColor: colorTokens.errorContainer,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  // Sizes
  size_sm: {
    height: 36,
    paddingHorizontal: spacingTokens.md,
  },
  size_md: {
    height: 48,
    paddingHorizontal: spacingTokens.lg,
  },
  size_lg: {
    height: 54,
    paddingHorizontal: spacingTokens.xl,
  },
  // Text Styles
  text: {
    fontWeight: "700",
  },
  text_primary: {
    color: colorTokens.onPrimary,
  },
  text_secondary: {
    color: colorTokens.onSecondaryContainer,
  },
  text_outline: {
    color: colorTokens.ink,
  },
  text_danger: {
    color: colorTokens.danger,
  },
  text_ghost: {
    color: colorTokens.primary,
  },
  textSize_sm: {
    fontSize: 13,
  },
  textSize_md: {
    fontSize: 15,
  },
  textSize_lg: {
    fontSize: 17,
  },
});
