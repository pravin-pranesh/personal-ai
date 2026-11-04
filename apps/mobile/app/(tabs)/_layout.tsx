import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { MascotOverlayProvider } from "../../src/mascot/MascotOverlayContext";
import { OverlayAssistantProvider } from "../../src/overlay/OverlayAssistantProvider";
import { PhoneBootstrap } from "../../src/phone/PhoneBootstrap";
import { FloatingVoiceButton } from "../../src/voice/FloatingVoiceButton";
import { colors } from "../../src/theme";

export default function TabLayout() {
  return (
    <MascotOverlayProvider>
      <OverlayAssistantProvider>
      <PhoneBootstrap />
      <View style={styles.shell}>
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: colors.primary,
        tabBarStyle: { backgroundColor: colors.card },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="today" options={{ title: "Today" }} />
      <Tabs.Screen
        name="daily"
        options={{
          title: "Schedule",
          headerTitle: "Daily schedule",
          tabBarLabel: "Schedule",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen name="research" options={{ title: "Research" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
      <FloatingVoiceButton />
      </View>
      </OverlayAssistantProvider>
    </MascotOverlayProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
});
