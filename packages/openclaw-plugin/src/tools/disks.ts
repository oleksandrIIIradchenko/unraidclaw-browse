// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { ClientResolver } from "../index.js";
import { textResult, errorResult } from "./util.js";

export function registerDiskTools(api: any, getClient: ClientResolver): void {
  api.registerTool({
    name: "unraid_disk_list",
    description: "List all disks (data + parity) with name, size, used, free, usedPercent, temp, status, and fsType.",
    parameters: {
      type: "object",
      properties: {
        server: { type: "string", description: "Target server name (optional, uses default server)" },
      },
    },
    execute: async (_id: string, params: Record<string, unknown>) => {
      try {
        return textResult(await getClient(params.server as string | undefined).get("/api/disks"));
      } catch (err) {
        return errorResult(err);
      }
    },
  });

  api.registerTool({
    name: "unraid_disk_details",
    description: "Get details for a specific disk: size, used, free, usedPercent, temp, status, and fsType.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Disk ID (e.g., 'disk1', 'parity')" },
        server: { type: "string", description: "Target server name (optional, uses default server)" },
      },
      required: ["id"],
    },
    execute: async (_id: string, params: Record<string, unknown>) => {
      try {
        return textResult(await getClient(params.server as string | undefined).get(`/api/disks/${params.id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  });

  api.registerTool({
    name: "unraid_disk_browse",
    description: "Browse a disk mount directory tree (read-only). Lists folders/files under /mnt/<disk> or a relative path.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Disk ID (e.g., 'disk1', 'disk2')" },
        path: { type: "string", description: "Relative path inside the disk, default '/'" },
        limit: { type: "number", description: "Max entries to return (default 200, max 1000)" },
        includeHidden: { type: "boolean", description: "Include dotfiles/directories" },
        dirsOnly: { type: "boolean", description: "Return directories only" },
        server: { type: "string", description: "Target server name (optional, uses default server)" },
      },
      required: ["id"],
    },
    execute: async (_id: string, params: Record<string, unknown>) => {
      try {
        const query: Record<string, string> = {};
        if (params.path !== undefined) query.path = String(params.path);
        if (params.limit !== undefined) query.limit = String(params.limit);
        if (params.includeHidden !== undefined) query.includeHidden = String(params.includeHidden);
        if (params.dirsOnly !== undefined) query.dirsOnly = String(params.dirsOnly);
        return textResult(await getClient(params.server as string | undefined).get(`/api/disks/${params.id}/browse`, query));
      } catch (err) {
        return errorResult(err);
      }
    },
  });
}
