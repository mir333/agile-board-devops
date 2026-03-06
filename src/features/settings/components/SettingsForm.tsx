import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { type ConnectionTestResult, testConnection } from "@/features/board/lib/azure-api";
import { useSettings } from "@/root/hooks/useSettingsContext";

const PROXY_BASE_URL = import.meta.env.VITE_PROXY_URL || "http://localhost:3001";

export function SettingsForm() {
  const { settings, updateSettings, isLoading } = useSettings();

  // Local form state for text inputs — only persisted on Save
  const [azureOrg, setAzureOrg] = useState(settings.azureDevOpsOrg);
  const [azurePat, setAzurePat] = useState(settings.azureDevOpsPat);
  const [isDirty, setIsDirty] = useState(false);

  // Connection test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  // Sync local state when settings load from DB
  useEffect(() => {
    setAzureOrg(settings.azureDevOpsOrg);
    setAzurePat(settings.azureDevOpsPat);
    setIsDirty(false);
  }, [settings.azureDevOpsOrg, settings.azureDevOpsPat]);

  // Clear test result when credentials change
  useEffect(() => {
    setTestResult(null);
  }, [azureOrg, azurePat]);

  const handleSave = async () => {
    await updateSettings({
      azureDevOpsOrg: azureOrg,
      azureDevOpsPat: azurePat,
    });
    setIsDirty(false);
  };

  const handleTestConnection = async () => {
    if (!azureOrg || !azurePat) return;

    // Save first if dirty, so settings are persisted before testing
    if (isDirty) {
      await handleSave();
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection({
        org: azureOrg,
        pat: azurePat,
        proxyBaseUrl: PROXY_BASE_URL,
      });
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const canTest = Boolean(azureOrg && azurePat);

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

          {/* Connection test result */}
          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                testResult.azureAuthenticated
                  ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
                  : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
              }`}
            >
              {testResult.azureAuthenticated ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div>
                {testResult.azureAuthenticated ? (
                  <p>Connected successfully to Azure DevOps.</p>
                ) : (
                  <>
                    <p className="font-medium">Connection failed</p>
                    {testResult.proxyReachable ? (
                      <p className="mt-1">{testResult.error}</p>
                    ) : (
                      <p className="mt-1">{testResult.error}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isLoading || isTesting || !canTest}
            >
              {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !isDirty}>
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
