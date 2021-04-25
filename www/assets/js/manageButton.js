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

var button = { // initial button data
	id: 0,
	name: '',
	color: '#000000',
	action: '',
	actionData: {}
};

$(() => {
	button.id = ipcRenderer.sendSync('getButton');
	db.buttons.find({ id: button.id }, (err, _button) => { // we search the databse for existing data
		if (err) throw err;

		if (_button.length == 1) { // if the button already exists, we pre-fill the fields with the existing data
			button = _button[0];
			$('#name').val(button.name);
			$('#color').val(button.color);
		} else { // if the button doesn't exist we let the fields empty
			$('#deleteButton').hide(); // and we hide the "delete" button
		}

		updateAction(); // update the action data
		$('.loader').hide(); // hide the loader
	});

	$('#name').on('change', () => { // if the name changes, we save it into the button variable
		button.name = $('#name').val();
	});

	$('#color').on('input', () => { // if the color changes (in real-time in the color-picker), we send the data to the arduino to preview the color on the device
		ipcRenderer.send('changeBtnColor', $('#color').val());
	});
	$('#color').on('change', () => {
		button.color = $('#color').val(); // if the color changes, we save it into the button variable
	});

	$('#action').on('change', updateAction); // if the action changes, we update the action data

	$('#submitButton').on('click', () => { // if the user click the submit button, we save the changes or we create the new button

		// we check the form for empty input
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

		if (emptyInput.length != 0) { // if there is one or more empty input
			dialog.showMessageBox({ // we show a warning message
				type: 'warning',
				message: `You must fill the following fields: ${emptyInput.join(', ')}` // telling which input is empty
			});
		} else {
			db.buttons.find({ id: button.id }, (err, count) => { // we search the database for existing data
				if (err) throw err;

				if (count == 0) { // if the buttons doesn't exists in the database
					db.buttons.insert(button, (err, a) => { // we create the entry
						if (err) throw err;
						window.close(); // and we close the window
					});
				} else { // if the button already exists
					db.buttons.update({ id: button.id }, button, (err, a) => { // we update the entry
						if (err) throw err;
						window.close(); // and we close the window
					})
				}
			});
		}
	});

	$('#deleteButton').on('click', () => { // if the "delete button is clicked"
		if (dialog.showMessageBoxSync({ // we ask the user for a confirmation
				type: 'question',
				title: 'Warning',
				message: `Are you sure you want to delete "${button.name}"?`,
				detail: 'This action is irreversible',
				buttons: ['No', 'Yes']
			}) == 1) { // if he awnser "yes"
			db.buttons.remove({ id: button.id }, err => { // we delete the entry
				if (err) throw err;
				window.close();
			});
		}
	});
});

var actionDataListeners = [];
const updateAction = () => {
	var actionData = $('#actionData');
	actionData.html(''); // we remove the action data fields

	actionDataListeners.forEach(listener => {
		listener.element.off(listener.event); // we remove every event listener
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

	for (i in button.actionData) { // for every action data field
		$(`#${i}`).val(button.actionData[i]); // we auto-fill with the action data value
	}
}