function keybind() {}

function command() {}

function soundboardPlay(audioEngineWindow, fileName, volume) {
	audioEngineWindow.webContents.send('soundboardPlay', {
		fileName: fileName,
		volume: volume
	});
}

function soundboardStop(audioEngineWindow) {
	audioEngineWindow.webContents.send('soundboardStop');
}

function samplerPush(audioEngineWindow, button) {
	audioEngineWindow.webContents.send('samplerPush', button);
}

function samplerHold(audioEngineWindow, button) {
	audioEngineWindow.webContents.send('samplerHold', button);
}

module.exports = {
	keybind: keybind,
	command: command,
	soundboardPlay: soundboardPlay,
	soundboardStop: soundboardStop,
	samplerPush: samplerPush,
	samplerHold: samplerHold
};