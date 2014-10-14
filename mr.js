var connection_string = '127.0.0.1:27017/weiboSina3';


var mongojs = require('mongojs');
var db = mongojs(connection_string);

var Segment = require('segment').Segment;
// 载入模块
var Segment = require('segment').Segment;
// 创建实例
var segment = new Segment();
segment.useDefault();


var mapper = function(){
    var wds = segment.doSegment(this.info);
    wds.map(function(item){
        emit(item,1);
    });

}

var reducer = function(key,values){
   return Array.sum(values);
}


console.log("star mapreduce");
db.collection("users").mapReduce(mapper,reducer,{out:"testout2"},function(err){
    if(err){
        console.log(err);
    }
    else{
        console.log("mapreduce done");

        db.collection("testout1").find(function(err,docs){
            console.log(docs);
        });
    }
});

