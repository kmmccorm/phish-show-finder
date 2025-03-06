
import React from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({ 
  message, 
  onRetry, 
  className 
}) => {
  return (
    <Card className={cn(
      "w-full p-6 border-destructive/20 animate-scale-in",
      className
    )}>
      <div className="flex flex-col items-center text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive/80" />
        <h3 className="text-xl font-semibold">Unable to load show data</h3>
        <p className="text-muted-foreground max-w-md">{message}</p>
        {onRetry && (
          <Button 
            onClick={onRetry}
            variant="outline"
            className="mt-4"
          >
            Try Again
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ErrorState;
