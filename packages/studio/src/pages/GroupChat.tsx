import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "../store/project.js";
import { apiGet, apiPost, BASE_URL, streamSsePost } from "../api/client.js";
import type {
  PersonaCard,
  CharactersResponse,
  GroupChatSession,
  TokenUsage,
  SSEEvent,
} from "./group-chat/types.js";
import SetupView from "./group-chat/SetupView.tsx";
import SessionView from "./group-chat/SessionView.tsx";
import type { GroupChatEnhSettings } from "./group-chat/SessionView.tsx";
import type { JSX } from "react";

export default function GroupChat(): JSX.Element {
  const currentProject = useProjectStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  const [characters, setCharacters] = useState<PersonaCard[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<"fixed" | "round-robin" | "random">("fixed");
  const [turnInterval, setTurnInterval] = useState(1);
  const [scenario, setScenario] = useState("");
  const [session, setSession] = useState<GroupChatSession | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [streamingMember, setStreamingMember] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  // 群聊增强设置 (speaking order / emotions / narrator)
  const [settings, setSettings] = useState<GroupChatEnhSettings>({
    showSpeakingOrder: true,
    showEmotions: true,
    narratorEnabled: true,
  });
  // Member id the user clicked to force as the next speaker (null = natural order)
  const [forcedSpeakerId, setForcedSpeakerId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isNearBottomRef = useRef(true);

  // Load character list
  useEffect(() => {
    if (!projectId) {
      setCharacters([]);
      return;
    }
    apiGet<CharactersResponse>(`/projects/${projectId}/characters`)
      .then((d) => setCharacters(d.characters ?? []))
      .catch((e) => {
        setCharacters([]);
        setError(e instanceof Error ? e.message : String(e));
      });
  }, [projectId]);

  // Track scroll position to avoid interrupting reading.
  // Depends on session because SessionView (which owns scrollRef) only renders
  // once a session exists — with [] the ref is null on first mount and the
  // listener would never be registered.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = (): void => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      isNearBottomRef.current = distFromBottom < 100;
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [session]);

  // Auto-scroll on new messages (only when near bottom)
  useEffect(() => {
    if (scrollRef.current && isNearBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages, streamingContent]);

  // Abort streaming on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const toggleMember = (filename: string): void => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  };

  const handleStart = async (): Promise<void> => {
    if (!projectId || selectedMembers.size === 0) return;
    setError(null);
    setUsage(null);
    try {
      const result = await apiPost<GroupChatSession>(
        `/projects/${projectId}/group-chat/start`,
        {
          memberIds: Array.from(selectedMembers),
          order,
          turnInterval,
          scenario,
        },
      );
      setSession(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleAddUserMessage = async (content: string): Promise<void> => {
    if (!projectId || !session || !content.trim()) return;
    setError(null);
    try {
      const result = await apiPost<GroupChatSession>(
        `/projects/${projectId}/group-chat/${session.id}/message`,
        { content: content.trim() },
      );
      setSession(result);
      setUserInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleStop = (): void => {
    abortRef.current?.abort();
  };

  const handleNext = async (): Promise<void> => {
    if (!projectId || !session || generating) return;
    setGenerating(true);
    setError(null);
    setUsage(null);
    setStreamingContent("");
    // Set streaming member based on the next speaker. Honour a forced speaker
    // chosen via the speaking-order bar when present.
    const members = session.config.memberIds;
    const nextSpeakerId = forcedSpeakerId ?? members[session.currentTurnIndex % members.length] ?? null;
    setStreamingMember(nextSpeakerId);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let accumulated = "";

      await streamSsePost<SSEEvent>(
        `${BASE_URL}/projects/${projectId}/group-chat/${session.id}/next`,
        forcedSpeakerId ? { forceSpeakerId: forcedSpeakerId } : {},
        (evt: SSEEvent) => {
          if (evt.type === "delta") {
            accumulated += evt.content;
            setStreamingContent(accumulated);
          } else if (evt.type === "done") {
            setSession(evt.session);
            if (evt.usage) setUsage(evt.usage);
            setStreamingContent("");
            setStreamingMember(null);
            // A forced turn has been consumed — return to natural ordering.
            setForcedSpeakerId(null);
          } else if (evt.type === "error") {
            setError(evt.error);
          }
        },
        controller.signal,
      );
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // User cancelled — keep partial content, no error
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setGenerating(false);
      setStreamingContent("");
      setStreamingMember(null);
      abortRef.current = null;
    }
  };

  if (!projectId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-light">群聊</h1>
        <p className="mt-6 text-gray-500">请先在仪表盘选择一个项目</p>
      </div>
    );
  }

  // --- Setup view (no active session) ---
  if (!session) {
    return (
      <SetupView
        characters={characters}
        selectedMembers={selectedMembers}
        order={order}
        turnInterval={turnInterval}
        scenario={scenario}
        error={error}
        onToggleMember={toggleMember}
        onOrderChange={setOrder}
        onTurnIntervalChange={setTurnInterval}
        onScenarioChange={setScenario}
        onStart={() => void handleStart()}
      />
    );
  }

  // --- Active session view ---
  return (
    <SessionView
      session={session}
      streamingContent={streamingContent}
      streamingMember={streamingMember}
      generating={generating}
      userInput={userInput}
      error={error}
      usage={usage}
      scrollRef={scrollRef}
      onUserInputChange={setUserInput}
      onAddUserMessage={(content) => void handleAddUserMessage(content)}
      onNext={() => void handleNext()}
      onStop={handleStop}
      characters={characters}
      settings={settings}
      onSettingsChange={setSettings}
      forcedSpeakerId={forcedSpeakerId}
      onForceSpeaker={setForcedSpeakerId}
    />
  );
}
