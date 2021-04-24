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

$('.screen-button').on('click', event => {
	ipcRenderer.sendSync('openManageButtonDialog', $(event.currentTarget).data('pos'));
	updateButtons();
});

const updateButtons = () => {
	db.buttons.loadDatabase();
	db.buttons.find({}, (err, buttons) => {
		if (err) throw err;

		$('.screen-button').each(button => {
			var buttonElement = $($('.screen-button')[button]);

			if (buttonElement.html() != '+') {
				buttonElement.html('+');
				buttonElement.removeClass('hasImage');
				buttonElement.removeAttr('onmouseenter');
			}
		});

		buttons.forEach(button => {
			var buttonElement = $(`.screen-button[data-pos=${button.pos}]`);
			var buttonImage = path.join(remote.app.getPath('userData'), 'buttonImages', button.image);

			if (button.name != '') {
				buttonElement.html(`<img src="${buttonImage}" alt="${button.name}">`);
				buttonElement.addClass('hasImage');
				buttonElement.attr('onmouseenter', `popover('${button.name}', this)`);
			} else {
				buttonElement.html('+');
				buttonElement.removeClass('hasImage');
				buttonElement.removeAttr('onmouseenter');
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