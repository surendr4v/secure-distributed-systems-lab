import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { Roles } from '../../transactions/src/security/roles.decorator';
import { Public } from '../../transactions/src/security/public.decorator';
import { ReservationService } from './reservation.service';

@Controller('reservations')
export class ReservationController {
  constructor(private readonly service: ReservationService) {}

  @Get('health')
  @Public()
  health() {
    return { service: 'reservation-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  @Post()
  @Roles('reservations:write')
  create(@Body() dto: { guest: string; room: string; checkIn: string; checkOut: string }) {
    return this.service.create(dto);
  }

  @Get(':id')
  @Roles('reservations:read')
  find(@Param('id') id: string) {
    return this.service.find(id);
  }
}
