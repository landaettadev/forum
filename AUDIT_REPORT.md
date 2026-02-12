# Informe de Auditoría del Sitio

**Fecha:** 11 de Febrero, 2026
**Estado:** ⚠️ Requiere Atención (Vulnerabilidades en dependencias y corrección de despliegue aplicada)

## 1. Resumen Ejecutivo
El sitio presentaba un error crítico que impedía el despliegue en producción (Netlify/GitHub Actions) debido a una validación estricta de variables de entorno durante la fase de construcción estática. Este problema ha sido mitigado en el código. Adicionalmente, se detectaron vulnerabilidades de seguridad en las dependencias que requieren actualización inmediata.

## 2. Hallazgos Críticos (Bloqueantes)

### 🔴 Error de Construcción (Solucionado)
**Problema:** El despliegue fallaba con el error `Error: supabaseUrl is required`.
**Causa:** Los archivos `lib/supabase.ts` y `lib/supabase-admin.ts` intentaban inicializar el cliente de Supabase inmediatamente al importar el módulo. Al usar `process.env.VARIABLE!`, el operador `!` forzaba un error si la variable no existía en el entorno de CI/CD durante la generación estática de páginas (SSG).
**Solución Aplicada:** Se modificó la inicialización para usar un patrón "Lazy/Proxy". Ahora, si las credenciales faltan durante el build, se devuelve un objeto proxy que solo lanza error si se intenta invocar métodos del cliente en tiempo de ejecución. Esto permite que el build termine exitosamente.

## 3. Seguridad y Dependencias

### 🟠 Vulnerabilidades Detectadas (`npm audit`)
Se encontraron **14 vulnerabilidades** (1 baja, 8 moderadas, 4 altas, 1 crítica).
- **Next.js:** Múltiples vulnerabilidades de DoS y SSRF en versiones anteriores a 14.2.10. (Se recomienda actualizar a la última versión estable).
- **PostCSS:** Problema de parseo (Moderado).
- **Glob:** Inyección de comandos (Alto).

**Acción Recomendada:** Ejecutar `npm audit fix --force` con precaución, ya que puede introducir cambios disruptivos (breaking changes). Se ha ejecutado `npm audit fix` estándar, pero algunas vulnerabilidades persisten y requieren intervención manual o actualizaciones mayores.

### 🔑 Gestión de Secretos
- **Estado:** ✅ No se detectaron claves de API (Stripe, Supabase Service Role, etc.) hardcodeadas en el código fuente durante el escaneo rápido.
- **Recomendación:** Asegurarse de que `SUPABASE_SERVICE_ROLE_KEY` nunca se exponga en `NEXT_PUBLIC_` variables.

## 4. Calidad de Código (Linting)

### ⚠️ Advertencias de ESLint
El proceso de linting arrojó advertencias que, aunque no rompen el sitio, afectan el rendimiento y la mantenibilidad:
- **`next/image`:** Se está utilizando la etiqueta HTML `<img>` en lugar del componente `<Image />` de Next.js. Esto impide la optimización automática de imágenes y afecta las métricas de Core Web Vitals (LCP).
- **`react-hooks/exhaustive-deps`:** Múltiples componentes (`block-button.tsx`, `custom-badges.tsx`, etc.) tienen efectos (`useEffect`) con dependencias faltantes. Esto puede causar bugs sutiles donde la UI no se actualiza cuando cambian los props o el estado.

## 5. Rendimiento

- **Build:** La construcción genera páginas estáticas correctamente (SSG).
- **Advertencias:** Webpack reporta que se están serializando cadenas muy grandes (133kiB), lo que impacta el rendimiento de deserialización.

## 6. Próximos Pasos Recomendados

1. **Validar Despliegue:** Confirmar que el nuevo despliegue en Netlify finaliza correctamente tras el parche aplicado en `lib/supabase.ts`.
2. **Actualizar Dependencias:** Planificar una actualización de `next`, `postcss` y `eslint-config-next` para resolver las vulnerabilidades de seguridad pendientes.
3. **Refactorizar Imágenes:** Reemplazar etiquetas `<img>` por `<Image />` progresivamente.
4. **Corregir Hooks:** Revisar los `useEffect` marcados por el linter para incluir todas las dependencias necesarias o refactorizar la lógica si es necesario.
