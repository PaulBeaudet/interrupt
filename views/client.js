// client.js ~ Copyright 2015 Paul Beaudet ~ MIT License see LICENSE_MIT for detials

var MINUTE = 60000;               // Milliseconds in a minute
var SECOND = 1000;                // MILLISECONDS in a second
var WORD = 5;                     // Characters per averange word
var AVG_DURRATION = 5;            // Amount of speed entries accepted before averanging
var MESSAGE_TIMEOUT = 45;         // timeout for messages
var NUM_ENTRIES = 6;              // number of dialog rows allowed in the application
var NUM_TIMERS = NUM_ENTRIES + 1; // timer 6 is for the send button
// call NUM_ENTRIES for send button timer
var SEND_TIMER = NUM_ENTRIES;

var hist = {
    row: 0,                                                      // notes history row being typed in
    active: false,                                               // notes weather someone is typing
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
            $( '#dialog' + ( i - 1 ) ).html( $('#dialog' + i).html() );
            $( '#timer' + ( i - 1 ) ).html( $('#timer' + i).html() );
        }
        $( '#dialog' + (NUM_ENTRIES - 1) ).html('');
        $( '#timer' + (NUM_ENTRIES -1) ).html('');
    },
    chat: function(rtt){
        $('#dialog' + hist.row).html(rtt.text);               // incomming chat dialog
        $('#timer' + hist.row).html(rtt.id ? rtt.id : '???'); // set id of incoming message if rtt.id provided else '???'
    },
}

var send = {
    block: true,
    justTyped: false,
    go: function(){
        send.block = false;
        if(hist.row === NUM_ENTRIES){ hist.scoot(); }
        else{ hist.increment(); }
        //
        if(check.timer){clearTimeout(check.timer);}
        check.timer = setTimeout(check.forMyTurn, SECOND);
    },
    input: function(){
        if(send.block || send.justTyped){$('#textEntry').val('');} // block input
        else{
            var text = $('#textEntry').val();
            if(text.length > 3 && text[text.length-1] === " "){    // if the last letter is equal to space
                sock.et.emit("chat", text);
            }
        }
    },
    pass: function(){
        if(!send.block || !send.justTyped){
            sock.et.emit('chat', $('#textEntry').val());
            send.justTyped = true;                     // just completed our thought, give others a chance
            sock.et.emit('go');                        // signify to our friends they can take the helm
        }
    },
    enter: function(event){if(!send.block && event.which === 13){send.pass();}}
}

var ALLOWENCE = 45;    // total before passing the helm forcably
var OPEN_HELM = 30;    // time before helm can be taken by interuption
var COURTESY = 4;      // double dip moritorium i.e. if no one else takes the helm after you talked you can talk again
var PAUSE_TIMEOUT = 4; // inactivity timeout

var check = {
    timer: 0,
    elapsed: 0,
    whoami: '',
    in: function(id){
        check.whoami = id;
        console.log('Im ' + check.whoami);
    },
    forMyTurn: function(){
        check.elapsed++; // decrement time
        if(send.block && check.elapsed > OPEN_HELM){send.block = false;}
        if(send.justTyped && check.elapsed > COURTESY){
            console.log('you can type again');
            send.justTyped = false;
        }
        //
        check.timer = setTimeout(check.forMyTurn, SECOND);
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
});
