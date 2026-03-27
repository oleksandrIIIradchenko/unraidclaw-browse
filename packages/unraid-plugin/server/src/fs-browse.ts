import { readdir, realpath, lstat } from "node:fs/promises";
import { join, normalize, relative, sep } from "node:path";

export interface BrowseOptions {
  limit?: number;
  includeHidden?: boolean;
  dirsOnly?: boolean;
}

export interface BrowseEntry {
  name: string;
  path: string;
  type: "file" | "directory" | "symlink" | "other";
  sizeBytes: number | null;
  mtime: string | null;
}

function ensureInsideRoot(rootReal: string, targetReal: string): boolean {
  if (targetReal === rootReal) return true;
  const rel = relative(rootReal, targetReal);
  return rel !== "" && !rel.startsWith("..") && !rel.includes(`..${sep}`);
}

export async function safeResolveUnderRoot(root: string, requestedPath = "/"): Promise<{ rootReal: string; targetReal: string; normalizedPath: string; }> {
  const rootReal = await realpath(root);
  const cleaned = requestedPath && requestedPath !== "/" ? normalize(requestedPath).replace(/^\/+/, "") : "";
  if (cleaned.split(sep).includes("..")) {
    const err = new Error("Path traversal is not allowed");
    (err as Error & { code?: string }).code = "INVALID_PATH";
    throw err;
  }
  const candidate = cleaned ? join(rootReal, cleaned) : rootReal;
  const targetReal = await realpath(candidate);
  if (!ensureInsideRoot(rootReal, targetReal)) {
    const err = new Error("Resolved path escapes root");
    (err as Error & { code?: string }).code = "INVALID_PATH";
    throw err;
  }
  return {
    rootReal,
    targetReal,
    normalizedPath: cleaned ? `/${cleaned.replace(/\\/g, "/")}` : "/",
  };
}

export async function listDirectory(root: string, requestedPath = "/", options: BrowseOptions = {}) {
  const limit = Math.min(Math.max(Number(options.limit ?? 200), 1), 1000);
  const includeHidden = options.includeHidden === true;
  const dirsOnly = options.dirsOnly === true;

  const { rootReal, targetReal, normalizedPath } = await safeResolveUnderRoot(root, requestedPath);
  const st = await lstat(targetReal);
  if (!st.isDirectory()) {
    const err = new Error("Target path is not a directory");
    (err as Error & { code?: string }).code = "NOT_DIRECTORY";
    throw err;
  }

  const dirents = await readdir(targetReal, { withFileTypes: true });
  const filtered = dirents.filter((d) => {
    if (!includeHidden && d.name.startsWith(".")) return false;
    if (dirsOnly && !d.isDirectory()) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const aDir = a.isDirectory() ? 0 : 1;
    const bDir = b.isDirectory() ? 0 : 1;
    if (aDir !== bDir) return aDir - bDir;
    return a.name.localeCompare(b.name);
  });

  const slice = filtered.slice(0, limit);
  const entries = await Promise.all(slice.map(async (d) => {
    const abs = join(targetReal, d.name);
    try {
      const s = await lstat(abs);
      let type: BrowseEntry["type"] = "other";
      if (s.isDirectory()) type = "directory";
      else if (s.isFile()) type = "file";
      else if (s.isSymbolicLink()) type = "symlink";
      return {
        name: d.name,
        path: normalizedPath === "/" ? `/${d.name}` : `${normalizedPath}/${d.name}`,
        type,
        sizeBytes: s.isDirectory() ? s.size ?? null : s.size ?? null,
        mtime: s.mtime ? s.mtime.toISOString() : null,
      } satisfies BrowseEntry;
    } catch {
      return {
        name: d.name,
        path: normalizedPath === "/" ? `/${d.name}` : `${normalizedPath}/${d.name}`,
        type: "other",
        sizeBytes: null,
        mtime: null,
      } satisfies BrowseEntry;
    }
  }));

  return {
    root: rootReal,
    path: normalizedPath,
    resolvedPath: targetReal,
    entries,
    truncated: filtered.length > limit,
    limit,
  };
}
