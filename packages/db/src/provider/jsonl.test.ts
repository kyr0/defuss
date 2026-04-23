import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { JsonlProvider } from "./jsonl.js";
import { defineTable, type DefussRecord } from "../types.js";

interface TestUser extends DefussRecord {
  name: string;
  age: number;
  email: string;
  profile: {
    city: string;
  };
  createdAt: Date;
  visits: bigint;
  avatar: ArrayBuffer;
  attachment: Blob;
}

const tableDefinition = defineTable<TestUser>({
  name: "jsonl_users_v2",
  indexes: [
    { name: "email", source: "email", unique: true },
    { name: "city", source: "profile.city" },
  ],
});

function createAvatar(seed: number): ArrayBuffer {
  const bytes = new Uint8Array(new ArrayBuffer(8));
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = (seed + index) % 255;
  }
  return bytes.buffer.slice(0);
}

function createUser(input: {
  name: string;
  age: number;
  email: string;
  city: string;
  seed: number;
}): TestUser {
  return {
    name: input.name,
    age: input.age,
    email: input.email,
    profile: {
      city: input.city,
    },
    createdAt: new Date(`2026-02-${String((input.seed % 9) + 1).padStart(2, "0")}T10:00:00.000Z`),
    visits: BigInt(2000 + input.seed),
    avatar: createAvatar(input.seed),
    attachment: new Blob([`${input.email}:${input.city}`], {
      type: "text/plain",
    }),
  };
}

async function expectBlobLikeEqual(actual: unknown, expected: Blob): Promise<void> {
  expect(actual).toBeTruthy();
  expect(typeof (actual as Blob).text).toBe("function");
  expect(typeof (actual as Blob).arrayBuffer).toBe("function");
  expect((actual as Blob).type).toBe(expected.type);
  expect(await (actual as Blob).text()).toBe(await expected.text());
}

describe("JsonlProvider", () => {
  let provider: JsonlProvider;
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(os.tmpdir(), "defuss-db-jsonl-provider-"));
    provider = new JsonlProvider();
    await provider.connect({ baseDir });
    await provider.ensureTable(tableDefinition);
  });

  afterEach(async () => {
    await provider.disconnect();
    await rm(baseDir, { recursive: true, force: true });
  });

  it("creates the declared table file", async () => {
    const filePath = path.join(baseDir, `${tableDefinition.name}.jsonl`);
    const fileInfo = await stat(filePath);

    expect(fileInfo.isFile()).toBe(true);
  });

  it("inserts and finds records by declared and undeclared selectors", async () => {
    const insertedId = await provider.insert(tableDefinition, createUser({
      name: "Alice",
      age: 30,
      email: "alice@example.com",
      city: "Berlin",
      seed: 1,
    }));

    await provider.insert(tableDefinition, createUser({
      name: "Anna",
      age: 31,
      email: "anna@example.com",
      city: "Berlin",
      seed: 2,
    }));

    const byEmail = await provider.findOne(tableDefinition, { email: "alice@example.com" });
    const byName = await provider.findOne(tableDefinition, { name: "Alice" });
    const byCity = await provider.find(tableDefinition, { "profile.city": "Berlin" });

    expect(byEmail?.id).toBe(insertedId);
    expect(byName?.email).toBe("alice@example.com");
    expect(byCity).toHaveLength(2);
  });

  it("preserves structured payload values", async () => {
    const expected = createUser({
      name: "Binary",
      age: 31,
      email: "binary@example.com",
      city: "Hamburg",
      seed: 3,
    });

    await provider.insert(tableDefinition, expected);

    const record = await provider.findOne(tableDefinition, { email: "binary@example.com" });
    expect(record?.avatar).toBeInstanceOf(ArrayBuffer);
    expect([...new Uint8Array(record?.avatar as ArrayBuffer)]).toEqual([
      ...new Uint8Array(expected.avatar),
    ]);
    await expectBlobLikeEqual(record?.attachment, expected.attachment);
    expect(record?.createdAt).toBeInstanceOf(Date);
    expect((record?.createdAt as Date).toISOString()).toBe(expected.createdAt.toISOString());
    expect(record?.visits).toBe(expected.visits);
  });

  it("updates and deletes by selector and rewrites the table file", async () => {
    await provider.insert(tableDefinition, createUser({
      name: "Carla",
      age: 24,
      email: "carla@example.com",
      city: "Munich",
      seed: 4,
    }));
    await provider.insert(tableDefinition, createUser({
      name: "Chris",
      age: 25,
      email: "chris@example.com",
      city: "Munich",
      seed: 5,
    }));
    await provider.insert(tableDefinition, createUser({
      name: "Dora",
      age: 26,
      email: "dora@example.com",
      city: "Cologne",
      seed: 6,
    }));

    await provider.update(tableDefinition, { email: "carla@example.com" }, { age: 29 });
    await provider.delete(tableDefinition, { "profile.city": "Munich" });

    const remaining = await provider.find(tableDefinition, {});
    const content = await readFile(path.join(baseDir, `${tableDefinition.name}.jsonl`), "utf8");
    const lines = content.trim().split("\n");

    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.email).toBe("dora@example.com");
    expect(lines).toHaveLength(1);
    expect(content).toContain("dora@example.com");
    expect(content).not.toContain("carla@example.com");
    expect(content).not.toContain("chris@example.com");
  });

  it("upserts on a unique selector without changing id", async () => {
    const insertedId = await provider.insert(tableDefinition, createUser({
      name: "Erin",
      age: 42,
      email: "erin@example.com",
      city: "Leipzig",
      seed: 7,
    }));

    const upsertedId = await provider.upsert(
      tableDefinition,
      { email: "erin@example.com" },
      createUser({
        name: "Erin",
        age: 43,
        email: "erin@example.com",
        city: "Leipzig",
        seed: 8,
      }),
    );

    const updated = await provider.findOne(tableDefinition, { email: "erin@example.com" });
    expect(upsertedId).toBe(insertedId);
    expect(updated?.id).toBe(insertedId);
    expect(updated?.age).toBe(43);
  });
});