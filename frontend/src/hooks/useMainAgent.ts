import { useMainAgentStore } from "@/stores/mainAgentStore";
import { useTranslation } from "@/hooks/useTranslation";
import { AGENT_BRANDS, type AgentBrand } from "@/utils/agentBrand";

/** Name, colour and icon of the main agent for the session on screen. */
export function useMainAgent(): AgentBrand & { name: string } {
  const { t } = useTranslation();
  const brand = AGENT_BRANDS[useMainAgentStore((s) => s.source)];
  return { ...brand, name: brand.name ?? t("stalker.claude") };
}
