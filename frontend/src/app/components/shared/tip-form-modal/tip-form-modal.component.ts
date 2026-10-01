import { Component, OnInit, Output, EventEmitter, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TipService, Tip } from '../../../services/tip.service';
import { ChannelService, Channel, ChannelSubgroup } from '../../../services/channel.service';
import { ConfigService, Sport, League, MarketConfig } from '../../../services/config.service';
import { CalendarService, SportEvent } from '../../../services/calendar.service';

@Component({
  selector: 'app-tip-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tip-form-modal.component.html'
})
export class TipFormModalComponent implements OnInit {
  @Input() editTip: Tip | null = null;
  @Input() editingBetBuilderTips?: Tip[];
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private tipService = inject(TipService);
  private channelService = inject(ChannelService);
  private configService = inject(ConfigService);
  private calendarService = inject(CalendarService);

  showChannelForm = false;
  isEditing = false;
  isNewBetBuilder = false;
  
  editingTip: Partial<Tip> = { result: 'PENDIENTE' };
  newBBPicks: { market: string; pick: string }[] = [{ market: '', pick: '' }];
  newChannel: Partial<Channel> = { type: 'VIP' };

  channels: Channel[] = [];
  formSubgroups: ChannelSubgroup[] = [];
  sports: Sport[] = [];
  leagues: League[] = [];
  markets: MarketConfig[] = [];
  calendarEvents: SportEvent[] = [];
  filteredLeagues: League[] = [];

  uniqueCountries: string[] = [];
  tipCountry: string = '';

  ngOnInit() {
    this.loadConfigData();
    this.loadChannels();
    this.loadCalendarEvents();

    if (this.editTip) {
      this.isEditing = true;
      this.editingTip = { ...this.editTip };
      if (this.editingBetBuilderTips && this.editingBetBuilderTips.length > 0) {
        // BB logic handled mostly by inputs
      }
    } else {
      // Setup default for new tip
      const today = new Date();
      this.editingTip = {
        date: this.getLocalIsoDate(today),
        result: 'PENDIENTE',
        channel: null
      };
    }
  }

  getLocalIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  loadConfigData() {
    this.configService.getSports().subscribe(sports => this.sports = sports);
    this.configService.getLeagues().subscribe(leagues => {
      this.leagues = leagues;
      this.filteredLeagues = [...this.leagues];
      const countries = leagues.map(l => l.country).filter(c => !!c) as string[];
      this.uniqueCountries = [...new Set(countries)].sort();
    });
    this.configService.getMarkets().subscribe(markets => this.markets = markets);
  }

  loadChannels() {
    this.channelService.getChannels().subscribe(channels => {
      this.channels = channels;
      this.onChannelSelected();
    });
  }

  loadCalendarEvents() {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const end = new Date();
    end.setDate(end.getDate() + 30);
    this.calendarService.getEvents(start.toISOString(), end.toISOString()).subscribe(events => {
      this.calendarEvents = events;
    });
  }

  onChannelSelected() {
    if (this.editingTip.channel && this.editingTip.channel.id) {
      this.channelService.getSubgroups(this.editingTip.channel.id).subscribe(s => this.formSubgroups = s);
    } else {
      this.formSubgroups = [];
      this.editingTip.subgroup = null;
    }
  }

  onEventChange() {
    if (!this.editingTip.event) return;
    const evName = this.editingTip.event.trim().toLowerCase();
    const ev = this.calendarEvents.find(e => `${e.homeTeam} vs ${e.awayTeam}`.toLowerCase() === evName);
    if (ev) {
      if (ev.league?.sport?.name) {
        this.editingTip.sport = ev.league.sport.name;
      }
      if (ev.league?.country) {
        this.tipCountry = ev.league.country;
      }
      if (ev.league?.name) {
        this.editingTip.league = ev.league.name;
      }
      this.onFilterChange();
    }
  }

  onFilterChange() {
    this.filteredLeagues = this.leagues.filter(l => {
      let match = true;
      if (this.editingTip.sport) {
        match = match && l.sport?.name.toLowerCase() === this.editingTip.sport.toLowerCase();
      }
      if (this.tipCountry) {
        match = match && (l.country || '').toLowerCase() === this.tipCountry.toLowerCase();
      }
      return match;
    });
  }

