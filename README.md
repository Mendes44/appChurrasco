# APPBraza - planejador de churrasco

Aplicação web para criar churrascos, enviar convites individuais e calcular carnes, bebidas e itens de compra conforme as confirmações.

O projeto foi construído com foco em portfólio: autenticação Google, autorização no servidor, Row Level Security, validação de entradas, links não sequenciais e interface responsiva.

## Principais funcionalidades

- vários churrascos por organizador;
- criação, edição e exclusão de eventos;
- data, horário, endereço e quantidade de carne configuráveis;
- convites individuais para titular e um acompanhante;
- confirmação de presença e consumo de bebidas;
- painel atualizado automaticamente;
- edição e exclusão administrativa de respostas;
- cálculos de carnes, acompanhamentos, chopp, latas e garrafas;
- checklist de compras salvo no navegador;
- exportação da lista em PDF e Excel;
- integração com Google Maps e Google Agenda;
- layout responsivo com menu mobile.

## Tecnologias

- Next.js e React;
- TypeScript;
- Supabase Auth e PostgreSQL;
- Google OAuth;
- ExcelJS e jsPDF;
- Vercel para hospedagem.

## Requisitos

- Node.js 22.13 ou superior;
- conta gratuita no Supabase;
- projeto no Google Cloud para OAuth;
- conta na Vercel, caso queira publicar.

## 1. Instalação local

Clone o repositório e instale as dependências:

```powershell
git clone URL_DO_REPOSITORIO
cd appChurrasco
npm.cmd install
```

Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_PRIVADA
ADMIN_EMAIL=seu-email-google@gmail.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Regras importantes:

- `NEXT_PUBLIC_*` pode chegar ao navegador;
- `SUPABASE_SERVICE_ROLE_KEY` é exclusiva do servidor;
- nunca envie `.env.local` ao Git;
- `ADMIN_EMAIL` define a única conta Google autorizada no painel.

Inicie o projeto:

```powershell
npm.cmd run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## 2. Banco de dados no Supabase

1. Crie um projeto em [Supabase](https://supabase.com).
2. Abra **SQL Editor**.
3. Execute todo o arquivo `supabase/schema.sql`.
4. Execute, pela ordem do nome, os arquivos de `supabase/migrations`.
5. Confirme em **Table Editor** que existem as tabelas `events`, `guests`, `invitations` e `confirmation_attempts`.

Os scripts são idempotentes: as instruções `if not exists` permitem executá-los novamente durante a configuração.

## 3. Login Google

### Google Cloud

1. Crie ou selecione um projeto.
2. Configure o **Google Auth Platform**.
3. Crie um cliente OAuth do tipo **Aplicativo da Web**.
4. Em origens autorizadas, adicione:

```text
http://localhost:3000
```

5. Em URIs de redirecionamento, adicione o callback exibido pelo Supabase:

```text
https://SEU_PROJETO.supabase.co/auth/v1/callback
```

6. Copie o Client ID e Client Secret.

### Supabase

1. Abra **Authentication → Providers → Google**.
2. Ative o provedor.
3. Informe Client ID e Client Secret.
4. Em **Authentication → URL Configuration**, configure:

```text
Site URL: http://localhost:3000
Redirect URL: http://localhost:3000/auth/callback
```

O e-mail usado no login precisa ser igual ao valor de `ADMIN_EMAIL`.

## 4. Roteiro de avaliação

Um avaliador pode testar o projeto desta forma:

1. Entrar com a conta Google definida em `ADMIN_EMAIL`.
2. Criar um churrasco com nome, data, endereço e gramas por pessoa.
3. Criar um convite individual e copiar o link.
4. Abrir o link em janela anônima.
5. Confirmar presença com ou sem acompanhante.
6. Voltar ao painel e aguardar a atualização automática.
7. Gerenciar a resposta do convidado.
8. Conferir os cálculos e marcar itens na lista de compras.
9. Exportar a lista em PDF e Excel.
10. Reabrir o convite para testar Maps e Google Agenda.

## 5. Publicação na Vercel

1. Importe o repositório na Vercel.
2. Cadastre todas as variáveis de `.env.example` em **Settings → Environment Variables**.
3. Troque `NEXT_PUBLIC_SITE_URL` pela URL final.
4. No Supabase, adicione:

```text
Site URL: https://SEU-PROJETO.vercel.app
Redirect URL: https://SEU-PROJETO.vercel.app/auth/callback
```

5. No Google Cloud, adicione a URL da Vercel às origens JavaScript autorizadas.
6. Mantenha como URI OAuth o callback do Supabase (`/auth/v1/callback`).
7. Faça um novo deploy depois de alterar variáveis.

## Arquitetura resumida

```text
Convidado → link com token → API validada → função PostgreSQL
                                              ↓
Organizador → Google OAuth → autorização → painel administrativo
                                              ↓
                                  Supabase PostgreSQL + RLS
```

- páginas públicas nunca recebem a chave privada;
- APIs validam tipos, limites e autorização;
- o painel usa sessão protegida por cookies;
- operações administrativas confirmam o proprietário do evento;
- funções SQL concentram gravações públicas sensíveis;
- tokens UUID dificultam enumeração de convites.

## Scripts úteis

```powershell
npm.cmd run dev        # servidor de desenvolvimento
npm.cmd run typecheck  # valida os tipos TypeScript
npm.cmd run lint       # analisa qualidade e padrões
npm.cmd run build      # gera a versão de produção
```

## Estrutura para estudo

```text
app/                 páginas e rotas HTTP do Next.js
components/          componentes compartilhados
lib/                 autenticação, Supabase e cálculos
supabase/schema.sql  estrutura e políticas iniciais
supabase/migrations/ evoluções idempotentes do banco
public/              imagens e ícones públicos
```

Os comentários no código explicam decisões de segurança e regras de negócio. Comece por `lib/auth.ts`, `lib/admin.ts`, `app/api` e depois acompanhe o fluxo até as páginas em `app/painel` e `app/convite`.

## Segurança

- Google OAuth pelo Supabase;
- e-mail administrativo configurável no ambiente;
- validação de sessão e autorização no servidor;
- RLS baseado em `owner_id`;
- service role restrita ao servidor;
- limite de tentativas por IP e convite;
- UUIDs para links compartilháveis;
- restrições e índices únicos no PostgreSQL;
- dados pessoais ausentes do repositório.

Para ambientes públicos com grande volume, recomenda-se adicionar proteção contra robôs, como Cloudflare Turnstile, e observabilidade de erros.
