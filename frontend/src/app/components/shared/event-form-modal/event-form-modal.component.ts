import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarService, SportEvent } from '../../../services/calendar.service';
import { ConfigService, Sport, League } from '../../../services/config.service';

@Component({
  selector: 'app-event-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-form-modal.component.html'
})
export class EventFormModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<SportEvent>();

  private calendarService = inject(CalendarService);
  private configService = inject(ConfigService);

  newEvent: Partial<SportEvent> = {
    eventDate: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    })(),
    homeTeam: '',
    awayTeam: ''
  };

  sportName: string = '';
  countryName: string = '';
  leagueName: string = '';

  sports: Sport[] = [];
  leagues: League[] = [];
  filteredLeagues: League[] = [];
  uniqueCountries: string[] = [];

  ngOnInit() {
    this.configService.getSports().subscribe(data => this.sports = data);
    this.configService.getLeagues().subscribe(data => {
      this.leagues = data;
      this.filteredLeagues = data;
      // Extract unique countries
      const countries = data.map(l => l.country).filter(c => !!c) as string[];
      this.uniqueCountries = [...new Set(countries)].sort();
    });
  }

  onFilterChange() {
    this.filteredLeagues = this.leagues.filter(l => {
      let match = true;
      if (this.sportName) {
        match = match && l.sport?.name?.toLowerCase() === this.sportName.toLowerCase();
      }
      if (this.countryName) {
        match = match && (l.country || '').toLowerCase() === this.countryName.toLowerCase();
      }
      return match;
    });
  }

  saveEvent() {
    if (!this.newEvent.homeTeam || !this.newEvent.awayTeam) return alert('Ambos equipos son obligatorios.');
    if (!this.newEvent.eventDate) return alert('La fecha es obligatoria.');
    if (!this.leagueName) return alert('La liga es obligatoria.');

    let league = this.leagues.find(l => l.name.toLowerCase() === this.leagueName.trim().toLowerCase());
    if (!league) {
      league = { 
        name: this.leagueName.trim(),
        country: this.countryName ? this.countryName.trim() : null,
        sport: { name: this.sportName.trim() } as Sport
      } as League;
    } else {
      // If the user selected an existing league but the country was updated or provided
      if (this.countryName && (!league.country || league.country.toLowerCase() !== this.countryName.toLowerCase())) {
        league.country = this.countryName.trim();
      }
    }

    const payload = { ...this.newEvent, league };
    if (payload.eventDate && !payload.eventDate.includes('T')) {
      payload.eventDate = `${payload.eventDate}T00:00:00`;
    }

    this.calendarService.createEvent(payload as SportEvent).subscribe({
      next: (res) => {
        this.saved.emit(res);
        this.close.emit();
      },
      error: (err) => alert('Error al guardar: ' + err.message)
    });
  }
}
