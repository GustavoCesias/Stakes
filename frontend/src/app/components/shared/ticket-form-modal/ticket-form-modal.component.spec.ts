import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketFormModalComponent } from './ticket-form-modal.component';

describe('TicketFormModalComponent', () => {
  let component: TicketFormModalComponent;
  let fixture: ComponentFixture<TicketFormModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketFormModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
