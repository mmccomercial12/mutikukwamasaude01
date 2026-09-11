# MUTIKUKWAMA SAÚDE 🇦🇴
### Plataforma SaaS Nacional de Saúde de Angola

Sistema unificado que conecta **Utentes/Pacientes**, **Farmácias**, **Clínicas**, **Hospitais**, **Laboratórios** e **Depósitos Grossistas de Medicamentos** em todas as 18 províncias de Angola.

---

## 🚀 Guia de Publicação no GitHub e Vercel

### 1. Publicar no GitHub

No seu terminal local (ou máquina de desenvolvimento):

```bash
# 1. Inicializar o repositório git (caso ainda não esteja inicializado)
git init

# 2. Adicionar todos os ficheiros
git add .

# 3. Criar o commit inicial
git commit -m "feat: mutikukwama saude producao com firestore e suporte vercel"

# 4. Definir a branch principal como main
git branch -M main

# 5. Associar ao seu repositório no GitHub (substitua pelo seu URL)
git remote add origin https://github.com/SEU_UTILIZADOR/mutikukwama-saude.git

# 6. Enviar para o GitHub
git push -u origin main
```

---

### 2. Implementação (Deploy) na Vercel

O projeto já inclui o ficheiro `vercel.json` e as funções serverless em `/api`:

1. Aceda a [vercel.com](https://vercel.com) e inicie sessão com o seu GitHub.
2. Clique em **"Add New..."** > **"Project"**.
3. Importe o repositório `mutikukwama-saude`.
4. Configure os parâmetros do projeto (a Vercel detecta automaticamente):
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Em **Environment Variables**, adicione as seguintes variáveis:
   - `GEMINI_API_KEY`: A sua chave da API do Google Gemini (para leitura de receitas médicas).
6. Clique em **"Deploy"**.
7. Em menos de 2 minutos a sua aplicação estará online com HTTPS gratuito!

---

## 🗄️ Configuração da Base de Dados

### A. Firebase Cloud Firestore (Ativo e Configurado)
- **Projeto Firebase**: `tranquil-sanctum-9xfhk`
- **ID da Base de Dados Firestore**: `ai-studio-mutikukwamasade-5981b530-4437-4267-9b1e-89833b874942`
- **Configuração**: `firebase-applet-config.json`
- **Plano de Dados (Blueprint)**: `firebase-blueprint.json`
- **Regras de Segurança**: `firestore.rules` (implementadas e implantadas)
- **Serviço**: `src/services/firebase.ts`

### B. PostgreSQL / Supabase (Opcional para Migração Relacional)
Se desejar utilizar uma instância PostgreSQL ou Supabase dedicada, o script SQL completo com tabelas, enumerações, RLS (Row Level Security) e triggers encontra-se em:
- `src/services/sqlSchema.ts`

---

## 💻 Executar Localmente

```bash
# Instalar dependências
npm install

# Iniciar em modo de desenvolvimento
npm run dev

# Compilar para produção
npm run build

# Iniciar servidor de produção local
npm start
```

---

## 🛡️ Principais Funcionalidades
- 🔍 **Pesquisa Inteligente & Geolocalização**: Busca rápida por farmácias e medicamentos com cálculo de distância Haversine em tempo real.
- 📸 **Digitalização de Receitas com IA**: Extração automática de medicamentos, dosagens e exames através do Gemini Vision.
- 📦 **Canal Grossista B2B**: Módulo exclusivo para fornecimento e encomendas entre depósitos grossistas e farmácias.
- 📢 **Comunicados Oficiais MINSA**: Publicação institucional com certidões homologadas e anexos para download em PDF/Word.
- 🌟 **Planos de Subscrição com Regras de Quota**: Limites e prioridades automáticas (Avançado, Médio e Básico).
