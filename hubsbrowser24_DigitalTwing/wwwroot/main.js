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
//document.getElementById('toggleSidebar').addEventListener('click', function () {
//    var sidebar = document.getElementById('sidebar');
//    var preview = document.getElementById('preview');
//    var toolbar = document.getElementById('toolbar');

//    sidebar.classList.toggle('hidden'); // Alterna la visibilidad del sidebar
//    preview.classList.toggle('expanded'); // Expande el viewer
//});
document.getElementById('menu-btn').addEventListener('click', function () {
    var toolbar = document.getElementById('toolbar');
    toolbar.classList.toggle('hidden'); /* Alterna la visibilidad del toolbar */

    var preview = document.getElementById('preview');
    preview.classList.toggle('expanded'); /* Expande el área de vista previa */
});







