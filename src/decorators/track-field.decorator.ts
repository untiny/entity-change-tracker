import 'reflect-metadata'

export interface FieldMetadata<V = any> {
  /** 字段名称 */
  name?: string
  /** 字段值格式化方法 */
  format?: (value: V) => string
}

export const TRACK_FIELD_KEY = 'entity-change-tracker:field'

export function TrackField<V = any>(metadata?: FieldMetadata<V>): PropertyDecorator
export function TrackField(name?: string): PropertyDecorator
export function TrackField<V = any>(options?: FieldMetadata<V> | string): PropertyDecorator {
  let metadata: FieldMetadata<V> = {}
  if (typeof options === 'string') {
    metadata.name = options
  }
  else {
    metadata = options ?? {}
  }
  return (target: object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(TRACK_FIELD_KEY, metadata, target.constructor, propertyKey)
  }
}
