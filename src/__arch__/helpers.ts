import { DOMAINS, type DomainDefinition } from './domain-manifest'

/** All owned file paths for a domain */
export function getOwnedPaths(domain: DomainDefinition): string[] {
  return [...domain.owned_files]
}

/** All file paths claimed by any domain */
export function getAllClaimedPaths(): string[] {
  return Object.values(DOMAINS).flatMap(getOwnedPaths)
}

/** Find which domain owns a given file path */
export function getOwnerDomain(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, '/')
  for (const [slug, domain] of Object.entries(DOMAINS)) {
    if (getOwnedPaths(domain).some(p => normalized.endsWith(p) || normalized === p)) {
      return slug
    }
  }
  return null
}

/** All Supabase tables claimed by any domain */
export function getAllClaimedTables(): string[] {
  return Object.values(DOMAINS).flatMap(d => d.owned_tables)
}
