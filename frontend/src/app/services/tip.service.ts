import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  constructor(private http: HttpClient) { }

  getTips(): Observable<Tip[]> {
    return this.http.get<Tip[]>(this.apiUrl);
  }

  createTip(tip: Tip): Observable<Tip> {
    return this.http.post<Tip>(this.apiUrl, tip);
  }

  deleteTip(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
