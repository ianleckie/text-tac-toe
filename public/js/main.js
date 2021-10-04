/*
Timing variables
*/
const timing = {
	cursorBlinkSpeed : 250,
	typingSpeed      : 125,
	startGameDelay   : 1400,
	startTypingDelay : 1600,
};

/*
UI methods
*/
const UI = {

	curKeyCode     : null,
	curChar        : null,
	userInput      : '',
	maxInputLength : 50,
	blinking       : false,
	inputOK        : false,
	allowedChars   : /^[a-z0-9 ]+$/i,
	
	keycodesMap : {
		enter  : [ '13' ],
		delete : [ '127', '8' ],
	},

	init : () => {

		UI.blinkCursor();

		GamePlay.newGame();

	},

	blinkCursor : () => {
		
		UI.blinking = setInterval( () => { $('.cursor').toggleClass( 'blink' ) } , timing.cursorBlinkSpeed );
	
	},

	greenCursor : () => {

		if ( UI.blinking ) clearInterval( UI.blinking );
		
		$('.cursor').removeClass( 'blink' );
	
	},

	transparentCursor : () => {

		if ( UI.blinking ) clearInterval( UI.blinking );
		
		$('.cursor').addClass( 'blink' );
	
	},

	flashScreen : () => {

		$('#screen').addClass('flash');

		setTimeout( () => { $('#screen').removeClass('flash') }, 100 );

	},

	handleInput : () => {

		GamePlay.processInput( UI.userInput );

		UI.userInput = '';

		TextTerminal.cmdPrompt();

	},

	isKeyPressed : ( keycode ) => {

		return ( $.inArray( UI.curKeyCode.toString(), UI.keycodesMap[keycode] ) > -1 );

	},

	watchKeyPress : ( event ) => {

		if ( !TextTerminal.isTyping ) {

			UI.curKeyCode = ( event.keyCode ? event.keyCode : event.which ).toString();

			if ( !GamePlay.isPlaying && UI.isKeyPressed( 'enter' ) ) {

				// first press of enter starts the game
				GamePlay.init();

			} else if ( UI.inputOK ) {

				if ( UI.isKeyPressed( 'enter' ) ) {

					// subsequent presses of enter fire handleInput
					UI.handleInput();

				} else if ( UI.isKeyPressed( 'delete' ) ) {

					// delete one character
					UI.userInput = UI.userInput.slice( 0, -1 );

					TextTerminal.deleteLetter();

				} else {

					// if input character is OK, send it to the terminal and concat it to the userInput property
					curChar = String.fromCharCode( UI.curKeyCode );

					// only allowed characters, cap userInput length at maxInputLength
					if ( UI.allowedChars.test( curChar ) && ( UI.userInput.length < UI.maxInputLength ) ) {

						UI.userInput = UI.userInput + curChar;

						TextTerminal.typeLetter( curChar );

					} else {

						// error "message"
						UI.flashScreen();

					}

				}

			}

		}

	},

};

/*
Game play methods
*/
let GamePlay = {

	gameData   : {},
	isPlaying  : false,
	curScript  : null,
	validInput : /^((y|yes|n|no|ok|nope)|([a-z]+ (n|s|e|w|north|south|east|west)))$/i,

	scriptActions : {

		startGame : {

			Y : 'nextTurn',
			N : 'endGame',

		},

		inProgress : {

			MN : 'moveNorth',
			ME : 'moveEast',
			MS : 'moveSouth',
			MW : 'moveWest',

		},

	},

	init : () => {

		GamePlay.toggleGameMode();
		GamePlay.loadGameData();

		setTimeout( GamePlay.startGame, timing.startGameDelay );

	},

	nextTurn : () => {

		alert('NEXT');

	},

	endGame : () => {

		alert('END');

	},

	loadGameData : () => {

		$.getJSON( 'js/gameData.json', ( json ) => {

			GamePlay.gameData = json;

		});

	},

	toggleGameMode : () => {

		GamePlay.isPlaying = !GamePlay.isPlaying;

		$('#game').toggleClass( 'playing' );
	
	},

	processInput : ( input ) => {

		if ( GamePlay.validInput.test( input ) ) {

			// hmmm..... needs more processing & checks first
			// works for (Y|N), or (.+ )(N|E|S|W)
			// (but (.+ )N also works for N, which it shouldn't)
			GamePlay[ GamePlay.scriptActions[GamePlay.curScript][input.slice(-1)] ]();

		} else {

			// error "message"
			UI.flashScreen();

		}

	},

	startGame : () => {

		GamePlay.curScript = 'startGame';

		TextTerminal.clearScreen();
		
		TextTerminal.typeFromCurScript( TextTerminal.waitForInput );

	},

	newGame : () => {

		GamePlay.curScript = 'newGame';

		TextTerminal.typeFromCurScript();

	},

};

