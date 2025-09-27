import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomebuttonComponent } from './homebutton.component';

describe('HomebuttonComponent', () => {
  let component: HomebuttonComponent;
  let fixture: ComponentFixture<HomebuttonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomebuttonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomebuttonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
