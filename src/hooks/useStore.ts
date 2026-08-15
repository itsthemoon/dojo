import { useSyncExternalStore } from "react";
import { getState, subscribe } from "../lib/store";
import type { AppState } from "../lib/types";

/** Subscribe to the whole store; components re-render on any change. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState);
}
