$(() => {
	setTimeout(() => {
		$('.loader').hide();
	}, 300 + Math.random() * 300); // lol the loader is a scam
});

$('.tab-nav').on('click', event => {
	$('.tab-nav.selected').removeClass('selected');
	$('.tab.selected').removeClass('selected');

	var tabNav = $(event.target);
	var tabId = tabNav.data('tab');
	tabNav.addClass('selected');
	$(`.tab#${tabId}`).addClass('selected');
});