import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, User } from '../../services/admin.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold text-white mb-6">Panel de Administración</h1>

      <div class="bg-stakes-dark rounded-xl shadow-lg border border-stakes-gray border-opacity-20 p-6">
        <h2 class="text-lg font-semibold text-stakes-light mb-4">Usuarios Pendientes de Aprobación</h2>
        
        <div *ngIf="loading" class="text-stakes-light opacity-50 py-4">Cargando...</div>
        
        <div *ngIf="!loading && users.length === 0" class="text-stakes-light opacity-50 py-4">
          No hay usuarios pendientes de aprobación.
        </div>

        <div *ngIf="!loading && users.length > 0" class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-stakes-gray border-opacity-20">
                <th class="p-3 text-sm text-stakes-light opacity-70">Nombre</th>
                <th class="p-3 text-sm text-stakes-light opacity-70">Usuario</th>
                <th class="p-3 text-sm text-stakes-light opacity-70">Fecha Solicitud</th>
                <th class="p-3 text-sm text-stakes-light opacity-70 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users" class="border-b border-stakes-gray border-opacity-10 hover:bg-stakes-darker transition-colors">
                <td class="p-3 text-sm font-medium">{{ user.name }}</td>
                <td class="p-3 text-sm text-stakes-accent">{{ user.username }}</td>
                <td class="p-3 text-sm text-stakes-light opacity-80">{{ user.createdAt | date:'short' }}</td>
                <td class="p-3 text-sm text-right space-x-2">
                  <button (click)="approve(user.id)" class="px-3 py-1 bg-green-500 bg-opacity-20 text-green-400 hover:bg-opacity-30 rounded transition-colors text-xs font-semibold">Aprobar</button>
                  <button (click)="reject(user.id)" class="px-3 py-1 bg-red-500 bg-opacity-20 text-red-400 hover:bg-opacity-30 rounded transition-colors text-xs font-semibold">Rechazar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class AdminPanelComponent implements OnInit {
  private adminService = inject(AdminService);
  
  users: User[] = [];
  loading = true;

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.adminService.getPendingUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading users', err);
        this.loading = false;
      }
    });
  }

  approve(id: number) {
    if (confirm('¿Seguro que deseas aprobar a este usuario?')) {
      this.adminService.approveUser(id).subscribe({
        next: () => this.loadUsers(),
        error: (err) => alert('Error al aprobar usuario')
      });
    }
  }

  reject(id: number) {
    if (confirm('¿Seguro que deseas rechazar y eliminar a este usuario?')) {
      this.adminService.rejectUser(id).subscribe({
        next: () => this.loadUsers(),
        error: (err) => alert('Error al rechazar usuario')
      });
    }
  }
}
