import { NavController, AlertController, LoadingController, Loading, IonicPage } from 'ionic-angular';
import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Logger } from "angular2-logger/core";
import { Observable } from 'rxjs/Rx';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/toPromise';
import 'rxjs/Rx';
import * as moment from 'moment-timezone';
import pouchdb from 'pouchdb';
import { Events } from 'ionic-angular';


/*
  Generated class for the LibProvider provider.

  See https://angular.io/docs/ts/latest/guide/dependency-injection.html
  for more info on providers and Angular DI.
*/
@Injectable()
export class LibProvider {
  loading: Loading;
  timerid;
  starttimer = false;
  viewmode = {};
  getfieldmaster = {};
  setfieldmaster = {};
  bcmasterget = {};
  bcmasterset = {};
  localdb;
  syncdb;
  logmsgcolor = 'color: darkgreen';
  options = {
    limit: 20,
    include_docs: true
  };
  err1 = "The server you are trying to access is either busy or experiencing difficulties. Please close the Web browser, open a new browser window, and try logging in again.".toLowerCase()
  err2 = "Your session timed out because you were idle for too long.  Please log in again to resume.".toLowerCase()
  err3 = "You already have a Siebel session with unsaved data running in another browser window".toLowerCase()
  err4 = '<HTML ><head><title><font color=\'red\'></font></title><script language="javascript"> if( typeof( HandleiOSRefresh ) === \'function\') { HandleiOSRefresh(); } </script>'.toLowerCase()
  err5 = "<HTML ><head><title><font color='red'></font></title></head>".toLowerCase()
  err6 = '<html><body><form action="/servicem_enu/start.swe" method="POST" name="RedirectForHost">'.toLowerCase()
  err7 = '<html><body><form action=\"/servicem_enu/start.swe?SRN='.toLowerCase();
  err8 = '@0`0`3`0``0`URL`/servicem_enu/start.swe?SWECmd=Login&SWECM=S&SRN=`Target`top`Status`NewPage`'.toLowerCase()
  constructor(public http: Http, public mylogger: Logger, public event: Events, private alertCtrl: AlertController, private loadingCtrl: LoadingController) {
    console.log('Hello LibProvider Provider', this.logmsgcolor);
    mylogger.level = 5;
    this.init();
    this.localdb = new pouchdb("offline");
    this.syncdb = new pouchdb("syncdb");
  }

  public getObject(key) {
    return window.localStorage[key];
  }
  public setObject(key, value) {
    window.localStorage[key] = value;
  }

  public custformat(val) {
    if (val < 10) {
      return "0" + val;
    }
    return "" + val;
  }

