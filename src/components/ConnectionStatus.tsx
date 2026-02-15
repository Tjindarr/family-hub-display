import { Wifi, WifiOff } from "lucide-react";

interface ConnectionStatusProps {
  isConfigured: boolean;
}

export default function ConnectionStatus({ isConfigured }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {isConfigured ? (
        <>
          <Wifi className="h-3 w-3 text-primary" />
          <span className="text-primary">Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 text-chart-2" />
          <span className="text-chart-2">Demo Mode — Configure HA in settings</span>
        </>
      )}
    </div>
  );
}
