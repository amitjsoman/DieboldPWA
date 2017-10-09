import { NavController, AlertController, LoadingController, Loading, IonicPage, NavParams } from 'ionic-angular';
import { Component } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/toPromise';
import pouchdb from 'pouchdb';
import { ActivityService } from './activity.service';
import { Observable, Subscription } from 'rxjs';
import { Events } from 'ionic-angular';
import { LibProvider } from '../../providers/lib/lib';

@IonicPage()
@Component({
  selector: 'page-activity',
  templateUrl: 'activity.html',
  providers: [ActivityService]
})
export class ActivityPage {
  acts: any;
  ticks = 0;
  public timer;
  public sub: Subscription;
  eta: any = new Date().toISOString();
  shownGroup = null;
  itemExpandHeight = 'auto';

  toggleGroup(group) {
    if (this.isGroupShown(group)) {
      this.shownGroup = null;
    } else {
      this.shownGroup = group;
    }
  };
  isGroupShown(group) {
    return this.shownGroup === group;
  };

  gotodebrief(element) {
    console.log(element)
    this.navCtrl.push("DebriefPage", element)
  }

  expandItem(item) {

    this.acts.map((listItem) => {

      if (item == listItem) {
        listItem.expanded = !listItem.expanded;
      } else {
        listItem.expanded = false;
      }
      if (listItem.expanded)
        listItem.arrow = 'ios-arrow-up';
      else {
        listItem.arrow = 'ios-arrow-down';
        listItem.details = ""
      }


      return listItem;

    });

  }
  collapsesegment(item) {

    /*this.acts.map((listItem) => {

      if (item == listItem) {
        listItem.expanded = !listItem.expanded;
      } else {
        listItem.expanded = false;
      }
      if (listItem.expanded)
        listItem.arrow = 'ios-arrow-up';
      else {
        listItem.arrow = 'ios-arrow-down';
        listItem.details = ""
      }


      return listItem;

    });*/
    if (item.details !== "")
      item.details = ""

  }

  constructor(public navCtrl: NavController, public activityService: ActivityService, public event: Events, public lib: LibProvider) {
    this.refreshActs();
    this.event.subscribe('DBUPDATED', () => {
      console.log("Received Message");
      this.refreshActs();
    });
  }
  ngOnInit() {
    // this.timer = Observable.timer(3000,300000);
    //this.sub = this.timer.subscribe(t=> this.tickFunction(t));

  }
  ngOnDestroy() {
    console.log("Timer Gonna destroy.. destroying...");
    this.activityService.subscription.unsubscribe();
    console.log("timer destroyed");
  }

  public dorefresh(refresher) {
    this.refreshActs().then(() => {
      refresher.complete();
    })
  }
  public refreshActs(): Promise<any> {
    let temp = this;
    let acts = []
    return this.lib.fetchdocs("action")
      .then((value) => {
        temp.acts = value;
        temp.acts = temp.acts.rows;
        temp.acts.map(function (item) {
          if (item.doc['ETA'] == null || item.doc['ETA'] == "") {
            item.doc['ETA'] = (new Date()).toISOString();
            //item.doc['ETA'] = item.doc['ETA'].substring(0,item.doc['ETA'].length-1);
          }
          else {
            item.doc['ETA'] = (new Date(item.doc['ETA'])).toISOString();
            //item.doc['ETA'] = item.doc['ETA'].substring(0,(item.doc['ETA']).length-1);
          }
          if (item.doc['FINISH'] == null || item.doc['FINISH'] == "") {
            item.doc['FINISH'] = (new Date()).toISOString();
            //item.doc['ETA'] = item.doc['ETA'].substring(0,item.doc['ETA'].length-1);
          }
          else {
            item.doc['FINISH'] = (new Date(item.doc['FINISH'])).toISOString();
            //item.doc['ETA'] = item.doc['ETA'].substring(0,(item.doc['ETA']).length-1);
          }
          item.doc["expanded"] = false;
          item.doc["arrow"] = "ios-arrow-down";
          item.doc["details"] = "";
          acts.push(item.doc)
        })
        temp.acts = acts;
        console.log(temp.acts);
        return ("ok")
      })
  }
}
