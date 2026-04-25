import {
	avgBy,
	countRows,
	createAggregation,
	DefussTable,
	defineTable,
	firstBy,
	lastBy,
	maxBy,
	minBy,
	sumBy,
} from "./index.js";
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

	it("supports removeFields, field sorting, and distinctBy keep-last semantics", async () => {
		const rows = [
			{
				id: "o1",
				customer: "Ada",
				order: 1,
				meta: { secret: "a", region: "eu" },
			},
			{
				id: "o2",
				customer: "Ada",
				order: 2,
				meta: { secret: "b", region: "eu" },
			},
			{
				id: "o3",
				customer: "Linus",
				order: 3,
				meta: { secret: "c", region: "us" },
			},
			{
				id: "o4",
				customer: "Linus",
				order: 4,
				meta: { secret: "d", region: "us" },
			},
		];

		const result = await createAggregation({ rows, as: "orders" })
			.sortBy([
				{ field: "orders.customer", direction: "asc" },
				{ field: "orders.order", direction: "asc" },
			])
			.distinctBy("orders.customer", { keep: "last" })
			.removeFields(["orders.meta.secret"])
			.project({
				customer: "orders.customer",
				order: "orders.order",
				meta: "orders.meta",
			})
			.execute();

		expect(result).toEqual([
			{
				customer: "Ada",
				order: 2,
				meta: { region: "eu" },
			},
			{
				customer: "Linus",
				order: 4,
				meta: { region: "us" },
			},
		]);
	});

	it("supports mergeConsecutive after sorting rows into stable groups", async () => {
		const rows = [
			{ id: "o1", customer: "Linus", total: 4 },
			{ id: "o2", customer: "Ada", total: 2 },
			{ id: "o3", customer: "Ada", total: 3 },
			{ id: "o4", customer: "Linus", total: 5 },
		];

		const result = await createAggregation({ rows, as: "orders" })
			.project({
				customer: "orders.customer",
				total: "orders.total",
			})
			.sortBy({ field: "customer", direction: "asc" })
			.mergeConsecutive((left, right) => {
				if (left.customer !== right.customer) {
					return undefined;
				}

				return {
					customer: left.customer,
					total: Number(left.total) + Number(right.total),
				};
			})
			.execute();

		expect(result).toEqual([
			{ customer: "Ada", total: 5 },
			{ customer: "Linus", total: 9 },
		]);
	});

	it("supports groupBy reducers and comparator sorting", async () => {
		const rows = [
			{ id: "o1", customer: "Ada", city: "Berlin", total: 10 },
			{ id: "o2", customer: "Ada", city: "Berlin", total: 25 },
			{ id: "o3", customer: "Linus", city: "Helsinki", total: 5 },
			{ id: "o4", customer: "Linus", city: "Helsinki", total: 15 },
		];

		const result = await createAggregation({ rows, as: "orders" })
			.groupBy(
				{
					customer: "orders.customer",
					city: "orders.city",
				},
				{
					orderCount: countRows(),
					totalAmount: sumBy("orders.total"),
					averageAmount: avgBy("orders.total"),
					minimumAmount: minBy("orders.total"),
					maximumAmount: maxBy("orders.total"),
					firstOrderId: firstBy("orders.id"),
					lastOrderId: lastBy("orders.id"),
				},
			)
			.sortBy((left, right) => Number(right.totalAmount) - Number(left.totalAmount))
			.execute();

		expect(result).toEqual([
			{
				customer: "Ada",
				city: "Berlin",
				orderCount: 2,
				totalAmount: 35,
				averageAmount: 17.5,
				minimumAmount: 10,
				maximumAmount: 25,
				firstOrderId: "o1",
				lastOrderId: "o2",
			},
			{
				customer: "Linus",
				city: "Helsinki",
				orderCount: 2,
				totalAmount: 20,
				averageAmount: 10,
				minimumAmount: 5,
				maximumAmount: 15,
				firstOrderId: "o3",
				lastOrderId: "o4",
			},
		]);
	});
});