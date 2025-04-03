# @untiny/entity-change-tracker

一个用于跟踪实体对象变更的工具库。通过装饰器和差异对比，可以轻松地记录和格式化对象的变更历史。

## 特性

- 🔍 精确追踪对象属性变更
- 📝 支持自定义字段名称和格式化
- 🔄 支持数组元素的移动检测
- ⚡ 高性能元数据缓存
- 🎯 支持排除未定义字段的对比
- 💪 类型安全的 TypeScript 实现

## 安装

```bash
npm install @untiny/entity-change-tracker
# 或
npm install @untiny/entity-change-tracker
# 或
yarn add @untiny/entity-change-tracker
```

## 基础用法
```typescript
import { TrackEntity, TrackField, EntityChangeTracker } from '@untiny/entity-change-tracker'

@TrackEntity({
  name: '用户',
  format: user => `${user.name}(${user.id})`
})
class User {
  @TrackField('ID')
  id: number

  @TrackField('姓名')
  name: string

  @TrackField('年龄')
  age: number
}

// 创建实例
const oldUser = new User()
oldUser.id = 1
oldUser.name = '张三'
oldUser.age = 25

const newUser = new User()
newUser.id = 1
newUser.name = '张三'
newUser.age = 26

// 追踪变更
const changes = EntityChangeTracker.track(oldUser, newUser)

// 格式化变更记录
const formattedChanges = EntityChangeTracker.formatChanges(changes)
console.log(formattedChanges)
// 输出: ['编辑字段 [年龄]: [25 => 26]']
```

## API
### 修饰器

#### @TrackEntity(metadata?: EntityMetadata)

用于标记需要追踪变更的实体类。

```typescript
interface EntityMetadata<T extends object = any> {
  /** 实体名称 */
  name?: string
  /** 实体字段格式化方法 */
  format?: (value: T) => string
  /** 实体字段哈希方法，用于数组元素比对 */
  objectHash?: (item: T, index?: number) => string | undefined
  /** 是否排除未装饰的字段 */
  excludeUndefined?: boolean
}
```

#### @TrackField(options?: FieldMetadata | string)

用于标记需要追踪的字段。

```typescript
interface FieldMetadata<V = any> {
  /** 字段名称 */
  name?: string
  /** 字段值格式化方法 */
  format?: (value: V) => string
}
```

### EntityChangeTracker
#### track(oldEntity: T | T[], newEntity: T | T[]): EntityChangeTrackerItem[]

追踪两个实体对象之间的变更。

- `oldEntity` : 变更前的实体对象或数组
- `newEntity` : 变更后的实体对象或数组
- 返回: 变更记录数组

#### formatChanges(changes: EntityChangeTrackerItem[]): string[]

将变更记录格式化为可读的字符串数组。

- `changes` : 变更记录数组
- 返回: 格式化后的变更描述数组

## 高级用法

### 自定义对象哈希

```typescript
@TrackEntity({
  objectHash: (item, index) => item.id?.toString() ?? index?.toString()
})
class Item {
  @TrackField()
  id: number

  @TrackField()
  name: string
}
```

### 自定义字段格式化

```typescript
@TrackEntity()
class Product {
  @TrackField({
    name: '价格',
    format: value => `￥${value.toFixed(2)}`
  })
  price: number
}
```

### 排除未装饰字段

```typescript
@TrackEntity({
  excludeUndefined: true
})
class User {
  @TrackField()
  name: string  // 会被追踪

  age: number   // 不会被追踪
}
```

