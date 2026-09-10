# Voxel — Landing Page & Download Portal

Landing page oficial para o **Voxel** — Motor volumétrico nativo bruto, sólido e de alto desempenho.

Desenvolvido com foco em estética monolítica/brutalista refinada: tipografia precisa, paleta de matérias cruas (concreto, latão, basalto, quartzo), zero neons espalhafatosos e um viewport interativo 3D em Canvas isométrico nativo.

## 🚀 Como testar localmente

Você pode abrir o arquivo `index.html` diretamente em qualquer navegador moderno, ou iniciar um servidor estático local:

```bash
# Com npx serve
npx serve .

# Ou com Python
python -m http.server 3000
```

## 🌐 Deploy

O deploy é automático via **GitHub Actions + FTPS**. Todo push na branch `main`
valida o projeto e publica no servidor. Também dá para disparar manualmente em
**Actions → Deploy → Run workflow** (com opção de *dry-run*, que lista o que
seria enviado sem enviar nada).

O workflow tem três etapas: `validate` (arquivos obrigatórios, referências de
assets e sintaxe do JS), `deploy` (envio incremental via FTPS — só sobem os
arquivos que mudaram) e `smoke-test` (confere se as rotas principais responderam
200 depois da publicação).

### Configuração inicial no GitHub

Em **Settings → Secrets and variables → Actions**, cadastre:

**Secrets** (obrigatórios):

| Secret | Valor |
| --- | --- |
| `FTP_SERVER` | Host do FTP, sem protocolo. Ex.: `ftp.seudominio.com` |
| `FTP_USERNAME` | Usuário do FTP |
| `FTP_PASSWORD` | Senha do FTP |

**Variables** (opcionais, com padrão):

| Variable | Padrão | Para que serve |
| --- | --- | --- |
| `FTP_SERVER_DIR` | `/public_html/` | Pasta de destino no servidor |
| `FTP_PORT` | `21` | Porta do FTPS |
| `SITE_URL` | — | Domínio público. Se definido, corrige o domínio em `robots.txt`/`sitemap.xml` no envio e habilita o smoke test |

> O job `deploy` usa o environment `production`. Se quiser exigir aprovação
> manual antes de cada publicação, configure em **Settings → Environments →
> production → Required reviewers**.

### Configuração do servidor

O arquivo `.htaccess` (Apache) substitui o que a Vercel fazia: rotas limpas
(`/obrigado`, `/admin`), os redirects de download e redes sociais, os headers de
segurança, compressão e as políticas de cache. Ele é enviado junto no deploy.

Dois pontos de atenção:

- O `.htaccess` força **HTTPS**. Se o domínio ainda não tiver certificado SSL,
  comente o bloco marcado no topo do arquivo — sem certificado, o site entra em
  loop de redirecionamento.
- O host precisa ter `mod_rewrite` e `mod_headers` habilitados (padrão em
  praticamente toda hospedagem cPanel).

### Saindo da Vercel

O `vercel.json` continua no repositório como referência e histórico, mas **não é
enviado no deploy** e não tem mais efeito. Para evitar que a Vercel continue
publicando em paralelo, desconecte o repositório no dashboard dela
(*Project → Settings → Git → Disconnect*).

### Ao lançar uma nova versão do Voxel

A URL do instalador está fixada em dois lugares e os dois precisam ser
atualizados juntos:

- `.htaccess` — os redirects `/baixar`, `/download` e `/setup.exe`
- `scripts/main.js` — a constante `currentDownloadUrl` (linha 35)

## 📦 Estrutura do Projeto

```text
├── index.html               # Página principal estruturada e semântica
├── obrigado.html            # Página de agradecimento / feedback
├── admin.html               # Console administrativo
├── 404.html                 # Página de erro
├── styles/
│   └── main.css             # Design system tátil, cores cruas e responsividade
├── scripts/
│   ├── voxel-canvas.js      # Motor 3D isométrico interativo para o hero
│   └── main.js              # Detecção automática de OS, atalhos e clipboard
├── .github/workflows/
│   └── deploy.yml           # Validação + deploy FTPS + smoke test
├── .htaccess                # Rotas, redirects, headers e cache (Apache)
├── robots.txt               # Diretivas de indexação
├── sitemap.xml              # Mapa do site
├── vercel.json              # Legado — não é mais usado no deploy
├── package.json             # Metadados e scripts de execução
├── LICENSE                  # Licença MIT
└── README.md
```
