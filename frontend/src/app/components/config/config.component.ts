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
  newMarket: Partial<MarketConfig> = { inputType: 'NUMERIC', options: [] };
  newMarketOption: string = '';

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
    this.configService.createSport(this.newSport as Sport).subscribe(() => {
      this.newSport = {};
      this.loadData();
    });
  }

  deleteSport(id: number) {
    if(confirm('¿Eliminar deporte?')) {
      this.configService.deleteSport(id).subscribe(() => this.loadData());
    }
  }

  // --- Leagues ---
  addLeague() {
    if (!this.newLeague.name || !this.newLeague.sport) return;
    this.configService.createLeague(this.newLeague as League).subscribe(() => {
      this.newLeague = {};
      this.loadData();
    });
  }

  deleteLeague(id: number) {
    if(confirm('¿Eliminar liga?')) {
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
    this.configService.createMarket(this.newMarket as MarketConfig).subscribe(() => {
      this.newMarket = { inputType: 'NUMERIC', options: [] };
      this.loadData();
    });
  }

  deleteMarket(id: number) {
    if(confirm('¿Eliminar mercado?')) {
      this.configService.deleteMarket(id).subscribe(() => this.loadData());
    }
  }
}
