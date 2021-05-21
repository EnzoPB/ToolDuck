const {
	ipcRenderer,
	remote
} = require('electron');
const path = require('path');
const nedb = require('nedb');

var db = {
	settings: new nedb({ filename: path.join(remote.app.getPath('userData'), 'settings.db'), autoload: true })
};

var audioOutput;
var audioCable;
var audioInput;

$(() => {
	setTimeout(() => {
		$('.loader').hide();
	}, 300 + Math.random() * 300); // lol the loader is a scam

	navigator.mediaDevices.enumerateDevices().then(devices => {
		devices.forEach(device => {
			switch (device.kind) {
				case 'audiooutput':
					var deviceOption = $('<option>');
					deviceOption.text(device.label);
					deviceOption.attr('value', device.deviceId);
					$('#audioOutput').append(deviceOption);

					var deviceOption = $('<option>');
					deviceOption.text(device.label);
					deviceOption.attr('value', device.deviceId);
					$('#audioCable').append(deviceOption);
					break;

				case 'audioinput':
					var deviceOption = $('<option>');
					deviceOption.text(device.label);
					deviceOption.attr('value', device.deviceId);
					$('#audioInput').append(deviceOption);
					break;
			}
		});

		db.settings.find({}, (err, settings) => {
			if (err) throw err;

			settings.forEach(setting => {
				switch (setting.setting) {
					case 'audioOutput':
						audioOutput = setting.value;
						$('#audioOutput').val(audioOutput);
						break;
					case 'audioCable':
						audioCable = setting.value;
						$('#audioCable').val(audioCable);
						break;
					case 'audioInput':
						audioInput = setting.value;
						$('#audioInput').val(audioInput);
						break;
				}
			});
		});
	});
});

$('#audioOutput').on('change', () => {
	audioOutput = $('#audioOutput').val();
});
$('#audioCable').on('change', () => {
	audioCable = $('#audioCable').val();
});
$('#audioInput').on('change', () => {
	audioInput = $('#audioInput').val();
});

$('#reloadAudioManagerButton').on('click', () => {
	ipcRenderer.send('reloadAudioManager');
});

$('#saveButton').on('click', () => {
	dbInsertOrUpdate({ setting: 'audioOutput' }, { setting: 'audioOutput', value: $('#audioOutput').val() });
	dbInsertOrUpdate({ setting: 'audioCable' }, { setting: 'audioCable', value: $('#audioCable').val() });
	dbInsertOrUpdate({ setting: 'audioInput' }, { setting: 'audioInput', value: $('#audioInput').val() });

	ipcRenderer.send('reloadAudioManager');
	window.close();
});

$('#closeButton').on('click', () => {
	window.close();
});

$('.tab-nav').on('click', event => {
	$('.tab-nav.selected').removeClass('selected');
	$('.tab.selected').removeClass('selected');

	var tabNav = $(event.target);
	var tabId = tabNav.data('tab');
	tabNav.addClass('selected');
	$(`.tab#${tabId}`).addClass('selected');
});

function dbInsertOrUpdate(selector, data, cb = () => {}) {
	db.settings.count(selector, (err, count) => {
		if (err) throw err;

		if (count == 1) {
			db.settings.update(selector, data, err => {
				if (err) throw err;
			});
		} else {
			db.settings.insert(selector, data, err => {
				if (err) throw err;
			});
		}
	});
}