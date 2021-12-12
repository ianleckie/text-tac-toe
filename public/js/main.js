/*
Timing variables
*/
const timing = {
	cursorBlinkSpeed : 250,
	typingSpeed      : 75,
	startGameDelay   : 1400,
	startTypingDelay : 1000,
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

	gameData    : {},
	isPlaying   : false,
	curPlayer   : null,
	curScript   : null,
	useInputMap : null,
	validInput  : /^((y|yes|yeah|ok|sure|n|no|nope|nah)|([a-z]+ (n|s|e|w|north|south|east|west)))$/i,
	movesCount  : 0,
	roundCount  : 0,

	commandMap : {

		yesNo : {
			processCommand : ( input ) => { return input; }, // entire input
			commands : {
				Y : [ 'y', 'yes', 'ok', 'sure', 'yeah' ],
				N : [ 'n', 'no', 'nope', 'nah' ],
			},
		},

		movement : {
			processCommand : ( input ) => { return input.slice( input.indexOf(' ') ).trim(); }, // everything after space
			commands : {
				MN : [ 'n', 'north' ],
				ME : [ 'e', 'east' ],
				MS : [ 's', 'south' ],
				MW : [ 'w', 'west' ],
			},
		},

	},

	inputMap : {

		startGame : {
			commandType : 'yesNo',
			scriptActions : {
				Y : () => { GamePlay.firstTurnLoop( 'start' ); },
				N : () => { GamePlay.cancelGame(); },
			}
		},

		cancelGame : {
			commandType : 'yesNo',
			scriptActions : {
				Y : () => { GamePlay.newGame(); },
				N : () => { GamePlay.startGame(); },
			}
		},

		firstTurn : {
			commandType : 'movement',		
			scriptActions : {
				MN : () => { GamePlay.firstTurnLoop('move', 'N'); },
				ME : () => { GamePlay.firstTurnLoop('move', 'E'); },
				MS : () => { GamePlay.firstTurnLoop('move', 'S'); },
				MW : () => { GamePlay.firstTurnLoop('move', 'W'); },
			}
		},

		playTurn : {
			commandType : 'movement',		
			scriptActions : {
				MN : () => { GamePlay.turnLoop('move', 'N'); },
				ME : () => { GamePlay.turnLoop('move', 'N'); },
				MS : () => { GamePlay.turnLoop('move', 'N'); },
				MW : () => { GamePlay.turnLoop('move', 'N'); },
			}
		},

		win : {
			commandType : 'yesNo',
			scriptActions : {
				Y : () => { GamePlay.startGame(); },
				N : () => { GamePlay.newGame(); },
			}
		},

	},

	init : () => {

		GamePlay.toggleGameMode();
		GamePlay.loadGameData();

		setTimeout( GamePlay.startGame, timing.startGameDelay );

	},

	movePlayer : ( dir ) => {

		// TODO: check proximity, claim room or move and claim random room

		GamePlay.nextPlayer();

		console.log('movePlayer');

	},

	processInput : ( input ) => {

		console.log('processInput');

		let inputOK = false;

		if ( GamePlay.validInput.test( input ) ) {

			let commandType = GamePlay.inputMap[GamePlay.useInputMap].commandType;

			let commandObj = GamePlay.commandMap[commandType];

			let command = commandObj.processCommand( input );

			// loop through commandObj.commands object
			Object.keys( commandObj.commands ).every( ( action ) => {

				if ( commandObj.commands[action].indexOf( command.toLowerCase() ) > -1 ) {

					// if the command is a synonym for one of the script actions, call it
					GamePlay.inputMap[ GamePlay.useInputMap ].scriptActions[ action ]();

					inputOK = true;

				} else {

					// continue loop if not found
					return true;

				}

			});

		}

		if ( !inputOK ) {

			UI.flashScreen();

		}

	},

	newGame : () => {

		console.log('newGame');

		GamePlay.roundCount = 0;

		if ( GamePlay.isPlaying ) GamePlay.toggleGameMode();

		GamePlay.curPlayer = null;

		GamePlay.curScript = 'newGame';

		TextTerminal.typeFromCurScript();

	},

	startGame : () => {

		console.log('startGame');

		GamePlay.useInputMap = GamePlay.curScript = 'startGame';
		
		TextTerminal.typeFromCurScript( TextTerminal.waitForInput );

	},

	cancelGame : () => {

		console.log('cancelGame');

		GamePlay.useInputMap = GamePlay.curScript = 'cancelGame';
		
		TextTerminal.typeFromCurScript( TextTerminal.waitForInput );

	},

	firstTurnLoop : ( mode = 'start', data = null ) => {

		console.log('firstTurnLoop');

		if ( mode == 'start' ) {

			GamePlay.initGameData();

			GamePlay.firstTurnLoop('next');

		} else if ( mode == 'move' ) {

			GamePlay.movesCount++;

			if ( GamePlay.movesCount > 1 ) {

				GamePlay.movesCount = 0;
				
				if ( GamePlay.processRound() ) GamePlay.firstTurnLoop('end');
				
				return true;
			
			}

			GamePlay.movePlayer(data);
		
			TextTerminal.typeFromCurScript( TextTerminal.waitForInput );

		} else if ( mode == 'next' ) {

			GamePlay.nextPlayer();

			GamePlay.playFirstTurn();

		} else if ( mode == 'end' ) {

			GamePlay.playTurn();

		}

	},

	turnLoop : ( mode = 'start', data = null ) => {

		console.log('turnLoop');

		if ( mode == 'start' ) {

			GamePlay.initGameData();

			GamePlay.firstTurnLoop('next');

		} else if ( mode == 'move' ) {

			GamePlay.movesCount++;

			if ( GamePlay.movesCount > 1 ) {

				GamePlay.movesCount = 0;
				
				if ( GamePlay.processRound() ) {

					GamePlay.firstTurnLoop('end');
				
					return true;

				} else {

					return false;

				}
			
			}

			GamePlay.movePlayer(data);
		
			TextTerminal.typeFromCurScript( TextTerminal.waitForInput );

		} else if ( mode == 'next' ) {

			GamePlay.nextPlayer();

			GamePlay.playFirstTurn();

		} else if ( mode == 'end' ) {

			GamePlay.playTurn();

		}

	},

	playFirstTurn : () => {

		console.log('playFirstTurn');

		GamePlay.useInputMap = GamePlay.curScript = 'firstTurn';
		
		TextTerminal.typeFromCurScript( TextTerminal.waitForInput );

	},

	playTurn : ( dir ) => {

		console.log('playTurn');

		GamePlay.movePlayer( dir );

		GamePlay.useInputMap = GamePlay.curScript = 'playTurn';
		
		TextTerminal.typeFromCurScript( TextTerminal.waitForInput );

	},

	nextPlayer : () => {

		console.log('nextPlayer');

		GamePlay.curPlayer = Number( ( GamePlay.curPlayer == null ) ? 0 : !GamePlay.curPlayer );

		console.log( GamePlay.curPlayer );

	},

	processRound : () => {

		console.log('processRound');

		GamePlay.roundCount ++;

		if ( GamePlay.roundCount > 6 ) {
			
			GamePlay.winGame();
			
			return false;
		
		} else {
			
			return true;
		
		}

	},

	isWinner : () => {

		console.log('isWinner');

	},

	winGame : () => {

		console.log('winGame');

		GamePlay.useInputMap = GamePlay.curScript = 'win';
		
		TextTerminal.typeFromCurScript( TextTerminal.waitForInput );

	},

	playAgain : () => {

		console.log('playAgain');

	},

	loadGameData : () => {

		console.log('loadGameData');

		$.getJSON( 'js/gameData.json', ( json ) => {

			GamePlay.gameData = json;

		});

	},

	initGameData : () => {

		console.log('initGameData');

		GamePlay.randomizePlayerPositions();

	},

	/*
	Set random player positions
	*/
	randomizePlayerPositions : () => {

		console.log('randomizePlayerPositions');

		// pick a random room for each player
		GamePlay.gameData.players.forEach( ( player ) => {

			let roomNames = Object.keys( GamePlay.gameData.rooms );

			let room = roomNames[ roomNames.length * Math.random() << 0 ];

			player.room = room;

		});

		// if the players are too close, try again
		if ( GamePlay.playersTooClose() ) {

			GamePlay.randomizePlayerPositions();

		}

	},

	/*
	Players are too close if the player positions are the same, or only one room away from each other
	*/
	playersTooClose : () => {

		let roomOneCoords = GamePlay.gameData.rooms[ GamePlay.gameData.players[0].room ].position;
		let roomTwoCoords = GamePlay.gameData.rooms[ GamePlay.gameData.players[1].room ].position;

		return ( 
			( roomOneCoords[0] == roomTwoCoords[0] && Math.abs( roomOneCoords[1] - roomTwoCoords[1] ) < 2 ) ||
			( roomOneCoords[1] == roomTwoCoords[1] && Math.abs( roomOneCoords[0] - roomTwoCoords[0] ) < 2 )
		);
		
	},

	toggleGameMode : () => {

		GamePlay.isPlaying = !GamePlay.isPlaying;

		$('#game').toggleClass( 'playing' );
	
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
	typeFromCurScript : ( callback = false, clearScreen = true ) => {

		// TODO: pass variables object to script, serve scripts via PHP using mustache

		let filePath = TextTerminal.scriptPath + GamePlay.curScript + TextTerminal.scriptExt;

		TextTerminal.typeFromFile( filePath, callback, clearScreen );

	},

	/*
	Reads script from file, then send the contents to typeText
	*/
	typeFromFile : ( filePath, callback = false, clearScreen = true ) => {

		TextTerminal.callback = callback;

		$.get( filePath, ( text ) => {

			if ( clearScreen ) TextTerminal.clearScreen();

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
