import { useState, useEffect, useRef, useCallback } from 'react'
import { useConnectionStore } from '@/store/connectionStore'
import { useAISettingsStore } from '@/store/aiSettingsStore'
import { databaseService } from '@/services/database.service'
import { aiService } from '@/services/ai.service'
import { useToast } from '@/components/common/Toast'

export type ViewMode = 'table' | 'json' | 'tree'

export function useDataViewer() {
  const { activeConnectionId, selectedDatabase, selectedCollection, getActiveConnection } = useConnectionStore()
  const { models, selectedModelId, selectModel } = useAISettingsStore()
  const tt = useToast()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [editDoc, setEditDoc] = useState<{ mode: 'edit' | 'insert'; doc: any } | null>(null)
  const [editDocValue, setEditDocValue] = useState('')
  const [filter, setFilter] = useState('{}')
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(50)
  const [sort, setSort] = useState<any>({})
  const [sortField, setSortField] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<1 | -1>(1)
  const [totalCount, setTotalCount] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [goToPage, setGoToPage] = useState('')
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set())
  const [selectedDocsData, setSelectedDocsData] = useState<Map<string, any>>(new Map())
  const [showDiff, setShowDiff] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showFilter, setShowFilter] = useState(false)

  const activeConnection = getActiveConnection()
  const dbType = activeConnection?.type || 'mongodb'
  const isRedis = dbType === 'redis'
  const isKafka = dbType === 'kafka'
  const loadRequestRef = useRef(0)
  const totalPages = Math.max(1, Math.ceil(totalCount / limit))

  const loadDocuments = useCallback(async (customFilter?: string, customOptions?: { limit?: number; sort?: any }) => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection) return
    const currentRequestId = ++loadRequestRef.current
    try {
      setLoading(true)
      let filterObj = {}
      try {
        filterObj = JSON.parse(customFilter !== undefined ? customFilter : filter)
      } catch { /* invalid filter */ }

      const queryLimit = customOptions?.limit !== undefined ? customOptions.limit : limit
      const querySort = customOptions?.sort !== undefined ? customOptions.sort : sort
      const querySkip = (customOptions as any)?.skip !== undefined ? (customOptions as any).skip : (page * queryLimit)

      const result = await databaseService.executeQuery(
        activeConnectionId, selectedDatabase, selectedCollection,
        filterObj, { skip: querySkip, limit: queryLimit, sort: querySort }
      )
      if (currentRequestId !== loadRequestRef.current) return
      if (result.success) {
        setDocuments(result.documents || [])
        setTotalCount(result.totalCount || 0)
      } else {
        tt.error('Failed to load documents: ' + result.error)
      }
    } catch (error: any) {
      if (currentRequestId !== loadRequestRef.current) return
      tt.error('Load documents error: ' + (error.message || 'Unknown error'))
    } finally {
      if (currentRequestId === loadRequestRef.current) setLoading(false)
    }
  }, [activeConnectionId, selectedDatabase, selectedCollection, filter, limit, sort, page, tt])

  useEffect(() => {
    if (activeConnectionId && selectedDatabase && selectedCollection && !isRedis && !isKafka) {
      loadDocuments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConnectionId, selectedDatabase, selectedCollection, page, isRedis, isKafka])

  const buildRowFilter = useCallback((doc: any) => {
    if (dbType !== 'postgresql') return { _id: doc._id }
    if (doc.id !== undefined) return { id: doc.id }
    const f: Record<string, any> = {}
    for (const [key, val] of Object.entries(doc)) {
      if (val !== null && val !== undefined && typeof val !== 'object') f[key] = val
    }
    return f
  }, [dbType])

  const handleToggleSelect = useCallback((rowKey: string, doc: any) => {
    setSelectedDocs(prev => {
      const next = new Set(prev)
      if (next.has(rowKey)) {
        next.delete(rowKey)
        setSelectedDocsData(prevData => { const d = new Map(prevData); d.delete(rowKey); return d })
      } else {
        if (next.size >= 2) { tt.warning('Select at most 2 documents to compare'); return prev }
        next.add(rowKey)
        setSelectedDocsData(prevData => new Map(prevData).set(rowKey, doc))
      }
      return next
    })
  }, [tt])

  const handleCompare = useCallback(() => {
    if (selectedDocs.size !== 2) { tt.warning('Select exactly 2 documents to compare'); return }
    setShowDiff(true)
  }, [selectedDocs.size, tt])

  const handleEdit = useCallback((doc: any) => {
    const docForEdit = { ...doc }
    if (docForEdit._id && typeof docForEdit._id === 'object' && docForEdit._id.buffer) {
      const bufferArray = Object.values(docForEdit._id.buffer) as number[]
      docForEdit._id = bufferArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }
    setEditDoc({ mode: 'edit', doc: docForEdit })
    setEditDocValue(JSON.stringify(docForEdit, null, 2))
  }, [])

  const handleUpdate = useCallback(async (oldDoc: any, newDoc: any) => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection) return
    try {
      const f = buildRowFilter(oldDoc)
      const result = await databaseService.updateDocument(activeConnectionId, selectedDatabase, selectedCollection, f, newDoc)
      if (result.success) { tt.success('Document updated!'); loadDocuments() }
      else { tt.error('Update failed: ' + result.error) }
    } catch (error) { tt.error('Update error: ' + error) }
  }, [activeConnectionId, selectedDatabase, selectedCollection, buildRowFilter, loadDocuments, tt])

  const handleDelete = useCallback((doc: any) => {
    tt.confirm('Are you sure you want to delete this document?', async () => {
      if (!activeConnectionId || !selectedDatabase || !selectedCollection) return
      try {
        const f = buildRowFilter(doc)
        const result = await databaseService.deleteDocument(activeConnectionId, selectedDatabase, selectedCollection, f)
        if (result.success) { tt.success('Document deleted!'); loadDocuments() }
        else { tt.error('Delete failed: ' + result.error) }
      } catch (error: any) { tt.error('Delete error: ' + error.message) }
    })
  }, [activeConnectionId, selectedDatabase, selectedCollection, buildRowFilter, loadDocuments, tt])

  const handleInsert = useCallback(() => {
    setEditDoc({ mode: 'insert', doc: {} })
    setEditDocValue('{\n  \n}')
  }, [])

  const insertDocument = useCallback(async (doc: any) => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection) return
    try {
      const result = await databaseService.insertDocument(activeConnectionId, selectedDatabase, selectedCollection, doc)
      if (result.success) { tt.success('Document inserted!'); loadDocuments() }
      else { tt.error('Insert failed: ' + result.error) }
    } catch { /* silent */ }
  }, [activeConnectionId, selectedDatabase, selectedCollection, loadDocuments, tt])

  const handleAiQuery = useCallback(async () => {
    if (!naturalLanguageQuery.trim()) { tt.warning('Please enter a query'); return }
    const selectedModel = models.find((m) => m.id === selectedModelId)
    if (!selectedModel) { tt.warning('Please select an AI model in settings'); return }
    setAiLoading(true)
    try {
      let sampleDoc = documents.length > 0 ? documents[0] : undefined
      if (!sampleDoc) {
        const sampleResult = await databaseService.executeQuery(activeConnectionId!, selectedDatabase!, selectedCollection!, {}, { limit: 1 })
        if (sampleResult.success && sampleResult.documents?.length > 0) sampleDoc = sampleResult.documents[0]
      }
      const allFields = new Set<string>()
      documents.forEach((doc) => Object.keys(doc).forEach((key) => allFields.add(key)))
      if (sampleDoc) Object.keys(sampleDoc).forEach((key) => allFields.add(key))
      const result = await aiService.convertNaturalLanguageToQuery(
        { query: naturalLanguageQuery, collectionSchema: sampleDoc, availableFields: Array.from(allFields) },
        selectedModel
      )
      if (result.success && result.mongoQuery) {
        const queryString = JSON.stringify(result.mongoQuery)
        setFilter(queryString)
        setPage(0)
        if (result.options?.limit) setLimit(result.options.limit)
        if (result.options?.sort) setSort(result.options.sort)
        await loadDocuments(queryString, result.options)
      } else {
        tt.error('AI Query Error: ' + (result.error || 'Unknown error'))
      }
    } catch (error: any) {
      tt.error('Error: ' + error.message)
    } finally {
      setAiLoading(false)
    }
  }, [naturalLanguageQuery, models, selectedModelId, documents, activeConnectionId, selectedDatabase, selectedCollection, loadDocuments, tt])

  const handleExportJSON = useCallback(async () => {
    if (!documents.length && totalCount === 0) { tt.warning('No data to export'); return }
    let exportDocs = documents
    if (totalCount > documents.length) {
      const fetchAll = await new Promise<boolean>((resolve) => {
        tt.confirm(`Export all ${totalCount} documents? (Current page has ${documents.length})`, () => resolve(true), () => resolve(false))
      })
      if (fetchAll) {
        try {
          const allResult = await databaseService.executeQuery(activeConnectionId!, selectedDatabase!, selectedCollection!, JSON.parse(filter || '{}'), { limit: 50000, sort })
          if (allResult.success && allResult.documents) exportDocs = allResult.documents
        } catch { /* use current page */ }
      }
    }
    const content = JSON.stringify(exportDocs, null, 2)
    const res = await window.electronAPI.dialog.showSaveDialog({
      defaultPath: `${selectedCollection}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (!res.canceled && res.filePath) {
      await window.electronAPI.fs.writeFile(res.filePath, content)
      tt.success(`Exported ${exportDocs.length} documents`)
    }
  }, [documents, totalCount, activeConnectionId, selectedDatabase, selectedCollection, filter, sort, tt])

  const handleExportCSV = useCallback(async () => {
    if (!documents.length && totalCount === 0) { tt.warning('No data to export'); return }
    let exportDocs = documents
    if (totalCount > documents.length) {
      const fetchAll = await new Promise<boolean>((resolve) => {
        tt.confirm(`Export all ${totalCount} documents as CSV? (Current page has ${documents.length})`, () => resolve(true), () => resolve(false))
      })
      if (fetchAll) {
        try {
          const allResult = await databaseService.executeQuery(activeConnectionId!, selectedDatabase!, selectedCollection!, JSON.parse(filter || '{}'), { limit: 50000, sort })
          if (allResult.success && allResult.documents) exportDocs = allResult.documents
        } catch { /* use current page */ }
      }
    }
    const keys = [...new Set(exportDocs.flatMap(d => Object.keys(d)))]
    const esc = (v: any) => { const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s }
    const csv = [keys.join(','), ...exportDocs.map(row => keys.map(k => esc(row[k])).join(','))].join('\n')
    const res = await window.electronAPI.dialog.showSaveDialog({
      defaultPath: `${selectedCollection}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (!res.canceled && res.filePath) {
      await window.electronAPI.fs.writeFile(res.filePath, csv)
      tt.success(`Exported ${exportDocs.length} documents`)
    }
  }, [documents, totalCount, activeConnectionId, selectedDatabase, selectedCollection, filter, sort, tt])

  const handleSort = useCallback((field: string, dir: 1 | -1) => {
    setSortField(field)
    setSortDirection(dir)
    const newSort = { [field]: dir }
    setSort(newSort)
    setPage(0)
    loadDocuments(undefined, { sort: newSort })
  }, [loadDocuments])

  const handlePageChange = useCallback((newPage: number) => setPage(newPage), [])

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit)
    setPage(0)
    loadDocuments(undefined, { limit: newLimit, sort })
  }, [loadDocuments, sort])

  const clearSelection = useCallback(() => {
    setSelectedDocs(new Set())
    setSelectedDocsData(new Map())
  }, [])

  return {
    // Connection info
    activeConnectionId, selectedDatabase, selectedCollection, dbType, isRedis, isKafka,
    // Data
    documents, loading, totalCount, totalPages,
    // Pagination
    page, limit, goToPage, setGoToPage, handlePageChange, handleLimitChange,
    // Sort
    sortField, sortDirection, sort, handleSort,
    // Filter
    filter, setFilter, showFilter, setShowFilter,
    // View
    viewMode, setViewMode,
    // Edit
    editDoc, setEditDoc, editDocValue, setEditDocValue, handleEdit, handleUpdate, handleDelete, handleInsert, insertDocument,
    // Selection & Diff
    selectedDocs, selectedDocsData, handleToggleSelect, handleCompare, clearSelection, showDiff, setShowDiff,
    // Batch
    showBatch, setShowBatch,
    // AI
    showAI, setShowAI, naturalLanguageQuery, setNaturalLanguageQuery, aiLoading, handleAiQuery, models, selectedModelId, selectModel,
    // Export
    handleExportJSON, handleExportCSV,
    // Misc
    loadDocuments, tt,
  }
}
