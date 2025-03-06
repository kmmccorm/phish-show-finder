
import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateSelectorProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}

const DateSelector: React.FC<DateSelectorProps> = ({
  date,
  onDateChange,
  minDate,
  maxDate,
  disabled = false,
}) => {
  // Default min date to Phish's first show: December 2, 1983
  const defaultMinDate = new Date(1983, 11, 2);
  
  // Default max date to today
  const defaultMaxDate = new Date();
  
  // Use provided dates or defaults
  const actualMinDate = minDate || defaultMinDate;
  const actualMaxDate = maxDate || defaultMaxDate;
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full md:w-[280px] justify-start text-left font-normal transition-all",
            !date && "text-muted-foreground",
            "border-2 hover:border-primary/50 focus:border-primary"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-3 h-4 w-4 opacity-70" />
          {date ? (
            <span className="flex-1">{format(date, "MMMM d, yyyy")}</span>
          ) : (
            <span className="flex-1">Select show date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 glass-panel" 
        align="center"
        sideOffset={5}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          disabled={(date) => {
            return (
              date < actualMinDate ||
              date > actualMaxDate
            );
          }}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
};

export default DateSelector;
