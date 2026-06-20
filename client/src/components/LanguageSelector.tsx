import { useState } from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LANGUAGES } from "@/types/transcript";

type Props = {
  value: string;
  onChange: (code: string) => void;
};

export function LanguageSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === value) ?? LANGUAGES[0];

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Globe className="h-3.5 w-3.5" /> Convert to
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">{current.flag}</span>
              {current.label}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="Search language…" />
            <CommandList>
              <CommandEmpty>No language found.</CommandEmpty>
              <CommandGroup>
                {LANGUAGES.map((l) => (
                  <CommandItem
                    key={l.code}
                    value={l.label}
                    onSelect={() => {
                      onChange(l.code);
                      setOpen(false);
                    }}
                  >
                    <span className="mr-2 text-base">{l.flag}</span>
                    {l.label}
                    <Check className={cn("ml-auto h-4 w-4", value === l.code ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
