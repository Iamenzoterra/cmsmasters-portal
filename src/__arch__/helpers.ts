import { type DomainDefinition } from './domain-manifest'

/** All owned file paths for a domain */
export function getOwnedPaths(domain: DomainDefinition): string[] {
  return [...domain.owned_files]
}
