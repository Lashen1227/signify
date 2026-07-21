import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  Clock,
  Copy,
  Download,
  FileText,
  Hand,
  Key,
  Pause,
  Play,
  Settings,
  Square,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CameraFeed } from "@/components/CameraFeed";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { CommandPalette, PaletteIcons } from "@/components/CommandPalette";
import { useCamera } from "@/hooks/useCamera";
import { useConversationSession } from "@/hooks/useConversationSession";
import {
  copyTranscript,
  downloadPdf,
  downloadText,
  formatDuration,
} from "@/services/exportService";
import { LANGUAGES } from "@/types/transcript";

const API_KEY_ALERT_SHOWN_KEY = "signify:api-key-alert-shown";

type ApiKeyState = {
  apiKey: string | null;
  isConfigured: boolean;
  isValid: boolean | null;
  isValidating: boolean;
  saveKey: (key: string) => Promise<boolean>;
  removeKey: () => void;
  validate: (key?: string) => Promise<boolean>;
};

type Props = {
  onExit: () => void;
  onOpenSettings: () => void;
  apiKeyState: ApiKeyState;
};

export function Dashboard({ onExit, onOpenSettings, apiKeyState }: Props) {
  const [language, setLanguage] = useState("en");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraPrompt, setCameraPrompt] = useState<string | null>(null);
  const previousMotionFrameRef = useRef<Uint8ClampedArray | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showApiKeyAlert, setShowApiKeyAlert] = useState(false);

  useEffect(() => {
    if (!apiKeyState.isConfigured) {
      try {
        const alreadyShown = localStorage.getItem(API_KEY_ALERT_SHOWN_KEY);
        if (!alreadyShown) {
          setShowApiKeyAlert(true);
        }
      } catch {
        setShowApiKeyAlert(true);
      }
    }
  }, [apiKeyState.isConfigured]);

  const dismissApiKeyAlert = useCallback(() => {
    setShowApiKeyAlert(false);
    try {
      localStorage.setItem(API_KEY_ALERT_SHOWN_KEY, "1");
    } catch {
      // Ignore
    }
  }, []);

  const {
    videoRef,
    devices,
    deviceId,
    enabled: cameraEnabled,
    error: cameraError,
    enable: enableCamera,
    disable: disableCamera,
    switchDevice,
  } = useCamera();

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraEnabled) return null;

    const motion = measureMotion(video, previousMotionFrameRef);
    if (motion < 10) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  }, [videoRef, cameraEnabled]);

  const t = useConversationSession(language, captureFrame, apiKeyState.apiKey);
  const langLabel = useMemo(
    () => LANGUAGES.find((l) => l.code === language)?.label ?? language,
    [language],
  );
  const isQuotaWarning = useMemo(() => isQuotaError(t.error), [t.error]);

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    countdownTimerRef.current = null;
    setCountdown(null);
  }, []);

  const handleDisableCamera = useCallback(async () => {
    clearCountdown();
    setCameraPrompt("Camera disabled. Re-enable it to continue translation.");

    if (t.status === "recording") {
      try {
        await t.pause();
        toast.info("Translation paused", { description: "The camera was turned off." });
      } catch {
        toast.error("Could not pause translation", {
          description: "The camera was turned off, but the session did not pause automatically.",
        });
      }
    }

    disableCamera();
  }, [clearCountdown, disableCamera, t]);

  const handleResume = useCallback(async () => {
    if (!cameraEnabled) {
      setCameraPrompt(null);
      const enabledNow = await enableCamera(deviceId);
      if (!enabledNow) {
        toast.error("Camera is off", {
          description: "Enable the camera before resuming translation.",
        });
        return;
      }
    }

    setCameraPrompt(null);
    await t.resume();
  }, [cameraEnabled, deviceId, enableCamera, t]);

  const startWithCountdown = useCallback(() => {
    if (!cameraEnabled) {
      setCameraPrompt(
        "Enable the camera first, then press Start to begin sign language detection.",
      );
      toast.error("Camera is off", {
        description: "Enable the camera to start sign language detection.",
      });
      return;
    }

    if (t.status !== "idle" || countdown !== null) return;

    setCameraPrompt(null);
    previousMotionFrameRef.current = null;
    setCountdown(3);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((current) => {
        if (current == null) {
          clearCountdown();
          return null;
        }

        if (current <= 1) {
          clearCountdown();
          void t.start();
          return null;
        }

        return current - 1;
      });
    }, 1000);
  }, [clearCountdown, countdown, t]);

  useEffect(() => {
    return () => clearCountdown();
  }, [clearCountdown]);

  useEffect(() => {
    if (cameraEnabled) {
      setCameraPrompt(null);
    }
  }, [cameraEnabled]);

  const handleStop = async () => {
    clearCountdown();
    const session = await t.stop();
    if (session) {
      toast.success("Session saved", {
        description: `${session.entries.length} entries captured.`,
      });
    }
  };

  const handleClear = async () => {
    clearCountdown();
    await t.clearTranscript();
    toast("Transcript cleared");
  };

  const actions = [
    {
      id: "start",
      group: "Session" as const,
      label: "Start session",
      icon: PaletteIcons.Play,
      onSelect: t.start,
    },
    {
      id: "pause",
      group: "Session" as const,
      label: t.status === "paused" ? "Resume session" : "Pause session",
      icon: t.status === "paused" ? PaletteIcons.Play : PaletteIcons.Pause,
      onSelect: t.status === "paused" ? handleResume : t.pause,
    },
    {
      id: "stop",
      group: "Session" as const,
      label: "Stop session",
      icon: PaletteIcons.Square,
      onSelect: handleStop,
    },
    {
      id: "clear",
      group: "Session" as const,
      label: "Clear transcript",
      icon: PaletteIcons.Trash2,
      onSelect: handleClear,
    },
    {
      id: "pdf",
      group: "Export" as const,
      label: "Download PDF",
      icon: PaletteIcons.Download,
      onSelect: () => {
        downloadPdf(t.entries, langLabel);
        toast.success("PDF downloaded");
      },
    },
    {
      id: "txt",
      group: "Export" as const,
      label: "Download TXT",
      icon: PaletteIcons.Download,
      onSelect: () => {
        downloadText(t.entries, langLabel);
        toast.success("TXT downloaded");
      },
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6"
    >
      {showApiKeyAlert && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <Key className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="flex-1">
            <p className="font-semibold">Set up your API key</p>
            <p className="mt-1 text-amber-100/80">
              To start translating sign language, add your own Google Gemini API key in the settings.
              This ensures you have full control over your API usage and quota.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  dismissApiKeyAlert();
                  onOpenSettings();
                }}
                className="h-8 gap-1.5 bg-amber-500 text-black hover:bg-amber-400"
              >
                <Settings className="h-3.5 w-3.5" /> Add API Key
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={dismissApiKeyAlert}
                className="h-8 text-amber-100/80 hover:text-amber-100"
              >
                Dismiss
              </Button>
            </div>
          </div>
          <button
            onClick={dismissApiKeyAlert}
            className="shrink-0 text-amber-100/60 hover:text-amber-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h5 className="text-2xl font-semibold tracking-tight">Conversation Dashboard</h5>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="gap-1.5"
          >
            <Settings className="h-3.5 w-3.5" /> API Key
          </Button>
          <Button variant="ghost" size="sm" onClick={onExit} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {isQuotaWarning && t.error ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <p className="font-semibold">API key issue</p>
              <p className="mt-1 text-amber-100/80">
                Translation is paused due to an API error. Your API key may be invalid or the
                quota may be exceeded. Check your key in API settings or try again later.
              </p>
            </div>
          ) : null}
          <CameraFeed
            recording={t.status === "recording"}
            processing={t.processing}
            countdown={countdown}
            cameraPrompt={cameraPrompt}
            videoRef={videoRef}
            devices={devices}
            deviceId={deviceId}
            enabled={cameraEnabled}
            error={cameraError}
            enable={enableCamera}
            disable={handleDisableCamera}
            switchDevice={switchDevice}
          />
          {t.error && !isQuotaWarning && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
              {t.error}
            </div>
          )}
          <SessionActionsBar
            status={t.status}
            starting={countdown !== null}
            onStart={startWithCountdown}
            onPause={t.pause}
            onResume={handleResume}
            onStop={handleStop}
            onClear={handleClear}
            hasEntries={t.entries.length > 0}
          />
          <StatsCards
            elapsedMs={t.elapsedMs}
            words={t.words}
            signs={t.signs}
            confidence={t.confidence}
          />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <LanguageSelector value={language} onChange={setLanguage} />
          </div>
          <TranscriptPanel entries={t.entries} processing={t.processing} />
          <ExportActions entries={t.entries} languageLabel={langLabel} />
        </div>
      </div>

      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} actions={actions} />
    </motion.section>
  );
}

