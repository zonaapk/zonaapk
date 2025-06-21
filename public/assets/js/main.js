document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores de Elementos del DOM ---
    const latestUpdatesContainer = document.getElementById('latest-updates');
    const loadMoreButton = document.getElementById('load-more-button');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const sectionTitle = document.getElementById('section-title');

    // --- Estado de la aplicación ---
    let currentApkIndex = 0;
    const apksPerPage = 12; // Cantidad de APKs a mostrar por carga inicialmente

    // --- Función para crear un slug (URL amigable) ---
    const slugify = (text) => {
        if (typeof text !== 'string') return '';
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    };

    // --- Función para normalizar/acortar el nombre para la visualización en la tarjeta ---
    const getDisplayApkName = (originalName) => {
        if (typeof originalName !== 'string') return originalName;

        // Caso específico para "X (previously Twitter)"
        if (originalName.toLowerCase().includes('x (previously twitter)')) {
            return 'X';
        }
        // Caso específico para "Pinterest" (y su versión/arquitectura)
        if (originalName.toLowerCase().includes('pinterest') && originalName.length > 10) {
            return 'Pinterest';
        }
        // Caso específico para "Discord" si su nombre es muy largo por DMCA
        if (originalName.toLowerCase().includes('name removed to comply with dmca') && originalName.toLowerCase().includes('discord')) {
             return 'Discord';
        }
        
        // Ajuste de maxLength para que "CapCut - Video Editor" quepa completo
        // "CapCut - Video Editor" tiene 21 caracteres. Ponemos un poco más de margen.
        const maxLength = 25; 
        if (originalName.length > maxLength) {
            return originalName.substring(0, maxLength) + '...';
        }

        return originalName;
    };

    // --- Función para normalizar/acortar el nombre del desarrollador para la visualización en la tarjeta ---
    const getDisplayDeveloperName = (originalDeveloper) => {
        if (typeof originalDeveloper !== 'string') return originalDeveloper;

        // Caso específico para el desarrollador de Discord
        if (originalDeveloper.toLowerCase().includes('discord inc.') || originalDeveloper.toLowerCase().includes('discord inc. (name removed to comply with dmca)')) {
            return 'Discord Inc.'; // O 'Discord' si prefieres solo la marca
        }
        // Puedes añadir más casos específicos si aparecen otros desarrolladores con nombres problemáticos.

        const maxLengthDeveloper = 20; // Límite de caracteres para el desarrollador
        if (originalDeveloper.length > maxLengthDeveloper) {
            return originalDeveloper.substring(0, maxLengthDeveloper) + '...';
        }
        
        return originalDeveloper;
    };


    // --- Función para Renderizar Tarjetas de APK ---
    const renderApkCards = (apksToRender, append = false) => {
        if (!latestUpdatesContainer) return;
        
        if (!append) {
            latestUpdatesContainer.innerHTML = ''; // Limpia el contenedor antes de mostrar nuevos resultados
        }

        if (apksToRender.length === 0 && !append) {
            latestUpdatesContainer.innerHTML = '<p class="col-12 text-center">No se encontraron resultados.</p>';
            if (loadMoreButton) loadMoreButton.style.display = 'none';
            return;
        }

        apksToRender.forEach(apk => {
            const displayApkName = getDisplayApkName(apk.name); 
            const displayDeveloperName = getDisplayDeveloperName(apk.developer); // Usar la función para el desarrollador
            const apkCol = document.createElement('div');
            apkCol.className = 'col-lg-4 col-md-6 col-sm-12 mb-4 d-flex align-items-stretch';
            apkCol.innerHTML = `
                <div class="card apk-card h-100">
                    <div class="card-img-top-container">
                         <img src="${apk.image}" class="card-img-top" alt="Logo de ${apk.name}">
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title" title="${apk.name}">${displayApkName}</h5>
                        <p class="card-text text-muted">${displayDeveloperName}</p> <div class="apk-info mt-auto">
                            ${apk.score ? `<span class="badge badge-success">Score: ${apk.score.toFixed(1)} <i class="fas fa-star"></i></span>` : ''}
                        </div>
                        <a href="/apks/${slugify(apk.name)}-${apk.id}.html" class="btn btn-primary btn-card-bottom mt-3">Ver Más</a>
                    </div>
                </div>
            `;
            latestUpdatesContainer.appendChild(apkCol);
        });

        // Mostrar u ocultar el botón "Cargar Más"
        if (loadMoreButton) {
            const totalRendered = document.querySelectorAll('#latest-updates .apk-card').length;
            if (totalRendered < getSortedAndFilteredApks(searchInput.value.trim()).length) {
                loadMoreButton.style.display = 'block';
            } else {
                loadMoreButton.style.display = 'none';
            }
        }
    };

    // --- Función para filtrar y ordenar las APKs ---
    const getSortedAndFilteredApks = (query = '') => {
        let filteredApks = apkList;

        if (query) {
            const lowerCaseQuery = query.toLowerCase();
            filteredApks = apkList.filter(apk =>
                apk.name.toLowerCase().includes(lowerCaseQuery) ||
                apk.developer.toLowerCase().includes(lowerCaseQuery) ||
                (apk.description && apk.description.toLowerCase().includes(lowerCaseQuery))
            );
            sectionTitle.textContent = `Resultados de búsqueda para "${query}"`;
        } else {
            sectionTitle.textContent = 'Top 10 Aplicaciones Más Descargadas en las Últimas 24 Horas'; 
        }

        // Ordenar por fecha de actualización (la más reciente primero) - Placeholder para futura lógica de Top Descargas
        filteredApks.sort((a, b) => {
            const dateA = new Date(a.updated);
            const dateB = new Date(b.updated);
            return dateB - dateA;
        });

        return filteredApks;
    };

    // --- Carga inicial de APKs ---
    if (latestUpdatesContainer && typeof apkList !== 'undefined' && apkList.length > 0) {
        const allApks = getSortedAndFilteredApks();
        const initialApks = allApks.slice(0, apksPerPage);
        renderApkCards(initialApks);
        currentApkIndex = apksPerPage; 
        
        if (loadMoreButton) {
            if (currentApkIndex < allApks.length) {
                loadMoreButton.style.display = 'block';
            } else {
                loadMoreButton.style.display = 'none';
            }
        }

    } else if (latestUpdatesContainer) {
        latestUpdatesContainer.innerHTML = '<p class="col-12 text-center">No se encontraron APKs disponibles.</p>';
        if (loadMoreButton) loadMoreButton.style.display = 'none';
    }


    // --- Funcionalidad "Cargar Más" ---
    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', () => {
            const allApks = getSortedAndFilteredApks(searchInput.value.trim());
            const nextApks = allApks.slice(currentApkIndex, currentApkIndex + apksPerPage);
            renderApkCards(nextApks, true); 
            currentApkIndex += apksPerPage;
            if (currentApkIndex >= allApks.length) {
                loadMoreButton.style.display = 'none';
            }
        });
    }

    // --- Funcionalidad de Búsqueda ---
    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            const query = searchInput.value.trim();
            currentApkIndex = 0; 
            const results = getSortedAndFilteredApks(query);
            const initialResults = results.slice(0, apksPerPage);
            renderApkCards(initialResults);
            currentApkIndex = apksPerPage;

            if (loadMoreButton) {
                if (currentApkIndex < results.length) {
                    loadMoreButton.style.display = 'block';
                } else {
                    loadMoreButton.style.display = 'none';
                }
            }
        });
    }

    // --- Funcionalidad de filtrado por categoría (para category.html) ---
    window.getFullApkDataById = (id) => {
        return apkList.find(apk => apk.id === id);
    };

});