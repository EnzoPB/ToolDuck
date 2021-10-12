const {
	app,
	BrowserWindow,
	ipcMain,
	Tray,
	Menu
} = require('electron');
const path = require('path');
const nedb = require('nedb-revived');
const SerialPort = require('serialport');
const { StringStream } = require('scramjet');
const actions = require('./actions.js');

function connectSerial(port) {
	var serialport = new SerialPort(port, { // initialize the serial port connection
		baudRate: 9600,
		parser: new SerialPort.parsers.Readline('\r\n')
	});

	serialport.on('open', () => { // when the serial port is opened
		serialport.pipe(new StringStream)
			.lines('\r\n') // read data until a new line
			.each(data => { // process the data
				data = data.split('/'); // data format: dataType/data

				db.buttons.loadDatabase(); // update the database
				db.buttons.findOne({ id: parseInt(data[1]) }, (err, button) => { // find the button in the database
					if (err) throw err;
					switch (data[0]) { // depending on the type of action
						case 'buttonPush': // if the button is released after a short press
							buttonPush(button);
							break;
						case 'buttonHold': // if the button is pressed for a long time (1 sec)
							buttonHold(button);
							break;
					}
				});
			});
	});
}

var db = { // load the databases
	buttons: new nedb({
		filename: path.join(app.getPath('userData'), 'buttons.db'),
		autoload: true
	})
};

var mainWindow;
var audioEngineWindow;
var audioEngineDevtoolWindow;
var tray;

function createAudioEngineWindow() {
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
	});

	audioEngineWindow.loadFile('audioEngine/audioEngine.html'); // load the html document
}

function createMainWindow() {
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

	tray.setContextMenu(Menu.buildFromTemplate([ // only keep the "quit" button from the tray menu
		{ label: 'Quit', role: 'quit' }
	]));

	mainWindow.once('close', () => {
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
	tray = new Tray(path.join(__dirname, 'icon.png')); // create the tray object
	tray.setToolTip('ToolDuck');
}

app.whenReady().then(() => {
	createTrayMenu(); // create the tray menu

	connectSerial('COM5'); // Connect the device's serial port and start the listener

	createAudioEngineWindow(); // Create the audioEngine window
	createMainWindow(); // Create the main window
});

ipcMain.on('openManageButtonDialog', (event, button) => { // trigerred when the user clicks on a button (to modify or create one)
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

ipcMain.on('reloadAudioEngine', event => { // when the user clicks the reload audio engine button in the settings
	audioEngineWindow.reload();
});

ipcMain.on('toggleAudioEngineConsole', event => { // when the user clicks the toggle audio engine console button in the settings
	if (audioEngineDevtoolWindow == null) { // if the window is not opened
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

function buttonPush(button) { // when a button is clicked
	if (button != null) {
		switch (button.action) { // execute the action
			case 'keybind':
				actions.keybind();
				break;
			case 'command':
				actions.command();
				break;
			case 'soundboardPlay':
				actions.soundboardPlay(audioEngineWindow, button.actionData.fileName, button.actionData.volume);
				break;
			case 'soundboardStop':
				actions.soundboardStop(audioEngineWindow);
				break;
			case 'sampler':
				actions.samplerPush(audioEngineWindow, button);
				break;
		}
	}
}

function buttonHold(button) {
	if (button != null) {
		switch (button.action) { // execute the action
			case 'sampler':
				actions.samplerHold(audioEngineWindow, button);
				break;
		}
	}
}