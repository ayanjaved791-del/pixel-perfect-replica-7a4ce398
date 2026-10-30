import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

type LiveInquiryRecord = {
  id: string;
  fullName: string;
  email: string;
  company?: string;
  website?: string;
  services?: string[];
  budget?: string;
  timeline?: string;
  message?: string;
  hearAbout?: string;
  source: string;
  createdAt: string;
  status: string;
  [key: string]: unknown;
};

// In-memory server-side storage for real client inquiries (Zero dummy data)
const liveServerInquiries: LiveInquiryRecord[] = [];

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // Dedicated Real-Time Client Inquiries API
    if (url.pathname === "/api/inquiries") {
      const headers = {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "access-control-allow-headers": "Content-Type",
      };

      if (request.method === "OPTIONS") {
        return new Response(null, { headers });
      }

      if (request.method === "GET") {
        return new Response(JSON.stringify(liveServerInquiries), { headers });
      }

      if (request.method === "POST") {
        try {
          const body = (await request.json()) as LiveInquiryRecord;
          const record: LiveInquiryRecord = {
            ...body,
            id: body.id || `INQ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
            createdAt: body.createdAt || new Date().toISOString(),
            status: body.status || "new",
          };
          // Insert at start
          liveServerInquiries.unshift(record);
          return new Response(JSON.stringify(record), { status: 201, headers });
        } catch {
          return new Response(JSON.stringify({ error: "Invalid payload" }), {
            status: 400,
            headers,
          });
        }
      }

      if (request.method === "PATCH") {
        try {
          const body = await request.json();
          const index = liveServerInquiries.findIndex((i) => i.id === body.id);
          if (index !== -1) {
            liveServerInquiries[index] = { ...liveServerInquiries[index], ...body };
          }
          return new Response(JSON.stringify(liveServerInquiries), { headers });
        } catch (e) {
          return new Response(JSON.stringify({ error: "Invalid payload" }), {
            status: 400,
            headers,
          });
        }
      }

      if (request.method === "DELETE") {
        try {
          const body = await request.json();
          const index = liveServerInquiries.findIndex((i) => i.id === body.id);
          if (index !== -1) {
            liveServerInquiries.splice(index, 1);
          }
          return new Response(JSON.stringify(liveServerInquiries), { headers });
        } catch (e) {
          return new Response(JSON.stringify({ error: "Invalid payload" }), {
            status: 400,
            headers,
          });
        }
      }
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
