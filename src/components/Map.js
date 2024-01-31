import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import shp from "shpjs";
import * as turf from "@turf/turf";

const Map = ({ polygonCoordinates }) => {
    const mapRef = useRef(null);

    useEffect(() => {
        const map = L.map(mapRef.current);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
        }).addTo(map);

        const drawControl = new L.Control.Draw({
            draw: {
                polygon: true,
                polyline: false,
                rectangle: false,
                circle: false,
                marker: false,
            },
            edit: {
                featureGroup: new L.FeatureGroup(),
            },
        });
        map.addControl(drawControl);

        map.on(L.Draw.Event.CREATED, async (event) => {
            const { layer } = event;
            const drawnPolygon = layer.toGeoJSON();

            // Load city boundaries from the shapefile
            const cities = await shp("./cities.shp");
            const cityFeatures = cities.features;
            cities ? console.log("uploaded succesfully") : console.log("error")
            // Check for intersection with each city boundary
            for (const city of cityFeatures) {
                const intersection = turf.intersect(drawnPolygon, city.geometry);
                if (intersection) {
                    // Highlight intersected area
                    L.geoJSON(intersection, { style: { color: "red", fillOpacity: 0.5 } }).addTo(map);
                    // Fit the map to the intersected polygon bounds
                    map.fitBounds(L.geoJSON(intersection).getBounds());
                    // Identify the city (you may want to display it in UI)
                    console.log("Intersected with city:", city.properties.name);
                    return;
                }
            }

            alert("No intersection with any city boundary.");
            drawControl.options.edit.featureGroup.addLayer(layer);
        });

        if (polygonCoordinates && polygonCoordinates.length > 0) {
            const bounds = L.latLngBounds(polygonCoordinates);
            map.fitBounds(bounds);
            L.polygon(polygonCoordinates, { color: "blue" }).addTo(map);
        } else {
            map.setView([0, 0], 2);
        }

        return () => {
            map.off(L.Draw.Event.CREATED);
            map.remove();
        };
    }, [polygonCoordinates]);

    return <div ref={mapRef} style={{ height: "500px" }} />;
};

export default Map;
