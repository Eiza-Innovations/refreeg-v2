import "@testing-library/jest-dom";

if (
  typeof HTMLFormElement !== "undefined" &&
  !HTMLFormElement.prototype.requestSubmit
) {
  HTMLFormElement.prototype.requestSubmit = function requestSubmit() {
    this.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  };
}

// jsdom has no matchMedia, which gsap's ScrollTrigger registers against at
// import time (use-gsap powers the hero, bands and landing animations).
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const originalError = console.error;
const originalLog = console.log;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = String(args[0] ?? "");
    if (
      message.includes("Warning: ReactDOM.render") ||
      message.includes(
        "Not implemented: HTMLFormElement.prototype.requestSubmit",
      ) ||
      message.includes("Not implemented: navigation")
    ) {
      return;
    }
    originalError(...args);
  };

  console.log = (...args: unknown[]) => {
    const message = String(args[0] ?? "");
    if (message.includes("[health]")) {
      return;
    }
    originalLog(...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.log = originalLog;
});
