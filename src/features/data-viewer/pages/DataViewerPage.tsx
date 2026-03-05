import { RefreshCw, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Table, FileJson, GitBranch, Sparkles, Download, X, FileSpreadsheet, GitCompareArrows, Layers, Filter } from 'lucide-react'
import { Input } from '@/components/common/Input'
import { DocumentTable } from '../components/DocumentTable'
import { DiffViewer } from '../components/DiffViewer'
import { BatchOperations } from '../components/BatchOperations'
import { RedisKeyViewer } from '../components/RedisKeyViewer'
import { KafkaMessageViewer } from '../components/KafkaMessageViewer'
import { SQLRowEditorModal } from '../components/SQLRowEditorModal'
import { JSONTreeView } from '@/components/common/JSONTreeView'
import { TableSkeleton } from '@/components/common/Skeleton'
import { useDataViewer } from '../hooks/useDataViewer'

export const DataViewerPage = () => {
  const vm = useDataViewer()

  if (vm.isRedis) return <RedisKeyViewer />
  if (vm.isKafka) return <KafkaMessageViewer />

  if (!vm.activeConnectionId || !vm.selectedDatabase || !vm.selectedCollection) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold">Data Viewer</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Browse and edit records</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Table className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Select a database and table/collection from the sidebar</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border mb-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Table className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold truncate">{vm.selectedCollection}</span>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {vm.totalCount.toLocaleString()} {vm.totalCount === 1 ? 'record' : 'records'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-muted/50 rounded-md p-0.5 mr-1">
            {(['table', 'json', 'tree'] as const).map((mode) => {
              const Icon = mode === 'table' ? Table : mode === 'json' ? FileJson : GitBranch
              return (
                <button key={mode} onClick={() => vm.setViewMode(mode)}
                  className={`p-1.5 rounded transition-colors ${vm.viewMode === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} View`}>
                  <Icon className="h-3.5 w-3.5" />
                </button>
              )
            })}
          </div>

          {vm.selectedDocs.size > 0 && (
            <>
              <button onClick={vm.handleCompare} disabled={vm.selectedDocs.size !== 2}
                className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50">
                <GitCompareArrows className="h-3.5 w-3.5" /> Compare ({vm.selectedDocs.size}/2)
              </button>
              <button onClick={vm.clearSelection} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors" title="Clear selection">
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          <div className="w-px h-5 bg-border mx-0.5" />

          <button onClick={() => vm.setShowFilter(!vm.showFilter)}
            className={`p-1.5 rounded-md transition-colors ${vm.showFilter ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`} title="Filter">
            <Filter className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => vm.setShowAI(!vm.showAI)}
            className={`p-1.5 rounded-md transition-colors ${vm.showAI ? 'bg-purple-500/15 text-purple-400' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`} title="AI Query">
            <Sparkles className="h-3.5 w-3.5" />
          </button>

          <div className="w-px h-5 bg-border mx-0.5" />

          <button onClick={() => vm.setShowBatch(true)} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Batch Operations">
            <Layers className="h-3.5 w-3.5" />
          </button>
          <button onClick={vm.handleInsert} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Insert Document">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button onClick={vm.handleExportJSON} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Export JSON">
            <Download className="h-3.5 w-3.5" />
          </button>
          <button onClick={vm.handleExportCSV} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Export CSV">
            <FileSpreadsheet className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => vm.loadDocuments()} disabled={vm.loading}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50" title="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${vm.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Collapsible Filter Bar */}
      {vm.showFilter && (
        <div className="flex gap-1.5 items-center py-2 border-b border-border animate-in slide-in-from-top-1 duration-150">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input placeholder='Filter (JSON): {"name": "John", "age": {"$gt": 25}}'
            value={vm.filter} onChange={(e) => vm.setFilter(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { vm.handlePageChange(0); vm.loadDocuments() } }}
            className="flex-1 text-xs h-8 font-mono" />
          <button onClick={() => { vm.handlePageChange(0); vm.loadDocuments() }}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0">
            Apply
          </button>
          {vm.filter !== '{}' && (
            <button onClick={() => { vm.setFilter('{}'); vm.handlePageChange(0); vm.loadDocuments('{}') }}
              className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
              Reset
            </button>
          )}
        </div>
      )}

      {/* Collapsible AI Query */}
      {vm.showAI && (
        <div className="py-2 border-b border-border space-y-2 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-medium text-purple-400">AI Query</span>
            </div>
            {vm.models.length > 0 && (
              <select value={vm.selectedModelId || ''} onChange={(e) => vm.selectModel(e.target.value)}
                className="px-2 py-1 rounded border bg-background text-xs">
                <option value="">Select Model</option>
                {vm.models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
              </select>
            )}
          </div>
          <div className="flex gap-1.5">
            <Input placeholder='e.g. "find users older than 25 sorted by name"'
              value={vm.naturalLanguageQuery} onChange={(e) => vm.setNaturalLanguageQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !vm.aiLoading) vm.handleAiQuery() }}
              className="flex-1 text-xs h-8" />
            <button onClick={vm.handleAiQuery} disabled={vm.aiLoading || !vm.selectedModelId}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 shrink-0">
              {vm.aiLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {vm.aiLoading ? 'Processing...' : 'Ask AI'}
            </button>
          </div>
          {vm.models.length === 0 && (
            <p className="text-[11px] text-muted-foreground">Add AI models in Settings (DeepSeek, OpenAI, Gemini, or Custom)</p>
          )}
        </div>
      )}

      {/* Data Content */}
      <div className="flex-1 overflow-auto mt-2 rounded-md border bg-card">
        {vm.loading ? (
          <TableSkeleton rows={12} columns={5} />
        ) : vm.viewMode === 'table' ? (
          <DocumentTable documents={vm.documents} onEdit={vm.handleEdit} onDelete={vm.handleDelete}
            sortField={vm.sortField} sortDirection={vm.sortDirection} onSort={vm.handleSort}
            selectedDocs={vm.selectedDocs} onToggleSelect={vm.handleToggleSelect} />
        ) : vm.viewMode === 'tree' ? (
          <div className="p-3"><JSONTreeView data={vm.documents} /></div>
        ) : (
          <pre className="overflow-auto p-4 text-xs font-mono leading-relaxed">{JSON.stringify(vm.documents, null, 2)}</pre>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2 border-t border-border mt-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {vm.totalCount > 0 ? (
              <>
                <span className="text-foreground font-medium">{(vm.page * vm.limit + 1).toLocaleString()}</span>
                <span> - </span>
                <span className="text-foreground font-medium">{Math.min((vm.page + 1) * vm.limit, vm.totalCount).toLocaleString()}</span>
                <span> of </span>
                <span className="text-foreground font-medium">{vm.totalCount.toLocaleString()}</span>
              </>
            ) : 'No records'}
          </span>
          <select value={vm.limit} onChange={e => vm.handleLimitChange(Number(e.target.value))}
            className="px-2 py-1 text-xs rounded border bg-background text-muted-foreground hover:text-foreground cursor-pointer">
            {[25, 50, 100, 250, 500].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => vm.handlePageChange(0)} disabled={vm.page === 0 || vm.loading}
            className="p-1.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30" title="First page">
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button onClick={() => vm.handlePageChange(Math.max(0, vm.page - 1))} disabled={vm.page === 0 || vm.loading}
            className="p-1.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30" title="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1 mx-1">
            <span className="text-xs text-muted-foreground">Page</span>
            <input value={vm.goToPage} onChange={e => vm.setGoToPage(e.target.value)} placeholder={`${vm.page + 1}`}
              onKeyDown={e => { if (e.key === 'Enter') { const p = parseInt(vm.goToPage); if (p >= 1 && p <= vm.totalPages) { vm.handlePageChange(p - 1); vm.setGoToPage('') } } }}
              className="w-12 px-1.5 py-1 text-xs text-center rounded border bg-background focus:border-primary focus:outline-none transition-colors" />
            <span className="text-xs text-muted-foreground">of {vm.totalPages.toLocaleString()}</span>
          </div>
          <button onClick={() => vm.handlePageChange(vm.page + 1)} disabled={(vm.page + 1) * vm.limit >= vm.totalCount || vm.loading}
            className="p-1.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30" title="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => vm.handlePageChange(Math.max(0, vm.totalPages - 1))} disabled={(vm.page + 1) * vm.limit >= vm.totalCount || vm.loading}
            className="p-1.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30" title="Last page">
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {vm.editDoc && vm.dbType === 'postgresql' && vm.activeConnectionId && vm.selectedDatabase && vm.selectedCollection && (
        <SQLRowEditorModal mode={vm.editDoc.mode} doc={vm.editDoc.doc}
          connectionId={vm.activeConnectionId} database={vm.selectedDatabase} table={vm.selectedCollection}
          onSave={(data) => { if (vm.editDoc!.mode === 'edit') vm.handleUpdate(vm.editDoc!.doc, data); else vm.insertDocument(data); vm.setEditDoc(null) }}
          onClose={() => vm.setEditDoc(null)} />
      )}
      {vm.editDoc && vm.dbType !== 'postgresql' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => vm.setEditDoc(null)} onKeyDown={(e) => { if (e.key === 'Escape') vm.setEditDoc(null) }}>
          <div className="bg-background border border-border rounded-lg w-[700px] max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">{vm.editDoc.mode === 'edit' ? 'Edit Document' : 'Insert Document'}</h3>
              <button onClick={() => vm.setEditDoc(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <textarea className="w-full h-[400px] bg-accent/30 border border-border rounded-md p-3 text-xs font-mono text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={vm.editDocValue} onChange={(e) => vm.setEditDocValue(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
              <button onClick={() => vm.setEditDoc(null)} className="px-3 py-1.5 text-xs rounded-md border border-input text-muted-foreground hover:bg-accent">Cancel</button>
              <button onClick={() => {
                try {
                  const parsed = JSON.parse(vm.editDocValue)
                  if (vm.editDoc!.mode === 'edit') {
                    const origDoc = vm.documents.find(d => {
                      const editId = vm.editDoc!.doc._id
                      const dId = d._id
                      if (typeof editId === 'string' && typeof dId === 'object' && dId.buffer) {
                        const bufArr = Object.values(dId.buffer) as number[]
                        return bufArr.map(b => b.toString(16).padStart(2, '0')).join('') === editId
                      }
                      return JSON.stringify(dId) === JSON.stringify(editId)
                    })
                    if (origDoc) vm.handleUpdate(origDoc, parsed)
                  } else {
                    vm.insertDocument(parsed)
                  }
                  vm.setEditDoc(null)
                } catch { vm.tt.error('Invalid JSON') }
              }} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                {vm.editDoc.mode === 'edit' ? 'Update' : 'Insert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {vm.showDiff && vm.selectedDocsData.size === 2 && (() => {
        const docs = Array.from(vm.selectedDocsData.values())
        return <DiffViewer left={docs[0]} right={docs[1]} onClose={() => vm.setShowDiff(false)} />
      })()}

      {vm.showBatch && (
        <BatchOperations connectionId={vm.activeConnectionId!} database={vm.selectedDatabase!}
          collection={vm.selectedCollection!} dbType={vm.dbType}
          onClose={() => vm.setShowBatch(false)} onSuccess={() => { vm.setShowBatch(false); vm.loadDocuments() }} />
      )}
    </div>
  )
}
