/**
 * Office slice (ARC-005).
 *
 * Session/scalar office state: desks, elevator, phone, compaction animation
 * phase, todos, git status, event log, conversation. Self-contained apart
 * from the @/types shapes it carries.
 */
import type { StateCreator } from "zustand";
import type { GameStore } from "../gameStore";
import type {
  ElevatorState,
  PhoneState,
  TodoItem,
  GitStatus,
  WebSocketMessage,
  ConversationEntry,
  EventDetail,
  EventType,
  HistoryEntry,
} from "@/types";
import type { EventLogEntry, CompactionAnimationPhase } from "./types";
import { MIN_DESK_COUNT } from "@/constants/positions";
import { parseServerTime } from "@/utils/serverTime";

const MAX_EVENT_LOG = 500;

export type OfficeSlice = {
  sessionId: string;
  deskCount: number;
  elevatorState: ElevatorState;
  phoneState: PhoneState;
  contextUtilization: number;
  toolUsesSinceCompaction: number;
  isCompacting: boolean;
  compactionPhase: CompactionAnimationPhase;
  printReport: boolean;
  todos: TodoItem[];
  gitStatus: GitStatus | null;
  eventLog: EventLogEntry[];
  conversation: ConversationEntry[];
  activityZone: string | null;
  activityZoneLabel: string | null;
  serverRackPulse: boolean;

  setSessionId: (id: string) => void;
  setElevatorState: (state: ElevatorState) => void;
  setPhoneState: (state: PhoneState) => void;
  setDeskCount: (count: number) => void;
  setContextUtilization: (utilization: number) => void;
  setToolUsesSinceCompaction: (count: number) => void;
  triggerCompaction: () => void;
  setCompactionPhase: (phase: CompactionAnimationPhase) => void;
  setIsCompacting: (isCompacting: boolean) => void;
  setTodos: (todos: TodoItem[]) => void;
  setPrintReport: (printReport: boolean) => void;
  setGitStatus: (status: GitStatus | null) => void;
  addEventLog: (event: NonNullable<WebSocketMessage["event"]>) => void;
  /** Fill an empty log from the state snapshot's recent history. */
  seedEventLog: (history: HistoryEntry[]) => void;
  setConversation: (conversation: ConversationEntry[]) => void;
  setCowboyOfficeActivity: (payload: {
    activityZone: string | null;
    activityZoneLabel: string | null;
    serverRackPulse: boolean;
  }) => void;
};

export const initialOfficeState = {
  sessionId: "None",
  deskCount: MIN_DESK_COUNT,
  elevatorState: "closed" as ElevatorState,
  phoneState: "idle" as PhoneState,
  contextUtilization: 0.0,
  toolUsesSinceCompaction: 0,
  isCompacting: false,
  compactionPhase: "idle" as CompactionAnimationPhase,
  printReport: false,
  todos: [] as TodoItem[],
  gitStatus: null as GitStatus | null,
  eventLog: [] as EventLogEntry[],
  conversation: [] as ConversationEntry[],
  activityZone: null as string | null,
  activityZoneLabel: null as string | null,
  serverRackPulse: false,
};

export const createOfficeSlice: StateCreator<GameStore, [], [], OfficeSlice> = (
  set,
) => ({
  ...initialOfficeState,

  setSessionId: (id) => set({ sessionId: id }),
  setElevatorState: (elevatorState) => set({ elevatorState }),
  setPhoneState: (phoneState) => set({ phoneState }),
  setDeskCount: (deskCount) => set({ deskCount }),
  setContextUtilization: (contextUtilization) =>
    // Only update context utilization - don't reset compaction state
    // The compaction animation system controls when compaction ends via setCompactionPhase
    set({ contextUtilization }),
  setToolUsesSinceCompaction: (toolUsesSinceCompaction) =>
    set({ toolUsesSinceCompaction }),
  triggerCompaction: () => {
    // Start compaction animation - boss will walk to trash can and jump on it
    set({
      isCompacting: true,
      toolUsesSinceCompaction: 0,
      compactionPhase: "walking_to_trash",
    });
  },
  setCompactionPhase: (compactionPhase) => set({ compactionPhase }),
  setIsCompacting: (isCompacting) => set({ isCompacting }),
  setTodos: (todos) => set({ todos }),
  setPrintReport: (printReport) => set({ printReport }),
  setGitStatus: (gitStatus) => set({ gitStatus }),

  addEventLog: (event) =>
    set((state) => {
      const timestamp = parseServerTime(event.timestamp);
      const entry: EventLogEntry = { ...event, timestamp };
      return {
        eventLog: [entry, ...state.eventLog.slice(0, MAX_EVENT_LOG - 1)],
      };
    }),

  seedEventLog: (history) =>
    set((state) => {
      // Live events already arrived for this session — don't clobber them.
      if (state.eventLog.length > 0 || history.length === 0) {
        return {};
      }
      const entries: EventLogEntry[] = history
        .map((h) => ({
          id: h.id,
          type: h.type as EventType,
          agentId: h.agentId,
          summary: h.summary,
          detail: h.detail as EventDetail,
          timestamp: parseServerTime(h.timestamp),
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, MAX_EVENT_LOG);
      return { eventLog: entries };
    }),

  setConversation: (conversation) => set({ conversation }),

  setCowboyOfficeActivity: (payload) =>
    set({
      activityZone: payload.activityZone,
      activityZoneLabel: payload.activityZoneLabel,
      serverRackPulse: payload.serverRackPulse,
    }),
});
