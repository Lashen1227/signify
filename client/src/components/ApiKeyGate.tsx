import { Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  onOpenSettings: () => void;
};

export function ApiKeyGate({ onOpenSettings }: Props) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="max-w-md p-8 text-center shadow-soft">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Key className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight">API Key Required</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          To use sign language translation, you need to provide your own Google Gemini API key. Each
          user brings their own key so there are no shared quota limits.
        </p>
        <Button onClick={onOpenSettings} className="mt-6 gap-2">
          <Key className="h-4 w-4" />
          Add API Key
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          Your key is stored locally in your browser and never saved on our servers.
        </p>
      </Card>
    </div>
  );
}
