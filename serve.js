// serve.js ~ Copyright 2015 Paul Beaudet ~ Licence Affero GPL ~ See LICENCE_AFFERO for details
// This a test for app for helping strangers connect through RTT services

var when = {
    idle: true,
    users: 0,
    connected: function(socket){
        console.log(socket + ' connected');
        sock.ets.to(socket).emit('youAre', socket); // make sure the socket knows who it is
        when.users++;
        if(when.users > 1 && when.idle){
            sock.ets.emit('go', {text: 'start typing!', id: 'server'});
            when.idle = false;
        }
        return 0;
    },
    chat: function(rtt){sock.ets.emit('chat', rtt);},
    disconnect: function(socket){
        console.log(socket + ' disconnected');
        when.users--;
        if(when.users < 2){when.idle = true;} // switch back to idle when users disconnect
    },
}

var sock = {
    ets: require('socket.io'),
    listen: function(server){
        sock.ets = sock.ets(server);
        sock.ets.on('connection', function(socket){
            var nfo = when.connected(socket.id);
            socket.on('chat', function(text){sock.ets.emit('chat', {text: text, id: socket.id});});
            socket.on('go', function(){sock.ets.emit('go');});
            //
            socket.on('disconnect', function(){when.disconnect(socket.id);});
        });
    },
}

var cookie = { // depends on client-sessions and mongo
    session: require('client-sessions'),
    ingredients: {
        cookieName: 'session',
        secret: process.env.SESSION_SECRET,
        duration: 8 * 60 * 60 * 1000,  // cookie times out in 8 hours
        activeDuration: 5 * 60 * 1000, // activity extends durration 5 minutes
        httpOnly: true,                // block browser access to cookies... defaults to this anyhow
        //secure: true,                // only allow cookies over HTTPS
    },
    meWant: function (){return cookie.session(cookie.ingredients);},
    user: function (content){
        var result = cookie.session.util.decode(cookie.ingredients, content);
        return result.content.user;
    },
}

var serve = {
    express: require('express'),
    parse: require('body-parser'),
    theSite: function (){
        var app = serve.express();
        var http = require('http').Server(app);            // http server for express framework
        app.set('view engine', 'jade');                    // template with jade
        app.use(require('compression')());                 // gzipping for requested pages
        app.use(serve.parse.json());                       // support JSON-encoded bodies
        app.use(serve.parse.urlencoded({extended: true})); // support URL-encoded bodies
        app.use(cookie.meWant());                          // support for cookies

        app.use(serve.express.static(__dirname + '/views')); // serve page dependancies (sockets, jquery, bootstrap)
        var router = serve.express.Router();
        router.get('/', function(req, res){res.render('chat');});
        app.use(router);

        sock.listen(http);                            // listen for socket connections
        http.listen(process.env.PORT);                // listen on specified PORT enviornment variable
    }
}

//Initiate the site
serve.theSite();
