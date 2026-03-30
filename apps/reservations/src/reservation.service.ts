import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

interface Reservation {
  id: string;
  guest: string;
  room: string;
  checkIn: string;
  checkOut: string;
  status: 'pending' | 'confirmed';
}

@Injectable()
export class ReservationService {
  private readonly store = new Map<string, Reservation>();

  create(dto: Omit<Reservation, 'id' | 'status'>) {
    const reservation: Reservation = { ...dto, id: uuid(), status: 'pending' };
    this.store.set(reservation.id, reservation);
    return reservation;
  }

  find(id: string) {
    return this.store.get(id);
  }
}
