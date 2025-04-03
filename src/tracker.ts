import type { DiffContext } from 'jsondiffpatch'
import type { EntityMetadata, FieldMetadata } from './decorators'
import { create } from 'jsondiffpatch'
import { getMetadata, isArray, isEntity, isObject, last } from './utils'

export type AddedDelta = [unknown]
export type ModifiedDelta = [unknown, unknown]
export type DeletedDelta = [unknown, 0, 0]
export interface ObjectDelta {
  [property: string]: Delta
}
export interface ArrayDelta {
  _t: 'a'
  [index: number | `${number}`]: Delta
  [index: `_${number}`]: DeletedDelta | MovedDelta
}
export type MovedDelta = [unknown, number, 3]
export type TextDiffDelta = [string, 0, 2]
export type Delta = AddedDelta | ModifiedDelta | DeletedDelta | ObjectDelta | ArrayDelta | MovedDelta | TextDiffDelta | undefined

export type EntityChangeOperation = 'add' | 'remove' | 'replace' | 'move'
export interface TrackFieldInfo extends FieldMetadata {
  key: string | number
}
export interface EntityChangeTrackerItem {
  op: EntityChangeOperation
  paths: TrackFieldInfo[]
  value: unknown
  oldValue?: unknown
  fromIndex?: number
  toIndex?: number
}

export class EntityChangeTracker {
  private static diffPatcher = create({
    arrays: { detectMove: true, includeValueOnMove: true },
    objectHash: (item: any, index?: number) => {
      let hash: string | undefined = index?.toString()
      if (isEntity(item)) {
        const metadata: EntityMetadata = getMetadata(item.constructor) ?? {}
        if (metadata?.objectHash) {
          hash = metadata.objectHash(item, index)
        }
      }
      return hash
    },
    propertyFilter: (name: string, context: DiffContext): boolean => {
      const entity = context.right || context.left
      if (isEntity(entity)) {
        const entityMetadata = getMetadata(entity.constructor)
        if (entityMetadata?.excludeUndefined) {
          const fieldMetadata = getMetadata(entity, name)
          return !!fieldMetadata
        }
      }
      return true
    },
  })

  private static metadataMap = new Map<string, EntityMetadata | FieldMetadata>()

  private static getMetadata(target: object): EntityMetadata | undefined
  private static getMetadata(target: object, propertyKey: string | symbol): FieldMetadata | undefined
  private static getMetadata(target: object, propertyKey?: string | symbol): EntityMetadata | FieldMetadata | undefined {
    const cacheKey = propertyKey ? `${target.constructor.name}:${String(propertyKey)}` : target.constructor.name
    if (this.metadataMap.has(cacheKey)) {
      return this.metadataMap.get(cacheKey)
    }
    const metadata = getMetadata(target, propertyKey as string | symbol)
    if (metadata) {
      this.metadataMap.set(cacheKey, metadata)
    }
    return metadata
  }

  static track<T extends object>(oldEntity: T | T[], newEntity: T | T[]): EntityChangeTrackerItem[] {
    const changes: EntityChangeTrackerItem[] = []
    if (!oldEntity && !newEntity) {
      return changes
    }
    const delta = this.diffPatcher.diff(oldEntity, newEntity) as ObjectDelta | ArrayDelta

    if (!delta) {
      return changes
    }

    this.processChanges(delta, changes, [], oldEntity ?? newEntity)

    return changes
  }

  private static processChanges(
    delta: ObjectDelta | ArrayDelta,
    changes: EntityChangeTrackerItem[],
    prefixPaths: TrackFieldInfo[] = [],
    originalEntity?: any,
  ): void {
    const isArrayDelta = '_t' in delta && delta._t === 'a'
    for (const [key, value] of Object.entries(delta)) {
      if (value === undefined || value === null) {
        continue
      }
      if (key === '_t' && value === 'a') {
        continue
      }
      let metadata = this.getMetadata(originalEntity, key)
      const isDeletedOrMoved = key.startsWith('_') && !Number.isNaN(Number(key.slice(1)))
      const currentKey = isDeletedOrMoved ? Number(key.slice(1)) : key
      if (isArrayDelta && typeof currentKey === 'number') {
        // 数组时继承父级的格式化方法
        metadata = { format: last(prefixPaths)?.format }
      }
      const paths = [...prefixPaths, { ...metadata, key: currentKey.toString() }]
      if (isArray(value)) {
        const result = this.formatDelta(value as AddedDelta | ModifiedDelta | DeletedDelta | MovedDelta | TextDiffDelta)
        const change: EntityChangeTrackerItem = { ...result, paths }
        if (change.op === 'move') {
          change.fromIndex = Number(currentKey)
        }
        changes.push(change)
      }
      else if (typeof value === 'object') {
        this.processChanges(value, changes, paths, originalEntity?.[key])
      }
    }
  }

