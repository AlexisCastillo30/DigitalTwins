const DATAGRID_CONFIG = {
    requiredProps: ['Category', 'Type Name'],
    columns: [
        { title: 'Category', field: 'category', width: 150, headerSort: false },
        { title: 'Type Name', field: 'typeName', width: 150, headerSort: false },
        {
            title: 'Count',
            field: 'count',
            hozAlign: 'center',
            formatter: (cell) => {
                // Mostrar número y barra de progreso
                const value = cell.getValue();
                const maxCount = cell.getColumn().getDefinition().maxCount || 1;
                const percentage = (value / maxCount) * 100;
                return `
                    <div style="display: flex; align-items: center;">
                        <div style="width: 50px;">${value}</div>
                        <div style="flex-grow: 1; background: #eee; margin-left: 5px; height: 10px; position: relative;">
                            <div style="background: #3b82f6; width: ${percentage}%; height: 100%;"></div>
                        </div>
                    </div>
                `;
            }
        }
    ],
    groupBy: ['category'], // Agrupar solo por categoría
    createRow: (category, typeName, count, dbids) => {
        return {
            category,
            typeName,
            count,
            dbids
        };
    },
    onRowClick: (row, viewer) => {
        viewer.clearSelection(); // Limpiar cualquier selección previa
        viewer.select(row.dbids); // Seleccionar los elementos asociados a la fila
        viewer.fitToView(row.dbids); // Ajustar la vista a los elementos seleccionados

        // Obtener todos los elementos visibles
        const allDbIds = [];
        viewer.getObjectTree((tree) => {
            tree.enumNodeChildren(tree.getRootId(), (dbid) => {
                allDbIds.push(dbid);
            }, true);
        });

        // Identificar elementos no seleccionados
        const unselectedDbIds = allDbIds.filter(id => !row.dbids.includes(id));

        // Mostrar los seleccionados y aplicar transparencia a los no seleccionados
        unselectedDbIds.forEach(id => viewer.setThemingColor(id, new THREE.Vector4(1, 1, 1, 0.1))); // Hacer transparentes los no seleccionados
        row.dbids.forEach(id => viewer.setThemingColor(id, null)); // Restaurar los seleccionados

        viewer.impl.sceneUpdated(true); // Actualizar la escena
    }
};

// Función para transformar categorías (remover "Revit")
function transformCategory(category) {
    if (!category) return 'No Category'; // Manejar categorías vacías
    return category.replace('Revit ', ''); // Eliminar la palabra 'Revit'
}

export class DataGridPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.left = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 500) + 'px';
        this.container.style.height = (options.height || 400) + 'px';
        this.container.style.resize = 'none';
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.content = document.createElement('div');
        this.content.style.height = '350px';
        this.content.style.backgroundColor = 'white';
        this.content.innerHTML = `<div class="datagrid-container" style="position: relative; height: 100%;"></div>`;
        this.container.appendChild(this.content);

        // Configuración de Tabulator
        this.table = new Tabulator('.datagrid-container', {
            height: '100%',
            layout: 'fitColumns',
            columns: DATAGRID_CONFIG.columns,
            groupBy: DATAGRID_CONFIG.groupBy,
            initialSort: [{ column: 'count', dir: 'desc' }], // Ordenar por 'count' de forma descendente
            groupStartOpen: false, // Inicializar en modo colapsado
            rowClick: (e, row) => DATAGRID_CONFIG.onRowClick(row.getData(), this.extension.viewer)
        });
    }

    update(model, dbids) {
        model.getBulkProperties(dbids, DATAGRID_CONFIG.requiredProps, (results) => {
            // Filtrar los elementos cuya 'Category' sea 'Revit Center Line'
            results = results.filter((result) => {
                const category = result.properties.find(p => p.displayName === 'Category')?.displayValue || 'No Category';
                return category !== 'Revit Center Line'; // Excluir solo esta categoría
            });

            const groupedData = {};
            let categoryCounts = {}; // Contador por categoría
            let maxCount = 0;

            results.forEach((result) => {
                const originalCategory = result.properties.find(p => p.displayName === 'Category')?.displayValue || 'No Category';
                const category = transformCategory(originalCategory); // Transformar categoría
                const typeName = result.properties.find(p => p.displayName === 'Type Name')?.displayValue || 'No Type Name';

                // Crear una clave única para agrupar por categoría y tipo
                const key = `${category}|${typeName}`;

                if (!groupedData[key]) {
                    groupedData[key] = {
                        category,
                        typeName,
                        count: 0,
                        dbids: []
                    };
                }

                // Incrementar el contador de tipo y de categoría
                groupedData[key].count += 1;
                groupedData[key].dbids.push(result.dbId);

                if (!categoryCounts[category]) {
                    categoryCounts[category] = 0;
                }
                categoryCounts[category] += 1;

                // Actualizar el máximo 'count' para la barra de progreso
                if (groupedData[key].count > maxCount) {
                    maxCount = groupedData[key].count;
                }
            });

            // Agregar la suma total de elementos a la categoría
            const tableData = Object.values(groupedData).map(data => {
                return DATAGRID_CONFIG.createRow(data.category, data.typeName, data.count, data.dbids);
            });

            // Actualizar el máximo 'count' en la definición de la columna 'Count'
            this.table.getColumn('count').updateDefinition({ maxCount });

            // Reemplazar los datos en la tabla
            this.table.replaceData(tableData);

            // Agregar totalizadores a los grupos
            this.table.setGroupHeader((value, count) => {
                const totalItems = categoryCounts[value] || 0;
                return `${value} (${totalItems} items)`;
            });
        }, (err) => {
            console.error(err);
        });
    }
}
