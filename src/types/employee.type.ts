export type EmploymentStatus = 'Kontrak' | 'Tetap' | 'Freelance'

export interface EmployeeType {
  id: number
  name: string
  description?: string
}

export interface EmployeeLite {
  id: number
  name: string
  nip: string | null
}

export interface Employee {
  id: number
  nip: string | null
  employeeTypeId: number
  employeeType?: EmployeeType
  // Identitas
  name: string
  nickname?: string
  ktpNumber?: string
  phoneNumber?: string
  email?: string
  birthDate?: string
  address?: string
  photoUrl?: string
  // Pekerjaan
  companyId?: number
  company?: { id: number; name: string }
  branchId?: number
  branch?: { id: number; name: string }
  departmentId?: number
  department?: { id: number; name: string }
  divisionId?: number
  division?: { id: number; name: string }
  salesOrganizationId?: number
  salesOrganization?: { id: number; name: string }
  joinDate?: string
  employmentStatus?: EmploymentStatus
  supervisorId?: number
  supervisor?: EmployeeLite
  isActive: boolean
  // Akses sistem
  accessNcommand: boolean
  accessNforce: boolean
  isDraft: boolean
  createdAt: string
  updatedAt?: string
}

export interface CreateEmployeeDto {
  employeeTypeId: number
  name: string
  nip?: string
  nickname?: string
  ktpNumber?: string
  phoneNumber?: string
  email?: string
  birthDate?: string
  address?: string
  companyId?: number
  branchId?: number
  departmentId?: number
  divisionId?: number
  salesOrganizationId?: number
  joinDate?: string
  employmentStatus?: EmploymentStatus
  supervisorId?: number
  isActive?: boolean
  accessNcommand?: boolean
  accessNforce?: boolean
  isDraft: boolean
}

export interface UpdateEmployeeDto extends Partial<Omit<CreateEmployeeDto, 'isDraft'>> {
  isDraft?: boolean
}

export interface EmployeeSummary {
  active: number
  inactive: number
  draft: number
}
