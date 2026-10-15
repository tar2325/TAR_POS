import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { NavItem } from '../../models/nav-item.model';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly sidebarCollapsed = signal(false);
  protected readonly isMobileMenuOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.isMobileMenuOpen.set(false);
      });
  }

  protected readonly cashierName = computed(
    () => this.authService.currentUser()?.displayName ?? 'ผู้ใช้งาน',
  );

  protected readonly navItems = computed<NavItem[]>(() => {
    const user = this.authService.currentUser();
    const all: NavItem[] = [
      { label: 'แดชบอร์ด', icon: 'dashboard', route: '/dashboard' },
      { label: 'ขายหน้าร้าน', icon: 'point_of_sale', route: '/pos' },
      { label: 'สินค้า', icon: 'inventory_2', route: '/products' },
      { label: 'หมวดหมู่', icon: 'category', route: '/categories', roles: ['ADMIN', 'MANAGER'] },
      { label: 'สต็อก', icon: 'warehouse', route: '/inventory', roles: ['ADMIN', 'MANAGER'] },
      { label: 'รายงานการขาย', icon: 'analytics', route: '/reports', roles: ['ADMIN', 'MANAGER'] },
    ];
    if (!user) return all;
    return all.filter((item) => !item.roles || item.roles.includes(user.role));
  });

  toggleSidebar(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.isMobileMenuOpen.update((v) => !v);
    } else {
      this.sidebarCollapsed.update((v) => !v);
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }
}
