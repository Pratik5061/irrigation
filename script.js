let map;
const GEOSERVER_URL = "http://143.110.254.16:8080/geoserver/Narmada/wms";
const layers = {};
// Layers configured to show attributes upon clicking
const queryableLayers = ["Buildings", "Road", "Bridge", "Nala", "River", "Alignment", "GCP"];

let flowLayer, animationId;
let offset = 0;
const flowPath = [[23.10570045423385, 79.84314717412799], [23.10932889637078, 79.85273642462309], [23.10904978891816, 79.85941248509437], [23.1086032157872, 79.87070109643672], [23.10848775714647, 79.87541707910026], [23.112378545358162, 79.88404913531186],];

function openTab(id, el) {
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    el.classList.add("active");

    if (id === "data") {
        setTimeout(() => {
            if (!map) initMap();
            map.invalidateSize();
        }, 300);
    }
}

function initMap() {
    map = L.map("map").setView([23.121, 79.912], 14);
    const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}").addTo(map);
    L.control.layers({ Satellite: satellite, Street: street }).addTo(map);

    // Click listener to fetch feature attributes
    map.on('click', function(e) {
        handleMapClick(e);
    });
}

function toggleLayer(cb) {
    const layerID = cb.value;
    if (cb.checked) {
        layers[layerID] = L.tileLayer.wms(GEOSERVER_URL, {
            layers: `Narmada:${layerID}`,
            transparent: true,
            format: "image/png",
            version: '1.1.1',
            srs: 'EPSG:4326' 
        }).addTo(map);
        addLegend(layerID);
    } else {
        if (layers[layerID]) {
            map.removeLayer(layers[layerID]);
            removeLegend(layerID);
            delete layers[layerID];
            document.getElementById("attribute-container").style.display = "none";
        }
    }
}

function handleMapClick(e) {
    const activeLayers = Object.keys(layers).filter(id => 
        map.hasLayer(layers[id]) && queryableLayers.includes(id)
    );

    if (activeLayers.length === 0) return;

    const layerToQuery = activeLayers[activeLayers.length - 1];
    const size = map.getSize();
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const point = map.latLngToContainerPoint(e.latlng);

    const url = `${GEOSERVER_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&` +
                `QUERY_LAYERS=Narmada:${layerToQuery}&LAYERS=Narmada:${layerToQuery}&` +
                `INFO_FORMAT=application/json&X=${Math.round(point.x)}&Y=${Math.round(point.y)}&` +
                `SRS=EPSG:4326&WIDTH=${size.x}&HEIGHT=${size.y}&` +
                `BBOX=${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;

    // ... existing code above ...
    fetch(url)
        .then(res => res.json())
        // Replace the logic inside handleMapClick's fetch response:
// Inside the handleMapClick fetch response in script.js:
// Inside script.js -> handleMapClick -> fetch result
.then(data => {
    const infoDiv = document.getElementById("attribute-info");
    const container = document.getElementById("attribute-container");

    if (data.features && data.features.length > 0) {
        container.style.display = "block";
        
        // RE-CALCULATE MAP SIZE
        setTimeout(() => { map.invalidateSize(); }, 100);

        const props = data.features[0].properties;
        let html = `<table class="attr-table"><thead><tr>`;
        
        for (let key in props) {
            if (typeof props[key] !== 'object' && props[key] !== null) {
                html += `<th>${key}</th>`;
            }
        }
        html += `</tr></thead><tbody><tr>`;
        for (let key in props) {
            if (typeof props[key] !== 'object' && props[key] !== null) {
                html += `<td>${props[key]}</td>`;
            }
        }
        html += `</tr></tbody></table>`;
        
        infoDiv.innerHTML = html;
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        container.style.display = "none";
        setTimeout(() => { map.invalidateSize(); }, 100);
    }
})
        .catch(err => console.error("GeoServer query error:", err));
}
function toggleFlowAnimation(cb) {
    if (cb.checked) {
        flowLayer = L.polyline(flowPath, { color: '#00f5ff', weight: 8, opacity: 0.8, dashArray: '15, 30' }).addTo(map);
        animateFlow();
    } else if (flowLayer) {
        map.removeLayer(flowLayer);
        cancelAnimationFrame(animationId);
    }
}

function animateFlow() {
    offset--;
    if (flowLayer) flowLayer.setStyle({ dashOffset: offset });
    animationId = requestAnimationFrame(animateFlow);
}

// Updated in script.js
function addLegend(id) {
    const div = document.createElement("div");
    div.id = `legend-${id}`;
    div.className = "legend-item";

    // increased size to 24x24 for better clarity
    // added hideLayerName:true to keep the layout clean
    const legendUrl = `${GEOSERVER_URL}?service=WMS&request=GetLegendGraphic&format=image/png&layer=Narmada:${id}&width=24&height=24&LEGEND_OPTIONS=fontSize:12;fontAntiAliasing:true;hideLayerName:true`;

    div.innerHTML = `
        <span class="legend-text" style="min-width: 90px;">${id}:</span>
        <img src="${legendUrl}" alt="${id} legend">
    `;
    document.getElementById("legend-container").appendChild(div);
}

function removeLegend(id) {
    const el = document.getElementById(`legend-${id}`);
    if (el) el.remove();
}