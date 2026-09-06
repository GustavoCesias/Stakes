import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TipService, Tip } from '../../services/tip.service';
import { ChannelService, Channel, ChannelSubgroup } from '../../services/channel.service';
import { TicketService, Ticket, BetBuilder } from '../../services/ticket.service';

export interface BaseMaestraItem {
  id: string;
  type: 'TIP' | 'BET_BUILDER';
  date: string;
  event: string;
  sport?: string;
  league?: string;
  channel?: Channel | null;
  odds: number | null;
  result: string;
  tip?: Tip;
  market?: string;
  pick?: string;
  betBuilder?: BetBuilder;
  picks?: { market: string; pick: string; result?: string }[];
  groupTips?: Tip[];
}

@Component({
  selector: 'app-tip-pool',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tip-pool.component.html',
  styleUrl: './tip-pool.component.css'
})
export class TipPoolComponent implements OnInit {
  showForm = false;
  showChannelForm = false;
  isEditing = false;
  
  tips: Tip[] = [];
  tickets: Ticket[] = [];
  channels: Channel[] = [];

  searchText = '';
  filterResult: string = 'ALL';
  selectedChannelFilter: number | 'ALL' | 'PERSONAL' = 'ALL';
  selectedSubgroupFilter: number | 'ALL' = 'ALL';
  
  filterSubgroups: ChannelSubgroup[] = [];
  formSubgroups: ChannelSubgroup[] = [];

  editingTip: Partial<Tip> = this.getDefaultTip();
  editingBetBuilderTips: Tip[] | null = null;

  newChannel: Partial<Channel> = { type: 'VIP' };

  private tipService = inject(TipService);
  private channelService = inject(ChannelService);
  private ticketService = inject(TicketService);

  ngOnInit() {
    this.loadTips();
    this.loadChannels();
    this.loadTickets();
  }

  getDefaultTip(): Partial<Tip> {
    return { result: 'PENDIENTE', channel: null, date: new Date().toISOString().substring(0,10) };
  }

  loadTips() {
    this.tipService.getTips().subscribe({
      next: (data) => this.tips = data,
      error: (err) => console.error('Error loading tips', err)
    });
  }

  loadTickets() {
    this.ticketService.getTickets().subscribe({
      next: (data) => this.tickets = data,
      error: (err) => console.error('Error loading tickets', err)
    });
  }

  loadChannels() {
    this.channelService.getChannels().subscribe({
      next: (data) => this.channels = data,
      error: (err) => console.error('Error loading channels', err)
    });
  }

