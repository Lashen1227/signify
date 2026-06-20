import { useEffect, useState } from "react";
import { Download, Eye, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { deleteSession as deleteLocalSession, loadSessions } from "@/hooks/useTranscript";
import { listSessions as apiListSessions, deleteSession as apiDeleteSession } from "@/services/signifyApi";
import { downloadPdf, formatDuration } from "@/services/exportService";
import type { Session } from "@/types/transcript";
import { LANGUAGES } from "@/types/transcript";



type Props = {
  refreshKey: number;
};

export function SessionHistory({ refreshKey }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [viewing, setViewing] = useState<Session | null>(null);

  useEffect(() => {
    const stored = loadSessions();
    setSessions([...stored]);
    apiListSessions()
      .then((serverSessions) => {
        setSessions([...serverSessions, ...stored]);
      })
      .catch(() => {
        // Server unavailable, use local only
      });
  }, [refreshKey]);

  const handleDelete = (id: string) => {
    deleteLocalSession(id);
    apiDeleteSession(id).catch(() => {});
    setSessions((s) => s.filter((x) => x.id !== id));
    toast.success("Session deleted");
  };

  const handleDownload = (s: Session) => {
    const label = LANGUAGES.find((l) => l.code === s.language)?.label ?? s.language;
    downloadPdf(s.entries, label);
  };

  return (
    <Card className="p-0 shadow-soft">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold tracking-tight">Recent Sessions</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No sessions yet.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((s) => {
                const lang = LANGUAGES.find((l) => l.code === s.language);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs">
                        <span>{lang?.flag}</span> {lang?.label ?? s.language}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatDuration(s.durationMs)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewing(s)} aria-label="View session">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDownload(s)} aria-label="Download session">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(s.id)}
                          aria-label="Delete session"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
            <DialogDescription>
              {viewing && new Date(viewing.createdAt).toLocaleString()} ·{" "}
              {viewing && formatDuration(viewing.durationMs)}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh] pr-3">
            <ul className="space-y-2">
              {viewing?.entries.map((e) => (
                <li key={e.id} className="rounded-md border border-border bg-background/60 p-2.5">
                  <p className="font-mono text-[10px] text-muted-foreground">
                    [{new Date(e.timestamp).toLocaleTimeString()}]
                  </p>
                  <p className="mt-0.5 text-sm">{e.text}</p>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
