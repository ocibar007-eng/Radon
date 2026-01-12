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
      // Bold handling inside list items: **text**
      const text = trimmed.substring(2);
      const parts = text.split(/(\*\*.*?\*\*)/g);
      const formattedText = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      listBuffer.push(<li key={idx}>{formattedText}</li>);
    } else {
      flushList();
      // Regular paragraph
       const parts = trimmed.split(/(\*\*.*?\*\*)/g);
      const formattedText = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      elements.push(<p key={idx}>{formattedText}</p>);
    }
  });
  
  flushList();

  return <>{elements}</>;
};
