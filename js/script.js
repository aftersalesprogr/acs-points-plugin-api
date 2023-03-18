let getUrl = window.location;
let filesUrl = getUrl.protocol + "//" + getUrl.host + "/" + getUrl.pathname.split('/')[0];
let locations = [];
let map;
let infoWindow = new google.maps.InfoWindow();
let marker, i;
let markers = [];
let prepared = false;


jQuery(document).on('click', '.selected', function () {
    key = jQuery(this).attr("counter");
    toggleMapModal();
    jQuery(".mg-selected-locker-container").remove();
    jQuery(".mg-selected-locker-title").remove();

    jQuery(".locker-container").append(
        `<div class="mg-selected-locker-title">Επιλέξατε παραλαβή από:</div>
         <div class="mg-selected-locker-container">
            <a title="${locations[key].name}" href="#" onclick="toggleMapModal();return false;" class="mg-selected-locker-link">
                <img src="${locations[key].icon}" />
                <span class="mg-selected-locker-content">
                ${locations[key].name}</br>${locations[key].street}
                </span>
            </a>
         </div>`
    );

    console.log(locations[key]);
});

jQuery(document).on('click', '.acs-sp-sidebar-points-list-item', function () {
    newLocation(jQuery(this).data("lat"), jQuery(this).data("lng"), jQuery(this).attr('counter'));
    jQuery(".acs-sp-sidebar-points-list-item").removeClass("active");
    jQuery(this).addClass("active");
    if (jQuery(document).width() < 1024) {
        toggleSidebar();
    }
});

function addMarkers() {
    for (i = 0; i < locations.length; i++) {
        marker = new google.maps.Marker({
            position: new google.maps.LatLng(locations[i].lat, locations[i].lon),
            map: map,
            icon: locations[i].icon

        });
        markers.push(marker);
        marker.set("id", locations[i].id);
        marker.set("counter", i);
        let allDayBadge = '';
        if (locations[i].is_24h == true) {
            allDayBadge = '<span class="acs-sp-allDayBadge">24ΩΡΟ</span>'
        }
        jQuery(".acs-sp-sidebar-points-list").append(
            `<a href="#" class="acs-sp-sidebar-points-list-item" counter="${i}" id="${locations[i].id}"
                data-lat="${locations[i].lat}" data-lng="${locations[i].lon}">
                <img src="${locations[i].icon}" />
                <span class="acs-sp-sidebar-points-list-item-content">
                    <span class="acs-sp-sidebar-points-list-item-title">${locations[i].name}</span>
                    <span class="acs-sp-sidebar-points-list-item-address">${locations[i].street}</span>
                    ${allDayBadge}
                </span>
            </a>`
        );
        google.maps.event.addListener(marker, "click", (function (marker, i) {
            return function () {
                document.getElementById(locations[i].id).scrollIntoView({
                    block: 'center',
                    behavior: 'smooth'
                });
                jQuery(".acs-sp-sidebar-points-list").children().removeClass("active");
                document.getElementById(locations[i].id).classList.add('active');
                let notes = '';//locations[i].notes;
                if (locations[i].type == 'smartlocker') {
                    notes = 'Δυνατότητα πληρωμής με Visa/Mastercard.';
                }
                infoWindow.setContent(
                    `<div class="acs-sp-map-point-infobox">
                        <div class="acs-sp-map-point-infobox-title">${locations[i].title}</div>
                        <div class="acs-sp-map-point-infobox-address">${locations[i].street}</div>
                        <div class="acs-sp-map-point-infobox-city">${locations[i].city}</div>
                        <div class="acs-sp-map-point-infobox-notes">${notes}</div>
                        <div class="acs-sp-map-point-infobox-hours">${workingHours(locations[i])}</div>
                        <button class="selected" counter="${i}">Select</button>
                    </div>`
                );
                infoWindow.open(map, marker);
            }
        })(marker, i));
    }
    new MarkerClusterer(map, markers, {
        imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
    });
}

function newLocation(newLat, newLng, counter) {
    map.setCenter({
        lat: newLat,
        lng: newLng
    });
    map.setZoom(14);
    var e = {
        latLng: new google.maps.LatLng(newLat, newLng)
    };
    google.maps.event.trigger(markers[counter], 'click', e);
}

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

jQuery(document).keyup(function (e) {
    if (e.keyCode === 27) {
        toggleMapModal();
    }
    if (e.keyCode === 13) {
        postcodeSearch(jQuery("#acs-sp-postcode-input").val());
    }
});

jQuery("#acs-sp-postcode-search-trigger").click(function () {
    postcodeSearch(jQuery("#acs-sp-postcode-input").val());
});

function postcodeSearch(postcode) {
    let geocoder = new google.maps.Geocoder();
    let address = postcode + " GR";
    geocoder.geocode({'address': address}, function (results, status) {
        if (status === 'OK') {
            map.setCenter(results[0].geometry.location);
            map.setZoom(14);
        } else {
            alert('Η αναζήτησή σας δεν βρήκε κάποια αποτελέσματα. Παρακαλώ εισάγετε τον Τ.Κ της περιοχής σας.');
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
    jQuery.getJSON(filesUrl + "data.json", function (data) {
        locations = data.points;
        addMarkers();
        fillFooter(data.meta);
    }).fail(function () {
        console.log("An error has occurred.");
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
    postcodeSearch(jQuery("#billing_postcode").val());
    toggleMapModal();
}

function toggleSidebar() {
    jQuery(".acs-sp-sidebar,.acs-sp-sidebar-close-btn").toggleClass("close");
}

function toggleMapModal() {
    jQuery(".acs-sp-wrapper").toggleClass("open");
}
