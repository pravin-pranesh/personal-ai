import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import LottieView from "lottie-react-native";
import * as Speech from "expo-speech";
import { colors, spacing, typography } from "../theme";
import {
  buildVisemeTimeline,
  visemeAtCharIndex,
  type Viseme,
} from "./assistant/visemeSchedule";
import { AssistantMouth } from "./AssistantMouth";
import { PrimaryButton } from "./ui/PrimaryButton";

const orbIdle = require("../../assets/assistant/orb-idle.json");
const orbSpeaking = require("../../assets/assistant/orb-speaking.json");

export const DEFAULT_ASSISTANT_MESSAGE =
  "Hi! I'm your daily assistant. Tap me or press Listen when you're ready.";

type Props = {
  message?: string;
};

function clearSpeakingState(
  setSpeaking: (value: boolean) => void,
  setViseme: (value: Viseme) => void,
  pulse: Animated.Value,
  pulseLoop: React.MutableRefObject<Animated.CompositeAnimation | null>,
) {
  setSpeaking(false);
  setViseme("closed");
  pulseLoop.current?.stop();
  pulse.setValue(1);
}

export function AssistantCharacter({
  message = DEFAULT_ASSISTANT_MESSAGE,
}: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [viseme, setViseme] = useState<Viseme>("closed");
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const visemeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visemeIndex = useRef(0);
  const timelineRef = useRef(buildVisemeTimeline(message));

  const stopVisemePlayback = useCallback(() => {
    if (visemeTimer.current) {
      clearTimeout(visemeTimer.current);
      visemeTimer.current = null;
    }
    visemeIndex.current = 0;
    setViseme("closed");
  }, []);

  const playVisemeFrame = useCallback(() => {
    const timeline = timelineRef.current;
    if (visemeIndex.current >= timeline.length) {
      visemeIndex.current = 0;
    }
    const frame = timeline[visemeIndex.current];
    if (!frame) {
      return;
    }
    setViseme(frame.viseme);
    visemeIndex.current += 1;
    visemeTimer.current = setTimeout(playVisemeFrame, frame.durationMs);
  }, []);

  const startVisemePlayback = useCallback(() => {
    stopVisemePlayback();
    timelineRef.current = buildVisemeTimeline(message);
    playVisemeFrame();
  }, [message, playVisemeFrame, stopVisemePlayback]);

  const clearAll = useCallback(() => {
    stopVisemePlayback();
    clearSpeakingState(setSpeaking, setViseme, pulse, pulseLoop);
  }, [pulse, stopVisemePlayback]);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    clearAll();
  }, [clearAll]);

  const startSpeaking = useCallback(() => {
    setSpeaking(true);
    Speech.speak(message, {
      onStart: () => {
        startVisemePlayback();
      },
      onBoundary: (event: unknown) => {
        if (
          event &&
          typeof event === "object" &&
          "charIndex" in event &&
          typeof (event as { charIndex: unknown }).charIndex === "number"
        ) {
          setViseme(
            visemeAtCharIndex(message, (event as { charIndex: number }).charIndex),
          );
        }
      },
      onDone: () => clearAll(),
      onStopped: () => clearAll(),
      onError: () => clearAll(),
    });
  }, [clearAll, message, startVisemePlayback]);

  const toggleSpeech = useCallback(() => {
    if (speaking) {
      stopSpeaking();
    } else {
      startSpeaking();
    }
  }, [speaking, stopSpeaking, startSpeaking]);

  useEffect(() => {
    timelineRef.current = buildVisemeTimeline(message);
    if (!speaking) {
      setViseme("closed");
    }
  }, [message, speaking]);

  useEffect(() => {
    if (!speaking) {
      return;
    }
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.current.start();
    return () => {
      pulseLoop.current?.stop();
    };
  }, [speaking, pulse]);

  useEffect(() => {
    return () => {
      if (visemeTimer.current) {
        clearTimeout(visemeTimer.current);
      }
      Speech.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <View style={styles.bubbleTail} />
        <Text style={styles.bubbleText}>{message}</Text>
      </View>

      <Pressable
        onPress={toggleSpeech}
        accessibilityRole="button"
        accessibilityLabel="Talking assistant"
        accessibilityHint="Plays or stops the welcome message"
      >
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <View style={styles.characterStage}>
            <LottieView
              source={speaking ? orbSpeaking : orbIdle}
              autoPlay
              loop
              style={styles.lottie}
              speed={speaking ? 1.2 : 1}
            />
            <AssistantMouth viseme={viseme} />
          </View>
        </Animated.View>
      </Pressable>

      <PrimaryButton
        label={speaking ? "Stop" : "Listen"}
        onPress={toggleSpeech}
        variant="secondary"
        style={styles.listenButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  bubble: {
    alignSelf: "stretch",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bubbleTail: {
    position: "absolute",
    bottom: -8,
    alignSelf: "center",
    width: 16,
    height: 16,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: "45deg" }],
  },
  bubbleText: {
    ...typography.body,
    color: colors.text,
    textAlign: "center",
  },
  characterStage: {
    width: 140,
    height: 140,
  },
  lottie: {
    width: 140,
    height: 140,
  },
  listenButton: {
    alignSelf: "stretch",
    marginTop: spacing.sm,
  },
});
