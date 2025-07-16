const getUrl = window.location;
const filesUrl = getUrl.protocol + "//" + getUrl.host + "/" + getUrl.pathname.split('/')[0];
let locations = [];
let map;
let markers = [];
let prepared = false;
const elementDistanceToPoint = '.distance-to-point';
const elementInputPostcode = '#billing_postcode';
const elementInputAddress = '#billing_address';
const elementInputCity = '#billing_city';
const pluginFolder = '/';

jQuery(document).on('click', '.acs-sp-sidebar-points-list-item', function (e) {
    e.preventDefault();
    newLocation(jQuery(this).data("lat"), jQuery(this).data("lng"), jQuery(this).attr('counter'));
    jQuery(".acs-sp-sidebar-points-list-item").removeClass("active");
    jQuery(this).addClass("active");
    if (jQuery(document).width() < 1024) {
        toggleSidebar();
    }
});

function addMarkers() {
    let infoWindow = new google.maps.InfoWindow();
    for (counter = 0; counter < locations.length; counter++) {
        marker = new google.maps.Marker({
            position: new google.maps.LatLng(locations[counter].lat, locations[counter].lon),
            map: map,
            icon: locations[counter].icon

        });
        markers.push(marker);
        marker.set("id", locations[counter].id);
        marker.set("counter", counter);
        let allDayBadge = '';
        if (locations[counter].is_24h == true) {
            allDayBadge = '<span class="acs-sp-allDayBadge">24ΩΡΟ</span>'
        }
        jQuery(".acs-sp-sidebar-points-list").append(
            `<a href="#" class="acs-sp-sidebar-points-list-item" counter="${counter}" id="${locations[counter].id}"
                data-lat="${locations[counter].lat}" data-lng="${locations[counter].lon}">
                <img src="${locations[counter].icon}" alt="${locations[counter].name}" />
                <span class="acs-sp-sidebar-points-list-item-content">
                    <span class="acs-sp-sidebar-points-list-item-title">${locations[counter].name}</span>
                    <span class="acs-sp-sidebar-points-list-item-address">${locations[counter].street}</span>
                    ${allDayBadge}
                </span>
            </a>`
        );
        google.maps.event.addListener(marker, "click", (function (marker, counter) {
            return function () {
                document.getElementById(locations[counter].id).scrollIntoView({
                    block: 'center',
                    behavior: 'smooth'
                });
                jQuery(".acs-sp-sidebar-points-list").children().removeClass("active");
                document.getElementById(locations[counter].id).classList.add('active');
                let notes = '';//locations[counter].notes;
                if (
                    locations[counter].type == 'smartlocker'
                    && locations[counter].Acs_Smartpoint_COD_Supported == 1
                ) {
                    notes = 'Δυνατότητα πληρωμής με Visa/Mastercard.';
                }
                infoWindow.setContent(
                    `<div class="acs-sp-map-point-infobox">
                        <div class="acs-sp-map-point-infobox-title">${locations[counter].title}</div>
                        <div class="acs-sp-map-point-infobox-address">${locations[counter].street}</div>
                        <div class="acs-sp-map-point-infobox-city">${locations[counter].city}</div>
                        <div class="acs-sp-map-point-infobox-notes">${notes}</div>
                        <div class="acs-sp-map-point-infobox-hours">${workingHours(locations[counter])}</div>
                        <button class="selected" counter="${counter}">Select</button>
                    </div>`
                );
                infoWindow.open(map, marker);
            }
        })(marker, counter));
    }
    new MarkerClusterer(map, markers, {
        imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
        maxZoom: 14
    });
}

function newLocation(newLat, newLng, counter) {
    map.setCenter({
        lat: parseFloat(newLat),
        lng: parseFloat(newLng)
    });
    map.setZoom(14);
    var e = {
        latLng: new google.maps.LatLng(newLat, newLng)
    };
    google.maps.event.trigger(markers[counter], 'click', e);
}

