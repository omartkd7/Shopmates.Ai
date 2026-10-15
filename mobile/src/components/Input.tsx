import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { colorTokens, radiusTokens, spacingTokens } from "../theme/tokens";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  helperText?: string;
  prefixIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  helperText,
  prefixIcon,
  containerStyle,
  style,
  ...rest
}: InputProps) {
  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          hasError && styles.inputWrapperError,
        ]}
      >
        {prefixIcon ? <View style={styles.prefix}>{prefixIcon}</View> : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colorTokens.muted}
          {...rest}
        />
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacingTokens.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colorTokens.ink,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.lg,
    backgroundColor: colorTokens.surfaceContainerLowest,
    paddingHorizontal: spacingTokens.md,
  },
  inputWrapperError: {
    borderColor: colorTokens.danger,
    backgroundColor: colorTokens.errorContainer,
  },
  prefix: {
    marginRight: spacingTokens.sm,
  },
  input: {
    flex: 1,
    height: "100%",
    color: colorTokens.ink,
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
    color: colorTokens.danger,
    fontWeight: "500",
  },
  helperText: {
    fontSize: 12,
    color: colorTokens.muted,
  },
});
