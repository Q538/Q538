# 🚔 Cuadrante Mossos - App de Gestión

Aplicación para la gestión de cuadrantes y permisos de Mossos d'Esquadra.

## 🚀 Inicio Rápido

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm start

# Iniciar solo web
npm run web
```

## 📦 Despliegue

### Opción 1: Desplegar en Vercel (Recomendado)

1. **Crear proyecto en Supabase**
   - Ve a [supabase.com](https://supabase.com)
   - Crea un nuevo proyecto
   - Ejecuta el script SQL de `DEPLOYMENT.md`
   - Copia las credenciales (URL y ANON KEY)

2. **Configurar variables de entorno**
   - Crea un archivo `.env` con:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=tu-url-aqui
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-key-aqui
   ```

3. **Desplegar en Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Importa este repositorio
   - Añade las variables de entorno
   - Despliega

### Opción 2: Build Local

```bash
# Generar build para web
npx expo export -p web

# Los archivos estarán en /dist
```

## 📱 Instalar como PWA

### Android
1. Abre la app en Chrome
2. Menú (⋮) > "Añadir a pantalla de inicio"

### iOS
1. Abre la app en Safari
2. Botón compartir > "Añadir a pantalla de inicio"

## 🗄️ Base de Datos

La app usa **Supabase** como base de datos. Ver `DEPLOYMENT.md` para instrucciones completas de configuración.

## 📖 Documentación

- **DEPLOYMENT.md** - Guía completa de despliegue
- **src/services/supabase.js** - Configuración de Supabase
- **src/services/databaseSupabase.js** - Servicio de base de datos

## 🔧 Tecnologías

- **React Native** (Expo)
- **Supabase** (Base de datos)
- **Vercel** (Hosting)
- **AsyncStorage** (Almacenamiento local de respaldo)

## 📞 Soporte

Para problemas o preguntas, revisa los logs en:
- Vercel Dashboard
- Supabase Dashboard > Logs & Analytics
