import { Platform } from "react-native";

// In development:
// Android Emulator uses 10.0.2.2 instead of localhost
// Physical phone uses the computer's LAN IP (e.g. http://192.168.1.X:4000)
const defaultHost =
  Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL || defaultHost;
