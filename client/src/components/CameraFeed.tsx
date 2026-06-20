import { useRef } from "react";
import { motion } from "framer-motion";
import { Camera, CameraOff, Maximize2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

type CameraFeedProps = {
  recording: boolean;
  processing: boolean;
  countdown: number | null;
  cameraPrompt: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  devices: MediaDeviceInfo[];
  deviceId: string | undefined;
  enabled: boolean;
  error: string | null;
  enable: (id?: string) => Promise<boolean>;
  disable: () => void | Promise<void>;
  switchDevice: (id: string) => Promise<void>;
};

export function CameraFeed({
  recording,
  processing,
  countdown,
  cameraPrompt,
  videoRef,
  devices,
  deviceId,
  enabled,
  error,
  enable,
  disable,
  switchDevice,
}: CameraFeedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const goFullscreen = async () => {
    if (containerRef.current) {
      await containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  return (
    <Card className="overflow-hidden p-0 shadow-soft">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-tight">Live Sign Detection</span>
          {recording && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
              <span className="recording-dot h-1.5 w-1.5 rounded-full" />
              REC
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {enabled && (
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={disable} aria-label="Disable camera">
              <CameraOff className="h-3.5 w-3.5" />
              Disable
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goFullscreen} aria-label="Enter fullscreen">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="relative aspect-video w-full bg-foreground/95">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
          aria-label="Webcam preview"
        />
        {!enabled && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-foreground/95 text-background/80">
            <Camera className="h-10 w-10 opacity-50" />
            <p className="text-sm font-medium">Camera is off</p>
            <p className="max-w-xs px-4 text-center text-xs text-background/60">
              {cameraPrompt ?? "Enable the camera to start sign language detection."}
            </p>
            {error && <p className="max-w-xs px-4 text-center text-xs text-destructive">{error}</p>}
          </div>
        )}
        {processing && enabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary shadow-soft backdrop-blur"
          >
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            AI processing
          </motion.div>
        )}
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-sm"
          >
            <div className="rounded-3xl border border-border bg-card/95 px-8 py-6 text-center shadow-elevated">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Get ready
              </p>
              <p className="mt-2 text-6xl font-semibold tracking-tight text-primary">{countdown}</p>
              <p className="mt-2 text-sm text-muted-foreground">Start signing when the timer ends</p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
        {enabled ? (
          <Button variant="outline" size="sm" onClick={disable} className="h-8">
            <CameraOff className="mr-1.5 h-3.5 w-3.5" />
            Disable
          </Button>
        ) : (
          <Button size="sm" onClick={() => enable(deviceId)} className="h-8">
            <Camera className="mr-1.5 h-3.5 w-3.5" />
            Enable Camera
          </Button>
        )}

        <div className="ml-auto min-w-[180px]">
          <Select value={deviceId} onValueChange={switchDevice} disabled={devices.length === 0}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={devices.length === 0 ? "No camera detected" : "Select camera"} />
            </SelectTrigger>
            <SelectContent>
              {devices.map((d, i) => (
                <SelectItem key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
