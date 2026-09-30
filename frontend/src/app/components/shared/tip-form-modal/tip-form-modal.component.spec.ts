import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipFormModalComponent } from './tip-form-modal.component';

describe('TipFormModalComponent', () => {
  let component: TipFormModalComponent;
  let fixture: ComponentFixture<TipFormModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipFormModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TipFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
