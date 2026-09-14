import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigService, Sport, League, MarketConfig } from '../../services/config.service';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './config.component.html',
  styleUrl: './config.component.css'
})
export class ConfigComponent implements OnInit {
  activeTab: 'markets' | 'leagues' | 'sports' = 'markets';

  configService = inject(ConfigService);

  sports: Sport[] = [];
  leagues: League[] = [];
  markets: MarketConfig[] = [];

  // Form states
  newSport: Partial<Sport> = {};
  newLeague: Partial<League> = {};
  newMarket: Partial<MarketConfig> = { inputType: 'OPTIONS', options: [] };
  newMarketOption: string = '';

  // UI feedback
  savingMarket = false;
  savingSport = false;
  savingLeague = false;
  errorMsg: string | null = null;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.configService.getSports().subscribe(data => this.sports = data);
    this.configService.getLeagues().subscribe(data => this.leagues = data);
    this.configService.getMarkets().subscribe(data => this.markets = data);
  }

  // --- Sports ---
  addSport() {
    if (!this.newSport.name) return;
    this.savingSport = true;
    this.configService.createSport(this.newSport as Sport).subscribe({
      next: () => {
        this.newSport = {};
        this.savingSport = false;
        this.loadData();
      },
      error: (err) => {
        this.savingSport = false;
        this.errorMsg = err?.error?.message || 'Error al guardar el deporte. ¿Ya existe ese nombre?';
        setTimeout(() => this.errorMsg = null, 4000);
      }
    });
  }

  deleteSport(id: number) {
    if (confirm('¿Eliminar deporte?')) {
      this.configService.deleteSport(id).subscribe(() => this.loadData());
    }
  }

  // --- Leagues ---
  addLeague() {
    if (!this.newLeague.name || !this.newLeague.sport) return;
    this.savingLeague = true;
    this.configService.createLeague(this.newLeague as League).subscribe({
      next: () => {
        this.newLeague = {};
        this.savingLeague = false;
        this.loadData();
      },
      error: (err) => {
        this.savingLeague = false;
        this.errorMsg = err?.error?.message || 'Error al guardar la liga.';
        setTimeout(() => this.errorMsg = null, 4000);
      }
    });
  }

  deleteLeague(id: number) {
    if (confirm('¿Eliminar liga?')) {
      this.configService.deleteLeague(id).subscribe(() => this.loadData());
    }
  }

  // --- Markets ---
  addMarketOption() {
    if (this.newMarketOption.trim()) {
      if (!this.newMarket.options) this.newMarket.options = [];
      this.newMarket.options.push(this.newMarketOption.trim());
      this.newMarketOption = '';
    }
  }

  removeMarketOption(index: number) {
    this.newMarket.options?.splice(index, 1);
  }

  addMarket() {
    if (!this.newMarket.name || !this.newMarket.inputType) return;
    this.savingMarket = true;
    this.errorMsg = null;

    // Si es OPTIONS necesita al menos una opción
    if (this.newMarket.inputType === 'OPTIONS' && (!this.newMarket.options || this.newMarket.options.length === 0)) {
      this.errorMsg = 'Debes añadir al menos una selección para el tipo "Opciones".';
      this.savingMarket = false;
      setTimeout(() => this.errorMsg = null, 4000);
      return;
    }

    this.configService.createMarket(this.newMarket as MarketConfig).subscribe({
      next: () => {
        this.newMarket = { inputType: 'OPTIONS', options: [] };
        this.newMarketOption = '';
        this.savingMarket = false;
        this.loadData();
      },
      error: (err) => {
        this.savingMarket = false;
        const msg = err?.error?.message || '';
        if (msg.toLowerCase().includes('unique') || err?.status === 409 || err?.status === 500) {
          this.errorMsg = `Ya existe un mercado con el nombre "${this.newMarket.name}". Usa un nombre diferente.`;
        } else {
          this.errorMsg = 'Error al guardar el mercado. Intenta de nuevo.';
        }
        setTimeout(() => this.errorMsg = null, 5000);
      }
    });
  }

  deleteMarket(id: number) {
    if (confirm('¿Eliminar mercado?')) {
      this.configService.deleteMarket(id).subscribe(() => this.loadData());
    }
  }
}
