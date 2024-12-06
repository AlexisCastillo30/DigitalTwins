import './extensions/LoggerExtension.js';
import './extensions/SummaryExtension.js';
import './extensions/HistogramExtension.js';
import './extensions/DataGridExtension.js';
import './extensions/GeorefExtension.js';

import './extensions/SensorDataExtension.js';
import './extensions/SensorDetailExtension.js';
import './extensions/SensorHeatmapsExtension.js';
import './extensions/SensorListExtension.js';
import './extensions/ProgressBarExtension.js';

async function getAccessToken(callback) {
    try {
        const resp = await fetch('/api/auth/token');
        if (!resp.ok)
            throw new Error(await resp.text());
        const { access_token, expires_in } = await resp.json();
        callback(access_token, expires_in);
    } catch (err) {
        alert('Could not obtain access token. See the console for more details.');
        console.error(err);
    }
}

export function initViewer(container) {
    return new Promise(function (resolve, reject) {
        Autodesk.Viewing.Initializer({ env: 'AutodeskProduction', getAccessToken }, function () {
            const config = {
                extensions: ['Autodesk.DocumentBrowser', 'LoggerExtension', 'SummaryExtension', 'HistogramExtension', 'DataGridExtension', 'SensorDataExtension', 'GeorefExtension', 'SensorDetailExtension', 'SensorHeatmapsExtension', 'SensorListExtension', 'ProgressBarExtension']
            };
            const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
            viewer.start();
            viewer.setLightPreset(5);
            viewer.setTheme('light-theme');
            resolve(viewer);
        });
    });
}

export function loadModel(viewer, urn) {
    function onDocumentLoadSuccess(doc) {
        viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry());
        // Mostrar el texto solo cuando se cargue el modelo
        const overlayText = document.querySelector('#preview .overlay-text');
        if (overlayText) {
            overlayText.style.display = 'block'; // Mostrar el texto
        }
    }
    function onDocumentLoadFailure(code, message) {
        alert('Could not load model. See console for more details.');
        console.error(message);
    }
    Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
}