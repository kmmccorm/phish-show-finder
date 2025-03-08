
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Show, formatShowDate } from "@/services/api";
import { ExternalLink, MapPin, Calendar, Music, Star, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShowDetailsProps {
  show: Show;
  className?: string;
}

const ShowDetails: React.FC<ShowDetailsProps> = ({ show, className }) => {
  // Check if setlist data exists
  const hasSongs = show.sets && Array.isArray(show.sets) && show.sets.length > 0;
  
  console.log("Show data in component:", show);
  console.log("Has songs:", hasSongs);
  if (hasSongs) {
    console.log("Sets data:", show.sets);
  }
  
  return (
    <Card className={cn("w-full overflow-hidden glass-panel animate-slide-up", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs bg-accent/10 hover:bg-accent/20">
                {show.artist_name}
              </Badge>
              {show.tours && show.tours.length > 0 && (
                <Badge variant="outline" className="text-xs bg-secondary">
                  {show.tours[0].name}
                </Badge>
              )}
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold">
              {formatShowDate(show.showdate)}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 pt-1 text-base">
              <MapPin className="h-4 w-4" />
              <span>{show.venue}, {show.city}, {show.state}</span>
            </CardDescription>
          </div>
          
          <div className="flex flex-row md:flex-col gap-4 md:items-end">
            {show.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="font-semibold">{show.rating}</span>
                <span className="text-xs text-muted-foreground">({show.ratingcount} ratings)</span>
              </div>
            )}
            <a
              href={show.permalink || ''}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm inline-flex items-center gap-1 text-primary hover:underline transition-colors"
            >
              View on Phish.net <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="pt-6">
        {hasSongs ? (
          <div className="space-y-6">
            {show.sets?.map((set, setIndex) => (
              <div key={setIndex}>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                  <Music className="h-5 w-5 text-primary" />
                  {set.name}
                </h3>
                <ul className="space-y-1 pl-7">
                  {set.songs && set.songs.length > 0 ? (
                    set.songs.map((song, songIndex) => (
                      <li key={songIndex} className="list-disc text-muted-foreground flex items-center gap-1">
                        <span className={song.isjam ? "font-medium" : ""}>
                          {song.name}
                        </span>
                        {song.transition && song.transition.trim() && (
                          <span className="inline-flex items-center text-primary">
                            <ArrowRight className="h-3 w-3 mx-1" />
                            <span className="italic">{song.transition.trim()}</span>
                          </span>
                        )}
                        {song.footnote && (
                          <span className="text-xs text-muted-foreground italic ml-2">
                            ({song.footnote})
                          </span>
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">No songs found in this set</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground italic">
            No setlist information available for this show.
          </div>
        )}
        
        {show.setlistnotes && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-semibold mb-3">Notes</h3>
            <div 
              className="text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: show.setlistnotes }}
            />
          </div>
        )}

        {show.tags && show.tags.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {show.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShowDetails;
