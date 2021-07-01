const { ipcRenderer } = require('electron');

var buttonsSamplers = { // blobs containing the audio data for each button (false if no data)
	0: false,
	1: false,
	2: false,
	3: false,
	4: false,
	5: false
};

var buttonsRecorders;

var buttonsDataArrays = { // arrays where the audio data are stored during the recording
	0: [],
	1: [],
	2: [],
	3: [],
	4: [],
	5: []
}

function initSampler() { // function called when the audioManager has finished loading
	buttonsRecorders = { // MediaRecorder element for each buttons (we don't use a single on for every button to avoid problems if 2 buttons are pressed at the same time)
		0: new MediaRecorder(microphoneStream), // we tell the MediaRecorder to record the microphone
		1: new MediaRecorder(microphoneStream),
		2: new MediaRecorder(microphoneStream),
		3: new MediaRecorder(microphoneStream),
		4: new MediaRecorder(microphoneStream),
		5: new MediaRecorder(microphoneStream)
	};
	console.log('[sampler] sampler initialization done');
}

ipcRenderer.on('samplerPush', (event, button) => { // if a button with the action "sampler" is pressed
	let recorder = buttonsRecorders[button.id]; // just to avoid writing buttonsRecorders[button.id] every time 

	if (buttonsSamplers[button.id]) { // if there is a sample existing for that button
		console.log(`[sampler] playing sample for button #${button.id}`);
		playSound(buttonsSamplers[button.id], 80); // play the sample, 80% volume
	} else { // if there is no sample for that button
		if (recorder.state == 'recording') { // if the recording is already recording
			recorder.stop(); // stop the recording
			recorder.onstop = () => { // the recorder takes some times to properly finish, so we have to wait until onstop is trigered
				let audioData = new Blob(buttonsDataArrays[button.id], { 'type': 'audio/mp3;' }); // store the data in a blob
				buttonsDataArrays[button.id] = []; // empty the data array
				buttonsSamplers[button.id] = window.URL.createObjectURL(audioData); // create the blob's URL and store it
				console.log(`[sampler] recording finished for button #${button.id}, audioData=`, audioData);
			}
		} else { // if the recorder is not recording yet
			recorder.ondataavailable = ev => { // when the recorder captures data
				buttonsDataArrays[button.id].push(ev.data); // store the data in the data array
			}
			recorder.start(); // start the recording
			console.log(`[sampler] started recording for button #${button.id}`);
		}
	}
});

ipcRenderer.on('samplerHold', (event, button) => { // if a button with the action "sampler" is held down
	if (buttonsSamplers[button.id] || buttonsDataArrays[button.id] != []) { // if there is data, either in the blob or in the data array
		let recorder = buttonsRecorders[button.id];
		console.log(`[sampler] deleting sample for button #${button.id}`);
		if (recorder.state == 'recording') { // if it is recording
			recorder.stop(); // stop the recording
			buttonsDataArrays[button.id] = []; // and empty the data array
		}
		buttonsSamplers[button.id] = false; // empty the blob
	}
});

module.exports = {
	initSampler: initSampler
}