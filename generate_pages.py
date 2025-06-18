import json
import re
import os

# --- Configuración de rutas (ajusta si es necesario) ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_JS_PATH = os.path.join(BASE_DIR, 'public', 'assets', 'js', 'data.js')
OUTPUT_DIR = os.path.join(BASE_DIR, 'public') # Directorio donde se guardarán los archivos HTML
APK_PAGES_DIR = os.path.join(OUTPUT_DIR, 'apks') # Directorio para las páginas de cada APK

# Rutas a las plantillas HTML en la carpeta 'templates'
INDEX_TEMPLATE_PATH = os.path.join(BASE_DIR, 'templates', 'index_template.html')
APK_TEMPLATE_PATH = os.path.join(BASE_DIR, 'templates', 'apk_detail_template.html')


# --- Función para cargar los datos de APK desde data.js ---
def load_apk_data(file_path):
    """
    Carga los datos de APK desde un archivo data.js, extrayendo solo el array JSON.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            js_content = f.read()

        # Usar expresiones regulares para encontrar el array JSON que sigue a 'const apkList = '
        # re.DOTALL permite que '.' coincida también con saltos de línea
        match = re.search(r'const\s+apkList\s*=\s*(\[.*?\]);', js_content, re.DOTALL)
        if match:
            # Cargar el JSON encontrado
            apk_data = json.loads(match.group(1))
            print(f"✅ Datos de APK cargados exitosamente desde '{file_path}'. Total: {len(apk_data)} APKs.")
            return apk_data
        else:
            print(f"❌ No se encontró 'const apkList = [...];' en '{file_path}'.")
            return []
    except FileNotFoundError:
        print(f"❌ Error: El archivo '{file_path}' no se encontró. Asegúrate de ejecutar generate_apks.py primero.")
        return []
    except json.JSONDecodeError as e:
        print(f"❌ Error de JSON al procesar '{file_path}': {e}")
        return []
    except Exception as e:
        print(f"❌ Error inesperado al cargar los datos de APK: {e}")
        return []

# --- Función para generar un slug a partir del nombre (debe coincidir con el JS) ---
def slugify(text):
    if not isinstance(text, str):
        return ''
    text = text.lower()
    text = re.sub(r'\s+', '-', text) # Reemplazar espacios por guiones
    text = re.sub(r'[^\w-]+', '', text) # Eliminar caracteres no alfanuméricos (excepto guiones)
    text = re.sub(r'--+', '-', text) # Reemplazar múltiples guiones por uno solo
    text = text.strip('-') # Eliminar guiones al inicio y al final
    return text

# --- Función principal para generar las páginas HTML ---
def generate_html_pages():
    print("🚀 Iniciando la generación de páginas HTML estáticas...")

    # Asegurarse de que el directorio de páginas de APKs existe
    os.makedirs(APK_PAGES_DIR, exist_ok=True)

    # 1. Cargar la plantilla de detalle de APK
    apk_detail_template = None
    try:
        with open(APK_TEMPLATE_PATH, 'r', encoding='utf-8') as f:
            apk_detail_template = f.read()
        print(f"✅ Plantilla de detalle de APK cargada: {APK_TEMPLATE_PATH}")
    except FileNotFoundError:
        print(f"❌ Error: La plantilla de detalle de APK '{APK_TEMPLATE_PATH}' no se encontró.")
        print("🛑 No se pudo cargar la plantilla de detalle. Saliendo de la generación de páginas.")
        return
    except Exception as e:
        print(f"❌ Error al cargar la plantilla de detalle de APK: {e}")
        print("🛑 No se pudo cargar la plantilla de detalle. Saliendo de la generación de páginas.")
        return
    
    # Cargar la plantilla de index.html
    index_template = None
    try:
        with open(INDEX_TEMPLATE_PATH, 'r', encoding='utf-8') as f:
            index_template = f.read()
        print(f"✅ Plantilla de index.html cargada: {INDEX_TEMPLATE_PATH}")
    except FileNotFoundError:
        print(f"❌ Error: La plantilla de index.html '{INDEX_TEMPLATE_PATH}' no se encontró.")
        print("⚠️ index.html no se generará sin la plantilla. Asegúrate de crearla.")
    except Exception as e:
        print(f"❌ Error al cargar la plantilla de index.html: {e}")
        print("⚠️ index.html no se generará debido a un error en la plantilla.")


    # 2. Cargar datos de APKs
    apk_list = load_apk_data(DATA_JS_PATH)
    if not apk_list:
        print("⚠️ No hay datos de APK para generar páginas de detalle. Asegúrate de que 'data.js' no esté vacío.")
        # Podemos continuar para generar index.html aunque no haya páginas de detalle
        # pero es importante que haya algo para el index.html
        if not index_template:
            print("🛑 No hay datos de APK y tampoco plantilla de index.html. Proceso terminado.")
            return


    # 3. Generar las páginas de detalle para cada APK
    print("⚙️ Generando páginas de detalle de APKs...")
    for apk in apk_list:
        # Generar un slug único. Usamos el ID de la APK si está disponible, si no, un slug del nombre.
        apk_id = apk.get('id', '')
        if apk_id:
            slug = f"{slugify(apk.get('name', ''))}-{apk_id}"
        else:
            slug = slugify(apk.get('name', 'unknown-apk')) # Fallback si no hay ID

        apk_page_path = os.path.join(APK_PAGES_DIR, f"{slug}.html")

        # Asegurarse de que los valores existan antes de usarlos
        apk_name = apk.get('name', 'N/A')
        apk_version = apk.get('version', 'N/A')
        apk_developer = apk.get('developer', 'N/A')
        apk_image = apk.get('image', '/images/placeholder.png') # Placeholder si no hay imagen
        apk_size = apk.get('size', 'N/A')
        apk_description = apk.get('description', 'No hay descripción disponible.').replace('\r\n', '<br>') # Convertir saltos de línea
        apk_url = apk.get('url', '#')
        apk_source_url = apk.get('source_url', '#')
        apk_updated = apk.get('updated', 'N/A')
        apk_installs = apk.get('installs', 'N/A')
        apk_android_version_text = apk.get('androidVersionText', 'N/A')
        apk_genre = apk.get('genre', 'General')

        screenshots = apk.get('screenshots', [])
        screenshots_html = ""
        if screenshots:
            screenshots_html = '<div class="row">' # Abrir un div.row para las capturas
            for i, screenshot_url in enumerate(screenshots):
                # Limitar a un número razonable de capturas de pantalla si hay muchas
                if i >= 5: # Por ejemplo, mostrar solo las primeras 5
                    break
                screenshots_html += f"""
                <div class="col-md-6 col-lg-4 mb-4">
                    <img src="{screenshot_url}" class="img-fluid rounded shadow-sm" alt="Captura de pantalla de {apk_name} {i+1}">
                </div>
                """
            screenshots_html += '</div>' # Cerrar el div.row
        else:
            screenshots_html = "<p>No hay capturas de pantalla disponibles.</p>"


        rendered_apk_page = apk_detail_template.replace("{{APK_NAME}}", apk_name) \
            .replace("{{APK_VERSION}}", apk_version) \
            .replace("{{APK_DEVELOPER}}", apk_developer) \
            .replace("{{APK_IMAGE}}", apk_image) \
            .replace("{{APK_SIZE}}", apk_size) \
            .replace("{{APK_DESCRIPTION}}", apk_description) \
            .replace("{{APK_URL}}", apk_url) \
            .replace("{{APK_SOURCE_URL}}", apk_source_url) \
            .replace("{{APK_UPDATED}}", apk_updated) \
            .replace("{{APK_INSTALLS}}", apk_installs) \
            .replace("{{APK_ANDROID_VERSION_TEXT}}", apk_android_version_text) \
            .replace("{{APK_GENRE}}", apk_genre) \
            .replace("{{APK_SCREENSHOTS}}", screenshots_html)

        try:
            with open(apk_page_path, 'w', encoding='utf-8') as f:
                f.write(rendered_apk_page)
            print(f"    - Generada: {apk_page_path}")
        except Exception as e:
            print(f"❌ Error al escribir la página de APK '{slug}': {e}")

    print("✅ Páginas de detalle de APK generadas.")


    # 4. Generar el index.html (este es el paso que faltaba en tu script)
    if index_template: # Si la plantilla se cargó correctamente
        print("⚙️ Generando index.html...")
        try:
            with open(os.path.join(OUTPUT_DIR, 'index.html'), 'w', encoding='utf-8') as f:
                f.write(index_template)
            print("✅ index.html generado.")
        except Exception as e:
            print(f"❌ Error al escribir index.html: {e}")
    else:
        print("⚠️ index.html no generado porque la plantilla no pudo ser cargada.")


    print("✨ Proceso de generación de páginas estáticas finalizado.")

# --- Ejecutar la función principal ---
if __name__ == "__main__":
    generate_html_pages()