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
	db.buttons.find({ id: button.id }, (err, _button) => { // we search the database for existing data
		if (err) throw err;

		if (button.id == 6) { // if the button is a potentiometer
			$('#action-button').hide(); // we hide the action selector corresponding to the buttons
		} else {
			$('#action-potentiometer').hide(); // we hide the action selector corresponding to the potentiometer
		}

		if (_button.length == 1) { // if the button already exists, we pre-fill the fields with the existing data
			button = _button[0];
			$('#name').val(button.name);
			$('#color').val(button.color);
			$('#action-potentiometer').val(button.action);
			$('#action-button').val(button.action);
		} else { // if the button doesn't exist we let the fields empty
			$('#deleteButton').hide(); // and we hide the "delete" button
			$('#action-potentiometer').val('');
			$('#action-button').val('');
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

	// if the action changes, we update the action data
	$('#action-potentiometer').on('change', updateAction);
	$('#action-button').on('change', updateAction);

	$('#submitButton').on('click', () => { // if the user click the submit button, we save the changes or we create the new button

		// we check the form for empty input
		var emptyInput = [];
		if ($('#name').val() == '') {
			emptyInput.push('name');
		}
		if (button.id == 6) { // if the button is a potentiometer
			if ($('#action-potentiometer').val() == null) {
				emptyInput.push('action');
			}
			if ($('#action-potentiometer').val() == 'keybind' && $('#keybind').val() == '') {
				emptyInput.push('keyboard shortcut');
			}
			if ($('#action-potentiometer').val() == 'soundboardPlay' && $('#sound').val() == '') {
				emptyInput.push('sound file');
			}
			if ($('#action-potentiometer').val() == 'command' && $('#command').val() == '') {
				emptyInput.push('command');
			}

			switch ($('#action-potentiometer').val()) { // we save the action data, depending on the action value
				case 'command':
					button.actionData.command = $('#command').val();
					break;
			}

		} else { // if the button is a button
			if ($('#action-button').val() == null) {
				emptyInput.push('action');
			}
			if ($('#action-button').val() == 'keybind' && $('#keybind').val() == '') {
				emptyInput.push('keyboard shortcut');
			}
			if ($('#action-button').val() == 'soundboardPlay' && $('#sound').val() == '') {
				emptyInput.push('sound file');
			}
			if ($('#action-button').val() == 'command' && $('#command').val() == '') {
				emptyInput.push('command');
			}

			switch ($('#action-button').val()) { // we save the action data, depending on the action value
				case 'keybind':
					button.actionData.keybind = $('#keybind').val();
					break;
				case 'command':
					button.actionData.command = $('#command').val();
					break;
			}
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
	if (button.id == 6) { // if the button is a potentiometer
		button.action = $('#action-potentiometer').val();

		switch ($('#action-potentiometer').val()) {
			case 'command': // if the action is "command"
				actionData.append(`
				<label class="form-label">
					<span>Command</span>
					<input id="command" class="form-input" type="text" placeholder="Use {value} to insert the current value">
				</label>`); // we add a "command" field
				break;
		}
	} else { // if the button is a button
		button.action = $('#action-button').val();

		switch ($('#action-button').val()) {
			case 'keybind': // if the action is "keybind"
				actionData.append(`
				<label class="form-label">
					<span>Key</span>
					<input id="keybind" class="form-input" type="text" placeholder="Click to select a keyboard shortcut" readonly>
				</label>`); // we add a "keybind" field

				actionDataListeners.push({ // we add the click input event listener 
					element: $('#keybind'),
					event: 'click'
				});
				var keybindFocused = false; // is the keybind input is focused
				$('#keybind').on('click', () => { // if the input is clicked
					var input = $('#keybind');

					if (keybindFocused) { // if the input is focused
						keybindFocused = false;
						input.attr('placeholder', 'Click to end input');
						input.focus();
						input.on('keyup', event => {
							console.log(event);
						});
					} else { // if it is not focused
						keybindFocused = true;
						input.attr('placeholder', 'Click to select a keyboard shortcut');
						input.blur();
						input.off('keyup');
					}
				});
				break;

			case 'command': // if the action is "command"
				actionData.append(`
				<label class="form-label">
					<span>Command</span>
					<input id="command" class="form-input" type="text">
				</label>`); // we add a "command" field
				break;

			case 'soundboardPlay': // if the action is "soundboardPlay"
				actionData.append(`
				<label class="form-label">
					<span>Sound file</span>
					<input type="text" class="form-input" placeholder="Click to select" id="sound" value="" readonly>
					</select>
				</label>`); // we add a "sound" field

				actionDataListeners.push({ // we add the click input event listener 
					element: $('#sound'),
					event: 'click'
				});

				$('#sound').on('click', () => { // if the input is clicked
					var sound = dialog.showOpenDialogSync({ // we open a file dialog
						filters: [
							{ name: 'Sound file', extensions: ['mp3', 'ogg', 'wav'] } // only accept audio files
						],
						properties: ['openFile']
					})[0];
					$('#sound').val(sound);

					button.actionData.sound = sound;
				});
				break;
		}
	}

	for (i in button.actionData) { // for every action data field
		$(`#${i}`).val(button.actionData[i]); // we auto-fill with the action data value
	}
}