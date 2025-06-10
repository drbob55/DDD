import { ValueObject } from './ValueObject';

interface PatientNumberProps {
  value: string;
}

export class PatientNumber extends ValueObject<PatientNumberProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: PatientNumberProps) {
    super(props);
  }

  public static generate(): PatientNumber {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 5);
    return new PatientNumber({ value: `P${timestamp}${randomStr}`.toUpperCase() });
  }

  public static create(value: string): PatientNumber {
    return new PatientNumber({ value });
  }

  public toString(): string {
    return this.props.value;
  }
}
