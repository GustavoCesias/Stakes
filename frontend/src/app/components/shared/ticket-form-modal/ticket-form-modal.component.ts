import { Component, OnInit, Output, EventEmitter, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService, Ticket, BetBuilder } from '../../../services/ticket.service';
import { TipService, Tip } from '../../../services/tip.service';
import { ConfigService, Sport, League, MarketConfig } from '../../../services/config.service';
import { CalendarService, SportEvent } from '../../../services/calendar.service';

export interface PickForm {
  selectionId?: number;
  tipId?: number;
  date?: string;
  market: string;
  pick: string;
  odds: number | null;
  result?: string;
}

export interface EventForm {
  name: string;
  sport: string;
  league: string;
  picks: PickForm[];
  bbFinalOdds?: number;
  isBetBuilder?: boolean;
}

export interface SearchResultItem {
  type: 'TIP' | 'BET_BUILDER';
  id?: number;
  event: string;
  sport?: string;
  league?: string;
  date?: string;
  tip?: Tip;
  betBuilder?: BetBuilder;
  picksText?: string;
  finalOdds?: number;
}

@Component({
  selector: 'app-ticket-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ticket-form-modal.component.html'
})
export class TicketFormModalComponent implements OnInit {
  @Input() editTicket: Ticket | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Ticket>();

  isEditing = false;
  newTicket: Partial<Ticket> = this.getDefaultTicket();
  events: EventForm[] = [];
  
  searchTipText: string = '';
  searchResults: SearchResultItem[] = [];
  availableTips: Tip[] = [];
  allTickets: Ticket[] = [];

  sports: Sport[] = [];
  leagues: League[] = [];
  filteredLeagues: League[] = [];
  markets: MarketConfig[] = [];
  calendarEvents: SportEvent[] = [];

  private ticketService = inject(TicketService);
  private tipService = inject(TipService);
  private configService = inject(ConfigService);
  private calendarService = inject(CalendarService);

  ngOnInit() {
    this.loadConfigData();
    this.loadTips();
    this.loadTickets();
    
    if (this.editTicket) {
      this.isEditing = true;
      // For simple Add Match flow, we just start blank
    } else {
      this.openNewForm();
    }
  }

  getDefaultTicket(): Partial<Ticket> {
    return {
      date: new Date().toISOString().substring(0, 10),
      bookmaker: '',
      stake: 10.0,
      type: 'Simple',
      totalOdds: 1.00,
      result: 'PENDIENTE',
      selections: [],
      betBuilders: []
    };
  }

  loadConfigData() {
    this.configService.getSports().subscribe(data => this.sports = data);
    this.configService.getLeagues().subscribe(data => {
      this.leagues = data;
      this.filteredLeagues = data;
    });
    this.configService.getMarkets().subscribe(data => this.markets = data);
    
    const dStart = new Date(); dStart.setDate(dStart.getDate() - 7);
    const dEnd = new Date(); dEnd.setDate(dEnd.getDate() + 14);
    this.calendarService.getEvents(dStart.toISOString(), dEnd.toISOString()).subscribe(data => this.calendarEvents = data);
  }

  loadTips() {
    this.tipService.getTips().subscribe(data => this.availableTips = data);
  }
  
  loadTickets() {
    this.ticketService.getTickets().subscribe(data => this.allTickets = data);
  }

  openNewForm() {
    this.isEditing = false;
    this.newTicket = this.getDefaultTicket();
    this.events = [];
    this.addEvent();
  }

  closeModal() {
    this.close.emit();
  }

  addEvent() {
    this.events.push({
      name: '', sport: '', league: '',
      picks: [{ market: '', pick: '', odds: null, result: 'PENDIENTE' }]
    });
    this.calculateTicketType();
    this.calculateTotalOdds();
    this.updateAutomaticTicketResult();
  }

  removeEvent(index: number) {
    this.events.splice(index, 1);
    this.calculateTicketType();
    this.calculateTotalOdds();
    this.updateAutomaticTicketResult();
    this.updateAutomaticTicketDate();
  }

  addPickToEvent(event: EventForm) {
    event.picks.push({ market: '', pick: '', odds: null, result: 'PENDIENTE' });
    this.calculateTicketType();
    this.calculateTotalOdds();
    this.updateAutomaticTicketResult();
  }

  removePickFromEvent(event: EventForm, index: number) {
    event.picks.splice(index, 1);
    if (event.picks.length === 0) {
      this.events = this.events.filter(e => e !== event);
    }
    this.calculateTicketType();
    this.calculateTotalOdds();
    this.updateAutomaticTicketResult();
    this.updateAutomaticTicketDate();
  }

  onOddsChange() {
    this.calculateTotalOdds();
  }

  onSportChange(event: EventForm) {
    if (event.sport) {
      const sportLower = event.sport.toLowerCase();
      this.filteredLeagues = this.leagues.filter(l => l.sport?.name?.toLowerCase() === sportLower);
    } else {
      this.filteredLeagues = this.leagues;
    }
  }

  onEventChange(event: EventForm) {
    const eventStr = event.name;
    if (eventStr) {
      const ev = this.calendarEvents.find(e => `${e.homeTeam} vs ${e.awayTeam}` === eventStr);
      if (ev) {
        if (!event.league) event.league = ev.league?.name || '';
        if (!event.sport) event.sport = ev.league?.sport?.name || '';
        if (event.picks.length > 0 && !event.picks[0].date) event.picks[0].date = ev.eventDate?.substring(0, 10);
        this.onSportChange(event);
      }
    }
  }

  getMarketOptions(marketName: string | undefined): string[] {
    if (!marketName) return [];
    const market = this.markets.find(m => m.name.toLowerCase() === marketName.toLowerCase());
    return market && market.options ? market.options : [];
  }

