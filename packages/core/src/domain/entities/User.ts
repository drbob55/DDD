export interface UserProps {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class User {
  private props: UserProps

  constructor(props: UserProps) {
    this.props = props
  }

  get id(): string {
    return this.props.id
  }

  get email(): string {
    return this.props.email
  }

  get fullName(): string {
    return [this.props.firstName, this.props.lastName].filter(Boolean).join(' ')
  }

  get role(): string {
    return this.props.role
  }

  isAdmin(): boolean {
    return this.props.role === 'ADMIN'
  }

  isDentist(): boolean {
    return this.props.role === 'DENTIST'
  }
}
