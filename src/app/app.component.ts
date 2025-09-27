import { Component } from '@angular/core';
import { AddressComponent } from './address/address.component';
import { BackwardComponent } from './backward/backward.component';
import { DebugComponent } from './debug/debug.component';
import { ForwardComponent } from './forward/forward.component';
import { RefreshComponent } from './refresh/refresh.component';
import { HomebuttonComponent } from './homebutton/homebutton.component';
import {MatToolbarModule} from '@angular/material/toolbar';

@Component({
    selector: 'app-root',
    imports: [MatToolbarModule, AddressComponent, BackwardComponent, DebugComponent, ForwardComponent, RefreshComponent, HomebuttonComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'browser-template';
}
