/* Neighborhood Map App
 *
 * Loads Google Map and Foursquare 'venues' from asynch AJAX requests
 * Allows user to change city, select different categories of venues and see more info for each venue on click events
 *
 */
// Global Variables

var placesModel = [];

//choose foursquare default catagories here:

var fsCategories = [
  { "name": "Restaurants",
    "id" : "4d4b7105d754a06374d81259"
  }, {
    "name": "Airport",
    "id": "4bf58dd8d48988d1ed931735"
  }, {
    "name": "Coffee",
    "id": "4bf58dd8d48988d1e0931735"
  }, {
    "name": "Food Trucks",
    "id": "4bf58dd8d48988d1cb941735"
  }, {
    "name": "Breweries",
    "id": "50327c8591d4c4b30a586d5d"
  }, {
    "name": "Museums",
    "id": "4bf58dd8d48988d181941735"
  }, {
    "name": "Universities",
    "id": "4d4b7105d754a06372d81259"
  }, {
    "name": "Hotel",
    "id": "4bf58dd8d48988d1fa931735"
  }, {
    "name": "Outdoors",
    "id": "4d4b7105d754a06377d81259"
  }, {
    "name": "Stadiums",
    "id": "4bf58dd8d48988d184941735"
  }, {
    "name": "Shopping",
    "id": "4d4b7105d754a06378d81259"
  }, {
    "name": "Zoo",
    "id": "4bf58dd8d48988d17b941735"
  }
];
var GOOGLE_KEY = "AIzaSyDTYSjuoZcmdc_12MTieNOK2gmHsdb3PBo";
var CLIENT_ID = "MUKBUW43YPMWUS2HKDZQZW4VYLT5B1HHST20VR5K35WAKFVC";
var CLIENT_SECRET = "5I1RMLBOLDC1QXU5IJN4VLC2E1N2G1JIGB3QUG5FTAZO4CFM";

