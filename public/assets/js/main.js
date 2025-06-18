document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores de Elementos del DOM ---
    const latestUpdatesContainer = document.getElementById('latest-updates');
    const loadMoreButton = document.getElementById('load-more-button');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const sectionTitle = document.getElementById('section-title');

    // --- Estado de la aplicación ---
    let currentApkIndex = 0;
    const apksPerPage = 6; // Cantidad de APKs a mostrar por carga

    // --- Función para crear un slug (URL amigable) ---
    const slugify = (text) => {
        if (typeof text !== 'string') return '';
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^äëïöüáéíóúñüa-z0-9\-]+/g, '') // Modificado para permitir caracteres especiales comunes en español
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    };

    // --- Función para Renderizar Tarjetas de APK ---
    const renderApkCards = (apksToRender) => {
        if (!latestUpdatesContainer) return;

        // Limpia el contenedor antes de mostrar nuevos resultados
        // Esto se aplica solo al renderizado inicial o de búsqueda.
        // Para "Cargar Más", las nuevas APKs se añadirán.
        if (currentApkIndex === 0 && !searchInput.value) { // Solo limpiar si es la carga inicial de la página o una nueva búsqueda
            latestUpdatesContainer.innerHTML = '';
        }

        if (apksToRender.length > 0) {
            apksToRender.forEach(apk => {
                const apkCol = document.createElement('div');
                apkCol.className = 'col-lg-4 col-md-6 col-sm-12 mb-4 d-flex align-items-stretch';
                apkCol.innerHTML = `
                    <div class="card apk-card h-100">
                        <div class="card-img-top-container">
                             <img src="${apk.image}" class="card-img-top" alt="Logo de ${apk.name}">
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title" title="${apk.name}">${apk.name}</h5>
                            <p class="card-text text-muted">${apk.developer}</p>

                            <div class="apk-details mt-2 mb-3">
                                <p class="card-text small mb-1">
                                    <strong class="text-primary">Puntuación:</strong> ${apk.score ? apk.score.toFixed(1) : 'N/A'} ⭐
                                </p>
                                <p class="card-text small mb-1">
                                    <strong class="text-primary">Actualizado:</strong> ${apk.updated || 'N/A'}
                                </p>
                                <p class="card-text small mb-0">
                                    <strong class="text-primary">Tamaño:</strong> ${apk.size || 'N/A'}
                                </p>
                            </div>
                            <a href="/apks/${slugify(apk.name)}-${apk.id}.html" class="btn btn-primary mt-auto">Ver Más</a>
                        </div>
                    </div>
                `;
                latestUpdatesContainer.appendChild(apkCol);
            });
        } else {
            // Si no hay APKs para renderizar (por ejemplo, en una búsqueda sin resultados)
            if (currentApkIndex === 0 && searchInput.value) { // Solo si es una búsqueda y no hay resultados
                latestUpdatesContainer.innerHTML = '<p class="col-12 text-center">No se encontraron resultados para tu búsqueda.</p>';
            } else if (currentApkIndex === 0) { // Si no hay APKs al inicio (ej. data.js vacío)
                latestUpdatesContainer.innerHTML = '<p class="col-12 text-center">No hay aplicaciones disponibles en este momento.</p>';
            }
        }
    };

    // --- Carga inicial de APKs ---
    // Asegúrate de que apkList está definido y no está vacío
    if (typeof apkList !== 'undefined' && apkList.length > 0) {
        renderApkCards(apkList.slice(0, apksPerPage));
        currentApkIndex += apksPerPage;

        // Mostrar el botón "Cargar Más" si hay más APKs
        if (apkList.length > apksPerPage) {
            loadMoreButton.style.display = 'block';
        }
    } else {
        latestUpdatesContainer.innerHTML = '<p class="col-12 text-center">No hay aplicaciones disponibles para mostrar.</p>';
        if (loadMoreButton) {
            loadMoreButton.style.display = 'none';
        }
    }

    // --- Funcionalidad del botón "Cargar Más" ---
    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', () => {
            const nextApks = apkList.slice(currentApkIndex, currentApkIndex + apksPerPage);
            renderApkCards(nextApks); // Reutiliza la función de renderizado
            currentApkIndex += apksPerPage;

            if (currentApkIndex >= apkList.length) {
                loadMoreButton.style.display = 'none';
            }
        });
    }

    // --- Funcionalidad de Búsqueda ---
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Previene el envío del formulario
            const searchTerm = searchInput.value.toLowerCase();
            const filteredApks = apkList.filter(apk =>
                apk.name.toLowerCase().includes(searchTerm) ||
                apk.developer.toLowerCase().includes(searchTerm) ||
                (apk.description && apk.description.toLowerCase().includes(searchTerm)) ||
                (apk.genre && apk.genre.toLowerCase().includes(searchTerm))
            );

            currentApkIndex = 0; // Reinicia el índice para la búsqueda
            sectionTitle.textContent = searchTerm ? `Resultados para "${searchTerm}"` : 'Últimas Actualizaciones';
            renderApkCards(filteredApks);

            // Ocultar/mostrar botón "Cargar Más" para la búsqueda
            if (loadMoreButton) {
                loadMoreButton.style.display = 'none'; // Deshabilita "Cargar Más" para resultados de búsqueda
            }
        });
    }
});