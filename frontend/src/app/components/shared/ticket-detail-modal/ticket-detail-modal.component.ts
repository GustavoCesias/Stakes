import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Ticket } from '../../../services/ticket.service';

@Component({
  selector: 'app-ticket-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-detail-modal.component.html',
  styleUrl: './ticket-detail-modal.component.css'
})
export class TicketDetailModalComponent {
  @Input() ticket: Ticket | null = null;
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }

  getSelectionResult(sel: any): string {
    if (!sel) return 'PENDIENTE';
    if (sel.result && sel.result !== 'PENDIENTE') return sel.result;
    if (sel.tip?.result && sel.tip.result !== 'PENDIENTE') return sel.tip.result;
    return 'PENDIENTE';
  }

  getSelectionChannelName(sel: any): string {
    return sel?.tip?.channel?.name || 'Personal';
  }

  getPotentialWinnings(): string {
    if (!this.ticket) return '0.00';
    const stake = this.ticket.stake || 0;
    const odds = this.ticket.totalOdds || 0;
    return (stake * odds).toFixed(2);
  }

  getRegularSelections(): any[] {
    if (!this.ticket || !this.ticket.selections) return [];
    if (!this.ticket.betBuilders || this.ticket.betBuilders.length === 0) return this.ticket.selections;

    const bbSelectionIds = new Set<number>();
    const bbTipIds = new Set<number>();

    this.ticket.betBuilders.forEach(bb => {
      bb.selections?.forEach(sel => {
        if (sel.id) bbSelectionIds.add(sel.id);
        if (sel.tip?.id) bbTipIds.add(sel.tip.id);
      });
    });

    return this.ticket.selections.filter(sel => {
      if (sel.id && bbSelectionIds.has(sel.id)) return false;
      if (sel.tip?.id && bbTipIds.has(sel.tip.id)) return false;
      return true;
    });
  }
}
