# Publicar SIGEPA en internet (Render + TiDB Cloud)

Al final tendrás un enlace como `https://sigepa.onrender.com` que cualquiera abre sin instalar nada.
Las dos cuentas son gratuitas. Tiempo aproximado: 20 minutos.

## 1. Base de datos en TiDB Cloud

1. Crea una cuenta en <https://tidbcloud.com> (puedes entrar con GitHub o Google).
2. Crea una instancia **Starter** (gratuita). Elige la región más cercana (por ejemplo `us-east-1`).
3. En la página de la instancia, pulsa **Connect**:
   - *Connection type*: **Public**.
   - *Connect with*: **General**.
   - Pulsa **Generate Password** y **guárdala** (solo se muestra una vez).
4. Copia estos datos (los vas a pegar en Render):
   - **HOST** — algo como `gateway01.us-east-1.prod.aws.tidbcloud.com`
   - **PORT** — `4000`
   - **USERNAME** — algo como `2abc3XYZ.root` (incluye el prefijo y `.root`)
   - **PASSWORD** — la que generaste

No necesitas crear tablas: la API crea la base `sigepa`, sus 12 tablas, las vistas y los datos de ejemplo la primera
vez que arranca.

## 2. Servicio web en Render

1. Crea una cuenta en <https://render.com> con tu cuenta de **GitHub** y dale acceso al repositorio `SIGEPA`.
2. En el panel: **New → Blueprint** y elige el repositorio. Render lee el archivo `render.yaml`.
3. Te pedirá los valores secretos. Pega los de TiDB:
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`
   (`DB_PORT=4000`, `DB_NAME=sigepa`, `DB_SSL=true` y `JWT_SECRET` ya vienen configurados.)
4. Pulsa **Apply**. La primera compilación tarda unos 3–5 minutos.
5. En los registros (*Logs*) debe aparecer:
   ```
   [base] Base vacía: creando tablas (esquema.sql)…
   [base] Lista: 12 tablas, 2,475 municipios, 21 cuentas y 68 recetas.
   Listo en http://localhost:10000 (production)
   ```
6. Abre el enlace del servicio. Revisa también `https://TU-SERVICIO.onrender.com/api/salud` → `{"estado":"ok","base":"ok",...}`.

Cada vez que se haga *merge* a `main`, Render vuelve a publicar solo.

## Antes de presentar

- **Abre el enlace un minuto antes.** El plan gratuito apaga el servicio tras 15 minutos sin visitas y tarda
  alrededor de un minuto en despertar.
- Las **fotos subidas** desde la computadora se borran cuando Render reinicia el servicio (su disco es temporal).
  Para la demostración usa la opción **"Enlace a una foto"** al publicar, o súbelas y muéstralas en la misma sesión.
- Cuentas de prueba (contraseña `Sigepa2026`): `admin@sigepa.mx` (moderador), `elena.martinez@correo.mx`
  (portadora), `diego.ramirez@correo.mx` (usuario).

## Problemas comunes

| Mensaje en los registros | Causa | Solución |
|---|---|---|
| `Access denied for user` | Usuario o contraseña mal copiados | El usuario lleva prefijo: `2abc3XYZ.root` |
| `connect ETIMEDOUT` | Host o puerto incorrectos | Revisa `DB_HOST` y que `DB_PORT` sea `4000` |
| `Connections using insecure transport are prohibited` | Falta TLS | `DB_SSL=true` |
| `Falta JWT_SECRET` | Variable vacía | En Render → *Environment* → *Generate* |

## Volver a cargar los datos de ejemplo

Desde tu computadora, con los datos de TiDB en `backend/.env` (opción B de `.env.example`):

```bash
cd backend
npm run build
npm run db:reiniciar
```

Borra las tablas y las vuelve a crear con `database/esquema.sql` y `database/datos.sql`.
