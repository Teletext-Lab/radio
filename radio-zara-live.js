// radio-zara-live.js - VERSIÓN PARA CUANDO TRANSMITÍS CON BUTT
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
    
    // ========== LÓGICA RADIO (VERSIÓN EN VIVO) ==========
    function playRadio() {
        console.log('🎙️ Conectando a transmisión en vivo...');
        
        // LIMPIAR EVENTOS ANTERIORES
        audioPlayer.onerror = null;
        audioPlayer.onended = null;
        
        // ========== LÍNEA CRÍTICA ==========
        // URL del stream en vivo de BUTT
        const streamURL = "https://radio01.ferozo.com/proxy/ra01001229?mp=/?t=" + Date.now();
        
        // Configurar y reproducir stream
        audioPlayer.src = streamURL;
        audioPlayer.currentTime = 0;
        
        console.log('   🔊 URL del stream:', streamURL);
        
        // Intentar reproducir
        const playPromise = audioPlayer.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.error('❌ Error al reproducir stream:', e.name);
                // Si falla HTTP, probar HTTPS (aunque probablemente falle también)
                audioPlayer.src = "https://radio01.ferozo.com:9694/stream?t=" + Date.now();
                audioPlayer.play().catch(e2 => {
                    console.error('❌ Error con HTTPS también:', e2.name);
                    isPlaying = false;
                    updatePlayButton();
                });
            });
        }
        
        // MANEJAR ERRORES DURANTE REPRODUCCIÓN
        audioPlayer.onerror = function() {
            console.error('❌ Error de conexión con el stream');
            // Intentar reconectar después de 5 segundos
            if (isPlaying) {
                setTimeout(() => {
                    console.log('🔄 Reconectando...');
                    audioPlayer.src = streamURL + '&retry=' + Date.now();
                    audioPlayer.play();
                }, 5000);
            }
        };
        
        // El stream en vivo es continuo, no tiene "ended"
        audioPlayer.onended = null;
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
    playButton.addEventListener('click', function() {
        if (isPlaying) {
            audioPlayer.pause();
            isPlaying = false;
            console.log('⏸️ Pausado');
        } else {
            isPlaying = true;
            console.log('▶️ Iniciando transmisión en vivo...');
            playRadio();
        }
        updatePlayButton();
    });
    
    shareButton.addEventListener('click', shareRadio);
    
    // ========== INICIALIZACIÓN ==========
    function init() {
        console.log('🚀 Teletext Radio - MODO TRANSMISIÓN EN VIVO');
        console.log('🎙️ Conectando directamente al stream de BUTT');
        console.log('🔗 Stream: http://radio01.ferozo.com:9694/stream');
        
        generateScheduleCards();
        setInterval(updateDisplayInfo, 60000);
        updateDisplayInfo();
        
        // Si la página se carga y ya debería estar reproduciendo
        if (isPlaying) {
            playRadio();
        }
        
        console.log('✅ Modo en vivo activado - Esperando transmisión de BUTT');
    }
    
    init();
});
