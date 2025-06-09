import { ValueObject } from './ValueObject';

export enum CaseStatusEnum {
  NEW = 'NEW',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  SHIPPED = 'SHIPPED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

interface CaseStatusProps {
  value: CaseStatusEnum;
}

export class CaseStatus extends ValueObject<CaseStatusProps> {
  private static validTransitions: Record<CaseStatusEnum, CaseStatusEnum[]> = {
    [CaseStatusEnum.NEW]: [CaseStatusEnum.IN_REVIEW, CaseStatusEnum.CANCELLED],
    [CaseStatusEnum.IN_REVIEW]: [CaseStatusEnum.APPROVED, CaseStatusEnum.REJECTED, CaseStatusEnum.NEW],
    [CaseStatusEnum.APPROVED]: [CaseStatusEnum.IN_PRODUCTION, CaseStatusEnum.CANCELLED],
    [CaseStatusEnum.REJECTED]: [CaseStatusEnum.NEW, CaseStatusEnum.CANCELLED],
    [CaseStatusEnum.IN_PRODUCTION]: [CaseStatusEnum.SHIPPED, CaseStatusEnum.CANCELLED],
    [CaseStatusEnum.SHIPPED]: [CaseStatusEnum.COMPLETED],
    [CaseStatusEnum.COMPLETED]: [],
    [CaseStatusEnum.CANCELLED]: []
  };

  public static NEW = new CaseStatus({ value: CaseStatusEnum.NEW });
  public static IN_REVIEW = new CaseStatus({ value: CaseStatusEnum.IN_REVIEW });
  public static APPROVED = new CaseStatus({ value: CaseStatusEnum.APPROVED });
  public static REJECTED = new CaseStatus({ value: CaseStatusEnum.REJECTED });
  public static IN_PRODUCTION = new CaseStatus({ value: CaseStatusEnum.IN_PRODUCTION });
  public static SHIPPED = new CaseStatus({ value: CaseStatusEnum.SHIPPED });
  public static COMPLETED = new CaseStatus({ value: CaseStatusEnum.COMPLETED });
  public static CANCELLED = new CaseStatus({ value: CaseStatusEnum.CANCELLED });

  get value(): CaseStatusEnum {
    return this.props.value;
  }

  private constructor(props: CaseStatusProps) {
    super(props);
  }

  public static create(status: CaseStatusEnum): CaseStatus {
    return new CaseStatus({ value: status });
  }

  public canTransitionTo(status: CaseStatus): boolean {
    const allowedTransitions = CaseStatus.validTransitions[this.props.value];
    return allowedTransitions.includes(status.value);
  }

  public toString(): string {
    return this.props.value;
  }

  public isTerminal(): boolean {
    return [CaseStatusEnum.COMPLETED, CaseStatusEnum.CANCELLED].includes(this.props.value);
  }

  public isActive(): boolean {
    return !this.isTerminal();
  }
}
