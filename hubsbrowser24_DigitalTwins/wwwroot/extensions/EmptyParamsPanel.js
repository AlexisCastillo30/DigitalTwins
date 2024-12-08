export class EmptyParamsPanel {
    static instance = null; // variable estática para una sola instancia

    constructor(extension, panelId, canvasId) {
        // Si ya existe una instancia, devolvemos la misma
        if (EmptyParamsPanel.instance) {
            return EmptyParamsPanel.instance;
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

        // Define los parámetros aquí, si no estaban definidos
        this.parameters = [
            'Description',
            'ACM_BIM_DescripcionLarga',
            'ACM_BIM_DIS',
            'Assembly Code',
            'ACM_BIM_OmniclassNumber',
            'ACM_BIM_OmniclassCategory',
            'ACM_BIM_BIMKey',
            'ACM_BIM_Estado',
            'ACM_QTO_CBS1'
        ];

        this.chart = null;
        this.initChart();

        // Guardamos la instancia única
        EmptyParamsPanel.instance = this;
    }

    initChart() {
        // Si el chart ya existe, no crear otro
        if (this.chart) {
            return;
        }

        const ctx = this.canvas.getContext('2d');

        // Antes de crear un nuevo chart, si ya existe uno sobre este canvas, destrúyelo
        const existingChart = Chart.getChart(this.canvas);
        if (existingChart) {
            existingChart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.parameters,
                datasets: [{
                    label: 'Conteo de objetos sin valor',
                    data: [],
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: '#fff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '# of Elements'
                        }
                    },
                    y: {
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
                        text: 'Family Quality'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const val = context.parsed.x;
                                return `${context.label}: ${val} objeto(s) sin valor`;
                            }
                        }
                    }
                },
                onClick: (evt, activeElements) => {
                    if (activeElements.length > 0) {
                        const element = activeElements[0];
                        const paramIndex = element.index;
                        const paramName = this.chart.data.labels[paramIndex];
                        const { emptyDbIds } = this.currentData;
                        const ids = emptyDbIds[paramName] || [];

                        if (ids.length > 0) {
                            this.viewer.clearSelection();
                            this.viewer.isolate(ids);
                            this.viewer.fitToView(ids);
                        }
                    }
                }
            }
        });

        // Ajustes de estilo del canvas
        this.canvas.style.height = '650px';
        this.canvas.style.width = '530px';
        this.canvas.style.backgroundColor = 'white';
        this.canvas.style.border = '2px solid #ccc';
        this.canvas.style.borderRadius = '10px';
        this.canvas.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    }

    async update(model) {
        try {
            const { emptyCounts, emptyDbIds } = await this.calculateEmptyCounts(model);
            this.currentData = { emptyCounts, emptyDbIds };
            this.chart.data.datasets[0].data = this.parameters.map(param => emptyCounts[param] || 0);
            this.chart.update();
            /*this.container.classList.remove('hidden-panel');*/
        } catch (error) {
            console.error('Error al actualizar el gráfico de parámetros vacíos:', error);
        }
    }

    async calculateEmptyCounts(model) {
        return new Promise((resolve, reject) => {
            if (!model) {
                return reject("El modelo aún no está cargado.");
            }

            const parameters = this.parameters;

            this.viewer.getObjectTree((tree) => {
                const dbIds = [];
                tree.enumNodeChildren(tree.getRootId(), (dbId) => {
                    dbIds.push(dbId);
                }, true);

                model.getBulkProperties(dbIds, parameters, (results) => {
                    const emptyCounts = {};
                    const emptyDbIds = {};

                    parameters.forEach(param => {
                        emptyCounts[param] = 0;
                        emptyDbIds[param] = [];
                    });

                    results.forEach(result => {
                        const props = result.properties.filter(p => parameters.includes(p.displayName));
                        parameters.forEach(param => {
                            const prop = props.find(p => p.displayName === param);
                            if (!prop || !prop.displayValue) {
                                emptyCounts[param] += 1;
                                emptyDbIds[param].push(result.dbId);
                            }
                        });
                    });

                    resolve({ emptyCounts, emptyDbIds });
                }, reject);
            });
        });
    }
}
