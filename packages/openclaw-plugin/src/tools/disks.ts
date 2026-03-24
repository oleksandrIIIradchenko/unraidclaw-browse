// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { UnraidClient } from "../client.js";
import { textResult, errorResult } from "./util.js";

export function registerDiskTools(api: any, client: UnraidClient): void {
  api.registerTool({
    name: "unraid_disk_list",
    description: "List all disks (data + parity) with name, size, used, free, usedPercent, temp, status, and fsType.",
    parameters: { type: "object", properties: {} },
    execute: async () => {
      try {
        return textResult(await client.get("/api/disks"));
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
      },
      required: ["id"],
    },
    execute: async (_id, params) => {
      try {
        return textResult(await client.get(`/api/disks/${params.id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  });
}
