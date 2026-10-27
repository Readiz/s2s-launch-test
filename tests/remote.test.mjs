import test from "node:test";
import assert from "node:assert/strict";
import { remoteKey, remoteDestination } from "../hub/remote.mjs";

test("TV numeric-only keys work even when key is Unidentified", () => {
  const expected = {
    13: "Enter",
    27: "Back",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    10009: "Back",
  };
  for (const [code, key] of Object.entries(expected)) {
    for (const raw of [undefined, "", "Unidentified", "Unknown"])
      assert.equal(remoteKey({ key: raw, keyCode: Number(code) }), key);
    assert.equal(
      remoteKey({ key: "Unidentified", keyCode: 0, which: Number(code) }),
      key,
    );
  }
});
test("browser keyboard names and remote confirm/back aliases are retained", () => {
  for (const key of [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Enter",
    "Tab",
  ])
    assert.equal(remoteKey({ key }), key);
  for (const key of [
    "Escape",
    "Back",
    "Backspace",
    "BrowserBack",
    "GoBack",
    "Return",
  ])
    assert.equal(remoteKey({ key }), "Back");
  for (const key of ["Select", "OK"]) assert.equal(remoteKey({ key }), "Enter");
  assert.equal(remoteKey({ key: "Unidentified", keyCode: 10009 }), "Back");
});
const rows = [
  ["home", "games", "consoleNav", "fullscreen", "info"],
  ["play"],
  ["cardA", "cardB", "cardC"],
  ["iconA", "iconB", "iconC", "console"],
];
test("the icon dock wraps horizontally and preserves the selected game between rows", () => {
  const preferred = [1, 0, 1, 1];
  assert.equal(
    remoteDestination(rows, "iconA", "ArrowLeft", preferred),
    "console",
  );
  assert.equal(
    remoteDestination(rows, "console", "ArrowRight", preferred),
    "iconA",
  );
  assert.equal(remoteDestination(rows, "iconB", "ArrowUp", preferred), "cardB");
  assert.equal(
    remoteDestination(rows, "cardB", "ArrowDown", preferred),
    "iconB",
  );
  assert.equal(
    remoteDestination(rows, "console", "ArrowUp", preferred),
    "cardB",
  );
  assert.equal(remoteDestination(rows, "play", "ArrowUp", preferred), "games");
  assert.equal(
    remoteDestination(rows, "games", "ArrowDown", preferred),
    "play",
  );
  assert.equal(
    remoteDestination(rows, "play", "ArrowDown", preferred),
    "cardB",
  );
});
test("focus stays within the top/bottom rows and unrelated keys do not move it", () => {
  assert.equal(
    remoteDestination(rows, "info", "ArrowUp", [1, 0, 2, 2]),
    "info",
  );
  assert.equal(
    remoteDestination(rows, "console", "ArrowDown", [1, 0, 2, 2]),
    "console",
  );
  assert.equal(
    remoteDestination(rows, "unknown", "ArrowLeft", [1, 0, 2, 2]),
    "iconC",
  );
  assert.equal(remoteDestination(rows, "iconA", "Enter"), null);
});
