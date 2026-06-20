import { useEffect } from "react";
import { Download, Pause, Play, Square, Trash2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type Action = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "Session" | "Export";
  onSelect: () => void;
};

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  actions: Action[];
};

export function CommandPalette({ open, setOpen, actions }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const session = actions.filter((a) => a.group === "Session");
  const exp = actions.filter((a) => a.group === "Export");

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Session">
          {session.map((a) => (
            <CommandItem
              key={a.id}
              onSelect={() => {
                a.onSelect();
                setOpen(false);
              }}
            >
              <a.icon className="mr-2 h-4 w-4" />
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Export">
          {exp.map((a) => (
            <CommandItem
              key={a.id}
              onSelect={() => {
                a.onSelect();
                setOpen(false);
              }}
            >
              <a.icon className="mr-2 h-4 w-4" />
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export const PaletteIcons = { Play, Pause, Square, Trash2, Download };
