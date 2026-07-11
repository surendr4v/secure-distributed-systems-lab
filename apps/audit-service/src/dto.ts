import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class AppendAuditDto {
  @IsString()
  @MaxLength(120)
  eventType!: string;

  @IsString()
  @MaxLength(120)
  actor!: string;

  @IsString()
  @MaxLength(120)
  resource!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
