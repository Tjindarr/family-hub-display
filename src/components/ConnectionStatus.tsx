import { Wifi, WifiOff, Loader2 } from "lucide-react";

interface ConnectionStatusProps {
  isConfigured: boolean;
  wsState?: "connecting" | "connected" | "disconnected";
}

export default function ConnectionStatus({ isConfigured, wsState }: ConnectionStatusProps) {
  if (!isConfigured) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <WifiOff className="h-3 w-3 text-chart-2" />
        <span className="text-chart-2">Demo Mode — Configure HA in settings</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {wsState === "connected" ? (
        <>
          <Wifi className="h-3 w-3 text-primary" />
          <span className="text-primary">WebSocket Connected</span>
        </>
      ) : wsState === "connecting" ? (
        <>
          <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />
          <span className="text-muted-foreground">Connecting…</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 text-destructive" />
          <span className="text-destructive">Disconnected — Reconnecting…</span>
        </>
      )}
    </div>
  );
}
