import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";
import { createClickGuard } from "../../utilities/click-guard.js";
import type { DataviewEntry, DataviewJsonValue } from "defuss-dataview";

// -- Types --------------------------------------------------------------

export interface TreeViewColumn {
  field: string;
  label: string;
  className?: string;
  render?: (value: unknown, entry: DataviewEntry) => JSX.Element;
}

export type TreeViewProps = ElementProps<HTMLDivElement> & {
  /** Flat list of entries from `applyDataview()` with tree config */
  entries: DataviewEntry[];
  /** Field used as the node identifier (must match tree.idField) */
  idField?: string;
  /** Field to display as the row label in the tree column */
  nameField?: string;
  /** Called when a node's expand/collapse chevron is clicked */
  onNodeToggle?: (id: DataviewJsonValue) => void;
  /** Called when a row is clicked (selection) */
  onNodeSelect?: (id: DataviewJsonValue) => void;
  /** Currently selected row ID */
  selectedId?: DataviewJsonValue;
  /** Additional columns to display after the tree (name) column */
  columns?: TreeViewColumn[];
  /** Custom row renderer - overrides default name + columns rendering */
  renderRow?: (entry: DataviewEntry, level: number) => JSX.Element;
  /** Indentation width per depth level in pixels (default: 20) */
  indentSize?: number;
};

// -- Chevron Icon -------------------------------------------------------

const ChevronIcon: FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={cn(
      "size-4 shrink-0 transition-transform duration-200 text-muted-foreground",
      expanded && "rotate-90",
    )}
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

// -- Dot Icon (leaf indicator) ------------------------------------------

const LeafDot: FC = () => (
  <span class="size-4 shrink-0 flex items-center justify-center">
    <span class="size-1 rounded-full bg-muted-foreground/40" />
  </span>
);

// -- Component ----------------------------------------------------------

const allowClick = createClickGuard();

export const TreeView: FC<TreeViewProps> = ({
  className,
  entries,
  idField = "id",
  nameField = "name",
  onNodeToggle,
  onNodeSelect,
  selectedId,
  columns,
  renderRow,
  indentSize = 20,
  ref = createRef() as Ref<HTMLDivElement>,
  ...props
}) => {
  const treeRef = ref || createRef<HTMLDivElement>();

  // Single delegated click handler on the root - avoids per-row event
  // registration so interactivity works immediately on first render.
  const handleClick = (e: MouseEvent) => {
    if (!allowClick(e)) return;

    const target = e.target as HTMLElement;

    // Chevron toggle button clicked
    const toggleBtn = target.closest(".tree-view-toggle") as HTMLElement | null;
    if (toggleBtn) {
      e.stopPropagation();
      const row = toggleBtn.closest(".tree-view-row") as HTMLElement | null;
      const raw = row?.dataset.nodeId;
      if (raw !== undefined) onNodeToggle?.(JSON.parse(raw));
      return;
    }

    // Row clicked - toggle expand/collapse if it has children, and select
    const row = target.closest(".tree-view-row") as HTMLElement | null;
    if (row) {
      e.stopPropagation();
      const raw = row.dataset.nodeId;
      if (raw !== undefined) {
        const id = JSON.parse(raw);
        if (row.dataset.hasChildren === "true") onNodeToggle?.(id);
        onNodeSelect?.(id);
      }
    }
  };

  return (
    <div
      ref={treeRef}
      role="tree"
      class={cn("tree-view w-full", className)}
      onClick={handleClick}
      {...props}
    >
      {entries.map((entry) => {
        const id = entry.row[idField] as DataviewJsonValue;
        const name = entry.row[nameField];
        const { depth, hasChildren, isExpanded } = entry.meta;
        const isSelected = selectedId != null && id === selectedId;

        return (
          <div
            key={String(id)}
            role="treeitem"
            data-node-id={JSON.stringify(id)}
            data-has-children={hasChildren ? "true" : undefined}
            aria-level={depth + 1}
            aria-expanded={hasChildren ? String(isExpanded) : undefined}
            aria-selected={String(isSelected)}
            class={cn(
              "tree-view-row flex items-center w-full cursor-pointer select-none text-sm py-1.5 px-2",
              isSelected && "is-selected",
            )}
          >
            {/* Tree column: indent + chevron/dot + name */}
            <div
              class="tree-view-cell flex items-center gap-1 min-w-0 flex-1 px-2 py-0.5"
              style={{ paddingLeft: `${depth * indentSize}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  class="tree-view-toggle inline-flex items-center justify-center shrink-0 p-0.5 rounded"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  <ChevronIcon expanded={isExpanded} />
                </button>
              ) : (
                <LeafDot />
              )}

              {renderRow ? (
                renderRow(entry, depth)
              ) : (
                <span class="truncate">{String(name ?? "")}</span>
              )}
            </div>

            {/* Additional columns */}
            {!renderRow &&
              columns?.map((col) => {
                const value = entry.row[col.field];
                return (
                  <div
                    key={col.field}
                    class={cn(
                      "tree-view-cell shrink-0 text-muted-foreground px-2 py-0.5",
                      col.className,
                    )}
                  >
                    {col.render ? (
                      col.render(value, entry)
                    ) : (
                      <span>{String(value ?? "")}</span>
                    )}
                  </div>
                );
              })}
          </div>
        );
      })}

      {entries.length === 0 && (
        <div class="py-8 text-center text-sm text-muted-foreground">
          No items to display.
        </div>
      )}
    </div>
  );
};
