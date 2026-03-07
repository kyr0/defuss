import type { FC } from "defuss";
import { $, createRef, createStore } from "defuss";
import { CodePreview } from "../../components/CodePreview.js";
import { TreeView } from "defuss-shadcn";
import type { TreeViewColumn } from "defuss-shadcn";
import { createDataview, applyDataview, toggleExpanded } from "defuss-dataview";
import type { DataviewState, DataviewJsonValue } from "defuss-dataview";

// ── File Explorer Demo Data ────────────────────────────────────────────

type FileNode = {
  id: string;
  parentId: string | null;
  name: string;
  size: string;
  type: string;
  modified: string;
};

const fileData: FileNode[] = [
  {
    id: "src",
    parentId: null,
    name: "src",
    size: "-",
    type: "Folder",
    modified: "2025-03-01",
  },
  {
    id: "src/components",
    parentId: "src",
    name: "components",
    size: "-",
    type: "Folder",
    modified: "2025-03-01",
  },
  {
    id: "src/components/Button.tsx",
    parentId: "src/components",
    name: "Button.tsx",
    size: "4.2 KB",
    type: "Component",
    modified: "2025-02-28",
  },
  {
    id: "src/components/Card.tsx",
    parentId: "src/components",
    name: "Card.tsx",
    size: "3.1 KB",
    type: "Component",
    modified: "2025-02-27",
  },
  {
    id: "src/components/Dialog.tsx",
    parentId: "src/components",
    name: "Dialog.tsx",
    size: "5.6 KB",
    type: "Component",
    modified: "2025-02-25",
  },
  {
    id: "src/components/TreeView.tsx",
    parentId: "src/components",
    name: "TreeView.tsx",
    size: "2.8 KB",
    type: "Component",
    modified: "2025-03-01",
  },
  {
    id: "src/utils",
    parentId: "src",
    name: "utils",
    size: "-",
    type: "Folder",
    modified: "2025-02-20",
  },
  {
    id: "src/utils/helpers.ts",
    parentId: "src/utils",
    name: "helpers.ts",
    size: "1.8 KB",
    type: "Utility",
    modified: "2025-02-18",
  },
  {
    id: "src/utils/cn.ts",
    parentId: "src/utils",
    name: "cn.ts",
    size: "0.4 KB",
    type: "Utility",
    modified: "2025-02-15",
  },
  {
    id: "src/index.ts",
    parentId: "src",
    name: "index.ts",
    size: "0.6 KB",
    type: "Entry",
    modified: "2025-03-01",
  },
  {
    id: "public",
    parentId: null,
    name: "public",
    size: "-",
    type: "Folder",
    modified: "2025-01-15",
  },
  {
    id: "public/favicon.ico",
    parentId: "public",
    name: "favicon.ico",
    size: "1.0 KB",
    type: "Asset",
    modified: "2025-01-10",
  },
  {
    id: "public/robots.txt",
    parentId: "public",
    name: "robots.txt",
    size: "0.1 KB",
    type: "Config",
    modified: "2025-01-10",
  },
  {
    id: "package.json",
    parentId: null,
    name: "package.json",
    size: "1.2 KB",
    type: "Config",
    modified: "2025-03-01",
  },
  {
    id: "tsconfig.json",
    parentId: null,
    name: "tsconfig.json",
    size: "0.8 KB",
    type: "Config",
    modified: "2025-02-10",
  },
  {
    id: "README.md",
    parentId: null,
    name: "README.md",
    size: "2.4 KB",
    type: "Docs",
    modified: "2025-02-28",
  },
];

const fileColumns: TreeViewColumn[] = [
  { field: "size", label: "Size", className: "w-20 text-right" },
  { field: "type", label: "Type", className: "w-24" },
  { field: "modified", label: "Modified", className: "w-28 hidden sm:block" },
];

// ── File Explorer Store ────────────────────────────────────────────────

interface FileExplorerState {
  view: DataviewState;
  data: FileNode[];
  selectedId: string | null;
  searchQuery: string;
}

