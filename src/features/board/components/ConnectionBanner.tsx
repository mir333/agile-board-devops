import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConnectionBannerProps {
  isConfigured: boolean;
  error: string | null;
}

export function ConnectionBanner({ isConfigured, error }: ConnectionBannerProps) {
  if (isConfigured && !error) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
        {!isConfigured ? (
          <>
            <p className="text-sm text-muted-foreground">Azure DevOps not configured.</p>
            <Link to="/settings">
              <Button variant="outline" size="sm">
                Configure in Settings
              </Button>
            </Link>
          </>
        ) : (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}