  public checkCredentials(): boolean {
    if (this.getObject("username") !== undefined && this.getObject("username") !== "" && this.getObject("password") !== undefined && this.getObject("password") !== "" && this.getObject("url") !== undefined && this.getObject("url") !== "") {
      return true;
    } else
      return false;
  }
  /**Login Function */
  public login(username, password, url): Promise<any> {
    let baseurl = url;
    let postdata = "SWECmd=ExecuteLogin&SWEUserName=" + username + "&SWEPassword=" + encodeURIComponent(password);
    let headers = new Headers();
    headers.append('Content-Type', 'application/x-www-form-urlencoded')
    return this.http.post(baseurl, postdata, {
      headers: headers,
      withCredentials: true
    })
      .toPromise()
      .then((loginresponse) => {
        let loginresponsetext = loginresponse.text();
        console.info(loginresponsetext);
        let srn = "" + loginresponsetext.substring(loginresponsetext.indexOf("&SRN=") + 5, loginresponsetext.indexOf("&SWETS"));
        console.info("SRN:" + srn)
        //check srn
        if (srn == '') {
          throw Observable.throw("LOGOFF")
        } else if ((loginresponsetext.toLowerCase().indexOf(this.err6) >= 0)) {
          throw Observable.throw("CHECK CREDENTIALS")
        } else if ((loginresponsetext.toLowerCase().indexOf(this.err7) >= 0)) {
          throw Observable.throw("LOGOFF")
        } else {
          return srn;
          //this.logingotoview(username, password, url, a)
        }

      })
      .then((srn) => {
        let gotoviewurl = url + "?SWECmd=GotoView&SWERPC=1&SWEView=DBD+My+Activity+View+-+Mobile&SWEApplet0=DBD+My+Activity+List+Applet+-+Mobile&SRN=" + srn;
        let temp = this;
        return this.http.get(url, {
          withCredentials: true
        })
          .toPromise()
          .then((gotoviewresponse) => {
            console.log("GotoView Reponse")
            console.log(gotoviewresponse);
            this.setObject("srn", srn);
            this.setObject("username", username);
            this.setObject("password", password);
            this.setObject("url", url);
            this.starttimer = true;
            this.insertproc().then(() => {
              temp.poll();
              return "LOGIN";
            });
          })
      })
      .catch((err) => {
        this.mylogger.error(err);
        if (err.error === "LOGOFF") {
          console.log("now trying to logoff earlier session")
          this.http.get(baseurl + "?SWECmd=Logoff&SWESetMarkup=XML", {
            withCredentials: true
          })
            .toPromise()
            .then((data) => {
              this.setObject("srn", "")
              throw Observable.throw("PLEASE RELOGIN")
            })
        } else {
          throw Observable.throw(err.error)
        }

      })
  }
  /**Poll */
  public poll() {
    let temp = this;
    if (this.checkCredentials()) {
      clearTimeout(temp.timerid);
      if (this.starttimer === true) {
        temp.timerid = setTimeout(function () {
          console.log("Poll Iteration Started")
          if (temp.getObject("synctimestart") === undefined || temp.getObject("synctimestart") === "") {
            temp.settime(false);
          }
          if (temp.getObject("srn") !== "") {
            /**
             * Get Data from Siebel Server
             */
            temp.callsiebelbs("DBD+PWA+Operations", "DBDGenericQueryJSONMobile", temp.get("action", "", temp.viewmode["AllView"]))
              .then((bsresponse) => {
                //insert data
                console.log(bsresponse);
                if (bsresponse !== "LOGIN" && bsresponse !== "{}")
                  return temp.insertlocaldb(bsresponse, "action");
                else
                  return Promise.resolve("NODATA")
              })
              .then((dat) => {
                temp.settime(true);
                console.log("Cycle Completed");
                if (dat.toString() !== "NODATA")
                  temp.event.publish("DBUPDATED")
              })
              .then((dat) => {
                temp.poll();
              })
              .catch((err) => {
                console.error(err);
                //first check for any business errors
                if (err.retobj !== undefined && err.error !== undefined) {
                  if (err.retobj["type"] === "ERROR" || err.error === "DATAISSUE" || err.error === "LOGIN") {
                    temp.poll();
                  }
                }
                //check for network error
                else if(err.status=== 0){
                  temp.poll();
                }
                //if nothing then try relogin maybe invalid session
                else {
                  temp.relogin();
                }
              })
          }

        }, 15000)
      }
    }
  }
  /**Generate SBL Message */
  /**Call Siebel End Point for Operation */
  public callsiebelbs(bsname, bsmethod, args): Promise<any> {
    let currenttime = +new Date();
    let baseurl = window.localStorage["url"];
    let postdata = "SWECmd=InvokeMethod&SWEService=" + bsname + "&SWEMethod=" + encodeURIComponent(bsmethod) + args + "&SWERPC=1&SRN=" + this.getObject("srn") + "&SWETS=" + currenttime;
    //postdata = encodeURIComponent(postdata)
    let headers = new Headers();
    headers.append('Content-Type', 'application/x-www-form-urlencoded')
    return this.http.post(baseurl, postdata, {
      headers: headers,
      withCredentials: true
    })
      .toPromise()
      .then((bsresponse) => {
        let bsresponsetext = bsresponse.text().toLowerCase();
        console.log("CALLBS Response");
        console.log(bsresponsetext);
        if ((bsresponsetext.indexOf(this.err8) >= 0) || (bsresponsetext.indexOf(this.err5) >= 0) || (bsresponsetext.indexOf(this.err4) >= 0) || (bsresponsetext.indexOf(this.err1) >= 0) || (bsresponsetext.indexOf(this.err2) >= 0) || (bsresponsetext.indexOf(this.err3) >= 0)) {
          clearTimeout(this.timerid);
          this.starttimer = false;
          throw Observable.throw("ERROR")
        } else {
          let validbsreponse = bsresponse.text().split("`")
          let i = 0;
          let retobj = {}
          if (bsname === "DBD+PWA+Operations" && bsmethod === "DBDGenericQueryJSONMobile") {
            for (i = 0; i < validbsreponse.length; i++) {
              if (validbsreponse[i].toLowerCase() === "resultset") {
                for (let j = i + 2; j < i + 2 + 6; j = j + 2) {
                  retobj[validbsreponse[j]] = validbsreponse[j + 1];
                }
                break;
              }
            }
          }
          console.log("Obtained following message")
          console.log(retobj)
          if (retobj["errcode"] === "" && retobj["errmsg"] === "") {
            retobj["type"] = "SUCCESS";
            return Promise.resolve((retobj["json"]));
          } else {
            console.error(validbsreponse);
            retobj["type"] = "ERROR";
            return Promise.reject(retobj);
          }
        }
      })
      .catch((err) => {
        console.error(err)
        return Promise.reject(err)
        /*
        if (err.error === "ERROR") {
          console.log("now trying to logoff earlier session")
          return this.http.get(baseurl + "?SWECmd=Logoff&SWESetMarkup=XML", {
            withCredentials: true
          })
            .toPromise()
            .then((data) => {
              this.setObject("srn", "");
              return this.login(this.getObject("username"), this.getObject("password"), this.getObject("url"))
            })
        } else {
          throw (err)
        }*/
      })
  }
  /**relogin */
  public relogin(): Promise<any> {
    let baseurl = window.localStorage["url"];
    let temp = this;
    return this.http.get(baseurl + "?SWECmd=Logoff&SWESetMarkup=XML", {
      withCredentials: true
    })
      .toPromise()
      .then((data) => {
        this.setObject("srn", "");
        return temp.login(temp.getObject("username"), temp.getObject("password"), temp.getObject("url"))
      })
  }
  /**Initialize master data variables */
  public init() {

    this.viewmode["ManagerView"] = "1";
    this.viewmode["SalesRepView"] = "0";
    this.viewmode["PersonalView"] = "2";
    this.viewmode["AllView"] = "3";
    this.viewmode["OrganizationView"] = "5";
    this.viewmode["GroupView"] = "7";
    this.viewmode["CatalogView"] = "8";
    this.viewmode["SubOrganizationView"] = "9";

    this.getfieldmaster["action"] = {};
    this.getfieldmaster["sr"] = {};
    this.getfieldmaster["tt"] = {};
    this.getfieldmaster["et"] = {};
    this.getfieldmaster["nt"] = {};
    this.getfieldmaster["pt"] = {};
    this.getfieldmaster["sol"] = {};
    this.getfieldmaster["aa"] = {};
    //Attachment
    this.getfieldmaster['aa']['Form Name'] = 'DBD Form Name'
    this.getfieldmaster['aa']['ActivityFileName'] = 'ActivityFileName'
    this.getfieldmaster['aa']['Activity Id'] = "Activity Id"
    this.getfieldmaster['aa']['modnum'] = 'Modification Number'
    this.getfieldmaster['aa']['Id'] = 'Id'
    //Solution
    this.getfieldmaster['sol']['Device Type'] = 'DBD Device Type'
    this.getfieldmaster['sol']['Module'] = 'DBD Module'
    this.getfieldmaster['sol']['Solution Code'] = 'DBD Resolution'
    this.getfieldmaster['sol']['Activity Id'] = "DBD Activity Id"
    this.getfieldmaster['sol']['modnum'] = 'Modification Number'
    this.getfieldmaster['sol']['Id'] = 'Id'
    //Part Tracker
    this.getfieldmaster['pt']['Id'] = 'Id'
    this.getfieldmaster['pt']['Asset #'] = "Asset Number"
    this.getfieldmaster['pt']['Part Notes'] = "Comments"
    this.getfieldmaster['pt']['Part Description'] = "DBD Description"
    this.getfieldmaster['pt']['EPP/HD'] = "DBD EPP HD Flag"
    this.getfieldmaster['pt']['DBD FL Part Flag'] = "DBD FL Part Flag"
    this.getfieldmaster['pt']['Orderable'] = "DBD Orderable"
    this.getfieldmaster['pt']['Returnable'] = "DBD Parts Return Flag"
    this.getfieldmaster['pt']['Transaction Type'] = "DBD Transaction Type"
    this.getfieldmaster['pt']['SR Type FL Calc'] = "DBD SR Type FL Calc"
    this.getfieldmaster['pt']['Part #'] = "Part Number"
    this.getfieldmaster['pt']['Product Name'] = "Product Name"
    this.getfieldmaster['pt']['Serial #'] = "Serial Number"
    this.getfieldmaster['pt']['Quantity'] = "Used Quantity"
    this.getfieldmaster['pt']['Activity Id'] = "Activity Id"
    this.getfieldmaster['pt']['modnum'] = 'Modification Number'
    //Notes
    this.getfieldmaster['nt']['Id'] = 'Id'
    this.getfieldmaster['nt']['modnum'] = 'DBD Modification Num'
    this.getfieldmaster['nt']['Source Id'] = 'Source Id'
    this.getfieldmaster['nt']['Created'] = ['DBD Created']
    this.getfieldmaster['nt']['Created By'] = ['Created By Name']
    this.getfieldmaster['nt']['Activity #'] = ['DBD Activity Id']
    this.getfieldmaster['nt']['Created Dt'] = ['Created']
    this.getfieldmaster['nt']['Customer Visible'] = ['DBD Customer Visible Flag']
    this.getfieldmaster['nt']['Facts Sequence #'] = ['DBD Note Sequence']
    this.getfieldmaster['nt']['Job Grade'] = ['DBD Employee Job Grade']
    this.getfieldmaster['nt']['Note'] = ['Instruction']
    this.getfieldmaster['nt']['Type'] = ['Instruction Type']
    this.getfieldmaster['nt']['Service Request #'] = ['DBD Activity SR Number']
    //FS Expense Item	
    this.getfieldmaster['et']['Id'] = 'Id'
    this.getfieldmaster['et']['Total Amount'] = 'Amount'
    this.getfieldmaster['et']['Comments'] = 'Comments'
    this.getfieldmaster['et']['Date'] = 'DBD Date'
    this.getfieldmaster['et']['Qty'] = 'Quantity'
    this.getfieldmaster['et']['Type'] = 'Expense Item Type Name'
    this.getfieldmaster['et']['Activity Id'] = 'Activity Id'
    this.getfieldmaster['et']['modnum'] = 'Modification Number'
    this.getfieldmaster['et']['DBD Service Activity Code'] = 'DBD Service Activity Code'
    //Time Tracker
    this.getfieldmaster['tt']['Id'] = 'Id'
    this.getfieldmaster['tt']['Billing Rate Type'] = 'Billing Rate Type'
    this.getfieldmaster['tt']['Comments'] = 'External Comments'
    this.getfieldmaster['tt']['Elapsed'] = 'Elasped Time in Hours'
    this.getfieldmaster['tt']['Stop'] = 'End Time'
    this.getfieldmaster['tt']['Date'] = 'Item Date'
    this.getfieldmaster['tt']['Type'] = 'Project'
    this.getfieldmaster['tt']['Project Id'] = 'Project Id'
    this.getfieldmaster['tt']['Start'] = 'Start Time'
    this.getfieldmaster['tt']['Activity Id'] = 'Activity Id'
    this.getfieldmaster['tt']['modnum'] = 'Modification Number'
    //Action
    this.getfieldmaster['action']['Id'] = 'Id'
    this.getfieldmaster['action']['Type'] = 'Type'
    this.getfieldmaster['action']['Category'] = 'Category'
    this.getfieldmaster['action']['Status'] = 'Status'
    this.getfieldmaster['action']['DBD Problem Description'] = 'DBD Problem Description'
    this.getfieldmaster['action']['Account Name'] = 'Account Name'
    this.getfieldmaster['action']['DBD Full Address'] = 'DBD Full Address'
    this.getfieldmaster['action']['DBD Tech Team'] = 'DBD Tech Team'
    this.getfieldmaster['action']['Activity #'] = 'Activity UID'
    this.getfieldmaster['action']['Activity Type'] = 'Type'
    this.getfieldmaster['action']['Locked'] = 'DBD Locked Flag'
    this.getfieldmaster['action']['Owner'] = 'Primary Owned By'
    this.getfieldmaster['action']['Effective Date'] = 'DBD Due Date'
    this.getfieldmaster['action']['Equipment'] = 'DBD Equipment Description'
    this.getfieldmaster['action']['Device Type'] = 'DBD Device Type'
    this.getfieldmaster['action']['Site #'] = 'Account Location'
    this.getfieldmaster['action']['Risk Level'] = 'DBD Account Risk'
    this.getfieldmaster['action']['ETA'] = 'DBD CLICK ETA'
    this.getfieldmaster['action']['FINISH'] = 'DBD CLICK Finish'
    this.getfieldmaster['action']['Arrival D/T'] = 'DBD Arrival Date'
    this.getfieldmaster['action']['Debrief Complete D/T'] = 'DBD Completed Date'
    this.getfieldmaster['action']['Service Branch'] = 'DBD Service Branch'
    this.getfieldmaster['action']['ATW Start'] = 'DBD No Sooner Than Date Calc'
    this.getfieldmaster['action']['ATW End'] = 'DBD Due Calc'
    this.getfieldmaster['action']['Early Start'] = 'DBD Early Start'
    this.getfieldmaster['action']['Late Start'] = 'DBD Late Start'
    this.getfieldmaster['action']['Contact Name'] = 'DBD Conatct Name'
    this.getfieldmaster['action']['Contact Phone'] = 'DBD Contact Phone'
    this.getfieldmaster['action']['FACTS Base Call#'] = 'CRMD Integration Id'
    this.getfieldmaster['action']['Urgency Code'] = 'DBD Activity Urgency Code'
    this.getfieldmaster['action']['Priority'] = 'Priority'
    this.getfieldmaster['action']['Sub Type'] = 'Sub Type'
    this.getfieldmaster['action']['Trouble Code'] = 'DBD Trouble'
    this.getfieldmaster['action']['After Hrs/Std Hrs'] = 'DBD Std After Hrs'
    this.getfieldmaster['action']['SR #'] = 'SR Number'
    this.getfieldmaster['action']['Action Req'] = 'Call Type'
    this.getfieldmaster['action']['Review'] = 'DBD Review'
    this.getfieldmaster['action']['Reassign Rsn'] = 'DBD Reassignment Reason'
    this.getfieldmaster['action']['Incomplete Rsn'] = 'DBD Incomplete Reason'
    this.getfieldmaster['action']['Cancel Rsn'] = 'DBD Cancellation Reason'
    this.getfieldmaster['action']['Tech Branch'] = 'DBD Tech Branch'
    this.getfieldmaster['action']['PM Checklist'] = 'DBD PM Checklist Flag'
    this.getfieldmaster['action']['Reqd Tech'] = 'DBD Required Tech'
    this.getfieldmaster['action']['Attack'] = 'Alarm'
    this.getfieldmaster['action']['Created Date'] = 'HLS Created Date'
    this.getfieldmaster['action']['Duration'] = 'DBD PM Activity Duration'
    this.getfieldmaster['action']['Status Byte'] = 'Sample Reference Number'
    this.getfieldmaster['action']['Trans Count'] = 'DNIS'
    this.getfieldmaster['action']['Serial #'] = 'Serial Number'
    this.getfieldmaster['action']['modnum'] = 'Modification Num'
    //SR
    this.getfieldmaster['sr']['Id'] = 'Id'
    this.getfieldmaster['sr']['FACTS Site#'] = 'DBD CCMF Number'
    this.getfieldmaster['sr']['SR Type'] = 'SR Type'
    this.getfieldmaster['sr']['Sub Device'] = 'DBD Sub Device'
    this.getfieldmaster['sr']['Model'] = 'DBD Model'
    this.getfieldmaster['sr']['Problem Desc'] = 'Description'
    this.getfieldmaster['sr']['Party Name'] = 'Account'
    this.getfieldmaster['sr']['Casual Account'] = 'DBD Casual Account Name'
    this.getfieldmaster['sr']['Address Line 1'] = 'Service Street Address'
    this.getfieldmaster['sr']['Address Line 2'] = 'Service Street Address 2'
    this.getfieldmaster['sr']['City'] = 'Service City'
    this.getfieldmaster['sr']['State'] = 'Service State'
    this.getfieldmaster['sr']['Zip Code'] = 'Service Postal Code'
    this.getfieldmaster['sr']['County'] = 'DBD County'
    this.getfieldmaster['sr']['Country'] = 'Service Country'
    this.getfieldmaster['sr']['Branch Override'] = 'DBD Branch Override ID'
    this.getfieldmaster['sr']['Site Address Type'] = 'DBD Address Type'
    this.getfieldmaster['sr']['Contact Date'] = 'DBD Contact Date'
    this.getfieldmaster['sr']['Contact Email'] = 'DBD Contact Email'
    this.getfieldmaster['sr']['Who To See'] = 'DBD Who To See'
    this.getfieldmaster['sr']['Special P/O'] = 'DBD Special PO'
    this.getfieldmaster['sr']['Project Task'] = 'DBD Project Task Num'
    this.getfieldmaster['sr']['Cost Transfer#'] = 'DBD Cost Transfer'
    this.getfieldmaster['sr']['Quoted Amount'] = 'DBD Fixed Billing Amount'
    this.getfieldmaster['sr']['Quoted Expenses'] = 'DBD Quote Expenses'
    this.getfieldmaster['sr']['Quoted Part'] = 'DBD Quote Part'
    this.getfieldmaster['sr']['Quoted Labor'] = 'DBD Quote Labor'
    this.getfieldmaster['sr']['Problem Category'] = 'Sub-Area'
    this.getfieldmaster['sr']['Customer Prod Id'] = 'DBD Customer Product ID'
    this.getfieldmaster['sr']['Customer Problem #'] = 'Customer Ref Number'
    this.getfieldmaster['sr']['Entitlement Desc'] = 'DBD Entitlement Description'
    this.getfieldmaster['sr']['Entitlement Type'] = 'DBD SR Entitlement Type'
    this.getfieldmaster['sr']['Coverage Hours'] = 'DBD Coverage Hours Description'
    this.getfieldmaster['sr']['FCO#'] = 'DBD FCO #'
    this.getfieldmaster['sr']['Sales Order'] = 'DBD Sales Order'
    this.getfieldmaster['sr']['Equipment Description'] = 'Asset Description'
    this.getfieldmaster['sr']['Cost Transfer #'] = 'DBD Cost Transfer'
    this.getfieldmaster['sr']['Device Type'] = 'DBD Device Type'
    this.getfieldmaster['sr']['Entitlement Description'] = 'DBD Entitlement Description'
    this.getfieldmaster['sr']['Quote Expenses'] = 'DBD Quote Expenses'
    this.getfieldmaster['sr']['Quote Labor'] = 'DBD Quote Labor'
    this.getfieldmaster['sr']['Quote Part'] = 'DBD Quote Part'
    this.getfieldmaster['sr']['Read Only Flag'] = 'DBD SR Read Only Calc'
    this.getfieldmaster['sr']['modnum'] = 'Modification Number'

    this.setfieldmaster["action"] = {};
    this.setfieldmaster["sr"] = {};
    this.setfieldmaster["tt"] = {};
    //Time Tracker
    this.setfieldmaster['tt']['Billing Rate Type'] = 'Billing Rate Type'
    this.setfieldmaster['tt']['Comments'] = 'External Comments'
    this.setfieldmaster['tt']['Elapsed'] = 'Elasped Time in Hours'
    this.setfieldmaster['tt']['Stop'] = 'End Time'
    this.setfieldmaster['tt']['Date'] = 'Item Date'
    this.setfieldmaster['tt']['Type'] = 'Project_picklist_Name' //project is a pickfield
    this.setfieldmaster['tt']['Start'] = 'Start Time'
    this.setfieldmaster['tt']['Activity Id'] = 'Activity Id'
    this.setfieldmaster['tt']['Owner Id'] = 'Owner Id'
    //action
    this.setfieldmaster['action']['Type'] = 'Type'
    this.setfieldmaster['action']['Status'] = 'Status'
    this.setfieldmaster['action']['Locked'] = 'DBD Locked Flag'
    this.setfieldmaster['action']['Owner'] = 'Primary Owned By'
    this.setfieldmaster['action']['Effective Date'] = 'DBD Due Date'
    this.setfieldmaster['action']['ETA'] = 'DBD CLICK ETA'
    this.setfieldmaster['action']['FINISH'] = 'DBD CLICK Finish'
    this.setfieldmaster['action']['Arrival D/T'] = 'DBD Arrival Date'
    this.setfieldmaster['action']['Urgency Code'] = 'DBD Activity Urgency Code'
    this.setfieldmaster['action']['Priority'] = 'Priority'
    this.setfieldmaster['action']['Sub Type'] = 'Sub Type'
    this.setfieldmaster['action']['Trouble Code'] = 'DBD Trouble'
    this.setfieldmaster['action']['After Hrs/Std Hrs'] = 'DBD Std After Hrs'
    this.setfieldmaster['action']['Action Req'] = 'Call Type'
    this.setfieldmaster['action']['Review'] = 'DBD Review'
    this.setfieldmaster['action']['Reassign Rsn'] = 'DBD Reassignment Reason'
    this.setfieldmaster['action']['Incomplete Rsn'] = 'DBD Incomplete Reason'
    this.setfieldmaster['action']['Cancel Rsn'] = 'DBD Cancellation Reason'
    this.setfieldmaster['action']['Reqd Tech'] = 'DBD Required Tech'
    this.setfieldmaster['action']['modnum'] = 'Modification Num'
    //sr
    this.setfieldmaster['sr']['Id'] = 'Id'
    this.setfieldmaster['sr']['FACTS Site#'] = 'DBD CCMF Number'
    this.setfieldmaster['sr']['SR Type'] = 'SR Type'
    this.setfieldmaster['sr']['Sub Device'] = 'DBD Sub Device'
    this.setfieldmaster['sr']['Model'] = 'DBD Model'
    this.setfieldmaster['sr']['Problem Desc'] = 'Description'
    this.setfieldmaster['sr']['Party Name'] = 'Account'
    this.setfieldmaster['sr']['Casual Account'] = 'DBD Casual Account Name'
    this.setfieldmaster['sr']['Address Line 1'] = 'Service Street Address'
    this.setfieldmaster['sr']['Address Line 2'] = 'Service Street Address 2'
    this.setfieldmaster['sr']['City'] = 'Service City'
    this.setfieldmaster['sr']['State'] = 'Service State'
    this.setfieldmaster['sr']['Zip Code'] = 'Service Postal Code'
    this.setfieldmaster['sr']['County'] = 'DBD County'
    this.setfieldmaster['sr']['Country'] = 'Service Country'
    this.setfieldmaster['sr']['Branch Override'] = 'DBD Branch Override ID'
    this.setfieldmaster['sr']['Site Address Type'] = 'DBD Address Type'
    this.setfieldmaster['sr']['Contact Date'] = 'DBD Contact Date'
    this.setfieldmaster['sr']['Contact Email'] = 'DBD Contact Email'
    this.setfieldmaster['sr']['Who To See'] = 'DBD Who To See'
    this.setfieldmaster['sr']['Special P/O'] = 'DBD Special PO'
    this.setfieldmaster['sr']['Project Task'] = 'DBD Project Task Num'
    this.setfieldmaster['sr']['Cost Transfer#'] = 'DBD Cost Transfer'
    this.setfieldmaster['sr']['Quoted Amount'] = 'DBD Fixed Billing Amount'
    this.setfieldmaster['sr']['Quoted Expenses'] = 'DBD Quote Expenses'
    this.setfieldmaster['sr']['Quoted Part'] = 'DBD Quote Part'
    this.setfieldmaster['sr']['Quoted Labor'] = 'DBD Quote Labor'
    this.setfieldmaster['sr']['Problem Category'] = 'Sub-Area'
    this.setfieldmaster['sr']['Customer Prod Id'] = 'DBD Customer Product ID'
    this.setfieldmaster['sr']['Customer Problem #'] = 'Customer Ref Number'
    this.setfieldmaster['sr']['Entitlement Desc'] = 'DBD Entitlement Description'
    this.setfieldmaster['sr']['Entitlement Type'] = 'DBD SR Entitlement Type'
    this.setfieldmaster['sr']['Coverage Hours'] = 'DBD Coverage Hours Description'
    this.setfieldmaster['sr']['FCO#'] = 'DBD FCO #'
    this.setfieldmaster['sr']['Sales Order'] = 'DBD Sales Order'
    this.setfieldmaster['sr']['Equipment Description'] = 'Asset Description'
    this.setfieldmaster['sr']['Cost Transfer #'] = 'DBD Cost Transfer'
    this.setfieldmaster['sr']['Device Type'] = 'DBD Device Type'
    this.setfieldmaster['sr']['Entitlement Description'] = 'DBD Entitlement Description'
    this.setfieldmaster['sr']['Quote Expenses'] = 'DBD Quote Expenses'
    this.setfieldmaster['sr']['Quote Labor'] = 'DBD Quote Labor'
    this.setfieldmaster['sr']['Quote Part'] = 'DBD Quote Part'
    this.setfieldmaster['sr']['Read Only Flag'] = 'DBD SR Read Only Calc'
    this.setfieldmaster['sr']['modnum'] = 'Modification Number'

    this.bcmasterget["action"] = {};
    //bcmasterget["action"].boname = "DBD Mobile Filter BO";
    //bcmasterget["action"].bcname = "DBD Mobile Filter BC";
    this.bcmasterget["action"].boname = "Action";
    this.bcmasterget["action"].bcname = "Action";
    this.bcmasterget["sr"] = {};
    this.bcmasterget["sr"].boname = "Service Request";
    this.bcmasterget["sr"].bcname = "Service Request";
    this.bcmasterget["tt"] = {};
    this.bcmasterget["tt"].boname = "Action";
    this.bcmasterget["tt"].bcname = "Time Sheet Daily Hours";
    this.bcmasterget["et"] = {};
    this.bcmasterget["et"].boname = "Action";
    this.bcmasterget["et"].bcname = "FS Expense Item";
    this.bcmasterget["nt"] = {};
    this.bcmasterget["nt"].boname = "Action";
    this.bcmasterget["nt"].bcname = "FS Instruction";
    this.bcmasterget["pt"] = {};
    this.bcmasterget["pt"].boname = "Action";
    this.bcmasterget["pt"].bcname = "FS Activity Parts Movement";
    this.bcmasterget["sol"] = {};
    this.bcmasterget["sol"].boname = "Action";
    this.bcmasterget["sol"].bcname = "DBD Activity Solutions BC";
    this.bcmasterget["aa"] = {};
    this.bcmasterget["aa"].boname = "Action";
    this.bcmasterget["aa"].bcname = "Action Attachment";

    this.bcmasterset["action"] = {};
    this.bcmasterset["action"].boname = "Action";
    this.bcmasterset["action"].bcname = "Action";
    this.bcmasterset["sr"] = {};
    this.bcmasterset["sr"].boname = "Service Request";
    this.bcmasterset["sr"].bcname = "Service Request";
    this.bcmasterset["tt"] = {};
    this.bcmasterset["tt"].boname = "Action";
    this.bcmasterset["tt"].bcname = "Time Sheet Daily Hours";

  }
  /**Get - generates query string containing field list for getting data from siebel */
  public get(doctype, searchspec, viewmode): String {
    let retval = []
    let retvalstr = ""
    let qstr = ""
    for (var k in this.getfieldmaster[doctype]) {
      retval.push(k + ":" + this.getfieldmaster[doctype][k])
    }
    retvalstr = retval.toString();
    if (searchspec !== undefined && searchspec !== "") { } else {
      let syncstart = new Date(this.getObject("synctimestart")).getTime()
      let syncend = new Date(this.getObject("synctimeend")).getTime()
      var diff = 0;
      diff = ((syncend - syncstart)) / (1000 * 3600 * 24)
      console.log("Date Difference is - " + diff)
      if (diff > 2) {
        let dt = new Date(this.getObject("synctimeend"))
        dt.setDate(dt.getDate() - 1)
        let m = moment(dt);
        m.tz("US/Eastern");
        let synctimestr = "" + this.custformat(m.month() + 1) + "/" + this.custformat(m.date()) + "/" + this.custformat(m.year()) + " " + this.custformat(m.hour()) + ":" + this.custformat(m.minute()) + ":" + this.custformat(m.second());
        this.setObject("synctimestart", synctimestr);
      }
      if (this.getObject("synctimestart") === undefined && this.getObject("synctimestart") === undefined) {
        searchspec = "([Updated] > (Today()-1))";
      } else {
        searchspec = "([Updated] > \"" + this.getObject("synctimestart") + "\" AND [Updated] <= \"" + this.getObject("synctimeend") + "\")";
      }
    }
    return qstr = "&viewmode=" + viewmode + "&objectname=" + doctype + "&SearchExpr=" + encodeURIComponent(searchspec) + "&BOName=" + encodeURIComponent(this.bcmasterget[doctype].boname) + "&BCName=" + encodeURIComponent(this.bcmasterget[doctype].bcname) + "&fldarr=" + encodeURIComponent(retvalstr)
  }

