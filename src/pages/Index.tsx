import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { fetchShowByDate, formatShowDate } from "@/services/api";
import { ApiError, getUserFriendlyMessage, isRetryableError } from "@/services/api-errors";
import { formatDateToString, parseIsoDate } from "@/services/date-utils";
import DateSelector from "@/components/DateSelector";
import ShowDetails from "@/components/ShowDetails";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

const SITE_TITLE = "Phish Show Finder";

const Index = () => {
  // The selected date lives in the URL (?date=1997-12-31) so a show can be
  // bookmarked, shared, and reached with the back button.
  const [searchParams, setSearchParams] = useSearchParams();
  const date = parseIsoDate(searchParams.get("date")) ?? undefined;
  const isoDate = date ? formatDateToString(date) : undefined;

  const handleDateChange = (newDate: Date | undefined) => {
    setSearchParams(newDate ? { date: formatDateToString(newDate) } : {});
  };

  const { data: shows, isLoading, error, refetch, isError } = useQuery({
    queryKey: ["shows", isoDate],
    queryFn: () => fetchShowByDate(isoDate!),
    enabled: !!isoDate,
    // Setlists for past shows rarely change, so don't refetch on every focus.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, err) => isRetryableError(err) && failureCount < 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  useEffect(() => {
    document.title = isoDate ? `${formatShowDate(isoDate)} · ${SITE_TITLE}` : SITE_TITLE;
  }, [isoDate]);

  const noShowFound = error instanceof ApiError && error.code === "NO_SHOW_FOUND";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-100 via-white to-indigo-50">
      {/* Header */}
      <header className="relative py-16 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              {SITE_TITLE}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              As simple as it sounds - enter a date to see the show details.
            </p>
          </div>

          <div className="flex justify-center text-center animate-fade-in">
            <DateSelector date={date} onDateChange={handleDateChange} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow" aria-live="polite">
        {isLoading && <LoadingState />}

        {isError && (noShowFound ? (
          <ErrorState
            variant="empty"
            title="No show that night"
            message={getUserFriendlyMessage(error)}
          />
        ) : (
          <ErrorState
            message={getUserFriendlyMessage(error)}
            onRetry={isRetryableError(error) ? () => refetch() : undefined}
          />
        ))}

        {!isLoading && !isError && shows && (
          <div className="space-y-8">
            {shows.map((show) => (
              <ShowDetails key={show.showid} show={show} />
            ))}
          </div>
        )}
      </main>

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
