import * as React from "react";
import { format, startOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FIRST_SHOW_DATE, parseDateInput } from "@/services/date-utils";

interface DateSelectorProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

const DISPLAY_FORMAT = "MM/dd/yyyy";
const HINT = 'Type a date like "12/31/95" or "Dec 31 1995", or pick one from the calendar.';

const DateSelector: React.FC<DateSelectorProps> = ({
  date,
  onDateChange,
  minDate,
  maxDate,
  className,
}) => {
  // Compare whole days only, so time of day never affects the range check.
  // Defaults: Phish's first show through today.
  const min = startOfDay(minDate ?? FIRST_SHOW_DATE);
  const max = startOfDay(maxDate ?? new Date());

  const [text, setText] = React.useState(date ? format(date, DISPLAY_FORMAT) : "");
  const [error, setError] = React.useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const messageId = React.useId();

  // Show dates chosen elsewhere (calendar, URL) in the text box, but don't
  // rewrite what the user typed when it already means the same day.
  const dateTime = date?.getTime();
  React.useEffect(() => {
    setError(null);
    setText((current) => {
      const typed = parseDateInput(current);
      if (dateTime === undefined) return typed ? "" : current;
      return typed?.getTime() === dateTime ? current : format(dateTime, DISPLAY_FORMAT);
    });
  }, [dateTime]);

  /**
   * Try to turn the typed text into a selected date.
   * @param final true when the user pressed Enter: two-digit years are
   *   accepted and unreadable text is reported. While typing, only complete,
   *   unambiguous dates are acted on.
   */
  const commit = (value: string, final: boolean) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(null);
      if (date) onDateChange(undefined);
      return;
    }

    const parsed = parseDateInput(trimmed, { allowTwoDigitYear: final });
    if (!parsed) {
      setError(final ? "That doesn't look like a date. Try 12/31/1995." : null);
      return;
    }
    if (parsed < min) {
      setError(`Phish's first show was ${format(min, "MMMM d, yyyy")}.`);
      return;
    }
    if (parsed > max) {
      setError("That date hasn't happened yet.");
      return;
    }

    setError(null);
    if (parsed.getTime() !== dateTime) onDateChange(parsed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    commit(text, true);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("w-full md:w-[320px]", className)} noValidate>
      <div
        className={cn(
          "flex items-center rounded-md border-2 bg-background transition-colors",
          "hover:border-primary/50 focus-within:border-primary",
          error && "border-destructive/60 hover:border-destructive/60 focus-within:border-destructive"
        )}
      >
        <Input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value, false);
          }}
          placeholder="MM/DD/YYYY"
          aria-label="Show date"
          aria-invalid={!!error}
          aria-describedby={messageId}
          autoComplete="off"
          enterKeyHint="search"
          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Choose date from calendar" className="shrink-0">
              <CalendarIcon className="h-4 w-4 opacity-70" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
            <Calendar
              mode="single"
              selected={date}
              onSelect={(selected) => {
                // Clicking the selected day again would deselect it; keep it instead.
                if (selected) onDateChange(startOfDay(selected));
                setCalendarOpen(false);
              }}
              defaultMonth={date ?? max}
              fromDate={min}
              toDate={max}
              captionLayout="dropdown-buttons"
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <p
        id={messageId}
        role={error ? "alert" : undefined}
        className={cn("mt-2 text-sm", error ? "text-destructive" : "text-muted-foreground")}
      >
        {error ?? HINT}
      </p>
    </form>
  );
};

export default DateSelector;
