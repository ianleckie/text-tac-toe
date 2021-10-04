// Status variables
let isPlaying   = false;
let gameStarted = false;
let isWriting   = true;
let inputOK     = false;

// Timing variables
let cursorSpeed      = 250;
let startTypingDelay = 2000;
let typingDelay      = 125;
let cssDelay         = 1000;
let gameDelay        = cssDelay + 500;
let longDelay        = 999999999;

/*
UI methods
*/
const UI = {

	curKeyCode : null,
	curChar    : null,
	userInput  : '',
	
	allowedCharsRegex : /^[a-z0-9 ]+$/i,
	
	keycodesMap : {
		enter:  [ '13' ],
		delete: [ '127', '8' ],
	},

	init : () => {

		UI.blinkCursor();

		gamePlay.newGame();

	},

	blinkCursor : () => {
		
		let blinking = setInterval( () => { $('.cursor').toggleClass( 'blink' ) } , cursorSpeed );
	
	},

	isKeyPressed : ( keycode ) => {

		let searchResult = $.inArray( UI.curKeyCode.toString(), UI.keycodesMap[keycode] );

		return ( searchResult > -1 );

	},

	respondToInput : () => {

		textTerminal.typeLetter( "\n" );
		textTerminal.typeLetter( textTerminal.promptChar );

		console.log( UI.userInput );

		UI.userInput = '';

	},

	watchKeyPress : ( event ) => {

		if ( !isWriting ) {

			UI.curKeyCode = ( event.keyCode ? event.keyCode : event.which ).toString();

			if ( !isPlaying && UI.isKeyPressed( 'enter' ) ) {

				gamePlay.toggleGameMode();

				setTimeout( gamePlay.startGame, gameDelay );

			} else if ( !gameStarted && UI.isKeyPressed( 'delete' ) ) {

				gamePlay.startGame();

			} else if ( inputOK ) {

				if ( UI.isKeyPressed( 'enter' ) ) {

					UI.respondToInput();

				} else if ( UI.isKeyPressed( 'delete' ) ) {

					UI.userInput = UI.userInput.slice( 0, -1 );

					textTerminal.deleteLetter();

				} else {

					curChar = String.fromCharCode( UI.curKeyCode );

					// only send characters that match allowedCharsRegex
					if ( UI.allowedCharsRegex.test( curChar ) ) {

						UI.userInput = UI.userInput + curChar;

						textTerminal.typeLetter( curChar );

					}

				}

			}

		}

	},

};

/*
Game play methods
*/
const gamePlay = {

	curScript : null,

	loadGame : () => {

		// init the default game object from JSON file

	},

	toggleGameMode : () => {

		isPlaying = !isPlaying;

		$('#game').toggleClass( 'playing' );
	
	},

	clearScreen : () => {

		isWriting = true;

		textTerminal.clearText();

	},

	startGame : () => {

		gameStarted = true;

		gamePlay.curScript = 'startGame';
		
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
let textTerminal = {

	screen     : $('#text .content'),
	scriptPath : 'js/script/',
	scriptExt  : '.script',
	promptChar : '>',
	
	textAr    : [],
	curLetter : 0,
	callback  : false, // function to call after the last letter is typed
	
	typing : setInterval( null, longDelay ), // set a long null interval to make it easier to interact with in future

	clearText : () => {
		
		window.clearInterval( textTerminal.typing );
		
		textTerminal.screen.text( '' );

	},

	/*
	Types the script saved in gamePlay.curScript
	*/
	typeFromCurScript : ( callback = false ) => {

		textTerminal.typeFromFile( gamePlay.curScript + textTerminal.scriptExt, callback );

	},

	/*
	Fires typeText after the startTypingDelay
	*/
	typeFromFile : ( file, callback = false ) => {

		textTerminal.callback = callback;

		gamePlay.clearScreen();

		// TODO: move get here, update typeText to take a string as input?

		setTimeout( textTerminal.typeText.bind( null, file ), startTypingDelay );

	},

	/*
	Reads in text from script file, processes it, and types it out one letter at a time to the terminal
	*/
	typeText : ( file ) => {

		let filePath = textTerminal.scriptPath + file;

		isWriting = true;

		jQuery.get( filePath, ( data ) => {
			
			// replace | with 5 tabs. tabs delay the cursor movement, so pipes in
			// the input can be used to vary typing speed.
			textTerminal.textAr = data.replace( /\|/g, "\t\t\t\t\t" ).split( '' );

			textTerminal.curLetter = 0;

			textTerminal.typing = setInterval( textTerminal.typeLetter.bind( null ), typingDelay );
		
		});

	},

	/*	
	Types a letter to the screen
	*/
	typeLetter : ( letter = null ) => {

		// stop typing when we reach the end of the text and call the callback if set
		if ( letter == null && textTerminal.curLetter > textTerminal.textAr.length - 1 ) {

			if ( textTerminal.callback ) textTerminal.callback();

			window.clearInterval( textTerminal.typing );

			isWriting = false;

		} else {

			// type the letter that is passed, otherwise type the next letter from textTerminal.textAr
			letter = ( letter ) ? letter : textTerminal.textAr[textTerminal.curLetter];

			if ( letter == "\n" ) {
				
				textTerminal.screen.append( $('<br>') );
			
			} else if ( letter == "\t" ) {
				
				textTerminal.screen.append( $('<wbr>') ); // tabs output zero-width spaces to add delay
			
			} else if ( letter == " " ) {
				
				textTerminal.screen.append( '\xa0' );
			
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

		textTerminal.typeLetter( textTerminal.promptChar );

		inputOK = true;

	},

};

const loadFunction = ( jQuery ) => {

	UI.init();

	$( document ).keyup( UI.watchKeyPress );

};
 
$( window ).on( 'load', loadFunction );
