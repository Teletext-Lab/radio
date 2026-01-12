// radio-zara.js - VERSIÓN CON DETECCIÓN AUTOMÁTICA TRANSPARENTE
document.addEventListener('DOMContentLoaded', function() {
    const playButton = document.getElementById('radioPlayButton');
    const shareButton = document.getElementById('shareRadioButton');
    let audioPlayer = document.getElementById('radioPlayer');
    const playPath = document.getElementById('playPath');
    const pausePath1 = document.getElementById('pausePath1');
    const pausePath2 = document.getElementById('pausePath2');
    const currentShow = document.getElementById('currentShow');
    const currentTimeName = document.getElementById('currentTimeName');
    const currentTimeRange = document.getElementById('currentTimeRange');
    const scheduleGrid = document.querySelector('.schedule-grid');
    
    let isPlaying = false;
    let currentPlaylist = [];
    let currentTrackIndex = 0;
    let playlistLoaded = false;
    let errorCount = 0;
    const MAX_ERRORS = 3;
    
    // ========== DETECCIÓN BUTT ==========
    let modoButt = false; // false = playlist, true = BUTT
    const URL_BUTT = "https://radio01.ferozo.com/proxy/ra01001229?mp=/stream";
    let checkInterval = null;
    
    // ========== CONFIGURACIÓN PROGRAMAS ==========
    const programNames = {
        "madrugada": "Radio 404",
        "mañana": "Archivo txt", 
        "tarde": "Telesoft",
        "mediatarde": "Floppy Disk",
        "noche": "Internet Archive",
        "especial": "Especiales txt"
    };
    
    const programDescriptions = {
        "madrugada": "Sonidos atmosféricos y experimentales para las primeras horas del día.",
        "mañana": "Programa matutino con energía y ritmos para comenzar el día.",
        "tarde": "Ritmos variados y selecciones especiales para acompañar la tarde.",
        "mediatarde": "Transición hacia la noche con sonidos más atmosféricos.",
        "noche": "Sesiones extendidas y atmósferas nocturnas para terminar el día.",
        "especial": "Programación especial viernes y sábados de 22:00 a 00:00."
    };
    
    const scheduleData = {
        "schedules": [
            {"name": "madrugada", "displayName": "Radio 404", "start": "01:00", "end": "06:00"},
            {"name": "mañana", "displayName": "Archivo txt", "start": "06:00", "end": "12:00"},
            {"name": "tarde", "displayName": "Telesoft", "start": "12:00", "end": "16:00"},
            {"name": "mediatarde", "displayName": "Floppy Disk", "start": "16:00", "end": "20:00"},
            {"name": "noche", "displayName": "Internet Archive", "start": "20:00", "end": "01:00"},
            {"name": "especial", "displayName": "Especiales txt", "start": "22:00", "end": "00:00"}
        ]
    };
    
    // ========== DETECCIÓN BUTT ==========
    async function detectarButt() {
    try {
        const test = new Audio();
        test.src = URL_BUTT + '&check=' + Date.now();
        test.preload = 'none';
        test.muted = true;

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                test.src = '';
                resolve(false);
            }, 5000);

            test.onloadedmetadata = () => {
                clearTimeout(timeout);
                test.src = '';
                resolve(true);
            };

            test.onerror = () => {
                clearTimeout(timeout);
                test.src = '';
                resolve(false);
            };

            test.load();
        });
    } catch (e) {
        return false;
    }
}

    
    // ========== FUNCIONES PROGRAMA ==========
    function getArgentinaTime() {
        const now = new Date();
        const argentinaOffset = -3 * 60;
        const localOffset = now.getTimezoneOffset();
        const offsetDiff = argentinaOffset + localOffset;
        return new Date(now.getTime() + offsetDiff * 60000);
    }
    
    function formatTimeForDisplay(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    
    function getCurrentSchedule() {
        const now = getArgentinaTime();
        const day = now.getDay();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        for (const schedule of scheduleData.schedules) {
            if (schedule.name === "especial" && day !== 5 && day !== 6) continue;
            
            const start = schedule.start.split(':').map(Number);
            const end = schedule.end.split(':').map(Number);
            const startTime = start[0] * 60 + start[1];
            let endTime = end[0] * 60 + end[1];
            
            if (endTime < startTime) endTime += 24 * 60;
            const adjustedCurrentTime = currentTime + (currentTime < startTime ? 24 * 60 : 0);
            if (adjustedCurrentTime >= startTime && adjustedCurrentTime < endTime) {
                return schedule;
            }
        }
        return scheduleData.schedules[0];
    }
    
    function updateDisplayInfo() {
        const schedule = getCurrentSchedule();
        const displayName = schedule.displayName || programNames[schedule.name];
        currentShow.textContent = displayName;
        currentTimeName.textContent = displayName;
        currentTimeRange.textContent = `${formatTimeForDisplay(schedule.start)} - ${formatTimeForDisplay(schedule.end)}`;
    }
    
    function generateScheduleCards() {
        if (!scheduleGrid) return;
        scheduleGrid.innerHTML = '';
        scheduleData.schedules.forEach(schedule => {
            const card = document.createElement('div');
            card.className = 'schedule-card';
            const displayName = schedule.displayName || programNames[schedule.name];
            const description = programDescriptions[schedule.name] || '';
            card.innerHTML = `
                <div class="schedule-time">${formatTimeForDisplay(schedule.start)} - ${formatTimeForDisplay(schedule.end)}</div>
                <div class="schedule-name">${displayName}</div>
                <div class="schedule-desc">${description}</div>
            `;
            scheduleGrid.appendChild(card);
        });
    }
    
    // ========== LÓGICA RADIO ==========
    async function loadPlaylist() {
        if (playlistLoaded) return;
        
        try {
            console.log('📻 Cargando playlist...');
            const response = await fetch('playlist.json');
            const data = await response.json();
            
            currentPlaylist = data.tracks.map(track => ({
                path: track,
                file: track.split('/').pop()
            }));
            
            playlistLoaded = true;
            console.log(`📻 Playlist cargada: ${currentPlaylist.length} canciones`);
            
        } catch (error) {
            console.error('Error:', error);
            currentPlaylist = [];
            currentTrackIndex = 0;
        }
    }
    
    function calcularPosicionExacta() {
        const inicioTransmision = new Date('2025-01-01T03:00:00Z');
        const ahora = new Date();
        
        const segundosTranscurridos = Math.floor((ahora - inicioTransmision) / 1000);
        const segundosPorCancion = 180;
        const segundosTotalPlaylist = currentPlaylist.length * segundosPorCancion;
        const posicionEnPlaylist = segundosTranscurridos % segundosTotalPlaylist;
        
        currentTrackIndex = Math.floor(posicionEnPlaylist / segundosPorCancion) % currentPlaylist.length;
        const segundoEnCancion = posicionEnPlaylist % segundosPorCancion;
        
        console.log('🎯 SINCRONIZACIÓN EXACTA:');
        console.log(`   📻 Canción: #${currentTrackIndex + 1}/${currentPlaylist.length}`);
        console.log(`   ⏱️  Segundo: ${segundoEnCancion}s`);
        console.log(`   🔗 Todos escuchan lo mismo`);
        
        return {
            trackIndex: currentTrackIndex,
            segundoEnCancion: segundoEnCancion,
            track: currentPlaylist[currentTrackIndex]
        };
    }
    
    async function playTransmisionExacta() {
        // PRIMERO VERIFICAR SI BUTT ESTÁ TRANSMITIENDO
        const buttActivo = await detectarButt();
        
        if (buttActivo && !modoButt) {
            modoButt = true;
            console.log('🔴 BUTT detectado - Cambiando a transmisión en vivo');
            audioPlayer.src = URL_BUTT + '?t=' + Date.now();
            audioPlayer.play();
            return;
        }
        
        if (!buttActivo && modoButt) {
            modoButt = false;
            console.log('🟢 BUTT desconectado - Continuando con playlist');
        }
        
        // SI LLEGA ACÁ, REPRODUCIR PLAYLIST NORMAL
        if (currentPlaylist.length === 0) return;
        
        const posicion = calcularPosicionExacta();
        const track = posicion.track;
        
        console.log(`🎵 Conectando a transmisión:`);
        console.log(`   📀 "${track.file}"`);
        console.log(`   🎯 Empezando en segundo: ${posicion.segundoEnCancion}`);
        
        // DETECTAR PLATAFORMAS EXTERNAS Y FORZAR SINCRONIZACIÓN
        if (window.location.hostname.includes('mytuner-radio.com') || 
            window.location.hostname.includes('radios-argentinas.org')) {
            console.log('🔧 PLATAFORMA EXTERNA DETECTADA - Forzando sincronización');
            audioPlayer.currentTime = posicion.segundoEnCancion;
            audioPlayer.src = track.path + '?t=' + Date.now();
        }
        
        // Limpiar eventos previos
        audioPlayer.onloadedmetadata = null;
        audioPlayer.onerror = null;
        audioPlayer.onended = null;
        
        // Configurar audio
        audioPlayer.src = track.path;
        audioPlayer.currentTime = Math.min(posicion.segundoEnCancion, 3600);
        
        console.log(`   🔊 Tiempo establecido: ${posicion.segundoEnCancion}s`);
        
        // Intentar reproducir inmediatamente
        const playPromise = audioPlayer.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.error('❌ Error al reproducir:', e.name);
                setTimeout(() => {
                    audioPlayer.play().catch(() => {
                        setTimeout(siguienteCancion, 1000);
                    });
                }, 300);
            });
        }
        
        // Configurar eventos
        audioPlayer.onloadedmetadata = function() {
            if (Math.abs(audioPlayer.currentTime - posicion.segundoEnCancion) > 2) {
                audioPlayer.currentTime = Math.min(posicion.segundoEnCancion, 3600);
            }
        };
        
        audioPlayer.onended = function() {
            errorCount = 0;
            console.log('✅ Canción terminada - Siguiente');
            siguienteCancion();
        };
        
        audioPlayer.onerror = function() {
            console.error('❌ Error de audio');
            errorCount++;
            
            if (errorCount >= MAX_ERRORS) {
                console.error('🚨 Demasiados errores - Deteniendo');
                isPlaying = false;
                updatePlayButton();
                errorCount = 0;
                return;
            }
            
            setTimeout(siguienteCancion, 1000);
        };
    }
    
    async function siguienteCancion() {
        // VERIFICAR SI BUTT ESTÁ TRANSMITIENDO
        const buttActivo = await detectarButt();
        
        if (buttActivo && !modoButt) {
            modoButt = true;
            console.log('🔄 BUTT detectado durante cambio de canción');
            audioPlayer.src = URL_BUTT + '?t=' + Date.now();
            audioPlayer.play();
            return;
        }
        
        if (!buttActivo && modoButt) {
            modoButt = false;
            console.log('🔄 BUTT se fue, continuando playlist');
        }
        
        if (currentPlaylist.length === 0) return;
        
        errorCount = 0;
        currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
        const track = currentPlaylist[currentTrackIndex];
        
        console.log(`⏭️ Siguiente canción: #${currentTrackIndex + 1} (${track.file})`);
        
        // Limpiar eventos
        audioPlayer.onloadedmetadata = null;
        audioPlayer.onerror = null;
        audioPlayer.onended = null;
        
        audioPlayer.src = track.path;
        audioPlayer.currentTime = 0;
        
        if (isPlaying) {
            const playPromise = audioPlayer.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.error('❌ Error:', e.name);
                    setTimeout(siguienteCancion, 1000);
                });
            }
            
            audioPlayer.onerror = function() {
                console.error('❌ Error de audio');
                errorCount++;
                
                if (errorCount >= MAX_ERRORS) {
                    console.error('🚨 Demasiados errores - Deteniendo');
                    isPlaying = false;
                    updatePlayButton();
                    errorCount = 0;
                    return;
                }
                
                setTimeout(siguienteCancion, 1000);
            };
            
            audioPlayer.onended = function() {
                errorCount = 0;
                siguienteCancion();
            };
        }
    }
    
    function updatePlayButton() {
        if (!playPath || !pausePath1 || !pausePath2) return;
        playPath.setAttribute('opacity', isPlaying ? '0' : '1');
        pausePath1.setAttribute('opacity', isPlaying ? '1' : '0');
        pausePath2.setAttribute('opacity', isPlaying ? '1' : '0');
    }
    
    function shareRadio() {
        const url = window.location.href;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                const originalHTML = shareButton.innerHTML;
                shareButton.innerHTML = '✅';
                shareButton.style.borderColor = '#00FF37';
                setTimeout(() => {
                    shareButton.innerHTML = originalHTML;
                    shareButton.style.borderColor = '';
                }, 2000);
            });
        }
    }
    
    // ========== EVENTOS ==========
    playButton.addEventListener('click', async function() {
        if (isPlaying) {
            audioPlayer.pause();
            isPlaying = false;
            console.log('⏸️ Pausado');
        } else {
            if (!playlistLoaded) {
                await loadPlaylist();
            }
            isPlaying = true;
            
            console.log('▶️ Iniciando radio...');
            console.log('⚡ Sistema automático: Playlist ←→ BUTT (transparente)');
            
            setTimeout(() => {
                playTransmisionExacta();
            }, 0);
        }
        updatePlayButton();
    });
    
    shareButton.addEventListener('click', shareRadio);
    
    // ========== INICIALIZACIÓN ==========
    async function init() {
        console.log('🚀 Radio Zara - Detección Automática Transparente');
        console.log('🎯 Sincronización exacta por segundo');
        console.log('📡 Detección BUTT automática (cada 30 segundos)');
        
        await loadPlaylist();
        generateScheduleCards();
        setInterval(updateDisplayInfo, 60000);
        updateDisplayInfo();
        
        // CHEQUEO AUTOMÁTICO CADA 30 SEGUNDOS
        checkInterval = setInterval(async () => {
            if (!isPlaying) return;
            
            const buttActivo = await detectarButt();
            
            if (buttActivo && !modoButt) {
                modoButt = true;
                console.log('🔄 Cambio automático detectado: Playlist → BUTT');
                audioPlayer.src = URL_BUTT + '?t=' + Date.now();
                audioPlayer.play();
            } else if (!buttActivo && modoButt) {
                modoButt = false;
                console.log('🔄 Cambio automático detectado: BUTT → Playlist');
                playTransmisionExacta();
            }
        }, 30000);
        
        console.log('✅ Radio lista (detección automática activa)');
    }
    
    init();
});
