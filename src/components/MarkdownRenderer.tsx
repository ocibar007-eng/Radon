import React from 'react';

interface Props {
  content: string;
  variant?: 'clinical' | 'verbatim';
}

export const MarkdownRenderer: React.FC<Props> = ({ content, variant = 'clinical' }) => {
  // Simple regex to bold headers if they are not properly parsed (fallback)
  // But strictly, we rely on CSS classes.

  return (
    <div className={`markdown-content markdown-${variant}`}>
      {/* 
        In a real production app, we would use 'react-markdown' or 'marked'.
        Since we are using raw string rendering per instructions, we map 
        markdown symbols to HTML loosely or just display pre-wrap if verbatim.
        
        For 'clinical', we assume the LLM outputs clear paragraphs and bullets.
        We will do a very simple parse to wrap headers and lists for CSS targeting.
      */}

      {variant === 'verbatim' ? (
        <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
      ) : (
        <SimpleMarkdownParser content={content} />
      )}
    </div>
  );
};

// A very lightweight parser to enable the CSS targeting we designed
const SimpleMarkdownParser: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let listBuffer: React.ReactNode[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(<ul key={`ul-${elements.length}`}>{listBuffer}</ul>);
      listBuffer = [];
    }
  };

  // Highlights específicos solicitados pelo usuário
  const highlightTerms = (text: string): React.ReactNode[] => {
    // Regex para capturar chaves comuns de laudo + valor, ou apenas a chave
    // Ex: "Contraste:", "Cirurgias Prévias:"
    // A regex varre o texto e separa.
    const regex = /(Contraste:|Cirurgias? Prévias?|Alergias?|Medicações?|Histórico Familiar?|Indicação:?|Técnica:?)/gi;

    // Split inclusivo (mantém os termos)
    const parts = text.split(regex);

    return parts.map((part, i) => {
      // Se for um dos termos chave, aplica o highlight
      if (regex.test(part)) {
        // Regex.test avança o índice se for global, cuidado. Melhor checking string match simples ou resetar lastIndex se for complexo.
        // Como split já separou, basta verificar se "soa" como um termo.
        return <strong key={i} className="term-highlight">{part}</strong>;
      }

      // Processa bold normal (**texto**) dentro do resto
      const boldParts = part.split(/(\*\*.*?\*\*)/g);
      return (
        <React.Fragment key={i}>
          {boldParts.map((subPart, j) => {
            if (subPart.startsWith('**') && subPart.endsWith('**')) {
              return <strong key={j}>{subPart.slice(2, -2)}</strong>;
            }
            return subPart;
          })}
        </React.Fragment>
      );
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith('###')) {
      flushList();
      elements.push(<h3 key={idx}>{trimmed.replace(/^###\s*/, '')}</h3>);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const text = trimmed.substring(2);
      listBuffer.push(<li key={idx}>{highlightTerms(text)}</li>);
    } else {
      flushList();
      elements.push(<p key={idx}>{highlightTerms(trimmed)}</p>);
    }
  });

  flushList();

  return <>{elements}</>;
};
