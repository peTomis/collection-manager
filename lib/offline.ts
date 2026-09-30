import { useSyncExternalStore } from "react";
import { OFFLINE_META, OfflineMeta, offlineStore } from "./offline-store";

const listeners = new Set<() => void>();
let busy = false;
export const getOfflineMeta = (): OfflineMeta | null => {
  if (typeof window === "undefined") return null;
  try {
    const m = JSON.parse(localStorage.getItem(OFFLINE_META) ?? "null");
    return m?.id && m?.user && typeof m.enabled === "boolean" ? m : null;
  } catch {
    return null;
  }
};
export const isOffline = () => getOfflineMeta()?.enabled === true;
export const isReadOnly = () => isOffline() || busy;
export const assertEditable = () => {
  if (isReadOnly()) throw new Error("Offline mode is read-only. Turn it off in Settings to edit your collection.");
};
export const notifyOffline = () => listeners.forEach((listener) => listener());
export const setOfflineBusy = (value: boolean) => {
  busy = value;
  notifyOffline();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};
export const useOffline = () => useSyncExternalStore(subscribe, isOffline, () => false);
export const useReadOnly = () => useSyncExternalStore(subscribe, isReadOnly, () => false);
export async function setOfflineMeta(meta: OfflineMeta) {
  // Test localStorage before switching the worker to the new snapshot.
  const old = localStorage.getItem(OFFLINE_META);
  localStorage.setItem(OFFLINE_META, JSON.stringify(meta));
  try {
    await offlineStore("active", meta);
  } catch (error) {
    if (old) localStorage.setItem(OFFLINE_META, old);
    else localStorage.removeItem(OFFLINE_META);
    throw error;
  }
  notifyOffline();
}
