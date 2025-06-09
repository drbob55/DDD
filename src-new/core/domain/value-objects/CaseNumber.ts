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
    const date = new Date();
    const year = date.getFullYear().toString().slice(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const number = `CASE-${year}${month}${day}-${sequence}`;
    return new CaseNumber({ value: number });
  }

  public static create(value: string): CaseNumber {
    return new CaseNumber({ value });
  }

  public toString(): string {
    return this.props.value;
  }
}
