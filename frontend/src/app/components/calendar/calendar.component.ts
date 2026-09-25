import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService, Ticket } from '../../services/ticket.service';

export interface CalendarSelection {
  ticketId: number;
  leagueName: string;
  leagueIcon: string;
  eventStr: string;
  result: string; // GANADA, PERDIDA, PENDIENTE, NULA
  odds: number | null;
  dateStr: string;
}

export interface CalendarDay {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarSelection[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnInit {
  ticketService = inject(TicketService);
  
  currentDate: Date = new Date(); // Represents the month we are viewing
  days: CalendarDay[] = [];
  
  // Sidebar Summary
  monthTickets: Ticket[] = [];
  summary = {
    total: 0,
    won: 0,
    lost: 0,
    pending: 0
  };
  upcomingEvents: CalendarSelection[] = [];

  ngOnInit() {
    this.currentDate.setDate(1); // Set to 1st of month
    this.ticketService.getTickets().subscribe(tickets => {
      this.processData(tickets);
    });
  }
  
  get displayMonthYear(): string {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }

  changeMonth(offset: number) {
    this.currentDate.setMonth(this.currentDate.getMonth() + offset);
    this.ticketService.getTickets().subscribe(tickets => this.processData(tickets));
  }
  
  goToToday() {
    this.currentDate = new Date();
    this.currentDate.setDate(1);
    this.ticketService.getTickets().subscribe(tickets => this.processData(tickets));
  }

  processData(allTickets: Ticket[]) {
    // 1. Filter tickets for current month (for the summary)
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    this.monthTickets = allTickets.filter(t => {
      const tDate = this.normalizeDate(t.date);
      if (!tDate) return false;
      const d = new Date(tDate + 'T12:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    });
    
    this.summary = {
      total: this.monthTickets.length,
      won: this.monthTickets.filter(t => t.result === 'GANADA').length,
      lost: this.monthTickets.filter(t => t.result === 'PERDIDA').length,
      pending: this.monthTickets.filter(t => t.result === 'PENDIENTE').length
    };
    
    // 2. Extract all selections into chips for the calendar
    const allSelections = this.extractEvents(allTickets);
    
    // 3. Upcoming events (next 5 pending)
    const todayStr = new Date().toISOString().substring(0, 10);
    this.upcomingEvents = allSelections
      .filter(s => s.result === 'PENDIENTE' && s.dateStr >= todayStr)
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
      .slice(0, 5);
      
    // 4. Generate Grid
    this.generateGrid(allSelections);
  }
  
  normalizeDate(rawDate: any): string {
    if (!rawDate) return '';
    if (Array.isArray(rawDate)) {
      // Backend LocalDate serializes to [YYYY, MM, DD]
      const [y, m, d] = rawDate;
      return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    }
    if (typeof rawDate === 'string') {
      return rawDate.substring(0, 10);
    }
    return '';
  }
  
  extractEvents(tickets: Ticket[]): CalendarSelection[] {
    const evts: CalendarSelection[] = [];
    tickets.forEach(t => {
      const ticketDateStr = this.normalizeDate(t.date);
      
      // Process simple/combo selections
      if (t.selections && t.selections.length > 0) {
        t.selections.forEach(sel => {
           evts.push({
             ticketId: t.id!,
             leagueName: sel.tip?.league || 'N/A',
             leagueIcon: this.getIconForSport(sel.tip?.sport),
             eventStr: this.formatEventStr(sel.tip?.event || ''),
             result: sel.result || t.result || 'PENDIENTE',
             odds: sel.tip?.odds || null,
             dateStr: this.normalizeDate(sel.tip?.date) || ticketDateStr
           });
        });
      } 
      
      // Process BetBuilders
      if (t.betBuilders && t.betBuilders.length > 0) {
        t.betBuilders.forEach(bb => {
           if (bb.selections && bb.selections.length > 0) {
             const firstSel = bb.selections[0];
             evts.push({
               ticketId: t.id!,
               leagueName: firstSel.tip?.league || 'N/A',
               leagueIcon: this.getIconForSport(firstSel.tip?.sport),
               eventStr: this.formatEventStr(firstSel.tip?.event || ''),
               result: t.result || 'PENDIENTE',
               odds: bb.realOdds || bb.expectedOdds || t.totalOdds,
               dateStr: this.normalizeDate(firstSel.tip?.date) || ticketDateStr
             });
           }
        });
      }
    });
    return evts;
  }
  
  generateGrid(allSelections: CalendarSelection[]) {
    this.days = [];
    
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Get day of week (0 = Sun, 1 = Mon). Adjust to make Monday = 0
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday
    
    // 42 days grid (6 weeks)
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDayOfWeek);
    
    const todayStr = new Date().toISOString().substring(0, 10);
    
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().substring(0, 10);
      
      this.days.push({
        date: d,
        dateStr: dStr,
        isCurrentMonth: d.getMonth() === month,
        isToday: dStr === todayStr,
        events: allSelections.filter(s => s.dateStr === dStr)
      });
    }
  }
  
  getIconForSport(sport: string | undefined): string {
    if (!sport) return '⚽';
    const s = sport.toLowerCase();
    if (s.includes('tenis') || s.includes('tennis')) return '🎾';
    if (s.includes('basket')) return '🏀';
    if (s.includes('base') || s.includes('beis')) return '⚾';
    if (s.includes('foot') || s.includes('fubol') || s.includes('fútbol')) return '⚽';
    if (s.includes('ping') || s.includes('table')) return '🏓';
    if (s.includes('e-sport') || s.includes('esport')) return '🎮';
    return '⚽';
  }
  
  formatEventStr(raw: string): string {
    let clean = raw.replace(/\s*\(bb\d*\)\s*/gi, '').trim();
    if (clean.length > 25) {
      return clean.substring(0, 25) + '...';
    }
    return clean;
  }
  
  getResultColor(result: string): string {
    switch (result.toUpperCase()) {
      case 'GANADA': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PERDIDA': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'NULA': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  }
  
  getResultText(result: string): string {
    switch (result.toUpperCase()) {
      case 'GANADA': return 'Ganada';
      case 'PERDIDA': return 'Perdida';
      case 'NULA': return 'Nula';
      default: return 'Pendiente';
    }
  }
}
