import { Pipe, PipeTransform } from '@angular/core';
import { Ticket } from './ticket.service';

@Pipe({ name: 'countResult', standalone: true })
export class CountResultPipe implements PipeTransform {
  transform(tickets: Ticket[], result: string): number {
    return tickets.filter(t => t.result === result).length;
  }
}