  /**insert views in local pouchdb */
  public insertproc(): Promise<any> {
    var doc = {
      "_id": "_design/changes_since",
      "src": "siebel",
      "doctype": "view",
      "views": {
        "mobilechanges": {
          "map": "function (doc) {if(doc['source']==='mobile')(emit(doc['_id'],doc['_rev']));}"
        },
        "by_sbl_id": {
          "map": "function (doc) {if(doc['sblid'] && (doc['deleted']!='Y'))(emit(doc['sblid'],(doc['_rev']+'__'+doc['owner'])));}"
        },
        "by_owner": {
          "map": "function(doc,req){console.log(req.query.param);if(doc['owner']===req.query.param)(emit(doc['sblid'],doc['owner']));}"
        },
        "by_id": {
          "map": "function(doc){if(doc && (doc['deleted']!='Y'))(emit(doc['_id'],(doc['_rev']+'__'+doc['owner']+'__'+doc['modnum'])));}"
        },
        "by_doctype": {
          "map": "function(doc) { if(doc['doctype']) emit(doc['doctype']); }"
        },
        "chkmodnum": {
          "map": "function(doc) { if(doc['doctype']) emit(doc['sblid']+'_'+doc['modnum']); }"
        },
        "findsr": {
          "map": "function(doc) { if(doc['SR #']) emit(doc['SR #']); }"
        },
        "findbysblid": {
          "map": "function(doc) { if(doc['sblid']) emit(doc['sblid']); }"
        },
        "tt": {
          "map": "function(doc) { if(doc['doctype'] && doc['doctype']=='tt') emit(doc['Activity Id']); }"
        },
        "et": {
          "map": "function(doc) { if(doc['doctype'] && doc['doctype']=='et') emit(doc['Activity Id']); }"
        },
        "nt": {
          "map": "function(doc) { if(doc['doctype'] && doc['doctype']=='nt') emit(doc['Source Id']); }"
        },
        "pt": {
          "map": "function(doc) { if(doc['doctype'] && doc['doctype']=='pt') emit(doc['Activity Id']); }"
        },
        "aa": {
          "map": "function(doc) { if(doc['doctype'] && doc['doctype']=='aa') emit(doc['Activity Id']); }"
        },
        "sol": {
          "map": "function(doc) { if(doc['doctype'] && doc['doctype']=='sol') emit(doc['Activity Id']); }"
        }
      }
    }
    return this.localdb.put(doc)
      .then(function (success) {
        console.log(success);
      }, function (err) {
        console.log(err);
      })

  }
  /**insert data returned by bs into localpouchdb */
  public insertlocaldb(data, doctype): Promise<any> {
    try {
      var obj = JSON.parse(data);
      if ("{}" === data || data === undefined) {
        return Promise.resolve("NODATA")
      }
      var temp = this;
      return Promise.all(obj["details"][doctype].map(function (item) {
        if ("{}" === JSON.stringify(item)) {
          return Promise.resolve("NODATA")
        }
        item.doctype = doctype; //this sets the record type
        item.sblid = item.Id;
        item.src = 'siebel';
        var key = item.sblid + "_" + item.modnum;
        return temp.upsert(key, item);
      }))
    } catch (e) {
      console.error(e)
      throw (e);
    }
  }

