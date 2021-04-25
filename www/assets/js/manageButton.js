const {
	ipcRenderer,
	remote
} = require('electron');
const { dialog } = remote;
const path = require('path');
const nedb = require('nedb');

var db = {
	buttons: new nedb({ filename: path.join(remote.app.getPath('userData'), 'buttons.db'), autoload: true })
};

var button = {
	id: 0,
	name: '',
	color: '#000000',
	action: '',
	actionData: {}
};

$(() => {
	button.id = ipcRenderer.sendSync('getButton');
	db.buttons.find({ id: button.id }, (err, _button) => {
		if (err) throw err;

		if (_button.length == 1) {
			button = _button[0];
			$('#name').val(button.name);
			$('#color').val(button.color);
			$('#action').val(button.action);
		} else {
			$('#deleteButton').hide();
			$('#action').val('');
		}

		updateAction();
		$('.loader').hide();
	});

	$('#name').on('change', event => {
		button.name = $('#name').val();
	});

	$('#color').on('input', event => {
		ipcRenderer.send('changeBtnColor', $('#color').val());
	});
	$('#color').on('change', event => {
		button.color = $('#color').val();
	});

	$('#action').on('change', updateAction);

	$('#submitButton').on('click', () => {

		var emptyInput = [];
		if ($('#name').val() == '') {
			emptyInput.push('name');
		}
		if ($('#action').val() == null) {
			emptyInput.push('action');
		}
		if ($('#action').val() == 'keybind' && $('#keybind').val() == '') {
			emptyInput.push('keyboard shortcut');
		}
		if ($('#action').val() == 'soundboardPlay' && $('#sound').val() == '') {
			emptyInput.push('sound file');
		}
		if ($('#action').val() == 'command' && $('#command').val() == '') {
			emptyInput.push('command');
		}

		switch ($('#action').val()) {
			case 'keybind':
				button.actionData.keybind = $('#keybind').val();
				break;
			case 'command':
				button.actionData.command = $('#command').val();
				break;
		}

		if (emptyInput.length != 0) {
			dialog.showMessageBox({
				type: 'warning',
				message: `You must fill the following fields: ${emptyInput.join(', ')}`
			});
		} else {
			db.buttons.find({ id: button.id }, (err, count) => {
				if (err) throw err;
				if (count == 0) {
					db.buttons.insert(button, (err, a) => {
						if (err) throw err;
						window.close();
					});
				} else {
					db.buttons.update({ id: button.id }, button, (err, a) => {
						if (err) throw err;
						window.close();
					})
				}
			});
		}
	});

	$('#deleteButton').on('click', event => {
		if (dialog.showMessageBoxSync({
				type: 'question',
				title: 'Warning',
				message: `Are you sure you want to delete "${button.name}"?`,
				detail: 'This action is irreversible',
				buttons: ['No', 'Yes']
			}) == 1) {
			db.buttons.remove({ id: button.id }, err => {
				if (err) throw err;
				window.close();
			});
		}
	});
});

var actionDataListeners = [];
const updateAction = () => {
	var actionData = $('#actionData');
	actionData.html('');

	actionDataListeners.forEach(listener => {
		listener.element.off(listener.event);
	});
	button.action = $('#action').val();

	switch ($('#action').val()) {
		case 'keybind':
			actionData.append(`
			<label class="form-label">
				<span>Key</span>
				<input id="keybind" class="form-input" type="text" placeholder="Click to select a keyboard shortcut" readonly>
			</label>`);

			actionDataListeners.push({
				element: $('#keybind'),
				event: 'click'
			});
			var keybindFocused = false;
			$('#keybind').on('click', () => {
				keybindFocused = !keybindFocused;
				var input = $('#keybind');

				if (keybindFocused) {
					input.attr('placeholder', 'Click to end input');
					input.focus();
					input.on('keyup', event => {
						console.log(event);
					});
				} else {
					input.attr('placeholder', 'Click to select a keyboard shortcut');
					input.blur();
					input.off('keyup');
				}
			});
			break;

		case 'command':
			actionData.append(`
			<label class="form-label">
				<span>Command</span>
				<input id="command" class="form-input" type="text">
			</label>`);
			break;

		case 'soundboardPlay':
			actionData.append(`
			<label class="form-label">
				<span>Sound file</span>
				<input type="text" class="form-input" placeholder="Click to select" id="sound" value="" readonly>
				</select>
			</label>`);

			actionDataListeners.push({
				element: $('#sound'),
				event: 'click'
			});

			$('#sound').on('click', () => {
				var sound = dialog.showOpenDialogSync({
					filters: [
						{ name: 'Sound file', extensions: ['mp3', 'ogg', 'wav'] }
					],
					properties: ['openFile']
				})[0];
				$('#sound').val(sound);
				button.actionData.sound = sound;
			});
			break;
	}

	for (i in button.actionData) {
		$(`#${i}`).val(button.actionData[i]);
	}
}