"use client";

import type { ReactNode } from "react";
import type { Session } from "@/hooks/useSessions";
import { StalkerPeoplePanel } from "@/components/stalker/StalkerPeoplePanel";
import { StalkerInfoTabs } from "@/components/stalker/StalkerInfoTabs";
import { StalkerZoneLegend } from "@/components/stalker/StalkerZoneLegend";
import { StalkerSessionCard } from "@/components/stalker/StalkerSessionCard";

export interface StalkerRightRailProps {
  session: Session | null;
  onOpenSettings: () => void;
}

export function StalkerRightRail({
  session,
  onOpenSettings,
}: StalkerRightRailProps): ReactNode {
  return (
    <aside className="hidden h-full w-[300px] shrink-0 flex-col gap-2.5 md:flex">
      <StalkerSessionCard session={session} onOpenSettings={onOpenSettings} />
      <div className="flex min-h-0 flex-[3] flex-col">
        <StalkerPeoplePanel />
      </div>
      <div className="flex min-h-0 flex-[4] flex-col">
        <StalkerInfoTabs />
      </div>
      <StalkerZoneLegend />
    </aside>
  );
}
