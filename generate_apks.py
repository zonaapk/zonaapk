import requests
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import WebDriverException, TimeoutException, NoSuchElementException
from bs4 import BeautifulSoup
import json
import os
import time
import re
from urllib.parse import urlparse, parse_qs
from datetime import datetime
import logging
import configparser

# Importa la librería google-play-scraper
from google_play_scraper import app as gp_app

# --- Configuración de Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Variables globales que se cargarán desde config.ini
APK_LINKS = []
OUTPUT_PATH = ""
CLEAR_DATA_ON_START = False # Nueva variable global para la opción de limpieza

# --- Función para Configurar el WebDriver de Selenium ---
def setup_driver():
    options = Options()
    options.headless = True
    options.set_preference("devtools.console.stdout.content", False)
    options.set_preference("devtools.console.stderr.content", False)
    options.log.level = "fatal"

    logger.info("🚀 Configurando WebDriver de Firefox...")
    try:
        driver = webdriver.Firefox(options=options)
        driver.set_page_load_timeout(30)
        return driver
    except WebDriverException as e:
        logger.critical(f"❌ Error al iniciar el WebDriver de Firefox: {e}")
        logger.critical("Asegúrate de que GeckoDriver está correctamente instalado y en tu PATH.")
        logger.critical("También verifica que la versión de GeckoDriver es compatible con tu versión de Firefox.")
        logger.critical("Puedes descargar GeckoDriver desde: https://github.com/mozilla/geckodriver/releases")
        return None
    except Exception as e:
        logger.critical(f"❌ Un error inesperado ocurrió al configurar el WebDriver: {e}")
        return None

