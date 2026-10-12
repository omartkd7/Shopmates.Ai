import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colorTokens } from "@/src/theme/tokens";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colorTokens.brand,
        tabBarInactiveTintColor: colorTokens.muted,
        tabBarStyle: {
          backgroundColor: colorTokens.surface,
          borderTopColor: colorTokens.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Boutique",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🛍️</Text>,
        }}
      />
    </Tabs>
  );
}
