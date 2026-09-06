import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
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
  subgroup?: any;
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

  // Cache: null means not loaded yet, Observable means cached
  private cache$: Observable<Ticket[]> | null = null;

  constructor(private http: HttpClient) { }

  /** Returns cached tickets, or fetches from API if not cached */
  getTickets(): Observable<Ticket[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<Ticket[]>(this.apiUrl).pipe(
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  /** Call after any mutation to force re-fetch on next getTickets() */
  invalidateCache(): void {
    this.cache$ = null;
  }

  createTicket(ticket: Ticket): Observable<Ticket> {
    return this.http.post<Ticket>(this.apiUrl, ticket).pipe(
      tap(() => this.invalidateCache())
    );
  }

  updateResult(id: number, request: TicketCloseRequest): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.apiUrl}/${id}/result`, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  deleteTicket(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }
}
