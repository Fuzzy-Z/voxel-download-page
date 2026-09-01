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

## 🌐 Deploy na Vercel

O projeto já inclui as configurações otimizadas em `vercel.json` e `package.json`.

### Opção 1: Via GitHub (Recomendado)
1. Faça o commit e push dos arquivos para o seu repositório:
   ```bash
   git add .
   git commit -m "feat: landing page voxel"
   git push origin main
   ```
2. Acesse o dashboard da [Vercel](https://vercel.com) e importe o repositório `Fuzzy-Z/voxel-download-page`.
3. O deploy será instantâneo e automático.

### Opção 2: Via Vercel CLI
```bash
npx vercel
```

## 📦 Estrutura do Projeto

```text
├── index.html               # Página principal estruturada e semântica
├── styles/
│   └── main.css             # Design system tátil, cores cruas e responsividade
├── scripts/
│   ├── voxel-canvas.js      # Motor 3D isométrico interativo para o hero
│   └── main.js              # Detecção automática de OS, atalhos e clipboard
├── vercel.json              # Headers de segurança e cache para Vercel
├── package.json             # Metadados e scripts de execução
├── LICENSE                  # Licença MIT
└── README.md
```
