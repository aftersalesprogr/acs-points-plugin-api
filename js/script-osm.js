// OpenStreetMap / Leaflet implementation
// Drop-in replacement for script.js — same public API, no Google Maps dependency
const getUrl = window.location;
const filesUrl = getUrl.protocol + "//" + getUrl.host + "/" + getUrl.pathname.split('/')[0];
let locations = [];
let map;
let markers = [];
let markerObjects = []; // indexed array for counter-based lookup
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
    if (jQuery(document).width() < 1024) toggleSidebar();
});

// ── Build a Leaflet icon that preserves the marker image's real aspect ratio ──
// Pin icons are NOT square, so forcing a fixed square iconSize stretches/distorts
// them. We measure each icon's natural size once (cached) and scale it to a
// target height while keeping its ratio.
const acsIconCache = {};
const ACS_ICON_TARGET_HEIGHT = 48;

function getAcsIcon(iconUrl) {
    if (acsIconCache[iconUrl]) {
        return acsIconCache[iconUrl];
    }

    // Reasonable default while the real size hasn't been measured yet
    // (square-ish fallback close to the target height so it doesn't flash too oddly).
    let icon = L.icon({
        iconUrl: iconUrl,
        iconSize: [ACS_ICON_TARGET_HEIGHT, ACS_ICON_TARGET_HEIGHT],
        iconAnchor: [ACS_ICON_TARGET_HEIGHT / 2, ACS_ICON_TARGET_HEIGHT],
        popupAnchor: [0, -ACS_ICON_TARGET_HEIGHT]
    });

    acsIconCache[iconUrl] = icon;

    // Measure the real image and patch the icon's options once loaded.
    let img = new Image();
    img.onload = function () {
        if (!img.naturalWidth || !img.naturalHeight) { return; }

        let ratio = img.naturalWidth / img.naturalHeight;
        let height = ACS_ICON_TARGET_HEIGHT;
        let width = Math.round(height * ratio);

        icon.options.iconSize = [width, height];
        icon.options.iconAnchor = [width / 2, height];
        icon.options.popupAnchor = [0, -height];

        // Re-apply to any markers already using this icon so they resize in place.
        markerObjects.forEach(function (marker) {
            if (marker.options.icon === icon) {
                marker.setIcon(icon);
            }
        });
    };
    img.src = iconUrl;

    return icon;
}

function addMarkers() {
    let markerCluster = L.markerClusterGroup({ maxClusterRadius: 60, disableClusteringAtZoom: 15 });

    for (let counter = 0; counter < locations.length; counter++) {
        let leafletMarker = L.marker(
            [locations[counter].lat, locations[counter].lon],
            { icon: getAcsIcon(locations[counter].icon) }
        );
        markerObjects.push(leafletMarker);

        let allDayBadge = '';
        if (locations[counter].is_24h == true) {
            allDayBadge = '<span class="acs-sp-allDayBadge">24ΩΡΟ</span>';
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

        (function (marker, cnt) {
            let notes = '';
            if (locations[cnt].type == 'smartlocker' && locations[cnt].Acs_Smartpoint_COD_Supported == 1) {
                notes = 'Δυνατότητα πληρωμής με Visa/Mastercard.';
            }
            marker.bindPopup(
                `<div class="acs-sp-map-point-infobox">
                    <div class="acs-sp-map-point-infobox-title">${locations[cnt].title || locations[cnt].name}</div>
                    <div class="acs-sp-map-point-infobox-address">${locations[cnt].street}</div>
                    <div class="acs-sp-map-point-infobox-city">${locations[cnt].city}</div>
                    <div class="acs-sp-map-point-infobox-notes">${notes}</div>
                    <div class="acs-sp-map-point-infobox-hours">${workingHours(locations[cnt])}</div>
                    <button class="selected" counter="${cnt}">Select</button>
                </div>`, { maxWidth: 320 }
            );
            marker.on('click', function () {
                let el = document.getElementById(locations[cnt].id);
                if (el) {
                    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    jQuery(".acs-sp-sidebar-points-list").children().removeClass("active");
                    el.classList.add('active');
                }
            });
        })(leafletMarker, counter);

        markerCluster.addLayer(leafletMarker);
    }
    map.addLayer(markerCluster);
}

function newLocation(newLat, newLng, counter) {
    map.setView([parseFloat(newLat), parseFloat(newLng)], 14);
    if (markerObjects[counter]) markerObjects[counter].openPopup();
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
});

jQuery(document).ready(function () {
    if (jQuery(document).width() < 1024) toggleSidebar();
});

jQuery(".acs-sp-sidebar-close-btn").on("click", function () { toggleSidebar(); });
jQuery(".acs-sp-trigger-btn,.acs-sp-close-btn").on("click", function () { toggleMapModal(); });

