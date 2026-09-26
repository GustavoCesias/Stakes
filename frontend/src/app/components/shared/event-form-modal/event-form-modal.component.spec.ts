import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventFormModalComponent } from './event-form-modal.component';

describe('EventFormModalComponent', () => {
  let component: EventFormModalComponent;
  let fixture: ComponentFixture<EventFormModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventFormModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
