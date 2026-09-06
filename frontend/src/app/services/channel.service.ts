import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Channel {
  id?: number;
  name: string;
  type: string;
}

export interface ChannelSubgroup {
  id?: number;
  name: string;
  channel?: Channel;
}

@Injectable({
  providedIn: 'root'
})
export class ChannelService {

  private apiUrl = `${environment.apiUrl}/channels`;

  private channelsCache$: Observable<Channel[]> | null = null;
  private subgroupsCache: Map<number, Observable<ChannelSubgroup[]>> = new Map();

  constructor(private http: HttpClient) { }

  getChannels(): Observable<Channel[]> {
    if (!this.channelsCache$) {
      this.channelsCache$ = this.http.get<Channel[]>(this.apiUrl).pipe(
        shareReplay(1)
      );
    }
    return this.channelsCache$;
  }

  invalidateCache(): void {
    this.channelsCache$ = null;
    this.subgroupsCache.clear();
  }

  createChannel(channel: Channel): Observable<Channel> {
    return this.http.post<Channel>(this.apiUrl, channel).pipe(
      tap(() => this.invalidateCache())
    );
  }

  getSubgroups(channelId: number): Observable<ChannelSubgroup[]> {
    if (!this.subgroupsCache.has(channelId)) {
      const obs$ = this.http.get<ChannelSubgroup[]>(`${this.apiUrl}/${channelId}/subgroups`).pipe(
        shareReplay(1)
      );
      this.subgroupsCache.set(channelId, obs$);
    }
    return this.subgroupsCache.get(channelId)!;
  }

  createSubgroup(channelId: number, subgroup: ChannelSubgroup): Observable<ChannelSubgroup> {
    return this.http.post<ChannelSubgroup>(`${this.apiUrl}/${channelId}/subgroups`, subgroup).pipe(
      tap(() => this.subgroupsCache.delete(channelId))
    );
  }

  updateChannel(id: number, channel: Channel): Observable<Channel> {
    return this.http.put<Channel>(`${this.apiUrl}/${id}`, channel).pipe(
      tap(() => this.invalidateCache())
    );
  }

  updateSubgroup(id: number, subgroup: ChannelSubgroup, channelId: number): Observable<ChannelSubgroup> {
    return this.http.put<ChannelSubgroup>(`${this.apiUrl}/subgroups/${id}`, subgroup).pipe(
      tap(() => this.subgroupsCache.delete(channelId))
    );
  }

  deleteChannel(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }

  deleteSubgroup(subgroupId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/subgroups/${subgroupId}`).pipe(
      tap(() => this.subgroupsCache.clear())
    );
  }
}