jQuery(document).on('keyup', function (e) {
    if (e.keyCode === 27) jQuery(".acs-sp-wrapper").removeClass("open");
    if (jQuery(".acs-sp-wrapper").hasClass("open") && e.keyCode === 13) {
        postcodeSearch(jQuery("#acs-sp-postcode-input").val());
    }
});

jQuery("#acs-sp-postcode-search-trigger").on('click', function () {
    postcodeSearch(jQuery("#acs-sp-postcode-input").val());
});

function postcodeSearch(postcode, street, country = 'GR') {
    if (!prepared) prepare();
    let hasStreet = (street !== undefined && street.trim() !== '' && street.trim() !== ',');
    let address = '';
    if (hasStreet) {
        address = street + ', ';
    }
    address = address + postcode + ', ' + country;
    jQuery.ajax({
        url: 'https://nominatim.openstreetmap.org/search',
        dataType: 'json',
        data: { q: address, format: 'json', limit: 1, countrycodes: country.toLowerCase() },
        headers: { 'Accept-Language': 'el' },
        success: function (results) {
            if (!results || results.length === 0) {
                // Fall back to a zip-code-only search if the combined
                // street + postcode query came back empty.
                if (hasStreet) {
                    postcodeSearch(postcode, undefined, country);
                }
                return;
            }
            let lat = parseFloat(results[0].lat);
            let lng = parseFloat(results[0].lon);
            let is_address = (results[0].type === 'house' || results[0].class === 'building');
            if (markers['custom_marker'] !== undefined) {
                map.removeLayer(markers['custom_marker']);
                delete markers['custom_marker'];
            }
            if (is_address) markers['custom_marker'] = L.marker([lat, lng]).addTo(map);
            findNearestPoint(lat, lng, is_address);
            map.setView([lat, lng], is_address ? 16 : 14);
        }
    });
}

function workingHours(point) {
    if (point.type == 'smartlocker') return '<span class="acs-sp-allDayBadge">24ΩΡΟ</span>';
    let output = [];
    output.push('Δευτέρα-Παρασκευή: ' + point.weekdays);
    output.push('Σάββατο: ' + point.saturday);
    return '</br>' + output.join('</br>');
}

function initMap() {
    map = L.map('acs-sp-map', {
        center: [38.0045296, 23.7144523],
        zoom: 8, minZoom: 7, maxZoom: 16,
        zoomControl: true, scrollWheelZoom: true, dragging: true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

function fetchLocations() {
    jQuery.ajax({
        dataType: 'json',
        url: filesUrl + pluginFolder + 'data.json?v=' + new Date().getTime(),
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
    if (!prepared) prepare();
    postcodeSearch(
        jQuery(elementInputPostcode).val(),
        jQuery(elementInputAddress).val() + ',' + jQuery(elementInputCity).val()
    );
    toggleMapModal();
    setTimeout(function () { map.invalidateSize(); }, 200);
}

function toggleSidebar() {
    jQuery(".acs-sp-sidebar,.acs-sp-sidebar-close-btn").toggleClass("close");
}

function toggleMapModal() {
    jQuery(".acs-sp-wrapper").toggleClass("open");
    if (jQuery(".acs-sp-wrapper").hasClass("open")) {
        setTimeout(function () { map.invalidateSize(); }, 200);
    }
}

function calculateDistanceBetweenTwoCoordinatesInKm(lat1, lon1, lat2, lon2) {
    if ((lat1 === lat2) && (lon1 === lon2)) return 0;
    var radlat1 = Math.PI * lat1 / 180;
    var radlat2 = Math.PI * lat2 / 180;
    var theta = lon1 - lon2;
    var radtheta = Math.PI * theta / 180;
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) dist = 1;
    dist = Math.acos(dist) * 180 / Math.PI * 60 * 1.1515;
    return dist * 1.609344;
}

function findNearestPoint(lat, lng, is_address = true) {
    let min_distance = 1000000;
    if (!prepared) prepare();
    for (lcnt = 0; lcnt < locations.length; lcnt++) {
        distance = calculateDistanceBetweenTwoCoordinatesInKm(lat, lng, locations[lcnt].lat, locations[lcnt].lon);
        if (min_distance > distance) min_distance = distance;
    }
    let distanceText = min_distance * 1000;
    let text = '';
    if (distanceText <= 3000) {
        distanceText = distanceText.toFixed(0);
        text += '<img src="' + filesUrl + pluginFolder + '/icons/point.svg" alt="point-icon" />';
        text += is_address
            ? 'Πλησιέστερο point: <strong>' + distanceText + '</strong>m'
            : 'Υπάρχει ACS Point στην περιοχή σου';
    }
    jQuery(elementDistanceToPoint).html(text);
}

jQuery(document).on('change', elementInputPostcode + ',' + elementInputAddress + ',' + elementInputCity, function () {
    postcodeSearch(
        jQuery(elementInputPostcode).val(),
        jQuery(elementInputAddress).val() + ',' + jQuery(elementInputCity).val()
    );
});