  /** this function will determine if document is to be either discarded or inserted or updated */
  public upsert(key, doc): Promise<any> {
    console.log("checking for key & doc", key, doc);
    let temp = this;
    return temp.localdb.query('changes_since/chkmodnum', {
      "key": key
    })
      .then(function (result) {
        if (result.rows.length <= 0) {
          console.log("upserting doc");
          return temp.localdb.query('changes_since/findbysblid', {
            key: doc.sblid,
            include_docs: true
          })
            .then(function (olddoc) {
              if (olddoc.rows.length > 0) {
                doc._id = olddoc.rows[0].doc._id;
                doc._rev = olddoc.rows[0].doc._rev;
                console.log("existing document found updating it")
              }
              return temp._push(doc, "siebel");
            })
        } else {
          console.log("same record already present in database ignoring update");
        }
      })
  }

  /**low level function to push data to localdb */
  public _push(doc, doctype): Promise<any> {
    let temp = this;
    if (doctype === undefined || doctype === "") doc.src = "mobile";
    delete doc._rev;
    return temp.localdb.get(doc._id)
      //Check for revision
      .then(function (gdata) {
        //get latest rev and update
        doc._rev = gdata._rev
        console.log(doc);
        return (doc);
      }, function (err) {
        //not found clean insert
        return (doc);
      })
      //actual insert of doc
      .then(function (doc) {
        return temp.localdb.post(doc)
          .then(function (success) {
            console.log("document pushed");
            //console.log(success);
            //$ionicLoading.hide();
            return (doc)
          })
      })
      //push to synchronize db
      .then(function (doc) {
        var pushdoc = doc;
        console.log("pushing document to sync store - ", pushdoc);
        if (pushdoc._id !== "_design/changes_since" && pushdoc.src !== 'siebel') //filter out view & poller changes
        {
          console.log("pushing - ", pushdoc);
          temp.syncdb.get(pushdoc._id)
            .then(function (data) {
              //in case this doc already exists
              //delete data._rev;
              pushdoc._rev = data._rev
              temp.syncdb.post(pushdoc)
                .then(function (success) {
                  console.log("Document Pushed to Synch Store");
                });
            }, function (err) {
              //clean insert as doc is not in sync store
              delete pushdoc._rev;
              temp.syncdb.post(pushdoc)
                .then(function (success) {
                  console.log("Document Pushed to Synch Store");
                });
              console.log(err);
            })
          return "syncover";
        }
      })
      .catch(function (err) {
        console.error(err);
      })
  }

