import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { LingJingLogo } from "@/components/chat/icons";
import { Preview } from "@/components/chat/preview";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh w-screen bg-sidebar">
      <div className="flex w-full flex-col bg-background/90 p-8 backdrop-blur-xl xl:w-[600px] xl:shrink-0 xl:rounded-r-[2rem] xl:border-r xl:border-border/40 md:p-16">
        <Link
          className="flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          href="/"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-10">
          <div className="flex flex-col gap-2">
            <div className="mb-3 inline-flex w-fit items-center gap-3 rounded-full border border-border/40 bg-card/75 px-3 py-2 shadow-[var(--shadow-card)]">
              <div className="flex size-9 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/90 to-cyan-300 text-primary-foreground shadow-[var(--shadow-glow)]">
                <LingJingLogo size={16} />
              </div>
              <div className="leading-tight">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/65">
                  {"\u7075\u5883"}
                </div>
                <div className="text-[13px] text-foreground/80">
                  Minimal AI workspace
                </div>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>

      <div className="hidden flex-1 flex-col overflow-hidden pl-12 xl:flex">
        <div className="flex items-center gap-2 pt-8 text-[13px] text-muted-foreground/60">
          <div className="h-2 w-2 rounded-full bg-primary shadow-[var(--shadow-glow)]" />
          Sign in to sync chats, model preferences, and workspace history
        </div>
        <div className="flex-1 pt-4">
          <Preview />
        </div>
      </div>
    </div>
  );
}
