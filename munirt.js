Munis = new Meteor.Collection("Munis");

if (Meteor.is_client) {
  Template.locations.munis = function () {
    var munis = Munis.find();
    console.log(munis);
    return munis
  };

}

if (Meteor.is_server) {
  Meteor.startup(function () {

    var xml2js = __meteor_bootstrap__.require('xml2js');

    console.log("munis server starting...");
    console.log("starting poll of muni real-time service...");

    update();

    function update() {
      Meteor.http.call("GET", "http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=sf-muni&r=N&t=0", {}, function(error, result) {
        var parser = new xml2js.Parser();
        parser.parseString(result['content'], function (err, result) {
          for (var i=0; i<result['vehicle'].length; i++) {
            muni = result['vehicle'][i]['@'];
            //Munis.insert(muni);
            if (Munis.find({routeTag: muni['routeTag']}) === 0) {
              console.log("muni id: " + muni['id'] + " not found; inserting");
              Munis.insert(muni);
            } else { 
              console.log("muni id: " + muni['id'] + " found; updating");
              Munis.update({id: muni['id']}, {$set: {lat: muni['lat'], lon: muni['lon'], secsSinceReport: muni['secsSinceReport']}});
            }
          }
          Meteor.setTimeout(update, 10000);
        });
      });

      
    }
  });

}
