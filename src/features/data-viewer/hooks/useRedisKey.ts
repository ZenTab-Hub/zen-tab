import { useState, useEffect, useRef, useCallback } from 'react'
import { useConnectionStore } from '@/store/connectionStore'
import { databaseService } from '@/services/database.service'
import { useToast } from '@/components/common/Toast'

const KEY_TYPES = ['string', 'hash', 'list', 'set', 'zset', 'stream'] as const
export type RedisKeyType = typeof KEY_TYPES[number]
export { KEY_TYPES }

export function useRedisKey() {
  const { activeConnectionId, selectedDatabase, selectedCollection, setSelectedCollection } = useConnectionStore()
  const tt = useToast()
  const [keyData, setKeyData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [editTTL, setEditTTL] = useState('')
  const [saving, setSaving] = useState(false)
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null)
  const [encoding, setEncoding] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addField, setAddField] = useState('')
  const [addValue, setAddValue] = useState('')
  const [addScore, setAddScore] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyType, setNewKeyType] = useState<RedisKeyType>('string')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [newKeyTTL, setNewKeyTTL] = useState('')
  const [creatingLoading, setCreatingLoading] = useState(false)
  const [showTTLForm, setShowTTLForm] = useState(false)
  const [quickTTL, setQuickTTL] = useState('')
  const [showCopyForm, setShowCopyForm] = useState(false)
  const [copyKeyName, setCopyKeyName] = useState('')
  const [showStreamAdd, setShowStreamAdd] = useState(false)
  const [streamFields, setStreamFields] = useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }])
  const loadRequestRef = useRef(0)

  const loadKeyValue = useCallback(async () => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection) return
    const currentRequestId = ++loadRequestRef.current
    try {
      setLoading(true)
      const result = await databaseService.redisGetKeyValue(activeConnectionId, selectedDatabase, selectedCollection)
      if (currentRequestId !== loadRequestRef.current) return
      if (result.success) {
        setKeyData(result)
        setEditing(false)
        setShowAddForm(false)
      }
      try {
        const [memResult, encResult] = await Promise.all([
          databaseService.redisMemoryUsage(activeConnectionId, selectedDatabase, selectedCollection),
          databaseService.redisGetKeyEncoding(activeConnectionId, selectedDatabase, selectedCollection),
        ])
        if (currentRequestId !== loadRequestRef.current) return
        setMemoryUsage(memResult.success ? memResult.bytes : null)
        setEncoding(encResult.success ? encResult.encoding : null)
      } catch { setMemoryUsage(null); setEncoding(null) }
    } catch {
      if (currentRequestId !== loadRequestRef.current) return
      setKeyData(null)
    } finally {
      if (currentRequestId === loadRequestRef.current) setLoading(false)
    }
  }, [activeConnectionId, selectedDatabase, selectedCollection])

  useEffect(() => {
    if (activeConnectionId && selectedDatabase && selectedCollection) {
      loadKeyValue()
    } else {
      setKeyData(null)
    }
  }, [activeConnectionId, selectedDatabase, selectedCollection, loadKeyValue])

  const startEditing = useCallback(() => {
    if (!keyData) return
    const val = keyData.type === 'string' ? (keyData.value || '') : JSON.stringify(keyData.value, null, 2)
    setEditValue(val)
    setEditTTL(keyData.ttl > 0 ? String(keyData.ttl) : '')
    setEditing(true)
  }, [keyData])

  const handleSave = useCallback(async () => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection || !keyData) return
    try {
      setSaving(true)
      let value: any = editValue
      if (keyData.type !== 'string') value = JSON.parse(editValue)
      const ttl = editTTL ? parseInt(editTTL) : undefined
      await databaseService.redisSetKey(activeConnectionId, selectedDatabase, selectedCollection, value, keyData.type, ttl)
      setEditing(false)
      await loadKeyValue()
    } catch (error: any) {
      tt.error('Save failed: ' + error.message)
    } finally {
      setSaving(false)
    }
  }, [activeConnectionId, selectedDatabase, selectedCollection, keyData, editValue, editTTL, loadKeyValue, tt])

  const handleDelete = useCallback(() => {
    tt.confirm(`Delete key "${selectedCollection}"?`, async () => {
      if (!activeConnectionId || !selectedDatabase || !selectedCollection) return
      try {
        await databaseService.redisDeleteKey(activeConnectionId, selectedDatabase, selectedCollection)
        tt.success('Key deleted!')
        setKeyData(null)
      } catch (error: any) {
        tt.error('Delete failed: ' + error.message)
      }
    })
  }, [activeConnectionId, selectedDatabase, selectedCollection, tt])

  const copyValue = useCallback(() => {
    if (!keyData) return
    const text = typeof keyData.value === 'string' ? keyData.value : JSON.stringify(keyData.value, null, 2)
    navigator.clipboard.writeText(text)
  }, [keyData])

  const handleAddItem = useCallback(async () => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection || !keyData) return
    try {
      const score = addScore ? Number.parseFloat(addScore) : undefined
      const r = await databaseService.redisAddItem(activeConnectionId, selectedDatabase, selectedCollection, keyData.type, addField, addValue, score)
      if (r.success) {
        tt.success('Item added')
        setAddField(''); setAddValue(''); setAddScore(''); setShowAddForm(false)
        await loadKeyValue()
      } else { tt.error(r.error) }
    } catch (e: any) { tt.error(e.message) }
  }, [activeConnectionId, selectedDatabase, selectedCollection, keyData, addField, addValue, addScore, loadKeyValue, tt])

  const handleRemoveItem = useCallback(async (field: string, index?: number) => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection || !keyData) return
    tt.confirm(`Remove "${field}" from this key?`, async () => {
      try {
        const r = await databaseService.redisRemoveItem(activeConnectionId, selectedDatabase, selectedCollection, keyData.type, field, index)
        if (r.success) { tt.success('Item removed'); await loadKeyValue() }
        else { tt.error(r.error) }
      } catch (e: any) { tt.error(e.message) }
    })
  }, [activeConnectionId, selectedDatabase, selectedCollection, keyData, loadKeyValue, tt])

  const handleCreateKey = useCallback(async () => {
    if (!activeConnectionId || !selectedDatabase) return
    if (!newKeyName.trim()) { tt.error('Key name is required'); return }
    try {
      setCreatingLoading(true)
      let value: any = newKeyValue
      if (newKeyType === 'hash') {
        try { value = newKeyValue ? JSON.parse(newKeyValue) : {} } catch { value = {} }
      } else if (newKeyType === 'list' || newKeyType === 'set') {
        try { value = newKeyValue ? JSON.parse(newKeyValue) : [] } catch { value = newKeyValue ? newKeyValue.split('\n').filter(Boolean) : [] }
      } else if (newKeyType === 'zset') {
        try { value = newKeyValue ? JSON.parse(newKeyValue) : [] } catch { value = [] }
      }
      const ttl = newKeyTTL ? parseInt(newKeyTTL) : undefined
      const result = await databaseService.redisSetKey(activeConnectionId, selectedDatabase, newKeyName.trim(), value, newKeyType, ttl)
      if (result.success) {
        tt.success(`Key "${newKeyName.trim()}" created!`)
        setCreating(false)
        setNewKeyName(''); setNewKeyValue(''); setNewKeyTTL(''); setNewKeyType('string')
        setSelectedCollection(newKeyName.trim())
      } else {
        tt.error(result.error || 'Failed to create key')
      }
    } catch (error: any) {
      tt.error('Create failed: ' + error.message)
    } finally {
      setCreatingLoading(false)
    }
  }, [activeConnectionId, selectedDatabase, newKeyName, newKeyType, newKeyValue, newKeyTTL, setSelectedCollection, tt])

  const handleQuickTTL = useCallback(async () => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection) return
    const ttlVal = quickTTL.trim() === '' ? 0 : Number.parseInt(quickTTL)
    if (Number.isNaN(ttlVal) || ttlVal < 0) { tt.error('Invalid TTL value'); return }
    try {
      const r = await databaseService.redisSetKeyTTL(activeConnectionId, selectedDatabase, selectedCollection, ttlVal)
      if (r.success) {
        tt.success(ttlVal > 0 ? `TTL set to ${ttlVal}s` : 'TTL removed (persistent)')
        setShowTTLForm(false); setQuickTTL('')
        await loadKeyValue()
      } else { tt.error(r.error) }
    } catch (e: any) { tt.error(e.message) }
  }, [activeConnectionId, selectedDatabase, selectedCollection, quickTTL, loadKeyValue, tt])

  const handleCopyKey = useCallback(async () => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection) return
    if (!copyKeyName.trim()) { tt.error('Destination key name is required'); return }
    try {
      const r = await databaseService.redisCopyKey(activeConnectionId, selectedDatabase, selectedCollection, copyKeyName.trim())
      if (r.success) {
        tt.success(`Key copied to "${copyKeyName.trim()}"`)
        setShowCopyForm(false); setCopyKeyName('')
      } else { tt.error(r.error) }
    } catch (e: any) { tt.error(e.message) }
  }, [activeConnectionId, selectedDatabase, selectedCollection, copyKeyName, tt])

  const handleStreamAdd = useCallback(async () => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection) return
    const fields: Record<string, string> = {}
    for (const f of streamFields) {
      if (f.key.trim()) fields[f.key.trim()] = f.value
    }
    if (Object.keys(fields).length === 0) { tt.error('At least one field is required'); return }
    try {
      const r = await databaseService.redisStreamAdd(activeConnectionId, selectedDatabase, selectedCollection, fields)
      if (r.success) {
        tt.success(`Entry added: ${r.entryId}`)
        setShowStreamAdd(false); setStreamFields([{ key: '', value: '' }])
        await loadKeyValue()
      } else { tt.error(r.error) }
    } catch (e: any) { tt.error(e.message) }
  }, [activeConnectionId, selectedDatabase, selectedCollection, streamFields, loadKeyValue, tt])

  const handleStreamDelete = useCallback(async (entryId: string) => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection) return
    tt.confirm(`Delete stream entry "${entryId}"?`, async () => {
      try {
        const r = await databaseService.redisStreamDel(activeConnectionId, selectedDatabase, selectedCollection, [entryId])
        if (r.success) { tt.success('Entry deleted'); await loadKeyValue() }
        else { tt.error(r.error) }
      } catch (e: any) { tt.error(e.message) }
    })
  }, [activeConnectionId, selectedDatabase, selectedCollection, loadKeyValue, tt])

  return {
    // State
    keyData, loading, editing, editValue, editTTL, saving, memoryUsage, encoding,
    showAddForm, addField, addValue, addScore,
    creating, newKeyName, newKeyType, newKeyValue, newKeyTTL, creatingLoading,
    showTTLForm, quickTTL, showCopyForm, copyKeyName,
    showStreamAdd, streamFields,
    selectedDatabase, selectedCollection, setSelectedCollection,
    // Setters
    setEditing, setEditValue, setEditTTL,
    setShowAddForm, setAddField, setAddValue, setAddScore,
    setCreating, setNewKeyName, setNewKeyType, setNewKeyValue, setNewKeyTTL,
    setShowTTLForm, setQuickTTL, setShowCopyForm, setCopyKeyName,
    setShowStreamAdd, setStreamFields,
    // Actions
    loadKeyValue, startEditing, handleSave, handleDelete, copyValue,
    handleAddItem, handleRemoveItem, handleCreateKey,
    handleQuickTTL, handleCopyKey, handleStreamAdd, handleStreamDelete,
  }
}

export function formatTTL(ttl: number) {
  if (ttl === -1) return 'No expiry'
  if (ttl === -2) return 'Key not found'
  if (ttl < 60) return `${ttl}s`
  if (ttl < 3600) return `${Math.floor(ttl / 60)}m ${ttl % 60}s`
  if (ttl < 86400) return `${Math.floor(ttl / 3600)}h ${Math.floor((ttl % 3600) / 60)}m`
  return `${Math.floor(ttl / 86400)}d ${Math.floor((ttl % 86400) / 3600)}h`
}
