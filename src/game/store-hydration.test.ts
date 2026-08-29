import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer, type ViteDevServer } from "vite";

class MemoryStorage {
  #values = new Map<string, string>();

  get length() {
    return this.#values.size;
  }

  clear() {
    this.#values.clear();
  }

  getItem(key: string) {
    return this.#values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.#values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.#values.delete(key);
  }

  setItem(key: string, value: string) {
    this.#values.set(key, String(value));
  }
}

type GameStoreModule = typeof import("./store");

let server: ViteDevServer;
let gameStore: GameStoreModule;
let storage: MemoryStorage;

before(async () => {
  storage = new MemoryStorage();
  storage.setItem(
    "yolk-rush-v4",
    JSON.stringify({
      bestTime: 42.5,
      wins: 3,
      coins: 80,
      playerName: "Saved Yolk",
      gamesPlayed: 7,
      xp: 123,
      gfx: "low",
      levelId: "ice",
    }),
  );
  globalThis.localStorage = storage as unknown as Storage;

  server = await createServer({
    configFile: false,
    root: process.cwd(),
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
  });
  gameStore = (await server.ssrLoadModule("/src/game/store.ts")) as GameStoreModule;
});

after(async () => {
  await server.close();
  globalThis.localStorage = undefined as unknown as Storage;
});

test("the first store render remains deterministic when storage is populated", () => {
  const state = gameStore.useGameStore.getState();

  assert.equal(state.coins, 160);
  assert.equal(state.playerName, "Yolk");
  assert.equal(state.gamesPlayed, 0);
  assert.equal(state.levelId, "meadow");
});

test("post-mount reconciliation preserves valid saved player values", () => {
  gameStore.useGameStore.getState().reconcilePersisted();
  const state = gameStore.useGameStore.getState();

  assert.equal(state.bestTime, 42.5);
  assert.equal(state.wins, 3);
  assert.equal(state.coins, 80);
  assert.equal(state.playerName, "Saved Yolk");
  assert.equal(state.gamesPlayed, 7);
  assert.equal(state.xp, 123);
  assert.equal(state.gfx, "low");
  assert.equal(state.levelId, "ice");
});

test("v4 save is upgraded to v5 on first read and removed from legacy key", () => {
  // After reconcilePersisted, the loader should have:
  //   1. Written the migrated record to SAVE_KEY (yolk-rush-v5)
  //   2. Removed the v4 key
  const v5 = storage.getItem(gameStore.SAVE_KEY);
  assert.ok(v5, "v5 key should be populated after upgrade");
  const parsed = JSON.parse(v5) as Record<string, unknown>;
  assert.equal(parsed.bestTime, 42.5);
  assert.equal(parsed.coins, 80);
  assert.equal(parsed.playerName, "Saved Yolk");
  assert.equal(parsed.gfx, "low");

  assert.equal(storage.getItem("yolk-rush-v4"), null, "v4 key must be removed after upgrade");
});

test("settings continue writing to the v5 save key after upgrade", () => {
  gameStore.useGameStore.getState().setGfx("medium");

  const saved = JSON.parse(storage.getItem(gameStore.SAVE_KEY) ?? "{}") as Record<string, unknown>;
  assert.equal(saved.gfx, "medium");
  assert.equal(saved.coins, 80);
  assert.equal(saved.playerName, "Saved Yolk");
});

test("migrateV4ToV5 preserves every valid field and fills defaults for missing ones", () => {
  const migrated = gameStore.migrateV4ToV5({
    bestTime: 100,
    wins: 4,
    coins: 250,
    playerName: "Old Yolk",
    levelId: "meadow",
  });

  assert.equal(migrated.bestTime, 100);
  assert.equal(migrated.wins, 4);
  assert.equal(migrated.coins, 250);
  assert.equal(migrated.playerName, "Old Yolk");
  assert.equal(migrated.gfx, "auto");
  assert.equal(migrated.hapticOn, true);
  assert.equal(migrated.preferredLod, undefined);
  assert.equal(migrated.lastPreviewedSkinId, undefined);
});

test("v5-only fields round-trip through hydrate + save", () => {
  storage.clear();
  storage.setItem(
    gameStore.SAVE_KEY,
    JSON.stringify({
      bestTime: 0,
      coins: 100,
      ownedSkins: ["plain", "sprout", "mint_wings"],
      equippedSkin: "mint_wings",
      playerName: "V5 Yolk",
      preferredLod: "lod2",
      lastPreviewedSkinId: "egg_demo_model",
    }),
  );

  gameStore.useGameStore.getState().reconcilePersisted();
  const state = gameStore.useGameStore.getState();
  assert.equal(state.playerName, "V5 Yolk");

  // Trigger a save and verify v5 fields persist
  gameStore.useGameStore.getState().setPlayerName("V5 Reborn");
  const saved = JSON.parse(storage.getItem(gameStore.SAVE_KEY) ?? "{}") as Record<string, unknown>;
  assert.equal(saved.preferredLod, "lod2");
  assert.equal(saved.lastPreviewedSkinId, "egg_demo_model");
  assert.equal(saved.playerName, "V5 Reborn");
});

test("invalid v5 preferredLod values fall back to undefined", () => {
  storage.clear();
  storage.setItem(
    gameStore.SAVE_KEY,
    JSON.stringify({
      preferredLod: "lod999",
      lastPreviewedSkinId: "x".repeat(128),
    }),
  );

  gameStore.useGameStore.getState().reconcilePersisted();

  // No direct accessor on the store for v5-only fields; verify through save round-trip
  gameStore.useGameStore.getState().setPlayerName("Validator");
  const saved = JSON.parse(storage.getItem(gameStore.SAVE_KEY) ?? "{}") as Record<string, unknown>;
  assert.equal(saved.preferredLod, undefined);
  assert.equal(saved.lastPreviewedSkinId, undefined);
});