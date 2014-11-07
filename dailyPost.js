/**
 * Created by lenovo on 2014/10/23.
 */

var Request = require('request');
var weiboLoginModule = require("./weiboLogin");
var connection_string = '127.0.0.1:27017/weiboSina2';
var monk = require('monk');
var db = monk(connection_string);
var cheerio = require('cheerio');

var feedsReg = /feed_list\'.*<\/script>/
var rstEndFlag = '"})</script>';
var fetchCnt = 0;

function log(msg){
    console.log(msg);
}

function getWeibo($,feedSelector){
    var weiboDiv = $(feedSelector);

    var weiboInfo = {
      "tbinfo":  weiboDiv.attr("tbinfo"),
       "mid": weiboDiv.attr("mid"),
        "isforward":weiboDiv.attr("isforward"),
        "minfo":weiboDiv.attr("minfo"),
        "omid":weiboDiv.attr("omid"),
        "text":weiboDiv.find(".WB_detail>.WB_text").text().trim(),
        "sendAt":new Date(parseInt(weiboDiv.find(".WB_detail>.WB_from a").eq(0).attr("date")))
    };

    if(weiboInfo.isforward){
        var forward = weiboDiv.find("div[node-type=feed_list_forwardContent]");

        if(forward.length > 0){
            var forwardUser = forward.find("a[node-type=feed_list_originNick]");

            var userCard = forwardUser.attr("usercard");

            weiboInfo.forward = {
               name:forwardUser.attr("nick-name"),
               id:userCard ? userCard.split("=")[1] : "error",
               text:forward.find(".WB_text").text().trim(),
               "sendAt":new Date(parseInt(forward.find(".WB_from a").eq(0).attr("date")))
            };
        }
    }

    return weiboInfo;
}

function fetchUserWeibo(request,userId,callback){

    var userUrl = "http://www.weibo.com/u/" + userId;

    request.get({url:userUrl},function(err,response,body){
        if(err)
        {
            log("微博内容查找失败:" + userUrl);
            log(err);
            return;
        }
        var matchRst = body.match(feedsReg);
        if(matchRst){
            var htmlRst = '<div><div class="' + matchRst[0].substr(0,matchRst[0].length - rstEndFlag.length);
            htmlRst =  htmlRst.replace(/(\\n|\\t|\\r)/g," ").replace(/\\/g,"")
            var $ = cheerio.load(htmlRst);

            $("div[action-type=feed_list_item]").map(function(index,item){
                if($(item).attr("feedtype") != "top"){
                    callback(null,getWeibo($,item));
                }
            });

            log("Completed:" + (fetchCnt++)+", fetching:" + userId);
        }
        else{

            log("微博内容查找失败:" + userUrl);
            callback("微博内容查找失败");

        }
    });
}

weiboLoginModule.login("13572475053","a111111",function(err,cookieColl){
    if(!err){
        var request = Request.defaults({jar: cookieColl});
        var userColl = db.get("users");
        var dailyPost = db.get("dailyWeibo");

        userColl.find({},{stream:true}).each(function(doc){
            fetchUserWeibo(request,doc.uId,function(err,weibo){
                dailyPost.insert(weibo);
            });
        }).error(function(err){
            console.log(err);
        });
    }
});