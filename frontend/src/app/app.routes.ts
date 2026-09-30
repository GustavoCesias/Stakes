import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TicketManagerComponent } from './components/ticket-manager/ticket-manager.component';
import { TipPoolComponent } from './components/tip-pool/tip-pool.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { LayoutComponent } from './components/layout/layout.component';
import { ConfigComponent } from './components/config/config.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    {
        path: '',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: DashboardComponent },
            { path: 'calendar', component: CalendarComponent },
            { path: 'config', component: ConfigComponent },
            { path: 'tickets/mine', component: TicketManagerComponent },
            { path: 'tickets/channel/:id', component: TicketManagerComponent },
            { path: 'pool', component: TipPoolComponent },
            { path: 'admin', component: AdminPanelComponent },
            { path: 'tickets', redirectTo: 'tickets/mine', pathMatch: 'full' }
        ]
    },
    { path: '**', redirectTo: 'dashboard' }
];
