import { Injectable, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
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

  /** Shared reactive state — all subscribers get live updates */
  private _tickets$ = new BehaviorSubject<Ticket[]>([]);
  private _loaded = false;
  private _loading = false;

  constructor(private http: HttpClient) {}

  /**
   * Returns a live Observable. Triggers an API fetch on first call.
   * All subscribers (Dashboard, TicketManager, etc.) automatically
   * receive updates when refresh() is called after any mutation.
   */
  getTickets(): Observable<Ticket[]> {
    if (!this._loaded && !this._loading) {
      this._fetch();
    }
    return this._tickets$.asObservable();
  }

  private _fetch(): void {
    this._loading = true;
    this.http.get<Ticket[]>(this.apiUrl).subscribe({
      next: (data) => {
        this._tickets$.next(data);
        this._loaded = true;
        this._loading = false;
      },
      error: () => {
        this._loading = false;
      }
    });
  }

  /** Force re-fetch and push fresh data to all subscribers */
  refresh(): void {
    this._loaded = false;
    this._fetch();
  }

  createTicket(ticket: Ticket): Observable<Ticket> {
    return this.http.post<Ticket>(this.apiUrl, ticket).pipe(
      tap(() => this.refresh())
    );
  }

  updateResult(id: number, request: TicketCloseRequest): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.apiUrl}/${id}/result`, request).pipe(
      tap((updated) => {
        // Immediately update the ticket in the shared state for instant UI response
        const current = this._tickets$.value;
        const idx = current.findIndex(t => t.id === updated.id);
        if (idx !== -1) {
          const updated$ = [...current];
          updated$[idx] = updated;
          this._tickets$.next(updated$);
        }
        // Then also trigger a full refresh to ensure consistency
        this.refresh();
      })
    );
  }

  deleteTicket(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.refresh())
    );
  }
}