  get allItems(): BaseMaestraItem[] {
    const items: BaseMaestraItem[] = [];
    const seenTipIdsInBB = new Set<number>();
    const seenBbKeys = new Set<string>();

    // 1. Process Bet Builders ONLY from original tipster tickets (originalTipster === true)
    this.tickets.forEach(t => {
      if (t.originalTipster && t.betBuilders) {
        t.betBuilders.forEach(bb => {
          if (!bb.selections || bb.selections.length === 0) return;
          const firstTip = bb.selections[0]?.tip;
          if (!firstTip) return;

          bb.selections.forEach(s => {
            if (s.tip?.id) seenTipIdsInBB.add(s.tip.id);
          });

          const eventName = firstTip.event || 'Bet Builder';
          const combinedOdds = bb.realOdds || bb.expectedOdds || null;
          
          let bbResult = 'PENDIENTE';
          let hasPerdida = false;
          let hasPendiente = false;
          let hasGanada = false;
          bb.selections.forEach(s => {
            const r = (s.result || s.tip?.result || 'PENDIENTE').toUpperCase();
            if (r === 'PERDIDA') hasPerdida = true;
            else if (r === 'PENDIENTE') hasPendiente = true;
            else if (r === 'GANADA') hasGanada = true;
          });
          if (hasPerdida) bbResult = 'PERDIDA';
          else if (hasPendiente) bbResult = 'PENDIENTE';
          else if (hasGanada) bbResult = 'GANADA';
          else bbResult = 'NULA';

          const picksSummary = bb.selections.map(s => `${s.tip?.market}: ${s.tip?.pick}`).join(' | ');
          const bbKey = `${eventName}_${picksSummary}_${combinedOdds}`;

          const bbChannel = firstTip.channel || t.selections?.[0]?.tip?.channel || null;

          if (!seenBbKeys.has(bbKey)) {
            seenBbKeys.add(bbKey);
            items.push({
              id: 'bb-' + (bb.id || Math.random()),
              type: 'BET_BUILDER',
              date: firstTip.date || t.date || '',
              event: eventName,
              sport: firstTip.sport,
              league: firstTip.league,
              channel: bbChannel,
              odds: combinedOdds ? Number(combinedOdds) : null,
              result: bbResult,
              betBuilder: bb,
              picks: bb.selections.map(s => ({
                market: s.tip?.market || 'Mercado',
                pick: s.tip?.pick || 'Selección',
                result: s.result || s.tip?.result || 'PENDIENTE'
              })),
              groupTips: bb.selections.map(s => s.tip).filter(t => !!t) as Tip[]
            });
          }
        });
      }
    });

    // 2. Process individual Tips not part of original tipster Bet Builders
    const standaloneTips: Tip[] = [];
    const bbTipGroups = new Map<string, Tip[]>();

    this.tips.forEach(t => {
      if (t.id && seenTipIdsInBB.has(t.id)) return;

      if (t.odds === null || t.odds === undefined) {
        const key = `${t.date}_${(t.event || '').trim().toLowerCase()}_${t.channel?.id || 'personal'}`;
        if (!bbTipGroups.has(key)) {
          bbTipGroups.set(key, []);
        }
        bbTipGroups.get(key)!.push(t);
      } else {
        standaloneTips.push(t);
      }
    });

    // Group tips with odds == null into consolidated Bet Builders
    bbTipGroups.forEach((groupTips) => {
      if (groupTips.length === 0) return;

      const first = groupTips[0];
      let combinedOdds: number | null = null;
      for (const t of this.tickets) {
        if (t.betBuilders) {
          for (const bb of t.betBuilders) {
            if (bb.selections && bb.selections.some(s => groupTips.some(gt => gt.id === s.tip?.id))) {
              combinedOdds = bb.realOdds || bb.expectedOdds || null;
              if (combinedOdds) break;
            }
          }
        }
        if (combinedOdds) break;
      }

      const picksSummary = groupTips.map(gt => `${gt.market}: ${gt.pick}`).join(' | ');
      const bbKey = `${first.event}_${picksSummary}_${combinedOdds}`;

      let bbResult = 'PENDIENTE';
      const hasPerdida = groupTips.some(gt => (gt.result || '').toUpperCase() === 'PERDIDA');
      const hasPendiente = groupTips.some(gt => (gt.result || '').toUpperCase() === 'PENDIENTE');
      const hasGanada = groupTips.some(gt => (gt.result || '').toUpperCase() === 'GANADA');
      if (hasPerdida) bbResult = 'PERDIDA';
      else if (hasPendiente) bbResult = 'PENDIENTE';
      else if (hasGanada) bbResult = 'GANADA';
      else bbResult = 'NULA';

      if (!seenBbKeys.has(bbKey)) {
        seenBbKeys.add(bbKey);
        items.push({
          id: 'bb-tipgroup-' + (first.id || Math.random()),
          type: groupTips.length > 1 ? 'BET_BUILDER' : 'TIP',
          date: first.date || '',
          event: first.event || '',
          sport: first.sport,
          league: first.league,
          channel: first.channel || null,
          odds: combinedOdds ? Number(combinedOdds) : null,
          result: bbResult,
          picks: groupTips.map(gt => ({
            market: gt.market || 'Mercado',
            pick: gt.pick || 'Selección',
            result: gt.result || 'PENDIENTE'
          })),
          groupTips: groupTips
        });
      }
    });

    // Process standalone tips (which have valid numeric odds)
    standaloneTips.forEach(t => {
      items.push({
        id: 'tip-' + t.id,
        type: 'TIP',
        date: t.date || '',
        event: t.event || '',
        sport: t.sport,
        league: t.league,
        channel: t.channel,
        market: t.market,
        pick: t.pick,
        odds: t.odds ? Number(t.odds) : null,
        result: t.result || 'PENDIENTE',
        tip: t
      });
    });

    return items;
  }

