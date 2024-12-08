export class ProgressBarPanel {
    static instance = null; // Variable estática para almacenar la única instancia

    constructor(extension, panelId, canvasId) {
        // Si ya existe una instancia, devolverla
        if (ProgressBarPanel.instance) {
            return ProgressBarPanel.instance;
        }

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

        // Guardamos esta instancia única
        ProgressBarPanel.instance = this;
    }

    initChart() {
        // Si el chart ya existe, no crear otro
        if (this.chart) {
            return;
        }

        const ctx = this.canvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                scales: {
                    x: {
                        stacked: true,
                        min: 0,
                        max: 100, // Fuerza el eje X a ir hasta 100%
                        title: {
                            display: true,
                            text: 'Percentage (%)'
                        }
                    },
                    y: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Parameters'
                        }
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: true,
                        text: 'Client Parameters'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const dataset = context.dataset;
                                const labelValue = dataset.label || '';
                                const percentage = context.parsed.x.toFixed(2) + '%';
                                return `${labelValue}: ${percentage}`;
                            }
                        }
                    }
                },
                onClick: (evt, activeElements) => {
                    if (activeElements.length > 0) {
                        const element = activeElements[0];
                        const paramIndex = element.index;
                        const datasetIndex = element.datasetIndex;

                        const paramName = this.chart.data.labels[paramIndex];
                        const clickedValue = this.chart.data.datasets[datasetIndex].label;

                        const { paramFrequencies } = this.currentData;
                        const { dbIdsPorValor } = paramFrequencies[paramName];
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

        // Ajustes de estilo del canvas (solo una vez)
        this.canvas.style.height = '450px';
        this.canvas.style.width = '530px';
        this.canvas.style.backgroundColor = 'white';
        this.canvas.style.border = '2px solid #ccc';
        this.canvas.style.borderRadius = '10px';
        this.canvas.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    }

    async update(model) {
        try {
            const { parameterValues, paramFrequencies, allDistinctValues, parameters } = await this.calculateProgress(model);
            this.currentData = { parameterValues, paramFrequencies, allDistinctValues, parameters };

            // Limpiar datos previos
            this.chart.data.labels = [];
            this.chart.data.datasets = [];

            const distinctValuesArray = Array.from(allDistinctValues);

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

            // Mostrar el panel
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

                    results.forEach(result => {
                        const dbId = result.dbId;
                        result.properties.forEach(prop => {
                            if (parameters.includes(prop.displayName)) {
                                if (prop.displayValue) {
                                    parameterValues[prop.displayName].push(prop.displayValue);
                                    const val = prop.displayValue;
                                    const pf = paramFrequencies[prop.displayName];
                                    pf.freq[val] = (pf.freq[val] || 0) + 1;
                                    pf.total += 1;
                                    allDistinctValues.add(val);

                                    if (!pf.dbIdsPorValor[val]) {
                                        pf.dbIdsPorValor[val] = [];
                                    }
                                    pf.dbIdsPorValor[val].push(dbId);
                                } else {
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