  private static formatDelta(delta: AddedDelta | ModifiedDelta | DeletedDelta | MovedDelta | TextDiffDelta): Pick<EntityChangeTrackerItem, 'op' | 'value' | 'oldValue' | 'toIndex'> {
    // Added
    if (delta.length === 1) {
      const [value] = delta
      return { op: 'add', value }
    }
    // Modified
    if (delta.length === 2) {
      const [oldValue, value] = delta
      return { op: 'replace', oldValue, value }
    }
    const [value, toIndex, type] = delta
    // Moved
    if (type === 3) {
      return { op: 'move', value, toIndex }
    }
    // Deleted
    return { op: 'remove', value }
  }

  public static formatChanges(changes: EntityChangeTrackerItem[]): string[] {
    return changes.flatMap((change) => {
      const field = last(change.paths)
      let formatValue = field?.format
      const entity = change.value ?? change.oldValue
      if (isEntity(entity)) {
        const entityMetadata = this.getMetadata(entity.constructor)
        formatValue = formatValue ?? entityMetadata?.format
        if (!formatValue) {
          let keys = Object.keys(entity)
          if (entityMetadata?.excludeUndefined) {
            keys = keys.filter(key => this.getMetadata(entity, key))
          }
          return this.formatChanges(
            keys.map((key) => {
              const metadata = this.getMetadata(entity.constructor, key) ?? {}
              return {
                ...change,
                paths: [...change.paths, { ...metadata, key }],
                value: (change.value as Record<string, unknown>)?.[key],
                oldValue: (change.oldValue as Record<string, unknown>)?.[key],
              }
            }),
          )
        }
      }
      formatValue = formatValue ?? this.formatValue
      let value: string
      let oldValue: string
      try {
        value = formatValue(change.value)
        oldValue = formatValue(change.oldValue)
      }
      catch {
        value = this.formatValue(change.value)
        oldValue = this.formatValue(change.oldValue)
      }
      const paths = change.paths.map(path => `[${path.name || path.key}]`).join('')
      if (change.op === 'add') {
        return `编辑字段${paths}: [-- => ${value}]`
      }
      if (change.op === 'remove') {
        return `编辑字段${paths}: [${value} => --]`
      }
      if (change.op === 'move') {
        return `将${paths}[${value}]从${change.fromIndex}移动到${change.toIndex}]`
      }
      return `编辑字段${paths}: [${oldValue} => ${value}]`
    })
  }

  private static formatValue(value: unknown): string {
    let text = '--'
    if (value === null || value === undefined) {
      return text
    }
    if (isArray(value)) {
      text = value.map(v => this.formatValue(v)).join(', ')
    }
    else if (isObject(value)) {
      try {
        text = this.mapEntityFields(value).join(', ')
      }
      catch {
        text = Object.prototype.toString.call(value)
      }
    }
    else {
      text = String(value)
    }
    return text || '--'
  }

  private static mapEntityFields(entity: object, fields: string[] = []): string[] {
    if (!entity) {
      return []
    }
    const entityMetadata = this.getMetadata(entity.constructor)
    if (typeof entityMetadata?.format === 'function') {
      return [entityMetadata.format(entity)]
    }
    let items = Object.entries(entity)
    if (entityMetadata?.excludeUndefined) {
      items = items.filter(([key, _]) => this.getMetadata(entity, key))
    }
    return items.flatMap(([key, value]) => {
      const name = this.getMetadata(entity, key)?.name ?? key
      if (isObject(value)) {
        return this.mapEntityFields(value, fields.concat(name))
      }
      return `${fields.concat(name).join('.')}: ${value}`
    })
  }
}
