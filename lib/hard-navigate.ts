/** Full page load to `url`, used when the session must be re-read, such as after onboarding. */
export function hardNavigate(url: string) {
  window.location.assign(url);
}
