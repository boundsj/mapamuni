Munis = new Meteor.Collection("Munis");
Alerts = new Meteor.Collection("Alerts");

if (Meteor.is_client) {

  yepnope({
    load: ["http://leaflet.cloudmade.com/dist/leaflet.js", 
           "http://leaflet.cloudmade.com/dist/leaflet.css"],
    complete: function () {
      var map = new L.Map('map');
      var mapCenter = new L.LatLng(37.730599, -122.44339); 
      var mapZoom = 12;
      var baseUrl = 'http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.jpg',
          attrib = 'Map tiles by Stamen Design',
          baseLayer = new L.TileLayer(baseUrl, {attribution: attrib, maxZoom:18});
      map.addLayer(baseLayer);
      map.setView(mapCenter, mapZoom);
      var group = new L.LayerGroup();
      map.addLayer(group);
      function updateMap(map, group, munis, L) {
        if (map === null)
          return;
        group.clearLayers();
        munis.forEach(function(muni) {
          var latlng = new L.LatLng(muni.lat, muni.lon);
          var marker = new L.CircleMarker(latlng);
          marker.bindPopup("<h3>" + muni.id + "</h3>");
          marker.setRadius(4);
          group.addLayer(marker);
        });
      }
      Alerts.find({name: "alert"}).observe({
            added: function () {
              updateMap(map, group, Munis.find(), L);
            }
      });
    }
  });

  Template.locations.munis = function () {
    var munis = Munis.find();
    return munis;
  };

}

if (Meteor.is_server) {
  Meteor.startup(function () {
    console.log("munis server starting...");
    console.log("starting poll of muni real-time service...");
    update();
    function update() {
      Meteor.http.call("GET", 
        "http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=sf-muni&r=N&t=0", 
        {}, 
        function(error, result) {
          munis = xml2json.parser(result['content']);
          Alerts.remove({});
          for (var i=0; i<munis['body']['vehicle'].length; i++) {
            muni = munis['body']['vehicle'][i];
            if (Munis.find({id: muni['id']}).count() === 0) {
              console.log("muni id: " + muni['id'] + " not found; inserting");
              Munis.insert(muni);
            } else { 
              Munis.update({id: muni['id']}, 
                           {$set: {lat: muni['lat'], 
                                   lon: muni['lon'], 
                       secsSinceReport: muni['secssincereport']}});
            }
          }
        Alerts.insert({name: "alert"});
        Meteor.setTimeout(update, 5000);
      });
    }

  });

}
