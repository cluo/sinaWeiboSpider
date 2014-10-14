/**
 * Created by lenovo on 2014/9/18.
 */
var Request = require('request');

var cookieColl = Request.jar()
var request = Request.defaults({jar: cookieColl,proxy:"http://111.13.109.52"})

var nCnt = 0;


function recr(){
    request.get({url:"http://www.baidu.com",encoding:"utf-8"},function(err,resp,body){
        nCnt++;
        console.log(nCnt)
        recr();
    });
}
recr();
