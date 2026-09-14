import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { League } from './config.service';

export interface SportEvent {
  id?: number;
  homeTeam: string;
  awayTeam: string;
  eventDate: string; // ISO string
  league: League;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/calendar`;

  getEvents(start: string, end: string, leagueId?: number): Observable<SportEvent[]> {
    let params = new HttpParams()
      .set('start', start)
      .set('end', end);
    if (leagueId) {
      params = params.set('leagueId', leagueId.toString());
    }
    return this.http.get<SportEvent[]>(`${this.apiUrl}/events`, { params });
  }

  createEvent(event: SportEvent): Observable<SportEvent> {
    return this.http.post<SportEvent>(`${this.apiUrl}/events`, event);
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/events/${id}`);
  }

  getTipsForEvent(date: string, homeTeam: string, awayTeam: string): Observable<any[]> {
    const dateStr = date.substring(0, 10);
    return this.http.get<any[]>(`${this.apiUrl}/events/tips?date=${dateStr}&homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}`);
  }
}
