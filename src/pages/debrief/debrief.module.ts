import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { DebriefPage } from './debrief';
import { SharedModule } from '../../app/shared.module'

@NgModule({
  declarations: [
    DebriefPage,
  ],
  imports: [
    IonicPageModule.forChild(DebriefPage), SharedModule,
  ],
})
export class DebriefPageModule {}
