
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fetchShowByDate, Show } from "@/services/api";
import DateSelector from "@/components/DateSelector";
import ShowDetails from "@/components/ShowDetails";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import { toast } from "sonner";

const Index = () => {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [formattedDate, setFormattedDate] = useState<string | undefined>(undefined);

  // Update formatted date when date changes
  useEffect(() => {
    if (date) {
      // Use format from date-fns which respects local timezone
      setFormattedDate(format(date, "yyyy-MM-dd"));
    } else {
      setFormattedDate(undefined);
    }
  }, [date]);

  // Query for show data
  const {
    data,
    isLoading,
    error,
    refetch,
    isError
  } = useQuery({
    queryKey: ["showData", formattedDate],
    queryFn: async () => {
      if (!formattedDate) {
        throw new Error("Please select a date");
      }
      
      console.log("Fetching data for date:", formattedDate);
      const result = await fetchShowByDate(formattedDate);
      console.log("API result:", result);
      
      if (!result.success) {
        const errorMessage = result.error_message || result.error || "Failed to fetch show data";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      return result;
    },
    enabled: !!formattedDate,
    retry: 1
  });

  // Handler for date change
  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
  };

  // Handler for retry
  const handleRetry = () => {
    refetch();
  };

  // Extract show from data if available
  const show = data?.data && data.data.length > 0 ? data.data[0] : null;
  
  console.log("Final show object:", show);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-100 via-white to-indigo-50">
      {/* Header */}
      <div className="relative py-16 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Phish Show Finder
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover setlists, venues, and details for Phish shows throughout their history.
              Select a date to get started.
            </p>
          </div>

          <div className="flex justify-center animate-fade-in animation-delay-100">
            <DateSelector
              date={date}
              onDateChange={handleDateChange}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        {isLoading && <LoadingState />}
        
        {isError && (
          <ErrorState
            message={error instanceof Error ? error.message : "An unknown error occurred"}
            onRetry={handleRetry}
          />
        )}
        
        {!isLoading && !isError && show && (
          <ShowDetails show={show} />
        )}
        
        {!date && !isLoading && !isError && (
          <div className="text-center py-16">
            <div className="text-xl text-muted-foreground mb-8">
              Select a date to see show details
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-6 border-t">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center text-sm text-muted-foreground">
            <p>
              Data provided by{" "}
              <a
                href="https://phish.net/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Phish.net API
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
