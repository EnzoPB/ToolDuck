const {
	ipcRenderer,
	remote
} = require('electron');
const path = require('path');
const nedb = require('nedb');

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

$('#settingsDialogButton').on('click', () => {
	ipcRenderer.sendSync('openSettingsDialog');
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

const popover = (text, element) => {
	var tooltip = $(`<span class="popover">${text}</span>`);
	$('body').append(tooltip);

	var popperInstance = Popper.createPopper(element, tooltip[0], {
		placement: 'top',
		modifiers: [{
			name: 'offset',
			options: {
				offset: [0, 5]
			}
		}]
	});

	$(element).one('mouseleave', event => {
		tooltip.remove();
		popperInstance.destroy();
		popperInstance = null;
	});
};