jQuery(document).on('click', '.selected', function (e) {
    e.preventDefault();
    key = jQuery(this).attr("counter");
    toggleMapModal();
    jQuery(".mg-selected-locker-container").remove();
    jQuery(".mg-selected-locker-title").remove();

    jQuery(".locker-container").html(
        `<div class="mg-selected-locker-title">Επιλέξατε παραλαβή από:</div>
         <div class="mg-selected-locker-container">
            <a title="${locations[key].name}" href="#" onclick="toggleMapModal();return false;" class="mg-selected-locker-link">
                <img src="${locations[key].icon}" alt="${locations[key].icon}"/>
                <span class="mg-selected-locker-content">
                ${locations[key].name}</br>${locations[key].street}
                </span>
                <span class="mg-selected-locker-payment-status-${locations[key].Acs_Smartpoint_COD_Supported == true ? 'yes' : 'no'}">
                ${locations[key].Acs_Smartpoint_COD_Supported == true ? 'Με δυνατότητα αντικ/λής.' : 'Χωρίς δυνατότητα αντικ/λής'}
                </span>
            </a>
         </div>`
    );
    jQuery("#acs_pp_point_id").attr('value', JSON.stringify(locations[key].id));
    console.log(locations[key]);
});

jQuery(document).ready(function () {
    if (jQuery(document).width() < 1024) {
        toggleSidebar();
    }
});

jQuery(".acs-sp-sidebar-close-btn").on("click", function () {
    toggleSidebar();
});

jQuery(".acs-sp-trigger-btn,.acs-sp-close-btn").on("click", function () {
    toggleMapModal();
});

jQuery(document).on('keyup', function (e) {
    if (e.keyCode === 27) {
        jQuery(".acs-sp-wrapper").removeClass("open");
    }
    if (jQuery(".acs-sp-wrapper").hasClass("open") && e.keyCode === 13) {
        postcodeSearch(jQuery("#acs-sp-postcode-input").val());
    }
});

jQuery("#acs-sp-postcode-search-trigger").on('click', function () {
    postcodeSearch(jQuery("#acs-sp-postcode-input").val());
});

function postcodeSearch(postcode, street, country = 'GR') {
    if (!prepared) {
        prepare();
    }
    let geocoder = new google.maps.Geocoder();
    let address = "";
    if (street !== undefined) {
        address = street + ", ";
    }
    address = address + "ΤΚ " + postcode + ", " + country;
    geocoder.geocode({'address': address}, function (results, status) {
        if (status === 'OK' && results.length != 0) {

            if (markers['custom_marker'] !== undefined) {
                markers['custom_marker'].setMap(null);
            }

            is_address = results[0].types[0] == 'premise' || results[0].types[0] == 'street_address';
            if (is_address) {
                custom_marker = new google.maps.Marker({
                    position: new google.maps.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng()),
                    map: map,
                    id: 'custom-location'
                });
                markers['custom_marker'] = custom_marker;
            }

            findNearestPoint(results[0].geometry.location.lat(), results[0].geometry.location.lng(), is_address);
            map.setCenter(results[0].geometry.location);
            if (is_address) {
                map.setZoom(16);
            } else {
                map.setZoom(14);
            }
        }
    });
}

function workingHours(point) {
    if (point.type == 'smartlocker') {
        return '<span class="acs-sp-allDayBadge">24ΩΡΟ</span>';
    }
    let output = [];
    output.push('Δευτέρα-Παρασκευή: ' + point.weekdays)
    output.push('Σάββατο: ' + point.saturday)
    return '</br>' + output.join("</br>");

}

