import { useCallback, useEffect, useRef, useState } from "react";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "videoinput"));
    } catch {
      // ignore
    }
  }, []);

  const enable = useCallback(async (id?: string) => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: id ? { deviceId: { exact: id } } : true,
        audio: false,
      });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setEnabled(true);
      await refreshDevices();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not access camera");
      setEnabled(false);
      return false;
    }
  }, [refreshDevices]);

  const disable = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setEnabled(false);
  }, []);

  const switchDevice = useCallback(
    async (id: string) => {
      setDeviceId(id);
      if (enabled) await enable(id);
    },
    [enable, enabled],
  );

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  return { videoRef, devices, deviceId, enabled, error, enable, disable, switchDevice, refreshDevices };
}
