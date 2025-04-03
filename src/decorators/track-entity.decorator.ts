import 'reflect-metadata'

export interface EntityMetadata<T extends object = any> {
  /** 实体名称 */
  name?: string
  /** 实体字段格式化方法 */
  format?: (value: T) => string
  /** 实体字段哈希方法 */
  objectHash?: (item: T, index?: number) => string | undefined
  /** 排除对比未定义字段 */
  excludeUndefined?: boolean
}

export const TRACK_ENTITY_KEY = 'entity-change-tracker:entity'

export function TrackEntity<T extends object>(metadata?: EntityMetadata<T>): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(TRACK_ENTITY_KEY, metadata, target)
  }
}