  /**set the syncstarttime and endtime localstorage variables */
  public settime(update: boolean) {
    let temp = this;
    if (update === true) {
      this.setObject("synctimestart", this.getObject("synctimeend"));
      var synctime = new Date();
      var m = new moment(synctime);
      m.tz("US/Eastern");
      var synctimestr = "" + this.custformat(m.month() + 1) + "/" + this.custformat(m.date()) + "/" + this.custformat(m.year()) + " " + this.custformat(m.hour()) + ":" + this.custformat(m.minute()) + ":" + this.custformat(m.second());
      this.setObject("synctimeend", synctimestr);
    } else {
      let synctime = new Date();
      synctime.setDate(synctime.getDate() - 1);
      let m = moment(synctime);
      m.tz("US/Eastern");
      let synctimestr = "" + temp.custformat(m.month() + 1) + "/" + temp.custformat(m.date()) + "/" + temp.custformat(m.year()) + " " + temp.custformat(m.hour()) + ":" + temp.custformat(m.minute()) + ":" + temp.custformat(m.second());
      temp.setObject("synctimestart", synctimestr);
      synctime = new Date();
      m = moment(synctime);
      m.tz("US/Eastern");
      synctimestr = "" + temp.custformat(m.month() + 1) + "/" + temp.custformat(m.date()) + "/" + temp.custformat(m.year()) + " " + temp.custformat(m.hour()) + ":" + temp.custformat(m.minute()) + ":" + temp.custformat(m.second());
      temp.setObject("synctimeend", synctimestr);

    }


  }


