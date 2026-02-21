import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Minus, Plus, Columns, Rows3, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardConfig, WidgetLayout } from "@/lib/config";

interface DashboardEditOverlayProps {
  allWidgetIds: string[];
  config: DashboardConfig;
  onSave: (updates: Partial<DashboardConfig>) => void;
  renderWidget: (id: string) => React.ReactNode;
  getColSpan: (id: string) => number;
  getRow: (id: string) => number;
  getRowSpan: (id: string) => number;
  gridColumns: number;
  isMobile: boolean;
}

function SortableWidget({
  id,
  children,
  colSpan,
  rowNum,
  rowSpan,
  gridCols,
  onColSpanChange,
  onRowChange,
  onRowSpanChange,
}: {
  id: string;
  children: React.ReactNode;
  colSpan: number;
  rowNum: number;
  rowSpan: number;
  gridCols: number;
  onColSpanChange: (delta: number) => void;
  onRowChange: (delta: number) => void;
  onRowSpanChange: (delta: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${colSpan}`,
    gridRow: rowSpan > 1 ? `span ${rowSpan}` : undefined,
    opacity: isDragging ? 0.4 : 1,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Edit overlay */}
      <div className="absolute inset-0 z-10 border-2 border-dashed border-primary/50 rounded-lg bg-primary/5 pointer-events-none" />

      {/* Top bar with controls */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-1 p-1 bg-card/90 backdrop-blur-sm rounded-t-lg border-b border-primary/30">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing text-primary hover:text-primary/80 touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="text-[10px] text-muted-foreground truncate flex-1 font-mono">
          {id}
        </span>

        {/* Col span controls */}
        <div className="flex items-center gap-0.5">
          <Columns className="h-3 w-3 text-muted-foreground" />
          <button
            onClick={() => onColSpanChange(-1)}
            disabled={colSpan <= 1}
            className="p-0.5 rounded text-foreground hover:bg-secondary disabled:opacity-30 pointer-events-auto"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-[10px] text-foreground w-3 text-center">{colSpan}</span>
          <button
            onClick={() => onColSpanChange(1)}
            disabled={colSpan >= gridCols}
            className="p-0.5 rounded text-foreground hover:bg-secondary disabled:opacity-30 pointer-events-auto"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Row span controls */}
        <div className="flex items-center gap-0.5 ml-1">
          <Rows3 className="h-3 w-3 text-muted-foreground" />
          <button
            onClick={() => onRowSpanChange(-1)}
            disabled={rowSpan <= 1}
            className="p-0.5 rounded text-foreground hover:bg-secondary disabled:opacity-30 pointer-events-auto"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-[10px] text-foreground w-3 text-center">{rowSpan}</span>
          <button
            onClick={() => onRowSpanChange(1)}
            disabled={rowSpan >= 6}
            className="p-0.5 rounded text-foreground hover:bg-secondary disabled:opacity-30 pointer-events-auto"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Row number controls */}
        <div className="flex items-center gap-0.5 ml-1 border-l border-border/50 pl-1">
          <span className="text-[9px] text-muted-foreground">R</span>
          <button
            onClick={() => onRowChange(-1)}
            disabled={rowNum <= 1}
            className="p-0.5 rounded text-foreground hover:bg-secondary disabled:opacity-30 pointer-events-auto"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-[10px] text-foreground w-3 text-center">{rowNum}</span>
          <button
            onClick={() => onRowChange(1)}
            className="p-0.5 rounded text-foreground hover:bg-secondary disabled:opacity-30 pointer-events-auto"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Widget content (non-interactive in edit mode) */}
      <div className="pointer-events-none select-none">
        {children}
      </div>
    </div>
  );
}

export default function DashboardEditOverlay({
  allWidgetIds,
  config,
  onSave,
  renderWidget,
  getColSpan,
  getRow,
  getRowSpan,
  gridColumns,
  isMobile,
}: DashboardEditOverlayProps) {
  const [editMode, setEditMode] = useState(false);
  const [localOrder, setLocalOrder] = useState<string[]>(allWidgetIds);
  const [localLayouts, setLocalLayouts] = useState<Record<string, WidgetLayout>>(
    config.widgetLayouts || {}
  );

  // Sync when allWidgetIds change
  const currentKey = allWidgetIds.join(",");
  const [lastKey, setLastKey] = useState(currentKey);
  if (currentKey !== lastKey) {
    setLocalOrder(allWidgetIds);
    setLocalLayouts(config.widgetLayouts || {});
    setLastKey(currentKey);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const updateLayout = (id: string, partial: Partial<WidgetLayout>) => {
    setLocalLayouts((prev) => {
      const current = prev[id] || { colSpan: getColSpan(id), row: getRow(id), rowSpan: getRowSpan(id) };
      return { ...prev, [id]: { ...current, ...partial } };
    });
  };

  const getEffectiveColSpan = (id: string) => localLayouts[id]?.colSpan || getColSpan(id);
  const getEffectiveRow = (id: string) => localLayouts[id]?.row || getRow(id);
  const getEffectiveRowSpan = (id: string) => localLayouts[id]?.rowSpan || getRowSpan(id);

  const handleSave = () => {
    onSave({ widgetOrder: localOrder, widgetLayouts: localLayouts });
    setEditMode(false);
  };

  const handleCancel = () => {
    setLocalOrder(allWidgetIds);
    setLocalLayouts(config.widgetLayouts || {});
    setEditMode(false);
  };

  // Group by row for grid rendering
  const rows = useMemo(() => {
    const rowMap = new Map<number, string[]>();
    for (const id of localOrder) {
      const row = getEffectiveRow(id);
      if (!rowMap.has(row)) rowMap.set(row, []);
      rowMap.get(row)!.push(id);
    }
    return [...rowMap.entries()].sort((a, b) => a[0] - b[0]);
  }, [localOrder, localLayouts]);

  if (!editMode) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setEditMode(true)}
        className="fixed left-14 top-4 z-50 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit Layout
      </Button>
    );
  }

  return (
    <>
      {/* Floating toolbar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card/95 backdrop-blur-sm border border-primary/30 rounded-lg px-4 py-2 shadow-lg">
        <Pencil className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Edit Mode</span>
        <div className="h-4 w-px bg-border mx-1" />
        <Button size="sm" variant="ghost" onClick={handleCancel} className="text-xs gap-1">
          <X className="h-3 w-3" /> Cancel
        </Button>
        <Button size="sm" onClick={handleSave} className="text-xs">
          Save Layout
        </Button>
      </div>

      {/* Edit grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localOrder} strategy={rectSortingStrategy}>
          <div className="grid mt-14" style={{ gap: "5px" }}>
            {rows.map(([rowNum, widgetIds]) => {
              const cols = isMobile ? 1 : (config.rowColumns?.[rowNum] || gridColumns);
              return (
                <div
                  key={rowNum}
                  className="grid"
                  style={{
                    gap: "5px",
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    minHeight: "120px",
                  }}
                >
                  {widgetIds.map((id) => (
                    <SortableWidget
                      key={id}
                      id={id}
                      colSpan={Math.min(getEffectiveColSpan(id), cols)}
                      rowNum={rowNum}
                      rowSpan={getEffectiveRowSpan(id)}
                      gridCols={cols}
                      onColSpanChange={(delta) =>
                        updateLayout(id, {
                          colSpan: Math.max(1, Math.min(cols, getEffectiveColSpan(id) + delta)),
                        })
                      }
                      onRowChange={(delta) =>
                        updateLayout(id, { row: Math.max(1, getEffectiveRow(id) + delta) })
                      }
                      onRowSpanChange={(delta) =>
                        updateLayout(id, {
                          rowSpan: Math.max(1, Math.min(6, getEffectiveRowSpan(id) + delta)),
                        })
                      }
                    >
                      {renderWidget(id)}
                    </SortableWidget>
                  ))}
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
}
