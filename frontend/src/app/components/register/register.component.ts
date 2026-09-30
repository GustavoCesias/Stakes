import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-stakes-darkest text-white flex items-center justify-center p-4">
      <div class="bg-stakes-dark w-full max-w-md p-8 rounded-xl shadow-2xl border border-stakes-gray border-opacity-20 relative overflow-hidden">
        <!-- Decoración -->
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-stakes-accent rounded-full blur-3xl opacity-20"></div>
        <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
        
        <div class="relative z-10">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold font-heading mb-2">Stakes<span class="text-stakes-accent">Manager</span></h1>
            <p class="text-stakes-light opacity-70">Crea tu cuenta para empezar</p>
          </div>

          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-5">
            <div>
              <label class="block text-sm font-medium mb-1 opacity-80">Nombre Completo</label>
              <input type="text" formControlName="name" class="w-full bg-stakes-darker border border-stakes-gray border-opacity-30 rounded-lg px-4 py-3 focus:outline-none focus:border-stakes-accent transition-colors" placeholder="Tu nombre" />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1 opacity-80">Usuario</label>
              <input type="text" formControlName="username" class="w-full bg-stakes-darker border border-stakes-gray border-opacity-30 rounded-lg px-4 py-3 focus:outline-none focus:border-stakes-accent transition-colors" placeholder="Tu nombre de usuario" />
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-1 opacity-80">Contraseña</label>
              <input type="password" formControlName="password" class="w-full bg-stakes-darker border border-stakes-gray border-opacity-30 rounded-lg px-4 py-3 focus:outline-none focus:border-stakes-accent transition-colors" placeholder="••••••••" />
            </div>

            <div *ngIf="error" class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
              {{ error }}
            </div>

            <div *ngIf="successMsg" class="bg-green-500 bg-opacity-10 border border-green-500 text-green-400 px-4 py-3 rounded-lg text-sm">
              {{ successMsg }}
            </div>

            <button type="submit" [disabled]="registerForm.invalid || loading" 
                    class="w-full bg-stakes-accent hover:bg-stakes-accent-hover text-stakes-darker font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2">
              <span *ngIf="loading" class="w-5 h-5 border-2 border-stakes-darker border-t-transparent rounded-full animate-spin"></span>
              {{ loading ? 'Registrando...' : 'Crear Cuenta' }}
            </button>
          </form>

          <div class="mt-6 text-center">
            <a routerLink="/login" class="text-stakes-accent hover:underline text-sm opacity-80 hover:opacity-100 transition-opacity">¿Ya tienes cuenta? Iniciar Sesión</a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm: FormGroup;
  loading = false;
  error = '';
  successMsg = '';

  constructor() {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.loading = true;
    this.error = '';
    this.successMsg = '';

    const { username, password, name } = this.registerForm.value;

    this.authService.register(username, password, name).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMsg = res.message || 'Cuenta creada exitosamente.';
        this.registerForm.reset();
        // Opcional: Redirigir al login después de unos segundos
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Error al registrar usuario';
      }
    });
  }
}
