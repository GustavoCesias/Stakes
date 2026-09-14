import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarService, SportEvent } from '../../services/calendar.service';
import { ConfigService, League, Sport } from '../../services/config.service';

interface LeagueGroup {
  leagueName: string;
  icon: string;
  events: SportEvent[];
}

interface DayGroup {
  dateStr: string;
  displayDate: string;
  leagues: LeagueGroup[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnInit {
  calendarService = inject(CalendarService);
  configService = inject(ConfigService);

  events: SportEvent[] = [];
  groupedEvents: DayGroup[] = [];
  leagues: League[] = [];
  sports: Sport[] = [];

  // Filter state
  selectedLeagueId: number | undefined;
  weekStart: string;
  weekEnd: string;

  // Form state
  showAddModal = false;
  newEvent: Partial<SportEvent> = {};
  selectedSportId: number | undefined;
  filteredLeagues: League[] = [];

  constructor() {
    // Default to current week
    const now = new Date();
    const day = now.getDay() || 7; // 1-7 (Mon-Sun)
    const mon = new Date(now);
    mon.setDate(now.getDate() - day + 1);
    mon.setHours(0,0,0,0);
    
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23,59,59,999);

    this.weekStart = mon.toISOString();
    this.weekEnd = sun.toISOString();
  }

  ngOnInit() {
    this.loadData();
    this.configService.getSports().subscribe(s => this.sports = s);
    this.configService.getLeagues().subscribe(l => this.leagues = l);
  }

  loadData() {
    this.calendarService.getEvents(this.weekStart, this.weekEnd, this.selectedLeagueId).subscribe(data => {
      this.events = data;
      this.groupEvents();
    });
  }

  groupEvents() {
    // 1. Group by day (YYYY-MM-DD)
    const byDay = new Map<string, SportEvent[]>();
    for (const e of this.events) {
       const day = e.eventDate.substring(0, 10);
       if (!byDay.has(day)) byDay.set(day, []);
       byDay.get(day)!.push(e);
    }
    
    // 2. For each day, group by league
    this.groupedEvents = Array.from(byDay.entries()).map(([dateStr, dayEvents]) => {
        // Build a display date
        const d = new Date(dateStr + 'T12:00:00'); // avoid timezone shifts
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const displayDate = `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
        
        const byLeague = new Map<string, { icon: string, events: SportEvent[] }>();
        for (const e of dayEvents) {
            const lName = e.league?.name || 'Desconocida';
            const icon = e.league?.sport?.icon || '⚽';
            
            if (!byLeague.has(lName)) byLeague.set(lName, { icon, events: [] });
            byLeague.get(lName)!.events.push(e);
        }
        
        const leagues = Array.from(byLeague.entries()).map(([leagueName, data]) => ({
            leagueName,
            icon: data.icon,
            events: data.events
        })).sort((a,b) => a.leagueName.localeCompare(b.leagueName));
        
        return { dateStr, displayDate, leagues };
    }).sort((a,b) => a.dateStr.localeCompare(b.dateStr));
  }

  changeWeek(offset: number) {
    const dStart = new Date(this.weekStart);
    dStart.setDate(dStart.getDate() + (offset * 7));
    this.weekStart = dStart.toISOString();

    const dEnd = new Date(this.weekEnd);
    dEnd.setDate(dEnd.getDate() + (offset * 7));
    this.weekEnd = dEnd.toISOString();

    this.loadData();
  }

  onSportChange() {
    this.filteredLeagues = this.leagues.filter(l => l.sport.id === this.selectedSportId);
    this.newEvent.league = undefined;
  }

  openAddModal() {
    this.newEvent = {
      eventDate: new Date().toISOString().substring(0, 16)
    };
    this.selectedSportId = undefined;
    this.filteredLeagues = [];
    this.showAddModal = true;
  }

  saveEvent() {
    if (!this.newEvent.homeTeam || !this.newEvent.awayTeam || !this.newEvent.league || !this.newEvent.eventDate) return;
    
    this.calendarService.createEvent(this.newEvent as SportEvent).subscribe(() => {
      this.showAddModal = false;
      this.loadData();
    });
  }

  deleteEvent(id: number) {
    if (confirm('¿Eliminar partido del calendario?')) {
      this.calendarService.deleteEvent(id).subscribe(() => this.loadData());
    }
  }

  formatDate(isoString: string): string {
    const d = new Date(isoString);
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `${days[d.getDay()]} ${d.getDate()} - ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
}
