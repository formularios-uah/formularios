# Formularios UAH

Formularios de inscripción con validación, integración HubSpot y Google Sheets.

## Repositorio y deploy

- **Repositorio:** github.com/formularios-uah/formularios
- **Deploy actual:** formularios-uah.vercel.app
- **Dominio producción:** formularios.uahurtado.cl (pendiente CNAME con TI)

## URLs activas

- formularios-uah.vercel.app/talleres
- formularios-uah.vercel.app/admision

## Estructura

```
formularios/
├── shared/
│   ├── styles.css        ← diseño compartido (nunca tocar por formulario)
│   └── form-engine.js    ← validación + envío (nunca tocar por formulario)
├── talleres/
│   └── index.html        ← solo editar el bloque config
├── admision/
│   └── index.html        ← solo editar el bloque config
└── apps-script/
    └── webhook.gs        ← deployar una vez por cada Sheet
```

---

## Por cada formulario nuevo

### Paso 1: Apps Script (Google Sheets)
1. Abre el Google Sheet de destino
2. Menú → **Extensiones → Apps Script**
3. Pega el contenido de `apps-script/webhook.gs`
4. Reemplaza `REEMPLAZAR_CON_ID_DEL_SHEET` con el ID del Sheet
5. **Implementar → Nueva implementación → Aplicación web**
   - Ejecutar como: Yo
   - Acceso: Cualquier usuario
6. Copia la URL que entrega → la necesitas en el paso 3

### Paso 2: HubSpot
1. En HubSpot: **Marketing → Formularios → Crear formulario**
2. Agregar los mismos campos del Google Form de referencia
3. Copiar el **Portal ID** y el **Form GUID**

### Paso 3: Duplicar carpeta
```bash
cp -r talleres/ nombre-actividad/
```
Editar solo el bloque `config` en `nombre-actividad/index.html`:
- `titulo` y `subtitulo`
- `hubspot.portalId` y `hubspot.formGuid`
- `sheets.webhookUrl` (URL del Apps Script)
- `interes` (ej: "Charla Derecho")
- `campos` (basarse en el Google Form recibido)

### Paso 4: Deploy
```bash
git add .
git commit -m "feat: formulario nombre-actividad"
git push
```
Vercel despliega automáticamente en ~30 segundos.

**URL resultante:** `formularios.uahurtado.cl/nombre-actividad`

---

## IT: cambio de DNS (una sola vez)

Solicitar un registro CNAME:
- **Host:** `formularios`
- **Apunta a:** `cname.vercel-dns.com`
- **Resultado:** `formularios.uahurtado.cl` funcionará automáticamente

---

## Resultado en HubSpot

Cada persona que llena un formulario:
- Se crea o actualiza como **Contacto** en HubSpot automáticamente
- El campo `interes` acumula valores (multi-select): ej. `Taller de Pintura; Admisión Derecho`
- El historial de submissions queda en la ficha del contacto

El equipo de admisión ya no carga nada manualmente. Los datos llegan solos.

## Resultado en Google Sheets

Cada envío agrega una fila nueva al Sheet con:
`Timestamp | Nombre | Apellido | Email | Teléfono | RUT | Formulario | Interés | Campo adicional`

El historial nunca se replica porque es una fila nueva por cada envío.
