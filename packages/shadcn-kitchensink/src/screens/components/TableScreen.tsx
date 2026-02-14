import type { FC } from "defuss";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableCaption,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const TableScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Table</h1>
            <p class="text-lg text-muted-foreground">A responsive table component.</p>
            <CodePreview code={`<Table>
  <TableCaption>A list of invoices.</TableCaption>
  <TableHeader>
    <TableRow><TableHead>Invoice</TableHead><TableHead>Status</TableHead><TableHead>Amount</TableHead></TableRow>
  </TableHeader>
  <TableBody>
    <TableRow><TableCell>INV001</TableCell><TableCell>Paid</TableCell><TableCell>$250.00</TableCell></TableRow>
    <TableRow><TableCell>INV002</TableCell><TableCell>Pending</TableCell><TableCell>$150.00</TableCell></TableRow>
  </TableBody>
</Table>`} language="tsx" className="overflow-x-auto w-full max-w-2xl">
                <div class="overflow-x-auto">
<table class="table">
  <caption>A list of your recent invoices.</caption>
  <thead>
    <tr>
      <th>Invoice</th>
      <th>Status</th>
      <th>Method</th>
      <th>Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="font-medium">INV001</td>
      <td>Paid</td>
      <td>Credit Card</td>
      <td class="text-right">$250.00</td>
    </tr>
    <tr>
      <td class="font-medium">INV002</td>
      <td>Pending</td>
      <td>PayPal</td>
      <td class="text-right">$150.00</td>
    </tr>
    <tr>
      <td class="font-medium">INV003</td>
      <td>Unpaid</td>
      <td>Bank Transfer</td>
      <td class="text-right">$350.00</td>
    </tr>
    <tr>
      <td class="font-medium">INV004</td>
      <td>Paid</td>
      <td>Paypal</td>
      <td class="text-right">$450.00</td>
    </tr>
    <tr>
      <td class="font-medium">INV005</td>
      <td>Paid</td>
      <td>Credit Card</td>
      <td class="text-right">$550.00</td>
    </tr>
    <tr>
      <td class="font-medium">INV006</td>
      <td>Pending</td>
      <td>Bank Transfer</td>
      <td class="text-right">$200.00</td>
    </tr>
    <tr>
      <td class="font-medium">INV007</td>
      <td>Unpaid</td>
      <td>Credit Card</td>
      <td class="text-right">$300.00</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td colspan={3}>Total</td>
      <td class="text-right">$2,500.00</td>
    </tr>
  </tfoot>
</table>
</div>
            </CodePreview>
        </div>
    );
};
