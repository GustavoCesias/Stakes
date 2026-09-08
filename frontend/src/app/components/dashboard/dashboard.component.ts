import { Component, OnInit, inject, DestroyRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService, Ticket } from '../../services/ticket.service';
import { BankrollService, BankrollTransaction, BankrollSummary } from '../../services/bankroll.service';
import { TicketDetailModalComponent } from '../shared/ticket-detail-modal/ticket-detail-modal.component';
import { ChannelService, Channel } from '../../services/channel.service';
import { RouterModule } from '@angular/router';
import { CountResultPipe } from '../../services/count-result.pipe';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chart, ChartConfiguration, ChartOptions, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CountResultPipe, TicketDetailModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef;
  chartInstance: Chart | null = null;
  private ticketService = inject(TicketService);
  private bankrollService = inject(BankrollService);
  private channelService = inject(ChannelService);
  private destroyRef = inject(DestroyRef);
  Number = Number;

  allRawTickets: Ticket[] = [];
  channels: Channel[] = [];
  isLoading = true;
  selectedTicket: Ticket | null = null;

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

  // Chart state
  chartTimeRange: '7d' | '30d' | 'all' = '30d';
  chartMode: 'bankroll' | 'profit' = 'bankroll';

  ngOnInit() {
    this.loadTickets();
    this.loadChannels();
    this.loadBankroll();
  }

  loadTickets() {
    // Uses takeUntilDestroyed so this subscription stays alive for the component's lifetime.
    // When TicketService.refresh() is called (after any mutation), this auto-updates.
    this.ticketService.getTickets()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.allRawTickets = data;
          this.isLoading = false;
          this.updateChart();
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
        this.updateChart();
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
    this.updateChart();
  }

  setChannelFilter(channelId: number | null) {
    this.selectedChannelId = channelId;
    this.updateChart();
  }

  setChartTimeRange(range: '7d' | '30d' | 'all') {
    this.chartTimeRange = range;
    this.updateChart();
  }

  setChartMode(mode: 'bankroll' | 'profit') {
    this.chartMode = mode;
    this.updateChart();
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

  /** Returns the event summary string for a ticket (e.g. "Real Madrid vs Barça +1") */
  getEventSummary(ticket: Ticket): string {
    const events = new Set<string>();
    if (ticket.selections) {
      ticket.selections.forEach(sel => {
        if (sel.tip?.event) events.add(sel.tip.event);
      });
    }
    if (ticket.betBuilders) {
      ticket.betBuilders.forEach(bb => {
        if (bb.selections) {
          bb.selections.forEach(sel => {
            if (sel.tip?.event) events.add(sel.tip.event);
          });
        }
      });
    }
    const arr = Array.from(events);
    if (arr.length === 0) return ticket.bookmaker || 'Sin evento';
    if (arr.length === 1) return arr[0];
    return `${arr[0]} +${arr.length - 1} más`;
  }

  viewTicket(ticket: Ticket) { this.selectedTicket = ticket; }
  closeViewTicket() { this.selectedTicket = null; }

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

  updateChart() {
    if (this.isLoading) return;
    
    // 1. Determine date range
    const today = new Date();
    // Use local timezone for today
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localToday = new Date(today.getTime() - tzOffset);
    const todayStr = localToday.toISOString().substring(0, 10);
    
    let startStr = this.bankrollStartDate;
    if (this.chartTimeRange === '7d') {
      const d = new Date(localToday.getTime() - 6 * 24 * 60 * 60 * 1000);
      startStr = d.toISOString().substring(0, 10);
    } else if (this.chartTimeRange === '30d') {
      const d = new Date(localToday.getTime() - 29 * 24 * 60 * 60 * 1000);
      startStr = d.toISOString().substring(0, 10);
    }
    
    // Ensure startStr is not before bankrollStartDate
    if (startStr < this.bankrollStartDate) {
      startStr = this.bankrollStartDate;
    }

    // 2. Build array of dates
    const dates: string[] = [];
    let currentD = new Date(startStr);
    const endD = new Date(todayStr);
    while (currentD <= endD) {
      dates.push(currentD.toISOString().substring(0, 10));
      currentD.setDate(currentD.getDate() + 1);
    }

    // 3. Calculate daily profit and net deposits using ALL raw tickets matching the active mode/channel
    const dailyProfitMap = new Map<string, number>();
    const dailyNetDepositsMap = new Map<string, number>();

    dates.forEach(d => {
      dailyProfitMap.set(d, 0);
      dailyNetDepositsMap.set(d, 0);
    });

    // Use this.tickets which respects activeMode and selectedChannelId
    this.tickets.filter(t => t.result === 'GANADA' || t.result === 'PERDIDA').forEach(t => {
      const d = t.date;
      if (dailyProfitMap.has(d)) {
        dailyProfitMap.set(d, dailyProfitMap.get(d)! + Number(t.profit || 0));
      }
    });

    this.transactions.forEach(tx => {
      const d = tx.date;
      if (dailyNetDepositsMap.has(d)) {
        const amt = tx.type === 'DEPOSIT' ? Number(tx.amount) : -Number(tx.amount);
        dailyNetDepositsMap.set(d, dailyNetDepositsMap.get(d)! + amt);
      }
    });

    // Calculate historical base before startStr
    let initialBankrollAtStartDate = Number(this.initialBalance) || 0;
    this.tickets.filter(t => t.result === 'GANADA' || t.result === 'PERDIDA').forEach(t => {
       if (t.date < startStr) {
           initialBankrollAtStartDate += Number(t.profit || 0);
       }
    });
    this.transactions.forEach(tx => {
       if (tx.date < startStr) {
           const amt = tx.type === 'DEPOSIT' ? Number(tx.amount) : -Number(tx.amount);
           initialBankrollAtStartDate += amt;
       }
    });

    // 4. Build datasets
    const labels = dates.map(d => {
      const parts = d.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
      return d;
    });

    if (this.chartMode === 'profit') {
      const data = dates.map(d => parseFloat((dailyProfitMap.get(d) || 0).toFixed(2)));
      
      this.renderChart({
        type: 'bar',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: data.map(val => val >= 0 ? 'rgba(52, 211, 153, 0.8)' : 'rgba(248, 113, 113, 0.8)'),
            borderColor: data.map(val => val >= 0 ? 'rgb(52, 211, 153)' : 'rgb(248, 113, 113)'),
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: this.getChartOptions()
      });
    } else {
      let current = initialBankrollAtStartDate;
      const data = dates.map(d => {
        current += (dailyNetDepositsMap.get(d) || 0) + (dailyProfitMap.get(d) || 0);
        return parseFloat(current.toFixed(2));
      });
      
      this.renderChart({
        type: 'line',
        data: {
          labels,
          datasets: [{
            data,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#3b82f6',
            borderWidth: 2
          }]
        },
        options: this.getChartOptions()
      });
    }
  }
  
  private getChartOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
      }
    };
  }

  private renderChart(config: any) {
    if (!this.chartCanvas) {
      setTimeout(() => this.renderChart(config), 50);
      return;
    }
    
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
    
    this.chartInstance = new Chart(this.chartCanvas.nativeElement, config);
  }
}
