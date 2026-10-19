import { Image, StyleSheet, View } from "react-native";
import { colorTokens, spacingTokens } from "@/src/theme/tokens";

/** Shared top bar copied from the Stitch ShopMate screens. */
export function BrandHeader() {
  return (
    <View style={styles.header} accessibilityLabel="ShopMate AI">
      <View style={styles.sideSpace} />
      <Image
        source={require("../../assets/images/shopmate-logo.png")}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="ShopMate AI"
      />
      <Image
        source={require("../../assets/images/profile-demo.png")}
        style={styles.avatar}
        accessibilityLabel="Profil"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    paddingHorizontal: spacingTokens.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colorTokens.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(156, 62, 35, 0.08)",
  },
  sideSpace: { width: 36 },
  logo: { width: 52, height: 42 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colorTokens.outlineVariant,
  },
});
