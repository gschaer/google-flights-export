// ==Bookmarklet==
// @name Google Flights Export
// @author Guillaume Schaer
// @style !loadOnce //cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css
// @script //code.jquery.com/jquery-latest.min.js
// @script //cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js
// ==/Bookmarklet==

var copyListener = event => {
	var trip = "";
	var tripHTML = "";

	// Get all segments
	var segments = $('.gws-flights-results__slice-selection');

	// Iterate over each segment
	segments.each(function(index){
		var originDate = new Date($(this).find('.gws-flights-results__itinerary-times>.gws-flights-results__times-row>span.flt-subhead1').text());
		var legs = $(this).find('.gws-flights-results__leg');
		legs.each(function(index){
			var flightNumber = $(this).find('.gws-flights-results__other-leg-info>span:last').text().replace(/\s/g, '');
			var airline = $(this).find('.gws-flights-results__leg-flight>div:first').text();
			var travelTime = $(this).find('.gws-flights-results__leg-duration>div:first>span').text().replace(/\s/g, '');
			var departureAirport = $(this).find('.gws-flights-results__leg-departure>div:last>span:first').text();
			var departureIATACode = $(this).find('.gws-flights-results__leg-departure').find('.gws-flights-results__iata-code').text();
			var departureOffSetDate = $(this).find('.gws-flights-results__leg-departure').find('.gws-flights__offset-days').text();
			if(departureOffSetDate == '') {
				departureOffSetDate = 0;
			}
			var departureDate = new Date(originDate);
			departureDate.setDate(originDate.getDate()+parseInt(departureOffSetDate));
			var departureTime = $(this).find('.gws-flights-results__leg-departure>div:first>span>span:first').text();

			var arrivalAirport = $(this).find('.gws-flights-results__leg-arrival>div:last>span:first').text();
			var arrivalIATACode = $(this).find('.gws-flights-results__leg-arrival').find('.gws-flights-results__iata-code').text();
			var arrivalOffSetDate = $(this).find('.gws-flights-results__leg-arrival').find('.gws-flights__offset-days').text();
			if(arrivalOffSetDate == '') {
				arrivalOffSetDate = 0;
			}
			var arrivalDate = new Date(originDate);
			arrivalDate.setDate(originDate.getDate()+parseInt(arrivalOffSetDate));
			var arrivalTime = $(this).find('.gws-flights-results__leg-arrival>div:first>span>span:first').text();
			var leg = "";
			leg = leg + "*"+airline+ " "+flightNumber+"* (dur: "+travelTime+")" +"\r\n";
			leg = leg + "Departure "+departureAirport + " ("+departureIATACode+") "+departureDate.toLocaleDateString('en-GB', {'day':'2-digit', 'month':'short'})+" "+ departureTime+"\r\n";
			leg = leg + "Arrival "+arrivalAirport + " ("+arrivalIATACode+") "+arrivalDate.toLocaleDateString('en-GB', {'day':'2-digit', 'month':'short'}) + " " +arrivalTime+"\r\n";

			var legHTML = "";
			legHTML = legHTML + "<b>"+airline+ " "+flightNumber+"</b> (dur: "+travelTime+")" +"<br/>";
			legHTML = legHTML + "Departure "+departureAirport + " ("+departureIATACode+") "+departureDate.toLocaleDateString('en-GB', {'day':'2-digit', 'month':'short'})+" "+ departureTime+"<br/>";
			legHTML = legHTML + "Arrival "+arrivalAirport + " ("+arrivalIATACode+") "+arrivalDate.toLocaleDateString('en-GB', {'day':'2-digit', 'month':'short'}) + " " +arrivalTime+"<br/>";


			trip = trip + leg + "\r\n";
			tripHTML = tripHTML + legHTML + "<br/>"
		});
	});


	document.removeEventListener("copy", copyListener, true);
	event.preventDefault();
	let clipboardData = event.clipboardData;
	clipboardData.clearData();
	clipboardData.setData("text/plain", trip);
	clipboardData.setData("text/html", tripHTML);
};
document.addEventListener("copy", copyListener, true);
document.execCommand("copy");
toastr.success('Data copied to clipboard')