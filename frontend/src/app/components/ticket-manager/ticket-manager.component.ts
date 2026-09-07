import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TicketService, Ticket, TicketSelection, BetBuilder } from '../../services/ticket.service';
import { TipService, Tip } from '../../services/tip.service';
import { ChannelService, ChannelSubgroup, Channel } from '../../services/channel.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TicketDetailModalComponent } from '../shared/ticket-detail-modal/ticket-detail-modal.component';

export interface PickForm {
  selectionId?: number;
  tipId?: number;
  date?: string;
  channel?: Channel | null;
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
  selector: 'app-ticket-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, TicketDetailModalComponent],
  templateUrl: './ticket-manager.component.html',
  styleUrl: './ticket-manager.component.css'
})
export class TicketManagerComponent implements OnInit {
  showForm = false;
  isEditing = false;
  
  // Subgroups Management
  showSubgroupModal = false;
  channelSubgroups: ChannelSubgroup[] = [];
  newSubgroupName = '';
  selectedFilterSubgroup: number | null = null;

  selectedTicketForView: Ticket | null = null;
  
  isCloseModalOpen = false;
  ticketToClose: Ticket | null = null;
  closeResult: string = '';
  closeCashoutAmount: number | null = null;
  closeSelectionResults: { [key: number]: string } = {};
  closeSelectionsList: any[] = [];

