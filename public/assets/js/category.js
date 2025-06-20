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
        apksContainer.innerHTML = ''; // Limpiar antes de renderizar para contenido dinámico

        if (apks.length > 0) {
            apks.forEach(apk => {
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
                            <div class="apk-info mt-2 mb-3">
                                ${apk.score ? `<span class="badge badge-success">Score: ${apk.score.toFixed(1)} <i class="fas fa-star"></i></span>` : ''}
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

    if (categoryId && typeof apkList !== 'undefined' && apkList.length > 0) {
        // Pone el nombre de la categoría en el H1 (primera letra mayúscula)
        const categoryName = categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
        categoryTitle.textContent = `Categoría: ${categoryName}`;
        document.title = `Categoría ${categoryName} - Zona APK`;
        
        // Filtra las APKs que coinciden con el genreId
        const filteredApks = apkList.filter(apk => apk.genreId && apk.genreId.toLowerCase() === categoryId.toLowerCase());
        
        renderApkCards(filteredApks);
    } else {
        // Si no hay categoryId en la URL, o apkList no está definido/vacío,
        // se asume que esta página debe mostrar las categorías generales (como los ejemplos estáticos previos).
        // En este caso, category.html debería manejar esa visualización por sí mismo o category.js
        // debería tener una lógica para renderizar las categorías disponibles desde data.js si las hubiera.
        // Por ahora, si no hay un categoryId específico, el mensaje es de "categoría no encontrada" o similar.
        categoryTitle.textContent = 'Categoría no encontrada o no especificada';
        if (apksContainer) {
            apksContainer.innerHTML = '<p class="col-12 text-center">Por favor, selecciona una categoría válida o no se encontraron aplicaciones para esta categoría.</p>';
        }
    }
});