  /** TODO:: This function will send data from syncdb to siebel and mark error or success in offline db */
  public sendtosiebel() {
    console.log("starting send to siebel - ");
    //fetch docs in batches as defined in options to send to siebel
    this.syncdb.allDocs(this.options)
      .then(function (data) {
        return data;
      })
      //convert data to siebel http post format 
      .then((data) => {
        let prmarry = []
        for (var k = 0; k < data.rows.length; k++) {
          var ustr = ""
          var id = "Id=";
          if (data.rows[k].doc["sblid"] === undefined) {
            id += ""
          } else {
            id += data.rows[k].doc["sblid"];
          }
          let doctype = data.rows[k].doc["doctype"]
          var boname = "&BOName=" + encodeURIComponent(this.bcmasterset[doctype]["boname"]);
          var bcname = "&BCName=" + encodeURIComponent(this.bcmasterset[doctype]["bcname"]);
          var fldarr = "&fldarr="
          var fldarrdat = []
          for (var i in data.rows[k].doc) {
            //if(i !== "sblid" && i !== "_id" && i !== "doctype") //ignore system fields
            fldarrdat.push(this.setfieldmaster[doctype][i], data.rows[k].doc[i]);
          }
          fldarr += encodeURIComponent(fldarrdat.toString())
          ustr = id + boname + bcname + fldarr;
          //####TODO#####
          //need to update code after data is sent to siebel to remove records from syncdb and also mark any error messages on offline db
          this.callsiebelbs("DBD+PWA+Operations", "upsert", ustr)
        }

      })
      .catch(function (err) {
        console.error(err);
      })
  }
  /**fetchdocs */
  public fetchdocs(doctype): Promise<any> {
    return this.localdb.query('changes_since/by_doctype', {
      key: doctype,
      include_docs: true
    })
  }

  public ondemandsblfetch(doctype, ss): Promise<any> {
    return this.callsiebelbs("DBD+PWA+Operations", "DBDGenericQueryJSONMobile", this.get(doctype, ss, this.viewmode["AllView"]))
      .then((bsresponse) => {
        //insert data
        console.log(bsresponse);
        if (bsresponse !== "LOGIN" && bsresponse !== "{}")
          return this.insertlocaldb(bsresponse, doctype);
        else
          return Promise.resolve("NODATA")
      })
      .then((dat) => {
        if (dat.toString() !== "NODATA") {
          return dat;
        }
      })
      .catch((err) => {
        console.error(err);
        return Promise.reject(err);
      })
  }
  /** busy indicator functions */
  showLoading() {
    this.loading = this.loadingCtrl.create({
      content: 'Please wait...',
      dismissOnPageChange: true
    });
    this.loading.present();
  }

  showError(text) {
    this.loading.dismiss();
    let alert = this.alertCtrl.create({
      title: 'Fail',
      subTitle: text,
      buttons: ['OK']
    });
    alert.present(prompt);
  }
}
