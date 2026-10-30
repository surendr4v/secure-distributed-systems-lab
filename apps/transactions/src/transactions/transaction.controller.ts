import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Roles } from '../security/roles.decorator';
import { CreateTransactionDto } from './dto';
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

    return this.service.submit(body, traceId, idempotencyKey);
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
