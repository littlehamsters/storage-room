import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', loadComponent: () => import('./pages/home.component').then((m) => m.HomeComponent) },
  { path: 'all', loadComponent: () => import('./pages/all.component').then((m) => m.AllComponent) },
  { path: 'categories', loadComponent: () => import('./pages/categories.component').then((m) => m.CategoriesComponent) },
  { path: 'rooms', loadComponent: () => import('./pages/rooms.component').then((m) => m.RoomsComponent) },
  { path: 'alerts', loadComponent: () => import('./pages/alerts.component').then((m) => m.AlertsComponent) },
  { path: 'settings', loadComponent: () => import('./pages/settings.component').then((m) => m.SettingsComponent) },
  { path: '**', redirectTo: 'home' },
];
