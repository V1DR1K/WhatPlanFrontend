# Contrato de errores de la API

WhatPlan responde los errores HTTP como `application/problem+json` (RFC 9457). El cliente usa el status HTTP y `errorCode` para decidir el comportamiento; `detail` es texto para mostrar, no una clave de lógica.

```json
{
  "type": "about:blank",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Demasiadas solicitudes. Intentá nuevamente más tarde.",
  "instance": "urn:uuid:request-id",
  "errorCode": "RATE_LIMITED",
  "requestId": "request-id"
}
```

`errorCode` es una extensión estable para el cliente y `requestId` correlaciona el error con `X-Request-Id`. Algunos errores de validación agregan `errors`, un mapa de campo a mensaje. Las extensiones pueden crecer: los clientes deben ignorar las que no conocen y tolerar códigos nuevos.

| `errorCode` | Status habitual | Uso del cliente |
| --- | ---: | --- |
| `INVALID_REQUEST`, `VALIDATION_ERROR` | 400 | Mostrar detalle o errores por campo y conservar lo ingresado. |
| `UNAUTHORIZED` | 401 | Intentar renovar la sesión si la ruta lo permite; si falla, terminar la sesión. |
| `FORBIDDEN` | 403 | Explicar que la acción no está permitida; no repetir automáticamente. |
| `NOT_FOUND` | 404 | Mostrar el estado no encontrado; el servidor también usa 404 para ocultar recursos de otra pareja. |
| `METHOD_NOT_ALLOWED`, `NOT_ACCEPTABLE`, `UNSUPPORTED_MEDIA_TYPE` | 405, 406, 415 | Indica una incompatibilidad de método, formato de respuesta o contenido. |
| `CONFLICT`, `CONCURRENT_UPDATE` | 409 | Informar el conflicto y permitir recargar antes de reintentar. |
| `UPLOAD_TOO_LARGE`, `MEDIA_QUOTA_EXCEEDED` | 413 | Informar el límite de archivo o cuota de fotos. |
| `RATE_LIMITED` | 429 | Esperar `Retry-After` antes de reintentar. |
| `UPSTREAM_UNAVAILABLE`, `SERVICE_UNAVAILABLE`, `RATE_LIMIT_UNAVAILABLE` | 502–503 | Informar indisponibilidad temporal; mantener acotados los reintentos. |
| `INTERNAL_ERROR` | 500 | Mostrar un mensaje genérico; no mostrar datos internos. |

`ApiError` en `src/lib/api.ts` conserva `status`, `errorCode`, `requestId`, `type`/`instance` y errores de campo cuando están presentes, además del `message` usado por las vistas. Si la respuesta no cumple RFC 9457, el cliente conserva un mensaje alternativo y el status, sin inferir códigos a partir de texto arbitrario.

No registrar tokens, cookies, cuerpos completos ni contenido privado al reportar errores. Para soporte, compartir solo el `requestId` y el momento aproximado de la solicitud.
