import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Sport {
  id?: number;
  name: string;
  icon?: string;
}

export interface League {
  id?: number;
  name: string;
  country?: string;
  sport: Sport;
}

export interface MarketConfig {
  id?: number;
  name: string;
  inputType: 'NUMERIC' | 'OPTIONS' | 'TEXT';
  options: string[];
  sport?: Sport;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/config`;

  // Sports
  getSports(): Observable<Sport[]> {
    return this.http.get<Sport[]>(`${this.apiUrl}/sports`);
  }

  createSport(sport: Sport): Observable<Sport> {
    return this.http.post<Sport>(`${this.apiUrl}/sports`, sport);
  }

  deleteSport(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/sports/${id}`);
  }

  // Leagues
  getLeagues(): Observable<League[]> {
    return this.http.get<League[]>(`${this.apiUrl}/leagues`);
  }

  createLeague(league: League): Observable<League> {
    return this.http.post<League>(`${this.apiUrl}/leagues`, league);
  }

  deleteLeague(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/leagues/${id}`);
  }

  // Markets
  getMarkets(): Observable<MarketConfig[]> {
    return this.http.get<MarketConfig[]>(`${this.apiUrl}/markets`);
  }

  createMarket(market: MarketConfig): Observable<MarketConfig> {
    return this.http.post<MarketConfig>(`${this.apiUrl}/markets`, market);
  }

  deleteMarket(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/markets/${id}`);
  }
}
