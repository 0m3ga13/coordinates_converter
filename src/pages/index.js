import React, { useEffect, useState } from "react";

import proj4 from "proj4";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("@/components/Map"), { ssr: false })


const convertCoordinates = (utmCoordinates, utmZone) => {
  if (!utmZone) {
    alert("Please select the UTM zone before converting coordinates.");
    return null;
  }

  const utmNordSaharaProjection = `+proj=utm +zone=${utmZone} +a=6378249.145 +rf=293.465 +towgs84=-267.407,-47.068,446.357,-0.179423,5.577661,-1.277620,1.204866 +units=m +no_defs +type=crs`;
  proj4.defs("NordSahara", utmNordSaharaProjection);

  const utmWgsProjection = `EPSG:${utmZone}`;
  proj4.defs(
    utmWgsProjection,
    `+proj=utm +zone=${utmZone} +datum=WGS84 +units=m +no_defs`
  );

  // Convert UTM Nord Sahara to Geographic
  const geographicCoordinates = proj4(
    "NordSahara",
    "EPSG:4326",
    utmCoordinates
  );

  // Convert Geographic to UTM WGS84
  const utmWgsCoordinates = proj4(
    "EPSG:4326",
    utmWgsProjection,
    geographicCoordinates
  );

  return {
    utmX: utmCoordinates[0],
    utmY: utmCoordinates[1],
    latitude: geographicCoordinates[1],
    longitude: geographicCoordinates[0],
    utmWgsX: utmWgsCoordinates[0],
    utmWgsY: utmWgsCoordinates[1],
  };
};

const ConverterPage = () => {
  const [utmZone, setUtmZone] = useState(30);
  const [fileContent, setFileContent] = useState(null);
  const [coordinatesArray, setCoordinatesArray] = useState([]);
  const [convertedCoordinates, setConvertedCoordinates] = useState([]);
  const [kmlContent, setKmlContent] = useState("");
  const [kmlFillColor, setKmlFillColor] = useState("#00FF00"); // Default color is green

  const handleFileChange = (event) => {
    const fileInput = event.target;
    const file = fileInput.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = function (e) {
        const content = e.target.result;
        setFileContent(content);
        setUtmZone(31);

        const parsedCoordinatesArray = content
          .trim()
          .split("\n")
          .map((line) => line.split(",").map(Number));

        setCoordinatesArray(parsedCoordinatesArray);
        setConvertedCoordinates([]);
      };

      reader.readAsText(file);
    }
  };

  const handleCoordinateChange = (index, field, value) => {
    const updatedCoordinates = [...coordinatesArray];
    updatedCoordinates[index][field] = parseFloat(value); // Convert input value to float
    setCoordinatesArray(updatedCoordinates);
  };

  const handleConvert = () => {
    if (!utmZone) {
      alert("Please select the UTM zone before converting coordinates.");
      return;
    }

    const convertedCoords = coordinatesArray.map((coordinate) => {
      return convertCoordinates(coordinate, utmZone);
    });

    setConvertedCoordinates(convertedCoords);

    // Generate KML content
    const kmlData = generateKML(convertedCoords);
  setKmlContent(kmlData);
  };

