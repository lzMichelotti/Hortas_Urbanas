const ACCESS_KEY = "hu_access_token"
const REFRESH_KEY = "hu_refresh_token"

export function getAccessToken(): string {
  return localStorage.getItem(ACCESS_KEY) ?? ""
}

export function getRefreshToken(): string {
  return localStorage.getItem(REFRESH_KEY) ?? ""
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function isAuthenticated(): boolean {
  return getAccessToken().length > 0
}
