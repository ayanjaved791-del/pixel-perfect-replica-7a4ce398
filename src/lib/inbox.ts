export type ClientInquiry = {
  id: string;
  fullName: string;
  email: string;
  company?: string;
  website?: string;
  services: string[];
  budget: string;
  timeline?: string;
  message?: string;
  hearAbout?: string;
  source: string;
  createdAt: string;
  status: "new" | "contacted" | "archived";
  notes?: string;
};

const STORAGE_KEY = "six2eight_realtime_client_inquiries_v2";
const BROADCAST_CHANNEL_NAME = "six2eight_inbox_channel";

// Dummy names to remove if found in any old caches
const DUMMY_EMAILS = ["m.vance@apexfintech.io", "elena@solarpulse.co", "julian@luminahealth.com"];

// Clean memory cache
let memoryInquiries: ClientInquiry[] = [];

// Broadcast channel for multi-tab instant real-time sync
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (e) {
    console.warn("BroadcastChannel not supported", e);
  }
}

/**
 * Filter out any legacy dummy / fake data from older builds
 */
function sanitize(items: unknown[]): ClientInquiry[] {
  if (!Array.isArray(items)) return [];
  return (items as ClientInquiry[]).filter((item) => {
    if (!item || typeof item !== "object") return false;
    if (typeof item.fullName !== "string" || !item.fullName.trim()) return false;
    if (typeof item.email !== "string" || !item.email.trim()) return false;
    if (DUMMY_EMAILS.includes(item.email.toLowerCase())) return false;
    if (item.fullName.toLowerCase().includes("marcus vance")) return false;
    if (item.fullName.toLowerCase().includes("elena rostova")) return false;
    if (item.fullName.toLowerCase().includes("julian thorne")) return false;
    return true;
  });
}

/**
 * Get all client inquiries from local cache / storage (100% clean of dummy data)
 */
export function getInquiries(): ClientInquiry[] {
  if (typeof window === "undefined") {
    return memoryInquiries;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return memoryInquiries;
    }
    const parsed = JSON.parse(raw);
    const cleaned = sanitize(parsed);
    // If dummy data was pruned, save back clean state
    if (cleaned.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    memoryInquiries = cleaned;
    return cleaned;
  } catch (err) {
    console.error("Failed to read inquiries from storage", err);
    return memoryInquiries;
  }
}

/**
 * Fetch real-time inquiries from the server API and merge with local storage
 */
export async function fetchServerInquiries(): Promise<ClientInquiry[]> {
  try {
    const res = await fetch("/api/inquiries", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const serverData = await res.json();
      if (Array.isArray(serverData)) {
        const cleanedServer = sanitize(serverData);
        const local = getInquiries();
        // Merge by unique id
        const map = new Map<string, ClientInquiry>();
        for (const item of local) map.set(item.id, item);
        for (const item of cleanedServer) {
          const existing = map.get(item.id);
          // Preserve local status updates if already modified locally
          if (existing && existing.status !== item.status) {
            map.set(item.id, { ...item, status: existing.status });
          } else {
            map.set(item.id, item);
          }
        }
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        memoryInquiries = merged;
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
        return merged;
      }
    }
  } catch (e) {
    // Network or server offline; graceful fallback to local storage
  }
  return getInquiries();
}

/**
 * Save new inquiry from any contact form on the website
 */
export async function saveInquiry(
  input: Omit<ClientInquiry, "id" | "createdAt" | "status">,
): Promise<ClientInquiry> {
  const newRecord: ClientInquiry = {
    ...input,
    id: `INQ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString(),
    status: "new",
  };

  const current = getInquiries();
  const updated = [newRecord, ...current];
  memoryInquiries = updated;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Broadcast real-time event to all open tabs / admin view
      window.dispatchEvent(new CustomEvent("six2eight_inquiry_added", { detail: newRecord }));
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: "INQUIRY_ADDED", payload: newRecord });
      }
    } catch (err) {
      console.error("Failed to save inquiry to storage", err);
    }
  }

  // Attempt to sync to server API asynchronously
  try {
    fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRecord),
    }).catch(() => {});
  } catch {
    // Silently continue with local storage
  }

  return newRecord;
}

/**
 * Update an inquiry status (new, contacted, archived)
 */
export async function updateInquiryStatus(
  id: string,
  status: ClientInquiry["status"],
): Promise<ClientInquiry[]> {
  const current = getInquiries();
  const updated = current.map((item) => (item.id === id ? { ...item, status } : item));
  memoryInquiries = updated;

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("six2eight_inquiry_updated"));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: "INQUIRY_STATUS_UPDATED", payload: { id, status } });
    }
  }

  try {
    fetch("/api/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => {});
  } catch {
    // Silently continue
  }

  return updated;
}

/**
 * Delete an inquiry
 */
export async function deleteInquiry(id: string): Promise<ClientInquiry[]> {
  const current = getInquiries();
  const updated = current.filter((item) => item.id !== id);
  memoryInquiries = updated;

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("six2eight_inquiry_updated"));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: "INQUIRY_DELETED", payload: { id } });
    }
  }

  try {
    fetch("/api/inquiries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  } catch {
    // Silently continue
  }

  return updated;
}

/**
 * Wipe all data
 */
export function clearAllInquiries(): ClientInquiry[] {
  memoryInquiries = [];
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("six2eight_inquiry_updated"));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: "INQUIRIES_CLEARED" });
    }
  }
  return [];
}
