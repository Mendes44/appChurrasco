# Brasa

Aplicativo responsivo para organizar churrascos, confirmar convidados e calcular carnes e bebidas. A interface atual funciona como demonstração navegável; o banco já está preparado para conexão com Supabase.

## Recursos

- cálculo de **350 g de carne por convidado**;
- divisão sugerida: 40% bovina, 25% linguiça, 20% frango e 15% suína;
- opções independentes: 1,5 L de chopp, 5 latas ou cerca de 1,7 garrafa por pessoa que bebe;
- formulário com bloqueio imediato de nomes repetidos;
- schema Supabase com RLS, token de convite e índice único por evento/nome.

## Executar

```bash
npm install
npm run dev
```

## Conectar ao Supabase

1. Crie um projeto gratuito no Supabase.
2. Execute `supabase/schema.sql` no SQL Editor.
3. Copie `.env.example` para `.env.local` e preencha as chaves.
4. Crie uma Edge Function `confirm-guest` para validar o token do convite, CAPTCHA e limite de requisições antes de inserir.
5. Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no navegador.

O Supabase atende bem ao projeto: reúne PostgreSQL, autenticação, Row Level Security e Edge Functions. A restrição `one_answer_per_name` bloqueia respostas repetidas com o mesmo nome; para produção, complemente com Turnstile/hCaptcha e limite por IP/token.

## Organização

- `app/page.tsx`: comportamento e interface inicial;
- `app/globals.css`: design system e responsividade;
- `supabase/schema.sql`: modelo de dados e políticas de acesso;
- `.env.example`: contrato das variáveis, sem segredos reais.

Os comentários registram o motivo das decisões importantes sem repetir o que cada linha já expressa.
