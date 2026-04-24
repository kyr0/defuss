import { createAggregation, DefussTable, defineTable } from "./index.js";
import { LibsqlProvider } from "./provider/libsql.js";
import type { DefussRecord } from "./types.js";

interface CustomerRecord extends DefussRecord {
	name: string;
	tier: string;
}

interface OrderRecord extends DefussRecord {
	customerId: string;
	status: string;
	total: number;
}

describe("aggregation builder", () => {
	it("supports array-backed joins, aliasing, projection, and async computed fields", async () => {
		const customers = [
			{ id: "c1", name: "Ada", tier: "pro" },
			{ id: "c2", name: "Linus", tier: "free" },
		];
		const orders = [
			{ id: "o1", customerId: "c1", total: 10 },
			{ id: "o2", customerId: "c1", total: 25 },
			{ id: "o3", customerId: "unknown", total: 30 },
		];

		const result = await createAggregation({ rows: customers, as: "customers" })
			.join({ rows: orders, as: "orders" }, { type: "left", left: "customers.id", right: "customerId" })
			.alias({
				customerName: "customers.name",
				orderId: "orders.id",
			})
			.compute("hasOrder", async (row) => row.orders !== null)
			.project({
				customerName: "customerName",
				orderId: "orderId",
				hasOrder: (row) => row.hasOrder,
			})
			.execute();

		expect(result).toEqual([
			{
				customerName: "Ada",
				orderId: "o1",
				hasOrder: true,
			},
			{
				customerName: "Ada",
				orderId: "o2",
				hasOrder: true,
			},
			{
				customerName: "Linus",
				orderId: null,
				hasOrder: false,
			},
		]);
	});

	it("supports right joins and nulls unmatched current rows", async () => {
		const customers = [{ id: "c1", name: "Ada" }];
		const orders = [
			{ id: "o1", customerId: "c1" },
			{ id: "o2", customerId: "missing" },
		];

		const result = await createAggregation({ rows: customers, as: "customers" })
			.join({ rows: orders, as: "orders" }, { type: "right", left: "customers.id", right: "customerId" })
			.execute();

		expect(result).toEqual([
			{
				customers: {
					id: "c1",
					name: "Ada",
				},
				orders: {
					id: "o1",
					customerId: "c1",
				},
			},
			{
				customers: null,
				orders: {
					id: "o2",
					customerId: "missing",
				},
			},
		]);
	});

	it("loads table-backed sources with per-source selectors before joining", async () => {
		const provider = new LibsqlProvider();
		await provider.connect({ url: ":memory:" });

		const customerTableDefinition = defineTable<CustomerRecord>({
			name: "aggregation_customers",
			indexes: [{ name: "name", source: "name" }],
		});
		const orderTableDefinition = defineTable<OrderRecord>({
			name: "aggregation_orders",
			indexes: [
				{ name: "customerId", source: "customerId" },
				{ name: "status", source: "status" },
			],
		});

		const customers = new DefussTable(provider, customerTableDefinition);
		const orders = new DefussTable(provider, orderTableDefinition);
		await customers.init();
		await orders.init();

		await customers.insert({ id: "c1", name: "Ada", tier: "pro" });
		await customers.insert({ id: "c2", name: "Linus", tier: "free" });

		await orders.insert({ id: "o1", customerId: "c1", status: "paid", total: 10 });
		await orders.insert({ id: "o2", customerId: "c1", status: "draft", total: 12 });
		await orders.insert({ id: "o3", customerId: "c2", status: "paid", total: 20 });

		const result = await customers
			.aggregate({ where: { name: "Ada" } })
			.join(
				{ table: orders, as: "orders", where: { status: "paid" } },
				{ type: "left", left: "base.id", right: "customerId" },
			)
			.alias({
				customerName: "base.name",
				orderStatus: "orders.status",
				orderTotal: "orders.total",
			})
			.project({
				customerName: "customerName",
				orderStatus: "orderStatus",
				orderTotal: "orderTotal",
			})
			.execute();

		expect(result).toEqual([
			{
				customerName: "Ada",
				orderStatus: "paid",
				orderTotal: 10,
			},
		]);

		await provider.disconnect();
	});
});