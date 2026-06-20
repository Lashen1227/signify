import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquareText, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TranscriptEntry } from "@/types/transcript";

type Props = {
  entries: TranscriptEntry[];
  processing: boolean;
};

const fmt = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function TranscriptPanel({ entries, processing }: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length, processing]);

  return (
    <Card className="flex h-[420px] flex-col p-0 shadow-soft">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold tracking-tight">Converted Script</span>
        </div>
        <span className="text-[11px] text-muted-foreground">{entries.length} entries</span>
      </div>

      <ScrollArea className="flex-1 px-5 py-4">
        {entries.length === 0 && !processing ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Waiting for signs…</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Start the conversation and recognized phrases will appear here in real time.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {entries.map((e) => (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="group rounded-lg border border-border/60 bg-background/60 px-3 py-2.5"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">[{fmt(e.timestamp)}]</span>
                    <span className="text-[10px] font-medium text-success">
                      {(e.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm leading-snug text-foreground">{e.text}</p>
                </motion.li>
              ))}
              {processing && (
                <motion.li
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"
                >
                  <span className="inline-flex gap-0.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                  </span>
                  Translating sign…
                </motion.li>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </ul>
        )}
      </ScrollArea>
    </Card>
  );
}
