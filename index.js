const {
	app,
	BrowserWindow,
	ipcMain,
	Tray,
	Menu
} = require('electron');
const path = require('path');
const nedb = require('nedb');
const SerialPort = require('serialport');
const { StringStream } = require('scramjet');
const actions = require('./actions.js');

var debug = true;
if (process.argv.includes('debug')) {
	debug = true;
}

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
var audioManagerWindow;
var tray;

function createAudioManagerWindow() {
	audioManagerWindow = new BrowserWindow({ // Create the audioManager window (not actually a window, more information in audioManager.html)
		width: 0,
		height: 0,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true
		}
	});

	audioManagerWindow.once('ready-to-show', function() { // we make this because sometimes this window doesn't hide properly, we make this so it show for a very short time (the size is 0x0 so it is almost invisible)
		audioManagerWindow.hide(); // and then we hide it
	});

	audioManagerWindow.loadFile('audioManager/audioManager.html'); // load the html document

	if (debug) {
		audioManagerWindow.webContents.openDevTools();
	}
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

	createAudioManagerWindow(); // Create the audioManager window
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

ipcMain.on('openSettingsDialog', event => {
	const settingsDialog = new BrowserWindow({ // create the window
		parent: mainWindow,
		modal: true,
		width: 500,
		height: 400,
		backgroundColor: '#1C1E2C',
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true
		}
	});
	settingsDialog.setMenuBarVisibility(false); // hide the menu bar

	settingsDialog.loadFile(path.join(__dirname, 'www', 'settings.html')); // load the html document

	settingsDialog.once('closed', () => { // when the window is closed, tell the mainWindow that the modifications have been submitted
		event.returnValue = true;
	});
});

ipcMain.on('reloadAudioManager', event => {
	audioManagerWindow.reload();
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
				actions.soundboardPlay(audioManagerWindow, button.actionData.fileName, button.actionData.volume);
				break;
			case 'soundboardStop':
				actions.soundboardStop(audioManagerWindow);
				break;
			case 'sampler':
				actions.samplerPush(audioManagerWindow, button);
				break;
		}
	}
}

function buttonHold(button) {
	if (button != null) {
		switch (button.action) { // execute the action
			case 'sampler':
				actions.samplerHold(audioManagerWindow, button);
				break;
		}
	}
}