var UOMap = UOMap || {};

UOMap.facets = [
    "Felucca",
    "Trammel",
    "Ilshenar",
    "Malas",
    "Tokuno",
];

UOMap.wsError = function() {
    if (UOMap.socket) {
        UOMap.socket.close();
        UOMap.socket = false;
    }
    setTimeout(UOMap.wsStart, 1000);
};

UOMap.wsClose = function() {
    document.title = UOMap.title + ' - Disconnected';
    UOMap.socket = false;
    setTimeout(UOMap.wsStart, 1000);
};

UOMap.wsOpen = function() {
    document.title = UOMap.title + ' - Connected';
};

UOMap.wsMessage = function(e) {
    var clients = JSON.parse(e.data);
    if (clients.length == 0) {
        return;
    }

    var data = clients[0];
    if (data.name.length > 0 && data.server.length > 0) {
        document.title = UOMap.title + ' - ' + data.name + ' (' + data.server + ')';
    } else {
        document.title = UOMap.title + ' - No client selected';
    }
    UOMap.setPosition(data.x, data.y, data.f);
};

UOMap.socket = false;

UOMap.wsStart = function() {
    if (UOMap.socket) {
        return;
    }
    document.title = UOMap.title + ' - Connecting';
    UOMap.socket = new WebSocket("ws://127.0.0.1:27555");
    UOMap.socket.onopen = UOMap.wsOpen;
    UOMap.socket.onmessage = UOMap.wsMessage;
    UOMap.socket.onerror = UOMap.wsError;
    UOMap.socket.onclose = UOMap.wsClose;
};

UOMap.init = function() {
    UOMap.title = document.title;

    UOMap.olMaps = [];
    UOMap.mapdata.OSI.forEach(function(v,k) {
        var pp = new ol.proj.Projection({
            code: 'pixel',
            units: 'pixels',
            extent: [0, 0, v.size[0], v.size[1]]
        });

        UOMap.olMaps[k] = {
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

    UOMap.curMap = -1;
    UOMap.map = new ol.Map({
        target: 'map',
        layers: [ ],
        view: new ol.View(),
        controls: []
    });

    UOMap.map.on("pointermove", function(e) {
        var view = UOMap.map.getView();
        var proj = view.getProjection();
        var h = proj.getExtent()[3];
        $('#map > .mousepos').text(parseInt(e.coordinate[0]) + '.' + parseInt(h - e.coordinate[1]));
    });

    $('#map').hover(function() {
        $('#map > .mousepos').show();
    }, function() {
        $('#map > .mousepos').hide();
    });

    UOMap.centerStyle = new ol.style.Style({
        image: new ol.style.Icon(({
            anchor: [0.5,0.5],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            src: 'img/center.png'
        }))
    });

    UOMap.centerFeature = new ol.Feature({
        geometry: new ol.geom.Point([0,0])
    });

    UOMap.centerFeature.setStyle(UOMap.centerStyle);

    UOMap.centerSource =  new ol.source.Vector({
        features: [UOMap.centerFeature],
    });

    UOMap.iconLayer = new ol.layer.Vector({ source: UOMap.centerSource });

    UOMap.currentPosition = [0,0,0];

    UOMap.setPosition(1323,1624,0,true);

    UOMap.wsStart();
};

UOMap.setPosition = function(x,y,f,force) {
    var moved = (UOMap.currentPosition[0] != x || UOMap.currentPosition[1] != y || UOMap.currentPosition[2] != f);
    currentPosition = [x,y,f];
    var force = force || false;
    var map = UOMap.map;

    if (typeof f != 'undefined' && f != UOMap.curMap) {
        var rot = map.getView().getRotation() || Math.PI / 4;
        var zoom = map.getView().getZoom() || 4;

        map.getLayers().forEach(function(layer) {
            map.removeLayer(layer);
        });

        map.addLayer(UOMap.olMaps[f].layer);
        map.addLayer(UOMap.iconLayer);

        map.setView(new ol.View({
            projection: UOMap.olMaps[f].projection,
            center: ol.extent.getCenter(UOMap.olMaps[f].projection.getExtent()),
            rotation: rot,
            zoom: zoom
        }));

        UOMap.curMap = f;
    }

    if (moved || force) {
        var view = map.getView();
        var proj = view.getProjection();
        var h = proj.getExtent()[3];
        view.setCenter([x, h - y]);
        UOMap.centerFeature.setGeometry(new ol.geom.Point([x, h - y]));
    }

    $('#map > .charpos').text(x + '.' + y + ' in ' + UOMap.facets[f]);
};
