from django.shortcuts import render
from django.conf import settings
from core.models import CanalTransmision
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


def _get_stream():
    return CanalTransmision.objects.filter(
        usuario__username=settings.IGLESIA_USER
    ).first()


def home(request):
    stream = _get_stream()
    hls_url = f"{settings.HLS_BASE_URL}/{settings.HLS_PROGRAM_PATH}/{settings.IGLESIA_USER}.m3u8"

    context = {
        "stream": stream,
        "on_air": stream.en_vivo if stream else False,
        "hls_url": hls_url,
    }

    return render(request, "core/home.html", context)


def estado_stream(request):
    """
    Endpoint de polling para el reproductor público.
    Devuelve el estado actual del canal sin recargar la página.
    """
    stream = _get_stream()
    return JsonResponse({
        "on_air": stream.en_vivo if stream else False,
        "modo_radio": stream.modo_radio if stream else False,
    })


# Memoria temporal (se borra al terminar transmisión)
mensajes_chat = []


@csrf_exempt
def enviar_mensaje(request):
    global mensajes_chat
    stream = _get_stream()

    if not stream or not stream.en_vivo:
        mensajes_chat = []
        return JsonResponse({"activo": False, "mensajes": []})

    if request.method == "POST":
        nombre_usuario = request.POST.get("usuario", "Anónimo")
        mensaje = request.POST.get("mensaje", "")
        if mensaje.strip():
            mensajes_chat.append(f"{nombre_usuario}: {mensaje}")

    return JsonResponse({"activo": True, "mensajes": mensajes_chat})


def obtener_mensajes(request):
    global mensajes_chat
    stream = _get_stream()

    if not stream or not stream.en_vivo:
        mensajes_chat = []
        return JsonResponse({"activo": False, "mensajes": []})

    return JsonResponse({"activo": True, "mensajes": mensajes_chat})