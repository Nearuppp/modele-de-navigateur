import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BrowserService {

  url = 'https://amiens.unilasalle.fr';
  canGoBack = false;
  canGoForward = false;

// @ts-ignore
  electronAPI = window.electronAPI;

  constructor() {
    this.setupNavigationListener();
  }

  private setupNavigationListener() {
    // Listen for navigation events to automatically update the URL
    this.electronAPI.onNavigationStarted((event: any, url: string) => {
      console.log('Navigation started to:', url);
      this.url = url;
      // Also update navigation buttons state
      this.updateNavigationButtons();
    });
  }

  private updateNavigationButtons() {
    this.electronAPI.canGoBack()
      .then((canGoBack: boolean) => this.canGoBack = canGoBack);

    this.electronAPI.canGoForward()
      .then((canGoForward: boolean) => this.canGoForward = canGoForward);
  }

  toogleDevTool() {
    this.electronAPI.toogleDevTool();
  }

  goBack() {
    this.electronAPI.goBack();
    // URL will be updated automatically by navigation event
  }

  goForward() {
    this.electronAPI.goForward();
    // URL will be updated automatically by navigation event
  }

  refresh() {
    this.electronAPI.refresh();
    // URL will be updated automatically by navigation event
  }

  goToPage(url: string) {
    this.electronAPI.goToPage(url);
    // URL will be updated automatically by navigation event
  }

  setToCurrentUrl() {
    this.electronAPI.currentUrl()
      .then((url :string) => {
        this.url = url;
      });
  }

  updateHistory() {
    this.setToCurrentUrl();

    this.electronAPI.canGoBack()
      .then((canGoBack : boolean) => this.canGoBack = canGoBack);

    this.electronAPI.canGoForward()
      .then((canGoForward : boolean) => this.canGoForward = canGoForward);
  }
}
