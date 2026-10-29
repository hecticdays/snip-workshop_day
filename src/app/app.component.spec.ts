import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { LinkService } from './link.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{
        provide: LinkService,
        useValue: {
          listLinks: () => of([]),
          createLink: () => of({
            code: 'abc123',
            url: 'https://example.com',
            shortUrl: 'http://localhost:3000/abc123',
            hits: 0,
            createdAt: new Date().toISOString(),
          }),
        },
      }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the short-link form', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Short links.');
    expect(compiled.querySelector('input[type="url"]')).toBeTruthy();
  });
});
