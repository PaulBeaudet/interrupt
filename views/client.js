// client.js ~ Copyright 2015 Paul Beaudet ~ MIT License see LICENSE_MIT for detials

var MINUTE = 60000;               // Milliseconds in a minute
var SECOND = 1000;                // MILLISECONDS in a second
var WORD = 5;                     // Characters per averange word
var AVG_DURRATION = 5;            // Amount of speed entries accepted before averanging
var MESSAGE_TIMEOUT = 45;         // timeout for messages
var NUM_ENTRIES = 6;              // number of dialog rows allowed in the application
var NUM_TIMERS = NUM_ENTRIES + 1; // timer 6 is for the send button
var SEND_TIMER = NUM_ENTRIES;     // call NUM_ENTRIES for send button timer
var SYSTEM_MSG = "server";        // ID of system messages
var OPEN_HELM = 25;               // time before helm can be taken by interuption
var PAUSE_TIMEOUT = 4;            // inactivity timeout

var hist = {
    row: 0,                                                      // notes history row being typed in
    start: function(){                                           // prep elements
        for(var row = 0; row < NUM_ENTRIES; row++){              // remove everything that was on topic screen
            $('#button' + row).css('visibility', 'hidden');      // hide buttons
            $('#timer' + row).css('visibility', 'visible');      // make timers visible
            $('#dialog' + row).html('');                         // clear previous hist
        }
    },
    increment: function(){ // decides with row to edit to and when the dialog needs to scoot up
        if(hist.row < NUM_ENTRIES - 2)         { hist.row++; }
        else if ( hist.row === NUM_ENTRIES - 2){ hist.row = NUM_ENTRIES - 1; }
        else if ( hist.row < NUM_ENTRIES + 1)  { hist.scoot(); }
    },
    scoot: function(){
        for(var i = 1; i < NUM_ENTRIES; i++){
            $('#dialog' + ( i - 1 )).html( $('#dialog' + i).html() );
            $('#timer' + ( i - 1 )).html( $('#timer' + i).html() );
        }
        $('#dialog' + (NUM_ENTRIES - 1)).html('');
        $('#timer' + (NUM_ENTRIES -1)).html('');
    },
    chat: function(rtt){
        $('#dialog' + hist.row).html(rtt.text);               // incomming chat dialog
        $('#timer' + hist.row).html(rtt.id ? rtt.id : '???'); // set id of incoming message if rtt.id provided else '???'
        $('#wpm').html(rtt.speed ? rtt.speed.toFixed(2) + ' WPM' : '');           // show speed if available
        check.idle = 0;                                       // reduce idle time to zero
        check.started = true;                                 // note dialog has started
        send.start();                                         // note when you got the last word in
    },
    turnTaken: function(me){ // check if someone else is in charge of talking
        var speaker = $('#timer'+hist.row).html();               // who is the current speaker?
        if(speaker===SYSTEM_MSG || speaker===me ){return false;} // I'm talking everything is good
        else if(speaker){return true;}                           // someone else is speaking
        else { return false;}                                    // who the hell knows whats going on... let em talk!
    },
}

var send = {
    empty: true,
    block: false,
    justTyped: false,
    lastWord: false,
    go: function(){
        send.lastWord = true;
        if(send.justTyped){
            var text = $('#textEntry').val();
            sock.et.emit('chat', {text: text, speed: speed.realTime(text.length)}); // emit last words
            $('#textEntry').val('');                     // reset text feild
        }
    },
    start: function(){
        if(send.lastWord){
            if(send.justTyped){
                send.setBlock(true);
                send.justTyped = false;                      // remove my justTyped status
            } else {send.setBlock(false);}
            if(hist.row === NUM_ENTRIES){ hist.scoot(); }    // scoot row if needed
            else{ hist.increment(); }                        // move down the rows first few messages
            check.reset();                                   // reset checks
            send.lastWord = false;
            send.empty = true;
        }
    },
    input: function(){
        if(send.block){$('#textEntry').val('');} // block input
        else {
            var text = $('#textEntry').val();
            if(send.empty){
                send.empty = false;
                speed.realTime();
            }
            if(text.length > 3 && text[text.length-1] === " "){    // if the last letter is equal to space
                if(check.forGrabs){ sock.et.emit('go');}           // interuption
                else{ sock.et.emit('chat', {text: text, speed: speed.realTime(text.length)}); } // typical chat
            }
        }
    },
    pass: function(){
        if(!send.block){
            send.justTyped = true;                       // just completed our thought, give others a chance
            sock.et.emit('go');                          // signify to our friends they can take the helm
        }
    },
    enter: function(event){if(!send.block && event.which === 13){send.pass();}},
    setBlock: function(set){
        send.block = set;
        $('#sendText').html(send.block ? 'wait' : 'type');
    }
}

var check = {
    timer: 0,
    elapsed: 0,
    idle: 0,
    started: false,
    forGrabs: false,
    whoami: '',
    in: function(id){check.whoami = id;},
    forMyTurn: function(){
        if(check.started){
            check.elapsed++;               // increment elapsed time
            check.idle++;                  // increment idle time (will only really increment w/inactivity)
        }
        if(!check.forGrabs){               // is focus up for grabs?
            if(!send.block && hist.turnTaken(check.whoami)){send.setBlock(true);}
            if(check.elapsed > OPEN_HELM || check.idle > PAUSE_TIMEOUT){ // if the helm is open
                if(send.block){            // check if I can interupt
                    send.setBlock(false);  // turn by restraint off
                    check.forGrabs = true; // note the focus is up for grabs
                } else {                   // check if I can be interupted
                    $('#sendText').html( check.elapsed + ' sec');
                    send.justTyped = true; // note that I previously had focus
                }
            }
        }
        check.timer = setTimeout(check.forMyTurn, SECOND);
    },
    reset: function(){
        check.forGrabs = false;
        check.started = false;
        check.elapsed = 0;
        check.idle = 0;
        clearTimeout(check.timer);
        check.timer = setTimeout(check.forMyTurn, SECOND);
    },
}

// -- handles gathing speed information
var speed = {
    startTime: 0,
    records: [],
    kpm: function(totalTime, keysPressed){
        var rate = totalTime / keysPressed; // average time taken per letter
        var cpm = MINUTE / rate;            // clicks/characters per minute
        return cpm / WORD;
    },
    realTime: function(charsEntered){
        var time = new Date();
        var now = time.getTime();
        if(charsEntered){
            return speed.kpm(now - speed.startTime, charsEntered);
        } else { speed.startTime = now; } // no param or chars starts the clock
    },
}

var sock = {
    et: io(),
    id: 'me',
    init: function(){
        sock.et.on('chat', hist.chat);
        sock.et.on('go', send.go);
        sock.et.on('youAre', check.in);
        sock.et.on('connect', function(){console.log('connected');});
    }
}

$(document).ready(function(){
    sock.init();
    $('#textEntry').keydown(send.enter);                       // capture special key like enter
    $('#sendButton').click(send.pass);                         // provide a button click action
    document.getElementById('textEntry').oninput = send.input; // listen for input event
    hist.start();
    send.setBlock(false);
    check.timer = setTimeout(check.forMyTurn, SECOND);
});
