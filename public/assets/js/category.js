document.addEventListener('DOMContentLoaded', () => {
    const categoryTitle = document.getElementById('category-title');
    const apksContainer = document.getElementById('category-apks-container');

    // Función para obtener el parámetro de la URL (ej: ?cat=productividad)
    const getCategoryFromURL = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('cat');
    };

    // Función para convertir texto en un slug amigable (debe ser idéntica a la de main.js)
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
    
    // Función para renderizar las tarjetas de APK (similar a main.js pero adaptada)
    const renderApkCards = (apks) => {
        if (!apksContainer) return;
        apksContainer.innerHTML = ''; // Limpiar antes de renderizar

        if (apks.length > 0) {
            apks.forEach(apk => {
                const apkCol = document.createElement('div');
                apkCol.className = 'col-lg-4 col-md-6 col-sm-12 mb-4 d-flex align-items-stretch';
                
                // Usamos la misma estructura de tarjeta que en el index
                apkCol.innerHTML = `
                    <div class="card apk-card h-100">
                        <div class="card-img-top-container">
                             <img src="${apk.image}" class="card-img-top" alt="Logo de ${apk.name}">
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title" title="${apk.name}">${apk.name}</h5>
                            <p class="card-text text-muted">${apk.developer}</p>
                            <div class="apk-info mt-2 mb-3">
                                ${apk.score ? `<span class="badge badge-success">Score: ${apk.score.toFixed(1)} <i class="fas fa-star"></i></span>` : ''}
                                ${apk.installs ? `<span class="badge badge-info ml-2">Installs: ${apk.installs}</span>` : ''}
                                ${apk.updated ? `<span class="badge badge-secondary ml-2">Updated: ${apk.updated}</span>` : ''}
                            </div>
                            <a href="/apks/${slugify(apk.name)}-${apk.id}.html" class="btn btn-primary mt-auto">Ver Más</a>
                        </div>
                    </div>
                `;
                apksContainer.appendChild(apkCol);
            });
        } else {
            apksContainer.innerHTML = '<p class="col-12 text-center">No se encontraron aplicaciones en esta categoría.</p>';
        }
    };

    // Lógica principal
    const categoryId = getCategoryFromURL();

    if (categoryId && typeof apkList !== 'undefined') {
        // Pone el nombre de la categoría en el H1 (primera letra mayúscula)
        // Asegurarse de que el género de apkList es una cadena antes de intentar mayúsculas
        const categoryName = categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
        categoryTitle.textContent = `Categoría: ${categoryName}`;
        document.title = `Categoría ${categoryName} - Zona APK`;
        
        // Filtra las APKs que coinciden con el genreId
        const filteredApks = apkList.filter(apk => apk.genreId && apk.genreId.toLowerCase() === categoryId.toLowerCase());
        
        renderApkCards(filteredApks);
    } else {
        // Mostrar los ejemplos si no hay categoría específica o apkList no está definido/vacío
        // No se borran los ejemplos estáticos de category.html a menos que se cargue dinámicamente.
        // Aquí se mostraría un mensaje si se esperaba un filtro y no se encontró.
        if (apksContainer && !categoryId) {
             // Si no hay parámetro de categoría, podríamos mostrar un mensaje general o mantener los ejemplos si los hay.
             // Para este caso, asumimos que los ejemplos HTML ya están en category.html
             // y este script solo debería sobreescribirlos si hay un filtro de categoría.
             // Si el objetivo es solo mostrar categorías genéricas, este bloque no necesita limpiar.
             // Si se quiere que esta página (category.html) también cargue dinámicamente,
             // habría que decidir qué "categorías" mostrar por defecto (quizás las de data.js).
             // Por ahora, el HTML estático de categorias.html es el fallback.
        } else {
             categoryTitle.textContent = 'Categoría no encontrada';
             if (apksContainer) apksContainer.innerHTML = '<p class="col-12 text-center">Por favor, selecciona una categoría válida o no se encontraron aplicaciones para esta categoría.</p>';
        }
    }
});