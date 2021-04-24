const {
	ipcRenderer,
	remote
} = require('electron');
const { dialog } = remote;
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const nedb = require('nedb');

var db = {
	buttons: new nedb({ filename: path.join(remote.app.getPath('userData'), 'buttons.db'), autoload: true })
};

var button = {
	pos: 0,
	name: '',
	action: '',
	actionData: {}
};

$(() => {
	button.pos = ipcRenderer.sendSync('getButton');
	db.buttons.find({ pos: button.pos }, (err, _button) => {
		if (err) throw err;

		if (_button.length == 1) {
			button = _button[0];
			$('#name').val(button.name);
			$('#image').val(button.imageName);
			$('#action').val(button.action);
		} else {
			$('#deleteButton').hide();
			$('#action').val('');
		}

		updateAction();
		$('.loader').hide();
	});

	$('#name').on('change', event => {
		button.name = $(event.currentTarget).val();
	});

	$('#action').on('change', updateAction);

	$('#submitButton').on('click', () => {

		var emptyInput = [];
		if ($('#name').val() == '') {
			emptyInput.push('nom');
		}
		if ($('#image').val() == '') {
			emptyInput.push('image');
		}
		if ($('#action').val() == null) {
			emptyInput.push('action');
		}
		if ($('#action').val() == 'keybind' && $('#keybind').val() == '') {
			emptyInput.push('touche de raccourcis');
		}
		if ($('#action').val() == 'web' && $('#webadress').val() == '') {
			emptyInput.push('adresse web');
		}
		if ($('#action').val() == 'soundboardPlay' && $('#sound').val() == '') {
			emptyInput.push('fichier son');
		}
		if ($('#action').val() == 'command' && $('#command').val() == '') {
			emptyInput.push('commande');
		}

		switch ($('#action').val()) {
			case 'keybind':
				button.actionData.keybind = $('#keybind').val();
				break;
			case 'web':
				button.actionData.webadress = $('#webadress').val();
				break;
			case 'command':
				button.actionData.command = $('#command').val();
				break;
		}

		if (emptyInput.length != 0) {
			dialog.showMessageBox({
				type: 'warning',
				message: `Vous devez completer les champ(s) suivant: ${emptyInput.join(', ')}`
			});
		} else {
			db.buttons.find({ pos: button.pos }, (err, count) => {
				if (count == 0) {
					db.buttons.insert(button, (err, a) => {
						if (err) throw err;
						window.close();
					});
				} else {
					db.buttons.update({ pos: button.pos }, button, (err, a) => {
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
				title: 'Attention',
				message: `Étes-vous sûr de vouloir supprimer le boutton ${button.name}?`,
				detail: 'Cette action est irréversible',
				buttons: ['Non', 'Oui']
			}) == 1) {
			db.buttons.remove({ pos: button.pos }, err => {
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
				<span>Touche</span>
				<input id="keybind" class="form-input" type="text" placeholder="Cliquez pour choisir une touche" readonly>
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
					input.attr('placeholder', 'Cliquez pour terminer la sélection');
					input.focus();
					input.on('keyup', event => {
						console.log(event);
					});
				} else {
					input.attr('placeholder', 'Cliquez pour choisir une touche');
					input.blur();
					input.off('keyup');
				}
			});
			break;

		case 'command':
			actionData.append(`
			<label class="form-label">
				<span>Commande</span>
				<input id="command" class="form-input" type="text">
			</label>`);
			break;

		case 'web':
			actionData.append(`
			<label class="form-label">
				<span>Adresse web</span>
				<input id="webadress" class="form-input" type="text">
			</label>`);
			break;

		case 'soundboardPlay':
			actionData.append(`
			<label class="form-label">
				<span>Fichier son</span>
				<input type="text" class="form-input" placeholder="Cliquez pour sélectionner" id="sound" value="" readonly>
				</select>
			</label>`);

			actionDataListeners.push({
				element: $('#sound'),
				event: 'click'
			});

			$('#sound').on('click', () => {
				var sound = dialog.showOpenDialogSync({
					filters: [
						{ name: 'Fichiers son', extensions: ['mp3', 'ogg', 'wav'] }
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