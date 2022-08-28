import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, merge, Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { isMobile } from 'src/app/shared/common.utils';
import { LightningApiService } from '../lightning-api.service';

@Component({
  selector: 'app-channels-list',
  templateUrl: './channels-list.component.html',
  styleUrls: ['./channels-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelsListComponent implements OnInit, OnChanges {
  @Input() publicKey: string;
  @Output() channelsStatusChangedEvent = new EventEmitter<string>();
  channels$: Observable<any>;

  // @ts-ignore
  paginationSize: 'sm' | 'lg' = 'md';
  paginationMaxSize = 10;
  itemsPerPage = 10;
  page = 1;
  channelsPage$ = new BehaviorSubject<number>(1);
  channelStatusForm: FormGroup;
  defaultStatus = 'open';
  status = 'open';
  publicKeySize = 25;

  constructor(
    private lightningApiService: LightningApiService,
    private formBuilder: FormBuilder,
  ) { 
    this.channelStatusForm = this.formBuilder.group({
      status: [this.defaultStatus],
    });
    if (isMobile()) {
      this.publicKeySize = 12;
    }
  }

  ngOnInit(): void {
    if (document.body.clientWidth < 670) {
      this.paginationSize = 'sm';
      this.paginationMaxSize = 3;
    }
  }

  ngOnChanges(): void {
    this.channelStatusForm.get('status').setValue(this.defaultStatus, { emitEvent: true });
    this.channelsPage$.next(1);

    this.channels$ = merge(
      this.channelsPage$,
      this.channelStatusForm.get('status').valueChanges,
    )
    .pipe(
      tap((val) => {
        if (typeof val === 'string') {
          this.status = val;
          this.page = 1;
        } else if (typeof val === 'number') {
          this.page = val;
        }
      }),
      switchMap(() => {
          this.channelsStatusChangedEvent.emit(this.status);
          return this.lightningApiService.getChannelsByNodeId$(this.publicKey, (this.page - 1) * this.itemsPerPage, this.status);
      }),
      map((response) => {
        return {
          channels: response.body,
          totalItems: parseInt(response.headers.get('x-total-count'), 10)
        };
      }),
    );
  }

  pageChange(page: number): void {
    this.channelsPage$.next(page);
  }

}