  getMarketsForSport(sportName: string | undefined): MarketConfig[] {
    if (!sportName) return this.markets;
    const sportLower = sportName.toLowerCase();
    return this.markets.filter(m => !m.sport || m.sport.name.toLowerCase() === sportLower);
  }

  getMarketType(marketName: string | undefined): 'OPTIONS' | 'NUMERIC' | 'TEXT' | null {
    if (!marketName) return null;
    const market = this.markets.find(m => m.name.toLowerCase() === marketName.toLowerCase());
    return market ? market.inputType : 'TEXT';
  }

  calculateTicketType() {
    let totalPicks = 0;
    this.events.forEach(e => {
      e.isBetBuilder = e.picks.length > 1;
      totalPicks += e.isBetBuilder ? 1 : e.picks.length;
    });
    
    if (totalPicks === 0) this.newTicket.type = 'Simple';
    else if (totalPicks === 1) this.newTicket.type = 'Simple';
    else this.newTicket.type = 'Combinada';
  }

  calculateTotalOdds() {
    let total = 1.0;
    let hasOdds = false;

    this.events.forEach(e => {
      if (e.isBetBuilder) {
        if (e.bbFinalOdds) {
          total *= e.bbFinalOdds;
          hasOdds = true;
        }
      } else {
        e.picks.forEach(p => {
          if (p.odds) {
            total *= p.odds;
            hasOdds = true;
          }
        });
      }
    });

    this.newTicket.totalOdds = hasOdds ? Number(total.toFixed(2)) : 1.00;
  }

  updateAutomaticTicketResult() {
    let allWon = true;
    let hasLost = false;
    let hasPending = false;
    let validPicksCount = 0;

    this.events.forEach(e => {
      e.picks.forEach(p => {
        if (p.result !== 'NULA') {
          validPicksCount++;
          if (p.result === 'PERDIDA') hasLost = true;
          if (p.result === 'PENDIENTE') hasPending = true;
          if (p.result !== 'GANADA') allWon = false;
        }
      });
    });

    if (validPicksCount === 0) {
      this.newTicket.result = 'NULA';
    } else if (hasLost) {
      this.newTicket.result = 'PERDIDA';
    } else if (hasPending) {
      this.newTicket.result = 'PENDIENTE';
    } else if (allWon) {
      this.newTicket.result = 'GANADA';
    }
  }

  updateAutomaticTicketDate() {
    if (this.events.length > 0) {
      for (const event of this.events) {
        for (const pick of event.picks) {
          if (pick.date) {
            this.newTicket.date = pick.date;
            return;
          }
        }
      }
    }
  }

  searchTips() {
    if (this.searchTipText.trim().length < 2) {
      this.searchResults = [];
      return;
    }
    
    const search = this.searchTipText.toLowerCase();
    const results: SearchResultItem[] = [];
    
    this.availableTips.forEach(t => {
      const txt = `${t.event || ''} ${t.market || ''} ${t.pick || ''} ${t.league || ''} ${t.sport || ''}`.toLowerCase();
      if (txt.includes(search)) {
        results.push({ type: 'TIP', id: t.id, event: t.event || '', tip: t, date: t.date, finalOdds: t.odds || undefined });
      }
    });
    this.searchResults = results.slice(0, 10);
  }

  addSearchResult(item: SearchResultItem) {
    if (item.tip) {
      if (this.events.length === 1 && !this.events[0].name && this.events[0].picks.length === 1 && !this.events[0].picks[0].market) {
        this.events = [];
      }
      this.events.push({
        name: item.tip.event || '',
        sport: item.tip.sport || '',
        league: item.tip.league || '',
        picks: [{
           tipId: item.tip.id,
           market: item.tip.market || '',
           pick: item.tip.pick || '',
           odds: item.tip.odds ?? null,
           result: item.tip.result || 'PENDIENTE',
           date: item.tip.date
        }]
      });
      this.searchTipText = '';
      this.searchResults = [];
      this.calculateTicketType();
      this.calculateTotalOdds();
      this.updateAutomaticTicketResult();
      this.updateAutomaticTicketDate();
    }
  }

  saveTicket() {
    if (!this.newTicket.date) return alert('La fecha es obligatoria.');
    if (!this.newTicket.bookmaker) return alert('La casa de apuestas es obligatoria.');
    if (!this.newTicket.stake || this.newTicket.stake <= 0) return alert('El stake debe ser mayor a 0.');

    const ticketToSave: Partial<Ticket> = {
      date: this.newTicket.date,
      bookmaker: this.newTicket.bookmaker,
      stake: this.newTicket.stake,
      type: this.newTicket.type || 'Simple',
      totalOdds: this.newTicket.totalOdds,
      result: this.newTicket.result || 'PENDIENTE',
      selections: [],
      betBuilders: []
    };

    this.events.forEach(e => {
      if (e.isBetBuilder) {
        ticketToSave.betBuilders!.push({
          realOdds: e.bbFinalOdds,
          selections: e.picks.map(p => ({
            tip: { id: p.tipId, market: p.market, pick: p.pick, odds: p.odds, date: p.date, event: e.name, sport: e.sport, league: e.league } as any,
            result: p.result || 'PENDIENTE'
          }))
        });
      } else {
        e.picks.forEach(p => {
          ticketToSave.selections!.push({
            tip: { id: p.tipId, market: p.market, pick: p.pick, odds: p.odds, date: p.date, event: e.name, sport: e.sport, league: e.league } as any,
            result: p.result || 'PENDIENTE'
          });
        });
      }
    });

    this.ticketService.createTicket(ticketToSave as Ticket).subscribe({
      next: (res) => {
        this.saved.emit(res);
        this.closeModal();
      },
      error: (err) => alert('Error al guardar: ' + err.message)
    });
  }
}
