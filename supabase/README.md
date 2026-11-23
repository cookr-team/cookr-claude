# Supabase — como aplicar a base de dados

Ordem de aplicação (SQL Editor do projeto Supabase da Cookr):

1. `../SUPABASE_SETUP.sql` — cria tabelas e políticas base. **É legado**: o script é de
   instalação inicial e não deve ser voltado a correr depois do passo 2, porque repõe a
   `is_admin()` antiga e o `FOR ALL TABLES` do Realtime.
2. `migrations/20260927000000_create_email_events.sql`
3. `migrations/20261122000000_security_hardening.sql` — correções de segurança (idempotente).
4. `migrations/20261123000000_private_data.sql` — IBAN/NIF/faturação e PIN do serviço passam para tabelas privadas; PIN validado no servidor (idempotente). **Aplicar antes de fazer merge do código que o usa.**

Depois do passo 3, confirme que o administrador existe em `public.profiles` com `role = 'admin'`:

```sql
SELECT id, email, role FROM public.profiles WHERE role = 'admin';
```

A `is_admin()` já não aceita `user_metadata.role` (é editável pelo próprio utilizador).

## Variáveis de ambiente do servidor

`SUPABASE_SERVICE_ROLE_KEY` (apenas servidor, nunca com prefixo `VITE_`) é necessária para o
servidor Express registar `email_events` e validar destinatários de emails.

## Função `send-email`

```bash
supabase secrets set EMAIL_FUNCTION_SECRET=<segredo com 16+ caracteres>
supabase functions deploy send-email   # sem --no-verify-jwt
```
