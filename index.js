const {
	app,
	BrowserWindow,
	ipcMain,
	Tray,
	Menu
} = require('electron');
const path = require('path');
const nedb = require('nedb');

var debug = false;
if (process.argv.includes('debug')) {
	debug = true;
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
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		}
	});
	audioManagerWindow.loadFile('audioManager.html'); // load the html document
	audioManagerWindow.hide(); // hide the window

	if (debug) {
		audioManagerWindow.webContents.openDevTools();
	}
}

function createMainWindow() {
	mainWindow = new BrowserWindow({ // Create the main window
		width: 900,
		height: 450,
		icon: path.join(__dirname, 'icon.png'),
		backgroundColor: '#1C1E2C',
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
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

	createAudioManagerWindow(); // Create the audioManager window
	setTimeout(() => { // This makes sure that the mainWindow is created after the mainWindow, otherwise it makes a bug where the audioManager's window is not hidden
		createMainWindow(); // Create the main window
	}, 500);
});

ipcMain.on('openManageButtonDialog', (event, button) => { // trigerred when th user clicks on a button (to modify or create one)
	const manageButtonWindow = new BrowserWindow({ // create the window
		parent: mainWindow,
		modal: true,
		width: 330,
		height: 400,
		backgroundColor: '#1C1E2C',
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
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


function doAction(button) { // when a button is clicked
	db.buttons.loadDatabase(); // update the database
	db.buttons.findOne({ pos: parseInt(button) }, (err, button) => { // find the button in the database
		if (err) throw err;

		switch (button.action) { // execute the action
			case 'keybind':

				break;
			case 'command':

				break;
			case 'soundboardPlay':
				audioManagerWindow.webContents.send('soundboardPlay', button.actionData.sound);
				break;
			case 'soundboardStop':
				audioManagerWindow.webContents.send('soundboardStop');
				break;
		}
	});
}


const express = require('express'); // import the module
const expressApp = express();

expressApp.use('/assets', express.static(path.join(__dirname, 'www', 'assets')));

expressApp.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'webApp.html'));
});

expressApp.get('/doAction/:button', (req, res) => {
	doAction(req.params.button);
	res.end();
});

expressApp.get('/getButtons', (req, res) => {
	res.setHeader('content-type', 'application/json');
	db.buttons.loadDatabase();
	db.buttons.find({}, (err, buttons) => {
		if (err) throw err;
		res.end(JSON.stringify(buttons));
	});
});

expressApp.listen(4242);