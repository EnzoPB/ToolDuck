function keybind() {}

function command() {}

function soundboardPlay(audioManagerWindow, fileName, volume) {
	audioManagerWindow.webContents.send('soundboardPlay', {
		fileName: fileName,
		volume: volume
	});
}

function soundboardStop(audioManagerWindow) {
	audioManagerWindow.webContents.send('soundboardStop');
}

function samplerPush(audioManagerWindow, button) {
	audioManagerWindow.webContents.send('samplerPush', button);
}

function samplerHold(audioManagerWindow, button) {
	audioManagerWindow.webContents.send('samplerHold', button);
}

module.exports = {
	keybind: keybind,
	command: command,
	soundboardPlay: soundboardPlay,
	soundboardStop: soundboardStop,
	samplerPush: samplerPush,
	samplerHold: samplerHold
};