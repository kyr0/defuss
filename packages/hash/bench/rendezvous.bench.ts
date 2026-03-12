import { bench, describe } from "vitest";
import { fnv1a64, rendezvousScore, pickResponsiblePeer, isResponsibleForWorkItem } from "../src/rendezvous.js";

describe("fnv1a64", () => {
	const shortKey = "item-42";
	const longKey = "a".repeat(1024);

	bench("short string (7 chars)", () => {
		fnv1a64(shortKey);
	});

	bench("long string (1024 chars)", () => {
		fnv1a64(longKey);
	});
});

describe("rendezvousScore", () => {
	bench("single score computation", () => {
		rendezvousScore("item-42", "peer-7");
	});
});

describe("pickResponsiblePeer", () => {
	const peers8 = Array.from({ length: 8 }, (_, i) => `peer-${i}`);
	const peers64 = Array.from({ length: 64 }, (_, i) => `peer-${i}`);
	const peers256 = Array.from({ length: 256 }, (_, i) => `peer-${i}`);

	bench("8 peers", () => {
		pickResponsiblePeer("item-42", peers8);
	});

	bench("64 peers", () => {
		pickResponsiblePeer("item-42", peers64);
	});

	bench("256 peers", () => {
		pickResponsiblePeer("item-42", peers256);
	});
});

describe("isResponsibleForWorkItem", () => {
	const peers8 = Array.from({ length: 8 }, (_, i) => `peer-${i}`);

	bench("8 peers", () => {
		isResponsibleForWorkItem("peer-3", "item-42", peers8);
	});
});
