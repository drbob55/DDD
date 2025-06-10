import { ValueObject } from './ValueObject';

interface CaseNumberProps {
  value: string;
}

export class CaseNumber extends ValueObject<CaseNumberProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: CaseNumberProps) {
    super(props);
  }

  public static generate(): CaseNumber {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return new CaseNumber({ value: `CASE-${timestamp}-${random}` });
  }

  public static create(value: string): CaseNumber {
    return new CaseNumber({ value });
  }
}
