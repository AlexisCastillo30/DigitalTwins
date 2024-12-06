export class ProgressBarPanel {
    constructor(extension, panelId, canvasId) {
        this.extension = extension;
        this.viewer = extension.viewer;
        this.container = document.getElementById(panelId);
        this.canvas = document.getElementById(canvasId);

        if (!this.container) {
            console.error(`El contenedor con id "${panelId}" no existe en el DOM.`);
            return;
        }

        if (!this.canvas) {
            console.error(`El canvas con id "${canvasId}" no existe en el DOM.`);
            return;
        }

        this.chart = null;
        this.initChart();
    }

    initChart() {
        const ctx = this.canvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [], // Parámetros
                datasets: [] // Valores por parámetro
            },
            options: {
                responsive: true,
                indexAxis: 'y', // Barras horizontales
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Porcentaje (%)'
                        }
                    },
                    y: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Parámetros'
                        }
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Distribución porcentual de valores por parámetro' },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                let value = context.parsed.x;
                                if (label) {
                                    label += ': ';
                                }
                                label += value.toFixed(2) + '%';
                                return label;
                            }
                        }
                    }
                },
                onClick: (evt, activeElements) => {
                    if (activeElements.length > 0) {
                        const element = activeElements[0];
                        const paramIndex = element.index;
                        const datasetIndex = element.datasetIndex;

                        const clickedParam = this.chart.data.labels[paramIndex];
                        const clickedValue = this.chart.data.datasets[datasetIndex].label;

                        const { paramFrequencies } = this.currentData;
                        const { dbIdsPorValor } = paramFrequencies[clickedParam];
                        const ids = dbIdsPorValor && dbIdsPorValor[clickedValue] ? dbIdsPorValor[clickedValue] : [];

                        if (ids.length > 0) {
                            this.viewer.clearSelection();
                            this.viewer.isolate(ids);
                            this.viewer.fitToView(ids);
                        }
                    }
                }
            }
        });
    }

    async update(model) {
        try {
            const { parameterValues, paramFrequencies, allDistinctValues, parameters } = await this.calculateProgress(model);

            this.currentData = { parameterValues, paramFrequencies, allDistinctValues, parameters };

            const distinctValuesArray = Array.from(allDistinctValues);

            // Crear datasets apilados por cada valor distinto
            const datasets = distinctValuesArray.map(valueName => {
                return {
                    label: valueName,
                    data: parameters.map(param => {
                        const { freq, total } = paramFrequencies[param];
                        if (total === 0) return 0;
                        const count = freq[valueName] || 0;
                        const percentage = (count / total) * 100;
                        return percentage;
                    }),
                    backgroundColor: this.getRandomColor(),
                    borderColor: '#fff',
                    borderWidth: 1
                };
            });

            this.chart.data.labels = parameters;
            this.chart.data.datasets = datasets;
            this.chart.update();

            // Ajustar altura del canvas
            this.canvas.style.height = '500px';

            // No se muestran detalles, solo el gráfico
            this.container.classList.remove('hidden-panel');
        } catch (error) {
            console.error('Error al actualizar el gráfico:', error);
        }
    }

    async calculateProgress(model) {
        return new Promise((resolve, reject) => {
            if (!model) {
                return reject("El modelo aún no está cargado.");
            }

            const parameters = ['ACM_BIM_ETE', 'ACM_BIM_R', 'ACM_BIM_FAC', 'ACM_BIM_SIST', 'ACM_BIM_DIS', 'ADP_CP_CA'];

            this.viewer.getObjectTree((tree) => {
                const dbIds = [];
                tree.enumNodeChildren(tree.getRootId(), (dbId) => {
                    dbIds.push(dbId);
                }, true);

                // Obtener las propiedades en bulk
                model.getBulkProperties(dbIds, parameters, (results) => {
                    const parameterValues = {};
                    const paramFrequencies = {};
                    const allDistinctValues = new Set();

                    parameters.forEach(param => {
                        parameterValues[param] = [];
                        paramFrequencies[param] = {
                            freq: {},
                            total: 0,
                            dbIdsPorValor: {}
                        };
                    });

                    // Procesar resultados
                    results.forEach(result => {
                        const dbId = result.dbId;
                        result.properties.forEach(prop => {
                            if (parameters.includes(prop.displayName)) {
                                if (prop.displayValue) {
                                    parameterValues[prop.displayName].push(prop.displayValue);

                                    // Actualizar frecuencias
                                    const val = prop.displayValue;
                                    const pf = paramFrequencies[prop.displayName];
                                    pf.freq[val] = (pf.freq[val] || 0) + 1;
                                    pf.total += 1;
                                    allDistinctValues.add(val);

                                    // Guardar dbId
                                    if (!pf.dbIdsPorValor[val]) {
                                        pf.dbIdsPorValor[val] = [];
                                    }
                                    pf.dbIdsPorValor[val].push(dbId);
                                } else {
                                    // Valor vacío
                                    parameterValues[prop.displayName].push(null);
                                }
                            }
                        });
                    });

                    resolve({ parameterValues, paramFrequencies, allDistinctValues, parameters });
                }, reject);
            });
        });
    }

    getRandomColor() {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `rgba(${r}, ${g}, ${b}, 0.6)`;
    }
}
