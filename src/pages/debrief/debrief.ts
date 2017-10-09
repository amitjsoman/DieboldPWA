import {
  NavController,
  AlertController,
  LoadingController,
  Loading,
  IonicPage,
  NavParams
} from 'ionic-angular';
import {
  Component
} from '@angular/core';
import {
  Http,
  Headers,
  RequestOptions
} from '@angular/http';
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/toPromise';
import pouchdb from 'pouchdb';

import {
  Observable,
  Subscription
} from 'rxjs';
import {
  Events
} from 'ionic-angular';
import {
  LibProvider
} from '../../providers/lib/lib';

/**
 * Generated class for the DebriefPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-debrief',
  templateUrl: 'debrief.html',
})

export class DebriefPage {
  shownGroup = null;
  itemExpandHeight = 'auto';
  activityid: "";
  tt=[];
  et=[];
  shell = [
    { "section": "sr", "name": "Equipment & Device", "expanded": false, "arrow": "add" },
    { "section": "tt", "name": "Time Tracker", "expanded": false, "arrow": "add" },
    { "section": "et", "name": "Expense Tracker", "expanded": false, "arrow": "add" },
    { "section": "pt", "name": "Part Tracker", "expanded": false, "arrow": "add" }
  ]
  constructor(public navCtrl: NavController, public navParams: NavParams, public lib: LibProvider) {
    console.log(navParams.data);
    this.activityid = navParams.data;
    this.fetchdata(this.activityid);
  }
  toggleGroup(group) {
    if (this.isGroupShown(group)) {
      this.shownGroup = null;
    } else {
      this.shownGroup = group;
    }
  };
  expandItem(item) {
    this.shell.map((listItem) => {
      if (item == listItem) {
        listItem.expanded = !listItem.expanded;
        if (listItem.expanded === true) {
          this.fetchserverdata(listItem.section)          
        }
      } else {
        listItem.expanded = false;
      }
      if (listItem.expanded)
        listItem.arrow = 'remove';
      else {
        listItem.arrow = 'add'
      }
      return listItem;
    });
  }
  isGroupShown(group) {
    return this.shownGroup === group;
  };
  ionViewDidLoad() {
    console.log('ionViewDidLoad DebriefPage');
  }
  public generateshell() {

  }
  public fetchserverdata(section) {
    this.lib.showLoading();
    this.lib.ondemandsblfetch(section, "[Activity Id]=\"" + this.activityid + "\"")
      .then((dat) => {
        console.log(dat);        
      })
      .catch((err) => {
        console.error(err);
        if (err.error === "ERROR") {
          this.lib.showError("Invalid Session Id, attempting relogin");
          this.lib.relogin();
        } else if (err.type = "ERROR") {
          this.lib.showError(err.errcode + ":::" + err.errmsg)
        }
        else {
          this.lib.showError("Network Issue Check Connection")
        }
      })

  }
  public fetchdata(activityid){
    //fetch time tracker records from database and store it in tt array
    let temp=this;
    this.lib.localdb.query('changes_since/tt', {
      key: this.activityid,
      include_docs: true
    })
    .then((data)=>{
        console.log(data);
        data.rows.map(function(item){
          temp.tt.push(item.doc)
        })
    })
  }
  public tapEvent(event){
    console.log(event)
  }
}