  get filteredItems(): BaseMaestraItem[] {
    let result = this.allItems;
    if (this.selectedChannelFilter === 'PERSONAL') {
      result = result.filter(i => !i.channel);
    } else if (this.selectedChannelFilter !== 'ALL') {
      result = result.filter(i => i.channel?.id === Number(this.selectedChannelFilter));
    }
    if (this.selectedSubgroupFilter !== 'ALL') {
      result = result.filter(i => i.tip?.subgroup?.id === Number(this.selectedSubgroupFilter));
    }
    if (this.filterResult !== 'ALL') {
      result = result.filter(i => i.result === this.filterResult);
    }
    if (this.searchText.trim().length >= 2) {
      const s = this.searchText.toLowerCase();
      result = result.filter(i =>
        i.event.toLowerCase().includes(s) ||
        i.channel?.name?.toLowerCase().includes(s) ||
        (!i.channel && 'personal'.includes(s)) ||
        (i.market && i.market.toLowerCase().includes(s)) ||
        (i.pick && i.pick.toLowerCase().includes(s)) ||
        (i.picks && i.picks.some(p => p.market.toLowerCase().includes(s) || p.pick.toLowerCase().includes(s)))
      );
    }
    return [...result].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return a.id.localeCompare(b.id);
    });
  }

  get channelItems(): BaseMaestraItem[] {
    if (this.selectedChannelFilter === 'PERSONAL') {
      return this.allItems.filter(i => !i.channel);
    }
    if (this.selectedChannelFilter === 'ALL') {
      return this.allItems;
    }
    return this.allItems.filter(i => i.channel?.id === Number(this.selectedChannelFilter));
  }

  get totalTipsCount(): number {
    return this.channelItems.length;
  }

  get wonCount(): number {
    return this.channelItems.filter(i => i.result === 'GANADA').length;
  }

  get lostCount(): number {
    return this.channelItems.filter(i => i.result === 'PERDIDA').length;
  }

  get nullCount(): number {
    return this.channelItems.filter(i => i.result === 'NULA').length;
  }

  get pendingCount(): number {
    return this.channelItems.filter(i => i.result === 'PENDIENTE').length;
  }

  hasValidOdds(item: BaseMaestraItem): boolean {
    return item.odds !== null && item.odds !== undefined && Number(item.odds) > 1.0;
  }

  get itemsWithOdds(): BaseMaestraItem[] {
    return this.channelItems.filter(i => this.hasValidOdds(i));
  }

  get validOddsCount(): number {
    return this.itemsWithOdds.length;
  }

  get winRate(): number {
    const closed = this.wonCount + this.lostCount;
    if (closed === 0) return 0;
    return Math.round((this.wonCount / closed) * 100);
  }

  get winRateDetail(): string {
    const closed = this.wonCount + this.lostCount;
    return `${this.wonCount} de ${closed} recomendaciones cerradas`;
  }

  get avgOdds(): number {
    if (this.itemsWithOdds.length === 0) return 0;
    const sum = this.itemsWithOdds.reduce((acc, i) => acc + Number(i.odds), 0);
    return parseFloat((sum / this.itemsWithOdds.length).toFixed(2));
  }

  get theoreticalProfit(): number {
    let prof = 0;
    this.itemsWithOdds.forEach(i => {
      if (i.result === 'GANADA') prof += (Number(i.odds) - 1);
      else if (i.result === 'PERDIDA') prof -= 1;
    });
    return parseFloat(prof.toFixed(2));
  }

  get theoreticalYield(): number {
    const closedWithOdds = this.itemsWithOdds.filter(i => i.result === 'GANADA' || i.result === 'PERDIDA' || i.result === 'NULA');
    if (closedWithOdds.length === 0) return 0;
    return Math.round((this.theoreticalProfit / closedWithOdds.length) * 100);
  }

  openNewForm() {
    this.isEditing = false;
    this.editingTip = this.getDefaultTip();
    this.formSubgroups = [];
    this.showForm = true;
  }

  editTip(item: BaseMaestraItem) {
    this.isEditing = true;
    if (item.type === 'BET_BUILDER' && item.groupTips && item.groupTips.length > 0) {
      this.editingBetBuilderTips = item.groupTips;
      this.editingTip = { ...item.groupTips[0] };
    } else if (item.tip) {
      this.editingBetBuilderTips = null;
      this.editingTip = { ...item.tip };
    }
    this.showForm = true;
    this.onChannelSelected();
  }

  onChannelSelected() {
    this.formSubgroups = [];
    this.editingTip.subgroup = null;
    if (this.editingTip.channel?.id) {
      this.channelService.getSubgroups(this.editingTip.channel.id).subscribe({
        next: (sg) => this.formSubgroups = sg,
        error: (err) => console.error('Error loading form subgroups', err)
      });
    }
  }

  onFilterChannelSelected() {
    this.selectedSubgroupFilter = 'ALL';
    this.filterSubgroups = [];
    if (this.selectedChannelFilter !== 'ALL' && this.selectedChannelFilter !== 'PERSONAL') {
      this.channelService.getSubgroups(Number(this.selectedChannelFilter)).subscribe({
        next: (sg) => this.filterSubgroups = sg,
        error: (err) => console.error('Error loading filter subgroups', err)
      });
    }
  }

  cancelForm() {
    this.showForm = false;
  }

  toggleChannelForm() {
    this.showChannelForm = !this.showChannelForm;
  }

  compareChannels(c1: Channel, c2: Channel): boolean {
    return c1 && c2 ? c1.id === c2.id : c1 === c2;
  }

  compareSubgroups(s1: ChannelSubgroup, s2: ChannelSubgroup): boolean {
    return s1 && s2 ? s1.id === s2.id : s1 === s2;
  }

  saveChannel() {
    if (this.newChannel.name && this.newChannel.type) {
      this.channelService.createChannel(this.newChannel as Channel).subscribe({
        next: (created) => {
          this.channels.push(created);
          this.editingTip.channel = created;
          this.toggleChannelForm();
          this.newChannel = { type: 'VIP' };
        },
        error: (err) => alert('Error creando canal. Revisa que el servidor Spring esté encendido.')
      });
    }
  }

  saveTip() {
    if (!this.editingTip.event || !this.editingTip.date) return;

    if (this.isEditing) {
      if (this.editingBetBuilderTips) {
        // Batch update for Bet Builder
        const updated = this.editingBetBuilderTips.map(t => ({
          ...t,
          channel: this.editingTip.channel || null,
          subgroup: this.editingTip.subgroup || null,
          date: this.editingTip.date || '',
          event: this.editingTip.event || '',
          sport: this.editingTip.sport || '',
          league: this.editingTip.league || ''
        })) as Tip[];
        this.tipService.updateTipsBatch(updated).subscribe({
          next: () => {
            this.cancelForm();
            this.loadTips(); // recargar
          },
          error: (err) => console.error('Error actualizando BetBuilder tips', err)
        });
      } else if (this.editingTip.id) {
        // Single update
        this.tipService.updateTip(this.editingTip.id, this.editingTip as Tip).subscribe({
          next: (saved) => {
            const idx = this.tips.findIndex(t => t.id === saved.id);
            if (idx !== -1) {
              this.tips[idx] = saved;
            }
            this.cancelForm();
            this.loadTips();
          },
          error: (err) => console.error('Error editando tip', err)
        });
      }
    } else {
      if (!this.editingTip.market || !this.editingTip.pick) return;
      this.tipService.createTip(this.editingTip as Tip).subscribe({
        next: (saved) => {
          this.tips.push(saved);
          this.cancelForm();
          this.loadTips();
        },
        error: (err) => console.error('Error guardando tip', err)
      });
    }
  }

  updateTipResult(item: BaseMaestraItem, result: string) {
    if (item.type === 'TIP' && item.tip?.id) {
      const updatedTip = { ...item.tip, result: result };
      this.tipService.updateTip(item.tip.id, updatedTip as Tip).subscribe({
        next: (saved) => {
          const idx = this.tips.findIndex(t => t.id === saved.id);
          if (idx !== -1) this.tips[idx] = saved;
          this.loadTips();
        },
        error: (err) => alert('Error actualizando resultado. Error: ' + err.message)
      });
    }
  }

  deleteItem(item: BaseMaestraItem) {
    if (item.type === 'TIP' && item.tip?.id) {
      if (confirm('¿Estás seguro de que deseas eliminar esta recomendación?')) {
        this.tipService.deleteTip(item.tip.id).subscribe({
          next: () => {
            this.tips = this.tips.filter(t => t.id !== item.tip!.id);
            this.loadTips();
          },
          error: (err) => {
            const msg = err.error?.message || err.message || 'Error al eliminar el tip';
            alert('Error eliminando tip: ' + msg);
          }
        });
      }
    }
  }
}
