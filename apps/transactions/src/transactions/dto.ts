import { IsISO4217CurrencyCode, IsNotEmpty, IsNumber, IsPositive, IsString, Length } from 'class-validator';

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsString()
  fromAccount: string;

  @IsNotEmpty()
  @IsString()
  toAccount: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsISO4217CurrencyCode()
  currency: string;

  @Length(1, 140)
  @IsString()
  purpose: string;
}
