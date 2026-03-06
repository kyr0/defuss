import type { FC } from "defuss";
import { $, createRef, createStore } from "defuss";
import { CodePreview } from "../../components/CodePreview.js";
import { createDataview, applyDataview } from "defuss-dataview";
import type { DataviewState } from "defuss-dataview";
import { DataTable } from "defuss-shadcn";
import type { DataTableColumn } from "defuss-shadcn";

type Invoice = { id: string; amount: number; status: string; email: string };

const initialInvoiceData: Invoice[] = [
  { id: "INV001", amount: 250, status: "Paid", email: "sponge@example.com" },
  {
    id: "INV002",
    amount: 150,
    status: "Pending",
    email: "patrick@example.com",
  },
  {
    id: "INV003",
    amount: 350,
    status: "Unpaid",
    email: "squidward@example.com",
  },
  { id: "INV004", amount: 450, status: "Paid", email: "bikini@example.com" },
  { id: "INV005", amount: 550, status: "Paid", email: "krabs@example.com" },
  { id: "INV006", amount: 650, status: "Pending", email: "sandy@example.com" },
  {
    id: "INV007",
    amount: 750,
    status: "Unpaid",
    email: "plankton@example.com",
  },
  { id: "INV008", amount: 850, status: "Paid", email: "gary@example.com" },
  { id: "INV009", amount: 950, status: "Unpaid", email: "manray@example.com" },
  { id: "INV010", amount: 1050, status: "Paid", email: "wilson@example.com" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Paid":
      return "success";
    case "Pending":
      return "warning";
    case "Unpaid":
      return "error";
    default:
      return "neutral";
  }
};

const formatAmount = (amount: number) => `$${amount.toFixed(2)}`;

const invoiceColumns: DataTableColumn[] = [
  { field: "id", label: "Invoice", sortable: true, className: "font-medium" },
  { field: "email", label: "Email", sortable: true },
  {
    field: "amount",
    label: "Amount",
    sortable: true,
    className: "text-right",
    render: (value) => <span>{formatAmount(value as number)}</span>,
  },
  {
    field: "status",
    label: "Status",
    render: (value) => (
      <span class={`badge badge-${getStatusColor(value as string)}`}>
        {String(value)}
      </span>
    ),
  },
];

interface TableState {
  view: DataviewState;
  data: Invoice[];
  searchQuery: string;
  statusFilter: string;
  editingRow: Invoice | null;
}

// Store lives outside component so it persists across re-renders
const tableStore = createStore<TableState>({
  view: createDataview({
    sorters: [{ field: "id", direction: "asc" }],
    page: 0,
    pageSize: 5,
  }),
  data: [...initialInvoiceData],
  searchQuery: "",
  statusFilter: "all",
  editingRow: null,
});

// Module-level sort handler
const handleSort = (field: string) => {
  const { view } = tableStore.value;
  const dir =
    view.sorters[0]?.field === field && view.sorters[0].direction === "asc"
      ? "desc"
      : "asc";
  tableStore.set({
    ...tableStore.value,
    view: createDataview({
      ...view,
      sorters: [{ field, direction: dir }],
      page: 0,
    }),
  });
};

