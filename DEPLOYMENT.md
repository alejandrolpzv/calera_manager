# Deploy de Sistema de Fabrica

## Netlify

1. Sube este repo a GitHub.
2. En Netlify, selecciona **Add new project** y conecta el repo.
3. Usa estos valores de build:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Agrega las variables de entorno en **Site configuration > Environment variables**.
5. Deploy.

## Variables de entorno

Usa el Session Pooler de Supabase para produccion:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-us-west-2.pooler.supabase.com:5432/postgres?connection_limit=1"
JWT_SECRET="usa-un-secreto-largo-y-unico"
USE_LOCAL_DEV_STORE="false"
DEFAULT_ADMIN_NAME="Factory Admin"
DEFAULT_ADMIN_EMAIL="admin@factory.local"
DEFAULT_ADMIN_PASSWORD="cambia-esto-en-produccion"
DEFAULT_OPERATOR_NAME="Factory Operator"
DEFAULT_OPERATOR_EMAIL="operator@factory.local"
DEFAULT_OPERATOR_PASSWORD="cambia-esto-en-produccion"
OPENAI_API_KEY=""
OPENAI_PAYROLL_MODEL="gpt-4.1-mini"
```

## Webapp en celular

Despues del deploy:

1. Abre el URL de Netlify en Chrome o Safari.
2. Inicia sesion.
3. En Android Chrome: menu de tres puntos > **Agregar a pantalla principal**.
4. En iPhone Safari: compartir > **Agregar a pantalla de inicio**.

La app incluye `manifest.webmanifest`, iconos PWA y color de tema para funcionar como webapp instalada.

## Verificacion antes de deploy

```bash
npm run lint
npm run build
```

## Notas

- No subas `.env` a GitHub.
- Los datos reales ya estan en Supabase; Netlify solo necesita conectarse con `DATABASE_URL`.
- Si cambias el schema de Prisma en el futuro, corre `npm run db:push` contra Supabase antes de redeployar.
