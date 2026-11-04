import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  speakAssistantMessage,
  stopAssistantSpeech,
} from "../components/assistant/assistantSpeech";
import { AssistantMouth } from "../components/AssistantMouth";
import {
  buildVisemeTimeline,
  type Viseme,
} from "../components/assistant/visemeSchedule";
import { colors, spacing, typography } from "../theme";

type Props = {
  message: string;
  autoSpeak?: boolean;
};

export function SmileyMascot({ message, autoSpeak = false }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [viseme, setViseme] = useState<Viseme>("closed");
  const visemeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visemeIndex = useRef(0);
  const timelineRef = useRef(buildVisemeTimeline(message));

  const stopViseme = useCallback(() => {
    if (visemeTimer.current) clearTimeout(visemeTimer.current);
    visemeTimer.current = null;
    visemeIndex.current = 0;
    setViseme("closed");
  }, []);

  const playVisemes = useCallback(() => {
    const timeline = timelineRef.current;
    const frame = timeline[visemeIndex.current];
    if (!frame) {
      visemeIndex.current = 0;
      return;
    }
    setViseme(frame.viseme);
    visemeIndex.current += 1;
    visemeTimer.current = setTimeout(playVisemes, frame.durationMs);
  }, []);

  const speak = useCallback(() => {
    timelineRef.current = buildVisemeTimeline(message);
    setSpeaking(true);
    playVisemes();
    void speakAssistantMessage(message, {
      onDone: () => {
        stopViseme();
        setSpeaking(false);
      },
      onStopped: () => {
        stopViseme();
        setSpeaking(false);
      },
    });
  }, [message, playVisemes, stopViseme]);

  useEffect(() => {
    if (autoSpeak) speak();
    return () => {
      stopAssistantSpeech();
      stopViseme();
    };
  }, [autoSpeak, speak, stopViseme]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.face, speaking && styles.faceSpeaking]}>
        <View style={styles.eyes}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
        <AssistantMouth viseme={viseme} />
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.sm, maxWidth: 340 },
  face: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FDE047",
    borderWidth: 3,
    borderColor: "#CA8A04",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },
  faceSpeaking: {
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  eyes: {
    flexDirection: "row",
    gap: 28,
    marginBottom: 4,
  },
  eye: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#0F172A",
  },
  message: {
    ...typography.body,
    textAlign: "center",
    lineHeight: 22,
  },
});
