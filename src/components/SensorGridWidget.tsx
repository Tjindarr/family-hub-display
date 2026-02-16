import { lazy, Suspense } from "react";
import type { LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import type { SensorGridConfig } from "@/lib/config";

// Dynamic icon loader (shared pattern)
const iconCache: Record<string, React.ComponentType<Omit<LucideProps, "ref">>> = {};

function DynIcon({ name, ...props }: { name: string } & Omit<LucideProps, "ref">) {
  const key = name as keyof typeof dynamicIconImports;
  if (!dynamicIconImports[key]) return <span className="h-4 w-4" />;
  if (!iconCache[name]) iconCache[name] = lazy(dynamicIconImports[key]);
  const Icon = iconCache[name];
  return (
    <Suspense fallback={<span className="h-4 w-4" />}>
      <Icon {...props} />
    </Suspense>
  );
}

export interface SensorGridLiveData {
  values: { value: string; unit: string }[];
}

interface SensorGridWidgetProps {
  config: SensorGridConfig;
  data: SensorGridLiveData | undefined;
  loading: boolean;
}

export default function SensorGridWidget({ config, data, loading }: SensorGridWidgetProps) {
  if (loading) {
    return <div className="widget-card h-full animate-pulse" />;
  }

  const values = data?.values || [];

  return (
    <div className="widget-card h-full flex flex-col">
      <div
        className="flex-1 grid gap-2 min-h-0"
        style={{
          gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${config.rows}, minmax(0, 1fr))`,
        }}
      >
        {config.cells.map((cell, i) => {
          if (!cell.entityId) return <div key={i} />;
          const cellData = values[i];
          return (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-1 rounded-lg bg-muted/30 p-2 min-w-0"
            >
              {cell.icon && (
                <DynIcon
                  name={cell.icon}
                  className="h-4 w-4 shrink-0"
                  style={{ color: cell.color || undefined }}
                />
              )}
              <span className="text-[10px] text-muted-foreground truncate max-w-full text-center">
                {cell.label}
              </span>
              <div className="flex items-baseline gap-0.5">
                <span
                  className="font-mono text-sm font-semibold"
                  style={{ color: cell.color || undefined }}
                >
                  {cellData?.value ?? "—"}
                </span>
                {cellData?.unit && (
                  <span className="text-[10px] text-muted-foreground">{cellData.unit}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
