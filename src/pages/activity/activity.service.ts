import pouchdb from 'pouchdb';
import { Observable } from 'rxjs/observable';
export class ActivityService {
    /*getActivities(){
        return new Promise(function(resolve,reject){
            let db= new pouchdb('act3');
            db.allDocs({include_docs: true}).then(function(data){
            resolve(data);
        })
        
    });
    }*/

    subscription = Observable.create(function (obs) {
        let db = new pouchdb('offline');
        db.allDocs({ include_docs: true }).then(function (data) {
            obs.next(data);
        })
    })
}