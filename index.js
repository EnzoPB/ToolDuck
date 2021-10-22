const {
	app,
	BrowserWindow,
	ipcMain,
	Tray,
	Menu
} = require('electron');
const path = require('path');
const nedb = require('nedb-revived');
const controller = require('./controller.js');
const actions = require('./actions.js');

controller.pushHandler = actions.buttonPush;
controller.holdHandler = actions.buttonHold;

function log(data) {
	console.log('[main]', data);
}

var db = { // load the databases
	buttons: new nedb({
		filename: path.join(app.getPath('userData'), 'buttons.db'),
		autoload: true
	}),
	settings: new nedb({
		filename: path.join(app.getPath('userData'), 'settings.db'),
		autoload: true
	})
};

var mainWindow;
var audioEngineWindow;
var audioEngineDevtoolWindow;
var tray;

function createAudioEngineWindow() {
	log('Creating audio engine window');
	audioEngineWindow = new BrowserWindow({ // Create the audioEngine window (not actually a window, more information in audioEngine.html)
		width: 0,
		height: 0,
		frame: 0,
		transparent: true,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true
		}
	});

	audioEngineWindow.once('ready-to-show', function() { // we make this because sometimes this window doesn't hide properly, so we have to make it invisible first, and then hide it (not the same thing for electron)
		audioEngineWindow.hide(); // and then we hide it
		actions.audioEngineWindow = audioEngineWindow; // we send it to the actions module (used to trigger the soundboard)
	});

	audioEngineWindow.loadFile('audioEngine/audioEngine.html'); // load the html document
}

function createMainWindow(callback) {
	log('Creating main window');
	mainWindow = new BrowserWindow({ // Create the main window
		width: 1000,
		height: 400,
		icon: path.join(__dirname, 'icon.png'),
		backgroundColor: '#1C1E2C',
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true
		}
	});
	mainWindow.setMenuBarVisibility(false); // hide the menu bar
	mainWindow.loadFile(path.join(__dirname, 'www', 'main.html')); // load the html document

	mainWindow.once('ready-to-show', () => { // once the window has finished loading
		callback();
	});

	tray.setContextMenu(Menu.buildFromTemplate([ // only keep the "quit" button from the tray menu
		{ label: 'Quit', role: 'quit' }
	]));

	mainWindow.once('close', () => {
		log('main window closed, updating tray');
		tray.setContextMenu(Menu.buildFromTemplate([{
				label: 'Show',
				click: () => { // put back the "show window" button in the tray menu, because the window is not visible anymore
					createMainWindow();
				}
			},
			{ label: 'Quit', role: 'quit' }
		]));
		mainWindow = null;
	});
}

function createTrayMenu() {
	log('Creating tray menu');
	tray = new Tray(path.join(__dirname, 'icon.png')); // create the tray object
	tray.setToolTip('ToolDuck');
}

app.whenReady().then(() => {
	log('App ready');
	createTrayMenu(); // create the tray menu

	createAudioEngineWindow(); // Create the audioEngine window
	createMainWindow(() => {
		log('main window created, connecting to serial');
		controller.connect(); // Connect the controller's serial port and start the data listener
	}); // Create the main window
});

app.once('quit', () => { // when the app is closing
	log('Closing app');
	controller.disconnect(); // close the serial (if we don't do this windows can think we are still using the serial port)
});

ipcMain.on('openManageButtonDialog', (event, button) => { // trigerred when the user clicks on a button (to modify or create one)
	log('Creating manage button window for button ' + button.id);
	const manageButtonWindow = new BrowserWindow({ // create the window
		parent: mainWindow,
		modal: true,
		width: 330,
		height: 450,
		backgroundColor: '#1C1E2C',
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true
		}
	});
	manageButtonWindow.setMenuBarVisibility(false); // hide the menu bar

	manageButtonWindow.loadFile(path.join(__dirname, 'www', 'manageButton.html')); // load the html document

	ipcMain.once('getButton', event => { // when the manageButton window asks for the button that needs to be modified
		event.returnValue = button;
	});

	manageButtonWindow.once('closed', () => { // when the manageButton window is closed, tell the mainWindow that the modifications have been submitted, so it updates the button list
		event.returnValue = true;
	});
});

ipcMain.on('openSettingsWindow', event => {
	log('Opening settings window');
	const settingsWindow = new BrowserWindow({ // create the window
		parent: mainWindow,
		modal: true,
		width: 550,
		height: 500,
		backgroundColor: '#1C1E2C',
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true
		}
	});
	settingsWindow.setMenuBarVisibility(false); // hide the menu bar

	settingsWindow.loadFile(path.join(__dirname, 'www', 'settings.html')); // load the html document

	settingsWindow.once('closed', () => { // when the window is closed, tell the mainWindow that the modifications have been submitted
		event.returnValue = true;
	});
});

ipcMain.on('reloadAudioEngine', event => { // when the user clicks the reload audio engine button in the settings or when the save button in the settings are saved
	log('Reloading audio engine');
	audioEngineWindow.reload();
});

ipcMain.on('toggleAudioEngineConsole', event => { // when the user clicks the toggle audio engine console button in the settings
	log('Toggling audio engine console');
	if (audioEngineDevtoolWindow == null || audioEngineDevtoolWindow.isDestroyed()) { // if the window is not opened
		audioEngineDevtoolWindow = new BrowserWindow({ // create it, not using openDevTool directly because we want to make sure the devTool opens in a separate window
			title: 'ToolDuck Audio Engine',
			icon: path.join(__dirname, 'icon.png')
		});
		audioEngineWindow.webContents.setDevToolsWebContents(audioEngineDevtoolWindow.webContents); // set the window content to the devtool content
		audioEngineWindow.webContents.openDevTools({mode: 'detach'}); // open the devtool in "detach" mode
	} else { // if the window is already opened
		audioEngineDevtoolWindow.close(); // close it
		audioEngineDevtoolWindow = null;
	}
});

ipcMain.on('getControllerStatus', event => { // get the current status of the serial
	event.returnValue = controller.getStatus(status => {
		event.returnValue = status;
	});
});

ipcMain.on('reconnectController', event => { // when the users clicks the reconnect button (only when the controller is not connected)
	controller.reconnect();
});

ipcMain.on('updateConfig', event => { // when the user clicks the reload audio engine button in the settings
	controller.updateConfig();
});