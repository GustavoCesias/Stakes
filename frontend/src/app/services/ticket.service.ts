import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tip } from './tip.service';
import { environment } from '../../environments/environment';

export interface TicketSelection {
  id?: number;
  tip?: Tip;
  result: string;
}

export interface BetBuilder {
  id?: number;
  expectedOdds?: number;
  realOdds?: number;
  selections: TicketSelection[];
}

export interface Ticket {
  id?: number;
  date: string;
  type: string;
  bookmaker: string;
  stake: number;
  totalOdds: number;
  isCashout: boolean;
  cashoutAmount?: number;
  result: string;
  profit?: number;
  originalTipster: boolean;
  subgroup?: any; // ChannelSubgroup
  selections: TicketSelection[];
  betBuilders: BetBuilder[];
}

export interface TicketCloseRequest {
  result: string;
  cashoutAmount?: number;
  selectionResults?: { [key: number]: string };
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  private apiUrl = `${environment.apiUrl}/tickets`;

  constructor(private http: HttpClient) { }

  getTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(this.apiUrl);
  }

  createTicket(ticket: Ticket): Observable<Ticket> {
    return this.http.post<Ticket>(this.apiUrl, ticket);
  }

  updateResult(id: number, request: TicketCloseRequest): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.apiUrl}/${id}/result`, request);
  }

  deleteTicket(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
