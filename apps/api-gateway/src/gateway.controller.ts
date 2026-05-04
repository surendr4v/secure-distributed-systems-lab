import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { Public } from '@shared/index';
import { Request, Response } from 'express';
import { GatewayService } from './gateway.service';

@Controller()
export class GatewayController {
  constructor(private readonly gateway: GatewayService) {}

  @Public()
  @Post('auth/login')
  async login(@Body() body: unknown, @Res() res: Response): Promise<void> {
    const upstream = await this.gateway.login(body);
    const payload = await upstream.text();
    res.status(upstream.status).type('application/json').send(payload);
  }

  @Post('transactions')
  async createTransaction(
    @Req() req: Request,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKey: string,
    @Res() res: Response,
  ): Promise<void> {
    const upstream = await this.gateway.forwardToTransactions('/transactions', 'POST', req.headers.authorization, body, idempotencyKey);
    const payload = await upstream.text();
    res.status(upstream.status).type('application/json').send(payload);
  }

  @Get('transactions')
  async listTransactions(@Req() req: Request, @Query('limit') limit: string | undefined, @Res() res: Response): Promise<void> {
    const query = limit ? `/transactions?limit=${encodeURIComponent(limit)}` : '/transactions';
    const upstream = await this.gateway.forwardToTransactions(query, 'GET', req.headers.authorization);
    const payload = await upstream.text();
    res.status(upstream.status).type('application/json').send(payload);
  }

  @Get('transactions/:id')
  async getTransaction(@Req() req: Request, @Param('id') id: string, @Res() res: Response): Promise<void> {
    const upstream = await this.gateway.forwardToTransactions(`/transactions/${id}`, 'GET', req.headers.authorization);
    const payload = await upstream.text();
    res.status(upstream.status).type('application/json').send(payload);
  }

  @Patch('transactions/:id/status')
  async updateStatus(@Req() req: Request, @Param('id') id: string, @Body() body: unknown, @Res() res: Response): Promise<void> {
    const upstream = await this.gateway.forwardToTransactions(`/transactions/${id}/status`, 'PATCH', req.headers.authorization, body);
    const payload = await upstream.text();
    res.status(upstream.status).type('application/json').send(payload);
  }
}
