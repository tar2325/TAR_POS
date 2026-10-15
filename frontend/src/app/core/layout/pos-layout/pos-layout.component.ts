import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-pos-layout',
  imports: [RouterOutlet],
  template: '<div class="pos-layout"><router-outlet /></div>',
  styles: `.pos-layout { height: 100vh; height: 100dvh; overflow: hidden; }`,
})
export class PosLayoutComponent {}
