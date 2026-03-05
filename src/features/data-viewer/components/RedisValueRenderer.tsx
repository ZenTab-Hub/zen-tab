import { memo } from 'react'
import { X, Layers } from 'lucide-react'

interface Props {
  keyData: any
  onRemoveItem: (field: string, index?: number) => void
  onStreamDelete: (entryId: string) => void
}

export const RedisValueRenderer = memo(({ keyData, onRemoveItem, onStreamDelete }: Props) => {
  if (!keyData) return null
  const { type, value } = keyData

  if (type === 'string') {
    try {
      const parsed = JSON.parse(value)
      return <pre className="text-[11px] font-mono whitespace-pre-wrap break-all">{JSON.stringify(parsed, null, 2)}</pre>
    } catch {
      return <pre className="text-[11px] font-mono whitespace-pre-wrap break-all">{value}</pre>
    }
  }

  if (type === 'hash') {
    return (
      <div className="space-y-0.5">
        {Object.entries(value || {}).map(([k, v]) => (
          <div key={k} className="group flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/30 text-[11px] font-mono">
            <span className="text-blue-400 shrink-0 min-w-[100px]">{k}</span>
            <span className="text-muted-foreground">→</span>
            <span className="break-all flex-1">{String(v)}</span>
            <button onClick={() => onRemoveItem(k)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 text-destructive transition-opacity" title="Remove field">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'list' || type === 'set') {
    return (
      <div className="space-y-0.5">
        {(value || []).map((item: any, i: number) => (
          <div key={`${i}-${item}`} className="group flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/30 text-[11px] font-mono">
            <span className="text-muted-foreground shrink-0 w-8 text-right">{i}</span>
            <span className="break-all flex-1">{String(item)}</span>
            <button onClick={() => onRemoveItem(String(item), i)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 text-destructive transition-opacity" title="Remove item">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'zset') {
    const pairs: Array<{ member: string; score: string }> = []
    for (let i = 0; i < (value || []).length; i += 2) {
      pairs.push({ member: value[i], score: value[i + 1] })
    }
    return (
      <div className="space-y-0.5">
        {pairs.map((p) => (
          <div key={p.member} className="group flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/30 text-[11px] font-mono">
            <span className="text-pink-400 shrink-0 w-16 text-right">{p.score}</span>
            <span className="text-muted-foreground">→</span>
            <span className="break-all flex-1">{p.member}</span>
            <button onClick={() => onRemoveItem(p.member)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 text-destructive transition-opacity" title="Remove member">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'stream') {
    const entries = value?.entries || []
    const length = value?.length ?? entries.length
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2 text-[10px] text-muted-foreground">
          <Layers className="h-3 w-3" />
          <span>{length} entries total</span>
          {entries.length < length && <span>(showing latest {entries.length})</span>}
        </div>
        {entries.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">Stream is empty</p>
        ) : (
          entries.map((entry: { id: string; fields: Record<string, string> }) => (
            <div key={entry.id} className="group rounded-md border bg-muted/20 p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-cyan-400 font-medium">{entry.id}</span>
                <button onClick={() => onStreamDelete(entry.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 text-destructive transition-opacity" title="Delete entry">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-0.5">
                {Object.entries(entry.fields).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-[11px] font-mono pl-2">
                    <span className="text-blue-400 shrink-0 min-w-[80px]">{k}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="break-all flex-1">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  return <pre className="text-[11px] font-mono">{JSON.stringify(value, null, 2)}</pre>
})
RedisValueRenderer.displayName = 'RedisValueRenderer'
