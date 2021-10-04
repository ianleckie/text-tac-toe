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

		gamePlay.newGame();

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

		gamePlay.processInput( UI.userInput );

		UI.userInput = '';

		textTerminal.cmdPrompt();

	},

	isKeyPressed : ( keycode ) => {

		return ( $.inArray( UI.curKeyCode.toString(), UI.keycodesMap[keycode] ) > -1 );

	},

	watchKeyPress : ( event ) => {

		if ( !textTerminal.isTyping ) {

			UI.curKeyCode = ( event.keyCode ? event.keyCode : event.which ).toString();

			if ( !gamePlay.isPlaying && UI.isKeyPressed( 'enter' ) ) {

				// first press of enter triggers the animation and starts the game
				gamePlay.toggleGameMode();
				gamePlay.loadGameData();

				setTimeout( gamePlay.startGame, timing.startGameDelay );

			} else if ( UI.inputOK ) {

				if ( UI.isKeyPressed( 'enter' ) ) {

					// subsequent presses of enter fire handleInput
					UI.handleInput();

				} else if ( UI.isKeyPressed( 'delete' ) ) {

					// delete one character
					UI.userInput = UI.userInput.slice( 0, -1 );

					textTerminal.deleteLetter();

				} else {

					// if input character is OK, send it to the terminal and concat it to the userInput property
					curChar = String.fromCharCode( UI.curKeyCode );

					// only allowed characters, cap userInput length at maxInputLength
					if ( UI.allowedChars.test( curChar ) && ( UI.userInput.length < UI.maxInputLength ) ) {

						UI.userInput = UI.userInput + curChar;

						textTerminal.typeLetter( curChar );

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
let gamePlay = {

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

			N : 'moveNorth',
			E : 'moveEast',
			S : 'moveSouth',
			W : 'moveWest',

		},

	},

	nextTurn : () => {

		alert('NEXT');

	},

	endGame : () => {

		alert('END');

	},

	loadGameData : () => {

		$.getJSON( 'js/gameData.json', ( json ) => {

			gamePlay.gameData = json;

		});

	},

	toggleGameMode : () => {

		gamePlay.isPlaying = !gamePlay.isPlaying;

		$('#game').toggleClass( 'playing' );
	
	},

	processInput : ( input ) => {

		if ( gamePlay.validInput.test( input ) ) {

			// hmmm..... needs more processing & checks first?
			// works for (Y|N), or (.+ )(N|E|S|W)
			// (but (.+ )N also works for N, which it shouldn't)
			gamePlay[ gamePlay.scriptActions[gamePlay.curScript][input.slice(-1)] ]();

		} else {

			// error "message"
			UI.flashScreen();

		}

	},

	startGame : () => {

		gamePlay.curScript = 'startGame';

		textTerminal.clearScreen();
		
		textTerminal.typeFromCurScript( textTerminal.waitForInput );

	},

	newGame : () => {

		gamePlay.curScript = 'newGame';

		textTerminal.typeFromCurScript();

	},

};

/*
Simple terminal for I/O
*/
const textTerminal = {

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
		
		if ( textTerminal.typing ) clearInterval( textTerminal.typing );
		
		textTerminal.screen.text('');

	},

	cmdPrompt : () => {

		textTerminal.typeLetter( "\n" );
		textTerminal.typeLetter( textTerminal.promptChar );

	},

	/*
	Types the script saved in gamePlay.curScript
	*/
	typeFromCurScript : ( callback = false ) => {

		let filePath = textTerminal.scriptPath + gamePlay.curScript + textTerminal.scriptExt;

		textTerminal.typeFromFile( filePath, callback );

	},

	/*
	Reads script from file, then send the contents to typeText
	*/
	typeFromFile : ( filePath, callback = false ) => {

		textTerminal.callback = callback;

		$.get( filePath, ( text ) => {

			// replace | with 5 tabs to delay cursor movement and vary typing speed
			text = text.replace( /\|/g, "\t\t\t\t\t" );

			textTerminal.typeText( text );

		});

	},

	/*
	Sends text to typeLetter one letter at a time
	*/
	typeText : ( text ) => {

		setTimeout( () => {

			textTerminal.isTyping = true;

			textTerminal.curLetter = 0;

			textTerminal.textAr = text.split('');

			textTerminal.typing = setInterval( textTerminal.typeLetter.bind( null ), timing.typingSpeed );

		}, timing.startTypingDelay );

	},

	/*	
	Types a letter to the screen
	*/
	typeLetter : ( letter = null ) => {

		// stop typing when we reach the end of the text and call the callback if set
		if ( letter == null && textTerminal.curLetter > textTerminal.textAr.length - 1 ) {

			textTerminal.isTyping = false;

			clearInterval( textTerminal.typing );

			if ( textTerminal.callback ) textTerminal.callback();

		} else {

			// type the letter that is passed, otherwise type the next letter from textTerminal.textAr
			letter = ( letter ) ? letter : textTerminal.textAr[textTerminal.curLetter];

			if ( letter == "\n" ) {
				
				textTerminal.screen.append( $('<br>') );
			
			} else if ( letter == "\t" ) {
				
				textTerminal.screen.append( $('<wbr>') ); // tabs output zero-width spaces to add delay
			
			} else if ( letter == " " ) {
				
				textTerminal.screen.append( '\xa0' ); // nbsp
			
			} else {

				textTerminal.screen.append( letter );
			
			}

			textTerminal.curLetter++;

		}

	},

	/*	
	Deletes a letter from the screen
	*/
	deleteLetter : () => {

		if ( textTerminal.screen.html().slice( -1 ) != textTerminal.promptChar ) {

			let newHTML = ( textTerminal.screen.html().slice( -6 ) == '&nbsp;' ) ? textTerminal.screen.html().slice( 0, -6 ) : textTerminal.screen.html().slice( 0, -1 );

			textTerminal.screen.html( newHTML );

		}

	},

	/*	
	Outputs command prompt and starts listening for input
	*/
	waitForInput : () => {

		textTerminal.cmdPrompt();

		UI.inputOK = true;

	},

};

const loadFunction = ( jQuery ) => {

	UI.init();

	$( document ).keyup( UI.watchKeyPress );

};
 
$( window ).on( 'load', loadFunction );
