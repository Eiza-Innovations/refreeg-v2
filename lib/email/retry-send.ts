type SendResult = { success: boolean; error?: unknown };

/**
 * Runs a mail send again when it reports failure (a timeout or a dropped
 * connection), up to `attempts` tries in total, and returns the last result.
 * Sends that answer the browser first would otherwise lose the message
 * silently on one bad connection.
 */
export async function retrySend<T extends SendResult>(
  send: () => Promise<T>,
  attempts = 2,
): Promise<T> {
  let result = await send();
  for (let attempt = 1; attempt < attempts && !result.success; attempt++) {
    console.error(`Email attempt ${attempt} failed, retrying:`, result.error);
    result = await send();
  }
  return result;
}