  sortOrder: 'desc' | 'asc' = 'desc';

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.applyFilter();
  }

  setSortOrder(order: 'desc' | 'asc') {
    this.sortOrder = order;
    this.applyFilter();
  }

  allTickets: Ticket[] = [];
  tickets: Ticket[] = [];
  availableTips: Tip[] = [];

  newTicket: Partial<Ticket> = this.getDefaultTicket();
  events: EventForm[] = [];
  
  searchTipText: string = '';

  private ticketService = inject(TicketService);
  private tipService = inject(TipService);
  private channelService = inject(ChannelService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  sanitizeTicket(ticket: Ticket): Ticket {
    if (ticket.selections && ticket.betBuilders && ticket.betBuilders.length > 0) {
      const bbSelectionIds = new Set<number>();
      const bbTipIds = new Set<number>();
      ticket.betBuilders.forEach(bb => {
        if (bb.selections) {
          bb.selections.forEach(bbs => {
            if (bbs.id) bbSelectionIds.add(bbs.id);
            if (bbs.tip?.id) bbTipIds.add(bbs.tip.id);
          });
        }
      });
      ticket.selections = ticket.selections.filter(sel => {
        if (sel.id && bbSelectionIds.has(sel.id)) return false;
        if (sel.tip?.id && bbTipIds.has(sel.tip.id)) return false;
        return true;
      });
    }
    return ticket;
  }

  ngOnInit() {
    this.loadTickets();
    this.loadTips();

    this.route.paramMap.subscribe(params => {
      if (params.has('id')) {
        this.currentView = 'channel';
        this.currentChannelId = Number(params.get('id'));
        this.loadSubgroups();
      } else {
        this.currentView = 'mine';
        this.currentChannelId = null;
        this.channelSubgroups = [];
      }
      this.applyFilter();
    });
  }

  loadSubgroups() {
    if (this.currentChannelId) {
      this.channelService.getSubgroups(this.currentChannelId).subscribe({
        next: (data) => this.channelSubgroups = data,
        error: (err) => console.error('Error loading subgroups', err)
      });
    }
  }

  saveSubgroup() {
    if (!this.currentChannelId || this.newSubgroupName.trim() === '') return;
    this.channelService.createSubgroup(this.currentChannelId, { name: this.newSubgroupName }).subscribe({
      next: (saved) => {
        this.channelSubgroups.push(saved);
        this.newSubgroupName = '';
      },
      error: (err) => alert('Error creando subgrupo: ' + err.message)
    });
  }

  deleteSubgroup(sg: ChannelSubgroup) {
    if (!sg.id) return;
    if (confirm(`¿Estás seguro de que deseas eliminar el subgrupo "${sg.name}"?`)) {
      this.channelService.deleteSubgroup(sg.id).subscribe({
        next: () => {
          this.channelSubgroups = this.channelSubgroups.filter(s => s.id !== sg.id);
          if (this.selectedFilterSubgroup === sg.id) {
            this.selectedFilterSubgroup = null;
            this.filterTickets();
          }
        },
        error: (err) => alert('Error eliminando subgrupo: ' + (err.error?.message || err.message))
      });
    }
  }

  currentView: 'mine' | 'channel' = 'mine';
  currentChannelId: number | null = null;
  channelDisplayMode: 'table' | 'dashboard' = 'table';

  setChannelDisplayMode(mode: 'table' | 'dashboard') {
    this.channelDisplayMode = mode;
  }

  // Channel Dashboard Metrics
  get channelTotalProfit(): number {
    return this.tickets.reduce((acc, t) => acc + (Number(t.profit) || 0), 0);
  }

  get channelWinRate(): number {
    const closed = this.tickets.filter(t => t.result === 'GANADA' || t.result === 'PERDIDA');
    if (closed.length === 0) return 0;
    return Math.round((closed.filter(t => t.result === 'GANADA').length / closed.length) * 100);
  }

  get channelWinRateDetail(): string {
    const closed = this.tickets.filter(t => t.result === 'GANADA' || t.result === 'PERDIDA');
    const won = closed.filter(t => t.result === 'GANADA').length;
    return `${won} de ${closed.length} apuestas cerradas`;
  }

  get channelYield(): number {
    const totalStake = this.tickets.reduce((acc, t) => acc + (Number(t.stake) || 0), 0);
    if (totalStake === 0) return 0;
    return Math.round((this.channelTotalProfit / totalStake) * 100);
  }

  get channelPendingCount(): number {
    return this.tickets.filter(t => t.result === 'PENDIENTE').length;
  }

  get channelPendingStake(): number {
    return this.tickets.filter(t => t.result === 'PENDIENTE').reduce((acc, t) => acc + (Number(t.stake) || 0), 0);
  }

  countChannelResult(result: string): number {
    return this.tickets.filter(t => t.result === result).length;
  }

  getDefaultTicket(): Partial<Ticket> {
    return { date: new Date().toISOString().substring(0,10), type: 'Simple', originalTipster: false, result: 'PENDIENTE', selections: [], betBuilders: [], subgroup: null };
  }

  get searchResults(): SearchResultItem[] {
    if (!this.searchTipText || this.searchTipText.trim().length < 2) return [];
    const search = this.searchTipText.toLowerCase().trim();
    const results: SearchResultItem[] = [];

    // 1. Search Bet Builders from allTickets
    const seenBbKeys = new Set<string>();
    this.allTickets.forEach(t => {
      if (t.betBuilders) {
        t.betBuilders.forEach(bb => {
          if (!bb.selections || bb.selections.length === 0) return;
          const firstTip = bb.selections[0]?.tip;
          if (!firstTip) return;

          const eventName = firstTip.event || '';
          const picksSummary = bb.selections
            .filter(s => s.tip)
            .map(s => `${s.tip?.market}: ${s.tip?.pick}`)
            .join(' • ');

          const fullSearchableText = `${eventName} ${picksSummary} ${firstTip.league || ''} ${firstTip.sport || ''}`.toLowerCase();

          if (fullSearchableText.includes(search)) {
            const bbOdds = bb.realOdds || bb.expectedOdds || 1.0;
            const bbKey = `${eventName}_${picksSummary}_${bbOdds}`;
            if (!seenBbKeys.has(bbKey)) {
              seenBbKeys.add(bbKey);
              results.push({
                type: 'BET_BUILDER',
                id: bb.id,
                event: eventName,
                sport: firstTip.sport,
                league: firstTip.league,
                date: firstTip.date,
                betBuilder: bb,
                picksText: picksSummary,
                finalOdds: bbOdds
              });
            }
          }
        });
      }
    });

    // 2. Search individual Tips from availableTips, grouping Bet Builders first
    const standaloneTips: Tip[] = [];
    const bbTipGroups = new Map<string, Tip[]>();
    
    this.availableTips.forEach(t => {
      const isBB = t.odds === null || t.odds === undefined || (t.event && t.event.toUpperCase().endsWith('(BB)'));
      if (isBB) {
        const key = `${t.date}_${(t.event || '').trim().toLowerCase()}_${t.channel?.id || 'personal'}`;
        if (!bbTipGroups.has(key)) {
          bbTipGroups.set(key, []);
        }
        bbTipGroups.get(key)!.push(t);
      } else {
        standaloneTips.push(t);
      }
    });

    bbTipGroups.forEach(groupTips => {
      if (groupTips.length === 0) return;
      if (groupTips.length === 1) {
        standaloneTips.push(groupTips[0]);
        return;
      }
      
      const firstTip = groupTips[0];
      const eventName = firstTip.event || '';
      
      const picksSummary = groupTips
        .map(t => `${t.market}: ${t.pick}`)
        .join(' • ');

      const fullSearchableText = `${eventName} ${picksSummary} ${firstTip.league || ''} ${firstTip.sport || ''}`.toLowerCase();
      
      if (fullSearchableText.includes(search)) {
        let combinedOdds: number | null = null;
        const tipWithOdds = groupTips.find(gt => gt.odds !== null && gt.odds !== undefined && gt.odds > 0);
        if (tipWithOdds) combinedOdds = tipWithOdds.odds;
        
        const dummyBb: BetBuilder = {
          selections: groupTips.map(t => ({ tip: t, result: t.result || 'PENDIENTE' }))
        };

        const bbKey = `${eventName}_${picksSummary}_${combinedOdds || 1.0}`;
        if (!seenBbKeys.has(bbKey)) {
          seenBbKeys.add(bbKey);
          results.push({
            type: 'BET_BUILDER',
            id: undefined,
            event: eventName,
            sport: firstTip.sport,
            league: firstTip.league,
            date: firstTip.date,
            betBuilder: dummyBb,
            picksText: picksSummary,
            finalOdds: combinedOdds ? Number(combinedOdds) : undefined
          });
        }
      }
    });

    standaloneTips.forEach(t => {
      const fullSearchableText = `${t.event || ''} ${t.market || ''} ${t.pick || ''} ${t.league || ''} ${t.sport || ''}`.toLowerCase();
      if (fullSearchableText.includes(search)) {
        results.push({
          type: 'TIP',
          id: t.id,
          event: t.event || '',
          sport: t.sport,
          league: t.league,
          date: t.date,
          tip: t
        });
      }
    });

    return results.slice(0, 10);
  }

  getSelectionResult(sel: any): string {
    if (!sel) return 'PENDIENTE';
    if (sel.result && sel.result !== 'PENDIENTE') {
      return sel.result;
    }
    if (sel.tip?.result && sel.tip.result !== 'PENDIENTE') {
      return sel.tip.result;
    }
    // Search across allTickets for a resolved result on the same tip or pick
    if (sel.tip?.id) {
      const match = this.findSelectionInTickets(s => s.tip?.id === sel.tip.id);
      if (match && match.result && match.result !== 'PENDIENTE') {
        return match.result;
      }
    }
    const eventName = (sel.tip?.event || sel.event || '').toLowerCase().trim();
    const market = (sel.tip?.market || sel.market || '').toLowerCase().trim();
    const pick = (sel.tip?.pick || sel.pick || '').toLowerCase().trim();
    if (eventName && market && pick) {
      const match = this.findSelectionInTickets(s => {
        const e = (s.tip?.event || '').toLowerCase().trim();
        const m = (s.tip?.market || '').toLowerCase().trim();
        const p = (s.tip?.pick || '').toLowerCase().trim();
        return e === eventName && m === market && p === pick;
      });
      if (match && match.result && match.result !== 'PENDIENTE') {
        return match.result;
      }
    }
    return (sel.result && sel.result !== 'PENDIENTE') ? sel.result : ((sel.tip?.result && sel.tip.result !== 'PENDIENTE') ? sel.tip.result : 'PENDIENTE');
  }

  private findSelectionInTickets(predicate: (s: TicketSelection) => boolean): TicketSelection | null {
    for (const t of this.allTickets) {
      if (t.selections) {
        for (const s of t.selections) {
          if (predicate(s)) return s;
        }
      }
      if (t.betBuilders) {
        for (const bb of t.betBuilders) {
          if (bb.selections) {
            for (const s of bb.selections) {
              if (predicate(s)) return s;
            }
          }
        }
      }
    }
    return null;
  }

  addSearchResult(item: SearchResultItem) {
    if (item.type === 'BET_BUILDER' && item.betBuilder) {
      const bb = item.betBuilder;
      const firstTip = bb.selections[0]?.tip;
      if (!firstTip) return;

      const event: EventForm = {
        name: firstTip.event || item.event || '',
        sport: firstTip.sport || item.sport || '',
        league: firstTip.league || item.league || '',
        isBetBuilder: true,
        bbFinalOdds: item.finalOdds || bb.realOdds || bb.expectedOdds,
        picks: bb.selections.filter(s => s.tip).map(s => ({
          selectionId: undefined,
          tipId: s.tip?.id,
          date: s.tip?.date,
          market: s.tip!.market || '',
          pick: s.tip!.pick || '',
          odds: s.tip!.odds ?? null,
          result: this.getSelectionResult(s)
        }))
      };

      // Remove the initial blank event if it exists
      if (this.events.length === 1 && !this.events[0].name && this.events[0].picks.length === 1 && !this.events[0].picks[0].market) {
        this.events = [];
      }
      
      this.events.push(event);
      this.searchTipText = '';
      this.calculateTicketType();
      this.calculateTotalOdds();
      this.updateAutomaticTicketDate();
      this.updateAutomaticTicketResult();
    } else if (item.tip) {
      // Remove the initial blank event if it exists
      if (this.events.length === 1 && !this.events[0].name && this.events[0].picks.length === 1 && !this.events[0].picks[0].market) {
        this.events = [];
      }
      this.addSearchedSelection(item.tip);
    }
  }

  loadTickets() {
    // Reactive subscription: stays alive and auto-updates when BehaviorSubject emits
    this.ticketService.getTickets()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.allTickets = data.map(t => this.sanitizeTicket(t));
          this.applyFilter();
        },
        error: (err) => console.error('Error loading tickets', err)
      });
  }

  filterTickets() {
    this.applyFilter();
  }

  applyFilter() {
    if (this.currentView === 'channel') {
      this.tickets = this.allTickets.filter(t => {
        if (!t.originalTipster) return false;
        const matchesChannel = (t.selections && t.selections.some(s => s.tip?.channel?.id === this.currentChannelId)) ||
                               (t.betBuilders && t.betBuilders.some(bb => bb.selections && bb.selections.some(s => s.tip?.channel?.id === this.currentChannelId)));
        if (!matchesChannel) return false;
        
        if (this.selectedFilterSubgroup) {
          const selMatches = t.selections && t.selections.some(s => s.tip?.subgroup?.id === this.selectedFilterSubgroup);
          const bbMatches = t.betBuilders && t.betBuilders.some(bb => bb.selections && bb.selections.some(s => s.tip?.subgroup?.id === this.selectedFilterSubgroup));
          const ticketMatches = t.subgroup && t.subgroup.id === this.selectedFilterSubgroup;
          return ticketMatches || selMatches || bbMatches;
        }
        return true;
      });
    } else {
      this.tickets = this.allTickets.filter(t => !t.originalTipster);
    }

    this.tickets.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) {
        return this.sortOrder === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
      }
      return this.sortOrder === 'desc' ? (b.id || 0) - (a.id || 0) : (a.id || 0) - (b.id || 0);
    });
  }

  loadTips() {
    this.tipService.getTips().subscribe({
      next: (data) => this.availableTips = data, 
      error: (err) => console.error('Error loading tips', err)
    });
  }

  openNewForm() {
    this.isEditing = false;
    this.newTicket = this.getDefaultTicket();
    if (this.currentView === 'channel') {
      this.newTicket.originalTipster = true;
    }
    this.events = [];
    this.addEvent();
    this.showForm = true;
    this.calculateTicketType();
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
    // Initialize bbFinalOdds if it becomes a Bet Builder
    if (event.picks.length > 1 && !event.bbFinalOdds) {
      event.bbFinalOdds = event.picks.reduce((acc, p) => acc * (p.odds || 1), 1);
      event.bbFinalOdds = parseFloat(event.bbFinalOdds.toFixed(3));
    }
    this.calculateTicketType();
    this.calculateTotalOdds();
    this.updateAutomaticTicketResult();
  }

  removePickFromEvent(event: EventForm, pickIndex: number) {
    event.picks.splice(pickIndex, 1);
    if (event.picks.length === 0) {
      const idx = this.events.indexOf(event);
      if (idx !== -1) this.removeEvent(idx);
    } else {
      this.calculateTicketType();
      this.calculateTotalOdds();
      this.updateAutomaticTicketResult();
      this.updateAutomaticTicketDate();
    }
  }

  calculateTicketType() {
    const totalEvents = this.events.length;
    let hasBetBuilder = false;

    this.events.forEach(e => {
      if (e.picks.length > 1 || e.isBetBuilder) hasBetBuilder = true;
    });

    if (totalEvents === 0) {
      this.newTicket.type = 'Desconocido';
    } else if (totalEvents === 1 && !hasBetBuilder) {
      this.newTicket.type = 'Simple';
    } else if (totalEvents === 1 && hasBetBuilder) {
      this.newTicket.type = 'Bet Builder Puro';
    } else if (totalEvents > 1 && !hasBetBuilder) {
      this.newTicket.type = 'Combinada';
    } else if (totalEvents > 1 && hasBetBuilder) {
      this.newTicket.type = 'Mixta';
    }
  }

  calculateTotalOdds() {
    let total = 1.0;
    this.events.forEach(e => {
      if (e.picks.length > 1) {
        if (e.bbFinalOdds) total *= e.bbFinalOdds;
      } else {
        e.picks.forEach(p => {
          if (p.odds) total *= p.odds;
        });
      }
    });
    this.newTicket.totalOdds = parseFloat(total.toFixed(3));
  }

  onOddsChange() {
    this.calculateTotalOdds();
  }

  onPickResultChange() {
    this.updateAutomaticTicketResult();
  }

  updateAutomaticTicketResult() {
    if (this.newTicket.result === 'CASHOUT') return;

    let hasPerdida = false;
    let hasPendiente = false;
    let hasGanada = false;
    let totalPicks = 0;

    this.events.forEach(e => {
      e.picks.forEach(p => {
        totalPicks++;
        const res = (p.result || 'PENDIENTE').toUpperCase();
        if (res === 'PERDIDA') hasPerdida = true;
        else if (res === 'PENDIENTE') hasPendiente = true;
        else if (res === 'GANADA') hasGanada = true;
      });
    });

    if (totalPicks === 0) {
      this.newTicket.result = 'PENDIENTE';
    } else if (hasPerdida) {
      this.newTicket.result = 'PERDIDA';
    } else if (hasPendiente) {
      this.newTicket.result = 'PENDIENTE';
    } else if (hasGanada) {
      this.newTicket.result = 'GANADA';
    } else {
      this.newTicket.result = 'NULA';
    }
  }

  updateAutomaticTicketDate() {
    for (const e of this.events) {
      for (const p of e.picks) {
        if (p.date) {
          this.newTicket.date = p.date;
          return;
        }
      }
    }
  }

  editTicket(ticket: Ticket) {
    this.isEditing = true;
    this.newTicket = JSON.parse(JSON.stringify(this.sanitizeTicket(ticket)));
    
    // Transform selections and betBuilders back to events
    this.events = [];
    
    // Simples
    if (this.newTicket.selections) {
      this.newTicket.selections.forEach(sel => {
        if (sel.tip) {
           this.events.push({
             name: sel.tip.event || '',
             sport: sel.tip.sport || '',
             league: sel.tip.league || '',
             isBetBuilder: false,
             picks: [{
               selectionId: sel.id,
               tipId: sel.tip.id,
               date: sel.tip.date,
               channel: sel.tip.channel,
               market: sel.tip.market || '',
               pick: sel.tip.pick || '',
               odds: sel.tip.odds ?? null,
               result: this.getSelectionResult(sel)
             }]
           });
        }
      });
    }

    // Bet Builders
    if (this.newTicket.betBuilders) {
      this.newTicket.betBuilders.forEach(bb => {
        if (bb.selections && bb.selections.length > 0) {
          const firstTip = bb.selections[0].tip;
          if (firstTip) {
            const event: EventForm = {
              name: firstTip.event || '',
              sport: firstTip.sport || '',
              league: firstTip.league || '',
              isBetBuilder: true,
              picks: bb.selections.filter(s => s.tip).map(s => ({
                selectionId: s.id,
                tipId: s.tip?.id,
                date: s.tip?.date,
                channel: s.tip?.channel,
                market: s.tip!.market || '',
                pick: s.tip!.pick || '',
                odds: s.tip!.odds ?? null,
                result: this.getSelectionResult(s)
              })),
              bbFinalOdds: bb.realOdds || bb.expectedOdds
            };
            this.events.push(event);
          }
        }
      });
    }

    this.showForm = true;
    this.calculateTicketType();
    this.updateAutomaticTicketDate();
    this.updateAutomaticTicketResult();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleForm() {
    this.showForm = !this.showForm;
  }

  viewTicket(ticket: Ticket) {
    this.selectedTicketForView = this.sanitizeTicket(ticket);
  }

  closeViewTicket() {
    this.selectedTicketForView = null;
  }

  addSearchedSelection(tip: Tip) {
    // Para rearmado, convertimos el tip en un evento para poder manipularlo visualmente igual
    const event: PickForm = { 
      tipId: tip.id, 
      date: tip.date,
      channel: tip.channel,
      market: tip.market || '', 
      pick: tip.pick || '', 
      odds: tip.odds ?? null,
      result: this.getSelectionResult({ tip })
    };
    
    // Buscamos si ya hay un evento con ese nombre para adjuntarlo como bet builder
    const tipEventName = (tip.event || '').trim().toLowerCase();
    const existing = this.events.find(e => (e.name || '').trim().toLowerCase() === tipEventName);
    if (existing) {
      existing.picks.push(event);
      existing.isBetBuilder = true;
      if (existing.picks.length > 1 && !existing.bbFinalOdds) {
        existing.bbFinalOdds = existing.picks.reduce((acc, p) => acc * (p.odds || 1), 1);
        existing.bbFinalOdds = parseFloat(existing.bbFinalOdds.toFixed(3));
      }
    } else {
      this.events.push({
        name: tip.event || '',
        sport: tip.sport || '',
        league: tip.league || '',
        isBetBuilder: false,
        picks: [event]
      });
    }
    
    this.searchTipText = '';
    this.calculateTicketType();
    this.calculateTotalOdds();
    this.updateAutomaticTicketDate();
    this.updateAutomaticTicketResult();
  }

  saveTicket() {
    if (!this.newTicket.bookmaker || !this.newTicket.stake) {
      alert("Por favor llena la Casa de Apuestas y el Stake.");
      return;
    }
    
    // Transform Events back to Selections and BetBuilders
    this.newTicket.selections = [];
    this.newTicket.betBuilders = [];

    const fallbackDate = this.newTicket.date || new Date().toISOString().substring(0,10);
    const subgroup = this.newTicket.subgroup;
    let channelObj = this.currentChannelId && this.currentView === 'channel' ? { id: this.currentChannelId, name: '', type: '' } : null;

    this.events.forEach(e => {
      // Skip completely empty events to avoid database unique constraint errors on generated IDs
      if (!e.name && e.picks.length === 1 && !e.picks[0].market && !e.picks[0].pick) return;

      const isBB = e.isBetBuilder || e.picks.length > 1;
      const eventName = (e.name && e.name.trim()) ? e.name : 'Evento';
      if (!isBB && e.picks.length === 1) {
        // Simple Selection
        const p = e.picks[0];
        const res = p.result || 'PENDIENTE';
        const tipChannel = p.channel || (channelObj as Channel) || undefined;
        const tip: Partial<Tip> = {
          id: p.tipId,
          date: p.date || fallbackDate,
          event: eventName,
          sport: e.sport,
          league: e.league,
          market: (p.market && p.market.trim()) ? p.market : 'Mercado',
          pick: (p.pick && p.pick.trim()) ? p.pick : 'Selección',
          odds: p.odds ?? undefined,
          result: res,
          subgroup: subgroup,
          channel: tipChannel
        };

        this.newTicket.selections!.push({
          id: p.selectionId,
          tip: tip as Tip,
          result: res
        });
      } else if (isBB) {
        // Bet Builder
        const expected = e.picks.reduce((acc, p) => acc * (p.odds || 1), 1);
        const bb: BetBuilder = {
          expectedOdds: expected,
          realOdds: e.bbFinalOdds || expected,
          selections: []
        };
        e.picks.forEach(p => {
          const res = p.result || 'PENDIENTE';
          const tipChannel = p.channel || (channelObj as Channel) || undefined;
          const tip: Partial<Tip> = {
            id: p.tipId,
            date: p.date || fallbackDate,
            event: eventName,
            sport: e.sport,
            league: e.league,
            market: (p.market && p.market.trim()) ? p.market : 'Mercado',
            pick: (p.pick && p.pick.trim()) ? p.pick : 'Selección',
            odds: p.odds ?? undefined,
            result: res,
            subgroup: subgroup,
            channel: tipChannel
          };
          bb.selections!.push({
            id: p.selectionId,
            tip: tip as Tip,
            result: res
          });
        });
        this.newTicket.betBuilders!.push(bb);
      }
    });

    this.ticketService.createTicket(this.newTicket as Ticket).subscribe({
      next: (saved) => {
        const sanitizedSaved = this.sanitizeTicket(saved);
        if (this.isEditing) {
          const idx = this.allTickets.findIndex(t => t.id === sanitizedSaved.id);
          if (idx !== -1) this.allTickets[idx] = sanitizedSaved;
        } else {
          this.allTickets.push(sanitizedSaved);
        }
        this.filterTickets();
        this.showForm = false;
        this.newTicket = this.getDefaultTicket();
      },
      error: (err) => alert('Error guardando ticket. Error: ' + (err.error?.message || err.message))
    });
  }

  closeTicket(ticket: Ticket, result: string) {
    if (!ticket.id) return;
    
    if (result === 'GANADA' || ticket.type === 'Simple') {
      // Auto-submit para simples o ganadas completas
      this.submitCloseTicket(ticket, result, ticket.cashoutAmount || null, this.autoGenerateResults(ticket, result));
      return;
    }
    
    // Open modal para PERDIDA o CASHOUT en combinadas/mixtas
    this.ticketToClose = ticket;
    this.closeResult = result;
    this.closeCashoutAmount = ticket.cashoutAmount || null;
    this.closeSelectionResults = {};
    this.closeSelectionsList = this.extractSelectionsForClose(ticket);
    
    // Inicializar con el estado actual o PENDIENTE para que el usuario los marque
    this.closeSelectionsList.forEach(s => {
      this.closeSelectionResults[s.id] = s.result || 'PENDIENTE';
    });
    
    this.isCloseModalOpen = true;
  }

  cancelClose() {
    this.isCloseModalOpen = false;
    this.ticketToClose = null;
  }

  confirmClose() {
    if (!this.ticketToClose) return;
    if (this.closeResult === 'CASHOUT' && (this.closeCashoutAmount === null || this.closeCashoutAmount < 0)) {
      alert('Debes ingresar un monto de cashout válido.');
      return;
    }
    this.submitCloseTicket(this.ticketToClose, this.closeResult, this.closeCashoutAmount, this.closeSelectionResults);
    this.isCloseModalOpen = false;
  }

  private autoGenerateResults(ticket: Ticket, globalResult: string): { [key: number]: string } {
    const map: { [key: number]: string } = {};
    const res = globalResult === 'GANADA' ? 'GANADA' : globalResult;
    this.extractSelectionsForClose(ticket).forEach(s => map[s.id] = res);
    return map;
  }

  private extractSelectionsForClose(ticket: Ticket): any[] {
    const list: any[] = [];
    if (ticket.selections) {
      ticket.selections.forEach(s => list.push(s));
    }
    if (ticket.betBuilders) {
      ticket.betBuilders.forEach(bb => {
        if (bb.selections) {
          bb.selections.forEach(s => list.push(s));
        }
      });
    }
    return list;
  }

  private submitCloseTicket(ticket: Ticket, result: string, cashoutAmount: number | null, selectionResults: { [key: number]: string }) {
    const request = {
      result,
      cashoutAmount: cashoutAmount !== null ? cashoutAmount : undefined,
      selectionResults
    };
    
    this.ticketService.updateResult(ticket.id!, request).subscribe({
      next: () => {
        // No need to call loadTickets() — TicketService.refresh() already pushes
        // fresh data to ALL subscribers (including this component) via BehaviorSubject
      },
      error: (err) => alert('Error actualizando resultado del ticket: ' + err.message)
    });
  }

  deleteTicket(id: number) {
    if (confirm('¿Estás seguro de que deseas eliminar este ticket?')) {
      this.ticketService.deleteTicket(id).subscribe({
        next: () => {
          this.allTickets = this.allTickets.filter(t => t.id !== id);
          this.filterTickets();
        },
        error: (err) => alert('Error eliminando ticket: ' + err.message)
      });
    }
  }

  getTicketSubgroupNames(ticket: Ticket): string {
    if (ticket.subgroup) return ticket.subgroup.name;
    const subgroups: string[] = [];
    if (ticket.selections) {
      ticket.selections.forEach(sel => {
        if (sel.tip && sel.tip.subgroup && !subgroups.includes(sel.tip.subgroup.name)) {
          subgroups.push(sel.tip.subgroup.name);
        }
      });
    }
    if (ticket.betBuilders) {
      ticket.betBuilders.forEach(bb => {
        if (bb.selections) {
          bb.selections.forEach(s => {
            if (s.tip && s.tip.subgroup) subgroups.push(s.tip.subgroup.name);
          });
        }
      });
    }
    const unique = [...new Set(subgroups)];
    return unique.join(', ');
  }

  getEventSummary(ticket: Ticket): string {
    const events = new Set<string>();
    if (ticket.selections) {
      ticket.selections.forEach(sel => {
        if (sel.tip && sel.tip.event) events.add(sel.tip.event);
      });
    }
    if (ticket.betBuilders) {
      ticket.betBuilders.forEach(bb => {
        if (bb.selections) {
          bb.selections.forEach(sel => {
            if (sel.tip && sel.tip.event) events.add(sel.tip.event);
          });
        }
      });
    }
    const eventArr = Array.from(events);
    if (eventArr.length === 0) return 'Desconocido';
    if (eventArr.length === 1) return eventArr[0];
    return `${eventArr[0]} +${eventArr.length - 1}`;
  }

  getFullEventSummary(ticket: Ticket): string {
    const events = new Set<string>();
    if (ticket.selections) {
      ticket.selections.forEach(sel => {
        if (sel.tip && sel.tip.event) events.add(sel.tip.event);
      });
    }
    if (ticket.betBuilders) {
      ticket.betBuilders.forEach(bb => {
        if (bb.selections) {
          bb.selections.forEach(sel => {
            if (sel.tip && sel.tip.event) events.add(sel.tip.event);
          });
        }
      });
    }
    const eventArr = Array.from(events);
    if (eventArr.length === 0) return 'Desconocido';
    return eventArr.join('\n');
  }

  getTicketChannelInfo(ticket: Ticket): { summary: string; isMixed: boolean; channels: string[] } {
    const channels = new Set<string>();

    if (ticket.selections) {
      ticket.selections.forEach(sel => {
        if (sel.tip?.channel?.name) {
          channels.add(sel.tip.channel.name);
        } else {
          channels.add('Personal');
        }
      });
    }

    if (ticket.betBuilders) {
      ticket.betBuilders.forEach(bb => {
        if (bb.selections) {
          bb.selections.forEach(s => {
            if (s.tip?.channel?.name) {
              channels.add(s.tip.channel.name);
            } else {
              channels.add('Personal');
            }
          });
        }
      });
    }

    const channelArr = Array.from(channels);
    if (channelArr.length === 0) {
      return { summary: 'Personal', isMixed: false, channels: ['Personal'] };
    }
    if (channelArr.length === 1) {
      return { summary: channelArr[0], isMixed: false, channels: channelArr };
    }
    return {
      summary: `Mixto (${channelArr.join(' + ')})`,
      isMixed: true,
      channels: channelArr
    };
  }

  getSelectionChannelName(sel: any): string {
    if (sel?.tip?.channel?.name) {
      return sel.tip.channel.name;
    }
    return 'Personal';
  }
}
