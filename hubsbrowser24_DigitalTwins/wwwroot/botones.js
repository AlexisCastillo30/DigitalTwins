export default class botones {
    constructor() {
        this.init();
    }

    init() {
        this.attachEventToButton("quality-btn", () => {
            console.log("Botón BIM Quality presionado");
            this.togglePanel("bim-quality-panel");
        });
    }

    attachEventToButton(buttonId, callback) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener("click", callback);
        } else {
            console.error(`No se encontró el botón con id: ${buttonId}`);
        }
    }

    togglePanel(panelId) {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.classList.toggle("visible-panel");
        } else {
            console.error(`No se encontró el panel con id: ${panelId}`);
        }
    }
}
