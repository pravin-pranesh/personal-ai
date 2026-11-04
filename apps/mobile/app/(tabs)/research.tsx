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
import {
  createResearchSession,
  deleteResearchSession,
  exportResearchSessionLocal,
  fetchResearchSessions,
} from "../../src/api/client";
import { isPhoneLocalMode } from "../../src/config/api";
import { AssistantOrbAvatar } from "../../src/components/research/AssistantOrbAvatar";
import { NewsCard } from "../../src/components/research/NewsCard";
import { ResearchBriefing } from "../../src/components/research/ResearchBriefing";
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
      briefingMarkdown?: string;
    };

function sessionToMessages(session: ResearchSession): ThreadMessage[] {
  return [
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
      briefingMarkdown: session.briefingMarkdown,
    },
  ];
}

export default function ResearchScreen() {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [history, setHistory] = useState<ResearchSession[]>([]);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchResearchSessions();
      setHistory(data.sessions);
    } catch {
      setError(true);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => subscribeDailyDataCleared(() => void loadHistory()), [loadHistory]);

  useEffect(() => {
    if (!loading && view === "chat") {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, submitting, loading, view]);

  const onNewChat = () => {
    setView("chat");
    setMessages([]);
    setDraft("");
  };

  const openSession = (session: ResearchSession) => {
    setView("chat");
    setMessages(sessionToMessages(session));
  };

  const onExportSession = async (session: ResearchSession) => {
    try {
      await exportResearchSessionLocal(session);
    } catch (err) {
      Alert.alert("Export failed", err instanceof Error ? err.message : "Try again.");
    }
  };

  const onDeleteSession = (session: ResearchSession) => {
    Alert.alert("Delete briefing?", session.prompt, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteResearchSession(session.id)
            .then(() => {
              setHistory((prev) => prev.filter((s) => s.id !== session.id));
              setMessages((prev) =>
                prev.some((m) => m.id.startsWith(session.id)) ? [] : prev,
              );
            })
            .catch(() => Alert.alert("Delete failed", "Try again when online."));
        },
      },
    ]);
  };

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
    setView("chat");

    try {
      const session = await createResearchSession(prompt);
      setMessages(sessionToMessages(session));
      void loadHistory();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== pendingUser.id));
      setDraft(prompt);
      Alert.alert("Research failed", "Check that the server is running and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const emptyChat = !loading && view === "chat" && messages.length === 0;
  const emptyHistory = !loading && view === "history" && history.length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <View style={styles.flex}>
        <View style={styles.toolbar}>
          <Pressable onPress={onNewChat} style={styles.toolbarBtn}>
            <Text style={styles.toolbarBtnText}>New chat</Text>
          </Pressable>
          <Pressable
            onPress={() => setView(view === "history" ? "chat" : "history")}
            style={[styles.toolbarBtn, view === "history" && styles.toolbarBtnActive]}
          >
            <Text
              style={[
                styles.toolbarBtnText,
                view === "history" && styles.toolbarBtnTextActive,
              ]}
            >
              History
            </Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.bannerWrap}>
            <OfflineBanner />
          </View>
        ) : null}

        {view === "history" ? (
          <ScrollView style={styles.thread} contentContainerStyle={styles.threadContent}>
            {loading ? (
              <Text style={typography.caption}>Loading history…</Text>
            ) : emptyHistory ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No history yet</Text>
                <Text style={styles.emptyHint}>
                  Start a new chat — history is kept per Settings retention (default 30 days or
                  forever).
                </Text>
              </View>
            ) : (
              history.map((s) => (
                <View key={s.id} style={styles.historyRow}>
                  <Pressable style={styles.historyMain} onPress={() => openSession(s)}>
                    <Text style={styles.historyPrompt} numberOfLines={2}>
                      {s.prompt}
                    </Text>
                    <Text style={typography.caption}>
                      {new Date(s.createdAt).toLocaleString()}
                    </Text>
                  </Pressable>
                  <View style={styles.historyActions}>
                    {isPhoneLocalMode() ? (
                      <Pressable
                        onPress={() => void onExportSession(s)}
                        accessibilityLabel="Export session"
                      >
                        <Text style={styles.historyExport}>Export</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => onDeleteSession(s)}
                      accessibilityLabel="Delete session"
                    >
                      <Text style={styles.historyDelete}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.thread}
            contentContainerStyle={[
              styles.threadContent,
              emptyChat && styles.threadContentEmpty,
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <View style={styles.emptyState}>
                <AssistantOrbAvatar size={48} active />
                <Text style={styles.emptyTitle}>Loading…</Text>
              </View>
            ) : emptyChat ? (
              <View style={styles.emptyState}>
                <AssistantOrbAvatar size={56} />
                <Text style={styles.emptyTitle}>Ask about any topic</Text>
                <Text style={styles.emptyHint}>
                  Gemini, Kimi, or free Wikipedia + BBC RSS when keys are off. Use History for
                  past briefings (auto-deleted after 7 days).
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
                      {msg.briefingMarkdown ? (
                        <View style={styles.assistantBubble}>
                          <ResearchBriefing markdown={msg.briefingMarkdown} />
                        </View>
                      ) : null}
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
        )}

        {view === "chat" ? (
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
              >
                <Text style={styles.sendLabel}>{submitting ? "…" : "Send"}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  toolbar: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  toolbarBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolbarBtnActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  toolbarBtnText: { fontWeight: "600", color: colors.textSecondary, fontSize: 14 },
  toolbarBtnTextActive: { color: colors.primary },
  bannerWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  thread: { flex: 1 },
  threadContent: { padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.md },
  threadContentEmpty: { flexGrow: 1, justifyContent: "center" },
  emptyState: { alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyTitle: { ...typography.subtitle, textAlign: "center", marginTop: spacing.sm },
  emptyHint: {
    ...typography.caption,
    textAlign: "center",
    color: colors.textSecondary,
    lineHeight: 20,
    maxWidth: 420,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  historyMain: { flex: 1, gap: 4 },
  historyPrompt: { ...typography.body, fontWeight: "600" },
  historyActions: { alignItems: "flex-end", gap: 8 },
  historyExport: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  historyDelete: { color: colors.danger, fontWeight: "700", fontSize: 14 },
  userRow: { flexDirection: "row", justifyContent: "flex-end" },
  userBubble: {
    maxWidth: "85%",
    backgroundColor: colors.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userText: { ...typography.body, color: "#FFFFFF" },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    maxWidth: "100%",
  },
  assistantCol: { flex: 1, gap: spacing.sm, maxWidth: "92%" },
  assistantBubble: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assistantText: { ...typography.body, color: colors.text, lineHeight: 22 },
  cardStack: { gap: spacing.sm },
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnPressed: { opacity: 0.88 },
  sendLabel: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});
