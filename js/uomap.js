var UOMap = UOMap || {};

UOMap.facets = [
    "Felucca",
    "Trammel",
    "Ilshenar",
    "Malas",
    "Tokuno",
];

UOMap.init = function() {
    var title = document.title;

    var olMaps = [];
    UOMap.mapdata.OSI.forEach(function(v,k) {
        var pp = new ol.proj.Projection({
            code: 'pixel',
            units: 'pixels',
            extent: [0, 0, v.size[0], v.size[1]]
        });

        olMaps[k] = {
            projection: pp,
            layer: new ol.layer.Image({
                source: new ol.source.ImageStatic({
                    url: v.url,
                    imageSize: v.size,
                    projection: pp,
                    imageExtent: pp.getExtent()
                }),
            })
        };
    });

    var curMap = -1;
    var map = new ol.Map({
        target: 'map',
        layers: [ ],
        view: new ol.View(),
        controls: []
    });

    map.on("pointermove", function(e) {
        var view = map.getView();
        var proj = view.getProjection();
        var h = proj.getExtent()[3];
        $('#map > .mousepos').text(parseInt(e.coordinate[0]) + '.' + parseInt(h - e.coordinate[1]));
    });

    $('#map').hover(function() {
        $('#map > .mousepos').show();
    }, function() {
        $('#map > .mousepos').hide();
    });

    var centerStyle = new ol.style.Style({
        image: new ol.style.Icon(({
            anchor: [0.5,0.5],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            src: 'img/center.png'
        }))
    });

    var centerFeature = new ol.Feature({
        geometry: new ol.geom.Point([0,0])
    });

    centerFeature.setStyle(centerStyle);

    var centerSource =  new ol.source.Vector({
        features: [centerFeature],
    });

    var iconLayer = new ol.layer.Vector({ source: centerSource });

    var currentPosition = [0,0,0];
    function setPosition(x,y,f,force) {
        var moved = (currentPosition[0] != x || currentPosition[1] != y || currentPosition[2] != f);
        currentPosition = [x,y,f];
        var force = force || false;

        if (typeof f != 'undefined' && f != curMap) {
            var rot = map.getView().getRotation() || Math.PI / 4;
            var zoom = map.getView().getZoom() || 4;

            map.getLayers().forEach(function(layer) {
                map.removeLayer(layer);
            });

            map.addLayer(olMaps[f].layer);
            map.addLayer(iconLayer);

            map.setView(new ol.View({
                projection: olMaps[f].projection,
                center: ol.extent.getCenter(olMaps[f].projection.getExtent()),
                rotation: rot,
                zoom: zoom
            }));

            curMap = f;
        }

        if (moved || force) {
            var view = map.getView();
            var proj = view.getProjection();
            var h = proj.getExtent()[3];
            view.setCenter([x, h - y]);
            centerFeature.setGeometry(new ol.geom.Point([x, h - y]));
        }

        $('#map > .charpos').text(x + '.' + y + ' in ' + UOMap.facets[f]);
    }

    /*
    $('#track').bind('change', function() {
        if ($(this).prop('checked')) {
            var view = map.getView();
            var proj = view.getProjection();
            var h = proj.getExtent()[3];
            view.setCenter([currentPosition[0], h - currentPosition[1]]);
        }
    });
    */

    setPosition(1323,1624,0,true);

    var lastAlive = Date.now();
    function pollStatus() {
        $.ajax('http://127.0.0.1:27554', {
            dataType: 'jsonp',
            success: function(data) {
                if (data.chr.length > 0 && data.srv.length > 0) {
                    document.title = title + ' - ' + data.chr + ' (' + data.srv + ')';
                } else {
                    document.title = title + ' - No client selected';
                }
                setPosition(data.pos.x, data.pos.y, data.pos.f);
                setTimeout(pollStatus, 1000);
                lastAlive = Date.now();
            }
        });
    }

    function pollCheck() {
        var now = Date.now();
        if (now - lastAlive > 2000) {
            setPosition(1323,1624,0);
            lastAlive = now;
            setTimeout(pollStatus, 1000);
            document.title = title + ' - Not connected';
        }
    }

    pollStatus();
    setInterval(pollCheck, 1000);
    document.title = title + ' - Connecting';
};
