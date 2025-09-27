import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BrowserService } from '../browser.service';

@Component({
  selector: 'app-homebutton',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './homebutton.component.html',
  styleUrl: './homebutton.component.css'
})
export class HomebuttonComponent {
  title = 'mon-nouveau-projet';

  constructor(private browserService: BrowserService) {}

  goHome() {
    this.browserService.goToPage('https://amiens.unilasalle.fr');
  }
}