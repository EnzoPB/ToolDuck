const {
	ipcRenderer,
	remote
} = require('electron');
const path = require('path');
const nedb = require('nedb-revived');

var db = {
	buttons: new nedb({ filename: path.join(remote.app.getPath('userData'), 'buttons.db'), autoload: true })
};

$(() => {
	updateButtons();

	setTimeout(() => {
		$('.loader').hide();
	}, 300 + Math.random() * 300); // lol the loader is a scam
});

$('.toolbar-button').on('click', event => {
	ipcRenderer.sendSync('openManageButtonDialog', $(event.currentTarget).data('id'));
	updateButtons();
});

$('#settingsWindowButton').on('click', () => {
	ipcRenderer.sendSync('openSettingsWindow');
});

const updateButtons = () => {
	db.buttons.loadDatabase();
	db.buttons.find({}, (err, buttons) => {
		if (err) throw err;

		$('.toolbar-button').each(button => {
			var buttonElement = $($('.toolbar-button')[button]);

			if (buttonElement.text() != '+') {
				buttonElement.text('+');
				buttonElement.css('box-shadow', 'none');
				buttonElement.removeClass('hasContent');
			}
		});

		buttons.forEach(button => {
			var buttonElement = $(`.toolbar-button[data-id=${button.id}]`);

			if (button.name != '') {
				buttonElement.text(button.name);
				if (button.color == '#000000') {
					buttonElement.css('box-shadow', 'none');
				} else {
					buttonElement.css('box-shadow', `0 0 7px 0 ${button.color}`);
				}

				buttonElement.addClass('hasContent');
			}
		});

	});

	$('.popover').remove();
}

function setControllerStatus(status) {
	var statusEl = $('#controllerStatus #status');
	statusEl.removeClass();
	$('#reconnect').hide();
	switch (status) {
		case 'connected':
			statusEl.text('Connected');
			statusEl.addClass('green');
			break;
	
		case 'disconnected':
			statusEl.text('Disconnected');
			statusEl.addClass('red');
			$('#reconnect').show();
			break;

		case 'reconnecting':
			statusEl.text('Reconnecting...');
			statusEl.addClass('orange');
			break;
	}
}

const updateControllerStatus = () => {
	if (ipcRenderer.sendSync('getControllerStatus')) {
		setControllerStatus('connected');
	} else {
		setControllerStatus('disconnected');
	}
}

$('#reconnect').on('click', () => {
	ipcRenderer.send('reconnectController');
	setControllerStatus('reconnecting');
});

setInterval(updateControllerStatus, 5*1000);