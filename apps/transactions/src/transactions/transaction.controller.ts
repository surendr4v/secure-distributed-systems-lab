import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Roles } from '../security/roles.decorator';
import { ApproveTransactionDto, CreateTransactionDto } from './dto';
import { TransactionRecord, TransactionService } from './transaction.service';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly service: TransactionService) {}

  @Post()
  @Roles('payments:write')
  create(
    @Body() body: CreateTransactionDto,
    @Req() req: any,
  ): TransactionRecord {
    const traceId =
      (req.headers['x-trace-id'] as string) ||
      (req.headers['x-request-id'] as string);
    const idempotencyKey =
      (req.headers['x-idempotency-key'] as string) ||
      (req.headers['idempotency-key'] as string);

    const existing = idempotencyKey
      ? this.service.findByIdempotencyKey(idempotencyKey)
      : undefined;
    if (existing) {
      return existing;
    }

    const actor =
      req.user?.sub || req.user?.email || req.servicePrincipal?.service;
    return this.service.submit(body, traceId, idempotencyKey, actor);
  }

  @Post(':id/approve')
  @Roles('payments:approve')
  approve(
    @Param('id') id: string,
    @Body() body: ApproveTransactionDto,
    @Req() req: any,
  ): TransactionRecord {
    const approverId =
      body.approverId || req.user?.sub || req.servicePrincipal?.service;

    try {
      const approved = this.service.approve(id, {
        ...body,
        approverId,
      });

      if (!approved) {
        throw new NotFoundException(`Transaction ${id} not found`);
      }

      return approved;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Approval failed';
      throw new BadRequestException(message);
    }
  }

  @Get(':id')
  @Roles('payments:read')
  getOne(@Param('id') id: string): TransactionRecord {
    const record = this.service.findOne(id);
    if (!record) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    return record;
  }
}
