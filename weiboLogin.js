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

var connection_string = '127.0.0.1:27017/weiboSina4';
var db = monk(connection_string);

function getJsonObj(body){
    var start = body.indexOf("{");
    var end = body.lastIndexOf("}");
    var jsonStr = body.substr(start,end -start + 1);
    var responseJson = JSON.parse(jsonStr);
    return responseJson;
}


function log(msg){
    console.log(msg);
}

function login(userName,password,loginCallback) {
    var userName = userName;
    var password = password;

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

            var errReason = /retcode=(\d+?)&/;
            var errorLoginMatch = body.match(errReason);

            if (errorLoginMatch) {
                    var reason = getErrReason(errorLoginMatch[1]);
                    callback("登录失败,原因:" + reason);
            }
            else{
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

            loginCallback(null,cookieColl);
        }
    ], function (err) {
        console.log(err)
        loginCallback(err);
    });
}

function getErrReason(errCode){
    switch(errCode){
        case "4038":
            return "登录次数过于频繁";
        case "4049":
            return "请填写验证码";
        case "4010":
            return "帐号尚未激活。";
        case "4090":
            return "此帐号未激活，请登录原帐号";
        case "5024":
            return "请填写正确的微盾动态码";
        case "5025":
            return "动态码有误，请重新输入";
        case "5":
            return "尚未注册微博";
        case "101":
            return "用户名或密码错误。"
        case "4098":
            return "您的帐号还没有设置密码，为方便登录请";
        case "9999":
            return "当前网络超时，请稍后再试";
        default :
            return "未知登录错误，请手动登录测试"
    }
}

exports.login = login;