# --- Función Principal para Scrapear Datos de APKMirror y Google Play ---
def scrape_apkmirror_data(driver, url):
    logger.info(f"\n✨ Procesando URL: {url}")

    # Inicializar valores por defecto para todos los campos
    name = "Título no disponible"
    version = "Versión desconocida"
    developer = "Desarrollador no disponible"
    image_url = "/images/placeholder.png" 
    size = "Tamaño no disponible"
    download_final_url = None 
    package_id = None
    description = "Descripción no disponible"
    
    # Campos adicionales de Google Play
    genre = "Categoría no disponible"
    genre_id = "ID de categoría no disponible"
    score = 0.0
    ratings = 0
    reviews = 0
    updated = "Fecha no disponible"
    installs = "Instalaciones no disponibles"
    android_version_text = "Versión Android no disponible"
    screenshots = []
    release_notes = "Notas de versión no disponibles"

    try:
        logger.info(f"    Intentando cargar URL: {url}")
        driver.get(url)
        wait = WebDriverWait(driver, 15)

        # --- Extracción de Nombre y Versión desde APKMirror ---
        try:
            name_element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "h1.app-title")))
            full_title = name_element.text.strip()
            
            version_match = re.search(r"(\d+(\.\d+){1,}(?:[a-zA-Z0-9\.-]*)*)", full_title)
            
            if version_match:
                version = version_match.group(1).replace('-', '.')
                # Limpiar el nombre para quitar la versión y " by Developer" si existen
                name = re.sub(r'\s*' + re.escape(version.replace('.', '-')) + r'(\s*release)?', '', full_title, flags=re.IGNORECASE).strip()
                name = re.sub(r'\s*\d+(\.\d+)+$', '', name).strip() # Quitar números de versión al final si no se capturaron antes
                name = re.sub(r' by [\w\s\.]+$', '', name, flags=re.IGNORECASE).strip() # Quitar " by Developer"
            else:
                name = full_title
            logger.info(f"    ✅ Nombre: {name}, Versión: {version}")
        except (TimeoutException, NoSuchElementException, Exception) as e:
            logger.warning(f"    ❌ Error al extraer nombre/versión de APKMirror. Usando valores por defecto. Error: {e}")

        # --- Extracción de URL del Icono desde APKMirror (como fallback si GP falla) ---
        try:
            image_element = wait.until(EC.presence_of_element_located((By.ID, "primaryimage")))
            image_url_raw = image_element.get_attribute("src")
            parsed_src_url = urlparse(image_url_raw)
            query_params = parse_qs(parsed_src_url.query)
            if 'src' in query_params and query_params['src']:
                image_url = requests.utils.unquote(query_params['src'][0])
            else:
                image_url = image_url_raw
            logger.info(f"    ✅ Icono de APKMirror encontrado: {image_url[:70]}...")
        except (TimeoutException, NoSuchElementException, Exception) as e:
            logger.warning(f"    ❌ Error al extraer icono de APKMirror. Usando placeholder. Error: {e}")

        # --- Extracción de Tamaño desde APKMirror ---
        try:
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            size_header_element = soup.find('th', string=re.compile(r'File size|Tamaño del archivo', re.IGNORECASE))
            if size_header_element and size_header_element.find_next_sibling('td'):
                size = size_header_element.find_next_sibling('td').get_text(strip=True)
                logger.info(f"    ✅ Tamaño encontrado en APKMirror: {size}")
            else:
                appspec_value_divs = soup.find_all('div', class_='appspec-value')
                found_size = False
                for div in appspec_value_divs:
                    size_match_in_div = re.search(r'(\d[\d\.,]*\s*(?:MB|GB|KB))', div.get_text(), re.IGNORECASE)
                    if size_match_in_div:
                        size = size_match_in_div.group(1).strip()
                        logger.info(f"    ✅ Tamaño encontrado en APKMirror (appspec-value): {size}")
                        found_size = True
                        break
                
                if not found_size:
                    size_match_in_text = re.search(r'(\d[\d\.,]*\s*(?:MB|GB|KB))', driver.page_source, re.IGNORECASE)
                    if size_match_in_text:
                        size = size_match_in_text.group(1).strip()
                        logger.info(f"    ✅ Tamaño encontrado en APKMirror (fallback general): {size}")
                    else:
                        logger.warning("    ❌ Tamaño no encontrado en APKMirror.")
        except Exception as e:
            logger.warning(f"    ❌ Error al extraer tamaño de APKMirror: {e}")

        # --- Extracción de Package ID (crucial para Google Play Scraper) ---
        try:
            play_btn = wait.until(EC.presence_of_element_located((By.XPATH, "//a[contains(@href, 'play.google.com/store/apps/details?id=')]")))
            href = play_btn.get_attribute("href")
            parsed_url = urlparse(href)
            query_params = parse_qs(parsed_url.query)
            if 'id' in query_params and query_params['id']:
                package_id = query_params['id'][0]
                logger.info(f"    ✅ Package ID de Play Store encontrado: {package_id}")
            else:
                logger.warning("    ❌ No se pudo extraer el 'id' del enlace a Google Play (parámetro no encontrado).")
        except (TimeoutException, NoSuchElementException, Exception) as e:
            logger.warning(f"    ❌ No se encontró el botón a Google Play para obtener package ID o hubo un error al procesarlo: {e}")
            # Fallback heurístico para las URLs que estamos usando
            if "youtube-tv" in url: package_id = "com.google.android.apps.youtube.unplugged"
            elif "whatsapp" in url: package_id = "com.whatsapp"
            elif "telegram" in url: package_id = "org.telegram.messenger"
            
            if package_id:
                logger.warning(f"    ⚠️ Package ID inferido heurísticamente: {package_id}")
            else:
                logger.error("    ❌ No se pudo inferir el Package ID. No se podrá obtener descripción/otros detalles de Play Store.")

        # --- Navegación a página intermedia y obtención de enlace de descarga final ---
        try:
            logger.info("    ➜ Buscando enlace a la página intermedia de descarga en APKMirror...")
            download_page_link_element = wait.until(EC.presence_of_element_located((By.XPATH, "//a[contains(@href, '-android-apk-download')]")))
            download_page_url = download_page_link_element.get_attribute("href")
            driver.get(download_page_url)
            time.sleep(2) 
            
            logger.info("    ➜ Buscando enlace de descarga final de la APK...")
            download_final_element = wait.until(EC.presence_of_element_located((By.XPATH, "//a[contains(@class, 'downloader-btn') and contains(@href, '/download/?key=')] | //a[contains(@href, '/download/?key=') and text()[contains(.,'Download APK')]]")))
            download_final_url = download_final_element.get_attribute("href")
            logger.info(f"    ✅ Enlace de descarga final encontrado: {download_final_url}")
        except (TimeoutException, NoSuchElementException, Exception) as e:
            logger.error(f"    ❌ No se pudo obtener la URL de descarga final para {name}. Saltando esta APK. Error: {e}")
            return None

        # --- Obtención de TODOS los detalles de Google Play ---
        if package_id:
            try:
                logger.info(f"    ➜ Buscando detalles completos en Google Play con ID: {package_id} (via google-play-scraper)")
                app_info = gp_app(package_id, lang='es', country='AR') 
                
                if app_info:
                    description_raw = app_info.get('description', 'Descripción no disponible')
                    description = BeautifulSoup(description_raw, 'html.parser').get_text(separator=' ', strip=True)
                    description = description[:250] + "..." if len(description) > 250 else description
                    
                    developer = app_info.get('developer', 'Desarrollador no disponible')
                    genre = app_info.get('genre', 'Categoría no disponible')
                    genre_id = app_info.get('genreId', 'ID de categoría no disponible')
                    score = app_info.get('score', 0.0)
                    ratings = app_info.get('ratings', 0)
                    reviews = app_info.get('reviews', 0)
                    
                    updated_timestamp = app_info.get('updated')
                    if updated_timestamp:
                        updated = datetime.fromtimestamp(updated_timestamp).strftime('%Y-%m-%d')
                    else:
                        updated = "Fecha no disponible"

                    installs = app_info.get('installs', 'Instalaciones no disponibles')
                    android_version_text = app_info.get('androidVersionText', 'Versión Android no disponible')
                    screenshots = app_info.get('screenshots', [])
                    
                    release_notes_raw = app_info.get('releaseNotes', 'Notas de versión no disponible')
                    release_notes = BeautifulSoup(release_notes_raw, 'html.parser').get_text(separator=' ', strip=True)
                    release_notes = release_notes[:250] + "..." if len(release_notes) > 250 else release_notes

                    if app_info.get('icon'):
                        image_url = app_info['icon'] 
                        logger.info(f"    ✅ Usando icono de Google Play (mayor calidad): {image_url[:70]}...")

                    logger.info(f"    ✅ Descripción obtenida de Google Play: {description[:50]}...")
                    logger.info(f"    ✅ Desarrollador: {developer}")
                    logger.info(f"    ✅ Categoría: {genre} (ID: {genre_id})")
                    logger.info(f"    ✅ Calificación: {score} ({ratings} valoraciones, {reviews} reseñas)")
                    logger.info(f"    ✅ Última actualización: {updated}")
                    logger.info(f"    ✅ Instalaciones: {installs}")
                    logger.info(f"    ✅ Versión Android requerida: {android_version_text}")
                    logger.info(f"    ✅ Capturas de pantalla encontradas: {len(screenshots)}")
                    logger.info(f"    ✅ Notas de versión: {release_notes[:50]}...")

                else:
                    logger.warning("    ❌ No se encontró información de la aplicación para el Package ID en Google Play.")
            except Exception as e:
                logger.error(f"    ❌ Error al obtener detalles completos de Google Play (google-play-scraper): {e}")
        else:
            logger.warning("    ⚠️ Package ID no disponible, saltando la búsqueda de detalles completos en Google Play.")

        # --- Generación de ID interno único (más robusto) ---
        # Prioridad 1: package_id + version
        if package_id and version != "Versión desconocida":
            internal_id = f"{package_id}-{version.replace('.', '-')}"
        # Prioridad 2: url de apkmirror (parte final) + version
        else:
            url_parts = url.strip('/').split('/')
            base_id_from_url = url_parts[-1] if url_parts else "unknown"
            internal_id = f"{base_id_from_url}-{version.replace('.', '-')}"
            
        # Limpiar el ID final (minúsculas, sin caracteres especiales excepto guiones, sin guiones al inicio/final)
        internal_id = re.sub(r'[^a-zA-Z0-9_-]', '', internal_id).lower()
        internal_id = internal_id.strip('-') 
        if not internal_id: # Fallback si el ID queda vacío después de la limpieza extrema
            internal_id = "unknown-app"
            logger.warning(f"    ⚠️ ID interno quedó vacío, usando 'unknown-app' para {name}.")

        return {
            "id": internal_id, 
            "name": name,
            "version": version,
            "developer": developer,
            "image": image_url, 
            "size": size,
            "description": description,
            "url": download_final_url, 
            "source_url": url, 
            "genre": genre,
            "genreId": genre_id,
            "score": score,
            "ratings": ratings,
            "reviews": reviews,
            "updated": updated,
            "installs": installs,
            "androidVersionText": android_version_text,
            "screenshots": screenshots,
            "releaseNotes": release_notes
        }

    except Exception as e:
        logger.error(f"    ❌ Error general inesperado durante el scraping de {url}: {e}")
        return None