function StatsCards({
  elapsedMs,
  words,
  signs,
  confidence,
}: {
  elapsedMs: number;
  words: number;
  signs: number;
  confidence: number;
}) {
  const items = [
    { icon: Clock, label: "Session Duration", value: formatDuration(elapsedMs) },
    { icon: Type, label: "Words Detected", value: words.toLocaleString() },
    { icon: Hand, label: "Signs Recognized", value: signs.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="p-4 shadow-soft">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{item.value}</p>
        </Card>
      ))}
      <Card className="p-4 shadow-soft">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          Confidence
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
          {(confidence * 100).toFixed(0)}
          <span className="text-base text-muted-foreground">%</span>
        </p>
        <Progress value={confidence * 100} className="mt-2 h-1.5" />
      </Card>
    </div>
  );
}

function ExportActions({
  entries,
  languageLabel,
}: {
  entries: Parameters<typeof copyTranscript>[0];
  languageLabel: string;
}) {
  const empty = entries.length === 0;

  const handlePdf = () => {
    downloadPdf(entries, languageLabel);
    toast.success("PDF downloaded");
  };

  const handleTxt = () => {
    downloadText(entries, languageLabel);
    toast.success("Transcript saved as .txt");
  };

  const handleCopy = async () => {
    try {
      await copyTranscript(entries);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <Card className="p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold tracking-tight">Export</h3>
      </div>
      <div className="flex flex-col gap-2">
        <Button onClick={handlePdf} disabled={empty} className="justify-start gap-2">
          <Download className="h-4 w-4" /> Download PDF
        </Button>
        <Button
          onClick={handleTxt}
          variant="outline"
          disabled={empty}
          className="justify-start gap-2"
        >
          <Download className="h-4 w-4" /> Download TXT
        </Button>
        <Button
          onClick={handleCopy}
          variant="ghost"
          disabled={empty}
          className="justify-start gap-2"
        >
          <Copy className="h-4 w-4" /> Copy transcript
        </Button>
      </div>
      {empty && (
        <p className="mt-3 text-xs text-muted-foreground">
          No entries yet - start a session to enable exports.
        </p>
      )}
    </Card>
  );
}

function SessionActionsBar({
  status,
  starting,
  onStart,
  onPause,
  onResume,
  onStop,
  onClear,
  hasEntries,
}: {
  status: "idle" | "recording" | "paused" | "stopped";
  starting: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onClear: () => void;
  hasEntries: boolean;
}) {
  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isActive = isRecording || isPaused;

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {!isActive ? (
          <Button size="lg" onClick={onStart} disabled={starting} className="h-10 gap-2 px-5">
            <Play className="h-4 w-4" />
            {starting ? "Starting..." : "Start"}
          </Button>
        ) : isRecording ? (
          <Button size="lg" variant="outline" onClick={onPause} className="h-10 gap-2 px-5">
            <Pause className="h-4 w-4" />
            Pause
          </Button>
        ) : (
          <Button size="lg" onClick={onResume} className="h-10 gap-2 px-5">
            <Play className="h-4 w-4" />
            Resume
          </Button>
        )}

        <Button
          size="lg"
          variant="destructive"
          onClick={onStop}
          disabled={!isActive}
          className="h-10 gap-2 px-5"
          aria-label="Stop conversation"
        >
          <Square className="h-4 w-4" />
          Stop
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="lg" variant="ghost" disabled={!hasEntries} className="h-10 gap-2 px-4">
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear transcript?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes all converted entries from the current session. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onClear}>Clear transcript</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function measureMotion(
  video: HTMLVideoElement,
  previousFrameRef: MutableRefObject<Uint8ClampedArray | null>,
) {
  const width = 64;
  const height = 48;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  ctx.drawImage(video, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const grayscale = new Uint8ClampedArray(width * height);

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    grayscale[p] = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
  }

  const previous = previousFrameRef.current;
  previousFrameRef.current = grayscale;

  if (!previous) return 100;

  let totalDiff = 0;
  for (let i = 0; i < grayscale.length; i += 1) {
    totalDiff += Math.abs(grayscale[i] - previous[i]);
  }

  return totalDiff / grayscale.length;
}

function isQuotaError(message: string | null) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("quota exceeded") ||
    normalized.includes("rate limit") ||
    normalized.includes("resource_exhausted") ||
    normalized.includes("429")
  );
}
