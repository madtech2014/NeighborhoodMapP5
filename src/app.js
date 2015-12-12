/* Projo5_Neighborhood Map
 *
 * Application allows visitor to access Google Map choose location and venues using Foursquare
 * User will be able to make map type choices as well as venue catagories and obtain more information on venues by clicking icons
 */
var CLIENT_ID = "5B0HOZHGVVSMFTIXXGMRMZRAZ3NV20H2LJJ1E35IEOJMUTN0";
var CLIENT_SECRET = "O4F5DYQQ21YC40UEAJFKBOLAL2AHJU5CQC2RP00MWNV3OIPN";
var GOOGLE_KEY = "AIzaSyDTYSjuoZcmdc_12MTieNOK2gmHsdb3PBo";
// Choices from catagory hierarchy foursquare website: https://developer.foursquare.com/categorytree
var fsCategories = [{
    "name": "Hotel",
    "id": "4bf58dd8d48988d1fa931735"
}, {
    "name": "Restaurants",
    "id": "4d4b7105d754a06374d81259"
}, {
    "name": "Airport",
    "id": "4bf58dd8d48988d1ed931735"
}, {
    "name": "Gas Stations",
    "id": "4bf58dd8d48988d113951735"
}, {
    "name": "Shopping",
    "id": "4d4b7105d754a06378d81259"
}, {
    "name": "Movie Theatre",
    "id": "4bf58dd8d48988d17f941735"
}, {
    "name": "Colleges & Universities",
    "id": "4d4b7105d754a06372d81259"
}, {
    "name": "Arts & Entertainment",
    "id": "4d4b7104d754a06370d81259"
}, {
    "name": "Gym & Fitness",
    "id": "4bf58dd8d48988d175941735"
}, {
    "name": "Medical Centers",
    "id": "4bf58dd8d48988d104941735"
}];
//Intialize map
var map;

function initMap() {
        "use strict";
        map = new google.maps.Map(document.getElementById('map-canvas'), {
            center: {
                lat: 33.9531,
                lng: -83.9925
            },
            zoom: 14
        });
        //start viewModel now 
        ko.applyBindings(new ViewModel());
    }
    // MAPVIEW
    //Make map global, set default location(Lawrenceville, GA), define an array for Ajax/json requests
