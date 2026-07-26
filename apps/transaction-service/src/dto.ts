import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsUUID()
  fromAccountId!: string;

  @IsUUID()
  toAccountId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsOptional()
  @IsString()
  @Length(1, 140)
  description?: string;
}

export class UpdateTransactionStatusDto {
  @IsString()
  @IsIn(['PENDING', 'COMPLETED', 'REJECTED'])
  status!: 'PENDING' | 'COMPLETED' | 'REJECTED';
}
