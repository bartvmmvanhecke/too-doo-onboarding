/** Preserve only demo choices while resetting session/meeting data. */
export function resetDemoStorage(storage: Storage, key: string) {
  const raw = storage.getItem(key);
  const saved = raw ? JSON.parse(raw) : null;
  storage.setItem(
    key,
    JSON.stringify({ version: 5, state: { demo: saved?.state?.demo ?? { login: "success", calendar: "series" } } }),
  );
}
