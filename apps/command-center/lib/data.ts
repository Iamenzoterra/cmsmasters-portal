import fs from 'fs/promises';
import path from 'path';

import type {
  Project,
  ComponentSummary,
  ContentStatus,
  ProgressData,
  ADRMeta,
  ADRMetaWithBody,
} from './types';

// ─── Source path constants (relative to monorepo root) ───────────────────────

const PHASES_PATH         = path.join(process.cwd(), 'workplan', 'phases.json');
const COMPONENTS_PATH     = path.join(process.cwd(), 'workplan', 'components.json');
const CONTENT_STATUS_PATH = path.join(process.cwd(), 'workplan', 'content-status.json');
const PROGRESS_PATH       = path.join(process.cwd(), 'workplan', 'progress.json');
const ADR_DIR             = path.join(process.cwd(), 'workplan', 'adr');

// ─── Private helpers ─────────────────────────────────────────────────────────

function parseFrontmatter(content: string): { meta: Partial<ADRMeta>; body: string } {
  const parts = content.split(/^---\s*$/m);

  // Expect: ['', frontmatter, body] or just ['content'] when no frontmatter
  if (parts.length < 3) {
    return { meta: {}, body: content.trim() };
  }

  const yamlBlock = parts[1];
  const body = parts.slice(2).join('---').trim();
  const meta: Partial<ADRMeta> = {};

  const lines = yamlBlock.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^(\w[\w-]*):\s*(.*)/);

    if (match) {
      const key = match[1] as string;
      const value = match[2].trim();

      if (value === '') {
        // Multi-line list — read following '  - item' lines
        const items: string[] = [];
        i++;
        while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s+-\s+/, '').trim());
          i++;
        }

        if (key === 'relatedADRs') meta.relatedADRs = items;
        else if (key === 'deciders') meta.deciders = items;
        else if (key === 'tags') meta.tags = items;

        continue;
      }

      switch (key) {
        case 'id':       meta.id       = value; break;
        case 'title':    meta.title    = value; break;
        case 'status':   meta.status   = value as ADRMeta['status']; break;
        case 'date':     meta.date     = value; break;
        case 'category': meta.category = value; break;
        default: break;
      }
    }

    i++;
  }

  return { meta, body };
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── Exported data readers ───────────────────────────────────────────────────

/** Reads workplan/phases.json and returns the typed Project structure. */
export async function getPhases(): Promise<Project | null> {
  return readJson<Project>(PHASES_PATH);
}

/** Reads workplan/components.json. Returns null when the file is missing. */
export async function getComponents(): Promise<ComponentSummary[] | null> {
  return readJson<ComponentSummary[]>(COMPONENTS_PATH);
}

/** Reads workplan/content-status.json. Returns null when the file is missing. */
export async function getContentStatus(): Promise<ContentStatus | null> {
  return readJson<ContentStatus>(CONTENT_STATUS_PATH);
}

/** Reads workplan/progress.json. Returns null when the file is missing. */
export async function getProgress(): Promise<ProgressData | null> {
  return readJson<ProgressData>(PROGRESS_PATH);
}

/**
 * Lists all ADR markdown files in workplan/adr/ and parses their YAML
 * frontmatter into ADRMeta objects. Returns an empty array when the directory
 * does not exist.
 */
export async function getADRList(): Promise<ADRMeta[]> {
  let files: string[];

  try {
    files = await fs.readdir(ADR_DIR);
  } catch {
    return [];
  }

  const mdFiles = files.filter((f) => f.endsWith('.md'));

  const results = await Promise.all(
    mdFiles.map(async (filename): Promise<ADRMeta | null> => {
      try {
        const content = await fs.readFile(path.join(ADR_DIR, filename), 'utf-8');
        const { meta } = parseFrontmatter(content);

        if (!meta.id || !meta.title || !meta.status || !meta.date) return null;

        return meta as ADRMeta;
      } catch {
        return null;
      }
    }),
  );

  return results.filter((r): r is ADRMeta => r !== null);
}

/**
 * Reads a single ADR file from workplan/adr/ matching the given id or filename
 * slug. Returns the parsed frontmatter plus the markdown body, or null when no
 * match is found.
 */
export async function getADRContent(idOrSlug: string | number): Promise<ADRMetaWithBody | null> {
  let files: string[];

  try {
    files = await fs.readdir(ADR_DIR);
  } catch {
    return null;
  }

  const mdFiles = files.filter((f) => f.endsWith('.md'));

  for (const filename of mdFiles) {
    try {
      const content = await fs.readFile(path.join(ADR_DIR, filename), 'utf-8');
      const { meta, body } = parseFrontmatter(content);

      const slug = filename.replace(/\.md$/, '');
      const idMatch =
        meta.id === String(idOrSlug) ||
        meta.id === idOrSlug ||
        slug === String(idOrSlug);

      if (idMatch && meta.id && meta.title && meta.status && meta.date) {
        return { ...(meta as ADRMeta), body };
      }
    } catch {
      continue;
    }
  }

  return null;
}
