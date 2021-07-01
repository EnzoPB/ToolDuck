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

module.exports = {
	keybind: keybind,
	command: command,
	soundboardPlay: soundboardPlay,
	soundboardStop: soundboardStop,
};