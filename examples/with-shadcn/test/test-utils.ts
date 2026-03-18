export const createContainer = (): HTMLDivElement => {
  const el = document.createElement("div");
  el.id = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  document.body.appendChild(el);
  return el;
};

export const cleanup = (el: HTMLElement) => {
  el.remove();
};

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
