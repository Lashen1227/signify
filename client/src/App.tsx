import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Languages, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/Navbar";
import { Dashboard } from "@/components/Dashboard";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { useAuth } from "@/providers/AuthProvider";
import { useApiKey } from "@/hooks/useApiKey";

export function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [view, setView] = useState<"landing" | "dashboard">("landing");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const apiKeyState = useApiKey();

  useEffect(() => {
    if (isAuthenticated) setView("dashboard");
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <Navbar
        onLogoClick={() => setView("landing")}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main>
        {isAuthenticated && view === "dashboard" ? (
          <Dashboard
            onExit={() => setView("landing")}
            apiKeyState={apiKeyState}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        ) : (
          <Landing onStart={() => setView("dashboard")} />
        )}
      </main>
      <ApiKeyDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        isConfigured={apiKeyState.isConfigured}
        isValid={apiKeyState.isValid}
        isValidating={apiKeyState.isValidating}
        onSave={apiKeyState.saveKey}
        onRemove={apiKeyState.removeKey}
      />
      <Toaster richColors position="top-right" />
    </div>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  const { isAuthenticated, signIn } = useAuth();

  const features = [
    {
      icon: Zap,
      title: "Real-time recognition",
      body: "AI-powered detection translates signs the moment they happen.",
    },
    {
      icon: Languages,
      title: "Multilingual output",
      body: "Convert into languages spoken across the world.",
    },
    {
      icon: Sparkles,
      title: "Polished exports",
      body: "Download timestamped transcripts ready for sharing.",
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
        Powered by Gemini
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
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
        <Button size="lg" onClick={() => (isAuthenticated ? onStart() : signIn())} className="h-12 gap-2 px-6 text-base shadow-glow">
          {isAuthenticated ? "Go to Dashboard" : "Sign In to Start"}
          <ArrowRight className="h-4 w-4" />
        </Button>
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
