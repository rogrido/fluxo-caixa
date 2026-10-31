tailwind.config = {
    theme: {
      extend: {
        colors: {
          ink: '#12232B',          // texto principal
          muted: '#5B6F78',        // texto de apoio
          canvas: '#F3F6F7',       // fundo da página
          line: '#DCE5E9',         // bordas dos painéis
          linesoft: '#E6EDF0',     // divisórias internas
          sidebar: '#0F4C5C',      // menu lateral (petróleo)
          sidebarhover: '#15616F',
          gold: '#0F4C5C',         // cor de ação (mantém o nome usado no código)
          goldlight: '#E3F3F6',
          gain: '#0B7285',         // ganhos (ciano de texto)
          gainbg: '#E3F3F6',
          cyan: '#14B5C9',         // ciano vivo: barras e destaques
          spend: '#4A5D66',        // gastos (cinza-azulado de texto)
          spendbg: '#EDF1F3',
          spendbar: '#9AAAB3',     // gastos nas barras
          loss: '#B5453F',         // só erros e exclusão
          lossbg: '#FBEAE9',
          alert: '#FCD34D',        // faixa de conferência
        },
        fontFamily: {
          display: ['IBM Plex Sans', 'sans-serif'],
          sans: ['IBM Plex Sans', 'sans-serif'],
        },
        boxShadow: {
          card: 'none',
          fab: '0 6px 16px -4px rgba(15,76,92,0.45)',
        }
      }
    }
  }
