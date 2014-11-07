sinaWeiboSpider
===============
使用node.js写的新浪微博爬虫程序，目前仅是从任意一个用户开始递归爬取粉丝或者follow的人，很任意就可以改成爬取其他信息。
代码中占大篇幅的就是新浪微博的登录，为了防止爬虫，新浪微博的登录过程做的是非常繁琐，故导致代码也比较麻烦。

请原谅这里很多代码其实都是我测试过程中遗留下来的无用代码，真正做登录、数据爬取的其实只有main.js。
当然，启动main.js之前，您需要先将mongodb启动起来，您也可以将我代码中访问数据库的代码删除后运行看效果。

如果您只是想爬取微博内容，那就更简单了，您都不需要做模拟登录，只需要设置useraget就可以了，因为新浪虽然想要禁止我们普通用户的数据爬取，但它又希望可以被搜索引擎爬取到，所以您只需要设置一个google或者baidu的user agent就可以了，或者更简单点直接设置spider即可:

    var Request = require('request');
    var site = "http://weibo.com/rmrb";

    Request.get({uri:site,headers: {
        'User-Agent': 'spider'
    }},function(err,response,body){
        if(err){
            console.log("访问" + site +  "失败")
            console.log(err);
        }
        else{
            console.log("访问" + site +  "完成")
            var match = body.match(/\d+\.\d+\.\d+\.\d+/g);
    
            console.log(body);
    }});
	
dailypost.js是用来爬取每人每日的微博内容的，在写它的时候我顺带将登录的代码单独提取了出来，也就是weibologin.js。
