import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Hand, Languages, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/Navbar";
import { Dashboard } from "@/components/Dashboard";
import { CommandPalette } from "@/components/CommandPalette";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Signify" },
      {
        name: "description",
        content:
          "Signify converts sign language into natural language in real time using AI-powered recognition. Export transcripts as PDF or TXT.",
      },
      { property: "og:title", content: "Signify" },
      {
        property: "og:description",
        content: "Convert sign language into natural language in real time using AI-powered recognition.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [started, setStarted] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-background">
      <Navbar onOpenPalette={() => setPaletteOpen(true)} />
      <main>
        {started ? (
          <Dashboard onExit={() => setStarted(false)} />
        ) : (
          <Landing onStart={() => setStarted(true)} />
        )}
      </main>
      <Toaster richColors position="top-right" />
      {!started && (
        <CommandPalette
          open={paletteOpen}
          setOpen={setPaletteOpen}
          actions={[
            {
              id: "start-cta",
              group: "Session",
              label: "Start conversion",
              icon: Hand,
              onSelect: () => setStarted(true),
            },
          ]}
        />
      )}
    </div>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  const features = [
    {
      icon: Zap,
      title: "Real-time recognition",
      body: "AI-powered detection translates signs the moment they happen.",
    },
    {
      icon: Languages,
      title: "Multilingual output",
      body: "Convert to English, Sinhala, Tamil, French, German, Spanish and more.",
    },
    {
      icon: Sparkles,
      title: "Polished exports",
      body: "Download timestamped PDF transcripts ready for sharing.",
    },
  ];

  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Powered by on-device AI
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl"
      >
        Sign Language <span className="text-primary">Converter</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg"
      >
        Convert sign language into natural language in real time using AI-powered recognition.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.18 }}
        className="mt-8 flex flex-wrap items-center justify-center gap-3"
      >
        <Button size="lg" onClick={onStart} className="h-12 gap-2 px-6 text-base shadow-glow">
          Start Conversion
          <ArrowRight className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">
          Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-medium">⌘K</kbd> for commands
        </span>
      </motion.div>

      <div className="mt-20 grid w-full gap-4 sm:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 + i * 0.07 }}
            className="rounded-xl border border-border bg-card p-5 text-left shadow-soft"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <f.icon className="h-4 w-4" />
            </div>
            <h3 className="mt-3 text-sm font-semibold tracking-tight">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
