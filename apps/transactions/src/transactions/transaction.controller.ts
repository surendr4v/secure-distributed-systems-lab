import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
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
    const traceId = req.headers['x-trace-id'] as string;
    return this.service.submit(body, traceId);
  }

  @Get(':id')
  @Roles('payments:read')
  getOne(@Param('id') id: string): TransactionRecord {
    const record = this.service.findOne(id);
    return record;
  }
}
