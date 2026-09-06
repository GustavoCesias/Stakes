import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  constructor(private http: HttpClient) { }

  getChannels(): Observable<Channel[]> {
    return this.http.get<Channel[]>(this.apiUrl);
  }

  createChannel(channel: Channel): Observable<Channel> {
    return this.http.post<Channel>(this.apiUrl, channel);
  }

  getSubgroups(channelId: number): Observable<ChannelSubgroup[]> {
    return this.http.get<ChannelSubgroup[]>(`${this.apiUrl}/${channelId}/subgroups`);
  }

  createSubgroup(channelId: number, subgroup: ChannelSubgroup): Observable<ChannelSubgroup> {
    return this.http.post<ChannelSubgroup>(`${this.apiUrl}/${channelId}/subgroups`, subgroup);
  }

  deleteChannel(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  deleteSubgroup(subgroupId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/subgroups/${subgroupId}`);
  }
}