const fileStore = createStore<FileExplorerState>({
  view: createDataview({
    sorters: [{ field: "name", direction: "asc" }],
    tree: {
      idField: "id",
      parentIdField: "parentId",
      expandedIds: ["src", "src/components"],
    },
  }),
  data: [...fileData],
  selectedId: null,
  searchQuery: "",
});

const handleFileToggle = (id: DataviewJsonValue) => {
  const { view } = fileStore.value;
  const newView = toggleExpanded(view, id);
  fileStore.set({ ...fileStore.value, view: newView });
};

const handleFileSelect = (id: DataviewJsonValue) => {
  fileStore.set({ ...fileStore.value, selectedId: id as string });
};

const handleFileSearch = (e: Event) => {
  const query = (e.target as HTMLInputElement).value;
  fileStore.set({ ...fileStore.value, searchQuery: query });
};

const FileExplorerContent: FC = () => {
  const { view, data, selectedId, searchQuery } = fileStore.value;

  // Apply search filter via dataview
  const filters: Array<{ field: string; op: "contains"; value: string }> = [];
  if (searchQuery) {
    filters.push({ field: "name", op: "contains", value: searchQuery });
  }

  const currentView = createDataview({
    ...view,
    filters,
    tree: {
      ...view.tree!,
      includeAncestors: true,
      includeDescendantsOfMatch: false,
    },
  });

  const entries = applyDataview(data, currentView);

  return (
    <div class="space-y-3">
      <input
        type="text"
        placeholder="Search files..."
        class="input w-full max-w-xs"
        value={searchQuery}
        onInput={handleFileSearch}
      />

      <div class="rounded-md border">
        {/* Column headers */}
        <div class="flex items-center w-full text-xs font-medium text-muted-foreground border-b px-2 py-2">
          <div class="flex-1 px-2">Name</div>
          {fileColumns.map((col) => (
            <div key={col.field} class={cn(col.className, "px-2")}>
              {col.label}
            </div>
          ))}
        </div>

        <TreeView
          entries={entries}
          idField="id"
          nameField="name"
          columns={fileColumns}
          selectedId={selectedId}
          onNodeToggle={handleFileToggle}
          onNodeSelect={handleFileSelect}
        />
      </div>
    </div>
  );
};

const FileExplorer: FC = () => {
  const ref = createRef<HTMLDivElement>();

  fileStore.subscribe(() => $(ref).jsx(<FileExplorerContent />));

  return (
    <div ref={ref}>
      <FileExplorerContent />
    </div>
  );
};

// ── Simple Tree Demo Data ──────────────────────────────────────────────

type OrgNode = {
  id: number;
  parentId: number | null;
  name: string;
  role: string;
};

const orgData: OrgNode[] = [
  { id: 1, parentId: null, name: "Aron Homberg", role: "CEO" },
  { id: 2, parentId: 1, name: "Engineering", role: "Department" },
  { id: 3, parentId: 2, name: "Alice Chen", role: "Lead Engineer" },
  { id: 4, parentId: 2, name: "Bob Martinez", role: "Senior Engineer" },
  { id: 5, parentId: 2, name: "Clara Kim", role: "Engineer" },
  { id: 6, parentId: 1, name: "Design", role: "Department" },
  { id: 7, parentId: 6, name: "Diana Patel", role: "Lead Designer" },
  { id: 8, parentId: 6, name: "Erik Johansson", role: "Designer" },
  { id: 9, parentId: 1, name: "Marketing", role: "Department" },
  { id: 10, parentId: 9, name: "Fiona O'Brien", role: "Marketing Lead" },
  { id: 11, parentId: 9, name: "George Li", role: "Content Strategist" },
  { id: 12, parentId: 3, name: "Hiro Tanaka", role: "Junior Engineer" },
];

// ── Simple Tree Store ──────────────────────────────────────────────────

interface OrgTreeState {
  view: DataviewState;
  data: OrgNode[];
  selectedId: number | null;
}

const orgStore = createStore<OrgTreeState>({
  view: createDataview({
    sorters: [{ field: "name", direction: "asc" }],
    tree: {
      idField: "id",
      parentIdField: "parentId",
      expandedIds: [1],
    },
  }),
  data: [...orgData],
  selectedId: null,
});

