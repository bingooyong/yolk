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

test("settings continue writing to the existing v4 save key", () => {
  gameStore.useGameStore.getState().setGfx("medium");

  const saved = JSON.parse(storage.getItem(gameStore.SAVE_KEY) ?? "{}") as Record<string, unknown>;
  assert.equal(saved.gfx, "medium");
  assert.equal(saved.coins, 80);
  assert.equal(saved.playerName, "Saved Yolk");
});
