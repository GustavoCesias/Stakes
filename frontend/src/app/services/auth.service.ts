import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  token: string;
  username: string;
  name: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private tokenKey = 'stakes_auth_token';
  private userKey = 'stakes_user_info';

  private currentUserSubject = new BehaviorSubject<any>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  private getUserFromStorage(): any {
    const data = localStorage.getItem(this.userKey);
    return data ? JSON.parse(data) : null;
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { username, password })
      .pipe(
        tap(res => {
          if (res && res.token) {
            localStorage.setItem(this.tokenKey, res.token);
            const user = { username: res.username, name: res.name, role: res.role };
            localStorage.setItem(this.userKey, JSON.stringify(user));
            this.currentUserSubject.next(user);
          }
        })
      );
  }

  register(username: string, password: string, name: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/register`, { username, password, name });
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
    // Force a full page reload to clear all Angular singleton caches (e.g. channel.service caching)
    window.location.href = '/login';
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUserName(): string {
    const user = this.currentUserSubject.value;
    return user?.name || user?.username || 'Usuario';
  }

  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'ROLE_ADMIN';
  }

  exportBackup(): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/backup/export`, { responseType: 'blob' });
  }

  importBackup(backupData: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/backup/import`, backupData);
  }
}
