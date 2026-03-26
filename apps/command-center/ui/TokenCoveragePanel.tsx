import fs from 'node:fs/promises';
import path from 'node:path';

const MONOREPO_ROOT = path.resolve(process.cwd(), '..', '..');
const TOKENS_PATH = path.join(MONOREPO_ROOT, 'packages', 'ui', 'src', 'theme', 'tokens.css');

async function readTokenStats() {
  try {
    const content = await fs.readFile(TOKENS_PATH, 'utf8');

    // Parse "Updated: YYYY-MM-DD" from header comment
    const dateMatch = content.match(/Updated:\s*(\d{4}-\d{2}-\d{2})/);
    const lastSynced = dateMatch ? dateMatch[1] : null;

    // Count CSS custom properties (--name: value) in :root
    const rootMatch = content.match(/:root\s*\{([\s\S]*?)\n\}/);
    const rootBlock = rootMatch ? rootMatch[1] : '';
    const lightTokens = (rootBlock.match(/^\s*--[\w-]+:/gm) ?? []).length;

    // Count CSS custom properties in .dark
    const darkMatch = content.match(/\.dark\s*\{([\s\S]*?)\n\}/);
    const darkBlock = darkMatch ? darkMatch[1] : '';
    const darkTokens = (darkBlock.match(/^\s*--[\w-]+:/gm) ?? []).length;

    return { lightTokens, darkTokens, total: lightTokens + darkTokens, lastSynced };
  } catch {
    return null;
  }
}

export async function TokenCoveragePanel() {
  const stats = await readTokenStats();

  if (!stats) {
    return (
      <div className="bg-surface-card rounded-card px-4 py-3 mb-4 text-text-muted text-sm">
        Token data unavailable — run Figma sync to generate tokens.css
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-card px-4 py-3 mb-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-text-primary font-medium text-sm">Design Tokens</span>
        <span className="font-mono text-xs text-text-muted">
          {stats.lightTokens} light + {stats.darkTokens} dark = {stats.total} total
        </span>
      </div>
      {stats.lastSynced && (
        <span className="font-mono text-xs text-text-muted">
          Synced {stats.lastSynced}
        </span>
      )}
    </div>
  );
}
