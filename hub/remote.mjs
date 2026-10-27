const keyCodes = {
  9: "Tab",
  13: "Enter",
  27: "Back",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  10009: "Back",
};
const aliases = {
  Escape: "Back",
  Backspace: "Back",
  BrowserBack: "Back",
  GoBack: "Back",
  Return: "Back",
  Select: "Enter",
  OK: "Enter",
};

// Some TV runtimes supply keyCode while key is empty or "Unidentified".
export function remoteKey(event) {
  const code = event.keyCode || event.which;
  if (keyCodes[code]) return keyCodes[code];
  return aliases[event.key] || event.key || "";
}

export function remoteDestination(rows, active, key, preferred = []) {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key))
    return null;
  let row = rows.findIndex((items) => items.includes(active));
  if (row < 0) return rows[rows.length - 1][preferred[rows.length - 1] || 0];
  const column = rows[row].indexOf(active);
  if (key === "ArrowLeft" || key === "ArrowRight") {
    const direction = key === "ArrowLeft" ? -1 : 1;
    return rows[row][
      (column + direction + rows[row].length) % rows[row].length
    ];
  }
  const next = Math.max(
    0,
    Math.min(rows.length - 1, row + (key === "ArrowUp" ? -1 : 1)),
  );
  if (next === row) return active;
  return rows[next][
    Math.max(0, Math.min(rows[next].length - 1, preferred[next] || 0))
  ];
}
