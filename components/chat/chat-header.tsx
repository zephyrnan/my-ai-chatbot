"use client";

import { PanelLeftIcon } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { LingJingLogo } from "./icons";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { state, toggleSidebar, isMobile } = useSidebar();

  if (state === "collapsed" && !isMobile) {
    return null;
  }

  return (
    <header className="sticky top-0 flex h-14 items-center gap-2 border-b border-sidebar-border/60 bg-sidebar/85 px-3 backdrop-blur-xl">
      <Button
        className="md:hidden"
        onClick={toggleSidebar}
        size="icon-sm"
        variant="ghost"
      >
        <PanelLeftIcon className="size-4" />
      </Button>

      <Link
        className="flex size-8 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/90 to-cyan-300 text-primary-foreground shadow-[var(--shadow-card)] md:hidden"
        href="/"
      >
        <LingJingLogo size={14} />
      </Link>

      <div className="hidden items-center gap-3 md:flex">
        <div className="flex size-8 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/90 to-cyan-300 text-primary-foreground shadow-[var(--shadow-card)]">
          <LingJingLogo size={14} />
        </div>
        <div className="leading-tight">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/55">
            {"\u7075\u5883"}
          </div>
          <div className="text-[13px] text-sidebar-foreground/80">
            Dark AI workspace
          </div>
        </div>
      </div>

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
        />
      )}

      <div className="ml-auto hidden rounded-full border border-sidebar-border/70 bg-background/75 px-3 py-1.5 text-[12px] text-sidebar-foreground/70 shadow-[var(--shadow-card)] md:flex">
        Local models + DashScope
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
