import { Tabs } from "expo-router";
import { Platform, Text, View } from "react-native";
import { colorTokens } from "@/src/theme/tokens";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colorTokens.primary,
        tabBarInactiveTintColor: colorTokens.muted,
        tabBarStyle: {
          backgroundColor: colorTokens.surface,
          borderTopColor: colorTokens.border,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
          paddingTop: 8,
          elevation: 4,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: "Assistant",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.7 }}>▤</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Boutique",
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.7 }}>♧</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Commandes",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.7 }}>📦</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.7 }}>👤</Text>
          ),
        }}
      />
      <Tabs.Screen name="admin-catalogue" options={{ href: null }} />
      <Tabs.Screen name="admin-documents" options={{ href: null }} />
      <Tabs.Screen name="admin-agent-logs" options={{ href: null }} />
    </Tabs>
  );
}