function initMap() {
    map = new google.maps.Map(document.getElementById("acs-sp-map"), {
        maxZoom: 16,
        zoom: 8,
        minZoom: 7,
        streetViewControl: false,
        disableDefaultUI: true,
        zoomControl: true,
        scrollWheel: true,
        draggable: true,
        gestureHandling: "greedy",
        center: new google.maps.LatLng(38.0045296, 23.7144523),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [{
            "featureType": "administrative",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#444444"}]
        }, {
            "featureType": "landscape",
            "elementType": "all",
            "stylers": [{"color": "#f2f2f2"}]
        }, {
            "featureType": "landscape",
            "elementType": "labels.text.fill",
            "stylers": [{"saturation": "-34"}, {"visibility": "on"}]
        }, {"featureType": "poi", "elementType": "all", "stylers": [{"visibility": "off"}]}, {
            "featureType": "poi",
            "elementType": "geometry.fill",
            "stylers": [{"hue": "#ff0000"}]
        }, {
            "featureType": "road",
            "elementType": "all",
            "stylers": [{"saturation": -100}, {"lightness": 45}]
        }, {
            "featureType": "road.highway",
            "elementType": "all",
            "stylers": [{"visibility": "simplified"}]
        }, {
            "featureType": "road.arterial",
            "elementType": "labels.icon",
            "stylers": [{"visibility": "off"}]
        }, {
            "featureType": "transit",
            "elementType": "all",
            "stylers": [{"visibility": "off"}]
        }, {"featureType": "water", "elementType": "all", "stylers": [{"color": "#156789"}, {"visibility": "on"}]}]
    });
}

function fetchLocations() {
    jQuery.ajax({
        dataType: "json",
        url: filesUrl + pluginFolder + "data.json?v=" + new Date().getTime(),
        async: false,
        success: function (data) {
            locations = data.points;
            addMarkers();
            fillFooter(data.meta);
        }
    });
}

function fillFooter(meta) {
    jQuery.each(meta, function (i, field) {
        jQuery(".acs-sp-footer").append(
            `<a title="${field.description}">
                <img src="${field.icon}" alt="${field.title}" />
                <span>${field.title}</span>
            </a>`
        );
    });
}

function prepare() {
    initMap();
    fetchLocations();
    prepared = true;
}

function openMap() {
    if (!prepared) {
        prepare();
    }
    postcodeSearch(
        jQuery(elementInputPostcode).val(),
        jQuery(elementInputAddress).val() + ',' + jQuery(elementInputCity).val()
    );
    toggleMapModal();
}

function toggleSidebar() {
    jQuery(".acs-sp-sidebar,.acs-sp-sidebar-close-btn").toggleClass("close");
}

function toggleMapModal() {
    jQuery(".acs-sp-wrapper").toggleClass("open");
}

function calculateDistanceBetweenTwoCoordinatesInKm(lat1, lon1, lat2, lon2) {
    if ((lat1 === lat2) && (lon1 === lon2)) {
        return 0;
    } else {
        var radlat1 = Math.PI * lat1 / 180;
        var radlat2 = Math.PI * lat2 / 180;
        var theta = lon1 - lon2;
        var radtheta = Math.PI * theta / 180;
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        if (dist > 1) {
            dist = 1;
        }
        dist = Math.acos(dist);
        dist = dist * 180 / Math.PI;
        dist = dist * 60 * 1.1515;
        return dist * 1.609344;
    }
}

function findNearestPoint(lat, lng, is_address = true) {
    let min_distance = 1000000;
    let min_lat = null;
    let min_lng = null;

    if (!prepared) {
        prepare();
    }

    for (lcnt = 0; lcnt < locations.length; lcnt++) {
        distance = calculateDistanceBetweenTwoCoordinatesInKm(lat, lng, locations[lcnt].lat, locations[lcnt].lon);
        if (min_distance > distance) {
            min_distance = distance;
            min_lat = locations[lcnt].lat;
            min_lng = locations[lcnt].lon;
        }
    }

    distanceText = min_distance * 1000;
    text = "";
    if (distanceText <= 3000) {
        distanceText = distanceText.toFixed(0);
        text += '<img src="' + filesUrl + pluginFolder + '/icons/point.svg" alt="point-icon" />'
        if (is_address) {
            text += "Πλησιέστερο point: <strong>" + (distanceText) + "</strong>m"
        } else {
            text += "Υπάρχει ACS Point στην περιοχή σου";
        }
    }
    jQuery(elementDistanceToPoint).html(text);
}

jQuery(document).on('change', elementInputPostcode + ',' + elementInputAddress + ',' + elementInputCity, function () {
    postcodeSearch(
        jQuery(elementInputPostcode).val(),
        jQuery(elementInputAddress).val() + ',' + jQuery(elementInputCity).val()
    );
});
