# Supabase — como aplicar a base de dados

Ordem de aplicação (SQL Editor do projeto Supabase da Cookr):

1. `../SUPABASE_SETUP.sql` — cria tabelas e políticas base. **É legado**: o script é de
   instalação inicial e não deve ser voltado a correr depois do passo 2, porque repõe a
   `is_admin()` antiga e o `FOR ALL TABLES` do Realtime.
2. `migrations/20260927000000_create_email_events.sql`
3. `migrations/20261122000000_security_hardening.sql` — correções de segurança (idempotente).
4. `migrations/20261123000000_private_data.sql` — IBAN/NIF/faturação e PIN do serviço passam para tabelas privadas; PIN validado no servidor (idempotente). **Aplicar antes de fazer merge do código que o usa.**
5. `migrations/20261123010000_agenda_slots.sql` — horários ocupados/libertados no servidor, sem dupla reserva.
6. `migrations/20261123020000_storage_buckets.sql` — buckets `avatars` e `covers` e respetivas políticas.
7. `migrations/20261123030000_busy_slots.sql` — função com os horários ocupados de um chef.
8. `migrations/20261123040000_notifications.sql` — preferências de notificação e lembretes de reserva.
9. `migrations/20261123050000_challenge_submissions.sql` — candidaturas a desafios do chef.
10. `migrations/20261123060000_chef_live_agenda.sql` — chef online/offline em tempo real e reservas sem sobreposição (3 h).
11. `migrations/20261123070000_haccp_favoritos_espera.sql` — tabelas e permissões de HACCP, favoritos e lista de espera.
12. `migrations/20261123080000_save_my_private.sql` — função segura para guardar NIF/IBAN/faturação.
13. `migrations/20261123090000_booking_sanity.sql` — validações de sanidade em reservas.
14. `migrations/20261123100000_stripe_payments.sql` — pagamentos Stripe (estado dos pagamentos e contas Connect dos chefs).

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
