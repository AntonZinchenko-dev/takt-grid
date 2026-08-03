export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }))
    throw new ApiError(body.message ?? 'Ошибка запроса', response.status)
  }
  return response.json() as Promise<T>
}
