const SESSION_KEY = "rg_funnel_session";
const SESSION_MS = 12 * 60 * 60 * 1000;

function funnelSessionId(): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
    if (saved && Date.now() - saved.at < SESSION_MS) return saved.id;
    const id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, at: Date.now() }));
    return id;
  } catch {
    return null;
  }
}

/** Fire-and-forget; sendBeacon survives the redirect to the payment page. */
export function trackFunnelStep(
  causeId: string,
  step: "view" | "give" | "amount" | "payment",
  extra: { amount?: number; reference?: string } = {},
) {
  const sessionId = funnelSessionId();
  if (!sessionId || !causeId) return;
  const body = JSON.stringify({ causeId, sessionId, step, ...extra });
  const blob = new Blob([body], { type: "application/json" });
  if (navigator.sendBeacon?.("/api/funnel", blob)) return;
  fetch("/api/funnel", { method: "POST", body, keepalive: true }).catch(
    () => undefined,
  );
}
