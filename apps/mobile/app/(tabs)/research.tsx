import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from "react-native";
import type { ResearchSession } from "@personal-ai/shared";
import { createResearchSession, fetchResearchSessions } from "../../src/api/client";
import { AssistantOrbAvatar } from "../../src/components/research/AssistantOrbAvatar";
import { NewsCard } from "../../src/components/research/NewsCard";
import { ResearchTypingIndicator } from "../../src/components/research/ResearchTypingIndicator";
import { subscribeDailyDataCleared } from "../../src/lib/dailyDataRefresh";
import { OfflineBanner } from "../../src/components/ui/OfflineBanner";
import { colors, spacing, typography } from "../../src/theme";

type ThreadMessage =
  | { id: string; role: "user"; text: string; createdAt: string }
  | {
      id: string;
      role: "assistant";
      text: string;
      createdAt: string;
      cards: ResearchSession["cards"];
    };

function sessionsToMessages(sessions: ResearchSession[]): ThreadMessage[] {
  const chronological = [...sessions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const messages: ThreadMessage[] = [];
  for (const s of chronological) {
    messages.push({
      id: `${s.id}-user`,
      role: "user",
      text: s.prompt,
      createdAt: s.createdAt,
    });
    messages.push({
      id: `${s.id}-assistant`,
      role: "assistant",
      text: s.summary,
      createdAt: s.createdAt,
      cards: s.cards,
    });
  }
  return messages;
}

export default function ResearchScreen() {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchResearchSessions();
      setMessages(sessionsToMessages(data.sessions));
    } catch {
      setError(true);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeDailyDataCleared(() => void load()), [load]);

  useEffect(() => {
    if (!loading) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, submitting, loading]);

  const onSubmit = async () => {
    const prompt = draft.trim();
    if (!prompt || submitting) return;

    const pendingUser: ThreadMessage = {
      id: `pending-user-${Date.now()}`,
      role: "user",
      text: prompt,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, pendingUser]);
    setDraft("");
    setSubmitting(true);

    try {
      const session = await createResearchSession(prompt);
      setMessages((prev) => {
        const withoutPending = prev.filter((m) => m.id !== pendingUser.id);
        return [
          ...withoutPending,
          {
            id: `${session.id}-user`,
            role: "user",
            text: session.prompt,
            createdAt: session.createdAt,
          },
          {
            id: `${session.id}-assistant`,
            role: "assistant",
            text: session.summary,
            createdAt: session.createdAt,
            cards: session.cards,
          },
        ];
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== pendingUser.id));
      setDraft(prompt);
      Alert.alert("Research failed", "Check that the server is running and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const empty = !loading && messages.length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <View style={styles.flex}>
        {error ? (
          <View style={styles.bannerWrap}>
            <OfflineBanner />
          </View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          style={styles.thread}
          contentContainerStyle={[
            styles.threadContent,
            empty && styles.threadContentEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.emptyState}>
              <AssistantOrbAvatar size={48} active />
              <Text style={styles.emptyTitle}>Loading research…</Text>
            </View>
          ) : empty ? (
            <View style={styles.emptyState}>
              <AssistantOrbAvatar size={56} />
              <Text style={styles.emptyTitle}>Ask about any topic</Text>
              <Text style={styles.emptyHint}>
                Type a question or news angle below. I&apos;ll reply with a short summary and
                headline cards (sample sources until RSS is wired).
              </Text>
            </View>
          ) : (
            messages.map((msg) =>
              msg.role === "user" ? (
                <View key={msg.id} style={styles.userRow}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userText}>{msg.text}</Text>
                  </View>
                </View>
              ) : (
                <View key={msg.id} style={styles.assistantRow}>
                  <AssistantOrbAvatar size={28} />
                  <View style={styles.assistantCol}>
                    <View style={styles.assistantBubble}>
                      <Text style={styles.assistantText}>{msg.text}</Text>
                    </View>
                    <View style={styles.cardStack}>
                      {msg.cards.map((card, i) => (
                        <NewsCard key={`${msg.id}-card-${i}`} card={card} />
                      ))}
                    </View>
                  </View>
                </View>
              ),
            )
          )}
          {submitting ? <ResearchTypingIndicator /> : null}
        </ScrollView>

        <View style={styles.composerWrap}>
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="Research a topic or ask for news…"
              placeholderTextColor={colors.textSecondary}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={500}
              editable={!submitting}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                (!draft.trim() || submitting) && styles.sendBtnDisabled,
                pressed && draft.trim() && !submitting && styles.sendBtnPressed,
              ]}
              onPress={() => void onSubmit()}
              disabled={!draft.trim() || submitting}
              accessibilityRole="button"
              accessibilityLabel="Send research prompt"
            >
              <Text style={styles.sendLabel}>{submitting ? "…" : "Send"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  bannerWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  thread: { flex: 1 },
  threadContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  threadContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.subtitle,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  emptyHint: {
    ...typography.caption,
    textAlign: "center",
    color: colors.textSecondary,
    lineHeight: 20,
    maxWidth: 420,
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  userBubble: {
    maxWidth: "85%",
    backgroundColor: colors.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userText: {
    ...typography.body,
    color: "#FFFFFF",
  },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    maxWidth: "100%",
  },
  assistantCol: {
    flex: 1,
    gap: spacing.sm,
    maxWidth: "92%",
  },
  assistantBubble: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assistantText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  cardStack: {
    gap: spacing.sm,
  },
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? spacing.md : spacing.sm,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.background,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minWidth: 64,
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  sendBtnPressed: {
    opacity: 0.88,
  },
  sendLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
