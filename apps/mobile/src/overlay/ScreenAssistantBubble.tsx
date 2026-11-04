import { useCallback, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar3DScene } from "./Avatar3DScene";
import { colors, spacing, typography } from "../theme";
import { startSpeechToText } from "../voice/stt";

type Props = {
  assistantName: string;
  use3d: boolean;
  mouthOpen: number;
  listening: boolean;
  onListenPress: (pushToTalk: boolean) => void;
  lastReply?: string | null;
};

export function ScreenAssistantBubble({
  assistantName,
  use3d,
  mouthOpen,
  listening,
  onListenPress,
  lastReply,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [pos, setPos] = useState({ x: 16, y: 120 });
  const dragStart = useRef({ x: 16, y: 120 });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStart.current = { ...pos };
      },
      onPanResponderMove: (_e, gesture) => {
        setPos({
          x: dragStart.current.x + gesture.dx,
          y: dragStart.current.y + gesture.dy,
        });
      },
    }),
  ).current;

  const onMic = useCallback(() => {
    onListenPress(true);
  }, [onListenPress]);

  return (
    <View style={[styles.root, { left: pos.x, top: pos.y }]} {...panResponder.panHandlers}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={styles.bubble}
        accessibilityLabel="Assistant bubble"
      >
        <Avatar3DScene mouthOpen={mouthOpen} use3d={use3d} size={expanded ? 120 : 72} />
        {listening ? <View style={styles.listeningRing} /> : null}
      </Pressable>
      {expanded ? (
        <View style={styles.panel}>
          <Text style={styles.name}>{assistantName}</Text>
          <Text style={typography.caption}>
            Say “{assistantName}, …” or tap Listen (push-to-talk).
          </Text>
          {lastReply ? (
            <Text style={styles.reply} numberOfLines={4}>
              {lastReply}
            </Text>
          ) : null}
          <Pressable
            style={[styles.micBtn, listening && styles.micBtnActive]}
            onPress={onMic}
          >
            <Text style={styles.micText}>{listening ? "Listening…" : "Listen"}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/** Web smoke helper — starts STT once for screenshot flows. */
export async function smokeTestSttAvailable(): Promise<boolean> {
  const session = await startSpeechToText(
    () => {},
    () => {},
  );
  session?.stop();
  return session != null;
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    zIndex: 9999,
    elevation: 20,
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  bubble: {
    borderRadius: 999,
    padding: 4,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  listeningRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "#22c55e",
  },
  panel: {
    width: 260,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  name: { ...typography.body, fontWeight: "700" },
  reply: { ...typography.caption, color: colors.text },
  micBtn: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  micBtnActive: { backgroundColor: "#15803d" },
  micText: { color: "#fff", fontWeight: "700" },
});
