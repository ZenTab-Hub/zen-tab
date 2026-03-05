import { Key, RefreshCw, Trash2, Clock, Copy, Edit, Save, X, Plus, HardDrive, Timer, CopyPlus } from 'lucide-react'
import { Input } from '@/components/common/Input'
import { formatBytes } from '@/utils/formatters'
import { TableSkeleton } from '@/components/common/Skeleton'
import { useRedisKey, formatTTL, KEY_TYPES } from '../hooks/useRedisKey'
import { RedisValueRenderer } from './RedisValueRenderer'

const TYPE_COLORS: Record<string, string> = {
  string: 'bg-green-500/15 text-green-400',
  hash: 'bg-blue-500/15 text-blue-400',
  list: 'bg-purple-500/15 text-purple-400',
  set: 'bg-amber-500/15 text-amber-400',
  zset: 'bg-pink-500/15 text-pink-400',
  stream: 'bg-cyan-500/15 text-cyan-400',
  unknown: 'bg-muted text-muted-foreground',
}

export const RedisKeyViewer = () => {
  const state = useRedisKey()
  const {
    keyData, loading, editing, editValue, editTTL, saving, memoryUsage, encoding,
    showAddForm, addField, addValue, addScore,
    creating, newKeyName, newKeyType, newKeyValue, newKeyTTL, creatingLoading,
    showTTLForm, quickTTL, showCopyForm, copyKeyName,
    showStreamAdd, streamFields,
    selectedDatabase, selectedCollection, setSelectedCollection,
    setEditing, setEditValue, setEditTTL,
    setShowAddForm, setAddField, setAddValue, setAddScore,
    setCreating, setNewKeyName, setNewKeyType, setNewKeyValue, setNewKeyTTL,
    setShowTTLForm, setQuickTTL, setShowCopyForm, setCopyKeyName,
    setShowStreamAdd, setStreamFields,
    loadKeyValue, startEditing, handleSave, handleDelete, copyValue,
    handleAddItem, handleRemoveItem, handleCreateKey,
    handleQuickTTL, handleCopyKey, handleStreamAdd, handleStreamDelete,
  } = state

  // Create new key form
  if (creating && !selectedCollection) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Create New Key</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{selectedDatabase}</p>
          </div>
          <button onClick={() => setCreating(false)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border hover:bg-accent transition-colors">
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </div>
        <div className="rounded-md border bg-card p-4 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Key Name</label>
            <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="my:key:name"
              className="w-full px-3 py-2 text-[12px] font-mono rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary" autoFocus />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Type</label>
            <div className="flex gap-1.5">
              {KEY_TYPES.map(t => (
                <button key={t} onClick={() => setNewKeyType(t)}
                  className={`px-3 py-1.5 text-[11px] font-medium rounded-md border transition-colors ${newKeyType === t ? TYPE_COLORS[t] + ' border-current' : 'hover:bg-accent'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
              Value {newKeyType === 'hash' && <span className="text-muted-foreground/60">(JSON object, e.g. {`{"field":"value"}`})</span>}
              {(newKeyType === 'list' || newKeyType === 'set') && <span className="text-muted-foreground/60">(JSON array or one item per line)</span>}
              {newKeyType === 'zset' && <span className="text-muted-foreground/60">(JSON array: ["member", score, ...])</span>}
            </label>
            <textarea value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)}
              placeholder={newKeyType === 'string' ? 'Enter value...' : newKeyType === 'hash' ? '{"field1": "value1", "field2": "value2"}' : newKeyType === 'zset' ? '["member1", 1, "member2", 2]' : '["item1", "item2", "item3"]'}
              className="w-full h-32 px-3 py-2 text-[12px] font-mono rounded-md border bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">TTL (seconds) <span className="text-muted-foreground/60">— leave empty for no expiry</span></label>
            <input value={newKeyTTL} onChange={e => setNewKeyTTL(e.target.value)} type="number" placeholder="No expiry"
              className="w-40 px-3 py-2 text-[12px] font-mono rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreateKey} disabled={creatingLoading || !newKeyName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" /> {creatingLoading ? 'Creating...' : 'Create Key'}
            </button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 text-[12px] font-medium rounded-md border hover:bg-accent transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (!selectedCollection) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Key className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-3">Select a key from the sidebar to view its value</p>
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mx-auto">
            <Plus className="h-3.5 w-3.5" /> Create New Key
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Key Viewer</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedDatabase} › <span className="font-mono">{selectedCollection}</span>
          </p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => { setCreating(true); setSelectedCollection(null) }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border border-primary/30 text-primary hover:bg-primary/10 transition-colors" title="Create new key">
            <Plus className="h-3.5 w-3.5" /> New Key
          </button>
          <button onClick={copyValue} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border hover:bg-accent transition-colors" title="Copy value">
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
          {!editing && (
            <button onClick={startEditing} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border hover:bg-accent transition-colors">
              <Edit className="h-3.5 w-3.5" /> Edit
            </button>
          )}
          <button onClick={handleDelete} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={loadKeyValue} disabled={loading} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border hover:bg-accent transition-colors disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Key Info Bar */}
      {keyData && (
        <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Key className="h-3 w-3 text-red-400" />
            <span className="text-[11px] font-mono font-medium">{keyData.key}</span>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLORS[keyData.type] || TYPE_COLORS.unknown}`}>
            {keyData.type}
          </span>
          {encoding && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground" title="Internal encoding">
              {encoding}
            </span>
          )}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>TTL: {formatTTL(keyData.ttl)}</span>
          </div>
          {memoryUsage !== null && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <HardDrive className="h-3 w-3" />
              <span>{formatBytes(memoryUsage)}</span>
            </div>
          )}
          {keyData.type === 'stream' && keyData.value && (
            <span className="text-[10px] text-muted-foreground">{keyData.value.length ?? 0} entries</span>
          )}
          {keyData.type !== 'string' && keyData.type !== 'stream' && keyData.value && (
            <span className="text-[10px] text-muted-foreground">
              {Array.isArray(keyData.value) ? `${keyData.value.length} items` : typeof keyData.value === 'object' ? `${Object.keys(keyData.value).length} fields` : ''}
            </span>
          )}
          <div className="flex-1" />
          <button onClick={() => { setShowTTLForm(!showTTLForm); setShowCopyForm(false) }}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border hover:bg-accent transition-colors" title="Set/Remove TTL">
            <Timer className="h-3 w-3" /> TTL
          </button>
          <button onClick={() => { setShowCopyForm(!showCopyForm); setShowTTLForm(false) }}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border hover:bg-accent transition-colors" title="Duplicate key">
            <CopyPlus className="h-3 w-3" /> Duplicate
          </button>
          {keyData.type !== 'string' && keyData.type !== 'stream' && (
            <button onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border hover:bg-accent transition-colors">
              <Plus className="h-3 w-3" /> Add Item
            </button>
          )}
          {keyData.type === 'stream' && (
            <button onClick={() => setShowStreamAdd(!showStreamAdd)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10 transition-colors">
              <Plus className="h-3 w-3" /> Add Entry
            </button>
          )}
        </div>
      )}

      {/* Inline Forms */}
      {showAddForm && keyData && keyData.type !== 'string' && (
        <div className="rounded-md border bg-card p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {keyData.type === 'hash' && (
              <input value={addField} onChange={e => setAddField(e.target.value)} placeholder="Field name"
                className="px-2 py-1.5 text-[11px] font-mono rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary w-40" />
            )}
            <input value={addValue} onChange={e => setAddValue(e.target.value)}
              placeholder={keyData.type === 'hash' ? 'Value' : keyData.type === 'zset' ? 'Member' : 'Item value'}
              className="px-2 py-1.5 text-[11px] font-mono rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary flex-1 min-w-[150px]" />
            {keyData.type === 'zset' && (
              <input value={addScore} onChange={e => setAddScore(e.target.value)} placeholder="Score" type="number"
                className="px-2 py-1.5 text-[11px] font-mono rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary w-24" />
            )}
            <button onClick={handleAddItem} className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-3 w-3" /> Add
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-2 py-1.5 text-[10px] rounded-md border hover:bg-accent transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {showTTLForm && keyData && (
        <div className="rounded-md border bg-card p-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium shrink-0">Set TTL:</span>
            <input value={quickTTL} onChange={e => setQuickTTL(e.target.value)} type="number" placeholder="seconds (0 = remove)"
              className="px-2 py-1.5 text-[11px] font-mono rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary w-40" autoFocus />
            <button onClick={handleQuickTTL} className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Timer className="h-3 w-3" /> Apply
            </button>
            <button onClick={() => { setShowTTLForm(false); setQuickTTL('') }} className="px-2 py-1.5 text-[10px] rounded-md border hover:bg-accent transition-colors">Cancel</button>
            <span className="text-[10px] text-muted-foreground ml-1">Enter 0 or leave empty to remove TTL</span>
          </div>
        </div>
      )}

      {showCopyForm && keyData && (
        <div className="rounded-md border bg-card p-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium shrink-0">Copy to:</span>
            <input value={copyKeyName} onChange={e => setCopyKeyName(e.target.value)} placeholder="new:key:name"
              className="px-2 py-1.5 text-[11px] font-mono rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary flex-1 min-w-[200px]" autoFocus />
            <button onClick={handleCopyKey} className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <CopyPlus className="h-3 w-3" /> Copy
            </button>
            <button onClick={() => { setShowCopyForm(false); setCopyKeyName('') }} className="px-2 py-1.5 text-[10px] rounded-md border hover:bg-accent transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {showStreamAdd && keyData && keyData.type === 'stream' && (
        <div className="rounded-md border border-cyan-500/20 bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium">Add Stream Entry</span>
            <div className="flex gap-1.5">
              <button onClick={handleStreamAdd} className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-md bg-cyan-600 text-white hover:bg-cyan-700 transition-colors">
                <Plus className="h-3 w-3" /> Add Entry
              </button>
              <button onClick={() => { setShowStreamAdd(false); setStreamFields([{ key: '', value: '' }]) }} className="px-2 py-1.5 text-[10px] rounded-md border hover:bg-accent transition-colors">Cancel</button>
            </div>
          </div>
          {streamFields.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={f.key} onChange={e => { const nf = [...streamFields]; nf[i] = { ...nf[i], key: e.target.value }; setStreamFields(nf) }}
                placeholder="Field name" className="px-2 py-1.5 text-[11px] font-mono rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary w-40" />
              <input value={f.value} onChange={e => { const nf = [...streamFields]; nf[i] = { ...nf[i], value: e.target.value }; setStreamFields(nf) }}
                placeholder="Value" className="px-2 py-1.5 text-[11px] font-mono rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary flex-1" />
              {streamFields.length > 1 && (
                <button onClick={() => setStreamFields(streamFields.filter((_, j) => j !== i))} className="p-1 rounded hover:bg-destructive/20 text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setStreamFields([...streamFields, { key: '', value: '' }])}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border border-dashed hover:bg-accent transition-colors w-full justify-center">
            <Plus className="h-3 w-3" /> Add Field
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto rounded-md border bg-card">
        {loading ? (
          <TableSkeleton rows={10} columns={3} />
        ) : editing ? (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold">Edit Value</span>
              <div className="flex gap-1.5">
                <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border hover:bg-accent transition-colors">
                  <X className="h-3 w-3" /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  <Save className="h-3 w-3" /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)}
              className="w-full h-64 p-2 text-[11px] font-mono rounded-md border bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary"
              spellCheck={false} />
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-muted-foreground">TTL (seconds):</label>
              <Input type="number" placeholder="No expiry" value={editTTL} onChange={(e) => setEditTTL(e.target.value)} className="w-32 text-[11px] h-7" />
            </div>
          </div>
        ) : keyData ? (
          <div className="p-3">
            <RedisValueRenderer keyData={keyData} onRemoveItem={handleRemoveItem} onStreamDelete={handleStreamDelete} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">Key not found</p>
          </div>
        )}
      </div>
    </div>
  )
}
