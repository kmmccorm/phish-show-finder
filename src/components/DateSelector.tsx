
import * as React from "react";
import { format, parse, isValid } from "date-fns";
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

  // State for input value
  const [inputValue, setInputValue] = React.useState<string>(
    date ? format(date, "MM/dd/yyyy") : ""
  );

  // Update input when date changes from calendar
  React.useEffect(() => {
    if (date) {
      setInputValue(format(date, "MM/dd/yyyy"));
    } else {
      setInputValue("");
    }
  }, [date]);

  // Handle direct input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Try to parse the date
    if (value) {
      try {
        const parsedDate = parse(value, "MM/dd/yyyy", new Date());
        
        // Only update if it's a valid date and within range
        if (isValid(parsedDate) && 
            parsedDate >= actualMinDate && 
            parsedDate <= actualMaxDate) {
          onDateChange(parsedDate);
        }
      } catch (error) {
        // Invalid format, don't update the date
      }
    } else {
      // Clear date if input is empty
      onDateChange(undefined);
    }
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full md:w-[280px] justify-start text-left font-normal transition-all",
            !date && "text-muted-foreground",
            "border-2 hover:border-primary/50 focus:border-primary p-0 overflow-hidden"
          )}
          disabled={disabled}
        >
          <div className="flex items-center w-full">
            <CalendarIcon className="ml-3 h-4 w-4 opacity-70 shrink-0" />
            <Input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="MM/DD/YYYY"
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
              disabled={disabled}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
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
