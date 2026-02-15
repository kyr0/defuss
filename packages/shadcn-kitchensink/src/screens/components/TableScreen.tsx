import type { FC } from "defuss";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

const data = [
  {
    id: "INV001",
    amount: "$250.00",
    status: "Paid",
    email: "sponge@example.com",
  },
  {
    id: "INV002",
    amount: "$150.00",
    status: "Pending",
    email: "patrick@example.com",
  },
  {
    id: "INV003",
    amount: "$350.00",
    status: "Unpaid",
    email: "squidward@example.com",
  },
  {
    id: "INV004",
    amount: "$450.00",
    status: "Paid",
    email: "bikini@example.com",
  },
];

export const TableScreen: FC = () => {
  return (
    <div class="space-y-6">
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


      <h2 class="text-2xl font-bold tracking-tight mt-8 mb-2">Selectable Table</h2>

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
                  <button class="btn btn-sm">Edit</button>
                </td>
              </tr>
              <tr>
                <td class="font-medium">INV002</td>
                <td>Pending</td>
                <td class="text-right">$150.00</td>
                <td class="text-right">
                  <button class="btn btn-sm">Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-bold tracking-tight mt-8 mb-2">
        Table with Filters, Sorting, and Pagination
      </h2>
      <p class="text-lg text-muted-foreground mb-6">
        A comprehensive table example featuring search/filtering, clickable
        sorting headers, and pagination controls.
      </p>

      <CodePreview
        code={`import { useState } from "defuss";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "defuss-shadcn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "defuss-shadcn";
import { Input } from "defuss-shadcn";
import { Button } from "defuss-shadcn";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-defuss";

const initialData = [
  { id: "INV001", amount: "$250.00", status: "Paid", email: "sponge@example.com" },
  { id: "INV002", amount: "$150.00", status: "Pending", email: "patrick@example.com" },
  { id: "INV003", amount: "$350.00", status: "Unpaid", email: "squidward@example.com" },
  { id: "INV004", amount: "$450.00", status: "Paid", email: "bikini@example.com" },
  { id: "INV005", amount: "$550.00", status: "Paid", email: "krabs@example.com" },
  { id: "INV006", amount: "$650.00", status: "Pending", email: "sandy@example.com" },
  { id: "INV007", amount: "$750.00", status: "Unpaid", email: "plankton@example.com" },
  { id: "INV008", amount: "$850.00", status: "Paid", email: "gary@example.com" },
  { id: "INV009", amount: "$950.00", status: "Unpaid", email: "manray@example.com" },
  { id: "INV010", amount: "$1050.00", status: "Paid", email: "wilson@example.com" },
];

export function TableWithFiltersSortingPagination() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"amount" | "status" | "id">("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filteredData = initialData
    .filter((item) => {
      const matchesSearch =
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortBy === "amount") {
        return direction * (parseInt(aValue) - parseInt(bValue));
      }
      return direction * aValue.localeCompare(bValue);
    });

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const handleSort = (column: "amount" | "status" | "id") => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid": return "success";
      case "Pending": return "warning";
      case "Unpaid": return "error";
      default: return "neutral";
    }
  };

  return (
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search invoices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          class="flex-1"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger class="w-full sm:w-48">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                onClick={() => handleSort("id")}
                class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <div class="flex items-center">
                  Invoice
                  {sortBy === "id" && (
                    sortDirection === "asc" ? <ChevronUpIcon class="ml-1 h-4 w-4" /> : <ChevronDownIcon class="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead
                onClick={() => handleSort("amount")}
                class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-right"
              >
                <div class="flex items-center justify-end">
                  Amount
                  {sortBy === "amount" && (
                    sortDirection === "asc" ? <ChevronUpIcon class="ml-1 h-4 w-4" /> : <ChevronDownIcon class="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell class="font-medium">{item.id}</TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell class="text-right">{item.amount}</TableCell>
                  <TableCell>
                    <span class={"badge badge-" + getStatusColor(item.status)}>
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="ghost" size="sm">Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} class="text-center py-8 text-gray-500">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div class="flex items-center justify-between px-2">
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-700 dark:text-gray-400">
            Showing {Math.min(startIndex + 1, filteredData.length)} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} entries
          </span>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-700 dark:text-gray-400">Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger class="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span class="text-sm text-gray-700 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}`}
        language="tsx"
        className="w-full max-w-4xl"
      >
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search invoices..."
              class="input flex-1"
              value=""
              onChange={() => {}}
            />
            <select class="select w-full sm:w-48">
              <option value="all">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>
          <div class="rounded-md border overflow-x-auto">
            <table class="table w-full">
              <thead>
                <tr>
                  <th class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div class="flex items-center">Invoice</div>
                  </th>
                  <th>Email</th>
                  <th class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-right">
                    <div class="flex items-center justify-end">Amount</div>
                  </th>
                  <th>Status</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="font-medium">INV001</td>
                  <td>sponge@example.com</td>
                  <td class="text-right">$250.00</td>
                  <td>
                    <span class="badge badge-success">Paid</span>
                  </td>
                  <td class="text-right">
                    <div class="flex justify-end gap-2">
                      <button class="btn btn-sm btn-outline">Edit</button>
                      <button class="btn btn-sm btn-ghost">Delete</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="font-medium">INV002</td>
                  <td>patrick@example.com</td>
                  <td class="text-right">$150.00</td>
                  <td>
                    <span class="badge badge-warning">Pending</span>
                  </td>
                  <td class="text-right">
                    <div class="flex justify-end gap-2">
                      <button class="btn btn-sm btn-outline">Edit</button>
                      <button class="btn btn-sm btn-ghost">Delete</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="font-medium">INV003</td>
                  <td>squidward@example.com</td>
                  <td class="text-right">$350.00</td>
                  <td>
                    <span class="badge badge-error">Unpaid</span>
                  </td>
                  <td class="text-right">
                    <div class="flex justify-end gap-2">
                      <button class="btn btn-sm btn-outline">Edit</button>
                      <button class="btn btn-sm btn-ghost">Delete</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="font-medium">INV004</td>
                  <td>bikini@example.com</td>
                  <td class="text-right">$450.00</td>
                  <td>
                    <span class="badge badge-success">Paid</span>
                  </td>
                  <td class="text-right">
                    <div class="flex justify-end gap-2">
                      <button class="btn btn-sm btn-outline">Edit</button>
                      <button class="btn btn-sm btn-ghost">Delete</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="font-medium">INV005</td>
                  <td>krabs@example.com</td>
                  <td class="text-right">$550.00</td>
                  <td>
                    <span class="badge badge-success">Paid</span>
                  </td>
                  <td class="text-right">
                    <div class="flex justify-end gap-2">
                      <button class="btn btn-sm btn-outline">Edit</button>
                      <button class="btn btn-sm btn-ghost">Delete</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="flex items-center justify-between px-2">
            <div class="flex items-center gap-4">
              <span class="text-sm text-gray-700 dark:text-gray-400">
                Showing 1 to 5 of 10 entries
              </span>
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-700 dark:text-gray-400">
                  Rows per page:
                </span>
                <select class="select w-20">
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                </select>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn btn-sm btn-outline">Previous</button>
              <span class="text-sm text-gray-700 dark:text-gray-400">
                Page 1 of 2
              </span>
              <button class="btn btn-sm btn-outline">Next</button>
            </div>
          </div>
        </div>
      </CodePreview>
    </div>
  );
};
