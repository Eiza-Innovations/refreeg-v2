import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  // Keep this low in production — traces are billed per-event and most of
  // this app's request volume doesn't need full performance tracing.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  // Session Replay: capture almost nothing on happy-path sessions, but
  // always capture the full replay when an error actually occurs.
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1,
  debug: false,
  // Browser extensions throw into pages they touch — e.g. Honey's Firefox
  // shim blows up on Chromium browsers with "undefined is not an object
  // (evaluating 'window.__firefox__.reader')". Those errors are not ours;
  // drop them so they neither bill nor page anyone.
  beforeSend(event, hint) {
    const error = hint?.originalException as { message?: string } | undefined;
    const message = `${error?.message ?? ""} ${event.message ?? ""}`;
    const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? [];
    const fromExtension = frames.some((frame) =>
      /extension|chrome-extension|moz-extension|__firefox__/.test(
        frame.filename ?? "",
      ),
    );
    if (
      /__firefox__|chrome\.runtime|extension context invalidated/i.test(
        message,
      ) ||
      fromExtension
    ) {
      return null;
    }
    return event;
  },
});

// Replay is ~100 KB; load it once the page is idle instead of on the critical path.
if (typeof window !== "undefined") {
  const loadReplay = () => {
    Sentry.lazyLoadIntegration("replayIntegration")
      .then((replayIntegration) => Sentry.addIntegration(replayIntegration()))
      .catch(() => {});
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(loadReplay, { timeout: 5000 });
  } else {
    setTimeout(loadReplay, 3000);
  }
}
