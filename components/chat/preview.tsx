"use client";

import { useRouter } from "next/navigation";
import { suggestions } from "@/lib/constants";
import { LingJingLogo } from "./icons";

export function Preview() {
  const router = useRouter();

  const handleAction = (query?: string) => {
    const url = query ? `/?query=${encodeURIComponent(query)}` : "/";
    router.push(url);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-tl-[2rem] bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/30 px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/90 to-cyan-300 text-primary-foreground shadow-[var(--shadow-glow)]">
            <LingJingLogo size={16} />
          </div>
          <div className="space-y-0.5">
            <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
              {"\u7075\u5883"}
            </div>
            <span className="text-[13px] text-muted-foreground">
              Minimal AI workspace
            </span>
          </div>
        </div>
        <div className="rounded-full border border-border/40 bg-card/70 px-3 py-1 text-[11px] text-muted-foreground shadow-[var(--shadow-card)]">
          Hybrid model routing
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-8 px-8">
        <div className="absolute inset-x-10 top-12 h-36 rounded-full bg-gradient-to-r from-primary/14 via-cyan-400/10 to-violet-400/10 blur-3xl" />

        <div className="relative text-center">
          <div className="mb-4 inline-flex rounded-full border border-border/40 bg-card/75 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground shadow-[var(--shadow-card)]">
            Private orchestration
          </div>
          <h2 className="bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
            Quiet interface. Sharp output.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            A focused surface for code, reasoning, documents, image analysis,
            and multi-model workflows.
          </p>
        </div>

        <div className="grid w-full max-w-lg grid-cols-2 gap-3">
          {suggestions.map((suggestion) => (
            <button
              className="group rounded-2xl border border-border/35 bg-card/65 px-4 py-3 text-left text-[12px] leading-6 text-muted-foreground/85 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:bg-card hover:text-foreground hover:shadow-[var(--shadow-float)]"
              key={suggestion}
              onClick={() => handleAction(suggestion)}
              type="button"
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/75">
                Quick start
              </span>
              <span className="mt-1 block">{suggestion}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-6 pb-6">
        <button
          className="flex w-full items-center rounded-[1.4rem] border border-border/35 bg-card/75 px-4 py-3.5 text-left text-[13px] text-muted-foreground/55 shadow-[var(--shadow-card)] transition-all duration-200 hover:border-primary/25 hover:text-muted-foreground/80 hover:shadow-[var(--shadow-float)]"
          onClick={() => handleAction()}
          type="button"
        >
          Start with a prompt, file, or design direction...
        </button>
      </div>
    </div>
  );
}
