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
    eventDate: new Date().toISOString().substring(0, 10),
    homeTeam: '',
    awayTeam: ''
  };

  sportName: string = '';
  leagueName: string = '';

  sports: Sport[] = [];
  leagues: League[] = [];
  filteredLeagues: League[] = [];

  ngOnInit() {
    this.configService.getSports().subscribe(data => this.sports = data);
    this.configService.getLeagues().subscribe(data => {
      this.leagues = data;
      this.filteredLeagues = data;
    });
  }

  onSportChange() {
    if (this.sportName) {
      const sportLower = this.sportName.toLowerCase();
      this.filteredLeagues = this.leagues.filter(l => l.sport?.name?.toLowerCase() === sportLower);
    } else {
      this.filteredLeagues = this.leagues;
    }
  }

  saveEvent() {
    if (!this.newEvent.homeTeam || !this.newEvent.awayTeam) return alert('Ambos equipos son obligatorios.');
    if (!this.newEvent.eventDate) return alert('La fecha es obligatoria.');
    if (!this.leagueName) return alert('La liga es obligatoria.');

    const league = this.leagues.find(l => l.name === this.leagueName);
    if (!league) return alert('Liga inválida.');

    this.newEvent.league = league;

    this.calendarService.createEvent(this.newEvent as SportEvent).subscribe({
      next: (res) => {
        this.saved.emit(res);
        this.close.emit();
      },
      error: (err) => alert('Error al guardar: ' + err.message)
    });
  }
}
