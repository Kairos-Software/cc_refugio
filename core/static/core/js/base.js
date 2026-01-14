// base.js

document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById("live-video");
    const playBtn = document.getElementById("play-btn");
    const muteBtn = document.getElementById("mute-btn");
    const fullscreenBtn = document.getElementById("fullscreen-btn");
    const statusText = document.getElementById("stream-status");
    const liveBadge = document.querySelector(".live-badge");

    // Estado inicial
    let isMuted = false;
    let isPlaying = false;

    // Función para actualizar estado ON AIR / OFF AIR
    function updateLiveStatus(isOnAir) {
        if (isOnAir) {
            liveBadge.textContent = "ON AIR";
            liveBadge.style.background = "green";
            statusText.textContent = "Transmisión en vivo activa";
        } else {
            liveBadge.textContent = "OFF AIR";
            liveBadge.style.background = "red";
            statusText.textContent = "Preparando transmisión…";
        }
    }

    // Simulación: en producción podrías validar con backend o señal RTMP/HLS
    // Aquí lo dejamos en OFF AIR por defecto
    updateLiveStatus(false);

    // Botón reproducir
    playBtn.addEventListener("click", () => {
        if (!isPlaying) {
            video.play()
                .then(() => {
                    isPlaying = true;
                    playBtn.textContent = "Pausar";
                    updateLiveStatus(true);
                })
                .catch(err => {
                    console.error("Error al reproducir:", err);
                    statusText.textContent = "Error al iniciar transmisión";
                });
        } else {
            video.pause();
            isPlaying = false;
            playBtn.textContent = "Reproducir";
            updateLiveStatus(false);
        }
    });

    // Botón mute
    muteBtn.addEventListener("click", () => {
        isMuted = !isMuted;
        video.muted = isMuted;
        muteBtn.textContent = isMuted ? "Activar sonido" : "Silenciar";
        muteBtn.setAttribute("aria-pressed", isMuted);
    });

    // Botón fullscreen
    fullscreenBtn.addEventListener("click", () => {
        if (video.requestFullscreen) {
            video.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
            video.webkitRequestFullscreen();
        } else if (video.msRequestFullscreen) {
            video.msRequestFullscreen();
        }
    });

    // Listener de eventos del video
    video.addEventListener("playing", () => {
        statusText.textContent = "Transmitiendo en vivo…";
        updateLiveStatus(true);
    });

    video.addEventListener("pause", () => {
        statusText.textContent = "Transmisión pausada";
        updateLiveStatus(false);
    });

    video.addEventListener("error", () => {
        statusText.textContent = "Error en la transmisión";
        updateLiveStatus(false);
    });
});
