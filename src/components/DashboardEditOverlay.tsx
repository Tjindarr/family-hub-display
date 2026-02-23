import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Minus, Plus, Columns, Rows3, X, Pencil, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { DashboardConfig, WidgetLayout } from "@/lib/config";

const WIDGET_GROUPS = ["", "A", "B", "C", "D", "E", "F", "G", "H"];

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
  widgetGroup,
  onColSpanChange,
  onRowChange,
  onRowSpanChange,
  onWidgetGroupChange,
}: {
  id: string;
  children: React.ReactNode;
  colSpan: number;
  rowNum: number;
  rowSpan: number;
  gridCols: number;
  widgetGroup: string;
  onColSpanChange: (delta: number) => void;
  onRowChange: (delta: number) => void;
  onRowSpanChange: (delta: number) => void;
  onWidgetGroupChange: (group: string) => void;
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

        {/* Group selector */}
        <div className="flex items-center gap-0.5">
          <span className="text-[9px] text-muted-foreground">Grp</span>
          <Select value={widgetGroup || "none"} onValueChange={(v) => onWidgetGroupChange(v === "none" ? "" : v)}>
            <SelectTrigger className="h-5 w-12 bg-muted border-border text-[10px] px-1 py-0">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {WIDGET_GROUPS.map((g) => (
                <SelectItem key={g || "none"} value={g || "none"} className="text-xs">{g || "—"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Col span controls */}
        <div className="flex items-center gap-0.5 ml-1">
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
  const [localGridColumns, setLocalGridColumns] = useState(config.gridColumns || 4);
  const [localRowColumns, setLocalRowColumns] = useState<Record<number, number>>(config.rowColumns || {});
  const [showSettings, setShowSettings] = useState(false);

  // Sync when allWidgetIds change
  const currentKey = allWidgetIds.join(",");
  const [lastKey, setLastKey] = useState(currentKey);
  if (currentKey !== lastKey) {
    setLocalOrder(allWidgetIds);
    setLocalLayouts(config.widgetLayouts || {});
    setLocalGridColumns(config.gridColumns || 4);
    setLocalRowColumns(config.rowColumns || {});
    setLastKey(currentKey);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const effectiveGridCols = isMobile ? 1 : localGridColumns;

  const getEffectiveColSpan = (id: string) => localLayouts[id]?.colSpan || getColSpan(id);
  const getEffectiveRow = (id: string) => localLayouts[id]?.row || getRow(id);
  const getEffectiveRowSpan = (id: string) => localLayouts[id]?.rowSpan || getRowSpan(id);
  const getWidgetGroup = (id: string) => localLayouts[id]?.widgetGroup ?? config.widgetLayouts?.[id]?.widgetGroup ?? "";

  // Build sortable items: use lead widget id for groups
  const sortableItems = useMemo(() => {
    const seenGroups = new Set<string>();
    const items: string[] = [];
    for (const id of localOrder) {
      const groupId = getWidgetGroup(id);
      if (groupId && seenGroups.has(groupId)) continue;
      if (groupId) seenGroups.add(groupId);
      items.push(id);
    }
    return items;
  }, [localOrder, localLayouts]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalOrder((prev) => {
        const activeGroup = getWidgetGroup(active.id as string);

        if (!activeGroup) {
          const oldIndex = prev.indexOf(active.id as string);
          const newIndex = prev.indexOf(over.id as string);
          return arrayMove(prev, oldIndex, newIndex);
        }

        const groupIds = prev.filter((id) => getWidgetGroup(id) === activeGroup);
        const without = prev.filter((id) => getWidgetGroup(id) !== activeGroup);
        const overGroup = getWidgetGroup(over.id as string);
        const overTarget = overGroup
          ? without.indexOf(prev.find((id) => getWidgetGroup(id) === overGroup)!)
          : without.indexOf(over.id as string);
        const insertAt = overTarget >= 0 ? overTarget : without.length;
        return [...without.slice(0, insertAt), ...groupIds, ...without.slice(insertAt)];
      });
    }
  };

  const updateLayout = (id: string, partial: Partial<WidgetLayout>) => {
    setLocalLayouts((prev) => {
      const current = prev[id] || { colSpan: getColSpan(id), row: getRow(id), rowSpan: getRowSpan(id) };
      return { ...prev, [id]: { ...current, ...partial } };
    });
  };

  const handleSave = () => {
    onSave({
      widgetOrder: localOrder,
      widgetLayouts: localLayouts,
      gridColumns: localGridColumns,
      rowColumns: localRowColumns,
    });
    setEditMode(false);
  };

  const handleCancel = () => {
    setLocalOrder(allWidgetIds);
    setLocalLayouts(config.widgetLayouts || {});
    setLocalGridColumns(config.gridColumns || 4);
    setLocalRowColumns(config.rowColumns || {});
    setEditMode(false);
  };

  // Get used rows for per-row column overrides
  const usedRows = useMemo(() => {
    const rows = new Set<number>();
    for (const id of localOrder) {
      rows.add(getEffectiveRow(id));
    }
    return [...rows].sort((a, b) => a - b);
  }, [localOrder, localLayouts]);

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
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 bg-card/95 backdrop-blur-sm border border-primary/30 rounded-lg px-4 py-2 shadow-lg">
          <Pencil className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Edit Mode</span>
          <div className="h-4 w-px bg-border mx-1" />

          {/* Grid columns selector */}
          <div className="flex items-center gap-1.5">
            <Label className="text-[10px] text-muted-foreground">Columns</Label>
            <Select value={String(localGridColumns)} onValueChange={(v) => setLocalGridColumns(Number(v))}>
              <SelectTrigger className="h-7 w-16 bg-muted border-border text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs gap-1"
          >
            <Settings2 className="h-3 w-3" />
            {showSettings ? "Hide" : "Row Settings"}
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button size="sm" variant="ghost" onClick={handleCancel} className="text-xs gap-1">
            <X className="h-3 w-3" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="text-xs">
            Save Layout
          </Button>
        </div>

        {/* Row column overrides panel */}
        {showSettings && (
          <div className="bg-card/95 backdrop-blur-sm border border-primary/30 rounded-lg px-4 py-3 shadow-lg w-72">
            <Label className="text-xs text-muted-foreground font-medium">Columns per Row (override)</Label>
            <div className="mt-2 space-y-1.5">
              {usedRows.map((row) => (
                <div key={row} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-14">Row {row}</span>
                  <Select
                    value={String(localRowColumns[row] || localGridColumns)}
                    onValueChange={(v) => {
                      const val = Number(v);
                      setLocalRowColumns((prev) => {
                        const next = { ...prev };
                        if (val === localGridColumns) delete next[row];
                        else next[row] = val;
                        return next;
                      });
                    }}
                  >
                    <SelectTrigger className="flex-1 h-7 bg-muted border-border text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} col{n > 1 ? "s" : ""}{n === localGridColumns ? " (default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableItems} strategy={rectSortingStrategy}>
          <div className="grid mt-14" style={{ gap: "5px" }}>
            {rows.map(([rowNum, widgetIds]) => {
              const cols = isMobile ? 1 : (localRowColumns[rowNum] || effectiveGridCols);

              // Build rendered items honoring groups
              const rendered: { leadId: string; memberIds: string[]; span: number; rSpan: number }[] = [];
              const seenGroups = new Set<string>();

              for (const id of widgetIds) {
                const groupId = getWidgetGroup(id);
                if (groupId && seenGroups.has(groupId)) continue;
                if (groupId) {
                  seenGroups.add(groupId);
                  const members = widgetIds.filter((wId) => getWidgetGroup(wId) === groupId);
                  rendered.push({
                    leadId: id,
                    memberIds: members,
                    span: getEffectiveColSpan(id),
                    rSpan: getEffectiveRowSpan(id),
                  });
                } else {
                  rendered.push({
                    leadId: id,
                    memberIds: [id],
                    span: getEffectiveColSpan(id),
                    rSpan: getEffectiveRowSpan(id),
                  });
                }
              }

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
                  {rendered.map(({ leadId, memberIds, span, rSpan }) => (
                    <SortableWidget
                      key={leadId}
                      id={leadId}
                      colSpan={Math.min(span, cols)}
                      rowNum={rowNum}
                      rowSpan={rSpan}
                      gridCols={cols}
                      widgetGroup={getWidgetGroup(leadId)}
                      onColSpanChange={(delta) =>
                        updateLayout(leadId, {
                          colSpan: Math.max(1, Math.min(cols, getEffectiveColSpan(leadId) + delta)),
                        })
                      }
                      onRowChange={(delta) =>
                        updateLayout(leadId, { row: Math.max(1, getEffectiveRow(leadId) + delta) })
                      }
                      onRowSpanChange={(delta) =>
                        updateLayout(leadId, {
                          rowSpan: Math.max(1, Math.min(6, getEffectiveRowSpan(leadId) + delta)),
                        })
                      }
                      onWidgetGroupChange={(group) => {
                        // When joining a group, move widget to the same row as the group lead
                        if (group) {
                          const leadOfGroup = localOrder.find(
                            (wId) => wId !== leadId && getWidgetGroup(wId) === group
                          );
                          if (leadOfGroup) {
                            const leadRow = getEffectiveRow(leadOfGroup);
                            updateLayout(leadId, { widgetGroup: group, row: leadRow });
                          } else {
                            updateLayout(leadId, { widgetGroup: group });
                          }
                        } else {
                          updateLayout(leadId, { widgetGroup: group });
                        }
                      }}
                    >
                      {memberIds.length > 1 ? (
                        <div className="flex flex-col gap-1 h-full">
                          {memberIds.map((mId) => (
                            <div key={mId} className="flex-1 min-h-0 relative">
                              {/* Per-member ungroup button */}
                              <div className="absolute bottom-1 right-1 z-30 flex items-center gap-0.5 bg-card/90 backdrop-blur-sm rounded px-1 py-0.5 border border-border/50">
                                <span className="text-[8px] text-muted-foreground truncate max-w-[60px]">{mId}</span>
                                <Select
                                  value={getWidgetGroup(mId) || "none"}
                                  onValueChange={(v) => {
                                    const newGroup = v === "none" ? "" : v;
                                    updateLayout(mId, { widgetGroup: newGroup });
                                  }}
                                >
                                  <SelectTrigger className="h-4 w-10 bg-muted border-border text-[9px] px-0.5 py-0">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {WIDGET_GROUPS.map((g) => (
                                      <SelectItem key={g || "none"} value={g || "none"} className="text-xs">{g || "—"}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {renderWidget(mId)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        renderWidget(leadId)
                      )}
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
