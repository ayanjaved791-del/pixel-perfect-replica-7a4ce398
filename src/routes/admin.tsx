import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback, type FormEvent } from "react";
import {
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  LogOut,
  Mail,
  Calendar,
  Building2,
  Globe,
  DollarSign,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Archive,
  Download,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Inbox,
  Send,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { getInquiries, updateInquiryStatus, deleteInquiry, type ClientInquiry } from "@/lib/inbox";
import { cn } from "@/lib/utils";

const title = "Client Inquiries Admin Portal — six2eight";
const description = "Private administrative portal for managing client submissions and inquiries.";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

// Required login credentials specified by user:
const AUTH_USERNAME = "ozyrah@talha";
const AUTH_PASSWORD = "madebyAI";

function AdminPage() {
  // Requirement: "first its everytime ask for login everytime"
  // Default is false on every page load/mount
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Inquiries data state
  const [inquiries, setInquiries] = useState<ClientInquiry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "contacted" | "archived">("all");
  const [selectedInquiry, setSelectedInquiry] = useState<ClientInquiry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Reload inquiries from local store
  const refreshInquiries = useCallback(() => {
    const data = getInquiries();
    setInquiries(data);
    setSelectedInquiry((prev) => {
      if (!prev) return null;
      return data.find((item) => item.id === prev.id) || null;
    });
  }, []);

  useEffect(() => {
    refreshInquiries();

    const handleStorageUpdate = () => {
      refreshInquiries();
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("six2eight_inquiry_added", handleStorageUpdate);
    window.addEventListener("six2eight_inquiry_updated", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("six2eight_inquiry_added", handleStorageUpdate);
      window.removeEventListener("six2eight_inquiry_updated", handleStorageUpdate);
    };
  }, [refreshInquiries]);

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    setTimeout(() => {
      setIsLoggingIn(false);
      if (usernameInput.trim() === AUTH_USERNAME && passwordInput.trim() === AUTH_PASSWORD) {
        setIsAuthenticated(true);
        toast.success(`Welcome back, ${AUTH_USERNAME}`);
        refreshInquiries();
      } else {
        setLoginError("Invalid username or password. Please verify your admin credentials.");
        toast.error("Authentication failed. Invalid username or password.");
      }
    }, 450);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsernameInput("");
    setPasswordInput("");
    setSelectedInquiry(null);
    toast.info("Logged out of Admin Portal.");
  };

  const handleStatusChange = (id: string, newStatus: ClientInquiry["status"]) => {
    const updated = updateInquiryStatus(id, newStatus);
    setInquiries(updated);
    if (selectedInquiry && selectedInquiry.id === id) {
      setSelectedInquiry({ ...selectedInquiry, status: newStatus });
    }
    toast.success(`Inquiry ${id} marked as ${newStatus}`);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this client inquiry?")) {
      const updated = deleteInquiry(id);
      setInquiries(updated);
      if (selectedInquiry && selectedInquiry.id === id) {
        setSelectedInquiry(null);
      }
      toast.success(`Inquiry ${id} deleted`);
    }
  };

  const copyEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    toast.success(`Copied ${email} to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCSV = () => {
    if (inquiries.length === 0) {
      toast.error("No inquiries to export.");
      return;
    }
    const headers = [
      "Inquiry ID",
      "Full Name",
      "Email",
      "Company",
      "Website",
      "Services",
      "Budget",
      "Timeline",
      "Source",
      "Created At",
      "Status",
      "Message",
    ];

    const rows = inquiries.map((inq) => [
      `"${inq.id}"`,
      `"${inq.fullName.replace(/"/g, '""')}"`,
      `"${inq.email}"`,
      `"${(inq.company || "").replace(/"/g, '""')}"`,
      `"${inq.website || ""}"`,
      `"${inq.services.join(", ")}"`,
      `"${inq.budget}"`,
      `"${inq.timeline || ""}"`,
      `"${inq.source}"`,
      `"${inq.createdAt}"`,
      `"${inq.status}"`,
      `"${(inq.message || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `client_inquiries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Inquiries exported to CSV!");
  };

  // Filtered inquiries
  const filtered = useMemo(() => {
    return inquiries.filter((inq) => {
      const matchSearch =
        inq.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inq.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inq.company && inq.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (inq.message && inq.message.toLowerCase().includes(searchQuery.toLowerCase())) ||
        inq.services.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === "all" ? true : inq.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [inquiries, searchQuery, statusFilter]);

  const newCount = useMemo(() => inquiries.filter((i) => i.status === "new").length, [inquiries]);
  const contactedCount = useMemo(
    () => inquiries.filter((i) => i.status === "contacted").length,
    [inquiries],
  );

  // Format relative timestamp
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSec < 60) return "Just now";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  // =========================================================================
  // VIEW 1: LOGIN SCREEN (Required on every visit to /admin)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
        <Toaster position="top-center" />

        {/* Ambient background glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full bg-[#9AFD0D]/6 blur-[150px]"
        />

        {/* Main Login Card */}
        <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#121215]/95 p-8 sm:p-10 shadow-[0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          {/* Top Brand & Security Icon */}
          <div className="text-center mb-8">
            <div className="mx-auto size-14 rounded-2xl bg-[#9AFD0D]/10 border border-[#9AFD0D]/30 flex items-center justify-center text-[#9AFD0D] shadow-[0_0_24px_rgba(154,253,13,0.25)] mb-4">
              <Lock className="size-6 stroke-[2.5]" />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-neutral-300 mb-2">
              <span className="size-1.5 rounded-full bg-[#9AFD0D] animate-pulse" />
              <span>Restricted Access</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              six<span className="text-[#9AFD0D]">2</span>eight Admin
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1.5">
              Client Messages &amp; Lead Management Portal
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed animate-in fade-in duration-200">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Admin Username
              </label>
              <div className="relative">
                <User className="size-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="ozyrah@talha"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#1A1A1F] border border-white/10 text-white placeholder:text-neutral-600 text-sm focus:border-[#9AFD0D] focus:ring-1 focus:ring-[#9AFD0D] outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <KeyRound className="size-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#1A1A1F] border border-white/10 text-white placeholder:text-neutral-600 text-sm focus:border-[#9AFD0D] focus:ring-1 focus:ring-[#9AFD0D] outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full mt-2 rounded-xl bg-[#9AFD0D] hover:bg-[#8cee07] active:scale-[0.99] text-black font-bold py-3.5 px-4 text-sm transition-all shadow-[0_4px_20px_rgba(154,253,13,0.35)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoggingIn ? (
                <>
                  <div className="size-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Inbox</span>
                  <ChevronRight className="size-4 stroke-[3]" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <a
              href="/"
              className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              ← Return to public website
            </a>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED ADMIN INBOX PORTAL
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#0E0E11] text-neutral-100 font-sans flex flex-col">
      <Toaster position="top-right" />

      {/* Admin Top Navigation Bar */}
      <header className="h-16 border-b border-white/10 bg-[#141418] px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-[#9AFD0D] flex items-center justify-center text-black font-black text-sm shadow-[0_0_16px_rgba(154,253,13,0.3)]">
            628
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">Client Inbox</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#9AFD0D]/15 text-[#9AFD0D] px-2 py-0.5 rounded-full border border-[#9AFD0D]/30">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 hidden sm:block">
              Logged in as <span className="text-white font-medium">{AUTH_USERNAME}</span>
            </p>
          </div>
        </div>

        {/* Right Action Tools & Logout */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={refreshInquiries}
            className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Inquiries"
          >
            <RefreshCw className="size-4" />
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="size-3.5 text-[#9AFD0D]" />
            <span>Export CSV</span>
          </button>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <span>View Site</span>
            <ExternalLink className="size-3" />
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-neutral-200 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="size-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Admin Workspace Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Metric Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="p-4 rounded-2xl bg-[#16161B] border border-white/10">
            <div className="text-xs text-neutral-400 font-medium">Total Messages</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {inquiries.length}
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Submitted by clients</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#16161B] border border-white/10">
            <div className="text-xs text-neutral-400 font-medium flex items-center justify-between">
              <span>New / Unread</span>
              <span className="size-2 rounded-full bg-[#9AFD0D] animate-ping" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#9AFD0D] mt-1">
              {newCount}
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Requires attention</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#16161B] border border-white/10">
            <div className="text-xs text-neutral-400 font-medium">Contacted</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 mt-1">
              {contactedCount}
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Response dispatched</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#16161B] border border-white/10">
            <div className="text-xs text-neutral-400 font-medium">Response SLA</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">&lt; 12h</div>
            <div className="text-[11px] text-[#9AFD0D] mt-0.5">100% on target</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#16161B] border border-white/10">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(["all", "new", "contacted", "archived"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap",
                  statusFilter === tab
                    ? "bg-[#9AFD0D] text-black shadow-xs font-bold"
                    : "text-neutral-400 hover:text-white hover:bg-white/5",
                )}
              >
                <span>{tab}</span>
                {tab === "new" && newCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">
                    {newCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="size-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, email, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#1A1A20] border border-white/10 text-white placeholder:text-neutral-500 text-xs focus:border-[#9AFD0D] outline-none transition-all"
            />
          </div>
        </div>

        {/* Split View: List on left, Selected inquiry details on right (or stacked on mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Inquiry list */}
          <div className="lg:col-span-6 xl:col-span-5 space-y-3">
            {filtered.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-white/10 bg-[#16161B]">
                <Inbox className="size-10 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">No inquiries found</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search query or status filter."
                    : "Client form submissions from /contact and homepage will appear here automatically."}
                </p>
              </div>
            ) : (
              filtered.map((inq) => {
                const isSelected = selectedInquiry?.id === inq.id;
                return (
                  <div
                    key={inq.id}
                    onClick={() => setSelectedInquiry(inq)}
                    className={cn(
                      "p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group",
                      isSelected
                        ? "border-[#9AFD0D] bg-[#1E1E26] shadow-[0_4px_24px_rgba(154,253,13,0.15)]"
                        : "border-white/10 bg-[#16161B] hover:border-white/20 hover:bg-[#1A1A22]",
                    )}
                  >
                    {/* Top Row: Name, Status badge & time */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center font-bold text-xs text-[#9AFD0D] shrink-0">
                          {inq.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-white truncate">{inq.fullName}</h4>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {inq.company || inq.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                            inq.status === "new"
                              ? "bg-[#9AFD0D]/15 text-[#9AFD0D] border-[#9AFD0D]/30"
                              : inq.status === "contacted"
                                ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                                : "bg-neutral-800 text-neutral-400 border-neutral-700",
                          )}
                        >
                          {inq.status}
                        </span>
                      </div>
                    </div>

                    {/* Middle preview snippet */}
                    {inq.message && (
                      <p className="text-xs text-neutral-300 line-clamp-2 my-2 font-normal leading-relaxed">
                        “{inq.message}”
                      </p>
                    )}

                    {/* Bottom meta row */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px] text-neutral-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono text-neutral-500">{inq.id}</span>
                        <span>•</span>
                        <span className="font-medium text-[#9AFD0D]">{inq.budget}</span>
                      </div>
                      <span className="shrink-0">{formatTime(inq.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Full Detail Inspector */}
          <div className="lg:col-span-6 xl:col-span-7">
            {selectedInquiry ? (
              <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#16161B] space-y-6 sticky top-24">
                {/* Header details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-neutral-500">
                        {selectedInquiry.id}
                      </span>
                      <span className="text-xs text-neutral-400">•</span>
                      <span className="text-xs text-neutral-400">Via {selectedInquiry.source}</span>
                      <span className="text-xs text-neutral-400">•</span>
                      <span className="text-xs text-neutral-400">
                        {formatTime(selectedInquiry.createdAt)}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mt-1">
                      {selectedInquiry.fullName}
                    </h3>
                    {selectedInquiry.company && (
                      <p className="text-sm text-neutral-300 flex items-center gap-1.5 mt-0.5">
                        <Building2 className="size-3.5 text-neutral-400" />
                        <span>{selectedInquiry.company}</span>
                      </p>
                    )}
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center gap-2">
                    {selectedInquiry.status !== "contacted" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(selectedInquiry.id, "contacted")}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Mark Contacted
                      </button>
                    )}
                    {selectedInquiry.status !== "new" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(selectedInquiry.id, "new")}
                        className="px-3 py-1.5 rounded-xl bg-[#9AFD0D]/20 hover:bg-[#9AFD0D]/30 text-[#9AFD0D] border border-[#9AFD0D]/40 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Mark New
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedInquiry.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                      title="Delete inquiry"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Contact Actions: Email & Website */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#1A1A22] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Mail className="size-4 text-[#9AFD0D] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase font-bold text-neutral-500">
                          Email Address
                        </div>
                        <div className="text-xs font-semibold text-white truncate">
                          {selectedInquiry.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => copyEmail(selectedInquiry.email, selectedInquiry.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white"
                        title="Copy email"
                      >
                        {copiedId === selectedInquiry.id ? (
                          <Check className="size-3.5 text-[#9AFD0D]" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                      <a
                        href={`mailto:${selectedInquiry.email}?subject=Regarding your inquiry with six2eight&body=Hi ${selectedInquiry.fullName},%0D%0A%0D%0AThank you for reaching out to six2eight...`}
                        className="p-1.5 rounded-lg bg-[#9AFD0D] text-black font-semibold hover:bg-[#8cee07]"
                        title="Open email composer"
                      >
                        <Send className="size-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#1A1A22] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <DollarSign className="size-4 text-[#9AFD0D] shrink-0" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-neutral-500">
                          Budget Tier
                        </div>
                        <div className="text-xs font-semibold text-white">
                          {selectedInquiry.budget}
                        </div>
                      </div>
                    </div>
                    {selectedInquiry.timeline && (
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-neutral-300">
                        {selectedInquiry.timeline}
                      </span>
                    )}
                  </div>
                </div>

                {/* Website Link if present */}
                {selectedInquiry.website && (
                  <div className="p-3 rounded-xl bg-[#1A1A22] border border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Globe className="size-4 text-cyan-400" />
                      <span>Client Website:</span>
                      <span className="font-semibold text-white">{selectedInquiry.website}</span>
                    </div>
                    <a
                      href={
                        selectedInquiry.website.startsWith("http")
                          ? selectedInquiry.website
                          : `https://${selectedInquiry.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#9AFD0D] hover:underline flex items-center gap-1"
                    >
                      <span>Visit</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}

                {/* Requested Services Badges */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Requested Services
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedInquiry.services.map((srv) => (
                      <span
                        key={srv}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-[#9AFD0D]/10 text-[#9AFD0D] border border-[#9AFD0D]/30"
                      >
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Client Message / Scope Body */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Project Goals &amp; Scope
                  </h4>
                  <div className="p-4 rounded-2xl bg-[#121217] border border-white/10 text-neutral-200 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                    {selectedInquiry.message || "No additional message text provided."}
                  </div>
                </div>

                {/* Referral Source info */}
                {selectedInquiry.hearAbout && (
                  <div className="text-xs text-neutral-400 pt-2 border-t border-white/5">
                    Heard about six2eight via:{" "}
                    <strong className="text-white">{selectedInquiry.hearAbout}</strong>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl border border-white/10 bg-[#16161B]/60 sticky top-24">
                <MessageSquare className="size-10 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">Select a message</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Click on any client inquiry on the left to inspect the complete brief, contact
                  credentials, and scope.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
