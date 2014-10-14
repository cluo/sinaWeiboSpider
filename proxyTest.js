/**
 * Created by lenovo on 2014/9/17.
 */

var fs = require("fs");
var Request = require('request');

fs.readFile("proxy.txt",{encoding:"utf-8"}, function(err,content){
    content.split("\r\n").forEach(function(item){
        if(item){
            var request = Request.defaults({proxy:"http://" + item});

            request({uri:"http://s.weibo.com/",encoding:"utf-8"},function(err,response,body){

                if(err){
                 //   console.log(err);
                    return;
                }
                var matched = body.match(/\.css\?version=2012/gm);

                if(matched){
                 //   console.log(matched);
                    console.log(item);
                }
                else{
                   // console.log("Not match");
                }

            });
        }
    });
});

return;