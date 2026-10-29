import { useEffect, useState } from "react";
import {
  cloudEnabled,
  connectSyncCode,
  createSyncCode,
  disconnectSync,
  getCloudStatus,
  getSyncCode,
  subscribeCloud,
  type CloudStatus,
} from "../lib/cloud";
import { Modal } from "./Modal";

const STATUS_LABEL: Record<CloudStatus, string> = {
  off: "not connected",
  connecting: "connecting…",
  ok: "synced",
  error: "sync error",
};

export function CloudSync() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<CloudStatus>(getCloudStatus());
  const [code, setCode] = useState<string | null>(getSyncCode());
  const [existing, setExisting] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setStatus(getCloudStatus());
      setCode(getSyncCode());
    };
    refresh();
    return subscribeCloud(refresh);
  }, []);

  if (!cloudEnabled) return null;

  async function create() {
    setBusy(true);
    setError("");
    try {
      setCode(await createSyncCode());
    } catch {
      setError("Could not create a sync code.");
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    setBusy(true);
    setError("");
    try {
      await connectSyncCode(existing);
      setCode(getSyncCode());
      setExisting("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy failed — select the code and copy it manually.");
    }
  }

  return (
    <>
      <button className="sync-btn" type="button" onClick={() => setOpen(true)}>
        ☁️ {code ? STATUS_LABEL[status] : "Sync"}
      </button>

      {open && (
        <Modal title="Cloud sync" onClose={() => setOpen(false)}>
          {code ? (
            <>
              <p className="sync-note">
                Encrypted in Firebase. This device is <strong>{STATUS_LABEL[status]}</strong>.
              </p>
              <label className="sync-label" htmlFor="sync-code">Sync code</label>
              <div className="sync-row">
                <code className="sync-code" id="sync-code">{code}</code>
                <button className="btn btn--ghost" type="button" onClick={copy}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="sync-warning">
                Anyone with this code can read and change the class data. Keep it private.
                Enter it on another device to connect it.
              </p>
              <div className="sheet__footer">
                <button className="btn btn--ghost" type="button" onClick={disconnectSync}>
                  Disconnect this device
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="sync-note">
                Sync classes across devices. Data is encrypted on this device before it
                reaches Firebase.
              </p>
              <button className="btn btn--primary" type="button" disabled={busy} onClick={create}>
                Create a sync code
              </button>
              <div className="sync-divider">or connect an existing board</div>
              <label className="sync-label" htmlFor="existing-code">Existing sync code</label>
              <div className="sync-row">
                <input
                  id="existing-code"
                  className="sync-input"
                  value={existing}
                  onChange={(e) => setExisting(e.target.value)}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Paste code"
                />
                <button className="btn btn--ghost" type="button" disabled={busy || !existing.trim()} onClick={connect}>
                  Connect
                </button>
              </div>
            </>
          )}
          {error && <p className="sync-error" role="alert">{error}</p>}
        </Modal>
      )}
    </>
  );
}