const DataviewTableContent: FC = () => {
  const { view, data, searchQuery, statusFilter, editingRow } =
    tableStore.value;

  // Pre-filter for search across id, email, and amount (OR across fields)
  const searchLower = searchQuery.toLowerCase();
  const searchedData = searchQuery
    ? data.filter(
        (row) =>
          row.id.toLowerCase().includes(searchLower) ||
          row.email.toLowerCase().includes(searchLower) ||
          formatAmount(row.amount).toLowerCase().includes(searchLower),
      )
    : data;

  // Use dataview for status filter, sorting, and pagination
  const statusFilters: Array<{ field: string; op: "eq"; value: string }> = [];
  if (statusFilter !== "all") {
    statusFilters.push({ field: "status", op: "eq", value: statusFilter });
  }

  const currentView = createDataview({ ...view, filters: statusFilters });
  const entries = applyDataview(searchedData, currentView);
  const allFiltered = applyDataview(
    searchedData,
    createDataview({ ...currentView, page: undefined, pageSize: undefined }),
  );
  const totalFiltered = allFiltered.length;
  const pageSize = currentView.pageSize ?? totalFiltered;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = currentView.page;
  const startIndex = currentPage * pageSize;
  const sortField = view.sorters[0]?.field;
  const sortDirection = view.sorters[0]?.direction ?? "asc";

  const handlePageChange = (page: number) => {
    const { view } = tableStore.value;
    tableStore.set({
      ...tableStore.value,
      view: createDataview({ ...view, page }),
    });
  };

  const handlePageSizeChange = (e: Event) => {
    const newPageSize = Number((e.target as HTMLSelectElement).value);
    const { view } = tableStore.value;
    tableStore.set({
      ...tableStore.value,
      view: createDataview({ ...view, pageSize: newPageSize, page: 0 }),
    });
  };

  const handleSearchChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    const { view } = tableStore.value;
    tableStore.set({
      ...tableStore.value,
      searchQuery: value,
      view: createDataview({ ...view, page: 0 }),
    });
  };

  const handleStatusChange = (e: Event) => {
    const value = (e.target as HTMLSelectElement).value;
    const { view } = tableStore.value;
    tableStore.set({
      ...tableStore.value,
      statusFilter: value,
      view: createDataview({ ...view, page: 0 }),
    });
  };

  const handleDelete = (id: string) => {
    const newData = tableStore.value.data.filter((row) => row.id !== id);
    tableStore.set({ ...tableStore.value, data: newData });
  };

  const handleEditOpen = (row: Invoice) => {
    tableStore.set({ ...tableStore.value, editingRow: { ...row } });
    setTimeout(() => {
      const dialog = document.getElementById(
        "edit-invoice-dialog",
      ) as HTMLDialogElement;
      dialog?.showModal();
    }, 0);
  };

  const handleEditSave = () => {
    const { editingRow, data } = tableStore.value;
    if (!editingRow) return;
    const newData = data.map((row) =>
      row.id === editingRow.id ? { ...editingRow } : row,
    );
    const dialog = document.getElementById(
      "edit-invoice-dialog",
    ) as HTMLDialogElement;
    dialog?.close();
    tableStore.set({ ...tableStore.value, data: newData, editingRow: null });
  };

  const handleEditCancel = () => {
    const dialog = document.getElementById(
      "edit-invoice-dialog",
    ) as HTMLDialogElement;
    dialog?.close();
    tableStore.set({ ...tableStore.value, editingRow: null });
  };

  const handleEditField = (field: keyof Invoice, value: string | number) => {
    const { editingRow } = tableStore.value;
    if (!editingRow) return;
    // Update editingRow without triggering full rerender
    tableStore.value.editingRow = { ...editingRow, [field]: value };
  };

  return (
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search invoices..."
          class="input flex-1"
          value={searchQuery}
          onInput={handleSearchChange}
        />
        <select
          class="select w-full sm:w-48"
          value={statusFilter}
          onChange={handleStatusChange}
        >
          <option value="all">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Unpaid">Unpaid</option>
        </select>
      </div>
      <DataTable
        entries={entries}
        columns={invoiceColumns}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        renderActions={(entry) => (
          <>
            <button
              type="button"
              class="btn btn-sm btn-outline"
              onClick={() => handleEditOpen(entry.row as Invoice)}
            >
              Edit
            </button>
            <button
              type="button"
              class="btn btn-sm"
              onClick={() => handleDelete(entry.row.id as string)}
            >
              Delete
            </button>
          </>
        )}
      />
      <div class="flex items-center justify-between px-2">
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-700 dark:text-gray-400">
            Showing {Math.min(startIndex + 1, totalFiltered)} to{" "}
            {Math.min(startIndex + pageSize, totalFiltered)} of {totalFiltered}{" "}
            entries
          </span>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-700 dark:text-gray-400">
              Rows per page:
            </span>
            <select
              class="select w-20"
              value={String(pageSize)}
              onChange={handlePageSizeChange}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
            </select>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="btn btn-sm btn-outline"
            onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            Previous
          </button>
          <span class="text-sm text-gray-700 dark:text-gray-400">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            type="button"
            class="btn btn-sm btn-outline"
            onClick={() =>
              handlePageChange(Math.min(totalPages - 1, currentPage + 1))
            }
            disabled={currentPage >= totalPages - 1 || totalPages === 0}
          >
            Next
          </button>
        </div>
      </div>

      {/* Edit Invoice Dialog */}
      <dialog
        id="edit-invoice-dialog"
        class="dialog"
        onClick={(e: MouseEvent) => {
          if (e.target === e.currentTarget) handleEditCancel();
        }}
      >
        <div>
          <header>
            <h2>Edit Invoice</h2>
          </header>
          <section class="grid gap-4 py-4">
            <div class="grid gap-2">
              <label class="label" for="edit-email">
                Email
              </label>
              <input
                id="edit-email"
                type="email"
                class="input"
                value={editingRow?.email ?? ""}
                onInput={(e: Event) =>
                  handleEditField("email", (e.target as HTMLInputElement).value)
                }
              />
            </div>
            <div class="grid gap-2">
              <label class="label" for="edit-amount">
                Amount
              </label>
              <input
                id="edit-amount"
                type="number"
                class="input"
                value={
                  editingRow?.amount != null ? String(editingRow.amount) : ""
                }
                onInput={(e: Event) =>
                  handleEditField(
                    "amount",
                    Number((e.target as HTMLInputElement).value),
                  )
                }
              />
            </div>
            <div class="grid gap-2">
              <label class="label" for="edit-status">
                Status
              </label>
              <select
                id="edit-status"
                class="select"
                value={editingRow?.status ?? "Paid"}
                onChange={(e: Event) =>
                  handleEditField(
                    "status",
                    (e.target as HTMLSelectElement).value,
                  )
                }
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
          </section>
          <footer class="flex justify-end gap-2">
            <button
              type="button"
              class="btn btn-outline"
              onClick={handleEditCancel}
            >
              Cancel
            </button>
            <button type="button" class="btn" onClick={handleEditSave}>
              Save changes
            </button>
          </footer>
        </div>
      </dialog>
    </div>
  );
};

