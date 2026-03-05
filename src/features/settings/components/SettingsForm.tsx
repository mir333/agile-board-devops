import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "@/root/hooks/useSettingsContext";

export function SettingsForm() {
  const { settings, updateSettings, isLoading } = useSettings();

  // Local form state for text inputs — only persisted on Save
  const [azureOrg, setAzureOrg] = useState(settings.azureDevOpsOrg);
  const [azurePat, setAzurePat] = useState(settings.azureDevOpsPat);
  const [isDirty, setIsDirty] = useState(false);

  // Sync local state when settings load from DB
  useEffect(() => {
    setAzureOrg(settings.azureDevOpsOrg);
    setAzurePat(settings.azureDevOpsPat);
    setIsDirty(false);
  }, [settings.azureDevOpsOrg, settings.azureDevOpsPat]);

  const handleSave = async () => {
    await updateSettings({
      azureDevOpsOrg: azureOrg,
      azureDevOpsPat: azurePat,
    });
    setIsDirty(false);
  };

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
          <CardTitle>Azure DevOps Connection</CardTitle>
          <CardDescription>Configure your Azure DevOps integration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="azure-devops-org">Organization URL</Label>
            <Input
              id="azure-devops-org"
              placeholder="https://dev.azure.com/your-org"
              value={azureOrg}
              onChange={(e) => {
                setAzureOrg(e.target.value);
                setIsDirty(true);
              }}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="azure-devops-pat">Personal Access Token</Label>
            <Input
              id="azure-devops-pat"
              type="password"
              placeholder="Enter your PAT"
              value={azurePat}
              onChange={(e) => {
                setAzurePat(e.target.value);
                setIsDirty(true);
              }}
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isLoading || !isDirty}
            >
              Save Connection
            </Button>
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
