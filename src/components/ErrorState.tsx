import React from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  message: string;
  title?: string;
  /** "empty" is for a search that worked but found nothing; "error" for a failure. */
  variant?: "error" | "empty";
  onRetry?: () => void;
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  title = "Unable to load show data",
  variant = "error",
  onRetry,
  className,
}) => {
  const Icon = variant === "empty" ? CalendarX : AlertCircle;

  return (
    <Card
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "w-full p-6 animate-scale-in",
        variant === "error" && "border-destructive/20",
        className
      )}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <Icon
          className={cn("h-12 w-12", variant === "error" ? "text-destructive/80" : "text-muted-foreground/70")}
        />
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground max-w-md">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="mt-4">
            Try Again
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ErrorState;
