import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService, Ticket } from '../../services/ticket.service';
import { BankrollService, BankrollTransaction, BankrollSummary } from '../../services/bankroll.service';
import { ChannelService, Channel } from '../../services/channel.service';
import { RouterModule } from '@angular/router';
import { CountResultPipe } from '../../services/count-result.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CountResultPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private ticketService = inject(TicketService);
  private bankrollService = inject(BankrollService);
  private channelService = inject(ChannelService);
  Number = Number;

  allRawTickets: Ticket[] = [];
  channels: Channel[] = [];
  isLoading = true;

  // View & Filter state
  activeMode: 'mine' | 'tipster' = 'mine';
  selectedChannelId: number | null = null;

  // Bankroll state
  initialBalance: number = 0;
  bankrollStartDate: string = '2026-09-01';
  totalDeposits: number = 0;
  totalWithdrawals: number = 0;
  transactions: BankrollTransaction[] = [];

  // Modals state
  showInitialModal = false;
  inputInitialBalance: number = 0;
  inputStartDate: string = '2026-09-01';

  showTransactionModal = false;
  transactionForm: { type: 'DEPOSIT' | 'WITHDRAWAL'; amount: number | null; date: string; description: string } = {
    type: 'DEPOSIT',
    amount: null,
    date: new Date().toISOString().substring(0, 10),
    description: ''
  };

  showHistoryModal = false;

  ngOnInit() {
    this.loadTickets();
    this.loadChannels();
    this.loadBankroll();
  }

  loadTickets() {
    this.ticketService.getTickets().subscribe({
      next: (data) => {
        this.allRawTickets = data;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  loadChannels() {
    this.channelService.getChannels().subscribe({
      next: (data) => {
        this.channels = data;
      },
      error: (err) => console.error('Error loading channels:', err)
    });
  }

  loadBankroll() {
    this.bankrollService.getBankrollSummary().subscribe({
      next: (data: BankrollSummary) => {
        this.initialBalance = Number(data.initialBalance) || 0;
        this.bankrollStartDate = data.startDate || '2026-09-01';
        this.totalDeposits = Number(data.totalDeposits) || 0;
        this.totalWithdrawals = Number(data.totalWithdrawals) || 0;
        this.transactions = data.transactions || [];
      },
      error: (err) => console.error('Error loading bankroll', err)
    });
  }

  get tickets(): Ticket[] {
    let list = this.allRawTickets;
    if (this.activeMode === 'mine') {
      list = list.filter(t => !t.originalTipster);
    } else {
      list = list.filter(t => t.originalTipster);
    }

    if (this.selectedChannelId !== null) {
      list = list.filter(t =>
        (t.selections && t.selections.some(s => s.tip?.channel?.id === this.selectedChannelId)) ||
        (t.betBuilders && t.betBuilders.some(bb => bb.selections && bb.selections.some(s => s.tip?.channel?.id === this.selectedChannelId)))
      );
    }

    return list;
  }

  setMode(mode: 'mine' | 'tipster') {
    this.activeMode = mode;
  }

  setChannelFilter(channelId: number | null) {
    this.selectedChannelId = channelId;
  }

  get myTickets(): Ticket[] { return this.allRawTickets.filter(t => !t.originalTipster); }

  get totalProfit(): number {
    return this.tickets.reduce((acc, t) => acc + (Number(t.profit) || 0), 0);
  }

  get winRate(): number {
    const closed = this.tickets.filter(t => t.result === 'GANADA' || t.result === 'PERDIDA');
    if (closed.length === 0) return 0;
    return Math.round((closed.filter(t => t.result === 'GANADA').length / closed.length) * 100);
  }

  get winRateDetail(): string {
    const closed = this.tickets.filter(t => t.result === 'GANADA' || t.result === 'PERDIDA');
    const won = closed.filter(t => t.result === 'GANADA').length;
    return `${won} de ${closed.length} cerradas`;
  }

  get pendingTickets(): Ticket[] {
    return this.tickets.filter(t => t.result === 'PENDIENTE');
  }

  get totalInvested(): number {
    return this.pendingTickets.reduce((acc, t) => acc + (Number(t.stake) || 0), 0);
  }

  get yield(): number {
    const totalStake = this.tickets.reduce((acc, t) => acc + (Number(t.stake) || 0), 0);
    if (totalStake === 0) return 0;
    return Math.round((this.totalProfit / totalStake) * 100);
  }

  get recentTickets(): Ticket[] {
    return [...this.tickets]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }

  get profitPositive(): boolean { return this.totalProfit >= 0; }

  // Bankroll Calculations
  get netCapitalInjected(): number {
    return (Number(this.initialBalance) || 0) + (Number(this.totalDeposits) || 0) - (Number(this.totalWithdrawals) || 0);
  }

  get currentBankroll(): number {
    return this.netCapitalInjected + this.totalProfit;
  }

  get availableBankroll(): number {
    return this.currentBankroll - this.totalInvested;
  }

  get bankrollGrowthPct(): number {
    if (this.netCapitalInjected <= 0) return 0;
    return parseFloat(((this.totalProfit / this.netCapitalInjected) * 100).toFixed(1));
  }

  get allMovements(): any[] {
    const list: any[] = [];
    if (this.initialBalance > 0) {
      list.push({
        isInitial: true,
        type: 'INITIAL',
        amount: this.initialBalance,
        date: this.bankrollStartDate || '2026-09-01',
        description: 'Banca Inicial del Mes'
      });
    }
    this.transactions.forEach(t => list.push({ ...t, isInitial: false }));
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  get movementsCount(): number {
    return this.allMovements.length;
  }

  // Modals Actions
  openInitialModal() {
    this.inputInitialBalance = this.initialBalance;
    this.inputStartDate = this.bankrollStartDate || '2026-09-01';
    this.showInitialModal = true;
  }

  closeInitialModal() {
    this.showInitialModal = false;
  }

  saveInitialBalance() {
    const val = Number(this.inputInitialBalance);
    if (isNaN(val) || val < 0) {
      alert('Por favor ingresa un monto válido.');
      return;
    }
    const dateVal = this.inputStartDate || '2026-09-01';
    this.bankrollService.updateInitialBalance(val, dateVal).subscribe({
      next: () => {
        this.initialBalance = val;
        this.bankrollStartDate = dateVal;
        this.showInitialModal = false;
      },
      error: (err) => alert('Error actualizando banca inicial: ' + err.message)
    });
  }

  openTransactionModal(type: 'DEPOSIT' | 'WITHDRAWAL') {
    this.transactionForm = {
      type,
      amount: null,
      date: new Date().toISOString().substring(0, 10),
      description: ''
    };
    this.showTransactionModal = true;
  }

  closeTransactionModal() {
    this.showTransactionModal = false;
  }

  saveTransaction() {
    if (!this.transactionForm.amount || this.transactionForm.amount <= 0) {
      alert('Ingresa un monto válido.');
      return;
    }
    const tx: BankrollTransaction = {
      type: this.transactionForm.type,
      amount: Number(this.transactionForm.amount),
      date: this.transactionForm.date || new Date().toISOString().substring(0, 10),
      description: this.transactionForm.description
    };
    this.bankrollService.addTransaction(tx).subscribe({
      next: () => {
        this.loadBankroll();
        this.showTransactionModal = false;
      },
      error: (err) => alert('Error guardando transacción: ' + err.message)
    });
  }

  openHistoryModal() {
    this.showHistoryModal = true;
  }

  closeHistoryModal() {
    this.showHistoryModal = false;
  }

  deleteTransaction(id?: number) {
    if (!id) return;
    if (confirm('¿Deseas eliminar este movimiento de banca?')) {
      this.bankrollService.deleteTransaction(id).subscribe({
        next: () => this.loadBankroll(),
        error: (err) => alert('Error eliminando movimiento: ' + err.message)
      });
    }
  }
}
