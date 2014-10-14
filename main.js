/**
 * Created by lenovo on 2014/9/14.
 */

var iconv = require('iconv-lite'); //字符集转换
var mongo = require('mongodb');
var monk = require('monk');
var Request = require('request');
var RsaEncrypt = require("./rsa").RSAKey;
var async = require('async');
var cheerio = require('cheerio');
var cookieColl = Request.jar()
var request = Request.defaults({jar: cookieColl});

var connection_string = '127.0.0.1:27017/weiboSina3';
var db = monk(connection_string);
var cachedUsers = {};

var userCnt = 0;

function saveUser(user){
  var userColl = db.get("users");
   userColl.insert(user);
}


function getJsonObj(body){
    var start = body.indexOf("{");
    var end = body.lastIndexOf("}");
    var jsonStr = body.substr(start,end -start + 1);
    var responseJson = JSON.parse(jsonStr);
    return responseJson;
}

function getFansRecur(userId){

    //新浪限制只能取每人前十页的fans
    for(var i=1; i< 10; i++){
        var fansUrl = "http://weibo.com/" + userId + "/follow?page=" + i;

        request({
            "uri": fansUrl,
            "encoding": "utf-8"
        }, function(err,response,body){
            if(err){
                console.log(err);
            }
            else{
                var userLst = getUserLst(body,userId);

                if (userLst){
                    userLst.map(function(item){
                        getFansRecur(item.uId);
                    });
                }
            }
        });

    }
}

function getUserLst(htmlContent,userId){
    var matched = htmlContent.match(/\"cnfList\s*\\\".*\/ul>/gm);

    if(matched) {
        var str = matched[0].replace(/(\\n|\\t|\\r)/g," ").replace(/\\/g,"");
        var ulStr = "<ul class=" + str;

        var $ = cheerio.load(ulStr);

        var myFans = [];
        $("li").map(function (index, item) {
            var userInfo = getUserInfo($,this);

            if(userInfo){
               if(!cachedUsers[userInfo.uId]){
			       userInfo.from = userId; //设置来源用户
                   cachedUsers[userInfo.uId] = true;

                  // if(userInfo.fansCnt > 100){
				  
                       userCnt++;
                       console.log(userCnt);
                       saveUser(userInfo);
                       myFans.push(userInfo);
                   
               }
                else{
                   console.log("duplicate users");
               }
            }
        });

        return myFans;
    }

    return null;
}

function getUserInfo($,liSelector){
    var liActionData = $(liSelector).attr("action-data").split("&");
    var sex = "unknown";

    if(liActionData.length == 3){
        sex = liActionData[2].split("=")[1];
    }

    var alnk = $(liSelector).find("a[usercard]");
    var addr =  $(liSelector).find("div.name span").text().trim();

    var infoSel = $(liSelector).find("div.con_left div.info");

    var personInfo = "";

    if(infoSel.length > 0){
        personInfo = infoSel.text();
    }

    var cntSel = $(liSelector).find("div.con_left div.connect a");

    return {
        name:alnk.text(),
        uId:alnk.attr("usercard").split('=')[1],
        followCnt:tryParseInt($(cntSel[0]).text()),
        fansCnt:tryParseInt($(cntSel[1]).text()),
        weiboCnt:tryParseInt($(cntSel[2]).text()),
        addr: addr,
        sex:sex,
        info: personInfo
    };
}

function tryParseInt(str){
    try{
        return parseInt(str);
    }
    catch(e){
        console.log("parseInt failed.")
        return 0;
    }
}

function log(msg){
    console.log(msg);
}

function start() {
    var userName = "yourWeiboAccount";
    var password = "pwd";

    var preLoginUrl = "http://login.sina.com.cn/sso/prelogin.php?entry=weibo&callback=sinaSSOController.preloginCallBack&su=&rsakt=mod&checkpin=1&client=ssologin.js(v1.4.11)&_=" + (new Date()).getTime();

    async.waterfall([
        function (callback) {
            request({
                "uri": preLoginUrl,
                "encoding": "utf-8"
            }, callback);
        },
        function (responseCode, body, callback) {
            var responseJson = getJsonObj(body);

            log(responseJson);
            log("Prelogin Success. ");

            var loginUrl = 'http://login.sina.com.cn/sso/login.php?client=ssologin.js(v1.4.18)';
            var loginPostData = {
                entry: "weibo",
                gateway: "1",
                from: "",
                savestate: "7",
                useticket: "1",
                vsnf: "1",
                su: "",
                service: "miniblog",
                servertime: "",
                nonce: "",
                pwencode: "rsa2",
                rsakv: "1330428213",
                sp: "",
                sr: "1366*768",
                encoding: "UTF-8",
                prelt: "282",
                url: "http://weibo.com/ajaxlogin.php?framelogin=1&callback=parent.sinaSSOController.feedBackUrlCallBack",
                returntype: "META"
            };

            loginPostData.su = new Buffer(userName).toString('base64');

            var rsaKey = new RsaEncrypt();
            rsaKey.setPublic(responseJson.pubkey, '10001');
            var pwd = rsaKey.encrypt([responseJson.servertime, responseJson.nonce].join("\t") + "\n" + password);

            log([responseJson.servertime, responseJson.nonce].join("\t") + "\n" + password);

            loginPostData.sp = pwd;

            loginPostData.servertime = responseJson.servertime;
            loginPostData.nonce = responseJson.nonce;
            loginPostData.rsakv = responseJson.rsakv;

            log("pk:" + responseJson.pubkey);
            log("su:" + loginPostData.su);
            log("pwd:" + loginPostData.sp);

            request.post({
                "uri": loginUrl,
                "encoding": null,  //GBK编码 需要额外收到处理,
                 form: loginPostData

            }, callback);
        },
        function (responseCode, body, callback) {
            body = iconv.decode(body,"GBK");

            log(body)

            var errReason = /reason=(.*?)\"/;
            var errorLogin = body.match(errReason);

            if (errorLogin) {
               callback("登录失败,原因:" + errorLogin[1]);
            }
            else {
                var urlReg = /location\.replace\(\'(.*?)\'\)./;
                var urlLoginAgain = body.match(urlReg);

                if (urlLoginAgain) {

                    request({
                        "uri": urlLoginAgain[1],
                        "encoding": "utf-8"
                    }, callback);
                }
                else {
                    callback("match failed");
                }
            }
        },
        function (responseCode, body, callback) {
            console.log("登录完成");
            var responseJson = getJsonObj(body);
            console.log(responseJson);

            var myfansUrl = "http://weibo.com/" + responseJson.userinfo.uniqueid +  "/myfans"

            request({
                "uri": myfansUrl,
                "encoding": "utf-8"
            }, callback);

            var fansUrl = "http://weibo.com/{userId}/fans";
        },
        function (responseCode, body, callback) {
            console.log("开始分析... ");

            var userColl = db.get("users");
            var lastUid = "";
            console.log("查询已经记录的用户");
            var nIndex = 0;

         userColl.find({},{stream:true}).each(function(doc){
                cachedUsers[doc.uId] = true;
                lastUid = doc.uId;
            }).success(function(){
                console.log("已有用户已经缓存完成, 开始进行递归查询");
                console.log(lastUid);
                getFansRecur("1708942053");  //周鸿祎
            }).error(function(err){
             console.log(err);
         });

          /*
           var myFans = getUserLst(body);
           console.log("Myfans:" + myFans.length);
          myFans.map(function(item){
                getFansRecur(item.uId);
            }); */
        }
    ], function (err) {
        console.log(err)
    });
}

start();