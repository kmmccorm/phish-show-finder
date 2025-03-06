
import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const LoadingState: React.FC = () => {
  return (
    <Card className="w-full p-6 mb-8 glass-panel animate-pulse-subtle animate-scale-in">
      <div className="flex flex-col space-y-4">
        <Skeleton className="h-8 w-2/3 rounded-md bg-muted/50" />
        <Skeleton className="h-6 w-1/2 rounded-md bg-muted/50" />
        <Skeleton className="h-4 w-1/3 rounded-md bg-muted/50" />

        <div className="mt-4 pt-4 border-t">
          <Skeleton className="h-6 w-1/4 rounded-md bg-muted/50 mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded-md bg-muted/50" />
            <Skeleton className="h-4 w-full rounded-md bg-muted/50" />
            <Skeleton className="h-4 w-full rounded-md bg-muted/50" />
            <Skeleton className="h-4 w-3/4 rounded-md bg-muted/50" />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <Skeleton className="h-6 w-1/4 rounded-md bg-muted/50 mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded-md bg-muted/50" />
            <Skeleton className="h-4 w-full rounded-md bg-muted/50" />
            <Skeleton className="h-4 w-2/3 rounded-md bg-muted/50" />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LoadingState;