/*
Simple terminal for I/O
*/
const TextTerminal = {

	screen     : $('#text .content'),
	scriptPath : 'js/script/',
	scriptExt  : '.script',
	promptChar : '>',

	isTyping  : true,
	textAr    : [],
	curLetter : 0,
	typing    : false, 
	callback  : false, // function to call after the last letter is typed

	clearScreen : () => {
		
		if ( TextTerminal.typing ) clearInterval( TextTerminal.typing );
		
		TextTerminal.screen.text('');

	},

	cmdPrompt : () => {

		TextTerminal.typeLetter( "\n" );
		TextTerminal.typeLetter( TextTerminal.promptChar );

	},

	/*
	Types the script saved in GamePlay.curScript
	*/
	typeFromCurScript : ( callback = false ) => {

		let filePath = TextTerminal.scriptPath + GamePlay.curScript + TextTerminal.scriptExt;

		TextTerminal.typeFromFile( filePath, callback );

	},

	/*
	Reads script from file, then send the contents to typeText
	*/
	typeFromFile : ( filePath, callback = false ) => {

		TextTerminal.callback = callback;

		$.get( filePath, ( text ) => {

			// replace | with 5 tabs to delay cursor movement and vary typing speed
			text = text.replace( /\|/g, "\t\t\t\t\t" );

			TextTerminal.typeText( text );

		});

	},

	/*
	Sends text to typeLetter one letter at a time
	*/
	typeText : ( text ) => {

		setTimeout( () => {

			TextTerminal.isTyping = true;

			TextTerminal.curLetter = 0;

			TextTerminal.textAr = text.split('');

			TextTerminal.typing = setInterval( TextTerminal.typeLetter.bind( null ), timing.typingSpeed );

		}, timing.startTypingDelay );

	},

	/*	
	Types a letter to the screen
	*/
	typeLetter : ( letter = null ) => {

		// stop typing when we reach the end of the text and call the callback if set
		if ( letter == null && TextTerminal.curLetter > TextTerminal.textAr.length - 1 ) {

			TextTerminal.isTyping = false;

			clearInterval( TextTerminal.typing );

			if ( TextTerminal.callback ) TextTerminal.callback();

		} else {

			// type the letter that is passed, otherwise type the next letter from TextTerminal.textAr
			letter = ( letter ) ? letter : TextTerminal.textAr[TextTerminal.curLetter];

			if ( letter == "\n" ) {
				
				TextTerminal.screen.append( $('<br>') );
			
			} else if ( letter == "\t" ) {
				
				TextTerminal.screen.append( $('<wbr>') ); // tabs output zero-width spaces to add delay
			
			} else if ( letter == " " ) {
				
				TextTerminal.screen.append( '\xa0' ); // nbsp
			
			} else {

				TextTerminal.screen.append( letter );
			
			}

			TextTerminal.curLetter++;

		}

	},

	/*	
	Deletes a letter from the screen
	*/
	deleteLetter : () => {

		if ( TextTerminal.screen.html().slice( -1 ) != TextTerminal.promptChar ) {

			let newHTML = ( TextTerminal.screen.html().slice( -6 ) == '&nbsp;' ) ? TextTerminal.screen.html().slice( 0, -6 ) : TextTerminal.screen.html().slice( 0, -1 );

			TextTerminal.screen.html( newHTML );

		}

	},

	/*	
	Outputs command prompt and starts listening for input
	*/
	waitForInput : () => {

		TextTerminal.cmdPrompt();

		UI.inputOK = true;

	},

};

const loadFunction = ( jQuery ) => {

	UI.init();

	$( document ).keyup( UI.watchKeyPress );

};
 
$( window ).on( 'load', loadFunction );