const handleOrgToggle = (id: DataviewJsonValue) => {
  const { view } = orgStore.value;
  const newView = toggleExpanded(view, id);
  orgStore.set({ ...orgStore.value, view: newView });
};

const handleOrgSelect = (id: DataviewJsonValue) => {
  orgStore.set({ ...orgStore.value, selectedId: id as number });
};

const OrgTreeContent: FC = () => {
  const { view, data, selectedId } = orgStore.value;
  const entries = applyDataview(data, view);

  return (
    <div class="rounded-md border max-w-sm">
      <TreeView
        entries={entries}
        idField="id"
        nameField="name"
        selectedId={selectedId}
        onNodeToggle={handleOrgToggle}
        onNodeSelect={handleOrgSelect}
      />
    </div>
  );
};

const OrgTree: FC = () => {
  const ref = createRef<HTMLDivElement>();

  orgStore.subscribe(() => $(ref).jsx(<OrgTreeContent />));

  return (
    <div ref={ref}>
      <OrgTreeContent />
    </div>
  );
};

// ── Utility (imported from shadcn but local for the demo) ──────────────
import { cn } from "defuss-shadcn";

// ── Screen ─────────────────────────────────────────────────────────────

export const TreeViewScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Tree View</h1>
      <p class="text-lg text-muted-foreground">
        A hierarchical tree component powered by{" "}
        <code class="text-sm bg-muted px-1.5 py-0.5 rounded">
          defuss-dataview
        </code>
        . Supports expand/collapse, search filtering with ancestor inclusion,
        sorting per tree level, selection, and optional table-like columns.
      </p>

      <h2
        id="example-file-explorer"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        File Explorer
      </h2>
      <p class="text-muted-foreground mb-4">
        A tree with additional columns (Size, Type, Modified). The tree column
        grows with indentation depth while other columns stay fixed. Search
        filters nodes and automatically includes ancestor paths.
      </p>
      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full max-w-2xl"
        code={`import { TreeView } from "defuss-shadcn";
import { createDataview, applyDataview, toggleExpanded } from "defuss-dataview";
import { createStore } from "defuss";

const store = createStore({
  view: createDataview({
    sorters: [{ field: "name", direction: "asc" }],
    tree: {
      idField: "id",
      parentIdField: "parentId",
      expandedIds: ["src"],
    },
  }),
  data: fileData,
  selectedId: null,
});

// Toggle expand/collapse
const handleToggle = (id) => {
  const { view } = store.value;
  store.set({ ...store.value, view: toggleExpanded(view, id) });
};

// Render
const entries = applyDataview(store.value.data, store.value.view);

<TreeView
  entries={entries}
  idField="id"
  nameField="name"
  columns={[
    { field: "size", label: "Size", className: "w-20 text-right" },
    { field: "type", label: "Type", className: "w-24" },
  ]}
  selectedId={store.value.selectedId}
  onNodeToggle={handleToggle}
  onNodeSelect={(id) => store.set({ ...store.value, selectedId: id })}
/>`}
        language="tsx"
      >
        <FileExplorer />
      </CodePreview>

      <h2
        id="example-simple-tree"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Simple Tree
      </h2>
      <p class="text-muted-foreground mb-4">
        A minimal tree without extra columns - just names with expand/collapse
        and selection. Ideal for navigation structures, org charts, or category
        pickers.
      </p>
      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full max-w-sm"
        code={`import { TreeView } from "defuss-shadcn";
import { createDataview, applyDataview, toggleExpanded } from "defuss-dataview";

const entries = applyDataview(orgData, view);

<TreeView
  entries={entries}
  idField="id"
  nameField="name"
  selectedId={selectedId}
  onNodeToggle={(id) => { /* toggleExpanded(view, id) */ }}
  onNodeSelect={(id) => { /* set selectedId */ }}
/>`}
        language="tsx"
      >
        <OrgTree />
      </CodePreview>
    </div>
  );
};
