'use client';

import { useState, useMemo } from 'react';
import treesData from '@/data/decision-trees.json';

// ── Types ────────────────────────────────────────────────────────────────────

interface TreeOption {
  label: string;
  next: string;
}

interface TreeNode {
  id: string;
  question?: string;
  recommendation?: string;
  options?: TreeOption[];
}

interface TreeDefinition {
  title: string;
  nodes: Record<string, TreeNode>;
}

interface DecisionTreeProps {
  treeId: string;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const breadcrumbContainer: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center',
  marginBottom: '1rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
  color: 'var(--color-slate-500)',
};

const breadcrumbItem: React.CSSProperties = {
  padding: '0.2rem 0.5rem', borderRadius: '4px',
  background: 'var(--color-slate-50)', cursor: 'pointer',
  transition: 'background .15s',
};

const breadcrumbSep: React.CSSProperties = {
  color: 'var(--color-slate-500)', margin: '0 0.1rem',
};

const questionBox: React.CSSProperties = {
  padding: '1.25rem', borderRadius: '12px',
  border: '1px solid var(--color-slate-200)', background: '#fff',
  marginBottom: '1rem',
};

const questionText: React.CSSProperties = {
  fontFamily: 'var(--font-display)', fontSize: '1rem',
  fontWeight: 700, color: 'var(--color-navy-900)',
  lineHeight: 1.5, marginBottom: '1rem',
};

const optionBtn: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '0.65rem 1rem', borderRadius: '8px',
  border: '1px solid var(--color-slate-200)', background: 'var(--color-slate-50)',
  fontSize: '0.875rem', color: 'var(--color-navy-900)',
  cursor: 'pointer', marginBottom: '0.5rem',
  transition: 'border-color .15s, background .15s',
  fontFamily: 'inherit',
};

const recommendationBox: React.CSSProperties = {
  padding: '1.25rem', borderRadius: '12px',
  border: '1.5px solid #99f6e4', background: '#f0fdfa',
  marginBottom: '1rem',
};

const recommendationLabel: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' as const,
  letterSpacing: '0.05em', color: 'var(--color-teal-600)',
  fontFamily: 'var(--font-mono)', marginBottom: '0.5rem',
};

const recommendationText: React.CSSProperties = {
  fontSize: '0.9rem', color: 'var(--color-navy-900)',
  lineHeight: 1.6,
};

const navBtn: React.CSSProperties = {
  padding: '0.4rem 1rem', borderRadius: '8px',
  border: '1px solid var(--color-slate-200)', background: '#fff',
  fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-slate-500)',
  cursor: 'pointer', transition: 'background .15s',
};

const startOverBtn: React.CSSProperties = {
  padding: '0.4rem 1rem', borderRadius: '8px', border: 'none',
  background: 'var(--color-teal-600)', color: '#fff',
  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function DecisionTree({ treeId }: DecisionTreeProps) {
  const tree = (treesData as Record<string, TreeDefinition>)[treeId];
  const [path, setPath] = useState<string[]>(['start']);

  const currentNodeId = path[path.length - 1];
  const currentNode = tree?.nodes[currentNodeId];

  const breadcrumbLabels = useMemo(() => {
    if (!tree) return [];
    return path.map((nodeId, i) => {
      if (i === 0) return 'Start';
      // Find the option from the previous node that led here
      const prevNode = tree.nodes[path[i - 1]];
      const opt = prevNode?.options?.find(o => o.next === nodeId);
      return opt?.label ?? nodeId;
    });
  }, [path, tree]);

  if (!tree) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-slate-500)', fontSize: '0.875rem' }}>
        Decision tree &quot;{treeId}&quot; not found.
      </div>
    );
  }

  if (!currentNode) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626', fontSize: '0.875rem' }}>
        Node &quot;{currentNodeId}&quot; not found in tree.
      </div>
    );
  }

  function goBack() {
    if (path.length > 1) setPath(p => p.slice(0, -1));
  }

  function startOver() {
    setPath(['start']);
  }

  function selectOption(next: string) {
    setPath(p => [...p, next]);
  }

  function jumpTo(index: number) {
    if (index < path.length - 1) {
      setPath(p => p.slice(0, index + 1));
    }
  }

  const isLeaf = !!currentNode.recommendation;

  return (
    <div style={{ maxWidth: '700px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-navy-900)', fontSize: '1.125rem', marginBottom: '0.75rem' }}>
        {tree.title}
      </h3>

      {/* ── Breadcrumbs ───────────────────────────────────────────── */}
      {path.length > 1 && (
        <div style={breadcrumbContainer}>
          {breadcrumbLabels.map((label, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
              {i > 0 && <span style={breadcrumbSep}>&rarr;</span>}
              <span
                style={{
                  ...breadcrumbItem,
                  fontWeight: i === path.length - 1 ? 700 : 400,
                  color: i === path.length - 1 ? 'var(--color-teal-600)' : 'var(--color-slate-500)',
                  cursor: i < path.length - 1 ? 'pointer' : 'default',
                }}
                onClick={() => jumpTo(i)}
              >
                {label.length > 40 ? label.slice(0, 37) + '...' : label}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* ── Question node ─────────────────────────────────────────── */}
      {!isLeaf && currentNode.question && (
        <div style={questionBox}>
          <div style={questionText}>{currentNode.question}</div>
          {currentNode.options?.map(opt => (
            <button
              key={opt.next}
              type="button"
              style={optionBtn}
              onClick={() => selectOption(opt.next)}
              onMouseEnter={e => {
                (e.target as HTMLButtonElement).style.borderColor = 'var(--color-teal-600)';
                (e.target as HTMLButtonElement).style.background = '#f0fdfa';
              }}
              onMouseLeave={e => {
                (e.target as HTMLButtonElement).style.borderColor = 'var(--color-slate-200)';
                (e.target as HTMLButtonElement).style.background = 'var(--color-slate-50)';
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Recommendation (leaf) ─────────────────────────────────── */}
      {isLeaf && (
        <div style={recommendationBox}>
          <div style={recommendationLabel}>Recommendation</div>
          <div style={recommendationText}>{currentNode.recommendation}</div>
        </div>
      )}

      {/* ── Navigation buttons ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {path.length > 1 && (
          <button type="button" onClick={goBack} style={navBtn}>
            Back
          </button>
        )}
        {path.length > 1 && (
          <button type="button" onClick={startOver} style={startOverBtn}>
            Start Over
          </button>
        )}
      </div>
    </div>
  );
}