  onSportChange() {
    this.onFilterChange();
  }

  getMarketOptions(marketName: string | undefined): string[] {
    if (!marketName) return [];
    const market = this.markets.find(m => m.name.toLowerCase() === marketName.toLowerCase());
    return market?.options || [];
  }

  compareChannels(c1: Channel, c2: Channel): boolean {
    return c1 && c2 ? c1.id === c2.id : c1 === c2;
  }

  compareSubgroups(s1: ChannelSubgroup, s2: ChannelSubgroup): boolean {
    return s1 && s2 ? s1.id === s2.id : s1 === s2;
  }

  toggleChannelForm() {
    this.showChannelForm = !this.showChannelForm;
  }

  saveChannel() {
    if (this.newChannel.name && this.newChannel.type) {
      this.channelService.createChannel(this.newChannel as Channel).subscribe({
        next: (created) => {
          this.channels.push(created);
          this.editingTip.channel = created;
          this.toggleChannelForm();
          this.newChannel = { type: 'VIP' };
          this.onChannelSelected();
        },
        error: (err) => alert('Error creando canal. Revisa que el servidor esté encendido.')
      });
    }
  }

  addBBPick() {
    if (this.isNewBetBuilder) {
      this.newBBPicks.push({ market: '', pick: '' });
    } else if (this.editingBetBuilderTips) {
      this.editingBetBuilderTips.push({ market: '', pick: '' } as Tip);
    }
  }

  removeBBPick(index: number) {
    if (this.isNewBetBuilder) {
      if (this.newBBPicks.length > 1) {
        this.newBBPicks.splice(index, 1);
      }
    } else if (this.editingBetBuilderTips) {
      if (this.editingBetBuilderTips.length > 1) {
        const pickToRemove = this.editingBetBuilderTips[index];
        if (pickToRemove.id) {
          if (confirm('¿Eliminar este pronóstico permanentemente?')) {
            this.tipService.deleteTip(pickToRemove.id).subscribe({
              next: () => {
                this.editingBetBuilderTips!.splice(index, 1);
                this.saved.emit();
              },
              error: (err) => alert('Error eliminando pick')
            });
          }
        } else {
          this.editingBetBuilderTips.splice(index, 1);
        }
      }
    }
  }

  saveTip() {
    if (this.isEditing) {
      if (this.editingBetBuilderTips) {
        let finalEvent = this.editingTip.event || '';
        if (!finalEvent.toUpperCase().endsWith('(BB)')) {
          finalEvent = finalEvent + ' (BB)';
        }

        this.editingBetBuilderTips.forEach((t, index) => {
          t.date = this.editingTip.date!;
          t.event = finalEvent;
          t.sport = this.editingTip.sport;
          t.league = this.editingTip.league;
          t.channel = this.editingTip.channel || null;
          t.subgroup = this.editingTip.subgroup || null;
          t.odds = index === 0 ? (this.editingTip.odds ?? null) : null;
        });
        
        this.tipService.updateTipsBatch(this.editingBetBuilderTips).subscribe({
          next: () => this.saved.emit(),
          error: (err) => console.error(err)
        });
      } else {
        this.tipService.updateTip(this.editingTip.id!, this.editingTip as Tip).subscribe({
          next: () => this.saved.emit(),
          error: (err) => console.error(err)
        });
      }
    } else {
      if (this.isNewBetBuilder) {
        let finalEvent = this.editingTip.event || '';
        if (!finalEvent.toUpperCase().endsWith('(BB)')) {
          finalEvent = finalEvent + ' (BB)';
        }

        const tipsToCreate: Tip[] = this.newBBPicks.map((p, index) => ({
          ...this.editingTip,
          event: finalEvent,
          market: p.market,
          pick: p.pick,
          odds: index === 0 ? (this.editingTip.odds ?? null) : null,
          result: 'PENDIENTE'
        } as Tip));
        
        this.tipService.createTipsBatch(tipsToCreate).subscribe({
          next: () => this.saved.emit(),
          error: (err) => console.error(err)
        });
      } else {
        this.tipService.createTip(this.editingTip as Tip).subscribe({
          next: () => this.saved.emit(),
          error: (err) => console.error(err)
        });
      }
    }
  }
}
