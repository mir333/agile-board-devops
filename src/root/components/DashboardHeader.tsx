import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Logo } from "./Logo";

export function DashboardHeader() {
  return (
    <header className="border-b bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Logo className="h-9 w-9" />
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-xl font-semibold tracking-tight">LC Dashboard</h1>
          <Badge variant="secondary" className="ml-2">
            v1.0
          </Badge>
        </div>

        <nav className="flex items-center gap-6">
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-sm font-medium text-foreground" }}
            activeOptions={{ exact: true }}
          >
            Dashboard
          </Link>
          <Link
            to="/board"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-sm font-medium text-foreground" }}
          >
            Board
          </Link>
          <Link
            to="/settings"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-sm font-medium text-foreground" }}
          >
            Settings
          </Link>

          <Separator orientation="vertical" className="h-6" />

          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              LC
            </AvatarFallback>
          </Avatar>
        </nav>
      </div>
    </header>
  );
}