# --- Función para Guardar los Datos en un Archivo JavaScript ---
def save_to_file(apks, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("const apkList = " + json.dumps(apks, indent=4, ensure_ascii=False) + ";")
    logger.info(f"\n✅ Archivo '{path}' actualizado correctamente con {len(apks)} APKs.")

# --- Función para Vaciar el Archivo de Datos ---
def clear_data_file(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("const apkList = [];")
    logger.info(f"🗑️ Archivo '{path}' vaciado exitosamente.")

# --- Función Principal que Coordina el Scraper ---
def main():
    logger.info("🚀 Iniciando scraper automático APKMirror + Google Play (CÓDIGO SÚPER ELEGANTE)...")

    # --- Cargar configuración desde config.ini ---
    config = configparser.ConfigParser()
    try:
        config.read('config.ini')
        
        global APK_LINKS, OUTPUT_PATH, CLEAR_DATA_ON_START
        
        apk_links_raw = config.get('Settings', 'apk_links').strip()
        APK_LINKS = [link.strip() for link in apk_links_raw.split('\n') if link.strip()]

        OUTPUT_PATH = config.get('Settings', 'output_path')
        # Leer la opción de limpieza, por defecto a False si no existe o es inválida
        CLEAR_DATA_ON_START = config.getboolean('Settings', 'clear_data_on_start', fallback=False)

        logger.info("⚙️ Configuración cargada desde 'config.ini'.")
        logger.info(f"   Enlaces a procesar ({len(APK_LINKS)}): {APK_LINKS}")
        logger.info(f"   Ruta de salida: {OUTPUT_PATH}")
        logger.info(f"   Borrar datos al inicio: {CLEAR_DATA_ON_START}")

    except configparser.Error as e:
        logger.critical(f"❌ Error al leer 'config.ini': {e}")
        logger.critical("Asegúrate de que 'config.ini' existe y tiene la sección [Settings] con 'apk_links', 'output_path', y 'clear_data_on_start'.")
        return
    except Exception as e:
        logger.critical(f"❌ Error inesperado al cargar la configuración: {e}")
        return

    # --- Limpiar data.js si la opción está habilitada ---
    if CLEAR_DATA_ON_START:
        clear_data_file(OUTPUT_PATH)
        
    driver = setup_driver()
    if not driver:
        logger.critical("🛑 No se pudo iniciar el navegador. Saliendo del script.")
        return
        
    apk_data = []

    for url in APK_LINKS:
        data = scrape_apkmirror_data(driver, url)
        if data:
            apk_data.append(data)
        time.sleep(3)

    driver.quit()
    logger.info("\n✅ Navegador Firefox cerrado.")
    
    save_to_file(apk_data, OUTPUT_PATH)
    logger.info("✅ Proceso de scraping finalizado.")

if __name__ == "__main__":
    main()