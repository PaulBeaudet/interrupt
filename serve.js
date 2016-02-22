// serve.js ~ Copyright 2015 Paul Beaudet ~ Licence Affero GPL ~ See LICENCE_AFFERO for details
// This a test for app for helping strangers connect through RTT services

var when = {
    idle: true,
    users: 0,
    connected: function(socket){
        var cookieCrums = socket.request.headers.cookie.split('=');   // split correct cookie out
        var user = cookie.user(cookieCrums[cookieCrums.length - 1]);  // decrypt email from cookie, make it userID
        if(user){user = user.content.user}                            // check for existing cookie
        else{return 0};                                               // this is a nameless (expired) socket!
        console.log(user.name + ' connected id:' + socket.id);        // log connection event
        sock.ets.to(socket.id).emit('youAre', user.name);             // make sure the socket knows who it is
        when.users++;
        if(when.users > 1 && when.idle){
            sock.ets.emit('go', {text: 'start typing!', id: 'server'});
            when.idle = false;
        }
        return user.name;
    },
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
            var name = when.connected(socket);
            if(!name){return;}                 // provide no services to nameless sockets
            socket.on('chat', function(rtt){
                rtt.id = name;                 // add name to real time chat object
                sock.ets.emit('chat', rtt);    // emit rtt object to all clients
            });
            socket.on('go', function(){sock.ets.emit('go');});
            //
            socket.on('disconnect', function(){when.disconnect(socket.id);});
        });
    },
}

var userAct = { // dep: mongo
    auth: function ( render ){
        return function(req, res){
            if(req.session.user && req.session.user.name){
                console.log(req.session.user.name + ' joined')
                res.render(render);
            } else {res.redirect('/');}
        }
    },
    name: function ( req, res ){
        if(req.body.name){
            req.session.user = {name: req.body.name};
            res.redirect('/chat');
        } else {
            res.redirect('/');
        }
    }
}

var cookie = { // depends on client-sessions and mongo
    session: require('client-sessions'),
    ingredients: {
        cookieName: 'session',
        secret: process.env.SESSION_SECRET,
        duration: 5 * 365 * 24 * 60 * 60 * 1000,  // cookie times out in 5 years
    },
    meWant: function(){return cookie.session(cookie.ingredients);},
    user: function(content){return cookie.session.util.decode(cookie.ingredients, content);},
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
        router.get('/', function(req, res){res.render('name');});
        router.post('/', userAct.name);
        router.get('/chat', userAct.auth('chat'));
        app.use(router);

        sock.listen(http);                            // listen for socket connections
        http.listen(process.env.PORT);                // listen on specified PORT enviornment variable
    }
}

//Initiate the site
serve.theSite();
