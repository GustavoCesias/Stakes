import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BankrollTransaction {
  id?: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  date: string;
  description?: string;
}

export interface BankrollSummary {
  initialBalance: number;
  startDate?: string;
  totalDeposits: number;
  totalWithdrawals: number;
  transactions: BankrollTransaction[];
}

@Injectable({
  providedIn: 'root'
})
export class BankrollService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/bankroll`;

  private cache$: Observable<BankrollSummary> | null = null;

  getBankrollSummary(): Observable<BankrollSummary> {
    if (!this.cache$) {
      this.cache$ = this.http.get<BankrollSummary>(this.apiUrl).pipe(
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  invalidateCache(): void {
    this.cache$ = null;
  }

  updateInitialBalance(initialBalance: number, startDate?: string): Observable<{ id: number; initialBalance: number; startDate: string }> {
    return this.http.put<{ id: number; initialBalance: number; startDate: string }>(
      `${this.apiUrl}/initial`,
      { initialBalance, startDate }
    ).pipe(
      tap(() => this.invalidateCache())
    );
  }

  addTransaction(transaction: BankrollTransaction): Observable<BankrollTransaction> {
    return this.http.post<BankrollTransaction>(`${this.apiUrl}/transactions`, transaction).pipe(
      tap(() => this.invalidateCache())
    );
  }

  deleteTransaction(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/transactions/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }
}
