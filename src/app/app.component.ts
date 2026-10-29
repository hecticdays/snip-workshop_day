import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { LinkService, ShortLink } from './link.service';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './snip.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  readonly links = signal<ShortLink[]>([]);
  readonly url = signal('');
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly createdLink = signal<ShortLink | null>(null);

  private readonly linkService = inject(LinkService);

  ngOnInit(): void {
    this.linkService.listLinks().subscribe({
      next: (links) => this.links.set(links),
      error: (error: unknown) => {
        this.error.set(this.describeError(error));
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  updateUrl(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.url.set(input.value);
      this.error.set('');
    }
  }

  createLink(): void {
    const value = this.url().trim();
    let destination: URL;

    try {
      destination = new URL(value);
    } catch {
      this.error.set('Enter a valid HTTP or HTTPS URL.');
      return;
    }

    if (destination.protocol !== 'http:' && destination.protocol !== 'https:') {
      this.error.set('Enter a valid HTTP or HTTPS URL.');
      return;
    }

    this.error.set('');
    this.createdLink.set(null);
    this.submitting.set(true);
    this.linkService.createLink(destination.href).subscribe({
      next: (link) => {
        this.createdLink.set(link);
        this.links.update((current) => [link, ...current.filter((item) => item.code !== link.code)]);
        this.url.set('');
        this.submitting.set(false);
      },
      error: (error: unknown) => {
        this.error.set(this.describeError(error));
        this.submitting.set(false);
      },
    });
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detail = error.error?.error;
      if (typeof detail === 'string' && detail.trim()) return detail;
      if (error.status === 0) {
        return 'Cannot reach the API at localhost:3000. Start the backend and try again.';
      }
      return `The API request failed (${error.status}). Please try again.`;
    }

    return 'Something went wrong. Please try again.';
  }
}
