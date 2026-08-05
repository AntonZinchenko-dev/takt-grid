import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireDigit: boolean
  requireSymbol: boolean
  expiryDays: number
}

interface PasswordPolicyState extends PasswordPolicy {
  setPolicy: (patch: Partial<PasswordPolicy>) => void
}

export const usePasswordPolicyStore = create<PasswordPolicyState>()(
  persist(
    (set) => ({
      minLength: 8,
      requireUppercase: true,
      requireDigit: true,
      requireSymbol: false,
      expiryDays: 90,
      setPolicy: (patch) => set(patch),
    }),
    { name: 'taktgrid.password-policy' },
  ),
)

/** Возвращает текст первой нарушенной проверки или null, если пароль соответствует политике. */
export function validatePassword(password: string, policy: PasswordPolicy): string | null {
  if (password.length < policy.minLength) return `Минимум ${policy.minLength} символов`
  if (policy.requireUppercase && !/[A-ZА-Я]/.test(password)) return 'Нужна хотя бы одна заглавная буква'
  if (policy.requireDigit && !/\d/.test(password)) return 'Нужна хотя бы одна цифра'
  if (policy.requireSymbol && !/[^A-Za-zА-Яа-я0-9]/.test(password)) return 'Нужен хотя бы один спецсимвол'
  return null
}
