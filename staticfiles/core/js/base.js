document.addEventListener("DOMContentLoaded", () => {
    const contenedor = document.getElementById("streamContainer");
    const video = document.getElementById("videoPlayer");

    if (!contenedor || !video) {
        console.warn("⛔ No se encontró el contenedor del stream o el video");
        return;
    }

    // ==============================
    // LEER DATOS DESDE HTML
    // ==============================
    const enVivo = contenedor.dataset.onAir === "true";
    const urlHls = contenedor.dataset.hlsUrl;

    if (!urlHls) {
        console.warn("⛔ No hay URL HLS");
        return;
    }

    // ==============================
    // HLS PLAYER
    // ==============================
    if (enVivo) {
        console.log("▶️ Intentando reproducir HLS:", urlHls);
    } else {
        console.log("ℹ️ El canal está OFFLINE");
    }

    let hls = null;

    function iniciarHls() {
        if (!enVivo) return;

        if (Hls.isSupported()) {
            hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 10,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                manifestLoadingMaxRetry: 5,
                manifestLoadingRetryDelay: 1000,
            });

            hls.loadSource(urlHls);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log("✅ Manifest cargado");
                video.play().catch(err => {
                    console.warn("⚠️ Autoplay bloqueado:", err);
                });
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error("❌ Error HLS:", data);

                if (!data.fatal) return;

                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.warn("🌐 Error de red, reintentando...");
                        hls.startLoad();
                        break;

                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.warn("🎞️ Error de media, recuperando...");
                        hls.recoverMediaError();
                        break;

                    default:
                        console.error("💀 Error fatal, reiniciando HLS");
                        hls.destroy();
                        iniciarHls();
                        break;
                }
            });

        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            // Safari
            video.src = urlHls;
            video.addEventListener("loadedmetadata", () => {
                video.play();
            });
        } else {
            console.error("⛔ El navegador no soporta HLS");
        }
    }

    iniciarHls();

    // ==============================
    // CHAT GLOBAL EFÍMERO
    // ==============================
    const mensajesChat = document.getElementById("chatMessages");
    const entradaChat = document.querySelector(".chat-input input");
    const botonChat = document.querySelector(".chat-input button");

    // Modal elementos
    const modalNombre = document.getElementById("modalNombre");
    const inputNombreModal = document.getElementById("nombreUsuarioInput");
    const botonGuardarNombre = document.getElementById("guardarNombreBtn");

    if (mensajesChat && entradaChat && botonChat) {
        if (enVivo) {
            // Chat vacío al iniciar transmisión
            mensajesChat.innerHTML = "";

            entradaChat.disabled = false;
            botonChat.disabled = false;

            function enviarMensaje() {
                let nombreUsuario = localStorage.getItem("nombre_chat");

                // Si no hay nombre, abrir modal
                if (!nombreUsuario) {
                    modalNombre.classList.remove("oculto");

                    function guardarNombre() {
                        const nombreIngresado = inputNombreModal.value.trim();
                        if (nombreIngresado) {
                            localStorage.setItem("nombre_chat", nombreIngresado);
                            modalNombre.classList.add("oculto");
                            inputNombreModal.value = "";
                            enviarMensaje(); // reintentar envío
                        } else {
                            alert("⚠️ Debes ingresar un nombre para participar.");
                        }
                    }

                    botonGuardarNombre.onclick = guardarNombre;
                    inputNombreModal.addEventListener("keydown", e => {
                        if (e.key === "Enter") guardarNombre();
                    });

                    return;
                }

                const mensaje = entradaChat.value.trim();
                if (!mensaje) return;

                fetch("/chat/enviar/", {
                    method: "POST",
                    headers: {"X-CSRFToken": obtenerCookie("csrftoken")},
                    body: new URLSearchParams({usuario: nombreUsuario, mensaje: mensaje})
                }).then(r => r.json()).then(data => {
                    if (!data.activo) {
                        mensajesChat.innerHTML = `<div class="message system">📴 El chat está desactivado</div>`;
                        entradaChat.disabled = true;
                        botonChat.disabled = true;
                        localStorage.removeItem("nombre_chat");
                    } else {
                        renderizarMensajes(data.mensajes);
                    }
                });

                entradaChat.value = "";
            }

            // Click y Enter para enviar
            botonChat.addEventListener("click", enviarMensaje);
            entradaChat.addEventListener("keydown", e => {
                if (e.key === "Enter") enviarMensaje();
            });

            // Polling cada 2 segundos
            setInterval(() => {
                fetch("/chat/obtener/").then(r => r.json()).then(data => {
                    if (!data.activo) {
                        mensajesChat.innerHTML = `<div class="message system">📴 El chat está desactivado</div>`;
                        entradaChat.disabled = true;
                        botonChat.disabled = true;
                        localStorage.removeItem("nombre_chat");
                    } else {
                        renderizarMensajes(data.mensajes);
                    }
                });
            }, 2000);

            function renderizarMensajes(mensajes) {
                mensajesChat.innerHTML = "";
                mensajes.forEach(m => {
                    const el = document.createElement("div");
                    el.classList.add("message", "user");
                    el.textContent = m;
                    mensajesChat.appendChild(el);
                });
                mensajesChat.scrollTop = mensajesChat.scrollHeight;
            }

            function obtenerCookie(nombre) {
                let valorCookie = null;
                if (document.cookie && document.cookie !== "") {
                    const cookies = document.cookie.split(";");
                    for (let i = 0; i < cookies.length; i++) {
                        const cookie = cookies[i].trim();
                        if (cookie.substring(0, nombre.length + 1) === (nombre + "=")) {
                            valorCookie = decodeURIComponent(cookie.substring(nombre.length + 1));
                            break;
                        }
                    }
                }
                return valorCookie;
            }

        } else {
            // Mostrar mensaje por defecto solo si está offline
            mensajesChat.innerHTML = `<div class="message system">📴 El chat está desactivado</div>`;
            entradaChat.disabled = true;
            botonChat.disabled = true;
            localStorage.removeItem("nombre_chat");
        }
    }

    // ==============================
    // CLEANUP
    // ==============================
    window.addEventListener("beforeunload", () => {
        if (hls) {
            hls.destroy();
            hls = null;
        }
    });
});
