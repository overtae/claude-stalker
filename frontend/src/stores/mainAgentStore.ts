import { create } from "zustand";
import type { AgentSource } from "@/utils/agentBrand";

interface MainAgentState {
  /** Which coding agent drives the session on screen. */
  source: AgentSource;
  setSource: (source: AgentSource) => void;
}

/**
 * Set by the shell when the selected session changes; read anywhere the main
 * agent is named or drawn (including inside the Pixi tree, where React
 * context from the DOM tree isn't available).
 */
export const useMainAgentStore = create<MainAgentState>()((set) => ({
  source: "claude",
  setSource: (source) => set({ source }),
}));
