export interface Permission {
  key: string
  label: string
}

export interface Role {
  id: string
  name: string
  color: string
  bg: string
  permissions: string[]
}

export interface Group {
  id: string
  name: string
  memberIds: string[]
}

export type TeamMemberStatus = 'active' | 'invited' | 'disabled'

export interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  roleId: string
  groupIds: string[]
  status: TeamMemberStatus
}