const DataviewTable: FC = () => {
  const ref = createRef<HTMLDivElement>();

  tableStore.subscribe(() => $(ref).jsx(<DataviewTableContent />));

  return (
    <div ref={ref}>
      <DataviewTableContent />
    </div>
  );
};

export const TableScreen: FC = () => {
  return (
    <div class="space-y-2">
      <h1 class="text-3xl font-bold tracking-tight">Table</h1>
      <p class="text-lg text-muted-foreground">A responsive table component.</p>

      <CodePreview
        code={`<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Invoice</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>INV001</TableCell>
      <TableCell>Paid</TableCell>
      <TableCell>$250.00</TableCell>
    </TableRow>
    <TableRow>
      <TableCell>INV002</TableCell>
      <TableCell>Pending</TableCell>
      <TableCell>$150.00</TableCell>
    </TableRow>
  </TableBody>
</Table>`}
        language="tsx"
        className="overflow-x-auto w-full max-w-2xl"
      >
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="font-medium">INV001</td>
                <td>Paid</td>
                <td class="text-right">$250.00</td>
              </tr>
              <tr>
                <td class="font-medium">INV002</td>
                <td>Pending</td>
                <td class="text-right">$150.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-bold tracking-tight mt-8 mb-2">Empty Table</h2>

      <CodePreview
        code={`<Table>
  <TableCaption>A list of invoices.</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Invoice</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>INV001</TableCell>
      <TableCell>Paid</TableCell>
      <TableCell>$250.00</TableCell>
    </TableRow>
    <TableRow>
      <TableCell>INV002</TableCell>
      <TableCell>Pending</TableCell>
      <TableCell>$150.00</TableCell>
    </TableRow>
  </TableBody>
</Table>`}
        language="tsx"
        className="overflow-x-auto w-full max-w-2xl"
      >
        <div class="overflow-x-auto">
          <table class="table">
            <caption>A list of your recent invoices.</caption>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
          </table>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-bold tracking-tight mt-8 mb-2">
        Selectable Table
      </h2>

      <CodePreview
        code={`<Table>
  <TableHeader>
    <TableRow>
      <TableHead class="w-16">
        <input type="checkbox" class="checkbox" />
      </TableHead>
      <TableHead>Invoice</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>
        <input type="checkbox" class="checkbox" />
      </TableCell>
      <TableCell>INV001</TableCell>
      <TableCell>Paid</TableCell>
      <TableCell>$250.00</TableCell>
    </TableRow>
    <TableRow>
      <TableCell>
        <input type="checkbox" class="checkbox" />
      </TableCell>
      <TableCell>INV002</TableCell>
      <TableCell>Pending</TableCell>
      <TableCell>$150.00</TableCell>
    </TableRow>
  </TableBody>
</Table>`}
        language="tsx"
        className="overflow-x-auto w-full max-w-2xl"
      >
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th class="w-16">
                  <input type="checkbox" class="checkbox" />
                </th>
                <th>Invoice</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <input type="checkbox" class="checkbox" />
                </td>
                <td class="font-medium">INV001</td>
                <td>Paid</td>
                <td class="text-right">$250.00</td>
              </tr>
              <tr>
                <td>
                  <input type="checkbox" class="checkbox" />
                </td>
                <td class="font-medium">INV002</td>
                <td>Pending</td>
                <td class="text-right">$150.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CodePreview>

      <CodePreview
        code={`<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Invoice</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Amount</TableHead>
      <TableHead class="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>INV001</TableCell>
      <TableCell>Paid</TableCell>
      <TableCell>$250.00</TableCell>
      <TableCell class="text-right">
        <button class="btn btn-sm">Edit</button>
        <button class="btn btn-sm btn-ghost">Delete</button>
      </TableCell>
    </TableRow>
    <TableRow>
      <TableCell>INV002</TableCell>
      <TableCell>Pending</TableCell>
      <TableCell>$150.00</TableCell>
      <TableCell class="text-right">
        <button class="btn btn-sm">Edit</button>
        <button class="btn btn-sm btn-ghost">Delete</button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>`}
        language="tsx"
        className="overflow-x-auto w-full max-w-2xl"
      >
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Status</th>
                <th>Amount</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="font-medium">INV001</td>
                <td>Paid</td>
                <td class="text-right">$250.00</td>
                <td class="text-right">
                  <button type="button" class="btn btn-sm">
                    Edit
                  </button>
                </td>
              </tr>
              <tr>
                <td class="font-medium">INV002</td>
                <td>Pending</td>
                <td class="text-right">$150.00</td>
                <td class="text-right">
                  <button type="button" class="btn btn-sm">
                    Edit
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-bold tracking-tight mt-8 mb-2">
        Rich Data Table with Filters, Sorting, and Pagination
      </h2>
      <p class="text-lg text-muted-foreground mb-6">
        A comprehensive table example featuring search/filtering, clickable
        sorting headers, and pagination controls.
      </p>

      <CodePreview
        code={`import { $, createRef, createStore } from "defuss";
import { createDataview, applyDataview } from "defuss-dataview";
import type { DataviewState } from "defuss-dataview";

const initialData = [
  { id: "INV001", amount: 250, status: "Paid", email: "sponge@example.com" },
  // ...
];

interface TableState {
  view: DataviewState;
  searchQuery: string;
  statusFilter: string;
}

export function DataviewTable() {
  const ref = createRef<HTMLDivElement>();
  const store = createStore<TableState>({
    view: createDataview({
      sorters: [{ field: "id", direction: "asc" }],
      page: 0,
      pageSize: 5,
    }),
    searchQuery: "",
    statusFilter: "all",
  });

  const computeDerived = () => {
    const { view, searchQuery, statusFilter } = store.value;
    const filters = [];
    if (searchQuery) filters.push({ field: "id", op: "contains", value: searchQuery });
    if (statusFilter !== "all") filters.push({ field: "status", op: "eq", value: statusFilter });
    const currentView = createDataview({ ...view, filters });
    const entries = applyDataview(initialData, currentView);
    // ... compute pagination info
    return { entries, /* ... */ };
  };

  const handleSort = (field: string) => {
    const { view } = store.value;
    const dir = view.sorters[0]?.field === field && view.sorters[0].direction === "asc" ? "desc" : "asc";
    store.set("view", createDataview({ ...view, sorters: [{ field, direction: dir }], page: 0 }));
  };

  const renderTable = () => {
    const { entries } = computeDerived();
    return (
      <div ref={ref}>
        {/* table markup using entries */}
      </div>
    );
  };

  // Re-render on state change
  store.subscribe(() => $(ref).jsx(renderTable()));

  return renderTable();
}`}
        language="tsx"
        className="w-full max-w-4xl"
      >
        <DataviewTable />
      </CodePreview>
    </div>
  );
};
