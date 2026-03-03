import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "../hooks/useSettings";

export function SettingsForm() {
  const { settings, updateSettings, isLoading } = useSettings();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the dashboard looks and feels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">Select your preferred color scheme</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={settings.theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => updateSettings({ theme: "light" })}
                disabled={isLoading}
              >
                Light
              </Button>
              <Button
                variant={settings.theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => updateSettings({ theme: "dark" })}
                disabled={isLoading}
              >
                Dark
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Language</p>
              <p className="text-sm text-muted-foreground">Choose your display language</p>
            </div>
            <Badge variant="secondary">{settings.language.toUpperCase()}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Storage</CardTitle>
          <CardDescription>Manage local data persistence settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Local Storage</p>
              <p className="text-sm text-muted-foreground">
                Data is stored locally using RxDB with IndexedDB
              </p>
            </div>
            <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
