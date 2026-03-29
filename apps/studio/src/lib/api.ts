import { createApiClient } from '@cmsmasters/api-client'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

export function getApiClient(token?: string) {
  return createApiClient(apiUrl, token)
}
