import { ValueObject } from './ValueObject';
import { Result } from '../../shared/Result';

export enum CaseTypeEnum {
  ALIGNER = 'ALIGNER',
  BRACES = 'BRACES',
  RETAINER = 'RETAINER',
  CONSULTATION = 'CONSULTATION'
}

interface CaseTypeProps {
  value: CaseTypeEnum;
}

export class CaseType extends ValueObject<CaseTypeProps> {
  get value(): CaseTypeEnum {
    return this.props.value;
  }

  private constructor(props: CaseTypeProps) {
    super(props);
  }

  public static create(type: string): Result<CaseType> {
    if (!Object.values(CaseTypeEnum).includes(type as CaseTypeEnum)) {
      return Result.fail<CaseType>('Invalid case type');
    }

    return Result.ok<CaseType>(new CaseType({ value: type as CaseTypeEnum }));
  }

  public toString(): string {
    return this.props.value;
  }
}
