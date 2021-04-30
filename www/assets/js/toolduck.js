$('.form-input[type="range"]').on('input', event => {
	var slider = $(event.target);
	var unit = slider.data('unit');
	var label = slider.siblings('.value');

	label.text(slider.val() + ' ' + unit);
});