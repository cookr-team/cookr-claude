# Diretiva de Autonomia e Controlo Absoluto do Administrador (Admin)

O Administrador tem controlo supremo sobre todo o ecossistema Cookr. Segue rigorosamente estas regras ao implementar, modificar ou expandir o painel de administração:

1. **Ignorar Fluxos Restritivos**: O perfil de administrador não pode ser bloqueado por validações normais de cliente ou de chef. Se houver um utilizador ou chef com dados ou documentos em falta, o administrador deve poder ativá-lo, editá-lo ou forçar a aprovação manualmente.
2. **Capacidades de Edição Direta (Override)**:
   - Permitir edição de dados críticos de qualquer utilizador (Nome, E-mail, Tipo de Conta, Estado Ativo/Bloqueado).
   - Permitir aprovação, cancelamento ou alteração manual de qualquer reserva em qualquer estado (Pendente, Confirmada, Concluída).
   - Permitir ajuste manual direto de saldos, pontos de fidelidade e taxas de serviço.
3. **Ações de Desbloqueio Rápido**:
   - Fornecer ferramenta de geração de links diretos de recuperação de conta / redefinição de password para que o administrador possa enviar diretamente ao cliente.
   - Incluir botão para "Simular Utilizador" ou visualizar o estado exato de um chef a partir do painel administrativo.
4. **Resolução de Constrangimentos**:
   - Qualquer erro detetado no fluxo de um utilizador (ex: faltas de documentação ou problemas com regras HACCP) deve ser passível de ser "ignorado pelo admin" através de um toggle ou bypass direto na base de dados.
