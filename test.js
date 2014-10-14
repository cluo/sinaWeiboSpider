
var monk = require('monk');
var fs = require("fs");

var connection_string = '127.0.0.1:27017/weiboSina1';
var db = monk(connection_string);
var wstream = fs.createWriteStream("alluses.csv");
var userColl = db.get("users");

userColl.find({},{stream:true}).each(function(doc) {
    if(doc.info){
        var userInfo = [];
        userInfo.push(doc.uId);
        userInfo.push(doc.sex);
        userInfo.push(doc.info);
        userInfo.push(doc.name);
        userInfo.push(doc.followCnt);
        userInfo.push(doc.fansCnt);
        userInfo.push(doc.addr);

        wstream.write(userInfo.join("$#") + "\n");
    }
}).success(function(){
    wstream.end();
    console.log("done");
});