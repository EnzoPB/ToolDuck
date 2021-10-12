const {
	ipcRenderer,
	remote
} = require('electron');
const sampler = require('./sampler.js');
const { dialog } = remote;
const path = require('path');
const nedb = require('nedb-revived');

var db = {
	settings: new nedb({ filename: path.join(remote.app.getPath('userData'), 'settings.db'), autoload: true })
};

var speakerDeviceId;
var virtualDeviceId;
var microphoneDeviceId;

var speakerDevice;
var virtualDevice;
var microphoneDevice;

var microphoneStream;
var microphoneAudioElement;

db.settings.findOne({ setting: 'audioOutput' }, (err, setting) => {
	if (err) throw err;
	speakerDeviceId = setting.value;
	console.log('speakerDeviceId:', speakerDeviceId);

	db.settings.findOne({ setting: 'audioCable' }, (err, setting) => {
		if (err) throw err;
		virtualDeviceId = setting.value;
		console.log('virtualDeviceId:', virtualDeviceId);

		db.settings.findOne({ setting: 'audioInput' }, (err, setting) => {
			if (err) throw err;
			microphoneDeviceId = setting.value;
			console.log('microphoneDeviceId:', microphoneDeviceId);

			init();
		});
	});
});

function init() {
	navigator.mediaDevices.enumerateDevices().then(devices => {
		console.log('mediaDevices: ', devices);
		devices.forEach((device, index, array) => {
			if (speakerDeviceId == device.deviceId) {
				console.log('Detected speaker audio device: ', device);
				speakerDevice = device;
			}

			if (virtualDeviceId == device.deviceId) {
				console.log('Detected virtual audio device: ', device);
				virtualDevice = device;
			}

			if (microphoneDeviceId == device.deviceId) {
				console.log('Detected microphone: ', device);
				microphoneDevice = device
			}


			if (index == array.length - 1) {
				if (typeof speakerDevice == 'undefined') {
					dialog.showMessageBox({
						type: 'error',
						title: 'ToolDuck AudioEngine',
						message: 'The output device (speakers) is not properly configured, or is not detected. You can fix that in the settings'
					});
				}

				if (typeof virtualDevice == 'undefined') {
					dialog.showMessageBox({
						type: 'error',
						title: 'ToolDuck AudioEngine',
						message: 'The virtual device (virtual microphone) is not properly configured, or is not detected. You can fix that in the settings. Make sure you have installed one.'
					});
				}

				if (typeof microphoneDevice != 'undefined') {
					navigator.mediaDevices.getUserMedia({
						audio: {
							deviceId: {
								exact: microphoneDeviceId
							}
						}
					}).then(stream => {
						microphoneStream = stream;
						microphoneAudioElement = new Audio();
						microphoneAudioElement.srcObject = stream;
						microphoneAudioElement.setSinkId(virtualDevice.deviceId).then(() => {
							microphoneAudioElement.play();
							console.log('Microphone audio: ', microphoneAudioElement);
							sampler.initSampler();

						}).catch(e => {
							console.error(e);
						});

					}).catch(e => {
						console.error(e);
					});
				} else {
					dialog.showMessageBox({
						type: 'error',
						title: 'ToolDuck AudioEngine',
						message: 'The input device (microphone) is not properly configured, or is not detected. You can fix that in the settings'
					});
				}
			}

		});
	}).catch(e => {
		console.error(e)
	});
}

ipcRenderer.on('soundboardPlay', (event, data) => {
	playSound(data.fileName, data.volume);
});

var runningSounds = [];

function playSound(fileName, volume) {
	console.log('Playing ', fileName);

	var speakerAudioElement = new Audio();
	console.log('speakerAudioElement: ', speakerAudioElement);
	var virtualAudioElement = new Audio();
	console.log('virtualAudioElement: ', virtualAudioElement);

	runningSounds.push(speakerAudioElement);
	runningSounds.push(virtualAudioElement);

	speakerAudioElement.src = fileName;
	virtualAudioElement.src = fileName;

	speakerAudioElement.volume = volume / 100;
	virtualAudioElement.volume = volume / 100;

	speakerAudioElement.addEventListener('ended', () => {
		runningSounds.splice(runningSounds.indexOf(speakerAudioElement), 1);
		runningSounds.splice(runningSounds.indexOf(virtualAudioElement), 1);
	});

	speakerAudioElement.setSinkId(speakerDevice.deviceId).then(() => {
		speakerAudioElement.play();
	}).catch(handleError);

	virtualAudioElement.setSinkId(virtualDevice.deviceId).then(() => {
		virtualAudioElement.play();
	}).catch(handleError);
}

ipcRenderer.on('soundboardStop', () => {
	console.log('Stopping every sounds');
	for (i = 0; i < 4; i++) {
		runningSounds.forEach(audioElement => { // sometimes, the audio doesn't stop, apparently doing it multiple times works
			audioElement.pause();
			runningSounds.splice(runningSounds.indexOf(audioElement), 1);
		});
	}
});

function handleError(e) {
	dialog.showMessageBox({
		type: 'error',
		title: 'AudioEngine - Error',
		message: e.message
	});
	console.error(e);
}