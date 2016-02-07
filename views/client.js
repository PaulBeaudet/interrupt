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
    row: 0,
    current: '',
    increment: function(){ // decides with row to edit to and when the dialog needs to scoot up
        if(hist.row < NUM_ENTRIES - 2)         { hist.row++; }
        else if ( hist.row === NUM_ENTRIES - 2){ hist.row = NUM_ENTRIES - 1; }
        else if ( hist.row < NUM_ENTRIES + 1)  { hist.scoot(); }
    },
     onStart: function(){ // called when starting a message
        if(hist.row === NUM_ENTRIES){
            hist.scoot();
            hist.row--;
        }  // checks to see if a scoot is needed upon typing
        time.from(hist.row, sock.id);
    },
    type: function(text){console.log(text);},
    start: function(){
        for(var row = 0; row < NUM_ENTRIES; row++){           // remove everything that was on topic screen
            $('#button' + row).css('visibility', 'hidden');   // hide buttons
            $('#dialog' + row).html('');                      // clear previous hist
        }
    },
    myTurn: function(){
        time.from(hist.row, OTHER); // write other onto the last row
        edit.increment();              // increment place to write to
    },
    scoot: function(){
        for(var i = 1; i < NUM_ENTRIES; i++){
            $( '#dialog' + ( i - 1 ) ).html( $('#dialog' + i).html() );
            $( '#timer' + ( i - 1 ) ).html( $('#timer' + i).html() );
        }
        $( '#dialog' + (NUM_ENTRIES - 1) ).html('');
        $( '#timer' + (NUM_ENTRIES -1) ).html('');
    }
}

var send = {
    block: true,
    allow: function(){send.block = false;},
    input: function(){
        if(send.block){$('#textEntry').val('');}
        else{
            var text = $('#textEntry').val();
            if(text[text.length-1] === ' '){
                sock.et.emit("chat", text);
            }
        }
    },
    pass: function(){
        if(!send.block){
            time.curtsy();
            sock.et.emit('done', $('#textEntry').val());
        }
    },
    enter: function(event){if(!send.block && event.which === 13){send.pass();}}
}

var time = {
    curtsy: function(){},
    from: function(whichRow, who){ // replaces time span elemement with perspective of user
        $('#timer' + whichRow).css('visibility', 'visible');
        $('#timer' + whichRow).html(who);               // which perspective is this
    }, // Should probably be done with a seperate element but for the sake of simplicity this one is reused
}

var sock = {
    et: io(),
    id: 'me',
    init: function(){
        sock.et.on('chat', hist.type);
        sock.et.on('go', send.allow);
    }
}

$(document).ready(function(){
    sock.init();
    $('#textEntry').keydown(send.enter);                       // capture special key like enter
    $('#sendButton').click(send.pass);                         // provide a button click action
    document.getElementById('textEntry').oninput = send.input; // listen for input event
    hist.start();
});
