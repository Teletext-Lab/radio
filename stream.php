<?php
// stream.php - Stream sincronizado para plataformas externas
header('Content-Type: audio/mpeg');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Expose-Headers: *');

// Tus 20 canciones (AJUSTÁ LAS RUTAS)
$playlist = [
    '/music/especialestxt/cancion1.mp3',
    '/music/especialestxt/cancion2.mp3',
    '/music/especialestxt/cancion3.mp3',
    '/music/especialestxt/cancion4.mp3',
    '/music/especialestxt/cancion5.mp3',
    '/music/especialestxt/cancion6.mp3',
    '/music/especialestxt/cancion7.mp3',
    '/music/especialestxt/cancion8.mp3',
    '/music/especialestxt/cancion9.mp3',
    '/music/especialestxt/cancion10.mp3',
    '/music/especialestxt/cancion11.mp3',
    '/music/especialestxt/cancion12.mp3',
    '/music/especialestxt/cancion13.mp3',
    '/music/especialestxt/cancion14.mp3',
    '/music/especialestxt/cancion15.mp3',
    '/music/especialestxt/cancion16.mp3',
    '/music/especialestxt/cancion17.mp3',
    '/music/especialestxt/cancion18.mp3',
    '/music/especialestxt/cancion19.mp3',
    '/music/especialestxt/cancion20.mp3'
];

// Calcular canción actual (cada 4 minutos = 240 segundos)
$timestamp = time();
$segundosDia = ($timestamp % 86400); // Segundos desde medianoche
$indice = floor($segundosDia / 240) % 20;
$segundoEnCancion = $segundosDia % 240;

$rutaArchivo = $_SERVER['DOCUMENT_ROOT'] . $playlist[$indice];

// Verificar que el archivo existe
if (!file_exists($rutaArchivo)) {
    header("HTTP/1.0 404 Not Found");
    exit;
}

// Enviar el archivo MP3 desde el segundo correcto
$fp = fopen($rutaArchivo, 'rb');
fseek($fp, 128 * $segundoEnCancion); // 128 KBps

while (!feof($fp) && connection_status() == 0) {
    echo fread($fp, 8192);
    flush();
    usleep(80000); // Controlar bitrate
}

fclose($fp);
?>