// MAPVIEW
//make map global, set default location(Lawrenceville, GA), define an array for Ajax/json requests
var MapViewModel = function () {
  var self = this;
    self.map = null;
    self.fsPlaces = ko.observableArray([]);
	self.lat = ko.observable(33.9531);
	self.lng = ko.observable(-83.9925);

  // SEARCH
    self.search = function () {
     var value = $('#searchTerm').val();
       value = value.toLowerCase().replace(/\b[a-z]/g, function (letter) {
       return letter.toUpperCase();
   });
    // Filter list items based on search term
    $('.markerList > li').each(function () {
       if ($(this).text().search(value) > -1) {
        $(this).show();
      } else {
        $(this).hide();
      }
   });
    // Filter markers based on search term
    for (var i = 0; i < self.fsPlaces().length; i++) {
      if (self.fsPlaces()[i].marker.title.search(value) > -1) {
        self.fsPlaces()[i].marker.setMap(self.map);
      } else {
        self.fsPlaces()[i].marker.setMap(null);
      }
    }
  };
  
  // LIST VIEW CLICK EVENT
  self.selectPlace = function(clickedItem) {

    // Set all marker animations to null and close all open infowindows
    self.clearInfoWindows();
    self.clearMarkerAnimation();

    // Set the clicked marker to Bounce - and open the infowindow
    clickedItem.marker.setAnimation(google.maps.Animation.BOUNCE);
    clickedItem.infowindow.open(self.map, clickedItem.marker);

    // This centers the map on the selected place
    self.map.setCenter(new google.maps.LatLng(clickedItem.location.lat, clickedItem.location.lng));
  };

  // MAP SETTINGS - user defined within the app
  self.mapType = ko.observable();

  // Click event for Map settings options - allows user to select type of base map
  self.settings = function (data) {
    if (self.mapType()[0] === "Satellite") self.map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
    if (self.mapType()[0] === "Terrain") self.map.setMapTypeId(google.maps.MapTypeId.TERRAIN);
    if (self.mapType()[0] === "Road") self.map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
    if (self.mapType()[0] === "Hybrid") self.map.setMapTypeId(google.maps.MapTypeId.HYBRID);
  };

  // CLEAR ALL MARKER ANIMATION
  self.clearMarkerAnimation = function () {
    for (var i = 0; i < self.fsPlaces().length; i++) {
      self.fsPlaces()[i].marker.setAnimation(null);
    }
  };

  // CLOSE ALL OPEN INFOWINDOWS
  self.clearInfoWindows = function () {
    for (var i = 0; i < self.fsPlaces().length; i++) {
      self.fsPlaces()[i].infowindow.close();
    }
  };

  /* CATEGORIES
   * Create an array of all the category id's, then join the items to make a comma separated string,
   * then pass that string into the self.chosenCategoryID() to get passed to the JSON Request
   */
  var categoryIdArray = [];
  for (var i = 0; i < fsCategories.length; i++) {
    categoryIdArray.push(fsCategories[i].id);
  }
  var ids = categoryIdArray.join(",");

  // Store the users choice (ID) in the Category selection options
  self.chosenCategoryID = ko.observable(ids);

  // Store the selected choice (Name) in the drop down to display dynamically in the DOM - use starter value
  self.catChoice = ko.observable();

  /* setCategory is run when a category is choosen from the list. Check the selected option
   * against the fsCategories object and update the id to use in the JSON request.
   */
  self.setCategory = function() {
    for (var i = 0; i < fsCategories.length; i++) {
      if (self.catChoice()[0] === fsCategories[i].name) {
        self.chosenCategoryID(fsCategories[i].id);
      }
    }
    // Run initialize again to reset the markers for the new category
    self.initializeMap();
  };

  // USER ENTERED LOCATION
  // Hold the user entered city
  self.city = ko.observable($('#city').val());

  // Set City centers the map over the user entered city
  self.setCity = function() {
    var cityValue = $('#city').val();

    // This variable is used to display the user entered city in the Map Options headings.
    // TODO: Could do some case formatting on the input value, so that the displayed city name is properly cased.
    self.city(cityValue);

    // Using Google's geocoding API to get the lat/long values for the city entered
    $.getJSON("https://maps.googleapis.com/maps/api/geocode/json?address=" + self.city() + "&key=" + GOOGLE_KEY, function(data) {
      // Request pulls in data, stores the lat longs for the city into the global observables and sets the map center
      self.lat(data.results[0].geometry.location.lat);
      self.lng(data.results[0].geometry.location.lng);
      self.map.setCenter({lat: self.lat(), lng: self.lng()});
    }).error(function() {
      // Error handling if the Geocode service is down. Google seems to handle incorrect typing on city names pretty well.
      $('#error').text("Google Geocode is not responding. Please try again later.").show();
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
    $.getJSON("https://api.foursquare.com/v2/venues/search?client_id=" + CLIENT_ID +
      "&client_secret=" + CLIENT_SECRET +
      "&v=20130815&limit=50&categoryId=" + self.chosenCategoryID() +
      "&radius=6000&near=" + self.city(), function(data) {
      placesModel = data.response.venues;
      self.fsPlaces(placesModel);
      console.log("Foursquare places loaded successfully");
      setMarkers();
	  
    $('#error').hide();
    }).error(function() {
      $('#error').text("Foursquare can not retrieve places at this time. Please try again later or refine your search term.").show();
      console.log("Foursquare API failed");
    });

    // Function is called in the JSON request to Foursquare and places the markers into the fsPlaces array.
    this.setMarkers = function() {
      for (var i = 0; i < self.fsPlaces().length; i++) {

        // Storing some variables here for easier use later
        var place = self.fsPlaces()[i];
        var placePhone = place.contact.formattedPhone;
        var placeAddress = place.location.address;
        var placeCity = place.location.city;
        var placeState = place.location.state;
        var placeZip = place.location.postalCode;
        var placeWeb = place.url;

        // Format any undefined fields for the infowindow
        if (placePhone === undefined) placePhone = "N/A";
        if (placeAddress === undefined) placeAddress = "";
        if (placeCity === undefined) placeCity = "";
        if (placeState === undefined) placeState = "";
        if (placeZip === undefined) placeZip = "";
        if (placeWeb === undefined) placeWeb = "No Website";


        var fsIconRaw = place.categories[0].icon.prefix + "bg_32" + place.categories[0].icon.suffix;
        var fsIcon = fsIconRaw.replace("https://ss3.4sqi.net", "https://foursquare.com");

        // Set the markers as properties of the fsPlaces observable
        place.marker = new google.maps.Marker({
          position: new google.maps.LatLng(place.location.lat, place.location.lng),
          title: place.name,
          map: self.map,
          animation: google.maps.Animation.DROP,
          icon: fsIcon,
          html: '<div>' +
            '<h2 class="infoTitle">' + place.name +
            '</h2><h4 class="infoCategory">' + place.categories[0].name +
            '</h4><p class="infoPhone">Phone: ' + placePhone +
            '<p class="infoAddress">Address: ' + placeAddress + ' ' + placeCity + ', ' + placeState + ' ' + placeZip +
            '</p><p class="infoWeb"><a href="' + placeWeb + '">'+
            '' +  placeWeb + '</a> '+
            '</p></div>'
        });

        // Set the infowindows as properties of the fsPlaces observable
        place.infowindow = new google.maps.InfoWindow();
        place.infowindow.setContent(place.marker.html);

        // Utilizing a closure here to add event listeners to each Marker
		// Set the marker to bounce
		// Center the map on the new marke
		// Open the infowindow.
		// Open the infowindow.
		// Set all other markers animation to null, and close all open infowindows
        google.maps.event.addListener(place.marker, 'click', (function(innerKey) {
          return function() {
			self.clearInfoWindows(); 
            self.clearMarkerAnimation();
            self.map.setCenter(new google.maps.LatLng(self.fsPlaces()[innerKey].location.lat, self.fsPlaces()[innerKey].location.lng));
            self.fsPlaces()[innerKey].infowindow.open(self.map, self.fsPlaces()[innerKey].marker);
            self.fsPlaces()[innerKey].marker.setAnimation(google.maps.Animation.BOUNCE);
          };
        })(i));
      }
    };

	// Google map style: http://gmaps-samples-v3.googlecode.com/svn/trunk/styledmaps/wizard/index.html
	
		var styles = [
	  {
		"featureType": "water",
		"elementType": "geometry.fill",
		"stylers": [
		  { "color": "#9b7db1" }
		]
	  },{
		"featureType": "road.highway.controlled_access",
		"stylers": [
		  { "hue": "#ff0000" }
		]
	  },{
		"featureType": "road.highway",
		"stylers": [
		  { "hue": "#5eff00" }
		]
	  },{
		"featureType": "transit.line",
		"stylers": [
		  { "color": "#bb5580" }
		]
	  },{
		"featureType": "landscape.natural",
		"stylers": [
		  { "hue": "#00ffee" },
		  { "color": "#C28585" }
		]
	  },{
		"featureType": "landscape.man_made",
		"stylers": [
		  { "hue": "#f6ff00" },
		  { "color": "##FFC39C" }
		
		]
	  }
	]
    var mapOptions = {
      center: { lat: self.lat(), lng: self.lng()},
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      streetViewControl: true,
      zoomControl: true,
      panControl: true,
      mapTypeControl: true
    };

    self.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    self.map.setOptions({styles: styles});
  };

  // If Google Maps fails to load
   
  if (typeof google === "undefined") {
    var errorStr = "Google Maps could did not load correctly, check your network and try again later";
    $('#error').text(errorStr).show();
    console.log("Google Maps API failed");
  } else {
    $('#error').hide();
    google.maps.event.addDomListener(window, 'load', this.initializeMap);
    console.log("Google Maps Successfully loaded");
  }
};

ko.applyBindings( new MapViewModel() );