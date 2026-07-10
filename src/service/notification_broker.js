// by AI.Coding：单实例通知 Broker 按用户维护 SSE 订阅，未来多实例可替换为 Redis Pub/Sub。
class NotificationBroker {
  constructor() {
    this.listeners = new Map()
  }

  // by AI.Coding：同一用户允许多个浏览器标签页订阅，并返回幂等取消函数。
  subscribe(userId, listener) {
    const key = Number(userId)
    const listeners = this.listeners.get(key) || new Set()
    listeners.add(listener)
    this.listeners.set(key, listeners)
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) this.listeners.delete(key)
    }
  }

  // by AI.Coding：发布异常由调用方隔离，Broker 本身只同步通知当前进程连接。
  publish(userId, event) {
    const listeners = this.listeners.get(Number(userId))
    if (!listeners) return
    for (const listener of listeners) listener(event)
  }

  // by AI.Coding：测试和运行观测可查询指定用户当前连接数。
  listenerCount(userId) {
    return this.listeners.get(Number(userId))?.size || 0
  }
}

module.exports = new NotificationBroker()
