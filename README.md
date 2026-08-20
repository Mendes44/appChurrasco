# Brasa

Aplicativo em Next.js para organizar churrascos. O convidado recebe apenas um link público de confirmação; o painel com nomes e quantidades exige login Google e aceita exclusivamente `marcosmendesm10@gmail.com`.

## Executar localmente

```powershell
npm.cmd install
npm.cmd run dev
```

Abra `http://localhost:3000`. O Node.js 22 ou superior é suportado.

## Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql` e execute.
3. Em **Authentication → Providers → Google**, habilite o Google.
4. No Google Cloud Console, crie credenciais OAuth do tipo Web e copie Client ID e Client Secret para o Supabase.
5. Em **Authentication → URL Configuration**, use `http://localhost:3000` como Site URL durante o desenvolvimento e adicione `http://localhost:3000/auth/callback` em Redirect URLs.
6. Copie `.env.example` para `.env.local` e preencha URL, chave anon e chave service role do projeto.
7. Rode o projeto, entre uma vez com `marcosmendesm10@gmail.com` e copie o ID desse usuário em **Authentication → Users**.
8. No SQL Editor, execute:

```sql
insert into public.events(owner_id, title, event_date)
values ('SEU_AUTH_USER_ID', 'Churrasco de sábado', '2026-08-23 13:00:00-03')
returning invite_token;
```

O link público será `/convite/TOKEN_RETORNADO`.

## Publicar na Vercel

Cadastre as mesmas variáveis de `.env.example` em **Project Settings → Environment Variables**. Depois atualize no Supabase:

- Site URL: endereço final da Vercel;
- Redirect URL: `https://SEU-DOMINIO.vercel.app/auth/callback`;
- `NEXT_PUBLIC_SITE_URL`: endereço final da Vercel.

Nunca publique `.env.local` ou a chave `SUPABASE_SERVICE_ROLE_KEY` no Git.

## Segurança aplicada

- autenticação Google gerenciada pelo Supabase;
- autorização conferida no servidor por lista explícita de e-mail;
- segunda autorização no PostgreSQL por Row Level Security;
- painel renderizado no servidor e inacessível ao convidado;
- chave service role usada somente na rota do servidor;
- token UUID não sequencial para cada convite;
- validação de tamanho e tipo de todos os campos;
- limite de dez tentativas por IP, convite e hora;
- índice único que impede duas respostas com o mesmo nome no evento;
- ausência de leitura pública da lista de convidados.

Para uma defesa adicional contra robôs, o próximo passo recomendado é ativar Cloudflare Turnstile no formulário público.
