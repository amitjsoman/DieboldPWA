import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { Http, Headers, RequestOptions } from '@angular/http';
import { HttpModule } from '@angular/http';
import { MyApp } from './app.component';
//import { HomePage } from '../pages/home/home';
import { ListPage } from '../pages/list/list';
import { LoginPage } from '../pages/login/login';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { LibProvider } from '../providers/lib/lib';
import { PouchDb } from './providers/pouch-db';
import { UtilProvider } from '../providers/util/util';
import { SharedModule } from './shared.module'
import { Logger } from "angular2-logger/core";

@NgModule({
  declarations: [
    MyApp,
    //HomePage,
    ListPage,
    LoginPage,
  ],
  imports: [
    BrowserModule, HttpModule,
    IonicModule.forRoot(MyApp), SharedModule,
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    //HomePage,
    ListPage,
    LoginPage,
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: ErrorHandler, useClass: IonicErrorHandler },
    LibProvider,
    PouchDb,
    UtilProvider, Logger
  ]
})
export class AppModule { }
