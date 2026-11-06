import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InternalOnly, Roles } from '@shared/index';
import { AppendAuditDto } from './dto';
import {
  AuditRow,
  AuditService,
  AuditVerificationResult,
} from './audit.service';

@Controller('audit-events')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @InternalOnly()
  @Post()
  append(@Body() dto: AppendAuditDto): Promise<{ id: string; hash: string }> {
    return this.service.append(dto);
  }

  @Roles('Auditor')
  @Get()
  async list(@Query('limit') limit?: string): Promise<AuditRow[]> {
    const parsed = limit ? Number(limit) : 100;
    const safeLimit =
      Number.isFinite(parsed) && parsed > 0 && parsed <= 500 ? parsed : 100;
    return this.service.list(safeLimit);
  }

  @Roles('Auditor')
  @Get('verify')
  async verify(): Promise<AuditVerificationResult> {
    const records = await this.service.list(500);
    return this.service.verifyChain(records);
  }
}
