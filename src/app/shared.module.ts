import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {ExpandableComponent} from '../components/expandable/expandable';

@NgModule({
  imports: [IonicPageModule.forChild(ExpandableComponent)],
  declarations: [ExpandableComponent],
  exports: [ExpandableComponent]
}) export class SharedModule {}