var ViewModel = function() {
    var self = this;
    self.map = null;
    self.fsVenues = ko.observableArray([]);
    self.lat = ko.observable(33.9531);
    self.lng = ko.observable(-83.9925);
    // SEARCH
    self.search = function() {
		"use strict";
        var value = $('#searchTerm').val();
        value = value.toLowerCase().replace(/\b[a-z]/g, function(letter) {
            return letter.toUpperCase();
        });
        // Filter list items based on search term
        $('.markerList > li').each(function() {
            if ($(this).text().search(value) > -1) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
        // Filter markers based on search term
        for (var i = 0; i < self.fsVenues().length; i++) {
            if (self.fsVenues()[i].marker.title.search(value) > -1) {
                self.fsVenues()[i].marker.setMap(self.map);
            } else {
                self.fsVenues()[i].marker.setMap(null);
            }
        }
    };
    // LIST VIEW 
    /* Reset marker animations and close any open information windows
     * Clicked item gets animated and center map on clicked item
     */
    self.selectVenue = function(clickedItem) {
        self.clearInfoWindows();
        self.clearMarkerAnimation();
        clickedItem.marker.setAnimation(google.maps.Animation.BOUNCE);
        clickedItem.infowindow.open(self.map, clickedItem.marker);
        self.map.setCenter(new google.maps.LatLng(clickedItem.location.lat,
            clickedItem.location.lng));
    };
    //MAP SETTINGS 
    /* Options chosen by user 
     * Reset marker animations and close any open information windows
     */
    self.mapType = ko.observable();
    self.settings = function(data) {
        if (self.mapType()[0] === "Hybrid") self.map.setMapTypeId(
            google.maps.MapTypeId.HYBRID);
        if (self.mapType()[0] === "Road") self.map.setMapTypeId(google.maps
            .MapTypeId.ROADMAP);
        if (self.mapType()[0] === "Satellite") self.map.setMapTypeId(
            google.maps.MapTypeId.SATELLITE);
        if (self.mapType()[0] === "Terrain") self.map.setMapTypeId(
            google.maps.MapTypeId.TERRAIN);
    };
    self.clearMarkerAnimation = function() {
        for (var i = 0; i < self.fsVenues().length; i++) {
            self.fsVenues()[i].marker.setAnimation(null);
        }
    };
    self.clearInfoWindows = function() {
        for (var i = 0; i < self.fsVenues().length; i++) {
            self.fsVenues()[i].infowindow.close();
        }
    };
    //Expand or Collapse option header
    var elt = document.getElementById('optionsTransform');
    var eltImg = document.getElementById('down');
    eltImg.style.transform = "rotate(180deg)";
    $('#venues').addClass('venues-toggle');
    elt.addEventListener('click', function() {
        $('#venues').toggleClass('venues-toggle');
        eltImg.style.transform += "rotate(180deg)";
    });
    //CATEGORIES
    /*Catagory function used to create an array of all category IDs to be passed into JSON request by CSV string.  
     *Category choices stored in selection options ID and choice name in drop down to be displayed in DOM
     *Run setCatagory when choices made from the list
     *Check selections against fsCatagories and update JSON request
     */
    var categoryId = [];
    for (var i = 0; i < fsCategories.length; i++) {
        categoryId.push(fsCategories[i].id);
    }
    var ids = categoryId.join(",");
    self.chosenCategoryID = ko.observable(ids);
    self.catChoice = ko.observable();
    self.setCategory = function() {
        for (var i = 0; i < fsCategories.length; i++) {
            if (self.catChoice()[0] === fsCategories[i].name) {
                self.chosenCategoryID(fsCategories[i].id);
            }
        }
        // Run initialize again to reset the markers for the new category
        self.initializeMap();
    };
    // LOCATION CHOSEN BY USER
    /*Hold the user entered city
     *Center map over chosen city
     *Use variable to display chosen city in the Map Options headings.
     */
    self.city = ko.observable($('#city').val());
    self.setCity = function() {
        var cityValue = $('#city').val();
        // 
        self.city(cityValue);
        // Using Google's geocoding API to get the lat/long values for the city entered
        // Request pulls in data, stores the lat longs for the city into the global observables and sets the map center
        $.getJSON(
            "https://maps.googleapis.com/maps/api/geocode/json?address=" +
            self.city() + "&key=" + GOOGLE_KEY, function(data) {
                self.lat(data.results[0].geometry.location.lat);
                self.lng(data.results[0].geometry.location.lng);
                self.map.setCenter({
                    lat: self.lat(),
                    lng: self.lng()
                });
            }).error(function() {
            $('#error').text(
                "Google Geocode is not responding. Please try again later."
            ).show();
            console.log("Google Geocode API error");
        });
        // Run again to add the markers in the new city
        self.initializeMap();
        // Clear out the text input field
        $('#city').val("");
    };
    // MAP INITIALIZATION
    /* Store the places request data in a global variable
     * Push the global variable results into the ViewModel observable
     * This function, within the request, allows the data to be used outside this scope.
     * Error handling if the Foursquare service is unreachable or if the user types in an unrecognizable search term.
     */
    self.initializeMap = function() {
        // Foursquare AJAX request for places
        $.getJSON(
            "https://api.foursquare.com/v2/venues/search?client_id=" +
            CLIENT_ID + "&client_secret=" + CLIENT_SECRET +
            "&v=20130815&limit=50&categoryId=" + self.chosenCategoryID() +
            "&radius=6000&near=" + self.city(), function(data) {
                venuesModel = data.response.venues;
                self.fsVenues(venuesModel);
                console.log("Foursquare venues load Successful");
                setMarkers();
                $('#error').hide();
            }).error(function() {
            $('#error').text(
                "Foursquare failed to retrieve venues based on current search please refine and retry"
            ).show();
            console.log("Foursquare API failure to load");
        });
        /* Function is used to retrieve and store data in fsVenues array after sending JSON 
         *handles missing data items with placeholders
         */
        this.setMarkers = function() {
            for (var i = 0; i < self.fsVenues().length; i++) {
                var venue = self.fsVenues()[i];
                var venueAddress = venue.location.address;
                var venueCity = venue.location.city;
                var venueState = venue.location.state;
                var venueZip = venue.location.postalCode;
                var venuePhone = venue.contact.formattedPhone;
                var venueWeb = venue.url;
                if (venueAddress === undefined) venueAddress = "";
                if (venueCity === undefined) venueCity = "";
                if (venueState === undefined) venueState = "";
                if (venueZip === undefined) venueZip = "";
                if (venuePhone === undefined) venuePhone = "N/A";
                if (venueWeb === undefined) venueWeb = "No Website";
                var fsIconRaw = venue.categories[0].icon.prefix +
                    "bg_32" + venue.categories[0].icon.suffix;
                var fsIcon = fsIconRaw.replace(
                    "https://ss3.4sqi.net",
                    "https://foursquare.com");
                // Set the markers as properties of the fsVenues observable
                venue.marker = new google.maps.Marker({
                    position: new google.maps.LatLng(venue.location
                        .lat, venue.location.lng),
                    title: venue.name,
                    map: self.map,
                    animation: google.maps.Animation.DROP,
                    icon: fsIcon,
                    html: '<div>' +
                        '<h2 class="infoTitle">' + venue.name +
                        '</h2><h4 class="infoCategory">' +
                        venue.categories[0].name +
                        '</h4><p class="infoPhone">Phone: ' +
                        venuePhone +
                        '<p class="infoAddress">Address: ' +
                        venueAddress + ' ' + venueCity +
                        ', ' + venueState + ' ' + venueZip +
                        '</p><p class="infoWeb"><a href="' +
                        venueWeb + '">' + '' + venueWeb +
                        '</a> ' + '</p></div>'
                });
                // Set the infowindows as properties of the fsVenues observable
                venue.infowindow = new google.maps.InfoWindow();
                venue.infowindow.setContent(venue.marker.html);
                /* Event listeners added to each Marker
                 * Set the marker to bounce
                 * Center the map on the new marker
                 * Open the infowindow.
                 * Set all other markers animation to null, and close all open infowindows
                 */
                google.maps.event.addListener(venue.marker, 'click', (
                    function(innerKey) {
                        return function() {
                            self.clearInfoWindows();
                            self.clearMarkerAnimation();
                            self.map.setCenter(new google
                                .maps.LatLng(self.fsVenues()[
                                        innerKey].location
                                    .lat, self.fsVenues()[
                                        innerKey].location
                                    .lng));
                            self.fsVenues()[innerKey].infowindow
                                .open(self.map, self.fsVenues()[
                                    innerKey].marker);
                            self.fsVenues()[innerKey].marker
                                .setAnimation(google.maps
                                    .Animation.BOUNCE);
                        };
                    })(i));
            }
        };
        // Google map style: http://gmaps-samples-v3.googlecode.com/svn/trunk/styledmaps/wizard/index.html
        var styles = [{
            "featureType": "water",
            "elementType": "geometry.fill",
            "stylers": [{
                "color": "#9b7db1"
            }]
        }, {
            "featureType": "road.highway.controlled_access",
            "stylers": [{
                "hue": "#ff0000"
            }]
        }, {
            "featureType": "road.highway",
            "stylers": [{
                "hue": "#5eff00"
            }]
        }, {
            "featureType": "transit.line",
            "stylers": [{
                "color": "#bb5580"
            }]
        }, {
            "featureType": "landscape.natural",
            "stylers": [{
                "hue": "#00ffee"
            }, {
                "color": "#C28585"
            }]
        }, {
            "featureType": "landscape.man_made",
            "stylers": [{
                "hue": "#f6ff00"
            }, {
                "color": "##FFC39C"
            }]
        }]
        var mapOptions = {
            center: {
                lat: self.lat(),
                lng: self.lng()
            },
            zoom: 14,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            streetViewControl: true,
            zoomControl: true,
            panControl: true,
            mapTypeControl: true
        };
        self.map = new google.maps.Map(document.getElementById(
            'map-canvas'), mapOptions);
        self.map.setOptions({
            styles: styles
        });
    };
    // If Google Maps fails to load
    if (typeof google === "undefined") {
        var errorStr =
            "Google Maps could did not load correctly, check your network and try again later";
        $('#error').text(errorStr).show();
        console.log("Google Maps API failed");
    } else {
        $('#error').hide();
        google.maps.event.addDomListener(window, 'load', this.initializeMap);
        console.log("Google Maps Successfully loaded");
    }
};
