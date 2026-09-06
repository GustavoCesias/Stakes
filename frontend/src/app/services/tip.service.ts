import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { Channel, ChannelSubgroup } from './channel.service';
import { environment } from '../../environments/environment';

export interface Tip {
  id?: number;
  channel: Channel | null;
  subgroup?: ChannelSubgroup | null;
  date: string;
  event: string;
  sport?: string;
  league?: string;
  market: string;
  pick: string;
  odds: number;
  result: string;
}

@Injectable({
  providedIn: 'root'
})
export class TipService {

  private apiUrl = `${environment.apiUrl}/tips`;

  private cache$: Observable<Tip[]> | null = null;

  constructor(private http: HttpClient) { }

  getTips(): Observable<Tip[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<Tip[]>(this.apiUrl).pipe(
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  invalidateCache(): void {
    this.cache$ = null;
  }

  createTip(tip: Tip): Observable<Tip> {
    return this.http.post<Tip>(this.apiUrl, tip).pipe(
      tap(() => this.invalidateCache())
    );
  }

  updateTip(id: number, tip: Tip): Observable<Tip> {
    return this.http.put<Tip>(`${this.apiUrl}/${id}`, tip).pipe(
      tap(() => this.invalidateCache())
    );
  }

  deleteTip(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }
}
