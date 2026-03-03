import { SettingsForm } from "../components/SettingsForm";

export function SettingsPage() {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your application preferences and configuration
        </p>
      </div>

      <SettingsForm />
    </>
  );
}
