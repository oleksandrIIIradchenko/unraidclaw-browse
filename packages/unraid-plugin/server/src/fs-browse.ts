import { readdir, realpath, lstat } from "node:fs/promises";
import { join, normalize, relative, sep } from "node:path";

export interface BrowseOptions {
  limit?: number;
  offset?: number;
  includeHidden?: boolean;
  dirsOnly?: boolean;
  sortBy?: "name" | "size" | "mtime";
  order?: "asc" | "desc";
}

export interface BrowseEntry {
  name: string;
  path: string;
  type: "file" | "directory" | "symlink" | "other";
  sizeBytes: number | null;
  mtime: string | null;
}

const MAX_BROWSE_PATH_LENGTH = 4096;

function ensureInsideRoot(rootReal: string, targetReal: string): boolean {
  if (targetReal === rootReal) return true;
  const rel = relative(rootReal, targetReal);
  return rel !== "" && !rel.startsWith("..") && !rel.includes(`..${sep}`);
}

export async function safeResolveUnderRoot(root: string, requestedPath = "/"): Promise<{ rootReal: string; targetReal: string; normalizedPath: string; }> {
  const rootReal = await realpath(root);
  const rawPath = String(requestedPath ?? "/");
  if (rawPath.length > MAX_BROWSE_PATH_LENGTH) {
    const err = new Error(`Path is too long (max ${MAX_BROWSE_PATH_LENGTH} chars)`);
    (err as Error & { code?: string }).code = "INVALID_PATH";
    throw err;
  }
  const rawSegments = rawPath.replace(/\\/g, "/").split("/").filter(Boolean);
  if (rawSegments.includes("..")) {
    const err = new Error("Path traversal is not allowed");
    (err as Error & { code?: string }).code = "INVALID_PATH";
    throw err;
  }
  const normalizedInput = requestedPath && requestedPath !== "/"
    ? normalize(`/${requestedPath}`).replace(/^\/+/, "")
    : "";
  const cleaned = normalizedInput === "." ? "" : normalizedInput;
  if (cleaned === ".." || cleaned.startsWith(`..${sep}`) || cleaned.split(sep).includes("..")) {
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
  const offset = Math.max(Number(options.offset ?? 0), 0);
  const includeHidden = options.includeHidden === true;
  const dirsOnly = options.dirsOnly === true;
  const sortBy = options.sortBy ?? "name";
  const order = options.order ?? "asc";

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

  const allEntries = await Promise.all(filtered.map(async (d) => {
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
        sizeBytes: s.size ?? null,
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

  allEntries.sort((a, b) => {
    const dirCmp = (a.type === 'directory' ? 0 : 1) - (b.type === 'directory' ? 0 : 1);
    const primary = sortBy === 'size'
      ? (a.sizeBytes ?? -1) - (b.sizeBytes ?? -1)
      : sortBy === 'mtime'
        ? (a.mtime ? Date.parse(a.mtime) : 0) - (b.mtime ? Date.parse(b.mtime) : 0)
        : a.name.localeCompare(b.name);
    const result = sortBy === 'name'
      ? (dirCmp !== 0 ? dirCmp : primary)
      : (primary !== 0 ? primary : (dirCmp !== 0 ? dirCmp : a.name.localeCompare(b.name)));
    return order === 'desc' ? -result : result;
  });

  const entries = allEntries.slice(offset, offset + limit);
  const segments = normalizedPath === '/' ? [] : normalizedPath.split('/').filter(Boolean);
  const breadcrumbs = [{ name: 'root', path: '/' }, ...segments.map((segment, index) => ({
    name: segment,
    path: '/' + segments.slice(0, index + 1).join('/'),
  }))];

  return {
    root: rootReal,
    path: normalizedPath,
    resolvedPath: targetReal,
    breadcrumbs,
    entries,
    truncated: allEntries.length > offset + limit,
    total: allEntries.length,
    limit,
    offset,
    sortBy,
    order,
  };
}
