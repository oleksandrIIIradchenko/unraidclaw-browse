import type { FastifyInstance } from "fastify";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";
import { Resource, Action } from "@unraidclaw/shared";
import type { GraphQLClient } from "../graphql-client.js";
import { requirePermission } from "../permissions.js";

const execFileAsync = promisify(execFile);

const INFO_QUERY = `query {
  info {
    os {
      platform
      hostname
      uptime
    }
    cpu {
      model
      cores
      threads
    }
  }
}`;

function getMemoryInfo(): { totalBytes: number; usedBytes: number; freeBytes: number; usedPercent: number } {
  const raw = readFileSync("/proc/meminfo", "utf-8");
  const fields: Record<string, number> = {};
  for (const line of raw.split("\n")) {
    const match = line.match(/^(\w+):\s+(\d+)/);
    if (match) fields[match[1]] = parseInt(match[2], 10) * 1024; // kB to bytes
  }
  const total = fields.MemTotal ?? 0;
  const available = fields.MemAvailable ?? fields.MemFree ?? 0;
  const used = total - available;
  return {
    totalBytes: total,
    usedBytes: used,
    freeBytes: available,
    usedPercent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
  };
}

function getCpuLoad(): { load1m: number; load5m: number; load15m: number } {
  const raw = readFileSync("/proc/loadavg", "utf-8");
  const [l1, l5, l15] = raw.trim().split(/\s+/).map(Number);
  return { load1m: l1, load5m: l5, load15m: l15 };
}

const SERVICES_QUERY = `query {
  services {
    name
    id
    online
  }
}`;

export function registerSystemRoutes(app: FastifyInstance, gql: GraphQLClient): void {
  // System info
  app.get("/api/system/info", {
    preHandler: requirePermission(Resource.INFO, Action.READ),
    handler: async (_req, reply) => {
      const data = await gql.query<{ info: Record<string, unknown> }>(INFO_QUERY);
      const info = {
        ...data.info,
        memory: getMemoryInfo(),
        cpuLoad: getCpuLoad(),
      };
      return reply.send({ ok: true, data: info });
    },
  });

  // System metrics
  app.get("/api/system/metrics", {
    preHandler: requirePermission(Resource.INFO, Action.READ),
    handler: async (_req, reply) => {
      const info = {
        memory: getMemoryInfo(),
        cpuLoad: getCpuLoad(),
      };
      return reply.send({ ok: true, data: info });
    },
  });

  // List services
  app.get("/api/system/services", {
    preHandler: requirePermission(Resource.SERVICES, Action.READ),
    handler: async (_req, reply) => {
      const data = await gql.query<{ services: unknown[] }>(SERVICES_QUERY);
      return reply.send({ ok: true, data: data.services });
    },
  });

  // Reboot
  app.post("/api/system/reboot", {
    preHandler: requirePermission(Resource.OS, Action.UPDATE),
    handler: async (_req, reply) => {
      try {
        reply.send({ ok: true, data: { message: "Reboot initiated" } });
        execFileAsync("nohup", ["/sbin/reboot"]).catch(() => {});
      } catch {
        return reply.status(500).send({ ok: false, error: { code: "REBOOT_ERROR", message: "Failed to initiate reboot" } });
      }
    },
  });

  // Shutdown
  app.post("/api/system/shutdown", {
    preHandler: requirePermission(Resource.OS, Action.UPDATE),
    handler: async (_req, reply) => {
      try {
        reply.send({ ok: true, data: { message: "Shutdown initiated" } });
        execFileAsync("nohup", ["/sbin/poweroff"]).catch(() => {});
      } catch {
        return reply.status(500).send({ ok: false, error: { code: "SHUTDOWN_ERROR", message: "Failed to initiate shutdown" } });
      }
    },
  });
}
