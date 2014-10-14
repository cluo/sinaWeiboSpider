var fs = require("fs");
var cheerio = require('cheerio')

function getUserInfo($,liSelector){
    var alnk = $(liSelector).find("a[usercard]");
    var addr =  $(liSelector).find("div.name span").text().trim();

    var infoSel = $(liSelector).find("div.con_left div.info");

    var personInfo = "";

    if(infoSel.length > 0){
        personInfo = infoSel.text();
    }

    var cntSel = $(liSelector).find("div.con_left div.connect a");

    return {
        name:alnk.attr("title"),
        uId:alnk.attr("usercard").split('=')[1],
        followCnt:$(cntSel[0]).text(),
        fansCnt:$(cntSel[1]).text(),
        weiboCnt:$(cntSel[2]).text(),
        addr: addr,
        info: personInfo
    };
}

function getUserLst(htmlContent){
    var matched = htmlContent.match(/\"cnfList\s*\\\".*\/ul>/gm);

    if(matched) {
        var str = matched[0].replace(/(\\n|\\t|\\r)/g," ").replace(/\\/g,"");
        var ulStr = "<ul class=" + str;
        console.log(ulStr);

        var $ = cheerio.load(ulStr);

        var myFans = [];
        $("li").map(function (index, item) {
            myFans.push(getUserInfo($,this));
        });

        return myFans;
    }

    return null;
}

fs.readFile("test.html",{encoding:"utf-8"},function (err, data){

   var fans =getUserLst(data);
    console.log(fans);
});
