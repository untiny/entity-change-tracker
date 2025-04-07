import { describe, expect, it } from 'vitest'
import { TrackEntity, TrackField } from '../src/decorators'
import { EntityChangeTracker } from '../src/tracker'

@TrackEntity()
class Address {
  @TrackField('街道')
  street: string

  @TrackField('城市')
  city: string

  constructor(street: string, city: string) {
    this.street = street
    this.city = city
  }
}

@TrackEntity({
  name: '用户',
  uniqueField: (entity: User) => entity?.name,
})
class User {
  @TrackField('用户名')
  name: string

  @TrackField('地址')
  address: Address

  @TrackField('标签')
  tags: string[]

  constructor(name: string, address: Address, tags: string[]) {
    this.name = name
    this.address = address
    this.tags = tags
  }
}

@TrackEntity<Contact>({
  name: '联系方式',
  objectHash: (item) => {
    return item.type
  },
  excludeUndefined: true,
})
class Contact {
  @TrackField('类型')
  type: string

  @TrackField('值')
  value: string

  excludeField: string

  constructor(type: string, value: string, excludeField: string) {
    this.type = type
    this.value = value
    this.excludeField = excludeField
  }
}

@TrackEntity()
class UserWithContacts {
  @TrackField('联系方式')
  contacts: Contact[]

  constructor(contacts: Contact[]) {
    this.contacts = contacts
  }
}

describe('entityChangeTracker', () => {
  it('should track basic changes', () => {
    const oldUser = new User('张三', new Address('旧街道', '北京'), ['标签1'])
    const newUser = new User('李四', new Address('新街道', '上海'), ['标签2'])

    const changes = EntityChangeTracker.track(oldUser, newUser)
    expect(changes).toContainEqual({
      oldValue: '张三',
      op: 'replace',
      paths: [
        {
          key: 'name',
          name: '用户名',
        },
      ],
      value: '李四',
    })
    expect(changes).toContainEqual({
      oldValue: '旧街道',
      op: 'replace',
      paths: [
        {
          key: 'address',
          name: '地址',
        },
        {
          key: 'street',
          name: '街道',
        },
      ],
      value: '新街道',
    })
    expect(changes).toContainEqual({
      oldValue: '北京',
      op: 'replace',
      paths: [
        {
          key: 'address',
          name: '地址',
        },
        {
          key: 'city',
          name: '城市',
        },
      ],
      value: '上海',
    })
    expect(changes).toContainEqual({
      op: 'add',
      paths: [
        {
          key: 'tags',
          name: '标签',
        },
        {
          key: '0',
        },
      ],
      value: '标签2',
    })
    expect(changes).toContainEqual({
      value: '标签1',
      op: 'remove',
      paths: [
        {
          key: 'tags',
          name: '标签',
        },
        {
          key: '0',
        },
      ],
    })
  })

  it('should track array changes', () => {
    const oldUser = new User('张三', new Address('街道', '北京'), ['A', 'B', 'C'])
    const newUser = new User('张三', new Address('街道', '北京'), ['C', 'A', 'B'])

    const changes = EntityChangeTracker.track(oldUser, newUser)
    expect(changes).toContainEqual({
      fromIndex: 2,
      op: 'move',
      paths: [
        {
          key: 'tags',
          name: '标签',
        },
        {
          key: '2',
        },
      ],
      toIndex: 0,
      value: 'C',
    })
    expect(changes.length).toBeGreaterThan(0)
  })

  it('should track object array changes', () => {
    const oldUser = new UserWithContacts([
      new Contact('email', 'old@example.com', '什么是快乐星球1'),
      new Contact('qq', '837233287', '什么是快乐星球2'),
      new Contact('phone', '1234567890', '什么是快乐星球3'),
    ])

    const newUser = new UserWithContacts([
      new Contact('qq', '837233287', '什么是快乐星球2'),
      new Contact('email', 'new@example.com', '什么是快乐星球2'),
      new Contact('phone', '1234567890', '什么是快乐星球3'),
    ])

    const changes = EntityChangeTracker.track(oldUser, newUser)
    expect(changes).toContainEqual({
      fromIndex: 1,
      op: 'move',
      paths: [
        {
          key: 'contacts',
          name: '联系方式',
        },
        {
          key: '1',
        },
      ],
      toIndex: 0,
      value: {
        type: 'qq',
        value: '837233287',
        excludeField: '什么是快乐星球2',
      },
    })
    expect(changes).toContainEqual({
      op: 'replace',
      paths: [
        {
          key: 'contacts',
          name: '联系方式',
        },
        {
          key: '1',
        },
        {
          key: 'value',
          name: '值',
        },
      ],
      value: 'new@example.com',
      oldValue: 'old@example.com',
    })
  })

  it('数组变化', () => {
    const oldArr = [
      new User('张三', new Address('旧街道', '北京'), ['标签1']),
      new User('李四', new Address('新街道', '上海'), ['标签1', '标签2']),
    ]

    const newArr = [
      new User('张三', new Address('旧街道', '北京1'), ['标签1']),
      new User('李四', new Address('新街道', '上海'), ['标签2', '标签1']),
    ]

    const changes = EntityChangeTracker.track(oldArr, newArr)

    const result = EntityChangeTracker.formatChanges(changes)
    expect(result).toContainEqual(
      '编辑[张三][地址][城市]: [北京 => 北京1]',
    )
  })

  it('无实体变化', () => {
    const oldObj = {
      name: '张三',
    }

    const newObj = {
      name: '李四',
    }

    const changes = EntityChangeTracker.track(oldObj, newObj)

    const result = EntityChangeTracker.formatChanges(changes)
    expect(result).toContainEqual(
      '编辑[name]: [张三 => 李四]',
    )
  })
})
