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

const STORAGE_KEY = "six2eight_client_inquiries_v1";

const SEED_INQUIRIES: ClientInquiry[] = [
  {
    id: "INQ-2026-003",
    fullName: "Marcus Vance",
    email: "m.vance@apexfintech.io",
    company: "Apex Fintech Capital",
    website: "https://apexfintech.io",
    services: ["Web Development", "UI/UX Product Design", "Web Applications & SaaS"],
    budget: "$50,000 – $100,000",
    timeline: "Immediate (Next 1-2 weeks)",
    message:
      "We are looking to rebuild our institutional investment platform portal. Need real-time transaction dashboards and modern typography.",
    hearAbout: "Client Referral",
    source: "/contact",
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(), // 42 mins ago
    status: "new",
  },
  {
    id: "INQ-2026-002",
    fullName: "Elena Rostova",
    email: "elena@solarpulse.co",
    company: "SolarPulse Energy",
    website: "https://solarpulse.co",
    services: ["Shopify & E-commerce", "Branding & Positioning", "SEO & Organic Growth"],
    budget: "$25,000 – $50,000",
    timeline: "1 – 2 Months",
    message:
      "Launching next-gen portable renewable generators. We need high-converting landing pages, interactive product 3D showcases, and Shopify custom theme.",
    hearAbout: "Google Search",
    source: "/#contact",
    createdAt: new Date(Date.now() - 1000 * 60 * 195).toISOString(), // ~3 hours ago
    status: "contacted",
  },
  {
    id: "INQ-2026-001",
    fullName: "Julian Thorne",
    email: "julian@luminahealth.com",
    company: "Lumina Health AI",
    website: "https://luminahealth.com",
    services: ["Webflow / Custom CMS", "AI Automation & CRM"],
    budget: "$10,000 – $25,000",
    timeline: "Flexible / Exploring",
    message:
      "Looking for creative direction and Webflow CMS build for our series-A healthtech venture. Need integrations with HubSpot and Calendly.",
    hearAbout: "LinkedIn",
    source: "/services/web-development",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), // 22 hours ago
    status: "new",
  },
];

export function getInquiries(): ClientInquiry[] {
  if (typeof window === "undefined") return SEED_INQUIRIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_INQUIRIES));
      return SEED_INQUIRIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_INQUIRIES;
  } catch (err) {
    console.error("Failed to read inquiries from storage", err);
    return SEED_INQUIRIES;
  }
}

export function saveInquiry(
  input: Omit<ClientInquiry, "id" | "createdAt" | "status">,
): ClientInquiry {
  const current = getInquiries();
  const newRecord: ClientInquiry = {
    ...input,
    id: `INQ-${new Date().getFullYear()}-${String(current.length + 1).padStart(3, "0")}`,
    createdAt: new Date().toISOString(),
    status: "new",
  };

  const updated = [newRecord, ...current];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("six2eight_inquiry_added", { detail: newRecord }));
    } catch (err) {
      console.error("Failed to save inquiry to storage", err);
    }
  }

  return newRecord;
}

export function updateInquiryStatus(id: string, status: ClientInquiry["status"]): ClientInquiry[] {
  const current = getInquiries();
  const updated = current.map((item) => (item.id === id ? { ...item, status } : item));
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("six2eight_inquiry_updated"));
  }
  return updated;
}

export function deleteInquiry(id: string): ClientInquiry[] {
  const current = getInquiries();
  const updated = current.filter((item) => item.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("six2eight_inquiry_updated"));
  }
  return updated;
}

export function clearAllInquiries(): ClientInquiry[] {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent("six2eight_inquiry_updated"));
  }
  return [];
}
