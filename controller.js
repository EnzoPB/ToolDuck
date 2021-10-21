const app = require('electron').app;
const path = require('path');
const nedb = require('nedb-revived');
const SerialPort = require('serialport');
const { StringStream } = require('scramjet');

function log(data) {
	console.log('[controller]', data);
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

module.exports = controller = {};

controller.getSerialPort = callback => {
	db.settings.loadDatabase(); // update the database
	db.settings.findOne({ setting: 'serialPort' }, (err, setting) => { // get the serial port from the settings database
		if (err) throw err;

		if (setting == null) { // if the setting isn't set in the database

			SerialPort.list().then( // we fetch the list of connected serial devices
				ports => {
					ports.forEach(port => {
						if (['2341', '2886'].includes(port.vendorId)) { // if the vendorId is arduino
							callback(port.path); // we return the value
							return;
						} else { // no corresponding device has been found
							return;
						}
					});
				},
				err => {
					throw err;
				}
			)
		} else {
			callback(setting.value); // we are going to connect to the setting's value
			return;
		}
	});
}

var serialport;
controller.connect = (callback = () => {}) => {
	controller.getSerialPort(port => { // fetch the controller
		log('Connecting to serial port ' + port)
		serialport = new SerialPort(port, { // initialize the serial port connection
			baudRate: 9600,
			autoOpen: false,
			parser: new SerialPort.parsers.Readline('\r\n')
		});
	
		serialport.open(() => { // when the serial port is opened
			log('Serial connected');
			callback();
			controller.updateConfig(); // update the controller config 
			controller.handleData(); // create the data handler

			serialport.on('error', err => {
				throw err;
			});
		});
	});
}

controller.disconnect = (callback = () => {}) => {
	log('Disconnecting serial...');
	if (typeof serialport == 'undefined') {
		callback();
	} else {
		serialport.close(callback);
	}
}

controller.reconnect = () => {
	log('Reconnecting serial...');
	controller.disconnect(() => {
		controller.connect();
	});
}

controller.handleData = () => {
	serialport.pipe(new StringStream).lines('\r\n').each(data => { // for each line (split the data with \r\n)
		data = data.split('/'); // data format: dataType/data

		db.buttons.loadDatabase(); // update the database
		db.buttons.findOne({ id: parseInt(data[1]) }, (err, button) => { // find the button in the database
			if (err) throw err;

			switch (data[0]) { // depending on the type of action
				case 'buttonPush': // if the button is released after a short press
					controller.pushHandler(button);
					break;
				case 'buttonHold': // if the button is pressed for a long time (1 sec by default)
					controller.holdHandler(button);
					break;
			}
		});
	});
}

controller.updateConfig = () => {
	log('Updating config');

	db.settings.loadDatabase(); // update the database
	db.settings.findOne({ setting: 'buttonHoldTimer' }, (err, setting) => { // get the config from the settings database
		if (err) throw err;
		
		if (typeof(setting.value) == 'undefined') { // if the setting isn't set in the database
			buttonHoldTimer = 1; // set it to 1s by default
		} else {
			buttonHoldTimer = setting.value; // otherwise set it to the value found in the database
		}
		log('config: buttonHoldTimer: ' + buttonHoldTimer)

		serialport.write('buttonHoldTimer/' + buttonHoldTimer*1000 + '\n'); // send the config to the controller
	});
}

controller.getStatus = callback => { // get the current controller status, connected or not
	if (typeof serialport == 'undefined') { // if the serial is not initialized yet
		callback(false); // return "false" (using callback because the rest of the function is asynchronous)
		return;
	}
	if (serialport.isOpen) { // we could just use this variable, but sometimes it returns false, while the connection is opened, and data can be transmitted. so we only trust it if returns true
		callback(true); // return true
		return;
	}

	var writeResult = false;
	serialport.write('\n', () => { // we try to write something to the serial, the callback only triggers if the write was successful
		callback(true); // return true
		writeResult = true;
	});

	setTimeout(() => { // after 1 sec, we check if the connection was successful (serialport doesn't have a error callback)
		if (!writeResult) { // if the write was not successful
			callback(false); // return false
		}
	}, 1000);
}