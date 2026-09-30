import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html'
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
