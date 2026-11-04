import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
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
import { useNavigation } from "expo-router";
import type {
  ResearchNewsCard,
  ResearchSessionSummary,
  ResearchSource,
  ResearchThreadMessage,
} from "@personal-ai/shared";
import {
  createResearchSession,
  fetchResearchSession,
  fetchResearchSessions,
} from "../../src/api/client";
import { AssistantOrbAvatar } from "../../src/components/research/AssistantOrbAvatar";
import { NewsCard } from "../../src/components/research/NewsCard";
import { ResearchBriefingText } from "../../src/components/research/ResearchBriefingText";
import { ResearchHistorySheet } from "../../src/components/research/ResearchHistorySheet";
import { ResearchSourceChips } from "../../src/components/research/ResearchSourceChips";
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
      cards: ResearchNewsCard[];
      sourcesUsed: ResearchSource[];
    };

function apiMessagesToThread(messages: ResearchThreadMessage[]): ThreadMessage[] {
  return messages.map((m) =>
    m.role === "user"
      ? { id: m.id, role: "user", text: m.text, createdAt: m.createdAt }
      : {
          id: m.id,
          role: "assistant",
          text: m.text,
          createdAt: m.createdAt,
          cards: m.cards,
          sourcesUsed: m.sourcesUsed ?? [],
        },
  );
}

export default function ResearchScreen() {
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySessions, setHistorySessions] = useState<ResearchSessionSummary[]>([]);

  const startNewChat = useCallback(() => {
    setActiveThreadId(null);
    setMessages([]);
    setDraft("");
    Keyboard.dismiss();
  }, []);

  const openHistory = useCallback(async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setError(false);
    try {
      const data = await fetchResearchSessions();
      setHistorySessions(data.sessions);
    } catch {
      setHistorySessions([]);
      setError(true);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadSession = useCallback(async (id: string) => {
    setHistoryOpen(false);
    setLoading(true);
    setError(false);
    try {
      const session = await fetchResearchSession(id);
      setActiveThreadId(session.id);
      setMessages(apiMessagesToThread(session.messages));
    } catch {
      Alert.alert("Could not load session", "Check that the server is running and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => startNewChat()}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="New chat"
          >
            <Text style={styles.headerBtnText}>New chat</Text>
          </Pressable>
          <Pressable
            onPress={() => void openHistory()}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Research history"
          >
            <Text style={styles.headerBtnText}>History</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, openHistory, startNewChat]);

  useEffect(() => subscribeDailyDataCleared(() => startNewChat()), [startNewChat]);

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
      const session = await createResearchSession(prompt, activeThreadId ?? undefined);
      setActiveThreadId(session.id);
      setMessages(apiMessagesToThread(session.messages));
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
                Type a question or news angle below. I&apos;ll reply with a bullet-point briefing
                (key facts, what to watch, context) plus optional headline cards. Use History to
                reopen past threads.
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
                      <ResearchBriefingText text={msg.text} />
                      <ResearchSourceChips sources={msg.sourcesUsed} />
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

      <ResearchHistorySheet
        visible={historyOpen}
        loading={historyLoading}
        sessions={historySessions}
        onClose={() => setHistoryOpen(false)}
        onSelect={(id) => void loadSession(id)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginRight: spacing.xs,
  },
  headerBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  headerBtnPressed: {
    opacity: 0.7,
  },
  headerBtnText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 15,
  },
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
