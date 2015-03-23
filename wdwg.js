/**************** GLOBAL *****************/

RequestHistory = new Mongo.Collection( "requests" );

/**************** CLIENT SIDE *****************/

if (Meteor.isClient) {
  //Session variables
  Session.setDefault('counter', 0);
  Session.setDefault('resultContent', "No results found.");
  //Session.setDefault('latitude', 0);
  //Session.setDefault('longitude', 0);
  Session.setDefault('placeDetails', "");
  Session.setDefault('placeLocation', "");

  Template.preferences.events({
      'submit form': function(event, template){
        event.preventDefault();
        var distance = template.find('input:radio[name=distance]:checked');
        var alcohol  = template.find('input:radio[name=alcohol]:checked');
        var cost     = template.find('input:radio[name=cost]:checked');
        //Extracting values
        var distanceValue = (distance) ? calcDist( distance.value ): distance;
        var alcoholValue  = (alcohol)  ? getAlcohol( alcohol.value): alcohol;
        var costValue     = (cost)     ? getCosts( cost.value )    : cost;
        var url           =  getURL( distanceValue,alcoholValue,costValue );
        sendRequest( url );
      }
  });
  
  function calcDist( distEntry ){
    return distEntry;
  }

  function getAlcohol( alcoholEntry ){
    //since this is a checkbox, need to create a list out of the entries and send back
    return alcoholEntry.concat( " bar");
  }

  function getCosts( costEntry ){
    return costEntry;
  }

  function getURL(distance,alcohol,cost){
    getPosition();
    var queryParams = "";
    if( alcohol ){
      queryParams = queryParams.concat("query=").concat(alcohol).concat("&");
    }
    if( distance ){
      queryParams = queryParams.concat("radius=").concat(distance).concat("&");
    }
    if( cost ){
      queryParams = queryParams.concat("price=").concat(cost).concat("&");
    }
    queryParams = queryParams.concat("limit=100").concat("&");
    queryParams = queryParams.concat("openNow=1");
    var locationParams = "ll=".concat( Number(Session.get("latitude")).toFixed(2)).concat(",").concat(Number(Session.get("longitude")).toFixed(2));
    return "https://api.foursquare.com/v2/venues/explore?".concat(locationParams).concat("&").concat(queryParams).concat("&oauth_token=MIOZ5ZDZHCKN0T2XO3YEJOIVN0WEWLXCFKAOLS34CBF2NAH4&v=20150321");
  };

  function getPosition(){
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(getLocation);
    } else {
        console.log( "Geolocation is not supported by this browser." );
    }
  }

  function getLocation(position){
    Session.set( "latitude",position.coords.latitude);
    Session.set( "longitude",position.coords.longitude);
  }

  function sendRequest(url){
    Meteor.http.get( url, function(err, result) {
      if (!err){
        var data = result.content;
        parseResponse( JSON.parse(data).response );
      }
    });
  }

  function parseResponse( response ){
    var randomPlaceObj   = response.groups[0].items;
    var end = randomPlaceObj.length - 1;
    if( end < 0 ){
      Session.set("placeDetails", { 'name' : "Unable to find places with search criteria.", 'type' : "", 'rating':"", 'count':"",'address':""} );
      return;
    }
    var random = Math.floor((Math.random() * end ) );
    var randomPlace = randomPlaceObj[random].venue;
    var name = randomPlace.name;
    var type = randomPlace.categories[0].shortName;
    var rating = randomPlace.rating;
    var count = randomPlace.hereNow.count;
    var address = randomPlace.location.address.concat(",").concat(randomPlace.location.city);
    Session.set("placeDetails", { 'name' : name, 'type' : type, 'rating':rating, 'count':count,'address':address} );
    var placeLat  = randomPlace.location.lat;
    var placeLong = randomPlace.location.lng;
    plotMap( placeLat, placeLong );
  }

  function plotMap( lat, lng ){
    Session.set( "placeLocation", {'lat':lat,'long':lng});
  }

  Template.result.name = function(){
    return Session.get('placeDetails').name;
  }
  Template.result.type = function(){
    return Session.get('placeDetails').type;
  }
  Template.result.rating = function(){
    return Session.get('placeDetails').rating;
  }
  Template.result.count = function(){
    return Session.get('placeDetails').count;
  }
  Template.result.address = function(){
    return Session.get('placeDetails').address;
  }
}

/**************** SERVER SIDE *****************/

if (Meteor.isServer) {
  Meteor.startup(function () {
  });
  Meteor.methods({
    'getBarDeets':function(dist,alc,rat,amb,cos){
      RequestHistory.insert({
        distance:dist,
        alcohol:alc,
        rating:rat,
        ambience:amb,
        cost:cos
      });
    }
  });
}