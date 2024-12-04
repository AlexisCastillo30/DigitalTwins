import { initViewer, loadModel } from './viewer.js';
import { initTree } from './sidebar.js';

const login = document.getElementById('login');
try {
    const resp = await fetch('/api/auth/profile');
    if (resp.ok) {
        const user = await resp.json();
        login.innerText = `Logout (${user.name})`;
        login.onclick = () => {
            const iframe = document.createElement('iframe');
            iframe.style.visibility = 'hidden';
            iframe.src = 'https://accounts.autodesk.com/Authentication/LogOut';
            document.body.appendChild(iframe);
            iframe.onload = () => {
                window.location.replace('/api/auth/logout');
                document.body.removeChild(iframe);
            };
        }
        const viewer = await initViewer(document.getElementById('preview'));
        initTree('#tree', (id) => loadModel(viewer, window.btoa(id).replace(/=/g, '')));
    } else {
        login.innerText = 'Login';
        login.onclick = () => window.location.replace('/api/auth/login');
    }
    login.style.visibility = 'visible';
} catch (err) {
    alert('Could not initialize the application. See console for more details.');
    console.error(err);
}
// Seleccionamos los elementos
const menuBtn = document.getElementById('menu-btn');
const toolbar = document.getElementById('toolbar');
const sidebar = document.getElementById('sidebar');
const tree = document.getElementById('tree');

// Alternar el estado del toolbar (expandido/contraído)
menuBtn.addEventListener('click', function () {
    // Alternamos la clase 'hidden' del toolbar
    toolbar.classList.toggle('hidden');

    // Comprobamos si el toolbar está contraído o expandido
    if (toolbar.classList.contains('hidden')) {
        // Si el toolbar está contraído, actualizamos el sidebar
        sidebar.classList.remove('expanded');
        sidebar.classList.add('collapsed');
    } else {
        // Si el toolbar está expandido, actualizamos el sidebar
        sidebar.classList.remove('collapsed');
        sidebar.classList.add('expanded');
    }
});

// Alternar el estado del sidebar (ocultar/mostrar)
document.getElementById('menu-sidebar-btn').addEventListener('click', function () {
    // Alternar la visibilidad del sidebar
    sidebar.classList.toggle('hidden');

    // También ocultar el árbol cuando el sidebar se oculte
    if (sidebar.classList.contains('hidden')) {
        tree.style.display = 'none'; // Oculta el árbol
    } else {
        tree.style.display = 'block'; // Muestra el árbol
    }
});










