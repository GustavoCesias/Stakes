import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipPoolComponent } from './tip-pool.component';

describe('TipPoolComponent', () => {
  let component: TipPoolComponent;
  let fixture: ComponentFixture<TipPoolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipPoolComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TipPoolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
