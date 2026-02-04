# ✅ CHECKLIST DE DESPLIEGUE

## 📋 Pasos Completados

- [x] Instalado `@supabase/supabase-js`
- [x] Creado archivo de configuración de Supabase (`src/services/supabase.js`)
- [x] Creado archivo `.env` para variables de entorno
- [x] Actualizado `.gitignore` para proteger credenciales
- [x] Creado servicio de base de datos con Supabase (`src/services/databaseSupabase.js`)
- [x] Configurado PWA en `app.json`
- [x] Creado `vercel.json` para despliegue
- [x] Creado script de migración de datos
- [x] Creado documentación completa (`DEPLOYMENT.md`)

## 🎯 PRÓXIMOS PASOS (DEBES HACER TÚ)

### 1. Crear Proyecto en Supabase (5 minutos)

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta (puedes usar GitHub)
3. Crea un nuevo proyecto:
   - **Nombre**: `cuadrante-mossos`
   - **Password**: Guarda esta contraseña
   - **Region**: Europe West (London)
4. Espera 2-3 minutos mientras se crea

### 2. Configurar Base de Datos (3 minutos)

1. En Supabase, ve a **SQL Editor**
2. Copia TODO el script SQL de `DEPLOYMENT.md` (líneas 15-180)
3. Pégalo en el editor y ejecuta (**Run**)
4. Verifica que se crearon las tablas en **Table Editor**

### 3. Obtener Credenciales (1 minuto)

1. Ve a **Settings** > **API**
2. Copia:
   - **Project URL** (ej: `https://xxxxx.supabase.co`)
   - **anon public** key
3. Pega en el archivo `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-aqui
```

### 4. Activar Supabase en el Código (1 minuto)

Abre `src/services/databaseSupabase.js` y cambia:

```javascript
const USE_SUPABASE = true; // Cambiar de false a true
```

### 5. Probar Localmente (2 minutos)

```bash
npm run web
```

Verifica que la app funciona correctamente.

### 6. Crear Repositorio en GitHub (3 minutos)

```bash
git init
git add .
git commit -m "Initial commit - Cuadrante Mossos PWA"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/cuadrante-app.git
git push -u origin main
```

### 7. Desplegar en Vercel (5 minutos)

1. Ve a [https://vercel.com](https://vercel.com)
2. Inicia sesión con GitHub
3. Click en **Add New** > **Project**
4. Importa el repositorio `cuadrante-app`
5. Configura las variables de entorno:
   - `EXPO_PUBLIC_SUPABASE_URL` = tu URL de Supabase
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = tu clave anon
6. Click en **Deploy**
7. Espera 2-3 minutos

### 8. Probar la PWA (2 minutos)

1. Abre la URL de Vercel (ej: `https://cuadrante-app.vercel.app`)
2. Verifica que todo funciona
3. En el móvil:
   - **Android**: Chrome > Menú > "Añadir a pantalla de inicio"
   - **iOS**: Safari > Compartir > "Añadir a pantalla de inicio"

## 🔄 Migrar Datos Existentes (Opcional)

Si tienes datos en AsyncStorage que quieres migrar a Supabase:

1. Abre la app en desarrollo
2. En la consola de React Native DevTools, ejecuta:

```javascript
import { migrateToSupabase } from './src/services/migration';
migrateToSupabase();
```

## 📱 Publicar en Tiendas (Futuro)

### Google Play Store

```bash
# Generar APK
eas build --platform android --profile production

# Subir a Google Play Console
```

### Apple App Store

```bash
# Generar IPA
eas build --platform ios --profile production

# Subir a App Store Connect
```

## 🆘 Problemas Comunes

### Error: "Invalid Supabase URL"
- Verifica que las variables de entorno estén configuradas correctamente
- Asegúrate de que el archivo `.env` esté en la raíz del proyecto

### Error: "Failed to fetch"
- Verifica que las políticas RLS estén configuradas en Supabase
- Revisa los logs en Supabase Dashboard > Logs

### La PWA no se instala
- Verifica que estés usando HTTPS (Vercel lo hace automáticamente)
- Asegúrate de que `app.json` tenga la configuración web correcta

## 📞 Contacto

Si tienes problemas, revisa:
- **Logs de Vercel**: Dashboard > tu-proyecto > Deployments > Logs
- **Logs de Supabase**: Dashboard > Logs & Analytics
- **Consola del navegador**: F12 > Console

---

**¡Tiempo total estimado: ~25 minutos!** 🚀
