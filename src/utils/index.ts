import type { EntityMetadata, FieldMetadata } from '../decorators'
import { TRACK_ENTITY_KEY, TRACK_FIELD_KEY } from '../decorators'

export function getMetadata(target: object): EntityMetadata | undefined
export function getMetadata(target: object, propertyKey: string | symbol): FieldMetadata | undefined
export function getMetadata(target: object, propertyKey?: string | symbol): EntityMetadata | FieldMetadata | undefined {
  if (!target || Array.isArray(target)) {
    return undefined
  }
  let metadata: EntityMetadata | FieldMetadata
  if (propertyKey) {
    metadata = Reflect.getMetadata(TRACK_FIELD_KEY, target.constructor, propertyKey)
  }
  else {
    metadata = Reflect.getMetadata(TRACK_ENTITY_KEY, target.constructor)
  }
  return metadata
}

export const isArray = Array.isArray

export function isObject(value: unknown): value is object {
  const type = typeof value
  return value != null && (type === 'object' || type === 'function')
}

export function isEntity(target: unknown): target is object {
  return target !== null && !Array.isArray(target) && (typeof target === 'object' || typeof target === 'function')
}

export function last<T>(array: T[]): T | undefined {
  const length = array == null ? 0 : array.length
  return length ? array[length - 1] : undefined
}
