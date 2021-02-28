const {
	app,
	BrowserWindow,
	ipcMain
} = require('electron');
const path = require('path');
const fs = require('fs');
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
var soundboardWindow;

const buttonImagesPath = path.join(app.getPath('userData'), 'buttonImages');
if (!fs.existsSync(buttonImagesPath)) { // check if the directory used to store buttons images exists
	fs.mkdirSync(buttonImagesPath); // if not, create it
}

function createWindows() {
	mainWindow = new BrowserWindow({ // Create the main window
		width: 900,
		height: 600,
		icon: path.join(__dirname, 'icon.ico'),
		backgroundColor: '#1C1E2C',
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		}
	});
	mainWindow.setMenuBarVisibility(false); // hide the menu bar
	mainWindow.loadFile(path.join(__dirname, 'www', 'main.html')); // load the html document

	
	soundboardWindow = new BrowserWindow({ // Create the soundboard window (not actually a window, more information in www/soundboard.html)
		width: 0,
		height: 0,
		title: 'Soundboard', // Put a title, sometimes shows in certain OS's multimedia manager
		transparent: true,
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		}
	});
	soundboardWindow.loadFile(path.join(__dirname, 'soundboard.html')); // load the html documnt
	soundboardWindow.hide(); // hide the window
	

	if (debug) {
		soundboardWindow.toggleDevTools(); // open the devtool if the debug option is active
	}
}
  
app.whenReady().then(createWindows); // create the main windows
  
app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length == 0) {
		createWindows();
	}
});

ipcMain.on('openManageButtonDialog', (event, button) => { // trigerred when th user clicks on a button (to modify or create one)
	const manageButtonWindow = new BrowserWindow({ // create the window
		parent: mainWindow,
		modal: true,
		width: 330,
		height: 450,
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
	db.buttons.findOne({pos: parseInt(button)}, (err, button) => { // find the button in the database
		if (err) throw err;

		switch (button.action) { // execute the action
			case 'keybind':
				
				break;
			case 'command':
				
				break;
			case 'web':
				
				break;
			case 'soundboardPlay':
				soundboardWindow.webContents.send('soundboardPlay', button.actionData.sound);
				break;
			case 'soundboardStop':
				soundboardWindow.webContents.send('soundboardStop');
				break;
		}
	});
}


const express = require('express'); // import the module
const expressApp = express();

expressApp.use('/images', express.static(path.join(app.getPath('userData'), 'buttonImages')));
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