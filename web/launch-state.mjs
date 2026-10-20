// A new launch or home command invalidates any previous loading completion.
export function createLaunchState(onChange, { delay = 2200, schedule = setTimeout, cancel = clearTimeout } = {}) {
  let timer, generation = 0;
  return {
    launch(app) {
      cancel(timer);
      const current = ++generation;
      if (!app) { onChange({ phase: 'home', app: null }); return; }
      onChange({ phase: 'loading', app });
      timer = schedule(() => {
        if (current === generation) onChange({ phase: 'ready', app });
      }, delay);
    },
    close() { generation++; cancel(timer); }
  };
}
