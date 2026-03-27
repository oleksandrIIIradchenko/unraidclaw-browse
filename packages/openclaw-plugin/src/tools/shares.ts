// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { ClientResolver } from "../index.js";
import { textResult, errorResult } from "./util.js";

export function registerShareTools(api: any, getClient: ClientResolver): void {
  api.registerTool({
    name: "unraid_share_list",
    description: "List all user shares on the Unraid server with their settings and usage. The 'free' and 'size' fields are in kilobytes (KiB).",
    parameters: {
      type: "object",
      properties: {
        server: { type: "string", description: "Target server name (optional, uses default server)" },
      },
    },
    execute: async (_id: string, params: Record<string, unknown>) => {
      try {
        return textResult(await getClient(params.server as string | undefined).get("/api/shares"));
      } catch (err) {
        return errorResult(err);
      }
    },
  });

  api.registerTool({
    name: "unraid_share_details",
    description: "Get details for a specific user share by name. The 'free' and 'size' fields are in kilobytes (KiB).",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Share name" },
        server: { type: "string", description: "Target server name (optional, uses default server)" },
      },
      required: ["name"],
    },
    execute: async (_id: string, params: Record<string, unknown>) => {
      try {
        return textResult(await getClient(params.server as string | undefined).get(`/api/shares/${params.name}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  });

  api.registerTool({
    name: "unraid_share_browse",
    description: "Browse a user share directory tree (read-only). Lists folders/files under the share root or a relative path.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Share name" },
        path: { type: "string", description: "Relative path inside the share, default '/'" },
        limit: { type: "number", description: "Max entries to return (default 200, max 1000)" },
        includeHidden: { type: "boolean", description: "Include dotfiles/directories" },
        dirsOnly: { type: "boolean", description: "Return directories only" },
        server: { type: "string", description: "Target server name (optional, uses default server)" },
      },
      required: ["name"],
    },
    execute: async (_id: string, params: Record<string, unknown>) => {
      try {
        const query: Record<string, string> = {};
        if (params.path !== undefined) query.path = String(params.path);
        if (params.limit !== undefined) query.limit = String(params.limit);
        if (params.includeHidden !== undefined) query.includeHidden = String(params.includeHidden);
        if (params.dirsOnly !== undefined) query.dirsOnly = String(params.dirsOnly);
        return textResult(await getClient(params.server as string | undefined).get(`/api/shares/${params.name}/browse`, query));
      } catch (err) {
        return errorResult(err);
      }
    },
  });

  api.registerTool({
    name: "unraid_share_update",
    description: "Update safe settings for a user share. Only affects metadata and future write behavior -- does not move existing data.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Share name to update" },
        comment: { type: "string", description: "Share description/comment" },
        allocator: { type: "string", description: "Disk allocation method: highwater, fill, or most-free" },
        floor: { type: "string", description: "Minimum free space per disk (e.g. '0' or '50000')" },
        splitLevel: { type: "string", description: "Split level for distributing files across disks" },
        server: { type: "string", description: "Target server name (optional, uses default server)" },
      },
      required: ["name"],
    },
    execute: async (_id: string, params: Record<string, unknown>) => {
      try {
        const { name, server, ...updates } = params;
        return textResult(await getClient(server as string | undefined).patch(`/api/shares/${name}`, updates));
      } catch (err) {
        return errorResult(err);
      }
    },
  });
}
