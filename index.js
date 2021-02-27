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

var db = {
	buttons: new nedb({ filename: path.join(app.getPath('userData'), 'buttons.db'), autoload: true })
};

var mainWindow;
var soundboardWindow;

const buttonImagesPath = path.join(app.getPath('userData'), 'buttonImages');
if (!fs.existsSync(buttonImagesPath)) {
	fs.mkdirSync(buttonImagesPath);
}
const soundsPath = path.join(app.getPath('userData'), 'sounds');
if (!fs.existsSync(soundsPath)) {
	fs.mkdirSync(soundsPath);
}

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 900,
		height: 600,
		icon: path.join(__dirname, 'www', 'assets', 'images', 'logo.png'),
		backgroundColor: '#1C1E2C',
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		}
	});
	mainWindow.setMenuBarVisibility(false);
	mainWindow.loadFile(path.join(__dirname, 'www', 'main.html'));

	
	soundboardWindow = new BrowserWindow({
		width: 0,
		height: 0,
		title: 'Soundboard',
		transparent: true,
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		}
	});
	soundboardWindow.loadFile(path.join(__dirname, 'soundboard.html'));
	soundboardWindow.hide();
	

	if (debug) {
		soundboardWindow.toggleDevTools();
	}
}
  
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
	if (process.platform != 'darwin') {
		app.quit();
	}
});
  
app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length == 0) {
		createWindow();
	}
});

ipcMain.on('openManageButtonDialog', (event, button) => {
	const manageButtonWindow = new BrowserWindow({
		parent: mainWindow,
		modal: true,
		width: 330,
		height: 450,
		icon: path.join(__dirname, 'www', 'assets', 'images', 'logo_cropped.png'),
		backgroundColor: '#1C1E2C',
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		}
	});
	manageButtonWindow.setMenuBarVisibility(false);

	manageButtonWindow.loadFile(path.join(__dirname, 'www', 'manageButton.html'));

	ipcMain.once('getButton', event => {
		event.returnValue = button;
	});

	manageButtonWindow.once('closed', () => {
		event.returnValue = true;
	});
});


function doAction(button) {
	db.buttons.loadDatabase();
	db.buttons.findOne({pos: parseInt(button)}, (err, button) => {
		if (err) throw err;

		switch (button.action) {
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


const express = require('express');
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