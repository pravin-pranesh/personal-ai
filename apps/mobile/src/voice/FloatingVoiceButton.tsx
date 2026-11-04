import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { parseCommandWithLlm } from "./geminiIntent";
import { startSpeechToText } from "./stt";
import { executeVoiceIntent } from "../phone/phoneActions";
import { useMascotOverlay } from "../mascot/MascotOverlayContext";
import { colors, spacing } from "../theme";

export function FloatingVoiceButton() {
  const { speakCue } = useMascotOverlay();
  const [listening, setListening] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const sessionRef = useRef<{ stop: () => void } | null>(null);

  const runText = useCallback(
    async (text: string) => {
      const intent = await parseCommandWithLlm(text);
      try {
        const reply = await executeVoiceIntent(intent);
        speakCue({ message: reply, reason: "Voice command" });
      } catch {
        Alert.alert("Command failed", "Check server connection and try again.");
      }
    },
    [speakCue],
  );

  const onMic = async () => {
    if (listening) {
      sessionRef.current?.stop();
      sessionRef.current = null;
      setListening(false);
      return;
    }
    setListening(true);
    const session = await startSpeechToText(
      (r) => {
        setListening(false);
        sessionRef.current?.stop();
        sessionRef.current = null;
        void runText(r.text);
      },
      (msg) => {
        setListening(false);
        if (Platform.OS === "web") {
          setTextOpen(true);
        } else {
          Alert.alert("Voice input", `${msg} Type your command instead.`, [
            { text: "Type", onPress: () => setTextOpen(true) },
            { text: "OK" },
          ]);
        }
      },
    );
    sessionRef.current = session;
    if (!session) setListening(false);
  };

  return (
    <>
      <View style={styles.fabRow} pointerEvents="box-none">
        <Pressable
          style={[styles.fab, listening && styles.fabActive]}
          onPress={() => void onMic()}
          accessibilityLabel="Voice command"
        >
          <Text style={styles.fabIcon}>{listening ? "■" : "🎤"}</Text>
        </Pressable>
        <Pressable
          style={styles.miniFab}
          onPress={() => setTextOpen(true)}
          accessibilityLabel="Type command"
        >
          <Text style={styles.miniText}>⌨</Text>
        </Pressable>
      </View>

      <Modal visible={textOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Type a command</Text>
            <TextInput
              style={styles.input}
              placeholder='e.g. "search for biryani" or "remind me at 5pm"'
              value={draft}
              onChangeText={setDraft}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setTextOpen(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const t = draft.trim();
                  setTextOpen(false);
                  setDraft("");
                  if (t) void runText(t);
                }}
              >
                <Text style={styles.run}>Run</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabRow: {
    position: "absolute",
    right: spacing.md,
    bottom: Platform.OS === "ios" ? 88 : 72,
    gap: spacing.sm,
    alignItems: "center",
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  fabActive: { backgroundColor: colors.danger },
  fabIcon: { fontSize: 22 },
  miniFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  miniText: { fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalTitle: { fontWeight: "700", fontSize: 17 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.lg,
  },
  cancel: { color: colors.textSecondary, fontWeight: "600" },
  run: { color: colors.primary, fontWeight: "700" },
});
