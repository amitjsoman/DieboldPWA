import { Component } from '@angular/core';
import { NavController, AlertController, LoadingController, Loading, IonicPage } from 'ionic-angular';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/observable';
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/toPromise';
import { LibProvider } from '../../providers/lib/lib';

@IonicPage()
@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class LoginPage {
  loading: Loading;
  registerCredentials = { username: '', password: '', url: '' };
  //loginService: LoginService;

  constructor(private nav: NavController, private alertCtrl: AlertController, private loadingCtrl: LoadingController, private http: Http, public srv: LibProvider) {
    console.log("inside LoginPage constructor()");
    if(srv.checkCredentials() && srv.getObject("srn") !== "undefined" && srv.getObject("srn") !== undefined && srv.getObject("srn") !== ""){
      srv.starttimer=true;
      this.nav.setRoot("ActivityPage");
      srv.poll();
    }    
   }

  public createAccount() {
    this.nav.push('RegisterPage');
  }

  public login() {
    this.showLoading();
    this.srv.login(this.registerCredentials.username, this.registerCredentials.password, this.registerCredentials.url)
    .then((data)=>{
      console.log("inside login");
      
      this.nav.setRoot('ActivityPage');
    })
    .catch((err)=>{
      this.showError(err.error)
    })
  }

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