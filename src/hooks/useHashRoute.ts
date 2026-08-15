import { useCallback, useSyncExternalStore } from "react";

export type Route =
  | { page: "picker" }
  | { page: "board"; classId: string }
  | { page: "display"; classId: string };

function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "class" && parts[1]) return { page: "board", classId: parts[1] };
  if (parts[0] === "display" && parts[1]) return { page: "display", classId: parts[1] };
  return { page: "picker" };
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function useHashRoute(): [Route, (to: string) => void] {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);
  return [parseHash(hash), navigate];
}

export function displayUrl(classId: string): string {
  const url = new URL(window.location.href);
  url.hash = `#/display/${classId}`;
  return url.toString();
}
