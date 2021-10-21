function keybind() {}

var actions = {};

actions.keybind = () => {}

actions.command = () => {}

actions.soundboardPlay = (audioEngineWindow, fileName, volume) => {
	audioEngineWindow.webContents.send('soundboardPlay', {
		fileName: fileName,
		volume: volume
	});
}

actions.soundboardStop = audioEngineWindow => {
	audioEngineWindow.webContents.send('soundboardStop');
}

actions.samplerPush = (audioEngineWindow, button) => {
	audioEngineWindow.webContents.send('samplerPush', button);
}

actions.samplerHold = (audioEngineWindow, button) => {
	audioEngineWindow.webContents.send('samplerHold', button);
}

module.exports = _actions = {
	buttonPush: button => { // when a button is clicked
		if (button != null) {
module.exports = {
	keybind: keybind,
	command: command,
	soundboardPlay: soundboardPlay,
	soundboardStop: soundboardStop,
	samplerPush: samplerPush,
	samplerHold: samplerHold
};
			switch (button.action) { // execute the action
				case 'keybind':
					actions.keybind();
					break;
				case 'command':
					actions.command();
					break;
				case 'soundboardPlay':
					actions.soundboardPlay(_actions.audioEngineWindow, button.actionData.fileName, button.actionData.volume);
					break;
				case 'soundboardStop':
					actions.soundboardStop(_actions.audioEngineWindow);
					break;
				case 'sampler':
					actions.samplerPush(_actions.audioEngineWindow, button);
					break;
			}
		}
	},
	
	buttonHold: button => {
		if (button != null) {

			switch (button.action) { // execute the action
				case 'sampler':
					actions.samplerHold(_actions.audioEngineWindow, button);
					break;
			}
		}
	}
}