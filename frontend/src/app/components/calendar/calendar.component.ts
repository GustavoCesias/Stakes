import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService, Ticket } from '../../services/ticket.service';
import { CalendarService, SportEvent } from '../../services/calendar.service';
import { TicketDetailModalComponent } from '../shared/ticket-detail-modal/ticket-detail-modal.component';
import { TicketFormModalComponent } from '../shared/ticket-form-modal/ticket-form-modal.component';
import { EventFormModalComponent } from '../shared/event-form-modal/event-form-modal.component';

export interface CalendarSelection {
  ticketId: number;
  leagueName: string;
  leagueIcon: string;
  eventStr: string;
  result: string;
  odds: number | null;
  dateStr: string;
  isBetBuilder: boolean;
  stake?: number;
  profit?: number;
}

export interface CalendarEventAggregate {
  eventStr: string;
  leagueName: string;
  leagueIcon: string;
  dateStr: string;
  ticketsCount: number;
  selections: CalendarSelection[];
  tickets: Ticket[]; // Array of unique tickets associated with this event
  result: string; // Aggregate result for the dot color
}

export interface CalendarDay {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  aggregatedEvents: CalendarEventAggregate[];
  selections: CalendarSelection[]; // Raw selections for this day
  tickets: Ticket[]; // The actual tickets affecting this day
  profit: number;
  hasResolvedTickets: boolean;
  isSelected?: boolean;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, TicketDetailModalComponent, TicketFormModalComponent, EventFormModalComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnInit {
  ticketService = inject(TicketService);
  calendarService = inject(CalendarService);
  router = inject(Router);
  
  currentDate: Date = new Date();
  days: CalendarDay[] = [];
  calendarEvents: SportEvent[] = [];
  
  viewMode: 'events' | 'tickets' | 'profits' = 'events'; 
  sidebarState: 'summary' | 'dayDetail' = 'summary';
  selectedDay: CalendarDay | null = null;
  selectedTicketForView: Ticket | null = null;
  showTicketForm = false;
  showEventForm = false;

  // Sidebar Summary
  monthTickets: Ticket[] = [];
  rawTickets: Ticket[] = []; // Store raw tickets to re-apply filters without fetching
  summary = {
    total: 0,
    won: 0,
    lost: 0,
    pending: 0,
    totalProfit: 0
  };
  upcomingEvents: CalendarSelection[] = [];

  // Filters
  showFiltersModal = false;
  filters = {
    ganadas: true,
    perdidas: true,
    pendientes: true,
    nulas: true,
    simples: true,
    betbuilders: true
  };

  ngOnInit() {
    this.currentDate.setDate(1); 
    this.loadTickets();
  }

  loadTickets() {
    this.ticketService.getTickets().subscribe(tickets => {
      this.rawTickets = tickets.filter(t => !t.originalTipster);
      this.loadEventsAndProcess();
    });
  }

  loadEventsAndProcess() {
    const dStart = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const dEnd = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    this.calendarService.getEvents(dStart.toISOString(), dEnd.toISOString()).subscribe(events => {
      this.calendarEvents = events;
      this.processData(this.rawTickets);
    });
  }
  
  get displayMonthYear(): string {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }

  changeMonth(offset: number) {
    this.currentDate.setMonth(this.currentDate.getMonth() + offset);
    this.loadEventsAndProcess();
  }
  
  goToToday() {
    this.currentDate = new Date();
    this.currentDate.setDate(1);
    this.loadEventsAndProcess();
  }
  
  setViewMode(mode: 'events' | 'tickets' | 'profits') {
    this.viewMode = mode;
  }

  viewTicket(ticket: Ticket) {
    this.selectedTicketForView = ticket;
  }

  closeTicketView() {
    this.selectedTicketForView = null;
  }

  processData(allTickets: Ticket[]) {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    let monthProfit = 0;
    this.monthTickets = allTickets.filter(t => {
      const tDate = this.normalizeDate(t.date);
      if (!tDate) return false;
      const d = new Date(tDate + 'T12:00:00');
      const inMonth = d.getFullYear() === year && d.getMonth() === month;
      if (inMonth && (t.result === 'GANADA' || t.result === 'PERDIDA')) {
         monthProfit += (t.profit || 0);
      }
      return inMonth;
    });
    
    this.summary = {
      total: this.monthTickets.length,
      won: this.monthTickets.filter(t => t.result === 'GANADA').length,
      lost: this.monthTickets.filter(t => t.result === 'PERDIDA').length,
      pending: this.monthTickets.filter(t => t.result === 'PENDIENTE').length,
      totalProfit: monthProfit
    };
    
    // 2. Extract all selections and filter them based on user filters
    let allSelections = this.extractEvents(allTickets);
    allSelections = allSelections.filter(sel => {
      // Filter by type
      if (sel.isBetBuilder && !this.filters.betbuilders) return false;
      if (!sel.isBetBuilder && !this.filters.simples) return false;
      
      // Filter by result
      const res = sel.result.toUpperCase();
      if (res === 'GANADA' && !this.filters.ganadas) return false;
      if (res === 'PERDIDA' && !this.filters.perdidas) return false;
      if (res === 'PENDIENTE' && !this.filters.pendientes) return false;
      if (res === 'NULA' && !this.filters.nulas) return false;

      return true;
    });
    
    const ticketMap = new Map<number, Ticket>();
    allTickets.forEach(t => {
      if (t.id) ticketMap.set(t.id, t);
    });
    
    const eventMap = new Map<string, CalendarEventAggregate>();
    
    // Add real database calendar events first
    this.calendarEvents.forEach(evt => {
       const key = `${evt.eventDate.substring(0,10)}_${evt.homeTeam} vs ${evt.awayTeam}`;
       if (!eventMap.has(key)) {
         eventMap.set(key, {
           eventStr: `${evt.homeTeam} vs ${evt.awayTeam}`,
           leagueName: evt.league?.name || 'N/A',
           leagueIcon: this.getIconForSport(evt.league?.sport?.name),
           dateStr: evt.eventDate.substring(0,10),
           ticketsCount: 0,
           selections: [],
           tickets: [],
           result: 'PENDIENTE'
         });
       }
    });

    allSelections.forEach(sel => {
       const key = `${sel.dateStr}_${sel.eventStr}`;
       if (!eventMap.has(key)) {
         eventMap.set(key, {
           eventStr: sel.eventStr,
           leagueName: sel.leagueName,
           leagueIcon: sel.leagueIcon,
           dateStr: sel.dateStr,
           ticketsCount: 0,
           selections: [],
           tickets: [],
           result: sel.result
         });
       }
       const agg = eventMap.get(key)!;
       
       const ticket = ticketMap.get(sel.ticketId);
       if (ticket && !agg.tickets.some(t => t.id === ticket.id)) {
           agg.tickets.push(ticket);
       }
       
       agg.ticketsCount = agg.tickets.length;
       agg.selections.push(sel);
       // Simple consensus logic: if at least one is pending, show pending color
       if (sel.result === 'PENDIENTE') {
           agg.result = 'PENDIENTE';
       }
    });
    const aggregatedEvents = Array.from(eventMap.values());
    
    const todayStr = new Date().toISOString().substring(0, 10);
    this.upcomingEvents = allSelections
      .filter(s => s.result === 'PENDIENTE' && s.dateStr >= todayStr)
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
      .slice(0, 5);
      
    this.generateGrid(aggregatedEvents, allSelections, allTickets);
  }
  
  normalizeDate(rawDate: any): string {
    if (!rawDate) return '';
    if (Array.isArray(rawDate)) {
      const [y, m, d] = rawDate;
      return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    }
    if (typeof rawDate === 'string') {
      return rawDate.substring(0, 10);
    }
    return '';
  }
  
  getTicketSummaryEvents(t: Ticket): string[] {
    const bbEvents = new Set<string>();
    
    // First, collect all BetBuilder events
    if (t.betBuilders) {
      t.betBuilders.forEach(bb => {
        if (bb.selections && bb.selections.length > 0) {
           const eventName = this.formatEventStr(bb.selections[0].tip?.event || '');
           if (eventName) {
             bbEvents.add(eventName);
           }
        }
      });
    }

    const finalEvents = new Set<string>();
    
    // Then collect regular selections, only if they are not part of a BetBuilder
    if (t.selections) {
      t.selections.forEach(sel => {
        if (sel.tip?.event) {
          const eventName = this.formatEventStr(sel.tip.event);
          if (!bbEvents.has(eventName)) {
            finalEvents.add(eventName);
          }
        }
      });
    }
    
    // Add the BetBuilders formatted properly
    bbEvents.forEach(evt => finalEvents.add(`${evt} (Bet Builder)`));
    
    return Array.from(finalEvents);
  }

  extractEvents(tickets: Ticket[]): CalendarSelection[] {
    const evts: CalendarSelection[] = [];
    tickets.forEach(t => {
      const ticketDateStr = this.normalizeDate(t.date);
      
      if (t.selections && t.selections.length > 0) {
        t.selections.forEach(sel => {
           evts.push({
             ticketId: t.id!,
             leagueName: sel.tip?.league || 'N/A',
             leagueIcon: this.getIconForSport(sel.tip?.sport),
             eventStr: this.formatEventStr(sel.tip?.event || ''),
             result: sel.result || t.result || 'PENDIENTE',
             odds: sel.tip?.odds || t.totalOdds,
             dateStr: this.normalizeDate(sel.tip?.date) || ticketDateStr,
             isBetBuilder: false,
             stake: t.stake,
             profit: t.profit
           });
        });
      } 
      
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
               dateStr: this.normalizeDate(firstSel.tip?.date) || ticketDateStr,
               isBetBuilder: true,
               stake: t.stake,
               profit: t.profit
             });
           }
        });
      }
    });
    return evts;
  }
  
  generateGrid(aggregatedEvents: CalendarEventAggregate[], allSelections: CalendarSelection[], allTickets: Ticket[]) {
    this.days = [];
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; 
    
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDayOfWeek);
    const todayStr = new Date().toISOString().substring(0, 10);
    
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().substring(0, 10);
      
      const dayTickets = allTickets.filter(t => {
         const tDate = this.normalizeDate(t.date);
         if (tDate === dStr) return true;
         if (t.selections && t.selections.some(s => this.normalizeDate(s.tip?.date) === dStr)) return true;
         if (t.betBuilders && t.betBuilders.some(bb => bb.selections && bb.selections.some(s => this.normalizeDate(s.tip?.date) === dStr))) return true;
         return false;
      });

      let dayProfit = 0;
      let hasResolved = false;
      // We only calculate profit if the ticket was PLACED on this day to avoid double counting profit across days
      const placedTickets = dayTickets.filter(t => this.normalizeDate(t.date) === dStr);
      placedTickets.forEach(t => {
         if (t.result === 'GANADA' || t.result === 'PERDIDA') {
           dayProfit += (t.profit || 0);
           hasResolved = true;
         }
      });
      
      this.days.push({
        date: d,
        dateStr: dStr,
        isCurrentMonth: d.getMonth() === month,
        isToday: dStr === todayStr,
        aggregatedEvents: aggregatedEvents.filter(a => a.dateStr === dStr),
        selections: allSelections.filter(s => s.dateStr === dStr),
        tickets: dayTickets,
        profit: dayProfit,
        hasResolvedTickets: hasResolved,
        isSelected: false
      });
    }

    if (this.sidebarState === 'dayDetail' && this.selectedDay) {
       const updatedDay = this.days.find(d => d.dateStr === this.selectedDay!.dateStr);
       if (updatedDay) {
           this.selectDay(updatedDay);
       } else {
           this.closeDayDetail();
       }
    }
  }

  selectDay(day: CalendarDay) {
    this.days.forEach(d => d.isSelected = false);
    day.isSelected = true;
    this.selectedDay = day;
    this.sidebarState = 'dayDetail';
  }

  closeDayDetail() {
    this.sidebarState = 'summary';
    this.selectedDay = null;
    this.days.forEach(d => d.isSelected = false);
  }

  toggleFilter(key: keyof typeof this.filters) {
    this.filters[key] = !this.filters[key];
    this.processData(this.rawTickets);
  }

  addMatch() {
    if (this.viewMode === 'events') {
      this.showEventForm = true;
    } else {
      this.showTicketForm = true;
    }
  }

  onTicketSaved(ticket: Ticket) {
    this.showTicketForm = false;
    this.loadTickets(); 
  }
  
  onEventSaved(event: SportEvent) {
    this.showEventForm = false;
    this.loadEventsAndProcess();
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
  
  getDotColor(result: string): string {
    switch (result.toUpperCase()) {
      case 'GANADA': return 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]';
      case 'PERDIDA': return 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]';
      case 'NULA': return 'bg-gray-500';
      default: return 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]';
    }
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

  formatDateLong(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`;
  }
}
