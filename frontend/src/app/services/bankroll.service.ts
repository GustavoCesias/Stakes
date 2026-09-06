import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  getBankrollSummary(): Observable<BankrollSummary> {
    return this.http.get<BankrollSummary>(this.apiUrl);
  }

  updateInitialBalance(initialBalance: number, startDate?: string): Observable<{ id: number; initialBalance: number; startDate: string }> {
    return this.http.put<{ id: number; initialBalance: number; startDate: string }>(`${this.apiUrl}/initial`, { initialBalance, startDate });
  }

  addTransaction(transaction: BankrollTransaction): Observable<BankrollTransaction> {
    return this.http.post<BankrollTransaction>(`${this.apiUrl}/transactions`, transaction);
  }

  deleteTransaction(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/transactions/${id}`);
  }
}
