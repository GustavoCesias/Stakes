import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChannelService, Channel } from '../../services/channel.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule, FormsModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {
  channels: Channel[] = [];
  private channelService = inject(ChannelService);
  authService = inject(AuthService);
  router = inject(Router);

  showNewChannelModal = false;
  newChannel: Channel = { name: '', type: 'GENERAL' };

  private avatarColors = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#10b981,#0d9488)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#3b82f6,#06b6d4)',
    'linear-gradient(135deg,#ec4899,#f43f5e)',
    'linear-gradient(135deg,#14b8a6,#22c55e)',
  ];

  get userName(): string {
    return this.authService.getUserName();
  }

  logout() {
    this.authService.logout();
  }

  exportBackup() {
    this.authService.exportBackup().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stakes_backup_${new Date().toISOString().substring(0, 10)}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => alert('Error exportando respaldo de datos: ' + (err.error?.message || err.message))
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const json = JSON.parse(e.target.result);
          this.authService.importBackup(json).subscribe({
            next: (res) => {
              alert('Respaldo cargado correctamente con éxito.');
              window.location.reload();
            },
            error: (err) => alert('Error importando respaldo: ' + (err.error?.message || err.message))
          });
        } catch (ex: any) {
          alert('El archivo no es un JSON válido.');
        }
      };
      reader.readAsText(file);
    }
  }

  getChannelInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  getChannelColor(id: number | undefined): string {
    const idx = (id ?? 0) % this.avatarColors.length;
    return this.avatarColors[idx];
  }

  get currentPageLabel(): string {
    const url = this.router.url;
    if (url.includes('/dashboard')) return 'Dashboard';
    if (url.includes('/pool')) return 'Base Maestra';
    if (url.includes('/tickets/mine')) return 'Mis Tickets';
    if (url.includes('/tickets/channel')) return 'Canal';
    return 'Stakes';
  }

  ngOnInit() {
    this.loadChannels();
  }

  loadChannels() {
    this.channelService.getChannels().subscribe({
      next: (data) => this.channels = data,
      error: (err) => console.error('Error cargando canales en sidebar', err)
    });
  }

  openNewChannelModal() {
    this.newChannel = { name: '', type: 'GENERAL' };
    this.showNewChannelModal = true;
  }

  closeNewChannelModal() {
    this.showNewChannelModal = false;
  }

  saveNewChannel() {
    if (this.newChannel.name.trim() === '') return;
    this.channelService.createChannel(this.newChannel).subscribe({
      next: (saved) => {
        this.channels.push(saved);
        this.closeNewChannelModal();
      },
      error: (err) => console.error('Error creando canal', err)
    });
  }

  deleteChannel(channel: Channel, event?: MouseEvent) {
    if (event) event.stopPropagation();
    if (!channel.id) return;

    if (confirm(`¿Estás seguro de que deseas eliminar el canal "${channel.name}"?`)) {
      this.channelService.deleteChannel(channel.id).subscribe({
        next: () => {
          this.channels = this.channels.filter(c => c.id !== channel.id);
          if (this.router.url.includes(`/tickets/channel/${channel.id}`)) {
            this.router.navigate(['/tickets/mine']);
          }
        },
        error: (err) => alert('Error eliminando canal: ' + (err.error?.message || err.message))
      });
    }
  }
}
