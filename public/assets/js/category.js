document.addEventListener('DOMContentLoaded', () => {
    const categoryTitle = document.getElementById('category-title');
    const apksContainer = document.getElementById('category-apks-container');

    // Función para obtener el parámetro de la URL (ej: ?cat=productividad)
    const getCategoryFromURL = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('cat');
    };

    // Función para crear un slug (URL amigable)
    const slugify = (text) => {
        if (typeof text !== 'string') {
            return '';
        }
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
    
    // Función para renderizar las tarjetas de APK (para una categoría específica)
    const renderApkCards = (apks) => {
        if (!apksContainer) return;
        apksContainer.innerHTML = ''; // Limpiar antes de renderizar

        if (apks.length > 0) {
            apks.forEach(apk => {
                const displayApkName = getDisplayApkName(apk.name); 
                const displayDeveloperName = getDisplayDeveloperName(apk.developer);
                const apkCol = document.createElement('div');
                apkCol.className = 'col-lg-4 col-md-6 col-sm-12 mb-4 d-flex align-items-stretch';
                
                apkCol.innerHTML = `
                    <div class="card apk-card h-100">
                        <div class="card-img-top-container">
                             <img src="${apk.image}" class="card-img-top" alt="Logo de ${apk.name}">
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title" title="${apk.name}">${displayApkName}</h5>
                            <p class="card-text text-muted">${displayDeveloperName}</p>
                            <div class="apk-info mt-auto">
                                ${apk.score ? `<span class="badge badge-success">Score: ${apk.score.toFixed(1)} <i class="fas fa-star"></i></span>` : ''}
                            </div>
                            <a href="/apks/${slugify(apk.name)}-${apk.id}.html" class="btn btn-primary btn-card-bottom mt-3">Ver Más</a>
                        </div>
                    </div>
                `;
                apksContainer.appendChild(apkCol);
            });
        } else {
            apksContainer.innerHTML = '<p class="col-12 text-center">No se encontraron aplicaciones en esta categoría.</p>';
        }
    };

    // Función para renderizar las tarjetas de CATEGORÍAS (cuando no hay parámetro 'cat')
    const renderCategoryCards = (categories) => {
        if (!apksContainer) return;
        apksContainer.innerHTML = ''; // Limpiar antes de renderizar

        if (categories.length > 0) {
            categories.forEach(category => {
                const categoryCol = document.createElement('div');
                categoryCol.className = 'col-md-4 mb-4'; 
                categoryCol.innerHTML = `
                    <div class="card shadow-sm h-100">
                        <div class="card-body text-center d-flex flex-column justify-content-center">
                            <h5 class="card-title">${category.name}</h5>
                            <p class="card-text text-muted">${category.count} aplicaciones</p>
                            <a href="/categorias.html?cat=${category.id}" class="btn btn-primary mt-auto">Ver Apps</a>
                        </div>
                    </div>
                `;
                apksContainer.appendChild(categoryCol);
            });
        } else {
            apksContainer.innerHTML = '<p class="col-12 text-center">No se encontraron categorías disponibles.</p>';
        }
    };

    // Lógica principal de category.js
    const categoryId = getCategoryFromURL();

    if (typeof apkList !== 'undefined' && apkList.length > 0) {
        if (categoryId) {
            const categoryName = categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
            categoryTitle.textContent = `Categoría: ${categoryName}`;
            document.title = `Categoría ${categoryName} - Zona APK`;
            
            const filteredApks = apkList.filter(apk => apk.genreId && apk.genreId.toLowerCase() === categoryId.toLowerCase());
            renderApkCards(filteredApks);
        } else {
            categoryTitle.textContent = 'Explora Todas las Categorías';
            document.title = 'Categorías - Zona APK';

            const uniqueGenres = {};
            apkList.forEach(apk => {
                if (apk.genreId && apk.genre) {
                    const id = apk.genreId.toLowerCase();
                    const name = apk.genre; 
                    if (!uniqueGenres[id]) {
                        uniqueGenres[id] = { id: id, name: name, count: 0 };
                    }
                    uniqueGenres[id].count++;
                }
            });

            const categoriesToRender = Object.values(uniqueGenres).sort((a, b) => a.name.localeCompare(b.name));
            renderCategoryCards(categoriesToRender);
        }
    } else if (apksContainer) {
        categoryTitle.textContent = 'Categorías no disponibles';
        apksContainer.innerHTML = '<p class="col-12 text-center">No se encontraron APKs o categorías para mostrar.</p>';
    }
});