# 🚀 Guía de Configuración: Supabase + Vercel

## 📦 Paso 1: Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto:
   - **Nombre**: cuadrante-app
   - **Database Password**: Guarda esta contraseña de forma segura
   - **Region**: Europe West (London) - más cercano a España
4. Espera 2-3 minutos mientras se crea el proyecto

## 🗄️ Paso 2: Crear las Tablas en Supabase

Ve a **SQL Editor** en el panel de Supabase y ejecuta este script:

```sql
-- Tabla de agentes
CREATE TABLE agents (
  id BIGSERIAL PRIMARY KEY,
  grup INTEGER NOT NULL DEFAULT 4,
  tip TEXT NOT NULL,
  nom TEXT NOT NULL,
  categoria TEXT NOT NULL,
  email TEXT,
  funcions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(grup, tip)
);

-- Tabla de permisos/notas del calendario
CREATE TABLE calendar_notes (
  id BIGSERIAL PRIMARY KEY,
  date_key TEXT NOT NULL,
  tip TEXT NOT NULL,
  statuses TEXT[],
  note TEXT,
  full_day BOOLEAN DEFAULT false,
  partial JSONB,
  modified_by_admin BOOLEAN DEFAULT false,
  perllongament JSONB,
  judici JSONB,
  permis JSONB,
  ap JSONB,
  altres JSONB,
  range_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date_key, tip)
);

-- Tabla de alertas
CREATE TABLE alerts (
  id BIGSERIAL PRIMARY KEY,
  tip TEXT NOT NULL,
  message TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de asignaciones del cuadrante
CREATE TABLE assignments (
  id BIGSERIAL PRIMARY KEY,
  grup INTEGER NOT NULL DEFAULT 4,
  date_key TEXT NOT NULL,
  service_id TEXT NOT NULL,
  tips TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(grup, date_key, service_id)
);

-- Tabla de asignaciones publicadas
CREATE TABLE published_assignments (
  id BIGSERIAL PRIMARY KEY,
  grup INTEGER NOT NULL DEFAULT 4,
  date_key TEXT NOT NULL,
  service_id TEXT NOT NULL,
  tips TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(grup, date_key, service_id)
);

-- Tabla de presencia (ausencias)
CREATE TABLE presence (
  id BIGSERIAL PRIMARY KEY,
  grup INTEGER NOT NULL DEFAULT 4,
  date_key TEXT NOT NULL,
  absent_tips TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(grup, date_key)
);

-- Tabla de servicios personalizados
CREATE TABLE custom_services (
  id BIGSERIAL PRIMARY KEY,
  grup INTEGER NOT NULL DEFAULT 4,
  date_key TEXT NOT NULL,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  is_manual BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(grup, date_key, service_id)
);

-- Tabla de configuración
CREATE TABLE app_config (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_calendar_notes_date ON calendar_notes(date_key);
CREATE INDEX idx_calendar_notes_tip ON calendar_notes(tip);
CREATE INDEX idx_alerts_tip ON alerts(tip);
CREATE INDEX idx_alerts_read ON alerts(read);
CREATE INDEX idx_assignments_date ON assignments(date_key);
CREATE INDEX idx_assignments_grup ON assignments(grup);

-- Habilitar Row Level Security (RLS)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público (temporal - ajustar según necesidades de seguridad)
CREATE POLICY "Enable read access for all users" ON agents FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON agents FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON agents FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON calendar_notes FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON calendar_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON calendar_notes FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON calendar_notes FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON alerts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON alerts FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON alerts FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON assignments FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON assignments FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON assignments FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON published_assignments FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON published_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON published_assignments FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON published_assignments FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON presence FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON presence FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON presence FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON presence FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON custom_services FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON custom_services FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON custom_services FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON custom_services FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON app_config FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON app_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON app_config FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON app_config FOR DELETE USING (true);
```

## 🔑 Paso 3: Obtener las Credenciales

1. Ve a **Settings** > **API** en tu proyecto de Supabase
2. Copia:
   - **Project URL** (ejemplo: `https://xxxxx.supabase.co`)
   - **anon public** key (la clave pública)
3. Pega estas credenciales en el archivo `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-aqui
```

## 🌐 Paso 4: Configurar PWA con Expo

1. Instala las dependencias necesarias:
```bash
npx expo install @expo/metro-runtime
```

2. Actualiza `app.json` para habilitar PWA:
```json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "favicon": "./assets/favicon.png"
    }
  }
}
```

## 🚀 Paso 5: Desplegar en Vercel

1. Ve a [https://vercel.com](https://vercel.com)
2. Conecta tu cuenta de GitHub
3. Importa el repositorio de `cuadrante-app`
4. Configura las variables de entorno en Vercel:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
5. Haz clic en **Deploy**

## ✅ Paso 6: Verificar

1. Abre la URL de Vercel (ejemplo: `https://cuadrante-app.vercel.app`)
2. Verifica que la app carga correctamente
3. Prueba crear un agente y verificar que se guarda en Supabase

## 📱 Paso 7: Instalar como PWA

### En Android:
1. Abre la app en Chrome
2. Toca el menú (⋮) > **Añadir a pantalla de inicio**

### En iOS:
1. Abre la app en Safari
2. Toca el botón de compartir
3. Selecciona **Añadir a pantalla de inicio**

## 🔐 Seguridad (IMPORTANTE)

⚠️ **Las políticas actuales permiten acceso público a todas las tablas**. Para producción, deberías:

1. Implementar autenticación de usuarios
2. Ajustar las políticas RLS para restringir acceso
3. Crear roles (admin, usuario)

## 📞 Soporte

Si tienes problemas:
- Revisa los logs en Vercel
- Revisa los logs en Supabase (Logs & Analytics)
- Verifica que las variables de entorno estén configuradas correctamente
