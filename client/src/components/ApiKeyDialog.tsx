import { useCallback, useState } from "react";
import { Eye, EyeOff, Key, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isConfigured: boolean;
  onSave: (key: string) => Promise<boolean>;
  onRemove: () => void;
};

export function ApiKeyDialog({ open, onOpenChange, isConfigured, onSave, onRemove }: Props) {
  const [input, setInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!input.trim()) return;
    setSaving(true);
    try {
      const success = await onSave(input.trim());
      if (success) {
        toast.success("API key saved");
        setInput("");
      }
    } catch {
      toast.error("Could not save API key");
    } finally {
      setSaving(false);
    }
  }, [input, onSave]);

  const handleRemove = useCallback(() => {
    onRemove();
    setInput("");
    toast.success("API key removed");
  }, [onRemove]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && input.trim() && !saving) {
        e.preventDefault();
        void handleSave();
      }
    },
    [handleSave, input, saving],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            AI API Settings
          </DialogTitle>
          <DialogDescription>
            Provide your own Google Gemini API key for sign language translation. Your key is stored
            locally in your browser and never saved on the server.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isConfigured && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
              <ShieldCheck className="h-4 w-4" />
              <span>API key is configured</span>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="api-key-input" className="text-sm font-medium">
              {isConfigured ? "Replace API key" : "Gemini API key"}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="api-key-input"
                  type={showKey ? "text" : "password"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your API key"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={() => void handleSave()} disabled={!input.trim() || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Get your free API key at{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Google AI Studio
            </a>
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between sm:flex-row">
          {isConfigured ? (
            <Button variant="destructive" onClick={handleRemove}>
              Remove Key
            </Button>
          ) : (
            <div />
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
