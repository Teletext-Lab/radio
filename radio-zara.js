// radio-zara.js - VERSIÓN HÍBRIDA MEJORADA - COMPLETA Y CORREGIDA
document.addEventListener('DOMContentLoaded', function() {
    const playButton = document.getElementById('radioPlayButton');
    const shareButton = document.getElementById('shareRadioButton');
    const audioPlayer = document.getElementById('radioPlayer');
    const playPath = document.getElementById('playPath');
    const pausePath1 = document.getElementById('pausePath1');
    const pausePath2 = document.getElementById('pausePath2');
    const currentShow = document.getElementById('currentShow');
    const currentTimeName = document.getElementById('currentTimeName');
    const currentTimeRange = document.getElementById('currentTimeRange');
    const scheduleGrid = document.querySelector('.schedule-grid');
    const liveDot = document.querySelector('.live-dot');
    const liveText = document.querySelector('.live-text');
    
    let isPlaying = false;
    let currentPlaylist = [];
    let currentTrackIndex = 0;
    let playlistLoaded = false;
    let errorCount = 0;
    const MAX_ERRORS = 3;
    
    // ========== CONFIGURACIÓN HÍBRIDA ==========
    let useShoutcast = true; // Empezamos intentando con ShoutCast
    let shoutcastURL = "https://radio01.ferozo.com/proxy/ra01001229?mp=/";
    let checkInterval = null;
    let lastStreamCheck = 0;
    let isCheckingStream = false;
    let streamModeIndicator = null;
    
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
    
    // ========== CREAR INDICADOR VISUAL (INTEGRADO CON TU DISEÑO) ==========
    function createStreamIndicator() {
        if (!streamModeIndicator) {
            streamModeIndicator = document.createElement('div');
            streamModeIndicator.id = 'streamModeIndicator';
            streamModeIndicator.style.cssText = `
                position: fixed;
                top: 70px;
                right: 20px;
                background: rgba(10, 10, 10, 0.95);
                backdrop-filter: blur(10px);
                color: #00FF37;
                padding: 8px 15px;
                border-radius: 6px;
                font-size: 12px;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                z-index: 999;
                border: 1px solid #00FF37;
                display: none;
                opacity: 0;
                transition: opacity 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                letter-spacing: 0.5px;
                font-weight: 600;
            `;
            document.body.appendChild(streamModeIndicator);
        }
        return streamModeIndicator;
    }
    
    // ========== ACTUALIZAR INDICADOR LIVE-DOT ==========
    function updateLiveIndicator(isLive) {
        if (liveDot && liveText) {
            if (isLive) {
                liveDot.style.background = '#ff0000';
                liveDot.style.animation = 'pulse 1.5s infinite';
                liveText.textContent = 'EN VIVO';
                liveText.style.color = '#ff0000';
            } else {
                liveDot.style.background = '#00FF37';
                liveDot.style.animation = 'none';
                liveText.textContent = 'PLAYLIST';
                liveText.style.color = '#00FF37';
            }
        }
    }
    
    // ========== MOSTRAR NOTIFICACIÓN TEMPORAL ==========
    function showStreamNotification(message, isShoutcast) {
        const indicator = createStreamIndicator();
        indicator.textContent = message;
        indicator.style.borderColor = isShoutcast ? '#ff0000' : '#00FF37';
        indicator.style.color = isShoutcast ? '#ff0000' : '#00FF37';
        
        // Mostrar
        indicator.style.display = 'block';
        setTimeout(() => {
            indicator.style.opacity = '1';
        }, 10);
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 300);
        }, 3000);
    }
    
    // ========== DETECCIÓN DE STREAM SHOUTCAST ==========
    async function checkStreamStatus() {
        if (isCheckingStream) return false;
        
        isCheckingStream = true;
        const now = Date.now();
        
        // Solo chequear cada 40 segundos
        if (now - lastStreamCheck < 40000) {
            isCheckingStream = false;
            return useShoutcast;
        }
        
        lastStreamCheck = now;
        
        console.log('📡 Verificando estado de ShoutCast...');
        
        return new Promise((resolve) => {
            const testAudio = new Audio();
            testAudio.preload = 'none';
            testAudio.src = shoutcastURL + '?check=' + Date.now();
            
            const timeout = setTimeout(() => {
                // Timeout = ShoutCast no responde
                console.log('⏰ ShoutCast no responde - Modo Playlist');
                if (useShoutcast) {
                    showStreamNotification('🔁 Cambiando a Playlist Local', false);
                }
                useShoutcast = false;
                updateLiveIndicator(false);
                isCheckingStream = false;
                resolve(false);
            }, 6000); // 6 segundos de timeout
            
            const cleanup = () => {
                clearTimeout(timeout);
                testAudio.removeEventListener('loadedmetadata', onSuccess);
                testAudio.removeEventListener('error', onError);
                testAudio.src = '';
            };
            
            const onSuccess = () => {
                cleanup();
                console.log('✅ ShoutCast ACTIVO (BUTT transmitiendo)');
                if (!useShoutcast) {
                    showStreamNotification('🎙️ Conectado a Transmisión en Vivo', true);
                }
                useShoutcast = true;
                updateLiveIndicator(true);
                isCheckingStream = false;
                resolve(true);
            };
            
            const onError = () => {
                cleanup();
                console.log('❌ ShoutCast INACTIVO');
                if (useShoutcast) {
                    showStreamNotification('💿 Cambiando a Playlist Local', false);
                }
                useShoutcast = false;
                updateLiveIndicator(false);
                isCheckingStream = false;
                resolve(false);
            };
            
            testAudio.addEventListener('loadedmetadata', onSuccess, { once: true });
            testAudio.addEventListener('error', onError, { once: true });
            
            // Intentar cargar
            testAudio.load();
        });
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
    
    // ========== LÓGICA RADIO HÍBRIDA ==========
    async function loadPlaylist() {
        if (playlistLoaded) return;
        
        try {
            console.log('📻 Cargando playlist local...');
            const response = await fetch('playlist.json');
            const data = await response.json();
            
            // Convertir rutas relativas a absolutas para GitHub Pages
            const baseURL = window.location.origin + '/';
            currentPlaylist = data.tracks.map(track => ({
                path: track.startsWith('http') ? track : baseURL + track,
                file: track.split('/').pop()
            }));
            
            playlistLoaded = true;
            console.log(`📻 Playlist local cargada: ${currentPlaylist.length} canciones`);
            
        } catch (error) {
            console.error('Error cargando playlist:', error);
            currentPlaylist = [];
            currentTrackIndex = 0;
        }
    }
    
    function calcularPosicionExacta() {
        if (currentPlaylist.length === 0) return { trackIndex: 0, segundoEnCancion: 0, track: null };
        
        const inicioTransmision = new Date('2025-01-01T03:00:00Z');
        const ahora = new Date();
        
        const segundosTranscurridos = Math.floor((ahora - inicioTransmision) / 1000);
        const segundosPorCancion = 180;
        const segundosTotalPlaylist = currentPlaylist.length * segundosPorCancion;
        const posicionEnPlaylist = segundosTranscurridos % segundosTotalPlaylist;
        
        currentTrackIndex = Math.floor(posicionEnPlaylist / segundosPorCancion) % currentPlaylist.length;
        const segundoEnCancion = posicionEnPlaylist % segundosPorCancion; // ← CORREGIDO
        
        console.log('🎯 SINCRONIZACIÓN PLAYLIST LOCAL:');
        console.log(`   📀 Canción: #${currentTrackIndex + 1}/${currentPlaylist.length}`);
        console.log(`   ⏱️  Segundo: ${segundoEnCancion}s`);
        
        return {
            trackIndex: currentTrackIndex,
            segundoEnCancion: segundoEnCancion,
            track: currentPlaylist[currentTrackIndex]
        };
    }
    
    function playRadio() {
        // Primero, verificar estado actual del stream
        checkStreamStatus().then((shoutcastAvailable) => {
            if (shoutcastAvailable && useShoutcast) {
                console.log('🎵 Conectando a SHOUTCAST (transmisión en vivo)...');
                playShoutcast();
            } else {
                console.log('📀 Reproduciendo PLAYLIST LOCAL...');
                if (!playlistLoaded) {
                    loadPlaylist().then(() => {
                        if (currentPlaylist.length > 0) {
                            playLocal();
                        } else {
                            console.error('🚨 Playlist local vacía');
                            showStreamNotification('⚠️ Playlist local no disponible', false);
                        }
                    });
                } else {
                    playLocal();
                }
            }
        });
    }
    
    function playShoutcast() {
        // Detener cualquier reproducción local primero
        if (audioPlayer.src && !audioPlayer.src.includes('ferozo.com')) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        }
        
        // Limpiar eventos previos
        audioPlayer.onloadedmetadata = null;
        audioPlayer.onerror = null;
        audioPlayer.onended = null;
        
        // Configurar stream ShoutCast
        audioPlayer.src = shoutcastURL + '?t=' + Date.now(); // Evitar cache
        audioPlayer.currentTime = 0;
        
        console.log(`   🔊 Stream: ${shoutcastURL}`);
        
        // Intentar reproducir
        const playPromise = audioPlayer.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.error('❌ Error ShoutCast:', e.name);
                // Si ShoutCast falla, cambiar a local
                useShoutcast = false;
                errorCount++;
                updateLiveIndicator(false);
                
                if (errorCount < MAX_ERRORS) {
                    showStreamNotification('🔄 Cambiando a Playlist Local', false);
                    setTimeout(() => {
                        playLocal();
                    }, 2000);
                } else {
                    console.error('🚨 Demasiados errores ShoutCast');
                    showStreamNotification('⚠️ Error de conexión', false);
                    isPlaying = false;
                    updatePlayButton();
                }
            });
        }
        
        // Configurar eventos para ShoutCast
        audioPlayer.onerror = function() {
            console.error('❌ Error de conexión ShoutCast');
            useShoutcast = false;
            errorCount++;
            updateLiveIndicator(false);
            
            if (errorCount < MAX_ERRORS) {
                showStreamNotification('🔄 Cambiando a Playlist Local', false);
                setTimeout(() => {
                    playLocal();
                }, 2000);
            } else {
                console.error('🚨 Demasiados errores - Modo local');
                showStreamNotification('💿 Modo Playlist Local', false);
                isPlaying = false;
                updatePlayButton();
                useShoutcast = false;
                errorCount = 0;
            }
        };
        
        // ShoutCast es stream continuo, no tiene "ended"
        audioPlayer.onended = null;
    }
    
    function playLocal() {
        if (currentPlaylist.length === 0) {
            console.error('🚨 Playlist local vacía');
            showStreamNotification('⚠️ Playlist no disponible', false);
            isPlaying = false;
            updatePlayButton();
            return;
        }
        
        const posicion = calcularPosicionExacta();
        const track = posicion.track;
        
        if (!track) {
            console.error('🚨 Track no encontrado');
            siguienteCancion();
            return;
        }
        
        console.log(`   📀 "${track.file}"`);
        console.log(`   🎯 Empezando en segundo: ${posicion.segundoEnCancion}`);
        
        // Limpiar eventos
        audioPlayer.onloadedmetadata = null;
        audioPlayer.onerror = null;
        audioPlayer.onended = null;
        
        // Configurar audio local
        audioPlayer.src = track.path;
        audioPlayer.currentTime = Math.min(posicion.segundoEnCancion, 3600);
        
        const playPromise = audioPlayer.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.error('❌ Error local:', e.name);
                setTimeout(siguienteCancion, 1000);
            });
        }
        
        audioPlayer.onerror = function() {
            console.error('❌ Error de audio local');
            setTimeout(siguienteCancion, 1000);
        };
        
        audioPlayer.onended = function() {
            siguienteCancion();
        };
    }
    
    function siguienteCancion() {
        // Solo en modo local
        if (!useShoutcast && currentPlaylist.length > 0) {
            errorCount = 0;
            currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
            
            // Verificar si ShoutCast volvió antes de cambiar de canción
            checkStreamStatus().then((shoutcastAvailable) => {
                if (shoutcastAvailable && useShoutcast) {
                    console.log('🔄 ShoutCast detectado - Cambiando a stream');
                    showStreamNotification('🎙️ Transmisión en Vivo detectada', true);
                    playShoutcast();
                } else {
                    playLocal();
                }
            });
        }
    }
    
    function updatePlayButton() {
        if (!playPath || !pausePath1 || !pausePath2) return;
        playPath.setAttribute('opacity', isPlaying ? '0' : '1');
        pausePath1.setAttribute('opacity', isPlaying ? '1' : '0');
        pausePath2.setAttribute('opacity', isPlaying ? '1' : '0');
        
        // Añadir efecto visual cuando inicia
        if (isPlaying) {
            playButton.classList.add('radio-iniciando');
            setTimeout(() => {
                playButton.classList.remove('radio-iniciando');
            }, 1000);
        }
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
            isPlaying = true;
            
            if (!playlistLoaded) {
                await loadPlaylist();
            }
            
            console.log('▶️ Iniciando radio...');
            console.log('⚡ Modo automático: ShoutCast → Playlist Local');
            
            playRadio();
        }
        updatePlayButton();
    });
    
    shareButton.addEventListener('click', shareRadio);
    
    // ========== INICIALIZACIÓN ==========
    async function init() {
        console.log('🚀 Radio Zara - Versión Híbrida Mejorada');
        console.log('🎯 Detección automática ShoutCast/Playlist Local');
        console.log('🎨 Indicadores visuales integrados');
        
        // Crear indicador visual
        createStreamIndicator();
        
        // Cargar playlist local en segundo plano
        loadPlaylist();
        
        generateScheduleCards();
        setInterval(updateDisplayInfo, 60000);
        updateDisplayInfo();
        
        // Chequear estado del stream periódicamente
        checkInterval = setInterval(checkStreamStatus, 60000); // Cada 60 segundos
        
        // Chequear estado inicial después de 3 segundos
        setTimeout(() => {
            checkStreamStatus();
        }, 3000);
        
        console.log('✅ Radio lista (modo automático activado)');
    }
    
    init();
});