const generateKML = (coordinates) => {
  let kmlString = `<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
      <Document>
          <name>Converted Coordinates</name>
          <Placemark>
              <name>Converted Coordinates</name>
              <Style>
                <LineStyle>
                  <color>${kmlLineColor}</color>
                </LineStyle>
                <PolyStyle>
                  <color>${kmlFillColor}</color>
                </PolyStyle>
              </Style>
              <LineString>
                  <coordinates>`;

  coordinates.forEach((coord) => {
    kmlString += `${coord.longitude},${coord.latitude},0 `;
  });

  // Repeat the first coordinate to close the polygon
  const firstCoordinate = coordinates[0];
  kmlString += `${firstCoordinate.longitude},${firstCoordinate.latitude},0 `;

  kmlString += `</coordinates>
              </LineString>
          </Placemark>
      </Document>
    </kml>
  `;

  return kmlString;
};


  const downloadKML = () => {
    const blob = new Blob([kmlContent], {
      type: "application/vnd.google-earth.kml+xml",
    });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "converted_coordinates.kml";
    link.click();
  };

  const calculateSurfaceArea = () => {
    if (coordinatesArray.length < 3) {
      // A polygon must have at least 3 vertices
      return 0;
    }

    // Add the first point to the end to close the polygon
    const closedCoordinatesArray = [...coordinatesArray, coordinatesArray[0]];

    let area = 0;
    for (let i = 0; i < closedCoordinatesArray.length - 1; i++) {
      const xi = closedCoordinatesArray[i][0];
      const xiPlus1 = closedCoordinatesArray[i + 1][0];
      const yi = closedCoordinatesArray[i][1];
      const yiPlus1 = closedCoordinatesArray[i + 1][1];

      area += xi * yiPlus1 - xiPlus1 * yi;
    }

    // Convert the area from square meters to hectares
    const areaInHectares = Math.abs(area) / 10000;

    return areaInHectares / 2;
  };

  const handleAddPoint = () => {
    setCoordinatesArray([...coordinatesArray, [0, 0]]);
    setConvertedCoordinates([]);
  };

  const handleDeletePoint = (index) => {
    const updatedCoordinates = [...coordinatesArray];
    updatedCoordinates.splice(index, 1);

    const updatedConvertedCoordinates = [...convertedCoordinates];
    updatedConvertedCoordinates.splice(index, 1);

    setCoordinatesArray(updatedCoordinates);
    setConvertedCoordinates(updatedConvertedCoordinates);
  };

  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");

  const handleAddManualPoint = () => {
    const latitude = parseFloat(manualLatitude);
    const longitude = parseFloat(manualLongitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      alert("Please enter valid numeric coordinates.");
      return;
    }

    setCoordinatesArray([...coordinatesArray, [longitude, latitude]]);
    setConvertedCoordinates([]);
    setManualLatitude("");
    setManualLongitude("");
  };

  return (
    <div className='container mx-auto p-4'>
      <div className='mt-4 text-3xl font-bold text-center '>
        <p>Nord SAHARA TO WGS converter (UTM) </p>
      </div>
      <div className="flex gap-1">
        <p className="font-semibold">
          Upload a CSV
        </p>
        <input
          type='file'
          id='fileInput'
          accept='.csv'
          onChange={handleFileChange}
          className='mb-4'
        />
      </div>
             <div className="flex gap-2 items-center">
        <label htmlFor='kmlFillColor' className='block mb-2'>
          Select Fill Color:
        </label>
        <input
          type="color"
          id="kmlFillColor"
          value={kmlFillColor}
          onChange={(e) => setKmlFillColor(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <div className='mb-4 flex gap-1 items-center'>
          <label htmlFor='manualLongitude' className='block mb-2'>
            X
          </label>
          <input
            type='text'
            id='manualLongitude'
            value={manualLongitude}
            onChange={(e) => setManualLongitude(e.target.value)}
            className='border border-gray-300 p-2 rounded mb-2'
          />
        </div>

        <div className='mb-4 flex gap-1 items-center'>
          <label htmlFor='manualLatitude' className='block mb-2'>
            Y
          </label>
          <input
            type='text'
            id='manualLatitude'
            value={manualLatitude}
            onChange={(e) => setManualLatitude(e.target.value)}
            className='border border-gray-300 p-2 rounded mb-2'
          />
        </div>

        <button
          onClick={handleAddManualPoint}
          className='bg-gray-500 text-white px-4 py-2 rounded mb-4'
        >
          Add  Point
        </button>

      </div>
      <div className="flex gap-2 items-center">
        <label htmlFor='utmZone' className='block mb-2'>
          Select UTM Zone:
        </label>
        <select
          id='utmZone'
          onChange={(e) => setUtmZone(parseInt(e.target.value))}
          className='border border-gray-300 p-2 rounded mb-4'
        >
          <option value='' disabled selected>
            Choose UTM Zone
          </option>
          <option value='29'>Zone 29</option>
          <option value='30'>Zone 30</option>
          <option value='31'>Zone 31</option>
          <option value='32'>Zone 32</option>
        </select>
        <button
          onClick={handleConvert}
          className='bg-blue-500 text-white px-4 py-2 rounded mb-4'
        >
          Convert Coordinates
        </button>
      </div>


      {coordinatesArray.length > 0 && (
        <div className='mb-8'>
          <h3 className='text-lg font-semibold mb-2'>Coordinate Table</h3>
          <table className='table-auto w-full'>
            <thead>
              <tr>
                <th className='border px-4 py-2'>UTM Nord Sahara (X)</th>
                <th className='border px-4 py-2'>UTM Nord Sahara (Y)</th>
                <th className='border px-4 py-2'>Geographic (Lat)</th>
                <th className='border px-4 py-2'>Geographic (Lon)</th>
                <th className='border px-4 py-2'>UTM WGS (X)</th>
                <th className='border px-4 py-2'>UTM WGS (Y)</th>
              </tr>
            </thead>
            <tbody>
              {coordinatesArray.map((coordinate, index) => {
                const convertedCoordinate = convertedCoordinates[index];
                return (
                  <tr key={index}>
                    <td className='border px-4 py-2'>
                      <input
                        type='text'
                        value={coordinate[0]}
                        onChange={(e) =>
                          handleCoordinateChange(index, 0, e.target.value)
                        }
                      />
                    </td>
                    <td className='border px-4 py-2'>
                      <input
                        type='text'
                        value={coordinate[1]}
                        onChange={(e) =>
                          handleCoordinateChange(index, 1, e.target.value)
                        }
                      />
                    </td>
                    <td className='border px-4 py-2'>
                      {convertedCoordinate ? convertedCoordinate.latitude : "-"}
                    </td>
                    <td className='border px-4 py-2'>
                      {convertedCoordinate
                        ? convertedCoordinate.longitude
                        : "-"}
                    </td>
                    <td className='border px-4 py-2'>
                      {convertedCoordinate ? convertedCoordinate.utmWgsX : "-"}
                    </td>
                    <td className='border px-4 py-2'>
                      {convertedCoordinate ? convertedCoordinate.utmWgsY : "-"}
                    </td>
                    <td className='border px-4 py-2'>
                      <button
                        onClick={() => handleDeletePoint(index)}
                        className='bg-red-500 text-white px-4 py-2 rounded'
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>

          <button
            onClick={downloadKML}
            className='bg-green-500 text-white px-4 py-2 rounded my-4'
            disabled={!kmlContent}
          >
            Download KML
          </button>
          <Map polygonCoordinates={convertedCoordinates.map(coord => [coord.latitude, coord.longitude])} />

          <div className='mt-4 text-xl font-bold text-right '>
            <p>Surface Area: {calculateSurfaceArea().toFixed(2)} hectares</p>
          </div>

        </div>

      )}

    </div>
  );
};

export default ConverterPage;
