const {
	ipcRenderer,
	remote
} = require('electron');
const { dialog } = remote;

var speaker;
var virtual;

var runningSounds = [];

navigator.mediaDevices.enumerateDevices().then(deviceInfos => {
	console.log('mediaDevices: ', deviceInfos);
	for (let i = 0; i !== deviceInfos.length; ++i) {
		const deviceInfo = deviceInfos[i];
		if (deviceInfo.kind === 'audiooutput') {
			if (deviceInfo.label == 'Cable Input (VB-Audio Virtual Cable)' || deviceInfo.label == 'ToolDuckAudioSink') {
				console.log('Detected virtual audio device: ', deviceInfo);
				virtual = deviceInfo;

				console.log('Creating microphone stream and redirecting it to the virtual audio device');
				if (window.stream) {
					window.stream.getTracks().forEach(track => {
						track.stop();
					});
				}



			} else if (deviceInfo.label == 'Audio interne Stéréo analogique') {
				console.log('Detected speaker audio device: ', deviceInfo);
				speaker = deviceInfo;
			}
		} else if (deviceInfo.kind == 'audioinput') {
			if (deviceInfo.label == 'Audio interne Stéréo analogique') {
				console.log('Detected microphone: ', deviceInfo);

				navigator.mediaDevices.getUserMedia({
					audio: {
						deviceId: {
							exact: deviceInfo.deviceId
						}
					},
					video: false
				}).then(stream => {
					console.log('Microphone stream: ', stream)
					window.stream = stream;
					window.audioStreamElement = new Audio();
					window.audioStreamElement.srcObject = stream;
					window.audioStreamElement.setSinkId(virtual.deviceId).then(() => {
						window.audioStreamElement.play();
					}).catch(e => {
						console.error(e);
					});
				}).catch(e => {
					console.error(e);
				});
			}
		}
	}
}).catch(e => {
	console.error(e)
});

ipcRenderer.on('soundboardPlay', (event, data) => {
	console.log('Playing ', data.fileName);
	if (typeof virtual == 'undefined') {
		dialog.showMessageBox({
			type: 'error',
			title: 'AudioManager',
			message: 'Aucun périphérique audio virtuel n\'est installé.'
		});
	}

	var speakerAudioElement = new Audio();
	console.log('speakerAudioElement: ', speakerAudioElement);
	var virtualAudioElement = new Audio();
	console.log('virtualAudioElement: ', virtualAudioElement);

	runningSounds.push(speakerAudioElement);
	runningSounds.push(virtualAudioElement);

	speakerAudioElement.src = data.fileName;
	virtualAudioElement.src = data.fileName;

	speakerAudioElement.volume = data.volume / 100;
	virtualAudioElement.volume = data.volume / 100;

	speakerAudioElement.addEventListener('ended', () => {
		runningSounds.splice(runningSounds.indexOf(speakerAudioElement), 1);
		runningSounds.splice(runningSounds.indexOf(virtualAudioElement), 1);
	});

	speakerAudioElement.setSinkId(speaker.deviceId).then(() => {
		speakerAudioElement.play();
	}).catch(handleError);

	virtualAudioElement.setSinkId(virtual.deviceId).then(() => {
		virtualAudioElement.play();
	}).catch(handleError);
});

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
		title: 'AudioManager - Erreur',
		message: e.message
	});
	console.error(e);
}