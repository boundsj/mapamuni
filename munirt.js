Munis = new Meteor.Collection("Munis");
Routes = new Meteor.Collection("Routes");
Alerts = new Meteor.Collection("Alerts");

if (Meteor.is_client) {
 
  yepnope({
    load: ["http://leaflet.cloudmade.com/dist/leaflet.js", 
           "http://leaflet.cloudmade.com/dist/leaflet.css"],
    complete: function () {
      var map = new L.Map('map');
      var mapCenter = new L.LatLng(37.730599, -122.44339); 
      var mapZoom = 11;
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
          marker.bindPopup(
            '<div class="container">' +
  
            '<table>' +
      
            '<tbody>' +

            '<tr>' +
            '<td><b>Vehicle: </b></td>' + 
            '<td><span class="label label-info">' + muni.id + '</span></td>' +
            '<td><b>Route: </b></td>' + 
            '<td><span class="label label-info">' + muni.routetag + '</span></td>' +
            '</tr>' +

            '<tr>' +
            '<td><b>Direction: </b></td>' + 
            '<td><span class="label label-info">' + muni.dirtag + '</span></td>' +
            '<td><b>Speed (Km/Hr): </b></td>' + 
            '<td><span class="badge badge-important">' + muni.speedkmhr + '</span></td>' +
            '</tr>' +

            '<tr>' +
            '<td><b>Heading: </b></td>' + 
            '<td><span class="badge badge-info">' + muni.heading + '</span></td>' +
            '<td><b>Seconds Since Update: </b></td>' + 
            '<td><span class="badge badge-warning">' + muni.secssincereport + '</span></td>' +
            '</tr>' +

            '</tbody>' +

            '</table>' +

            '</div>'
          );
          marker.setRadius(6);
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

  Meteor.autosubscribe(function () {
    //Meteor.subscribe("munis", {routetag: "N"});
    Meteor.subscribe("munis", {});
    Meteor.subscribe("routes", {});
    Meteor.subscribe("alerts");
  });

  Template.locations.munis = function () {
    return Munis.find();
  };

  Template.routes.routes = function() {
    return Routes.find();
  }
  
  Template.routes.events = {
  'click .route': function (data) {
    console.log(data.target);
    $(".routes").remove();
    $("#map").css('visibility', 'visible');
  }
};

}

if (Meteor.is_server) {
  Meteor.startup(function () {
    console.log("munis server starting...");
    console.log("starting poll of muni real-time service...");

    Meteor.publish("munis", function (arg) {
      return Munis.find(arg);
    });
    Meteor.publish("routes", function () {
      return Routes.find();
    });
    Meteor.publish("alerts", function () {
      return Alerts.find();
    });

    getMuniRouteList();
    update();

    function getMuniRouteList() {
      Routes.remove({});
      Meteor.http.call("GET",
        "http://webservices.nextbus.com/service/publicXMLFeed?command=routeList&a=sf-muni",
        null,
        function(error, result) {
          routes = xml2json.parser(result['content']);
          console.log(routes['body']['route']);
          for (var i=0; i<routes['body']['route'].length; i++) {
            console.log(routes['body']['route'][i]);
            Routes.insert(routes['body']['route'][i]);
          }
        }
      );
    }

    function update() {
      var d = new Date();
      var lastTime = "0";
      console.log(d.getTime() + ": calling muni service...");
      Meteor.http.call("GET", 
        "http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=sf-muni&t=" + lastTime,
        null, 
        function(error, result) {
          console.log(d.getTime() + ": call to muni service complete");

          munis = xml2json.parser(result['content']);
          lastTime = munis['body']['lasttime']['time'];
          Alerts.remove({});

          for (var i=0; i<munis['body']['vehicle'].length; i++) {
            muni = munis['body']['vehicle'][i];
            if (Munis.find({id: muni['id']}).count() === 0) {
              console.log("muni id: " + muni['id'] + " not found; inserting");
              Munis.insert(muni);
            } else { 
              Munis.update({id: muni['id']}, 
                           {$set: {routetag: muni['routetag'],
                                   dirtag: muni['dirtag'],
                                   predictable: muni['predictable'],
                                   heading: muni['heading'],
                                   speedkmhr: muni['speedkmhr'],
                                   lat: muni['lat'], 
                                   lon: muni['lon'], 
                       secssincereport: muni['secssincereport']}});
            }
          }
          Alerts.insert({name: "alert"});

          Meteor.setTimeout(update, 10000);
        });
    }

  });

}
