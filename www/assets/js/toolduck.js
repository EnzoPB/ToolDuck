$('.form-input[type="range"]').on('input', event => {
	var slider = $(event.target);
	var unit = slider.data('unit');
	var label = slider.siblings('.value');

	label.text(slider.val() + ' ' + unit);
});

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